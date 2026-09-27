import { Input } from '../core/Input';
import { SceneManager } from '../core/SceneManager';
import { Renderer } from '../rendering/Renderer';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { Scene } from './Scene';
import { HubTutorialSystem } from '../systems/HubTutorialSystem';
import { EconomySystem } from '../systems/EconomySystem';

export const MENU_OPTIONS = ['CHƠI MỚI', 'TIẾP TỤC', 'HƯỚNG DẪN'] as const;

export function moveMenuSelection(index: number, delta: number): number {
  return (index + delta + MENU_OPTIONS.length) % MENU_OPTIONS.length;
}

export class MenuScene implements Scene {
  public name = 'MENU';
  private selectedIndex = 0;
  private showTutorial = false;
  private confirmNewGame = false;
  private confirmSelection: 0 | 1 = 0;

  constructor(private readonly sceneManager: SceneManager) {}
  public init(): void {}
  public enter(): void { this.selectedIndex = UpgradeSystem.getInstance().hasProgress() || EconomySystem.getInstance().hasProgress() ? 1 : 0; this.showTutorial = false; this.confirmNewGame = false; }
  public exit(): void { this.showTutorial = false; this.confirmNewGame = false; }

  public update(_dt: number, input: Input): void {
    if (this.showTutorial) {
      if (input.isJustPressed('cancel') || input.isJustPressed('interact')) this.showTutorial = false;
      return;
    }
    if (this.confirmNewGame) {
      if (input.isJustPressed('moveLeft')) this.confirmSelection = 0;
      if (input.isJustPressed('moveRight')) this.confirmSelection = 1;
      if (input.isJustPressed('cancel')) this.confirmNewGame = false;
      if (input.isJustPressed('interact') || input.isJustPressed('attack')) {
        if (this.confirmSelection === 1) {
          UpgradeSystem.getInstance().resetProgress();
          EconomySystem.getInstance().resetProgress();
          HubTutorialSystem.getInstance().reset();
          this.confirmNewGame = false;
          this.sceneManager.switchScene('PROLOGUE');
        } else this.confirmNewGame = false;
      }
      return;
    }

    if (input.isJustPressed('uiUp')) this.selectedIndex = moveMenuSelection(this.selectedIndex, -1);
    if (input.isJustPressed('uiDown')) this.selectedIndex = moveMenuSelection(this.selectedIndex, 1);
    if (input.isJustPressed('interact') || input.isJustPressed('attack') || input.isJustPressed('jump')) {
      if (this.selectedIndex === 0) { this.confirmNewGame = true; this.confirmSelection = 0; }
      else if (this.selectedIndex === 1) this.sceneManager.switchScene('HUB');
      else this.showTutorial = true;
    }
  }

  public render(renderer: Renderer, _interpolation: number): void {
    renderer.renderMenuScene({
      selectedIndex: this.selectedIndex,
      hasProgress: UpgradeSystem.getInstance().hasProgress(),
      showTutorial: this.showTutorial,
      confirmNewGame: this.confirmNewGame,
      confirmSelection: this.confirmSelection,
      intro: null,
    });
  }
}
