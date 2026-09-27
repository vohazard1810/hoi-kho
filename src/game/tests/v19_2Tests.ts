import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pickupSfx, MAX_SIMULTANEOUS_SFX, SFX_MASTER_VOLUME } from '../audio/AudioManager';
import { BALANCE } from '../config/balance';
import { APP_VERSION, BUILD_ID } from '../config/version';
import { calculateParcelDamage, PARCEL_PROFILES } from '../systems/ParcelDamagePolicy';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';

interface Result { testName: string; passed: boolean; message: string }

function assertOgg(path: string, minBytes: number): void {
  const data = fs.readFileSync(path);
  assert.equal(data.subarray(0, 4).toString('ascii'), 'OggS', `${path} is not Ogg`);
  assert.ok(data.length >= minBytes, `${path} is suspiciously small (${data.length} bytes)`);
}

export function runV19_2Tests(): { results: Result[] } {
  const results: Result[] = [];
  const test = (testName: string, fn: () => void) => {
    try { fn(); results.push({ testName, passed: true, message: 'V19.2 Stage 1 lock assertion passed' }); }
    catch (error) { results.push({ testName, passed: false, message: String(error) }); }
  };

  test('V19.2-or-newer version and build contract', () => {
    assert.match(APP_VERSION, /^0\.19\.[2-9]$/);
    assert.match(BUILD_ID, /^V19\.[2-9]/);
    assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, APP_VERSION);
  });

  test('Every scene owns a substantial original Ogg music loop', () => {
    for (const id of ['menu_music', 'hub_music', 'stage_music', 'result_music']) {
      assertOgg(`public/assets/audio/music/${id}.ogg`, 80_000);
    }
  });

  test('Movement and combat SFX variants are shipped as real Ogg assets', () => {
    for (const id of [
      'footstep', 'footstep_2', 'footstep_3', 'jump', 'land',
      'swing_j1', 'swing_j1_2', 'swing_j2', 'swing_j2_2', 'swing_j3', 'swing_j3_2',
      'hit_light', 'hit_light_2', 'hit_light_3', 'hit_heavy', 'hit_heavy_2', 'hit_heavy_3',
      'parcel_hit', 'parcel_repair', 'ultimate_charge', 'ultimate_hit'
    ]) assertOgg(`public/assets/audio/sfx/${id}.ogg`, 5_000);
  });

  test('Audio scene routing and browser-unlock recovery prevent silent intro', () => {
    const source = fs.readFileSync('src/game/audio/AudioManager.ts', 'utf8');
    assert.match(source, /scene === 'MENU' \|\| scene === 'PROLOGUE'/);
    assert.match(source, /scene === 'HUB'[\s\S]*?'hub_music'/);
    assert.match(source, /scene === 'STAGE_1'[\s\S]*?'stage_music'/);
    assert.match(source, /scene === 'RESULT'[\s\S]*?'result_music'/);
    assert.match(source, /startRequestedLoops\(\)/);
    assert.match(source, /context\?\.state === 'running'/);
  });

  test('Footstep repetition is varied and the mix remains bounded', () => {
    const source = fs.readFileSync('src/game/audio/AudioManager.ts', 'utf8');
    assert.match(source, /footstep: 3/);
    assert.match(source, /lastVariantIndex/);
    assert.equal(SFX_MASTER_VOLUME, 0.62);
    assert.equal(MAX_SIMULTANEOUS_SFX, 10);
  });

  test('Jump and landing callbacks are wired in Hub and Stage 1', () => {
    const player = fs.readFileSync('src/game/entities/Player.ts', 'utf8');
    const hub = fs.readFileSync('src/game/scenes/HubScene.ts', 'utf8');
    const stage = fs.readFileSync('src/game/scenes/Stage1Scene.ts', 'utf8');
    assert.match(player, /onJumpStarted\?\.\(\)/);
    assert.match(player, /onLanded\?\.\(\)/);
    assert.match(hub, /onJumpStarted[\s\S]*?play\('jump'\)/);
    assert.match(stage, /onLanded[\s\S]*?play\('land'\)/);
  });

  test('Fragile parcel receives the profile cap at the real Stage 1 callsite', () => {
    const front = calculateParcelDamage(8, 1, 100, 'right', 140, PARCEL_PROFILES.fragile_glass);
    const rear = calculateParcelDamage(8, 1, 100, 'right', 60, PARCEL_PROFILES.fragile_glass);
    assert.equal(front.amount, 8);
    assert.equal(rear.amount, 10, 'rear-hit 12% must cap at 10% for fragile cargo');
    const source = fs.readFileSync('src/game/scenes/Stage1Scene.ts', 'utf8');
    assert.match(source, /calculateParcelDamage\([\s\S]*?objective\.parcelProfile[\s\S]*?\)/);
  });

  test('Parcel damage is recoverable in play but cannot be repaired beyond 90%', () => {
    const objective = ObjectiveSystem.getInstance();
    objective.reset();
    objective.startDelivery();
    objective.restoreSnapshot({ parcelCondition: 50, bonusReward: 0 });
    assert.equal(objective.repairParcel(BALANCE.PICKUP_PARCEL_REPAIR_AMOUNT), 15);
    assert.equal(objective.parcelCondition, 65);
    objective.restoreSnapshot({ parcelCondition: 88, bonusReward: 0 });
    assert.equal(objective.repairParcel(15), 2);
    assert.equal(objective.parcelCondition, BALANCE.PARCEL_FIELD_REPAIR_CAP);
    objective.restoreSnapshot({ parcelCondition: 100, bonusReward: 0 });
    assert.equal(objective.repairParcel(15), 0);
    assert.equal(objective.parcelCondition, 100, 'repair cannot lower a pristine parcel');
  });

  test('Repair pickup has distinct audio and explicit HUD feedback', () => {
    assert.equal(pickupSfx('PARCEL_REPAIR'), 'parcel_repair');
    const renderer = fs.readFileSync('src/game/rendering/PlaceholderRenderer.ts', 'utf8');
    assert.match(renderer, /GIA CỐ KIỆN/);
    assert.match(renderer, /lastParcelRepair/);
  });

  test('Result receipt reveals components and total from one shared progress value', () => {
    const renderer = fs.readFileSync('src/game/rendering/PlaceholderRenderer.ts', 'utf8');
    assert.match(renderer, /const shownGross = Math\.round\(BALANCE\.BASE_REWARD \* reveal\)/);
    assert.match(renderer, /const shownPenalty = Math\.round/);
    assert.match(renderer, /const shownBonus = Math\.round/);
    assert.match(renderer, /const shownIncome = shownGross - shownPenalty \+ shownBonus/);
  });

  return { results };
}
