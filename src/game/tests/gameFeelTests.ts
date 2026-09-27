import { Camera } from '../core/Camera';
import { GameFeelSystem } from '../systems/GameFeelSystem';
import { AudioSink, SfxId, meleeHitSfx, meleeSwingSfx } from '../audio/AudioManager';

export interface GameFeelTestResult { testName: string; passed: boolean; message: string; }

export function runGameFeelTests(): { results: GameFeelTestResult[] } {
  const results: GameFeelTestResult[] = [];

  {
    const system = new GameFeelSystem();
    system.triggerUltimateActivation(120, 80);
    const snapshot = system.getSnapshot();
    const shake = system.consumeShakeRequest();
    const passed = snapshot.ultimatePulses.length === 1
      && snapshot.particles.length === 18
      && snapshot.hitStopRemaining === 0
      && shake?.intensity === 3.5;
    results.push({ testName: 'Ultimate activation remains visible without a confirmed hit', passed, message: passed ? 'Q emits pulse, particles, and light shake without false hit-stop' : 'Ultimate activation feedback mismatch' });
  }

  {
    const system = new GameFeelSystem();
    system.triggerParcelShield(64, 96);
    const initial = system.getSnapshot();
    for (let i = 0; i < 10; i++) system.update(1 / 60);
    const expired = system.getSnapshot();
    const passed = initial.parcelShieldPulses.length === 1
      && initial.particles.length === 5
      && expired.parcelShieldPulses.length === 0;
    results.push({ testName: 'Parcel shield feedback is brief and event-driven', passed, message: passed ? 'Shield pulse exists for 160ms and then fully expires' : 'Parcel protection pulse lifetime mismatch' });
  }

  {
    const played: SfxId[] = [];
    const audio: AudioSink = { play: (id) => played.push(id) };
    const system = new GameFeelSystem(audio);
    system.triggerMeleeHit('J1', [], 100, 100);
    system.triggerProjectileHit([], 100, 100);
    const passed = played.length === 0;
    results.push({ testName: 'Audio gate stays silent when attacks miss', passed, message: passed ? 'No impact SFX emitted for melee/projectile misses' : `Unexpected SFX: ${played.join(', ')}` });
  }

  {
    const played: SfxId[] = [];
    const audio: AudioSink = { play: (id) => played.push(id) };
    const system = new GameFeelSystem(audio);
    system.triggerMeleeHit('J1', ['enemy_a'], 100, 100);
    system.triggerMeleeHit('J3', ['enemy_b'], 100, 100);
    system.triggerProjectileHit(['enemy_c'], 100, 100);
    const expected: SfxId[] = ['hit_light', 'hit_heavy', 'tape_hit'];
    const passed = played.join('|') === expected.join('|');
    results.push({ testName: 'Confirmed hits route to strength-matched SFX', passed, message: passed ? 'J1/J3/tape use light/heavy/tape impact channels' : `Actual: ${played.join(', ')}` });
  }

  {
    const passed = meleeSwingSfx('J1') === 'swing_j1' && meleeSwingSfx('J3') === 'swing_j3' && meleeHitSfx('ULTIMATE') === 'ultimate_hit';
    results.push({ testName: 'Swing and impact audio channels remain separate', passed, message: passed ? 'Input whoosh cannot substitute confirmed-hit impact' : 'Audio routing contract mismatch' });
  }

  {
    const system = new GameFeelSystem();
    system.triggerMeleeHit('J3', [], 100, 100);
    const snapshot = system.getSnapshot();
    const shake = system.consumeShakeRequest();
    const passed = snapshot.hitStopRemaining === 0 && snapshot.particles.length === 0 && shake === null;
    results.push({ testName: 'Miss produces no hit-stop, shake, flash, or particles', passed, message: passed ? 'No feedback triggered for empty hit list' : 'Feedback incorrectly triggered on miss' });
  }

  {
    const system = new GameFeelSystem();
    system.triggerMeleeHit('J1', ['enemy_a'], 120, 80);
    const snapshot = system.getSnapshot();
    const shake = system.consumeShakeRequest();
    const passed = snapshot.hitStopRemaining === 0.065 && snapshot.flashingTargetIds.has('enemy_a') && snapshot.particles.length === 6 && shake?.intensity === 2;
    results.push({ testName: 'J1 hit uses light feedback profile', passed, message: passed ? '65ms stop, 2px shake, flash, 6 particles' : 'J1 profile mismatch' });
  }

  {
    const system = new GameFeelSystem();
    system.triggerMeleeHit('J3', ['enemy_a'], 120, 80);
    const shake = system.consumeShakeRequest();
    const passed = system.getSnapshot().hitStopRemaining === 0.11 && shake?.intensity === 5;
    results.push({ testName: 'J3 hit uses heavy feedback profile', passed, message: passed ? '110ms stop and 5px shake' : 'J3 profile mismatch' });
  }

  {
    const system = new GameFeelSystem();
    system.triggerMeleeHit('J1', ['enemy_a'], 0, 0);
    const initiallyFrozen = system.update(1 / 60);
    for (let i = 0; i < 5; i++) system.update(1 / 60);
    const eventuallyUnfrozen = !system.update(1 / 60);
    const passed = initiallyFrozen && eventuallyUnfrozen;
    results.push({ testName: 'Hit-stop freezes temporarily and releases', passed, message: passed ? 'Freeze released after configured duration' : 'Freeze timer did not release correctly' });
  }

  {
    const camera = new Camera(3200, 720);
    camera.startShake(5, 0.1);
    camera.updateShake(1 / 60);
    const shaken = camera.worldToScreen(100, 100);
    for (let i = 0; i < 10; i++) camera.updateShake(1 / 60);
    const settled = camera.worldToScreen(100, 100);
    const passed = (shaken.x !== 100 || shaken.y !== 100) && settled.x === 100 && settled.y === 100;
    results.push({ testName: 'Camera shake offsets rendering only and settles to zero', passed, message: passed ? 'Transient screen offset without changing camera position' : 'Camera shake did not settle correctly' });
  }

  return { results };
}
