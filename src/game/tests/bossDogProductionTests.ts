import fs from 'fs';
import path from 'path';
import { AssetValidator } from '../assets/AssetValidator';
import { BossDog } from '../entities/BossDog';
import { Player } from '../entities/Player';

export interface BossDogProductionTestResult { testName: string; passed: boolean; message: string; }

export function runBossDogProductionTests(): { results: BossDogProductionTestResult[] } {
  const results: BossDogProductionTestResult[] = [];
  const base = path.resolve('public/assets/staging/boss_dog');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  const expectedStates = ['idle', 'chase', 'bite', 'dash', 'slam', 'hurt', 'ko'];

  {
    const schema = AssetValidator.validateManifest(manifest);
    const complete = expectedStates.every((state) => manifest.states[state]);
    const passed = schema.valid && complete && Object.keys(manifest.states).length === expectedStates.length;
    results.push({ testName: 'Boss Dog production manifest has 7 required visual states', passed, message: passed ? 'Schema valid; idle/chase/3 attacks/hurt/ko present' : [...schema.reasons, 'State contract incomplete'].join('; ') });
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
    results.push({ testName: 'Boss Dog PNG strips match manifest dimensions and binary signature', passed: failures.length === 0, message: failures.length === 0 ? '7/7 genuine PNG strips match derived dimensions' : `Invalid strips: ${failures.join(', ')}` });
  }

  {
    const boss = new BossDog('boss_anim_test', 0, 0);
    boss.update(0.1);
    const idleAdvanced = boss.animTime === 0.1;
    boss.state = 'BITE_TELEGRAPH';
    boss.update(1 / 60);
    const resetOnTelegraph = boss.animTime === 0;
    boss.state = 'BITE_ACTIVE';
    boss.update(1 / 60);
    const resetOnActive = boss.animTime === 0;
    const passed = idleAdvanced && resetOnTelegraph && resetOnActive;
    results.push({ testName: 'Boss Dog animation timer advances and resets per combat phase', passed, message: passed ? 'Idle advances; telegraph and active transitions reset to frame boundary' : `idle=${idleAdvanced}, telegraph=${resetOnTelegraph}, active=${resetOnActive}` });
  }

  {
    const boss = new BossDog('boss_bite_recovery_test', 100, 100);
    const player = new Player(130, 100);
    const stateIs = (state: string): boolean => boss.state === state;
    boss.state = 'BITE_TELEGRAPH';
    (boss as unknown as { stateTimer: number }).stateTimer = 0.01;
    boss.updateAI(player, 0.02);
    const enteredActive = stateIs('BITE_ACTIVE');
    boss.updateAI(player, 0.17);
    const enteredRecovery = stateIs('BITE_RECOVERY');
    boss.updateAI(player, 1);
    const returnedToIdle = stateIs('IDLE');
    const passed = enteredActive && enteredRecovery && returnedToIdle;
    results.push({
      testName: 'Boss Dog bite sequence cannot freeze in BITE_ACTIVE',
      passed,
      message: passed
        ? 'BITE_TELEGRAPH → BITE_ACTIVE → BITE_RECOVERY → IDLE completed'
        : `active=${enteredActive}, recovery=${enteredRecovery}, idle=${returnedToIdle}, final=${boss.state}`,
    });
  }

  return { results };
}
