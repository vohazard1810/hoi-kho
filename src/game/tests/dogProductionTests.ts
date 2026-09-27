import fs from 'fs';
import path from 'path';
import { AssetValidator } from '../assets/AssetValidator';
import { Dog } from '../entities/Dog';

export interface DogProductionTestResult { testName: string; passed: boolean; message: string; }

export function runDogProductionTests(): { results: DogProductionTestResult[] } {
  const results: DogProductionTestResult[] = [];
  const base = path.resolve('public/assets/staging/dog');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  const expectedStates = ['idle', 'approach', 'telegraph', 'dash', 'hurt', 'ko'];

  {
    const schema = AssetValidator.validateManifest(manifest);
    const complete = expectedStates.every((state) => manifest.states[state]);
    const passed = schema.valid && complete && Object.keys(manifest.states).length === expectedStates.length;
    results.push({
      testName: 'Chó Hẻm production manifest has 6 runtime visual states',
      passed,
      message: passed ? 'Schema valid; idle/approach/telegraph/dash/hurt/ko present' : schema.reasons.join('; '),
    });
  }

  {
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
    results.push({
      testName: 'Chó Hẻm PNG strips match manifest dimensions and binary signature',
      passed: failures.length === 0,
      message: failures.length === 0 ? '6/6 genuine PNG strips match derived dimensions' : `Invalid strips: ${failures.join(', ')}`,
    });
  }

  {
    const dog = new Dog('dog_anim_test', 0, 0);
    dog.update(0.1);
    const idleAdvanced = dog.animTime === 0.1;
    dog.state = 'TELEGRAPH';
    dog.update(1 / 60);
    const resetOnTelegraph = dog.animTime === 0;
    dog.state = 'DASH';
    dog.update(1 / 60);
    const resetOnDash = dog.animTime === 0;
    const passed = idleAdvanced && resetOnTelegraph && resetOnDash;
    results.push({
      testName: 'Chó Hẻm animation timer advances and resets on visual transitions',
      passed,
      message: passed ? 'Idle advances; telegraph and dash reset to frame 0' : `idle=${idleAdvanced}, telegraph=${resetOnTelegraph}, dash=${resetOnDash}`,
    });
  }

  {
    const dog = new Dog('dog_attack_sequence_test', 100, 100);
    const stateIs = (state: string): boolean => dog.state === state;
    dog.state = 'TELEGRAPH';
    (dog as unknown as { stateTimer: number }).stateTimer = 0.01;
    dog.updateAI(0.02, 130, 100);
    const enteredDash = stateIs('DASH');
    dog.updateAI(0.36, 130, 100);
    const enteredRecovery = stateIs('RECOVERY');
    dog.updateAI(0.71, 130, 100);
    const returnedToIdle = stateIs('IDLE');
    const passed = enteredDash && enteredRecovery && returnedToIdle;
    results.push({
      testName: 'Chó Hẻm attack sequence cannot freeze after dash',
      passed,
      message: passed ? 'TELEGRAPH → DASH → RECOVERY → IDLE completed' : `dash=${enteredDash}, recovery=${enteredRecovery}, idle=${returnedToIdle}, final=${dog.state}`,
    });
  }

  return { results };
}
