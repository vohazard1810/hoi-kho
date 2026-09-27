import fs from 'fs';
import path from 'path';
import { AssetValidator } from '../assets/AssetValidator';
import { VisualStateMapper } from '../assets/VisualStateMapper';
import { SpriteRenderer } from '../rendering/SpriteRenderer';
import { Player } from '../entities/Player';
import { CharacterAssetManifest } from '../assets/contracts';
import { BALANCE } from '../config/balance';
import { LocomotionState, ActionState, AttackComboStep } from '../core/types';

export interface TestCaseResult {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
  evidence: string;
}

export class PipelineTestSuite {
  public static runAllTests(): TestCaseResult[] {
    const results: TestCaseResult[] = [];

    // Test 1: PNG Signature validation - Corrupted UTF-8 header
    {
      const corruptHeader = new Uint8Array([0xef, 0xbf, 0xbd, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const res = AssetValidator.validatePngSignature(corruptHeader);
      results.push({
        name: 'PNG Header Signature Check (Corrupted UTF-8 Replacement Character)',
        expected: 'valid === false, identifies UTF-8 replacement header (0xEF 0xBF 0xBD)',
        actual: `valid === ${res.valid}, reasons: ${res.reasons.join(', ')}`,
        pass: res.valid === false && res.reasons[0].includes('UTF-8 replacement'),
        evidence: 'Detected 0xEF 0xBF 0xBD 0x50 leading bytes and blocked activation.',
      });
    }

    // Test 2: PNG Signature validation - Genuine PNG header
    {
      const validHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = AssetValidator.validatePngSignature(validHeader);
      results.push({
        name: 'PNG Header Signature Check (Valid Binary PNG)',
        expected: 'valid === true, 0 errors',
        actual: `valid === ${res.valid}, errors: ${res.reasons.length}`,
        pass: res.valid === true,
        evidence: 'Verified exact [89 50 4E 47 0D 0A 1A 0A] signature.',
      });
    }

    // Test 3: Manifest schema validation
    {
      const sampleManifest: CharacterAssetManifest = {
        characterId: 'player',
        formatVersion: 1,
        frameWidth: 96,
        frameHeight: 96,
        anchorX: 48,
        anchorY: 78,
        scale: 1,
        states: {
          idle: { file: 'player_idle.png', frameCount: 4, fps: 10, loop: true },
          run: { file: 'player_run.png', frameCount: 8, fps: 12, loop: true },
          jump: { file: 'player_jump.png', frameCount: 5, fps: 10, loop: false },
          fall: { file: 'player_fall.png', frameCount: 2, fps: 10, loop: false },
          land: { file: 'player_land.png', frameCount: 2, fps: 10, loop: false },
          dodge: { file: 'player_dodge.png', frameCount: 4, fps: 12, loop: false },
          j1: { file: 'player_j1.png', frameCount: 4, fps: 12, loop: false },
          j2: { file: 'player_j2.png', frameCount: 4, fps: 12, loop: false },
          j3: { file: 'player_j3.png', frameCount: 6, fps: 12, loop: false },
          hurt: { file: 'player_hurt.png', frameCount: 3, fps: 10, loop: false },
          ko: { file: 'player_ko.png', frameCount: 5, fps: 8, loop: false },
          getup: { file: 'player_getup.png', frameCount: 5, fps: 10, loop: false },
        },
      };
      const res = AssetValidator.validateManifest(sampleManifest);
      const reqRes = AssetValidator.validateRequiredPlayerStates(sampleManifest);
      results.push({
        name: 'Single Source of Truth Manifest Schema & 12 Required States Validation',
        expected: 'valid === true, 12 states validated',
        actual: `schema valid: ${res.valid}, required states valid: ${reqRes.valid}`,
        pass: res.valid && reqRes.valid,
        evidence: 'Validated formatVersion, frameWidth, frameHeight, anchor, and 12/12 state contracts.',
      });
    }

    // Test 4: Animation Timer Reset on State Transition: Idle -> Run
    {
      const player = new Player(100, 500);
      player.isGrounded = true;
      player.locomotionState = 'IDLE';
      player.update(0.1); // animTime becomes 0.1
      const idleTime = player.animTime;

      // Start running
      player.vx = 150;
      player.update(0.016); // Should transition to 'run' and reset animTime to 0

      results.push({
        name: 'Animation Timer Reset: Idle → Run',
        expected: 'animTime resets to ~0.016s (starts frame 0), previousVisualState updates to run',
        actual: `idleTime before: ${idleTime.toFixed(3)}s, run animTime: ${player.animTime.toFixed(3)}s, visualState: ${player.currentVisualState}`,
        pass: player.animTime < 0.05 && player.currentVisualState === 'run',
        evidence: 'Detected visual state change from idle to run, reset elapsed anim timer to 0.',
      });
    }

    // Test 5: Animation Timer Reset on Combo Progression: Run → J1 → J2 → J3
    {
      const player = new Player(100, 500);
      player.isGrounded = true;
      player.vx = 150;
      player.update(0.5); // Running for 0.5s

      // Start J1
      (player as any).startMeleeCombo('J1');
      player.update(0.016);
      const j1Reset = player.animTime < 0.05 && player.currentVisualState === 'j1';

      // Fast forward J1 and advance to J2
      player.animTime = 0.3;
      (player as any).startMeleeCombo('J2');
      player.update(0.016);
      const j2Reset = player.animTime < 0.05 && player.currentVisualState === 'j2';

      // Fast forward J2 and advance to J3
      player.animTime = 0.3;
      (player as any).startMeleeCombo('J3');
      player.update(0.016);
      const j3Reset = player.animTime < 0.05 && player.currentVisualState === 'j3';

      results.push({
        name: 'Animation Timer Reset: Run → J1 → J2 → J3 Combos',
        expected: 'Every combo step starts from frame 0 (animTime resets to 0)',
        actual: `J1: ${j1Reset}, J2: ${j2Reset}, J3: ${j3Reset}`,
        pass: j1Reset && j2Reset && j3Reset,
        evidence: 'startMeleeCombo explicitly resets animTime to 0 for J1, J2, and J3.',
      });
    }

    // Test 6: Re-triggered Action resets animTime to 0
    {
      const player = new Player(100, 500);
      (player as any).startDodge();
      player.update(0.1);
      const timeBefore = player.animTime;

      // Re-trigger dodge
      (player as any).startDodge();
      player.update(0.016);
      const timeAfter = player.animTime;

      results.push({
        name: 'Re-triggered Action: Dodge Reset',
        expected: 'animTime resets to ~0.016s on startDodge()',
        actual: `Before: ${timeBefore.toFixed(3)}s, After: ${timeAfter.toFixed(3)}s`,
        pass: timeAfter < 0.05,
        evidence: 'Dodge restart zeroes animTime immediately.',
      });
    }

    // Test 7: Non-loop animation frame clamp via SpriteRenderer.calculateFrameIndex
    {
      // Jump is 5 frames @ 10fps (total duration = 0.5s). After 2.0s, frame index must clamp to frame 4
      const frameCount = 5;
      const fps = 10;
      const animTime = 2.0; // 2 seconds elapsed
      const frameIndex = SpriteRenderer.calculateFrameIndex(animTime, fps, frameCount, false);

      results.push({
        name: 'Non-Loop Animation Clamp via SpriteRenderer Helper',
        expected: 'Frame clamps at frameCount - 1 (frame 4)',
        actual: `Calculated frameIndex: ${frameIndex} for animTime: ${animTime}s`,
        pass: frameIndex === 4,
        evidence: 'SpriteRenderer.calculateFrameIndex correctly clamps non-loop animations to frameCount - 1.',
      });
    }

    // Test 8: Loop animation frame modulo via SpriteRenderer.calculateFrameIndex
    {
      // Run is 8 frames @ 12fps (duration = 8/12 = 0.666s). At 0.75s, frame must wrap to frame 1
      const frameCount = 8;
      const fps = 12;
      const animTime = 0.75;
      const frameIndex = SpriteRenderer.calculateFrameIndex(animTime, fps, frameCount, true);

      results.push({
        name: 'Loop Animation Wrapping via SpriteRenderer Helper',
        expected: 'Frame wraps cleanly via modulo (frame 1 at 0.75s)',
        actual: `Calculated frameIndex: ${frameIndex}`,
        pass: frameIndex === 1,
        evidence: 'SpriteRenderer.calculateFrameIndex correctly cycles loop animations via modulo.',
      });
    }

    // Test 9: LAND Transition: FALL → LAND → IDLE with vx = 0
    {
      const player = new Player(100, 500);
      // 1. In air falling
      player.isGrounded = false;
      player.vy = 200;
      player.vx = 0;
      player.update(0.016);
      const airFallState = player.currentVisualState;

      // 2. Touch ground (wasInAir -> isGrounded)
      player.isGrounded = true;
      player.vy = 0;
      player.vx = 0;
      player.update(0.016);
      const landedVisualState = player.currentVisualState;

      // 3. Complete landing duration (0.2s duration -> wait 0.25s)
      player.update(0.25);
      const idleVisualState = player.currentVisualState;

      const pass = airFallState === 'fall' && landedVisualState === 'land' && idleVisualState === 'idle';

      results.push({
        name: 'LAND Transition (Stationary): FALL → LAND → IDLE (vx = 0)',
        expected: 'fall → land → idle',
        actual: `${airFallState} → ${landedVisualState} → ${idleVisualState}`,
        pass,
        evidence: 'Stationary landing correctly shows visual "land" for 0.2s then returns to "idle".',
      });
    }

    // Test 10: LAND Transition: FALL → LAND → RUN with vx > 10
    {
      const player = new Player(100, 500);
      // 1. In air falling while moving horizontally
      player.isGrounded = false;
      player.vy = 200;
      player.vx = 200;
      player.update(0.016);
      const airFallState = player.currentVisualState;

      // 2. Touch ground while maintaining horizontal velocity
      player.isGrounded = true;
      player.vy = 0;
      player.vx = 200;
      player.update(0.016);
      const runningLandState = player.currentVisualState;
      const landingTimerActive = player.landingTimer > 0;

      // 3. Complete landing duration while still running
      player.vx = 200;
      player.update(0.25);
      const runVisualState = player.currentVisualState;

      const pass =
        airFallState === 'fall' &&
        runningLandState === 'land' &&
        landingTimerActive &&
        runVisualState === 'run';

      results.push({
        name: 'LAND Transition (Running): FALL → LAND → RUN (vx > 10)',
        expected: 'fall → land (with landingTimer active) → run',
        actual: `${airFallState} → ${runningLandState} (landingTimer: ${landingTimerActive}) → ${runVisualState}`,
        pass,
        evidence: 'Running landing does NOT cancel landingTimer and transitions cleanly from "land" to "run".',
      });
    }

    // Test 11: Real Hitbox & Knockback Regression Verification (J1, J2, J3, Ultimate)
    {
      const player = new Player(100, 500);

      // J1 Hitbox
      (player as any).startMeleeCombo('J1');
      (player as any).attackPhase = 'ACTIVE';
      const hitboxJ1 = player.getActiveHitbox();
      const j1Valid =
        hitboxJ1 !== null &&
        hitboxJ1.damage === BALANCE.J1_DAMAGE &&
        hitboxJ1.knockbackX === 140 &&
        hitboxJ1.knockbackY === 100;

      // J2 Hitbox (Verifying kbX = 180 restoration)
      (player as any).startMeleeCombo('J2');
      (player as any).attackPhase = 'ACTIVE';
      const hitboxJ2 = player.getActiveHitbox();
      const j2Valid =
        hitboxJ2 !== null &&
        hitboxJ2.damage === BALANCE.J2_DAMAGE &&
        hitboxJ2.knockbackX === 180 &&
        hitboxJ2.knockbackY === 100;

      // J3 Hitbox
      (player as any).startMeleeCombo('J3');
      (player as any).attackPhase = 'ACTIVE';
      const hitboxJ3 = player.getActiveHitbox();
      const j3Valid =
        hitboxJ3 !== null &&
        hitboxJ3.damage === BALANCE.J3_DAMAGE &&
        hitboxJ3.knockbackX === 260 &&
        hitboxJ3.knockbackY === 160;

      // Ultimate Hitbox
      (player as any).startUltimate();
      (player as any).attackPhase = 'ACTIVE';
      const hitboxUlt = player.getActiveHitbox();
      const ultValid =
        hitboxUlt !== null &&
        hitboxUlt.damage === BALANCE.ULTIMATE_DAMAGE &&
        hitboxUlt.knockbackX === 350 &&
        hitboxUlt.knockbackY === 220;

      const pass = Boolean(j1Valid && j2Valid && j3Valid && ultValid);

      results.push({
        name: 'Combat Hitbox Knockback Regression (J1, J2, J3, Ultimate)',
        expected: 'J1 kbX:140/100, J2 kbX:180/100, J3 kbX:260/160, Ult kbX:350/220',
        actual: `J1:(kbX=${hitboxJ1?.knockbackX},kbY=${hitboxJ1?.knockbackY}), J2:(kbX=${hitboxJ2?.knockbackX},kbY=${hitboxJ2?.knockbackY}), J3:(kbX=${hitboxJ3?.knockbackX},kbY=${hitboxJ3?.knockbackY}), Ult:(kbX=${hitboxUlt?.knockbackX},kbY=${hitboxUlt?.knockbackY})`,
        pass,
        evidence: 'Directly invoked player.getActiveHitbox() on actual Player instance for all combat states.',
      });
    }

    // Test 12: Real Implementation Audit for GETUP (File Validation vs Runtime Reachability vs Playback Verification)
    {
      const getupFilePath = path.join(process.cwd(), 'public/assets/staging/player/player_getup.png');
      let fileSignatureValid = false;
      let headerSignatureHex = '';

      if (fs.existsSync(getupFilePath)) {
        const buffer = fs.readFileSync(getupFilePath);
        const header = buffer.subarray(0, 8);
        const sigRes = AssetValidator.validatePngSignature(new Uint8Array(header));
        fileSignatureValid = sigRes.valid;
        headerSignatureHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ');
      }

      // Check Runtime Reachability by mapping all possible gameplay state permutations
      const locomotionStates: LocomotionState[] = ['IDLE', 'RUN', 'JUMP', 'FALL'];
      const actionStates: ActionState[] = ['NONE', 'ATTACK', 'DODGE', 'HURT', 'KO'];
      const comboSteps: AttackComboStep[] = ['NONE', 'J1', 'J2', 'J3', 'ULTIMATE'];
      const landingFlags = [false, true];

      let isRuntimeReachable = false;
      for (const loc of locomotionStates) {
        for (const act of actionStates) {
          for (const combo of comboSteps) {
            for (const isLand of landingFlags) {
              const mapped = VisualStateMapper.mapPlayerState(loc, act, combo, isLand);
              if (mapped === 'getup') {
                isRuntimeReachable = true;
                break;
              }
            }
          }
        }
      }

      // Playback verification requires both valid decoded image and runtime state binding
      const playbackVerified = fileSignatureValid && isRuntimeReachable;

      // Evaluation: File signature is now VALID binary PNG (89 50 4E 47), state is NOT reachable in runtime (no revival mechanic), and playback is FALSE
      const pass = fileSignatureValid === true && isRuntimeReachable === false && playbackVerified === false;

      results.push({
        name: 'GETUP Real Implementation Audit (Validation, Reachability & Playback)',
        expected: 'fileValid: true (binary PNG 0x89504E47), reachable: false (no revival), playback: false',
        actual: `fileValid: ${fileSignatureValid} (header: [${headerSignatureHex}]), reachable: ${isRuntimeReachable}, playbackVerified: ${playbackVerified}`,
        pass,
        evidence: 'Dynamically evaluated physical file header and exhaustive VisualStateMapper permutation search.',
      });
    }

    return results;
  }
}
