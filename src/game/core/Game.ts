import { GAME_CONFIG } from '../config/gameConfig';
import { Input } from './Input';
import { GameLoop } from './GameLoop';
import { SceneManager } from './SceneManager';
import { Renderer } from '../rendering/Renderer';
import { HubScene } from '../scenes/HubScene';
import { Stage1Scene } from '../scenes/Stage1Scene';
import { ResultScene } from '../scenes/ResultScene';
import { AssetManager } from '../assets/AssetManager';
import { AudioManager } from '../audio/AudioManager';
import { MenuScene } from '../scenes/MenuScene';
import { SceneType } from './types';
import { PrologueScene } from '../scenes/PrologueScene';

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: Input;
  private sceneManager: SceneManager;
  private gameLoop: GameLoop;
  private readonly onDevModeChange?: (enabled: boolean) => void;
  private readonly onSceneChange?: (scene: SceneType) => void;
  private lastScene: SceneType | null = null;

  constructor(canvas: HTMLCanvasElement, onDevModeChange?: (enabled: boolean) => void, onSceneChange?: (scene: SceneType) => void) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.sceneManager = new SceneManager();
    this.onDevModeChange = onDevModeChange;
    this.onSceneChange = onSceneChange;
    AudioManager.getInstance().installUnlockListeners();

    this.renderer.setDevMode(GAME_CONFIG.DEV_MODE);
    this.onDevModeChange?.(GAME_CONFIG.DEV_MODE);

    // Register all scenes
    this.sceneManager.registerScene('MENU', new MenuScene(this.sceneManager));
    this.sceneManager.registerScene('PROLOGUE', new PrologueScene(this.sceneManager));
    this.sceneManager.registerScene('HUB', new HubScene(this.sceneManager));
    this.sceneManager.registerScene('STAGE_1', new Stage1Scene(this.sceneManager));
    this.sceneManager.registerScene('RESULT', new ResultScene(this.sceneManager));

    // Start at the title screen; Continue routes to the preserved Hub state.
    this.sceneManager.switchScene('MENU');
    this.notifySceneChange();

    // Create fixed-timestep game loop
    this.gameLoop = new GameLoop(
      (dt: number) => this.update(dt),
      (interpolation: number) => this.render(interpolation)
    );

    // Initialize asset preloading & validation pipeline from manifest (single source of truth)
    this.initAssets();
  }

  private async initAssets(): Promise<void> {
    try {
      const assetManager = AssetManager.getInstance();
      void AudioManager.getInstance().preload();
      const [result, dogResult, rivalResult, thugResult, bossResult, backgroundReady, geometryReady, hubReady, stageNpcReady, v19Ready] = await Promise.all([
        assetManager.loadPreferredCharacterWithFallback('player', '/assets/staging_hd', '/assets/staging'),
        assetManager.loadAndActivateCharacter('dog', '/assets/staging'),
        assetManager.loadAndActivateCharacter('rival', '/assets/staging'),
        assetManager.loadAndActivateCharacter('thug', '/assets/staging'),
        assetManager.loadAndActivateCharacter('boss_dog', '/assets/staging'),
        this.renderer.preloadStage1Background(),
        this.renderer.preloadWorldGeometry(),
        this.renderer.preloadHubAssets(),
        this.renderer.preloadStageNpcAssets(),
        this.renderer.preloadV19Assets(),
      ]);

      if (result.success && result.status === 'PRODUCTION') {
        console.log('[AssetManager] Player SXP production sprite set activated in-memory.');
      } else {
        console.warn(
          `[AssetManager] Player SXP activation returned ${result.status} (remaining in safe fallback mode).`,
          result.reasons
        );
      }

      if (dogResult.success && dogResult.status === 'PRODUCTION') {
        console.log('[AssetManager] Chó Hẻm production sprite set activated in-memory.');
      } else {
        console.warn(
          `[AssetManager] Chó Hẻm activation returned ${dogResult.status} (remaining in safe fallback mode).`,
          dogResult.reasons
        );
      }

      if (rivalResult.success && rivalResult.status === 'PRODUCTION') {
        console.log('[AssetManager] Shipper Đối Thủ production sprite set activated in-memory.');
      } else {
        console.warn(`[AssetManager] Shipper Đối Thủ activation returned ${rivalResult.status}.`, rivalResult.reasons);
      }

      if (thugResult.success && thugResult.status === 'PRODUCTION') {
        console.log('[AssetManager] Đầu Gấu production sprite set activated in-memory.');
      } else {
        console.warn(`[AssetManager] Đầu Gấu activation returned ${thugResult.status}.`, thugResult.reasons);
      }

      if (bossResult.success && bossResult.status === 'PRODUCTION') {
        console.log('[AssetManager] Chó Đại Ca production sprite set activated in-memory.');
      } else {
        console.warn(
          `[AssetManager] Chó Đại Ca activation returned ${bossResult.status} (remaining in safe fallback mode).`,
          bossResult.reasons
        );
      }

      if (backgroundReady) {
        console.log('[Parallax] Stage 1 Saigon production background activated in-memory.');
      }
      if (geometryReady) {
        console.log('[WorldGeometry] Stage 1 production platform/gate/hazard set activated in-memory.');
      }
      if (hubReady) console.log('[HubProduction] SXP interior and Cô Ba activated in-memory.');
      if (stageNpcReady) console.log('[StageNpc] Chú Tư production sprite activated in-memory.');
      if (v19Ready) console.log('[V19Visuals] V19 production visual pack activated in-memory.');
    } catch (e) {
      console.error('[AssetManager] Unexpected error during asset initialization:', e);
    }
  }

  public start(): void {
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
  }

  public toggleDevMode(): boolean {
    const enabled = this.renderer.toggleDevMode();
    this.onDevModeChange?.(enabled);
    return enabled;
  }

  public isDevMode(): boolean {
    return this.renderer.getDevMode();
  }

  private update(dt: number): void {
    // Check global dev mode toggle key (F1 or `)
    if (this.input.isJustPressed('toggleDev')) {
      this.toggleDevMode();
    }

    // Update active scene
    this.sceneManager.update(dt, this.input);
    this.notifySceneChange();

    // Update input state at the end of simulation frame
    this.input.update();
  }

  private notifySceneChange(): void {
    const scene = this.sceneManager.getCurrentSceneType();
    if (scene && scene !== this.lastScene) {
      this.lastScene = scene;
      AudioManager.getInstance().setSceneAudio(scene);
      this.onSceneChange?.(scene);
    }
  }

  private render(interpolation: number): void {
    this.sceneManager.render(this.renderer, interpolation);
  }

  public destroy(): void {
    this.gameLoop.stop();
    this.input.destroy();
    AudioManager.getInstance().setSceneAudio(null);
  }
}
