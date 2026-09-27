import { AttackComboStep, PickupType, SceneType } from '../core/types';

export type SfxId =
  | 'swing_j1' | 'swing_j2' | 'swing_j3' | 'ultimate_charge'
  | 'hit_light' | 'hit_medium' | 'hit_heavy' | 'ultimate_hit'
  | 'throw_tape' | 'tape_hit' | 'dodge' | 'player_hurt'
  | 'enemy_warning' | 'boss_warning' | 'enemy_ko'
  | 'dog_bark' | 'rival_taunt' | 'thug_grunt' | 'boss_growl'
  | 'pickup' | 'gate_open' | 'order_complete'
  | 'footstep' | 'jump' | 'land' | 'parcel_hit' | 'parcel_repair' | 'cash_tick' | 'perfect_dodge' | 'glass_clink';

export type AmbienceId = 'hub_ambience' | 'stage_ambience';
export type MusicId = 'menu_music' | 'hub_music' | 'stage_music' | 'result_music';

export interface AudioSink {
  play(id: SfxId): void;
  /** Temporarily lowers scene music so a confirmed heavy hit keeps its punch. */
  duckMusic?(decibels?: number, durationMs?: number): void;
}

export const meleeHitSfx = (combo: AttackComboStep): SfxId =>
  combo === 'ULTIMATE' ? 'ultimate_hit' : combo === 'J3' ? 'hit_heavy' : combo === 'J2' ? 'hit_medium' : 'hit_light';

export const meleeSwingSfx = (combo: AttackComboStep): SfxId =>
  combo === 'ULTIMATE' ? 'ultimate_charge' : combo === 'J3' ? 'swing_j3' : combo === 'J2' ? 'swing_j2' : 'swing_j1';

export const pickupSfx = (type: PickupType): SfxId => type === 'PARCEL_REPAIR' ? 'parcel_repair' : 'pickup';

export const SFX_MASTER_VOLUME = 0.62;
export const MAX_SIMULTANEOUS_SFX = 10;

/** V19.3 scene mix: the quiet opening is lifted while combat no longer masks SFX. */
export const getMusicSceneGain = (id: MusicId): number => {
  if (id === 'menu_music') return 0.28;
  if (id === 'hub_music') return 0.18;
  return 0.15;
};

export const getSfxMixGain = (id: SfxId): number => {
  if (id === 'ultimate_hit' || id === 'player_hurt' || id === 'perfect_dodge') return 0.9;
  if (id === 'hit_heavy' || id === 'ultimate_charge' || id === 'boss_warning' || id === 'parcel_hit') return 0.82;
  if (id === 'hit_medium' || id === 'gate_open' || id === 'order_complete') return 0.74;
  if (id === 'pickup' || id === 'parcel_repair' || id === 'enemy_warning') return 0.64;
  if (id === 'dog_bark' || id === 'rival_taunt' || id === 'thug_grunt') return 0.62;
  if (id === 'boss_growl') return 0.78;
  if (id === 'swing_j1' || id === 'swing_j2' || id === 'throw_tape') return 0.64;
  if (id === 'cash_tick') return 0.78;
  if (id === 'glass_clink') return 0.42;
  if (id === 'jump') return 0.52;
  if (id === 'land') return 0.58;
  if (id === 'footstep') return 0.38;
  return 0.7;
};

const COOLDOWN_MS: Partial<Record<SfxId, number>> = {
  player_hurt: 90, enemy_warning: 180, boss_warning: 250,
  enemy_ko: 100, pickup: 45, gate_open: 250,
  dog_bark: 500, rival_taunt: 700, thug_grunt: 700, boss_growl: 900,
  footstep: 145, jump: 120, land: 120, parcel_hit: 80, parcel_repair: 120, cash_tick: 35, perfect_dodge: 200, glass_clink: 240,
};

const VARIANT_COUNTS: Partial<Record<SfxId, number>> = {
  footstep: 3,
  swing_j1: 2,
  swing_j2: 2,
  swing_j3: 2,
  hit_light: 3,
  hit_medium: 2,
  hit_heavy: 3,
  dodge: 2,
  throw_tape: 2,
};

export class AudioManager implements AudioSink {
  private static instance: AudioManager | null = null;
  private context: AudioContext | null = null;
  private masterVolume = SFX_MASTER_VOLUME;
  private lastPlayed = new Map<SfxId, number>();
  private buffers = new Map<SfxId, AudioBuffer[]>();
  private lastVariantIndex = new Map<SfxId, number>();
  private ambienceBuffers = new Map<AmbienceId, AudioBuffer>();
  private musicBuffers = new Map<MusicId, AudioBuffer>();
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private ambienceSource: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode | null = null;
  private requestedAmbience: AmbienceId | null = null;
  private currentAmbience: AmbienceId | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private requestedMusic: MusicId | null = null;
  private currentMusic: MusicId | null = null;
  private readonly basePath = '/assets/audio/sfx';
  private readonly ambiencePath = '/assets/audio/ambience';
  private readonly musicPath = '/assets/audio/music';

