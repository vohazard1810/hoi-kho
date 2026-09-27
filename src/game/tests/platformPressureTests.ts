import { EnemyProjectile } from '../entities/EnemyProjectile';
import { Rival } from '../entities/Rival';
import { CombatSystem } from '../systems/CombatSystem';

export interface PlatformPressureTestResult { testName: string; passed: boolean; message: string; }

export function runPlatformPressureTests(): { results: PlatformPressureTestResult[] } {
  const results: PlatformPressureTestResult[] = [];

  {
    const rival = new Rival('ranged_rival', 100, 500);
    rival.isGrounded = true;
    let throws = 0;
    rival.onRangedThrow = () => throws++;
    for (let i = 0; i < 90; i++) rival.updateAI(1 / 60, 300, 390);
    const passed = throws === 1 && rival.getActiveHitbox() === null;
    results.push({
      testName: 'Elevated player triggers one telegraphed Rival throw',
      passed,
      message: passed ? 'Vertical pressure uses one ranged projectile and never exposes a melee hitbox' : `Expected one throw without melee hitbox; throws=${throws}, mode=${rival.attackMode}, state=${rival.state}`,
    });
  }

  {
    const rival = new Rival('melee_rival', 100, 500);
    rival.isGrounded = true;
    let sawMeleeHitbox = false;
    for (let i = 0; i < 50; i++) {
      rival.updateAI(1 / 60, 145, 500);
      if (rival.getActiveHitbox()) sawMeleeHitbox = true;
    }
    const passed = rival.attackMode === 'MELEE' && sawMeleeHitbox;
    results.push({
      testName: 'Same-level close player preserves Rival melee behavior',
      passed,
      message: passed ? 'Existing approach/startup/active melee path remains reachable' : `Melee regression; mode=${rival.attackMode}, state=${rival.state}`,
    });
  }

  {
    const projectile = new EnemyProjectile('rival', 100, 100, 140, 120);
    const combat = new CombatSystem();
    let damageCalls = 0;
    const target = {
      id: 'player',
      getHurtbox: () => ({ x: 100, y: 100, width: 40, height: 40, ownerId: 'player', isInvulnerable: false }),
      takeDamage: () => { damageCalls++; return true; },
    };
    const hitbox = projectile.getHitbox();
    const first = combat.evaluateHitbox(hitbox, [target]);
    const second = combat.evaluateHitbox(hitbox, [target]);
    const passed = first.length === 1 && second.length === 0 && damageCalls === 1 && hitbox?.damage === 12 && hitbox.parcelDamage === 3;
    results.push({
      testName: 'Rival projectile is hit-once with reduced damage',
      passed,
      message: passed ? 'Combat history blocks repeat damage; values remain below Rival melee damage' : `Projectile hit contract failed; calls=${damageCalls}`,
    });
  }

  {
    const projectile = new EnemyProjectile('rival', 100, 100, 140, 120);
    const collided = projectile.checkSolidCollision(2000, [{ x: 95, y: 95, width: 40, height: 40 }]);
    const passed = collided && projectile.isExpired && projectile.getHitbox() === null;
    results.push({
      testName: 'Rival projectile expires on world geometry',
      passed,
      message: passed ? 'Platforms and ground stop the projectile instead of allowing wall hits' : 'Projectile survived solid collision',
    });
  }

  return { results };
}
