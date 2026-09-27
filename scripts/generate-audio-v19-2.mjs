import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SR = 44100;
const root = process.cwd();
const temp = path.join(root, '.audio-build-v19-2');
const sfxDir = path.join(root, 'public/assets/audio/sfx');
const musicDir = path.join(root, 'public/assets/audio/music');
fs.mkdirSync(temp, { recursive: true });
fs.mkdirSync(sfxDir, { recursive: true });
fs.mkdirSync(musicDir, { recursive: true });

let rngState = 0x19f20a11;
const random = () => {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState / 0x100000000;
};

const track = (seconds) => ({
  duration: seconds,
  left: new Float32Array(Math.ceil(seconds * SR)),
  right: new Float32Array(Math.ceil(seconds * SR)),
});

const envelope = (t, duration, attack = 0.006, release = 0.08) => {
  const a = Math.min(1, t / Math.max(0.001, attack));
  const r = Math.min(1, Math.max(0, duration - t) / Math.max(0.001, release));
  return Math.max(0, Math.min(a, r));
};

function addTone(out, start, duration, f0, f1, amp, pan = 0, color = 'sine', attack = 0.006, release = 0.08) {
  const first = Math.max(0, Math.floor(start * SR));
  const last = Math.min(out.left.length, Math.ceil((start + duration) * SR));
  let phase = 0;
  const leftGain = Math.sqrt((1 - pan) * 0.5);
  const rightGain = Math.sqrt((1 + pan) * 0.5);
  for (let i = first; i < last; i++) {
    const t = i / SR - start;
    const p = Math.min(1, t / duration);
    const frequency = f0 * Math.pow(Math.max(0.01, f1 / f0), p);
    phase += Math.PI * 2 * frequency / SR;
    let value = Math.sin(phase);
    if (color === 'warm') value = value + 0.28 * Math.sin(phase * 2) + 0.1 * Math.sin(phase * 3);
    else if (color === 'triangle') value = Math.asin(Math.sin(phase)) * 2 / Math.PI;
    const env = envelope(t, duration, attack, release);
    out.left[i] += value * amp * env * leftGain;
    out.right[i] += value * amp * env * rightGain;
  }
}

function addNoise(out, start, duration, amp, pan = 0, mode = 'high', attack = 0.003, release = 0.06) {
  const first = Math.max(0, Math.floor(start * SR));
  const last = Math.min(out.left.length, Math.ceil((start + duration) * SR));
  const leftGain = Math.sqrt((1 - pan) * 0.5);
  const rightGain = Math.sqrt((1 + pan) * 0.5);
  let low = 0;
  for (let i = first; i < last; i++) {
    const t = i / SR - start;
    const raw = random() * 2 - 1;
    low += 0.045 * (raw - low);
    const filtered = mode === 'low' ? low : mode === 'full' ? raw : raw - low;
    const value = filtered * amp * envelope(t, duration, attack, release);
    out.left[i] += value * leftGain;
    out.right[i] += value * rightGain;
  }
}

const kick = (out, at, amp = 0.45) => { addTone(out, at, 0.18, 125, 48, amp, 0, 'warm', 0.002, 0.14); };
const snare = (out, at, amp = 0.16) => { addNoise(out, at, 0.12, amp, 0, 'high', 0.002, 0.1); addTone(out, at, 0.09, 190, 120, amp * 0.45, 0, 'triangle'); };
const hat = (out, at, amp = 0.045) => addNoise(out, at, 0.045, amp, (random() - 0.5) * 0.5, 'high', 0.001, 0.035);

function master(out, target = 0.9) {
  let peak = 0;
  for (let i = 0; i < out.left.length; i++) {
    out.left[i] = Math.tanh(out.left[i] * 1.08);
    out.right[i] = Math.tanh(out.right[i] * 1.08);
    peak = Math.max(peak, Math.abs(out.left[i]), Math.abs(out.right[i]));
  }
  const gain = peak > 0 ? target / peak : 1;
  for (let i = 0; i < out.left.length; i++) { out.left[i] *= gain; out.right[i] *= gain; }
  return out;
}

function writeWav(out, destination) {
  master(out);
  const count = out.left.length;
  const buffer = Buffer.alloc(44 + count * 4);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + count * 4, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22); buffer.writeUInt32LE(SR, 24); buffer.writeUInt32LE(SR * 4, 28);
  buffer.writeUInt16LE(4, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(count * 4, 40);
  for (let i = 0; i < count; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out.left[i])) * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out.right[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(destination, buffer);
}

