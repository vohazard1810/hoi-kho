import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BALANCE } from '../config/balance';
import { STAGE_1_CONFIG } from '../config/stage1';
import { APP_VERSION, BUILD_ID } from '../config/version';
import { Hitbox, Hurtbox } from '../core/types';
import { BossDog } from '../entities/BossDog';
import { CombatSystem, CombatTarget } from '../systems/CombatSystem';

interface Result { testName: string; passed: boolean; message: string }

function assertPngComplete(path: string): void {
  const data = fs.readFileSync(path);
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;
  let foundIend = false;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const end = offset + 12 + length;
    assert.ok(end <= data.length, `${path}: truncated PNG chunk`);
    const type = data.subarray(offset + 4, offset + 8).toString('ascii');
    offset = end;
    if (type === 'IEND') { foundIend = true; break; }
  }
  assert.ok(foundIend, `${path}: missing IEND chunk`);
  assert.equal(offset, data.length, `${path}: unexpected trailing bytes`);
}

export function runV19_1Tests(): { results: Result[] } {
  const results: Result[] = [];
  const test = (testName: string, fn: () => void) => {
    try { fn(); results.push({ testName, passed: true, message: 'V19.1 regression assertions passed' }); }
    catch (error) { results.push({ testName, passed: false, message: String(error) }); }
  };

  test('V19.1 version contract', () => {
    assert.match(APP_VERSION, /^0\.19\./);
    assert.match(BUILD_ID, /^V19\./);
    assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, APP_VERSION);
  });

  test('Stage 1 boss speed and recovery are opening-stage fair', () => {
    assert.equal(BALANCE.BOSS_DOG_DASH_SPEED, 468);
    assert.equal(BALANCE.BOSS_DOG_RECOVERY_TIME, 0.9);
    assert.equal(BALANCE.BOSS_DOG_PHASE2_RECOVERY, 0.7);
  });

  test('Normal boss recovery accepts full damage; perfect dodge earns 150%', () => {
    const boss = new BossDog('boss_probe', 0, 0);
    (boss as unknown as { state: string }).state = 'DASH_RECOVERY';
    assert.equal(boss.damageMultiplier, 1);
    (boss as unknown as { state: string }).state = 'DASH_ACTIVE';
    assert.equal(boss.registerPerfectDodge(), true);
    (boss as unknown as { state: string }).state = 'DASH_RECOVERY';
    assert.equal(boss.damageMultiplier, 1.5);
  });

  test('Resolved perfect-dodge hitbox cannot damage after invulnerability ends', () => {
    const combat = new CombatSystem();
    let damageCalls = 0;
    const target: CombatTarget = {
      id: 'player_probe',
      getHurtbox: (): Hurtbox => ({ x: 0, y: 0, width: 32, height: 64, ownerId: 'player_probe' }),
      takeDamage: () => { damageCalls++; return true; },
    };
    const hitbox: Hitbox = { id: 'boss_dash_probe', ownerId: 'boss', x: 0, y: 0, width: 80, height: 80, damage: 30 };
    combat.resolveWithoutDamage(hitbox.id, target.id);
    assert.deepEqual(combat.evaluateHitbox(hitbox, [target]), []);
    assert.equal(damageCalls, 0);
  });

  test('All comic prologue PNGs have complete chunk structure', () => {
    ['beat_1_debt.png', 'beat_2_bridge.png', 'beat_3_flyer.png', 'beat_4_hub.png']
      .forEach((file) => assertPngComplete(`public/assets/prologue/${file}`));
  });

  test('V19 visual preload degrades per asset instead of blocking the pack', () => {
    const source = fs.readFileSync('src/game/rendering/ProductionVisualsV19.ts', 'utf8');
    assert.match(source, /Promise\.allSettled/);
    assert.match(source, /using per-asset fallbacks/);
  });

  test('Prologue uses cross-fade and bottom gradient without opaque slide card', () => {
    const scene = fs.readFileSync('src/game/scenes/PrologueScene.ts', 'utf8');
    const renderer = fs.readFileSync('src/game/rendering/Renderer.ts', 'utf8');
    assert.match(scene, /transitionElapsed/);
    assert.match(renderer, /captionGradient/);
    assert.doesNotMatch(renderer, /fillRect\(70, 70, 610, 330\)/);
  });

  test('Result receipt exposes gross pay, parcel deduction, bonus, and total', () => {
    const renderer = fs.readFileSync('src/game/rendering/PlaceholderRenderer.ts', 'utf8');
    assert.match(renderer, /Công giao hàng gốc:/);
    assert.match(renderer, /Khấu trừ kiện hư:/);
    assert.match(renderer, /BALANCE\.BASE_REWARD - result\.baseReward/);
    assert.match(renderer, /shownIncome = shownGross - shownPenalty \+ shownBonus/);
  });

  test('Boss arena has escape space beyond gate and customer', () => {
    const zoneE = STAGE_1_CONFIG.ZONES.find((zone) => zone.id === 'E');
    assert.ok(zoneE);
    assert.ok(STAGE_1_CONFIG.WORLD_WIDTH >= 3650);
    assert.ok(zoneE.endX - zoneE.gateX >= 200);
    assert.ok(STAGE_1_CONFIG.NPC_CUSTOMER_X > zoneE.gateX);
  });

  return { results };
}
