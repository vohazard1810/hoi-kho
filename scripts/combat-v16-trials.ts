/** Deterministic arena probe, not a substitute for human playtesting. */
import { Player } from '../src/game/entities/Player';
import { BossDog } from '../src/game/entities/BossDog';
import { UpgradeSystem } from '../src/game/systems/UpgradeSystem';
import { CombatSystem } from '../src/game/systems/CombatSystem';
import { CollisionSystem } from '../src/game/systems/CollisionSystem';
import { GameFeelSystem } from '../src/game/systems/GameFeelSystem';
import { Input } from '../src/game/core/Input';
import { BALANCE } from '../src/game/config/balance';

const reports = [];
const originalNow = Date.now;
try {
  for (const tier of [0, 1, 2]) {
    const upgrades = UpgradeSystem.getInstance(); upgrades.resetProgress(); upgrades.addParts(100);
    if (tier >= 1) upgrades.purchaseOrEquip('scanner_pro');
    if (tier === 2) { upgrades.recordStageClear('STAGE_1'); upgrades.purchaseOrEquip('precision_scan'); }
    const player = new Player(470, 556), boss = new BossDog('trial_boss', 540, 568);
    const combat = new CombatSystem(), feel = new GameFeelSystem();
    const ground = [{ x: 0, y: 620, width: 1280, height: 100 }];
    player.isGrounded = boss.isGrounded = true;
    let tick = 0, seconds = 0, activeAttacks = 0, playerHits = 0, previous = '';
    for (; tick < 3600 && player.hp > 0 && boss.isAlive; tick++) {
      seconds = tick / 60; Date.now = () => 100000 + Math.round(seconds * 1000);
      if (feel.update(1 / 60)) continue;
      const input = { isJustPressed: (key: string) => key === 'attack' && tick % 8 === 0, isDown: () => false } as unknown as Input;
      player.handleInput(input);
      const gap = boss.x + boss.width / 2 - (player.x + player.width / 2);
      player.applyMovementInput(Math.abs(gap) > 58 ? Math.sign(gap) : 0, 1 / 60);
      if (player.actionState === 'NONE') player.facing = gap >= 0 ? 'right' : 'left';
      const py = player.y; player.x += player.vx / 60; player.y += player.vy / 60;
      CollisionSystem.resolveHorizontal(player, 1280); CollisionSystem.resolveVertical(player, [], ground, py); player.update(1 / 60);
      boss.updateAI(player, 1 / 60, [], ground);
      if (boss.state.endsWith('_ACTIVE') && boss.state !== previous) activeAttacks++;
      previous = boss.state;
      const by = boss.y; boss.x += boss.vx / 60; boss.y += boss.vy / 60;
      CollisionSystem.resolveHorizontal(boss, 1280); CollisionSystem.resolveVertical(boss, [], ground, by); boss.update(1 / 60);
      const hits = combat.evaluateHitbox(player.getActiveHitbox(), [{ id: boss.id, getHurtbox: () => boss.getHurtbox(), takeDamage: (d, _p, x, y, s) => boss.takeDamage(d, x, y, s) }]);
      if (hits.length) feel.triggerMeleeHit(player.comboStep, hits, boss.x, boss.y);
      const returns = combat.evaluateHitbox(boss.getActiveHitbox(), [{ id: player.id, getHurtbox: () => player.getHurtbox(), takeDamage: (d, _p, x, y, s) => player.takeDamage(d, x, y, s) }]);
      if (returns.length) { playerHits++; feel.triggerPlayerDamaged(player.x, player.y); }
    }
    reports.push({ loadout: ['base', 'tier1', 'tier2_precision'][tier], input: 'approach + J every 8 ticks; no dodge/Q', elapsedSeconds: +(tick / 60).toFixed(2), bossHp: boss.hp, playerHp: player.hp, activeAttacks, playerHits, outcome: !boss.isAlive ? 'boss_ko' : player.hp <= 0 ? 'player_ko' : 'timeout', configuredBossHp: BALANCE.BOSS_DOG_HP });
  }
} finally { Date.now = originalNow; UpgradeSystem.getInstance().resetProgress(); }
console.log(JSON.stringify({ kind: 'scripted_arena_probe_not_browser_fps_or_human_balance', reports }, null, 2));
if (reports.some(r => r.activeAttacks === 0 || r.outcome !== 'boss_ko')) process.exitCode = 1;
