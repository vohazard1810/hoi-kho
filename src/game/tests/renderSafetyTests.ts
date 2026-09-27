import fs from 'node:fs';
import path from 'node:path';

export interface RenderSafetyTestResult { testName: string; passed: boolean; message: string; }

export function runRenderSafetyTests(): { results: RenderSafetyTestResult[] } {
  const renderer = fs.readFileSync(path.resolve('src/game/rendering/Renderer.ts'), 'utf8');
  const placeholder = fs.readFileSync(path.resolve('src/game/rendering/PlaceholderRenderer.ts'), 'utf8');
  const forbidden = [
    /fillRect\(hbPos\.x,\s*hbPos\.y,\s*hitbox\.width,\s*hitbox\.height\)/,
    /strokeRect\(hbPos\.x,\s*hbPos\.y,\s*hitbox\.width,\s*hitbox\.height\)/,
    /fillRect\(screen\.x,\s*screen\.y,\s*box\.width,\s*box\.height\)/,
  ];
  const passed = forbidden.every((pattern) => !pattern.test(renderer) && !pattern.test(placeholder));
  return { results: [{
    testName: 'Production combat feedback never paints raw hitbox rectangles',
    passed,
    message: passed ? 'Hit flash and attack cues use arcs, ellipses, cones, or glow only' : 'A raw hitbox-sized rectangle remains in production feedback',
  }] };
}
