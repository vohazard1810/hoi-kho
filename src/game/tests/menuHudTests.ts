import fs from 'node:fs';
import path from 'node:path';
import { MENU_OPTIONS, moveMenuSelection } from '../scenes/MenuScene';

export interface MenuHudTestResult { testName: string; passed: boolean; message: string; }

export function runMenuHudTests(): { results: MenuHudTestResult[] } {
  const results: MenuHudTestResult[] = [];
  const navigation = moveMenuSelection(0, -1) === 2 && moveMenuSelection(2, 1) === 0 && MENU_OPTIONS.length === 3;
  results.push({ testName: 'Title menu wraps predictably across three options', passed: navigation, message: navigation ? 'New Game, Continue, Tutorial navigation contract verified' : 'Menu navigation mismatch' });

  const app = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const hud = fs.readFileSync(path.resolve('src/game/rendering/PlaceholderRenderer.ts'), 'utf8');
  const equipment = fs.readFileSync(path.resolve('src/game/rendering/EquipmentVisualRenderer.ts'), 'utf8');
  const dynamicScene = app.includes('sceneLabel[scene]') && !app.includes('>\n            STAGE 1 — HẺM KHÔNG LỐI THOÁT');
  results.push({ testName: 'Application header uses runtime scene label', passed: dynamicScene, message: dynamicScene ? 'Hub can no longer be mislabeled as Stage 1' : 'Header still contains a hard-coded scene title' });

  const noLegacyOverlap = !hud.includes("fillText('PARCEL', 38, 68)") && equipment.includes('const y = 650');
  results.push({ testName: 'HUD removes legacy label overlap and relocates hotbar', passed: noLegacyOverlap, message: noLegacyOverlap ? 'Status columns and bottom-center equipment hotbar are active' : 'Legacy HUD coordinates remain' });
  const titleIdentity = app.includes('NỢ ƠI, TỚI ĐÂY!') && fs.readFileSync(path.resolve('src/game/rendering/Renderer.ts'), 'utf8').includes("fillText('NỢ ƠI, TỚI ĐÂY!'");
  results.push({ testName: 'Game title identity is consistent across shell and canvas', passed: titleIdentity, message: titleIdentity ? 'NỢ ƠI, TỚI ĐÂY! is the canonical title' : 'Legacy title remains in a primary surface' });
  return { results };
}
