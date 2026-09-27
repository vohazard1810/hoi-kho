import { PipelineTestSuite } from './pipelineTests';
import { runSyntheticValidatorTests } from '../assets/validatorTests';
import { runGameFeelTests } from './gameFeelTests';
import { runBossDogProductionTests } from './bossDogProductionTests';
import { runUpgradeTests } from './upgradeTests';
import { runDogProductionTests } from './dogProductionTests';
import { runParallaxProductionTests } from './parallaxProductionTests';
import { runWorldGeometryProductionTests } from './worldGeometryProductionTests';
import { runEnemyProductionTests } from './enemyProductionTests';
import { runGridNavigationTests } from './gridNavigationTests';
import { runCombatPacingTests } from './combatPacingTests';
import { runRenderSafetyTests } from './renderSafetyTests';
import { runMenuHudTests } from './menuHudTests';
import { runDialogueTests } from './dialogueTests';
import { runPlatformPressureTests } from './platformPressureTests';
import { runStabilizationTests } from './stabilizationTests';
import { runHubPrologueTests } from './hubPrologueTests';
import { runPlayerHdProductionTests } from './playerHdProductionTests';
import { runV15Tests } from './v15Tests';
import { runV16Tests } from './v16Tests';
import { runV17Tests } from './v17Tests';
import { runV19Tests } from './v19Tests';
import { runV19_1Tests } from './v19_1Tests';
import { runV19_2Tests } from './v19_2Tests';
import { runV19_3Tests } from './v19_3Tests';

console.log('====================================================');
console.log('   NỢ ƠI, TỚI ĐÂY! — RUNTIME TEST RUNNER   ');
console.log('====================================================\n');

let totalExecuted = 0;
let totalPassed = 0;
let totalFailed = 0;
console.log('--- V19.3 FINAL POLISH TESTS ---');
for (const res of runV19_3Tests().results) {
  totalExecuted++; if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}
console.log('--- V19.2 STAGE 1 LOCK TESTS ---');
for (const res of runV19_2Tests().results) {
  totalExecuted++; if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}
console.log('--- V19.1 FAIRNESS & PRESENTATION TESTS ---');
for (const res of runV19_1Tests().results) {
  totalExecuted++; if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}
console.log('--- V19 CHAPTER 1 PRODUCTION TESTS ---');
for (const res of runV19Tests().results) {
  totalExecuted++; if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}

for (const res of runV17Tests().results) {
  totalExecuted++;
  if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}

for (const res of runV16Tests().results) {
  totalExecuted++;
  if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}

for (const res of runV15Tests().results) {
  totalExecuted++;
  if (res.passed) totalPassed++; else totalFailed++;
  console.log(`  [${res.passed ? 'PASS' : 'FAIL'}] ${res.testName}\n         ${res.message}`);
}