  public static getInstance(): AudioManager {
    if (!this.instance) this.instance = new AudioManager();
    return this.instance;
  }

  public installUnlockListeners(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      void this.unlock();
    };
    const events = ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'];
    events.forEach((evt) => {
      window.addEventListener(evt, unlock, { passive: true });
      document.addEventListener(evt, unlock, { passive: true });
    });
  }

  public async preload(): Promise<void> {
    if (typeof window === 'undefined') return;
    const ids: SfxId[] = [
      'swing_j1', 'swing_j2', 'swing_j3', 'ultimate_charge',
      'hit_light', 'hit_medium', 'hit_heavy', 'ultimate_hit',
      'throw_tape', 'tape_hit', 'dodge', 'player_hurt',
      'enemy_warning', 'boss_warning', 'enemy_ko',
      'dog_bark', 'rival_taunt', 'thug_grunt', 'boss_growl',
      'pickup', 'gate_open', 'order_complete',
      'footstep', 'jump', 'land', 'parcel_hit', 'parcel_repair', 'cash_tick', 'perfect_dodge', 'glass_clink'
    ];
    await Promise.all(ids.map(async (id) => {
      const variants: AudioBuffer[] = [];
      const count = VARIANT_COUNTS[id] ?? 1;
      for (let index = 0; index < count; index++) {
        try {
          const suffix = index === 0 ? '' : `_${index + 1}`;
          const response = await fetch(`${this.basePath}/${id}${suffix}.ogg`);
          if (!response.ok) continue;
          const arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) continue;
          const context = this.getContext();
          if (!context) continue;
          variants.push(await context.decodeAudioData(arrayBuffer));
        } catch { /* A missing variant falls back to another decoded sample. */ }
      }
      if (variants.length > 0) this.buffers.set(id, variants);
    }));

    const ambiences: AmbienceId[] = ['hub_ambience', 'stage_ambience'];
    await Promise.all(ambiences.map(async (id) => {
      try {
        const response = await fetch(`${this.ambiencePath}/${id}.ogg`);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return;
        const context = this.getContext();
        if (!context) return;
        this.ambienceBuffers.set(id, await context.decodeAudioData(arrayBuffer));
      } catch { /* Ambience fallback */ }
    }));

    const musicIds: MusicId[] = ['menu_music', 'hub_music', 'stage_music', 'result_music'];
    await Promise.all(musicIds.map(async (id) => {
      try {
        const response = await fetch(`${this.musicPath}/${id}.ogg`);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) return;
        const context = this.getContext();
        if (!context) return;
        this.musicBuffers.set(id, await context.decodeAudioData(arrayBuffer));
      } catch { /* Music is optional; scene ambience remains available. */ }
    }));

    const context = this.getContext();
    if (context?.state === 'running') this.startRequestedLoops();
  }

  public setSceneAudio(scene: SceneType | null): void {
    const ambience = scene === 'STAGE_1' ? 'stage_ambience' : scene === 'HUB' ? 'hub_ambience' : null;
    const music: MusicId | null = scene === 'MENU' || scene === 'PROLOGUE'
      ? 'menu_music'
      : scene === 'HUB'
        ? 'hub_music'
        : scene === 'STAGE_1'
          ? 'stage_music'
          : scene === 'RESULT'
            ? 'result_music'
            : null;
    this.setAmbience(ambience);
    this.setMusic(music);
  }

  public setAmbience(id: AmbienceId | null): void {
    this.requestedAmbience = id;
    if (!id) {
      this.stopAmbience();
      return;
    }
    if (this.currentAmbience === id && this.ambienceSource) {
      return;
    }
    this.startAmbience(id);
  }

  private startAmbience(id: AmbienceId): void {
    const context = this.getContext();
    if (!context) return;
    this.stopAmbience();
    const buffer = this.ambienceBuffers.get(id);
    if (!buffer) return;

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = context.createGain();
    gain.gain.value = 0.2;
    source.connect(gain).connect(this.getOutputNode(context));

    try {
      source.start();
      this.ambienceSource = source;
      this.ambienceGain = gain;
      this.currentAmbience = id;
    } catch {
      // Audio context might be waiting for gesture
    }
  }

  public stopAmbience(): void {
    if (this.ambienceSource) {
      try {
        this.ambienceSource.stop();
        this.ambienceSource.disconnect();
      } catch { /* ignore */ }
      this.ambienceSource = null;
    }
    if (this.ambienceGain) {
      try {
        this.ambienceGain.disconnect();
      } catch { /* ignore */ }
      this.ambienceGain = null;
    }
    this.currentAmbience = null;
  }

  public setMusic(id: MusicId | null): void {
    this.requestedMusic = id;
    if (!id) { this.stopMusic(); return; }
    if (this.currentMusic === id && this.musicSource) return;
    this.startMusic(id);
  }

  private startMusic(id: MusicId): void {
    const context = this.getContext();
    const buffer = this.musicBuffers.get(id);
    if (!context || !buffer) return;
    this.stopMusic();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(getMusicSceneGain(id), context.currentTime + 0.55);
    source.connect(gain).connect(this.getOutputNode(context));
    try {
      source.start();
      this.musicSource = source;
      this.musicGain = gain;
      this.currentMusic = id;
    } catch { /* Audio context may still be waiting for a gesture. */ }
  }

  private stopMusic(): void {
    if (this.musicSource) {
      try { this.musicSource.stop(); this.musicSource.disconnect(); } catch { /* ignore */ }
      this.musicSource = null;
    }
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch { /* ignore */ }
      this.musicGain = null;
    }
    this.currentMusic = null;
  }

  public duckMusic(decibels = -3, durationMs = 180): void {
    const context = this.context;
    const gain = this.musicGain;
    const music = this.currentMusic;
    if (!context || !gain || !music) return;

    const now = context.currentTime;
    const total = Math.max(0.12, durationMs / 1000);
    const attack = Math.min(0.025, total * 0.2);
    const holdUntil = now + Math.max(attack, total - 0.09);
    const target = getMusicSceneGain(music);
    const ducked = Math.max(0.025, target * Math.pow(10, Math.min(-0.5, decibels) / 20));
    const current = Math.max(0.0001, gain.gain.value);

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(current, now);
    gain.gain.linearRampToValueAtTime(ducked, now + attack);
    gain.gain.setValueAtTime(ducked, holdUntil);
    gain.gain.linearRampToValueAtTime(target, now + total);
  }

  private startRequestedLoops(): void {
    if (this.requestedAmbience && !this.ambienceSource) this.startAmbience(this.requestedAmbience);
    if (this.requestedMusic && !this.musicSource) this.startMusic(this.requestedMusic);
  }

  public play(id: SfxId): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cooldown = COOLDOWN_MS[id] ?? 25;
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < cooldown) return;
    this.lastPlayed.set(id, now);
    const context = this.getContext();
    if (!context) return;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const variants = this.buffers.get(id);
    if (variants?.length) {
      if (this.activeSources.size >= MAX_SIMULTANEOUS_SFX) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      let variantIndex = Math.floor(Math.random() * variants.length);
      if (variants.length > 1 && variantIndex === this.lastVariantIndex.get(id)) variantIndex = (variantIndex + 1) % variants.length;
      this.lastVariantIndex.set(id, variantIndex);
      source.buffer = variants[variantIndex];
      const pitchSpread = id === 'footstep' ? 0.06 : 0.03;
      source.playbackRate.value = 1 - pitchSpread + Math.random() * pitchSpread * 2;
      gain.gain.value = getSfxMixGain(id);
      const pan = context.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 0.12;
      source.connect(gain).connect(pan).connect(this.getOutputNode(context));
      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        source.disconnect();
        gain.disconnect();
        pan.disconnect();
      };
      source.start();
      return;
    }
    this.playSynthFallback(context, id);
  }

  public setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    if (this.masterGain && this.context) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.context.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public isMuted(): boolean {
    return this.masterVolume <= 0.001;
  }

  public toggleMute(): boolean {
    if (this.isMuted()) {
      this.setMasterVolume(SFX_MASTER_VOLUME);
    } else {
      this.setMasterVolume(0);
    }
    void this.resumeAudio();
    return !this.isMuted();
  }

  public async resumeAudio(): Promise<boolean> {
    const context = this.getContext();
    if (!context) return false;
    if (context.state === 'suspended') {
      await context.resume();
    }
    if (context.state === 'running') this.startRequestedLoops();
    return context.state === 'running';
  }

  private async unlock(): Promise<void> {
    const context = this.getContext();
    if (context?.state === 'suspended') await context.resume();
    if (context?.state === 'running') this.startRequestedLoops();
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === 'undefined') return null;
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    this.context = Constructor ? new Constructor() : null;
    return this.context;
  }

  private getOutputNode(context: AudioContext): AudioNode {
    if (this.masterGain && this.limiter) return this.masterGain;

    this.masterGain = context.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.12;
    this.masterGain.connect(this.limiter).connect(context.destination);
    return this.masterGain;
  }

  private playSynthFallback(context: AudioContext, id: SfxId): void {
    if (id === 'glass_clink') {
      const duration = 0.09;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(2200, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(3200, context.currentTime + duration);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain).connect(this.getOutputNode(context));
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
      return;
    }

    const heavy = id === 'swing_j3' || id === 'hit_heavy' || id === 'ultimate_hit' || id === 'boss_warning' || id === 'gate_open' || id === 'parcel_hit';
    const bright = id === 'pickup' || id === 'order_complete' || id === 'cash_tick' || id === 'perfect_dodge';
    const duration = heavy ? 0.22 : bright ? 0.16 : id === 'footstep' ? 0.07 : 0.11;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = heavy ? 'sawtooth' : bright ? 'sine' : 'triangle';
    const base = bright ? 720 : heavy ? 105 : id === 'player_hurt' ? 145 : id === 'footstep' ? 95 : 230;
    oscillator.frequency.setValueAtTime(base, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, base * (bright ? 1.45 : 0.48)), context.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(getSfxMixGain(id) * (heavy ? 0.22 : 0.14), context.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(this.getOutputNode(context));
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }
}
