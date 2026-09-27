import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BALANCE } from '../config/balance';
import { BossDog } from '../entities/BossDog';
import { Pickup } from '../entities/Pickup';
import { EconomySystem } from '../systems/EconomySystem';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { calculateParcelDamage } from '../systems/ParcelDamagePolicy';

export function runV16Tests() {
  const results: { testName: string; passed: boolean; message: string }[] = [];
  const test = (name: string, fn: () => void) => {
    try { fn(); results.push({ testName: name, passed: true, message: 'Runtime assertions passed' }); }
    catch (error) { results.push({ testName: name, passed: false, message: String(error) }); }
  };

  test('Delivery payout reduces persistent debt exactly once', () => {
    const economy = EconomySystem.getInstance(); economy.resetForTests();
    const objective = ObjectiveSystem.getInstance(); objective.reset(); objective.startDelivery();
    objective.addBonusReward(10_000);
    const first = objective.completeDelivery(100), second = objective.completeDelivery(100);
    assert.equal(first.totalReward, 60_000);
    assert.equal(first.debtPayment, 60_000);
    assert.equal(first.remainingDebt, BALANCE.INITIAL_DEBT_VND - 60_000);
    assert.equal(second.remainingDebt, first.remainingDebt);
    assert.equal(economy.getSnapshot().deliveriesCompleted, 1);
    economy.resetForTests(); objective.reset();
  });

  test('Debt ledger survives a browser-session reload', () => {
    const memory = new Map<string, string>();
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key), clear: () => memory.clear(), key: () => null, length: 0 };
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    try {
      (EconomySystem as any).instance = null;
      const first = EconomySystem.getInstance(); first.recordDelivery(62_500);
      (EconomySystem as any).instance = null;
      const restored = EconomySystem.getInstance().getSnapshot();
      assert.equal(restored.remainingDebt, BALANCE.INITIAL_DEBT_VND - 62_500);
      assert.equal(restored.lifetimeEarnings, 62_500); assert.equal(restored.deliveriesCompleted, 1);
    } finally {
      (EconomySystem as any).instance = null;
      delete (globalThis as any).localStorage;
      EconomySystem.getInstance().resetForTests();
    }
  });

  test('Parcel rear hit is 50 percent harsher and protection composes once', () => {
    const front = calculateParcelDamage(20, 1, 100, 'right', 140);
    const rear = calculateParcelDamage(20, 1, 100, 'right', 60);
    const protectedRear = calculateParcelDamage(20, 0.55, 100, 'right', 60);
    assert.equal(front.amount, 20); assert.equal(front.rearHit, false);
    assert.equal(rear.amount, 30); assert.equal(rear.rearHit, true);
    assert.equal(protectedRear.amount, 16.5);
  });

  test('Pickup magnet attracts at range but collection still needs proximity', () => {
    const pickup = new Pickup('part', 'PARTS', 200, 100);
    const player = { x: 80, y: 90, width: 36, height: 64 };
    const before = pickup.x; assert.equal(pickup.checkCollection(player), false);
    pickup.attractTo(player, 0.1);
    assert.ok(pickup.isMagnetized); assert.ok(pickup.x < before);
    assert.equal(pickup.checkCollection(player), false);
  });

  test('Boss punishes attack greed while Perfect Dodge opens counter window', () => {
    const boss = new BossDog('boss_v16', 100, 568);
    boss.state = 'BITE_ACTIVE';
    const baseDamage = boss.getActiveHitbox()!.damage;
    for (let i = 0; i < 5; i++) boss.takeDamage(5, 0, 0, 0);
    assert.ok(boss.getActiveHitbox()!.damage > baseDamage);
    assert.ok(boss.registerPerfectDodge());
    assert.equal(boss.antiSpamLevel, 0);
    boss.state = 'BITE_RECOVERY'; const hp = boss.hp;
    boss.takeDamage(20, 0, 0, 0);
    assert.equal(hp - boss.hp, 30);
  });

  test('V16 feedback sounds are shipped as real OGG files', () => {
    for (const id of ['footstep', 'parcel_hit', 'cash_tick', 'perfect_dodge']) {
      const data = fs.readFileSync(`public/assets/audio/sfx/${id}.ogg`);
      assert.equal(data.subarray(0, 4).toString('ascii'), 'OggS');
      assert.ok(data.byteLength > 1000);
    }
    for (const id of ['hub_ambience', 'stage_ambience']) {
      const data = fs.readFileSync(`public/assets/audio/ambience/${id}.ogg`);
      assert.equal(data.subarray(0, 4).toString('ascii'), 'OggS'); assert.ok(data.byteLength > 5000);
    }
  });

  return { results };
}