function encode(name, out, kind = 'sfx') {
  const wav = path.join(temp, `${name}.wav`);
  const destination = path.join(kind === 'music' ? musicDir : sfxDir, `${name}.ogg`);
  writeWav(out, wav);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', kind === 'music' ? '5' : '6', destination]);
}

function footstep(name, variant) {
  const out = track(0.16);
  addTone(out, 0, 0.13, 105 + variant * 8, 48, 0.5, variant % 2 ? 0.08 : -0.08, 'warm', 0.002, 0.11);
  addNoise(out, 0.012, 0.09, 0.2 + variant * 0.025, 0, 'low', 0.001, 0.075);
  addNoise(out, 0.002, 0.025, 0.11, 0, 'high', 0.001, 0.02);
  encode(name, out);
}

function whoosh(name, weight, variant = 0) {
  const duration = 0.15 + weight * 0.06;
  const out = track(duration);
  addNoise(out, 0, duration, 0.22 + weight * 0.11, variant ? 0.2 : -0.16, 'high', 0.025, 0.055);
  addTone(out, 0.02, duration - 0.02, 520 + weight * 90, 105 + variant * 15, 0.08 + weight * 0.04, 0, 'triangle', 0.02, 0.06);
  encode(name, out);
}

function impact(name, weight, variant = 0) {
  const duration = 0.13 + weight * 0.055;
  const out = track(duration);
  // Body + transient are deliberately separate: the old single thump sounded soft on laptop speakers.
  addTone(out, 0, duration, 150 - weight * 18 + variant * 6, 48, 0.42 + weight * 0.16, 0, 'warm', 0.001, duration * 0.78);
  addNoise(out, 0.003, 0.045 + weight * 0.02, 0.2 + weight * 0.12, variant ? 0.12 : -0.1, 'high', 0.001, 0.045);
  addTone(out, 0.0015, 0.036 + weight * 0.008, 2500 + variant * 180, 920, 0.065 + weight * 0.025, variant ? 0.1 : -0.08, 'triangle', 0.0005, 0.025);
  if (weight > 1) {
    addTone(out, 0.006, duration - 0.006, 92, 34, 0.24, 0, 'warm', 0.001, duration * 0.82);
    addTone(out, 0.018, 0.08, 710 + variant * 60, 260, 0.09, 0.1, 'triangle');
  }
  encode(name, out);
}

footstep('footstep', 0); footstep('footstep_2', 1); footstep('footstep_3', 2);
{
  const out = track(0.24);
  addNoise(out, 0, 0.18, 0.16, 0, 'high', 0.025, 0.04);
  addTone(out, 0.01, 0.2, 210, 520, 0.18, 0, 'triangle', 0.01, 0.055);
  encode('jump', out);
}
{
  const out = track(0.22);
  addTone(out, 0, 0.18, 125, 46, 0.58, 0, 'warm', 0.002, 0.16);
  addNoise(out, 0.004, 0.1, 0.22, 0, 'low', 0.001, 0.085);
  encode('land', out);
}
whoosh('swing_j1', 0, 0); whoosh('swing_j1_2', 0, 1);
whoosh('swing_j2', 1, 0); whoosh('swing_j2_2', 1, 1);
whoosh('swing_j3', 2, 0); whoosh('swing_j3_2', 2, 1);
impact('hit_light', 0, 0); impact('hit_light_2', 0, 1); impact('hit_light_3', 0, 2);
impact('hit_medium', 1, 0); impact('hit_medium_2', 1, 1);
impact('hit_heavy', 2, 0); impact('hit_heavy_2', 2, 1); impact('hit_heavy_3', 2, 2);
whoosh('dodge', 1, 0); whoosh('dodge_2', 1, 1);
whoosh('throw_tape', 0, 0); whoosh('throw_tape_2', 0, 1);
impact('tape_hit', 0, 1);

