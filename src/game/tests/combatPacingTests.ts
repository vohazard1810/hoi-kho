import { BALANCE } from '../config/balance';
import { Player } from '../entities/Player';
import { getSfxMixGain, MAX_SIMULTANEOUS_SFX, SFX_MASTER_VOLUME } from '../audio/AudioManager';

export interface CombatPacingTestResult { testName: string; passed: boolean; message: string; }

export function runCombatPacingTests(): { results: CombatPacingTestResult[] } {
  const results: CombatPacingTestResult[] = [];

  {
    const player = new Player(100, 100);
    const first = player.takeDamage(14, 0, 0, 0);
    const hpAfterFirst = player.hp;
    const stacked = player.takeDamage(18, 0, 0, 0);
    const passed = first && !stacked && player.hp === hpAfterFirst;
    results.push({ testName: 'Player i-frame blocks same-window enemy damage stacking', passed, message: passed ? 'Second overlapping enemy hit cannot bypass the 0.6s protection window' : 'Overlapping hits reduced HP more than once' });
  }

  {
    const player = new Player(100, 100);
    player.takeDamage(10, 0, 0, 0);
    player.update(BALANCE.INVULNERABLE_DURATION + 0.01);
    const nextHit = player.takeDamage(10, 0, 0, 0);
    const passed = nextHit && player.hp === player.maxHp - 20;
    results.push({ testName: 'Player becomes damageable after configured i-frame duration', passed, message: passed ? 'A later valid attack can damage after 0.6s' : 'I-frame did not release at the configured boundary' });
  }

  {
    const gains = [getSfxMixGain('swing_j1'), getSfxMixGain('hit_heavy'), getSfxMixGain('ultimate_hit')];
    const passed = SFX_MASTER_VOLUME === 0.62
      && MAX_SIMULTANEOUS_SFX === 10
      && gains.every((gain) => gain > 0 && gain <= 0.9);
    results.push({ testName: 'SFX mix policy keeps headroom and bounded voice count', passed, message: passed ? 'Master gain 0.62, per-event gains capped at 0.9, maximum 10 voices' : 'Audio mix safety contract mismatch' });
  }

  return { results };
}