console.log('--- 0. UI NAVIGATION REGRESSION TESTS ---');
const gridNavigation = runGridNavigationTests();
for (const res of gridNavigation.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

console.log('\n--- 0B. COMBAT PACING & AUDIO MIX TESTS ---');
const combatPacing = runCombatPacingTests();
for (const res of combatPacing.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

console.log('\n--- 0C. PRODUCTION RENDER SAFETY TESTS ---');
const renderSafety = runRenderSafetyTests();
for (const res of renderSafety.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

console.log('\n--- 0D. MENU & HUD REGRESSION TESTS ---');
const menuHud = runMenuHudTests();
for (const res of menuHud.results) {
  totalExecuted++;
  if (res.passed) { totalPassed++; console.log(`  [PASS] ${res.testName}`); console.log(`         ${res.message}`); }
  else { totalFailed++; console.log(`  [FAIL] ${res.testName}`); console.log(`         ${res.message}`); }
}

console.log('\n--- 0E. NARRATIVE DIALOGUE TESTS ---');
const dialogue = runDialogueTests();
for (const res of dialogue.results) {
  totalExecuted++;
  if (res.passed) { totalPassed++; console.log(`  [PASS] ${res.testName}`); console.log(`         ${res.message}`); }
  else { totalFailed++; console.log(`  [FAIL] ${res.testName}`); console.log(`         ${res.message}`); }
}

console.log('\n--- 0F. PLATFORM PRESSURE REGRESSION TESTS ---');
const platformPressure = runPlatformPressureTests();
for (const res of platformPressure.results) {
  totalExecuted++;
  if (res.passed) { totalPassed++; console.log(`  [PASS] ${res.testName}`); console.log(`         ${res.message}`); }
  else { totalFailed++; console.log(`  [FAIL] ${res.testName}`); console.log(`         ${res.message}`); }
}

console.log('\n--- 0G. LARGE STABILIZATION REGRESSION TESTS ---');
const stabilization = runStabilizationTests();
for (const res of stabilization.results) {
  totalExecuted++;
  if (res.passed) { totalPassed++; console.log(`  [PASS] ${res.testName}`); console.log(`         ${res.message}`); }
  else { totalFailed++; console.log(`  [FAIL] ${res.testName}`); console.log(`         ${res.message}`); }
}

console.log('\n--- 0H. HUB PRODUCTION & PROLOGUE TESTS ---');
const hubPrologue = runHubPrologueTests();
for (const res of hubPrologue.results) {
  totalExecuted++;
  if (res.passed) { totalPassed++; console.log(`  [PASS] ${res.testName}`); console.log(`         ${res.message}`); }
  else { totalFailed++; console.log(`  [FAIL] ${res.testName}`); console.log(`         ${res.message}`); }
}

console.log('\n--- 0I. PLAYER HD PRODUCTION TESTS ---');
const playerHd = runPlayerHdProductionTests();
for (const res of playerHd.results) {
  totalExecuted++;
  if (res.passed) { totalPassed++; console.log(`  [PASS] ${res.testName}`); console.log(`         ${res.message}`); }
  else { totalFailed++; console.log(`  [FAIL] ${res.testName}`); console.log(`         ${res.message}`); }
}

// 1. Run Pipeline Unit Tests
console.log('--- 1. PIPELINE & ANIMATION UNIT TESTS ---');
const pipelineResults = PipelineTestSuite.runAllTests();

for (const res of pipelineResults) {
  totalExecuted++;
  if (res.pass) {
    totalPassed++;
    console.log(`  [PASS] ${res.name}`);
    console.log(`         Evidence: ${res.evidence}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.name}`);
    console.log(`         Expected: ${res.expected}`);
    console.log(`         Actual:   ${res.actual}`);
  }
}

// 2. Run Synthetic Validator Unit Tests
console.log('\n--- 2. ASSET VALIDATOR SYNTHETIC CONTRACT TESTS ---');
const synthetic = runSyntheticValidatorTests();

for (const res of synthetic.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 3. Run Game Feel regression tests
console.log('\n--- 3. GAME FEEL REGRESSION TESTS ---');
const gameFeel = runGameFeelTests();
for (const res of gameFeel.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 4. Boss Dog production asset/runtime tests
console.log('\n--- 4. BOSS DOG PRODUCTION TESTS ---');
const bossDog = runBossDogProductionTests();
for (const res of bossDog.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 5. Persistent upgrade system tests
console.log('\n--- 5. SHIPPER TOOLKIT UPGRADE TESTS ---');
const upgrades = runUpgradeTests();
for (const res of upgrades.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 6. Chó Hẻm production asset/runtime tests
console.log('\n--- 6. CHÓ HẺM PRODUCTION TESTS ---');
const dogProduction = runDogProductionTests();
for (const res of dogProduction.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 7. Stage 1 parallax background tests
console.log('\n--- 7. STAGE 1 PARALLAX PRODUCTION TESTS ---');
const parallax = runParallaxProductionTests();
for (const res of parallax.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 8. World geometry production tests
console.log('\n--- 8. WORLD GEOMETRY PRODUCTION TESTS ---');
const worldGeometry = runWorldGeometryProductionTests();
for (const res of worldGeometry.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

// 9. Rival and Thug production assets/runtime tests
console.log('\n--- 9. RIVAL & THUG PRODUCTION TESTS ---');
const enemyProduction = runEnemyProductionTests();
for (const res of enemyProduction.results) {
  totalExecuted++;
  if (res.passed) {
    totalPassed++;
    console.log(`  [PASS] ${res.testName}`);
    console.log(`         ${res.message}`);
  } else {
    totalFailed++;
    console.log(`  [FAIL] ${res.testName}`);
    console.log(`         ${res.message}`);
  }
}

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${totalExecuted} executed, ${totalPassed} passed, ${totalFailed} failed.`);
console.log('====================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