{
  const out = track(0.34);
  addNoise(out, 0, 0.26, 0.18, -0.1, 'high', 0.01, 0.05);
  addTone(out, 0.16, 0.13, 920, 540, 0.18, 0.12, 'triangle', 0.002, 0.1);
  encode('parcel_repair', out);
}
{
  const out = track(0.24);
  addTone(out, 0, 0.19, 170, 52, 0.62, 0, 'warm', 0.001, 0.17);
  addNoise(out, 0.003, 0.1, 0.27, 0, 'high', 0.001, 0.08);
  encode('parcel_hit', out);
}
{
  const out = track(0.18);
  addTone(out, 0, 0.12, 660, 980, 0.25, -0.12, 'sine', 0.002, 0.08);
  addTone(out, 0.045, 0.12, 990, 1320, 0.2, 0.12, 'sine', 0.002, 0.09);
  encode('pickup', out);
}
{
  const out = track(0.48);
  addTone(out, 0, 0.4, 120, 760, 0.2, -0.1, 'warm', 0.03, 0.07);
  addTone(out, 0.08, 0.34, 180, 1120, 0.17, 0.1, 'triangle', 0.02, 0.06);
  addNoise(out, 0.3, 0.12, 0.11, 0, 'high');
  encode('ultimate_charge', out);
}
{
  const out = track(0.48);
  addTone(out, 0, 0.42, 92, 38, 0.9, 0, 'warm', 0.001, 0.38);
  addNoise(out, 0, 0.25, 0.5, 0, 'full', 0.001, 0.2);
  addTone(out, 0.035, 0.25, 620, 105, 0.2, 0, 'triangle');
  encode('ultimate_hit', out);
}
{
  const out = track(0.2);
  addTone(out, 0, 0.17, 980, 1380, 0.32, 0, 'sine', 0.002, 0.12);
  addTone(out, 0.045, 0.14, 1480, 1980, 0.16, 0.1, 'sine', 0.002, 0.1);
  encode('cash_tick', out);
}
{
  const out = track(0.85);
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => addTone(out, index * 0.09, 0.55, frequency, frequency, 0.17, (index - 1.5) * 0.1, 'warm', 0.003, 0.35));
  encode('order_complete', out);
}

function addPad(out, start, duration, notes, amp) {
  notes.forEach((frequency, index) => {
    addTone(out, start, duration, frequency, frequency, amp, (index - (notes.length - 1) / 2) * 0.22, 'warm', 0.22, 0.45);
    addTone(out, start, duration, frequency * 2, frequency * 2, amp * 0.18, 0, 'sine', 0.25, 0.5);
  });
}

function menuMusic() {
  const out = track(24);
  const chords = [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];
  for (let bar = 0; bar < 6; bar++) {
    const start = bar * 4;
    const chord = chords[bar % chords.length];
    addPad(out, start, 4, chord, 0.07);
    for (let step = 0; step < 8; step++) {
      const note = chord[(step + bar) % chord.length] * 2;
      addTone(out, start + step * 0.5, 0.38, note, note * 0.995, 0.06, step % 2 ? 0.2 : -0.2, 'triangle', 0.008, 0.22);
    }
  }
  encode('menu_music', out, 'music');
}

function grooveMusic(name, energy) {
  const out = track(16);
  const bass = [110, 110, 98, 98, 87.31, 87.31, 98, 98];
  const chords = [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 329.63]];
  for (let bar = 0; bar < 8; bar++) {
    const at = bar * 2;
    addPad(out, at, 1.95, chords[bar % 4], 0.038 + energy * 0.012);
    for (let beat = 0; beat < 4; beat++) {
      const t = at + beat * 0.5;
      kick(out, t, 0.22 + energy * 0.12);
      if (beat === 1 || beat === 3) snare(out, t, 0.09 + energy * 0.08);
      hat(out, t + 0.25, 0.025 + energy * 0.025);
      addTone(out, t, 0.38, bass[bar], bass[bar] * 0.985, 0.1 + energy * 0.04, 0, 'warm', 0.004, 0.2);
      if (energy > 0.5) {
        const arp = chords[bar % 4][beat % 3] * 2;
        addTone(out, t + 0.125, 0.24, arp, arp * 0.99, 0.05, beat % 2 ? 0.22 : -0.22, 'triangle', 0.004, 0.16);
      }
    }
  }
  encode(name, out, 'music');
}

function resultMusic() {
  const out = track(8);
  const chords = [[261.63, 329.63, 392], [293.66, 369.99, 440], [329.63, 392, 493.88], [261.63, 329.63, 523.25]];
  chords.forEach((chord, i) => {
    addPad(out, i * 2, 1.95, chord, 0.075);
    chord.forEach((frequency, j) => addTone(out, i * 2 + j * 0.12, 0.8, frequency * 2, frequency * 2, 0.055, (j - 1) * 0.18, 'triangle', 0.004, 0.5));
  });
  encode('result_music', out, 'music');
}

menuMusic();
grooveMusic('hub_music', 0.25);
grooveMusic('stage_music', 0.82);
resultMusic();

fs.rmSync(temp, { recursive: true, force: true });
console.log('Generated V19.3 balanced music and punchier combat SFX pack.');
