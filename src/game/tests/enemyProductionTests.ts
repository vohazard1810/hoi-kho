import fs from 'fs';
import path from 'path';
import { AssetValidator } from '../assets/AssetValidator';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { Player } from '../entities/Player';

export interface EnemyProductionTestResult { testName: string; passed: boolean; message: string; }

function validateCharacter(character: 'rival' | 'thug', expectedStates: string[]): EnemyProductionTestResult[] {
  const base = path.resolve(`public/assets/staging/${character}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  const schema = AssetValidator.validateManifest(manifest);
  const complete = expectedStates.every((state) => manifest.states[state]);
  const manifestPassed = schema.valid && complete && Object.keys(manifest.states).length === expectedStates.length;
  const failures: string[] = [];

  for (const state of expectedStates) {
    const contract = manifest.states[state];
    const bytes = fs.readFileSync(path.join(base, contract.file));
    const signature = AssetValidator.validatePngSignature(bytes);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (!signature.valid || width !== manifest.frameWidth * contract.frameCount || height !== manifest.frameHeight) {
      failures.push(`${state}:${width}x${height}`);
    }
  }

  const label = character === 'rival' ? 'Shipper Đối Thủ' : 'Đầu Gấu';
  return [
    {
      testName: `${label} manifest covers every runtime visual state`,
      passed: manifestPassed,
      message: manifestPassed ? `${expectedStates.length}/${expectedStates.length} states pass schema validation` : schema.reasons.join('; '),
    },
    {
      testName: `${label} sprite strips match signatures and derived dimensions`,
      passed: failures.length === 0,
      message: failures.length === 0 ? `${expectedStates.length}/${expectedStates.length} genuine PNG strips verified` : `Invalid: ${failures.join(', ')}`,
    },
  ];
}

export function runEnemyProductionTests(): { results: EnemyProductionTestResult[] } {
  const results = [
    ...validateCharacter('rival', ['idle', 'approach', 'attack', 'hurt', 'ko']),
    ...validateCharacter('thug', ['idle', 'chase', 'heavy', 'charge', 'hurt', 'ko']),
  ];

  {
    const rival = new Rival('rival_anim_test', 0, 0);
    rival.update(0.1);
    const idleAdvanced = rival.animTime === 0.1;
    rival.state = 'ATTACK_STARTUP';
    rival.update(1 / 60);
    const reset = rival.animTime === 0;
    results.push({
      testName: 'Shipper Đối Thủ animation clock advances and resets on state changes',
      passed: idleAdvanced && reset,
      message: idleAdvanced && reset ? 'Idle advances; attack startup resets to frame 0' : `idle=${rival.animTime}, reset=${reset}`,
    });
  }

  {
    const rival = new Rival('rival_sequence_test', 100, 100);
    const rivalStateIs = (state: string): boolean => rival.state === state;
    rival.state = 'ATTACK_STARTUP';
    (rival as unknown as { stateTimer: number }).stateTimer = 0.01;
    rival.updateAI(0.02, 130, 100);
    const active = rivalStateIs('ATTACK_ACTIVE');
    rival.updateAI(0.16, 130, 100);
    const recovery = rivalStateIs('ATTACK_RECOVERY');
    rival.updateAI(0.51, 130, 100);
    const idle = rivalStateIs('IDLE');
    results.push({
      testName: 'Shipper Đối Thủ attack sequence returns to idle',
      passed: active && recovery && idle,
      message: active && recovery && idle ? 'STARTUP → ACTIVE → RECOVERY → IDLE completed' : `active=${active}, recovery=${recovery}, idle=${idle}`,
    });
  }

  {
    const thug = new Thug('thug_anim_test', 0, 0);
    thug.update(0.1);
    const idleAdvanced = thug.animTime === 0.1;
    thug.state = 'HEAVY_TELEGRAPH';
    thug.update(1 / 60);
    const reset = thug.animTime === 0;
    results.push({
      testName: 'Đầu Gấu animation clock advances and resets on state changes',
      passed: idleAdvanced && reset,
      message: idleAdvanced && reset ? 'Idle advances; heavy telegraph resets to frame 0' : `idle=${thug.animTime}, reset=${reset}`,
    });
  }

  {
    const thug = new Thug('thug_sequence_test', 100, 100);
    const player = new Player(120, 100);
    const thugStateIs = (state: string): boolean => thug.state === state;
    thug.state = 'HEAVY_TELEGRAPH';
    (thug as unknown as { stateTimer: number }).stateTimer = 0.01;
    thug.updateAI(player, 0.02);
    const active = thugStateIs('HEAVY_ACTIVE');
    thug.updateAI(player, 0.19);
    const recovery = thugStateIs('HEAVY_RECOVERY');
    thug.updateAI(player, 0.71);
    const idle = thugStateIs('IDLE');
    results.push({
      testName: 'Đầu Gấu heavy attack cannot freeze in active state',
      passed: active && recovery && idle,
      message: active && recovery && idle ? 'TELEGRAPH → ACTIVE → RECOVERY → IDLE completed' : `active=${active}, recovery=${recovery}, idle=${idle}, final=${thug.state}`,
    });
  }

  return { results };
}
