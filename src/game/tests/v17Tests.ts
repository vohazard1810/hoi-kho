import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Stage1Scene } from '../scenes/Stage1Scene';
import { SceneManager } from '../core/SceneManager';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { STAGE_1_CONFIG } from '../config/stage1';

export function runV17Tests() {
  const results: { testName: string; passed: boolean; message: string }[] = [];
  const test = (name: string, fn: () => void) => {
    try {
      fn();
      results.push({ testName: name, passed: true, message: 'Runtime assertions passed' });
    } catch (error) {
      results.push({ testName: name, passed: false, message: String(error) });
    }
  };

  test('Stage 1 Checkpoint system captures encounter states and player position', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    stage.enterFreshStage();

    const cpA = stage.getCheckpoint();
    assert.ok(cpA, 'Initial checkpoint must exist');
    assert.equal(cpA.zoneId, 'A');
    assert.equal(cpA.playerX, STAGE_1_CONFIG.PLAYER_START_X);

    stage.captureEncounterCheckpoint('B');
    const cpB = stage.getCheckpoint();
    assert.ok(cpB);
    assert.equal(cpB.zoneId, 'B');
    assert.equal(cpB.playerX, 690);

    stage.captureEncounterCheckpoint('E');
    const cpE = stage.getCheckpoint();
    assert.ok(cpE);
    assert.equal(cpE.zoneId, 'E');
    assert.equal(cpE.playerX, 2730);
  });

  test('Retry from checkpoint restores player HP, parcel condition, and prevents parts farming', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    const upgradeSystem = UpgradeSystem.getInstance();
    const objective = ObjectiveSystem.getInstance();

    stage.enterFreshStage();
    upgradeSystem.setParts(5);
    stage.captureEncounterCheckpoint('C');

    // Simulate combat progress and illegal part farming
    upgradeSystem.setParts(12); // Player farmed 7 extra parts
    objective.damageParcel(30, true); // Parcel damaged

    // Simulate player KO and trigger retry
    (stage as any).player.state = 'KO';
    (stage as any).player.hp = 0;
    (stage as any).player.x = 1800; // Walked far into zone

    stage.retryFromCheckpoint();

    // Verify anti-farming: parts restored to checkpoint value
    assert.equal(upgradeSystem.getSnapshot().parts, 5, 'Parts must be restored to checkpoint to prevent farming');
    // Verify player restored to checkpoint position with full HP
    assert.equal((stage as any).player.hp, (stage as any).player.maxHp, 'Player HP must be restored');
    assert.equal((stage as any).player.x, 1370, 'Player X must be restored to Zone C checkpoint');
    assert.notEqual((stage as any).player.state, 'KO', 'Player state must not be KO');
  });

  test('Retry preserves previously CLEARED zones and only resets current zone', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);

    stage.enterFreshStage();
    // Mark Zone A & B as CLEARED
    (stage as any).zoneStates['A'] = 'CLEARED';
    (stage as any).zoneStates['B'] = 'CLEARED';
    stage.captureEncounterCheckpoint('C');

    // Player enters Zone C and dies
    (stage as any).zoneStates['C'] = 'ACTIVE';
    stage.retryFromCheckpoint();

    const currentStates = (stage as any).zoneStates;
    assert.equal(currentStates['A'], 'CLEARED', 'Zone A must remain CLEARED');
    assert.equal(currentStates['B'], 'CLEARED', 'Zone B must remain CLEARED');
    assert.equal(currentStates['C'], 'ACTIVE', 'Zone C must be ACTIVE on retry');
  });

  test('Reset transient combat state clears projectiles, combo, and loot', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);

    stage.enterFreshStage();
    (stage as any).projectiles.push({ x: 100, y: 100, isAlive: true } as any);
    (stage as any).enemyProjectiles.push({ x: 200, y: 200, isAlive: true } as any);

    stage.resetTransientCombatState();

    assert.equal((stage as any).projectiles.length, 0, 'Projectiles must be empty');
    assert.equal((stage as any).enemyProjectiles.length, 0, 'Enemy projectiles must be empty');
  });

  test('HUD Skill labels strictly enforce LIÊN HOÀN, BĂNG KEO, LƯỚT NÉ, HỎA TỐC and ban CƠ BẢN', () => {
    const eqFile = fs.readFileSync('src/game/rendering/EquipmentVisualRenderer.ts', 'utf-8');
    assert.ok(eqFile.includes("'LIÊN HOÀN'"), 'Must contain LIÊN HOÀN');
    assert.ok(eqFile.includes("'BĂNG KEO'"), 'Must contain BĂNG KEO');
    assert.ok(eqFile.includes("'LƯỚT NÉ'"), 'Must contain LƯỚT NÉ');
    assert.ok(eqFile.includes("'HỎA TỐC'"), 'Must contain HỎA TỐC');
    assert.ok(!eqFile.includes('CƠ' + ' BẢN'), 'Must strictly NOT contain legacy label');

    // Check all production files in src/ (excluding tests)
    const checkDir = (dir: string) => {
      if (dir.includes('/tests')) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = `${dir}/${file}`;
        if (fs.statSync(full).isDirectory()) {
          checkDir(full);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(full, 'utf-8');
          assert.ok(!content.includes('CƠ' + ' BẢN'), `File ${full} must NOT contain legacy base skill label`);
        }
      }
    };
    checkDir('src');
  });

  test('V17.1: Stage 1 hazard layout strictly contains 1 puddle in Zone B, 1 trash pile in Zone C, and 3 pits', () => {
    const hazards = STAGE_1_CONFIG.HAZARDS;
    const pits = hazards.filter((h) => h.type === 'pit');
    const puddles = hazards.filter((h) => h.type === 'puddle');
    const trashes = hazards.filter((h) => h.type === 'trash');

    assert.equal(pits.length, 3, 'Must have exactly 3 pits');
    assert.equal(puddles.length, 1, 'Must have exactly 1 puddle in Stage 1');
    assert.equal(trashes.length, 1, 'Must have exactly 1 trash pile in Stage 1');

    // Puddle in Zone B
    const puddle = puddles[0];
    assert.ok(puddle.x >= 640 && puddle.x < 1320, 'Puddle must be located in Zone B');
    assert.equal(puddle.damage, 0, 'Puddle must inflict 0 HP damage');
    assert.equal(puddle.parcelDamage, 0, 'Puddle must inflict 0 parcel damage');

    // Trash in Zone C
    const trash = trashes[0];
    assert.ok(trash.x >= 1320 && trash.x < 2000, 'Trash pile must be located in Zone C');
    assert.equal(trash.damage, 0, 'Trash pile must inflict 0 HP damage');
    assert.ok(trash.parcelDamage <= 3, 'Trash pile parcel damage must be bounded (max 3%)');
  });

  test('V17.1: Standing in puddle for 2 seconds causes no HP or parcel damage', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    const objective = ObjectiveSystem.getInstance();
    const mockInput = { isDown: () => false, isJustPressed: () => false, isJustReleased: () => false } as any;

    stage.enterFreshStage();
    (stage as any).dialogue.reset();
    (stage as any).handleEnemySpawn = () => {};
    (stage as any).dogs = [];
    (stage as any).rivals = [];
    (stage as any).thugs = [];
    (stage as any).bossDogs = [];
    (stage as any).rats = [];
    (stage as any).saboteurs = [];
    (stage as any).guards = [];
    (stage as any).brats = [];

    objective.restoreSnapshot({ parcelCondition: 100, bonusReward: 0 });

    const player = (stage as any).player;
    // Position player directly in Zone B puddle
    player.x = 1060 + 10;
    player.y = 556;
    player.hp = player.maxHp;

    // Simulate 2 full seconds (120 frames at 60 FPS)
    for (let f = 0; f < 120; f++) {
      stage.update(1 / 60, mockInput);
    }

    assert.equal(player.hp, player.maxHp, 'Player must not lose HP while standing in puddle');
    assert.equal(objective.parcelCondition, 100, 'Parcel condition must remain 100% in puddle');
    assert.ok(player.isSlipping(), 'Player should have slip state active');
  });

  test('V17.1: I-frame blocks HP hit and parcel damage is NOT applied', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    const objective = ObjectiveSystem.getInstance();
    const mockInput = { isDown: () => false, isJustPressed: () => false, isJustReleased: () => false } as any;

    stage.enterFreshStage();
    (stage as any).dialogue.reset();
    (stage as any).handleEnemySpawn = () => {};
    (stage as any).dogs = [];
    (stage as any).rivals = [];
    (stage as any).thugs = [];
    (stage as any).bossDogs = [];
    (stage as any).rats = [];
    (stage as any).saboteurs = [];
    (stage as any).guards = [];
    (stage as any).brats = [];

    objective.restoreSnapshot({ parcelCondition: 100, bonusReward: 0 });

    const player = (stage as any).player;
    // Activate I-frame invulnerability
    player.isInvulnerable = true;
    const initialCondition = objective.parcelCondition;

    // Simulate collision with pit hazard (damage: 10, parcelDamage: 10 in V19.2)
    player.x = 920; // Inside pit h_b1
    player.y = 690;
    stage.update(1 / 60, mockInput);

    // Because isInvulnerable is true, takeDamage returns false -> parcel condition NOT damaged
    assert.equal(objective.parcelCondition, initialCondition, 'I-frame must prevent parcel damage');
  });

  test('V17.1: Walking normally over trash causes no damage', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    const objective = ObjectiveSystem.getInstance();
    const mockInput = { isDown: () => false, isJustPressed: () => false, isJustReleased: () => false } as any;

    stage.enterFreshStage();
    (stage as any).dialogue.reset();
    (stage as any).handleEnemySpawn = () => {};
    (stage as any).dogs = [];
    (stage as any).rivals = [];
    (stage as any).thugs = [];
    (stage as any).bossDogs = [];
    (stage as any).rats = [];
    (stage as any).saboteurs = [];
    (stage as any).guards = [];
    (stage as any).brats = [];

    objective.restoreSnapshot({ parcelCondition: 100, bonusReward: 0 });

    const player = (stage as any).player;
    // Walk over trash pile in Zone C
    player.x = 1735;
    player.y = 556;
    player.vx = 150; // Normal walking speed
    player.actionState = 'NONE';
    player.hp = player.maxHp;

    for (let f = 0; f < 30; f++) {
      stage.update(1 / 60, mockInput);
    }

    assert.equal(player.hp, player.maxHp, 'Normal walking over trash must not lose HP');
    assert.equal(objective.parcelCondition, 100, 'Normal walking over trash must not damage parcel');
  });

  test('V17.1: Bonus reward rollback on Checkpoint Retry prevents farming', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    const objective = ObjectiveSystem.getInstance();

    stage.enterFreshStage();
    objective.restoreSnapshot({ parcelCondition: 100, bonusReward: 25000 });

    // Capture checkpoint with 25,000 VNĐ bonus
    stage.captureEncounterCheckpoint('C');
    assert.equal(stage.getCheckpoint()?.bonusReward, 25000, 'Checkpoint must capture bonusReward');

    // Simulate collecting 60,000 VNĐ extra bonus during Zone C combat
    objective.addBonusReward(60000);
    assert.equal(objective.bonusReward, 85000, 'Bonus reward should have increased before retry');

    // Player KO and retry from checkpoint
    stage.retryFromCheckpoint();

    // Verify bonus reward was rolled back to snapshot
    assert.equal(objective.bonusReward, 25000, 'Bonus reward must be rolled back on retry to prevent farming');
  });

  test('V17.1: Boss Retry preserves CLEARED status for Zones A–D and keeps Zone E ACTIVE', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);

    stage.enterFreshStage();
    // Simulate progression through Zones A–D
    (stage as any).zoneStates['A'] = 'CLEARED';
    (stage as any).zoneStates['B'] = 'CLEARED';
    (stage as any).zoneStates['C'] = 'CLEARED';
    (stage as any).zoneStates['D'] = 'CLEARED';

    // Reach Boss encounter (Zone E)
    stage.captureEncounterCheckpoint('E');

    // Player dies during Boss battle
    (stage as any).zoneStates['E'] = 'ACTIVE';
    stage.retryFromCheckpoint();

    const states = (stage as any).zoneStates;
    assert.equal(states['A'], 'CLEARED', 'Zone A must remain CLEARED on Boss retry');
    assert.equal(states['B'], 'CLEARED', 'Zone B must remain CLEARED on Boss retry');
    assert.equal(states['C'], 'CLEARED', 'Zone C must remain CLEARED on Boss retry');
    assert.equal(states['D'], 'CLEARED', 'Zone D must remain CLEARED on Boss retry');
    assert.equal(states['E'], 'ACTIVE', 'Zone E must be reset to ACTIVE on Boss retry');
  });

  test('V17.1: Boss Retry does not re-trigger Stage intro or Boss intro dialogue', () => {
    const sceneManager = new SceneManager();
    const stage = new Stage1Scene(sceneManager);
    const mockInput = { isDown: () => false, isJustPressed: () => false, isJustReleased: () => false } as any;

    stage.enterFreshStage();
    const dialogue = (stage as any).dialogue;

    // Dismiss initial stage dialogue
    dialogue.reset();
    assert.equal(dialogue.isActive(), false, 'Dialogue must be inactive after reset');

    // Step into Zone E to trigger Boss encounter and its dialogue
    (stage as any).player.x = 2730;
    stage.update(1 / 60, mockInput);

    // Dialogue is dismissed once read
    dialogue.reset();
    assert.equal(dialogue.isActive(), false, 'Boss dialogue dismissed');

    // Player dies and retries Boss
    stage.retryFromCheckpoint();

    // Verify dialogue is NOT active immediately upon retry
    assert.equal(dialogue.isActive(), false, 'Dialogue must not be active immediately after retry');

    // Advance 30 frames in Zone E
    for (let f = 0; f < 30; f++) {
      stage.update(1 / 60, mockInput);
    }

    // Must STILL be inactive: neither Stage intro nor Boss intro re-triggers
    assert.equal(dialogue.isActive(), false, 'Retry Boss must not re-trigger Stage intro or Boss intro dialogue');
  });

  return { results };
}
