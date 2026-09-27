import fs from 'fs';
import path from 'path';
import { AssetValidator } from '../assets/AssetValidator';
import { GAME_CONFIG } from '../config/gameConfig';
import { WorldGeometryRenderer } from '../rendering/WorldGeometryRenderer';

export interface WorldGeometryTestResult { testName: string; passed: boolean; message: string; }

export function runWorldGeometryProductionTests(): { results: WorldGeometryTestResult[] } {
  const results: WorldGeometryTestResult[] = [];
  const base = path.resolve('public/assets/world/geometry');
  const expected = new Map<string, [number, number]>([
    ['platform_awning.png', [256, 64]],
    ['platform_wood.png', [256, 64]],
    ['platform_balcony.png', [256, 64]],
    ['encounter_gate.png', [96, 380]],
    ['street_hazard.png', [160, 100]],
  ]);

  {
    const failures: string[] = [];
    for (const [file, [expectedWidth, expectedHeight]] of expected) {
      const bytes = fs.readFileSync(path.join(base, file));
      const signature = AssetValidator.validatePngSignature(bytes);
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (!signature.valid || width !== expectedWidth || height !== expectedHeight) {
        failures.push(`${file}:${width}x${height}`);
      }
    }
    results.push({
      testName: 'World geometry assets are genuine PNGs with production dimensions',
      passed: failures.length === 0,
      message: failures.length === 0 ? '5/5 modular geometry assets match contract' : failures.join(', '),
    });
  }

  {
    const mapping = [
      WorldGeometryRenderer.platformVariant('p_a1'),
      WorldGeometryRenderer.platformVariant('p_b2'),
      WorldGeometryRenderer.platformVariant('p_c3'),
      WorldGeometryRenderer.platformVariant('p_d4'),
      WorldGeometryRenderer.platformVariant('p_e1'),
    ];
    const expectedMapping = ['awning', 'wood', 'balcony', 'wood', 'awning'];
    const passed = mapping.every((value, index) => value === expectedMapping[index]);
    results.push({
      testName: 'Platform skin mapping is deterministic by Stage 1 zone',
      passed,
      message: passed ? 'A/E=awning, B/D=wood, C=balcony' : mapping.join(', '),
    });
  }

  {
    const passed = GAME_CONFIG.DEV_MODE === false;
    results.push({
      testName: 'Dev overlay defaults OFF in production configuration',
      passed,
      message: passed ? 'Renderer and React label now initialize from one false source' : `DEV_MODE=${GAME_CONFIG.DEV_MODE}`,
    });
  }

  return { results };
}
