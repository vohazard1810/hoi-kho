import fs from 'node:fs';
import path from 'node:path';
import { MENU_OPTIONS, moveMenuSelection } from '../scenes/MenuScene';
import { MenuProductionRenderer } from '../rendering/MenuProductionRenderer';

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

  // Test 5: MenuProductionRenderer Canva Title System & Audio Feedback
  const menuSceneSrc = fs.readFileSync(path.resolve('src/game/scenes/MenuScene.ts'), 'utf8');
  const hasAudioFeedback = menuSceneSrc.includes("AudioManager.getInstance().play('cash_tick')") &&
    menuSceneSrc.includes("AudioManager.getInstance().play('pickup')");
  results.push({
    testName: 'MenuScene integrates audio cues for navigation and selection',
    passed: hasAudioFeedback,
    message: hasAudioFeedback ? 'Navigation and selection audio feedback confirmed' : 'MenuScene lacks audio triggers',
  });

  // Test 6: Menu key art asset existence on disk
  const keyArtPath = path.resolve('public/assets/menu/menu_key_art.jpg');
  const hasKeyArt = fs.existsSync(keyArtPath) && fs.statSync(keyArtPath).size > 50000;
  results.push({
    testName: 'Title screen key art asset is present and production sized',
    passed: hasKeyArt,
    message: hasKeyArt ? 'menu_key_art.jpg verified on disk' : 'Key art asset missing or undersized',
  });

  // Test 7: MenuProductionRenderer contract & rendering execution safety
  const createMockCtx = () => {
    const gradMock = { addColorStop: () => {} };
    return {
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      roundRect: () => {},
      stroke: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fillText: () => {},
      arc: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setLineDash: () => {},
      drawImage: () => {},
      createLinearGradient: () => gradMock,
      createRadialGradient: () => gradMock,
      measureText: (text: string) => ({ width: text.length * 8 }),
      lineWidth: 1,
      strokeStyle: '',
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
  };

  let menuRendererPassed = false;
  try {
    const renderer = new MenuProductionRenderer();
    const mockCtx = createMockCtx();
    // Default menu state
    renderer.render(mockCtx, 1280, 720, {
      selectedIndex: 0,
      hasProgress: false,
      showTutorial: false,
      confirmNewGame: false,
      confirmSelection: 0,
      intro: null,
      elapsed: 1.5,
    });
    // Tutorial modal state
    renderer.render(mockCtx, 1280, 720, {
      selectedIndex: 2,
      hasProgress: true,
      showTutorial: true,
      confirmNewGame: false,
      confirmSelection: 0,
      intro: null,
      elapsed: 2.0,
    });
    // Confirm new game state
    renderer.render(mockCtx, 1280, 720, {
      selectedIndex: 0,
      hasProgress: true,
      showTutorial: false,
      confirmNewGame: true,
      confirmSelection: 1,
      intro: null,
      elapsed: 2.5,
    });
    menuRendererPassed = true;
  } catch (err) {
    console.error('MenuProductionRenderer test error:', err);
    menuRendererPassed = false;
  }

  results.push({
    testName: 'MenuProductionRenderer renders cards, modals, and particles without exception',
    passed: menuRendererPassed,
    message: menuRendererPassed ? 'MenuProductionRenderer safely rendered all states' : 'Renderer threw an exception',
  });

  return { results };
}
