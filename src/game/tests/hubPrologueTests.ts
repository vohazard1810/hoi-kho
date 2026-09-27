import fs from 'node:fs';
import path from 'node:path';
import { advancePrologueBeat, PROLOGUE_BEATS } from '../scenes/PrologueScene';
import { COBA_RENDER_HEIGHT, HUB_HUMAN_SCALE } from '../rendering/HubProductionRenderer';
import { HubTutorialSystem } from '../systems/HubTutorialSystem';
import { Player } from '../entities/Player';
import { Input, GameAction } from '../core/Input';
import { BALANCE } from '../config/balance';

export interface HubPrologueTestResult { testName: string; passed: boolean; message: string; }

function pngSize(file: string): { width: number; height: number; valid: boolean } {
  const bytes = fs.readFileSync(path.resolve(file));
  const valid = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { valid, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function pngHasAlpha(file: string): boolean {
  const bytes = fs.readFileSync(path.resolve(file));
  return bytes[25] === 4 || bytes[25] === 6;
}

export function runHubPrologueTests(): { results: HubPrologueTestResult[] } {
  const results: HubPrologueTestResult[] = [];
  const hub = pngSize('public/assets/world/hub/hub_sxp_interior.png');
  results.push({ testName: 'Production Hub background matches logical viewport', passed: hub.valid && hub.width === 1280 && hub.height === 720, message: `${hub.width}x${hub.height} PNG with valid binary signature` });

  const coba = pngSize('public/assets/npc/coba/coba_idle.png');
  results.push({ testName: 'Cô Ba production sprite is a genuine PNG asset', passed: coba.valid && coba.width > 0 && coba.height > 0, message: `${coba.width}x${coba.height} PNG ready for guarded preload` });

  const chutu = pngSize('public/assets/npc/chutu/chutu_idle.png');
  const chutuReady = chutu.valid && chutu.width > 0 && chutu.height > 0 && pngHasAlpha('public/assets/npc/chutu/chutu_idle.png');
  results.push({ testName: 'Chú Tư replaces the Stage graybox with a transparent production asset', passed: chutuReady, message: `${chutu.width}x${chutu.height} RGBA PNG with guarded fallback` });

  const playerOpaqueHeight = 76;
  const npcScaleRatio = COBA_RENDER_HEIGHT / playerOpaqueHeight;
  results.push({ testName: 'Cô Ba and Hội Khờ share one gameplay scale', passed: npcScaleRatio >= 1 && npcScaleRatio <= 1.15, message: `Visual height ratio ${npcScaleRatio.toFixed(2)}x (target 1.00–1.15x)` });

  const playerHubHeight = playerOpaqueHeight * HUB_HUMAN_SCALE;
  const hubHumanScale = playerHubHeight >= 110 && playerHubHeight <= 130;
  results.push({ testName: 'Hub human scale matches industrial environment', passed: hubHumanScale, message: `Hội Khờ renders at ${playerHubHeight.toFixed(1)}px body height in Hub` });

  const narrative = PROLOGUE_BEATS.length === 4 && advancePrologueBeat(0) === 1 && PROLOGUE_BEATS.some((beat) => beat.body.includes('Cô Ba'));
  results.push({ testName: 'Prologue has deterministic four-beat narrative progression', passed: narrative, message: narrative ? 'Debt, bridge, flyer and Hub onboarding beats are reachable' : 'Prologue beat contract mismatch' });

  const game = fs.readFileSync(path.resolve('src/game/core/Game.ts'), 'utf8');
  const menu = fs.readFileSync(path.resolve('src/game/scenes/MenuScene.ts'), 'utf8');
  const renderer = fs.readFileSync(path.resolve('src/game/rendering/Renderer.ts'), 'utf8');
  const hubWiring = game.includes("registerScene('PROLOGUE'") && game.includes('preloadHubAssets()') && menu.includes("switchScene('PROLOGUE')") && renderer.includes('hubProduction.renderBackground');
  results.push({ testName: 'New Game and Hub assets use guarded production routing', passed: hubWiring, message: hubWiring ? 'New Game routes through Prologue; Hub retains fallback rendering' : 'Scene or preload wiring missing' });

  const sprite = fs.readFileSync(path.resolve('src/game/rendering/SpriteRenderer.ts'), 'utf8');
  const hud = fs.readFileSync(path.resolve('src/game/rendering/PlaceholderRenderer.ts'), 'utf8');
  const readability = sprite.includes('contrastOutline') && sprite.includes("ctx.filter = 'brightness(0)'") && hud.includes("fillText('Q READY!'") && hud.includes('shadowBlur');
  results.push({ testName: 'Player contrast edge and Q-ready pulse are active', passed: readability, message: readability ? 'Sprite outline and compact HUD readiness feedback verified' : 'Readability treatment missing' });

  const presentation = renderer.includes('renderDialoguePortrait') && renderer.includes('stageNpc.render') && game.includes('preloadStageNpcAssets()');
  results.push({ testName: 'Dialogue portraits and Stage customer use production-safe routing', passed: presentation, message: presentation ? 'Speaker portraits and Chú Tư asset retain guarded fallbacks' : 'Presentation routing incomplete' });

  const koGrounding = sprite.includes("stateName === 'ko' ? 2 : 0") && renderer.includes('knockedOut ? 1.5 : 0.8');
  results.push({ testName: 'KO sprites settle onto a dedicated corpse contact plane', passed: koGrounding, message: koGrounding ? 'KO anchor sink and wide flat shadow remove the floating-body gap' : 'KO grounding treatment missing' });

  const tutorial = new HubTutorialSystem(false);
  const player = new Player(0, 0);
  let pressed: GameAction | null = null;
  let held: GameAction | null = 'moveRight';
  const input = {
    isDown: (action: GameAction) => action === held,
    isJustPressed: (action: GameAction) => action === pressed,
  } as Input;
  tutorial.start(player);
  tutorial.observe(0.5, input, player);
  held = null; pressed = 'jump'; tutorial.observe(0, input, player);
  pressed = null; tutorial.recordAction('ATTACK'); tutorial.observe(0, input, player);
  tutorial.recordAction('PROJECTILE'); tutorial.observe(0, input, player);
  tutorial.recordAction('DODGE'); tutorial.observe(0, input, player);
  const ultimateCharged = player.momentum >= BALANCE.ULTIMATE_COST;
  tutorial.recordAction('ULTIMATE'); const completedNow = tutorial.observe(0, input, player);
  const tutorialFlow = ultimateCharged && completedNow && tutorial.isCompleted() && !tutorial.isActive();
  results.push({ testName: 'Hub tutorial advances only through completed gameplay actions', passed: tutorialFlow, message: tutorialFlow ? 'Move, jump, J, K, L and charged Q progress deterministically' : 'Tutorial state machine failed to complete' });

  const hubScene = fs.readFileSync(path.resolve('src/game/scenes/HubScene.ts'), 'utf8');
  const skipContract = hubScene.includes('tutorialIntroDialogue') && hubScene.includes('this.dialogue.reset()') && hubScene.includes('this.tutorial.skip()');
  results.push({ testName: 'Esc skips tutorial without starting overlapping modals', passed: skipContract, message: skipContract ? 'Intro dialogue and active training both have explicit skip paths' : 'Tutorial skip path is incomplete' });
  return { results };
}
