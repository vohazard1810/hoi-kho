import { AlleyRat } from '../entities/AlleyRat';
import { SaboteurShipper } from '../entities/SaboteurShipper';
import { AlleyGuard } from '../entities/AlleyGuard';
import { AlleyBrat } from '../entities/AlleyBrat';
import { Stage1Scene } from '../scenes/Stage1Scene';
import { SceneManager } from '../core/SceneManager';

export interface StreetEnemiesTestResult {
  testName: string;
  passed: boolean;
  message: string;
}

export function runStreetEnemiesTests(): { results: StreetEnemiesTestResult[] } {
  const results: StreetEnemiesTestResult[] = [];

  // Test 1: AlleyRat mechanics & active leaping hitbox
  {
    const rat = new AlleyRat('rat_test', 100, 580, 'B');
    const initialHurtbox = rat.getHurtbox();
    const noHitboxBeforeLeap = rat.getActiveHitbox() === null;

    // Simulate leap telegraph & execution
    rat.state = 'LEAP';
    const leapHitbox = rat.getActiveHitbox();
    const hasValidLeapHitbox =
      leapHitbox !== null &&
      leapHitbox.damage === 8 &&
      leapHitbox.parcelDamage === 6 &&
      leapHitbox.knockbackX === 140;

    // Damage & KO
    rat.takeDamage(25, 0, 100, 100, 50);
    const isKo = (rat.state as string) === 'KO' && !rat.isAlive && rat.getHurtbox().isInvulnerable;

    const passed = !initialHurtbox.isInvulnerable && noHitboxBeforeLeap && hasValidLeapHitbox && isKo;
    results.push({
      testName: 'AlleyRat leaping attack hitbox & KO vulnerability lifecycle',
      passed,
      message: passed
        ? 'AlleyRat leap hitbox active only during leap, KO triggers invulnerable death state'
        : 'AlleyRat state or hitbox evaluation failed',
    });
  }

  // Test 2: SaboteurShipper banana peel throw & sweep kick
  {
    const sab = new SaboteurShipper('sab_test', 200, 546, 'C');
    let peelThrown = false;
    sab.onThrowBananaPeel = (_x, _y, _vx, _vy) => {
      peelThrown = true;
    };

    // Trigger peel throw AI (player at distance ~230)
    sab.state = 'IDLE';
    sab.peelCooldown = 0;
    sab.updateAI(0.1, 450, 546, null, [], [], []);
    const throwInitiated = (sab.state as string) === 'THROW_PEEL';

    // Finish throw animation timer
    sab.stateTimer = 0;
    sab.updateAI(0.01, 450, 546, null, [], [], []);

    // Check sweep kick
    sab.state = 'SWEEP_KICK';
    const kickHitbox = sab.getActiveHitbox();
    const hasKickHitbox = kickHitbox !== null && kickHitbox.damage === 14 && kickHitbox.knockbackX === 280;

    const passed = throwInitiated && peelThrown && hasKickHitbox;
    results.push({
      testName: 'SaboteurShipper banana peel throwing and sweep kick mechanics',
      passed,
      message: passed
        ? 'Saboteur throws banana peel via callback and delivers low sweeping kick'
        : `Saboteur failed: throw=${throwInitiated}, peelThrown=${peelThrown}, kick=${hasKickHitbox}`,
    });
  }

  // Test 3: AlleyGuard frontal shield block, shatter on W+J Air Slam, and Megaphone AOE
  {
    const guard = new AlleyGuard('guard_test', 300, 538, 'D');
    guard.facing = 'left';
    guard.state = 'GUARD_STANCE';

    // Frontal attack from player (player at x=200, sourceX=200 < guard.x=300) with light hit (damage=15)
    const initialHp = guard.hp;
    const frontalResult = guard.takeDamage(15, 0, 100, 50, 200);
    const chipDamage = initialHp - guard.hp;
    const shieldHeld = chipDamage <= 3 && !guard.isShieldBroken;

    // Back attack from behind (sourceX=350 > guard.x+width)
    const hpBeforeBack = guard.hp;
    guard.takeDamage(15, 0, 100, 50, 350);
    const backDamageTaken = hpBeforeBack - guard.hp === 15;

    // Heavy hit (W+J Air Dive Slam with damage=35) shatters shield
    guard.state = 'GUARD_STANCE';
    guard.takeDamage(35, 0, 200, 100, 200);
    const shieldShattered = guard.isShieldBroken;

    // Megaphone blast AOE
    guard.state = 'MEGAPHONE_BLAST';
    const blastHitbox = guard.getActiveHitbox();
    const hasMegaphoneAoe = blastHitbox !== null && blastHitbox.width >= 120 && blastHitbox.damage === 16;

    const passed = frontalResult && shieldHeld && backDamageTaken && shieldShattered && hasMegaphoneAoe;
    results.push({
      testName: 'AlleyGuard frontal shield defense, Air Slam guard break, and Megaphone AOE blast',
      passed,
      message: passed
        ? 'Frontal attacks deflected with chip damage, broken by damage >= 35 (Air Slam), megaphone blast covers wide AOE'
        : `Guard failed: held=${shieldHeld}, backDmg=${backDamageTaken}, shatter=${shieldShattered}, aoe=${hasMegaphoneAoe}`,
    });
  }

  // Test 4: AlleyBrat water gun sniping, telegraph, and damage response
  {
    const brat = new AlleyBrat('brat_test', 500, 400, 'B');
    let waterShot = false;
    brat.onShootWater = (_x, _y, _vx, _vy) => {
      waterShot = true;
    };

    // AI triggers AIM when player is in range (~200px)
    brat.shootCooldown = 0;
    brat.updateAI(0.1, 650, 420, [], [], []);
    const isAiming = brat.state === 'AIM';

    // Finish aim timer to shoot
    brat.stateTimer = 0;
    brat.updateAI(0.01, 650, 420, [], [], []);
    const shotFired = (brat.state as string) === 'SHOOT' && waterShot;

    // Taking damage
    brat.takeDamage(20, 0, 100, 50, 450);
    const isKo = (brat.state as string) === 'KO' && !brat.isAlive && brat.getHurtbox().isInvulnerable;

    const passed = isAiming && shotFired && isKo;
    results.push({
      testName: 'AlleyBrat water gun telegraph, diagonal shot, and KO transition',
      passed,
      message: passed
        ? 'AlleyBrat telegraphs aim, fires water projectile via callback, and cleanly transitions to KO'
        : `Brat failed: aiming=${isAiming}, shotFired=${shotFired}, isKo=${isKo}`,
    });
  }

  // Test 5: Stage1Scene dynamic street enemies and street NPCs initialization & retry
  {
    const mockManager = { switchScene: () => {} } as unknown as SceneManager;
    const stage = new Stage1Scene(mockManager);
    stage.enterFreshStage();

    const stageAny = stage as any;
    const hasRats = stageAny.rats && stageAny.rats.length >= 2;
    const hasSaboteurs = stageAny.saboteurs && stageAny.saboteurs.length >= 1;
    const hasGuards = stageAny.guards && stageAny.guards.length >= 1;
    const hasBrats = stageAny.brats && stageAny.brats.length >= 1;
    const hasStreetNpcs = stageAny.streetNpcs && stageAny.streetNpcs.length >= 3;

    // Check interaction with Chị Ba Nước Mía
    const chibaNpc = stageAny.streetNpcs.find((n: any) => n.role === 'chiba');
    const playerHpBefore = stageAny.player.hp;
    stageAny.player.hp = Math.max(1, stageAny.player.hp - 30);
    chibaNpc.onInteract();
    const chibaHealed = stageAny.player.hp > playerHpBefore - 30;

    // Check interaction with Chú Bảy Vá Xe
    const chubayNpc = stageAny.streetNpcs.find((n: any) => n.role === 'chubay');
    stageAny.player.tapeCharges = 0;
    chubayNpc.onInteract();
    const chubayRefilled = stageAny.player.tapeCharges === stageAny.player.maxTapeCharges;

    // Checkpoint retry restores zone B street enemies (rat + brat)
    stage.captureEncounterCheckpoint('B');
    stageAny.rats = [];
    stageAny.brats = [];
    stage.retryFromCheckpoint();

    const restoredB = stageAny.rats.some((r: any) => r.zoneId === 'B') &&
                      stageAny.brats.some((b: any) => b.zoneId === 'B');

    const passed = hasRats && hasSaboteurs && hasGuards && hasBrats && hasStreetNpcs && chibaHealed && chubayRefilled && restoredB;
    results.push({
      testName: 'Stage1Scene street enemies and NPCs initialization, interaction, and checkpoint restoration',
      passed,
      message: passed
        ? 'Stage 1 initializes all enemies and street NPCs (Chị Ba, Chú Bảy, Bà Năm), handles interactions, and restores them on retry'
        : `Stage1 failed: rats=${hasRats}, sabs=${hasSaboteurs}, guards=${hasGuards}, brats=${hasBrats}, npcs=${hasStreetNpcs}, healed=${chibaHealed}, refilled=${chubayRefilled}, restoredB=${restoredB}`,
    });
  }

  return { results };
}
