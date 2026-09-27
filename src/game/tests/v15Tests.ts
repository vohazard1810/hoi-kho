import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BossDog } from '../entities/BossDog';
import { Dog } from '../entities/Dog';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { PoiseGuard } from '../systems/PoiseGuard';
import { TrainingTarget } from '../systems/TrainingTarget';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { SpriteRenderer } from '../rendering/SpriteRenderer';
import { Camera } from '../core/Camera';
import { CharacterRuntimeSet } from '../assets/contracts';
import { EconomySystem } from '../systems/EconomySystem';

export function runV15Tests() {
  const results: { testName: string; passed: boolean; message: string }[] = [];
  const test = (name: string, fn: () => void) => {
    try { fn(); results.push({ testName: name, passed: true, message: 'Runtime assertions passed' }); }
    catch (error) { results.push({ testName: name, passed: false, message: String(error) }); }
  };
  test('All 12 HD states draw exactly one cell, even with stale cached dimensions', () => {
    const manifest = JSON.parse(fs.readFileSync('public/assets/staging_hd/player/manifest.json', 'utf8'));
    for (const [name, state] of Object.entries(manifest.states) as [string, any][]) {
      const calls: any[][] = [];
      const ctx = { save() {}, restore() {}, translate() {}, scale() {}, drawImage(...args: any[]) { calls.push(args); } } as unknown as CanvasRenderingContext2D;
      const image = { naturalWidth: state.frameWidth * state.frameCount, naturalHeight: state.frameHeight } as HTMLImageElement;
      const set = { characterId: 'player', manifest, status: 'PRODUCTION', isReady: true, states: new Map([[name, { image, contract: state, frameWidth: 543, frameHeight: 724 }]]) } as CharacterRuntimeSet;
      for (const facing of ['left', 'right'] as const) for (let i = 0; i < state.frameCount; i++) {
        calls.length = 0;
        const result = SpriteRenderer.renderCharacter(ctx, new Camera(), set, name, (i + 0.01) / state.fps, 100, 620, facing);
        assert.equal(result.rendered, true); assert.equal(calls.length, 1);
        assert.deepEqual(calls[0].slice(1, 5), [i * state.frameWidth, 0, state.frameWidth, state.frameHeight]);
      }
    }
  });
  test('Poise protects after three flinches and expires instead of permanent armor', () => {
    const guard = new PoiseGuard();
    assert.ok(guard.allowFlinch()); assert.ok(guard.allowFlinch()); assert.ok(guard.allowFlinch());
    assert.equal(guard.allowFlinch(), false); guard.update(1.5); assert.ok(guard.allowFlinch());
  });
  test('Dog, Rival and Thug keep taking HP damage during temporary poise', () => {
    const dog = new Dog('d', 100, 588), rival = new Rival('r', 100, 556), thug = new Thug('t', 100, 546);
    for (const enemy of [dog, rival, thug]) {
      const hit = () => enemy instanceof Thug ? enemy.takeDamage(1, 0, 0, 0) : enemy.takeDamage(1, 0, 0, 0, 0);
      for (let i = 0; i < 3; i++) hit();
      enemy.state = 'IDLE'; const hp = enemy.hp; hit();
      assert.equal(enemy.hp, hp - 1); assert.equal(enemy.state, 'IDLE');
    }
  });
  test('Boss under repeated hits reaches telegraph and active, without blocking damage', () => {
    const boss = new BossDog('boss', 100, 568), player = new Player(130, 556);
    const ground = [{ x: 0, y: 620, width: 1280, height: 100 }];
    boss.isGrounded = true; let reachedActive = false, telegraph = false;
    for (let i = 0; i < 100; i++) {
      if (i % 6 === 0) boss.takeDamage(1, 100, 80, 0);
      boss.updateAI(player, 1 / 60, [], ground); boss.update(1 / 60);
      if (String(boss.state).includes('TELEGRAPH')) telegraph = true;
      if (boss.getActiveHitbox()) reachedActive = true;
    }
    assert.ok(telegraph); assert.ok(reachedActive); assert.ok(boss.hp < boss.maxHp);
    boss.takeDamage(10000, 0, 0, 0); assert.equal(boss.state, 'KO');
  });
  test('Training J and Q require a real overlapping active hitbox', () => {
    const target = new TrainingTarget(), player = new Player(0, 556);
    player.actionState = 'ATTACK'; player.attackPhase = 'ACTIVE'; player.comboStep = 'J1';
    assert.equal(target.update(0, player, 'ATTACK'), null);
    player.x = 475; assert.equal(target.update(0, player, 'ATTACK'), 'ATTACK');
    assert.equal(target.update(0, player, 'ATTACK'), null);
    target.reset(); player.comboStep = 'ULTIMATE';
    assert.equal(target.update(0, player, 'ULTIMATE'), 'ULTIMATE');
  });
  test('Boss armor reduces damage while every recovery rewards counterattacks', () => {
    const boss = new BossDog('armor', 100, 568);
    boss.state = 'DASH_TELEGRAPH'; let hp = boss.hp;
    boss.takeDamage(20, 0, 0, 0); assert.equal(hp - boss.hp, 6); assert.equal(boss.state, 'DASH_TELEGRAPH');
    boss.state = 'DASH_RECOVERY'; hp = boss.hp;
    boss.takeDamage(20, 0, 0, 0); assert.equal(hp - boss.hp, 20);
  });
  test('Training K requires projectile collision, not throw input', () => {
    const target = new TrainingTarget(), player = new Player(0, 556);
    target.projectiles.push(new Projectile(100, 580, 'left', player.id));
    assert.equal(target.update(0.1, player, 'PROJECTILE'), null);
    target.projectiles.push(new Projectile(505, 580, 'right', player.id));
    assert.equal(target.update(0, player, 'PROJECTILE'), 'PROJECTILE');
  });
  test('Training dodge requires the active warning lane and i-frame', () => {
    const target = new TrainingTarget(), player = new Player(475, 556);
    player.actionState = 'DODGE'; player.isInvulnerable = true;
    assert.equal(target.update(0.1, player, 'DODGE'), null);
    assert.equal(target.update(1.15, player, 'DODGE'), 'DODGE');
    player.x = 50; assert.equal(target.update(0, player, 'DODGE'), null);
  });
  test('Parcel feedback records actual bounded loss; invalid damage cannot heal/corrupt', () => {
    EconomySystem.getInstance().resetForTests();
    const objective = ObjectiveSystem.getInstance(); objective.reset(); objective.startDelivery();
    objective.damageParcel(12); assert.equal(objective.parcelCondition, 88); assert.equal(objective.lastParcelDamage, 12);
    objective.damageParcel(NaN); objective.damageParcel(-10); assert.equal(objective.parcelCondition, 88);
    objective.damageParcel(100); assert.equal(objective.lastParcelDamage, 88); assert.equal(objective.parcelCondition, 0);
    const result = objective.completeDelivery(100); assert.equal(result.success, true); assert.ok(result.isDamaged);
    objective.reset(); assert.equal(objective.lastParcelDamage, 0);
    EconomySystem.getInstance().resetForTests();
  });
  return { results };
}
