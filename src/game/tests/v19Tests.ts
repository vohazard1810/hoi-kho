import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Pickup } from '../entities/Pickup';
import { Rival } from '../entities/Rival';
import { APP_VERSION, BUILD_ID } from '../config/version';

interface Result { testName: string; passed: boolean; message: string }

export function runV19Tests(): { results: Result[] } {
  const results: Result[] = [];
  const test = (testName: string, fn: () => void) => {
    try { fn(); results.push({ testName, passed: true, message: 'V19 production assertions passed' }); }
    catch (error) { results.push({ testName, passed: false, message: String(error) }); }
  };

  test('V19 semantic version and build contract', () => {
    assert.match(APP_VERSION, /^0\.19\./);
    assert.match(BUILD_ID, /^V19/);
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    assert.equal(pkg.version, APP_VERSION);
  });

  test('V19 production pickup atlas exports are genuine alpha PNG files', () => {
    for (const name of ['health_banh_mi', 'parcel_repair_tape', 'momentum_drink', 'parts_bolt', 'bonus_coin']) {
      const data = fs.readFileSync(`public/assets/pickups/${name}.png`);
      assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(data[25], 6, `${name} must be RGBA`);
    }
  });

  test('V19 fragile parcel owns four readable damage-state assets', () => {
    for (const state of ['pristine', 'dented', 'cracked', 'critical']) {
      const data = fs.readFileSync(`public/assets/parcels/fragile_${state}.png`);
      assert.ok(data.length > 2000, `${state} cannot be an empty placeholder`);
      assert.equal(data.readUInt32BE(16), 192);
      assert.equal(data.readUInt32BE(20), 128);
    }
  });

  test('V19 comic prologue contains four 16:9 production beats', () => {
    for (let i = 1; i <= 4; i++) {
      const data = fs.readFileSync(`public/assets/prologue/beat_${i}_${['debt', 'bridge', 'flyer', 'hub'][i - 1]}.png`);
      assert.equal(data.readUInt32BE(16), 1280);
      assert.equal(data.readUInt32BE(20), 720);
    }
  });

  test('V19 pickup spawn has fade-in and one-bounce motion', () => {
    const pickup = new Pickup('probe', 'PARTS', 100, 500);
    pickup.update(1 / 60);
    assert.ok(pickup.spawnAlpha > 0 && pickup.spawnAlpha < 1);
    assert.ok(pickup.y < 500, 'fresh loot must arc upward before settling');
    for (let i = 0; i < 180; i++) pickup.update(1 / 60);
    assert.ok(Math.abs(pickup.y - 500) < 0.001, 'loot must settle on its drop plane');
  });

  test('V19 pickup retains magnet collection behavior', () => {
    const pickup = new Pickup('probe', 'HEALTH', 100, 100);
    const before = pickup.x;
    pickup.attractTo({ x: 190, y: 100, width: 36, height: 64 }, 0.1);
    assert.ok(pickup.isMagnetized);
    assert.ok(pickup.x > before);
  });

  test('V19 Rival drive-by is telegraphed, armed, then dismounts', () => {
    const rival = new Rival('rival_probe', 1200, 556);
    rival.startDriveBy();
    rival.startDriveBy();
    rival.startDriveBy();
    let cues = 0;
    rival.onDriveByCue = () => { cues++; };
    rival.updateAI(0.1, 900, 556);
    assert.equal(cues, 1);
    assert.equal(rival.takeDamage(99, 0, 0, 0, 0), false, 'vehicle phase must resist melee stagger');
    rival.updateAI(0.6, 900, 556);
    assert.equal(rival.driveByPhase, 'ACTIVE');
    assert.ok(rival.getActiveHitbox()?.parcelDamage === 6);
    rival.updateAI(1.1, 900, 556);
    assert.equal(rival.driveByPhase, 'DISMOUNTED');
    assert.notEqual(rival.wreckX, null);
  });

  test('V19 Rival vehicle art and wreck art are separate alpha assets', () => {
    for (const file of ['rival_driveby.png', 'rival_wreck.png']) {
      const data = fs.readFileSync(`public/assets/rival/${file}`);
      assert.deepEqual([...data.subarray(0, 4)], [137, 80, 78, 71]);
      assert.equal(data[25], 6);
    }
  });

  test('V19 fragile parcel clink is a real Ogg Vorbis asset and preloaded', () => {
    const data = fs.readFileSync('public/assets/audio/sfx/glass_clink.ogg');
    assert.equal(data.subarray(0, 4).toString('ascii'), 'OggS');
    const audio = fs.readFileSync('src/game/audio/AudioManager.ts', 'utf8');
    assert.match(audio, /'glass_clink'/);
  });

  test('V19 UI cleanup hides inactive DEV control and adds authored street signs', () => {
    const app = fs.readFileSync('src/App.tsx', 'utf8');
    assert.match(app, /isDevMode && <button\s+id="btn_toggle_dev_mode"/);
    const parallax = fs.readFileSync('src/game/rendering/ParallaxBackgroundRenderer.ts', 'utf8');
    assert.match(parallax, /CƠM TẤM CÔ NĂM/);
    assert.match(parallax, /SỬA XE TƯ LÙN/);
  });

  return { results };
}
