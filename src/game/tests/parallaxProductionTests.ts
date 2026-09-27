import fs from 'fs';
import path from 'path';
import { AssetValidator } from '../assets/AssetValidator';
import { ParallaxBackgroundRenderer } from '../rendering/ParallaxBackgroundRenderer';

export interface ParallaxTestResult { testName: string; passed: boolean; message: string; }

export function runParallaxProductionTests(): { results: ParallaxTestResult[] } {
  const results: ParallaxTestResult[] = [];
  const base = path.resolve('public/assets/world/stage1');
  const expected = new Map<string, [number, number]>([
    ['bg_far_sky.png', [2560, 720]],
    ['bg_mid_houses.png', [2560, 520]],
    ['bg_near_street.png', [2560, 720]],
    ['bg_foreground_ground.png', [2560, 100]],
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
      testName: 'Stage 1 parallax textures are genuine PNGs with runtime dimensions',
      passed: failures.length === 0,
      message: failures.length === 0 ? '4/4 layer files match their production contracts' : failures.join(', '),
    });
  }

  {
    const cameraX = 1000;
    const far = ParallaxBackgroundRenderer.calculateOffset(cameraX, 0.08, 2560);
    const mid = ParallaxBackgroundRenderer.calculateOffset(cameraX, 0.22, 2560);
    const near = ParallaxBackgroundRenderer.calculateOffset(cameraX, 0.36, 2560);
    const passed = far === 80 && mid === 220 && near === 360 && far < mid && mid < near;
    results.push({
      testName: 'Parallax depth factors produce ordered camera displacement',
      passed,
      message: passed ? 'At camera x=1000: far=80, mid=220, near=360' : `far=${far}, mid=${mid}, near=${near}`,
    });
  }

  {
    const wrapped = ParallaxBackgroundRenderer.calculateOffset(3000, 1, 2560);
    const negative = ParallaxBackgroundRenderer.calculateOffset(-100, 1, 2560);
    const zeroWidth = ParallaxBackgroundRenderer.calculateOffset(100, 1, 0);
    const passed = wrapped === 440 && negative === 2460 && zeroWidth === 0;
    results.push({
      testName: 'Parallax offset wraps safely at tile boundaries',
      passed,
      message: passed ? 'Positive, negative and invalid-width offsets are deterministic' : `wrapped=${wrapped}, negative=${negative}, zeroWidth=${zeroWidth}`,
    });
  }

  return { results };
}
