import { AudioManager } from '../audio/AudioManager';
import { Input } from '../core/Input';
import { SceneManager } from '../core/SceneManager';
import { DeliveryResultData } from '../core/types';
import { Renderer } from '../rendering/Renderer';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { Scene } from './Scene';

export class ResultScene implements Scene {
  public name: string = 'RESULT';

  private sceneManager: SceneManager;
  private resultData: DeliveryResultData | null = null;
  private canReturn: boolean = false;
  private timer: number = 0;
  private revealProgress: number = 0;
  private lastCashTickProgress: number = 0;
  private settlementChimePlayed: boolean = false;

  private isEpilogueActive: boolean = false;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  public init(): void {
    // Result init
  }

  public enter(): void {
    const objective = ObjectiveSystem.getInstance();
    this.resultData = objective.deliveryResult;
    this.canReturn = false;
    this.isEpilogueActive = false;
    this.timer = 0.5; // Brief buffer before input to avoid accidental skip
    this.revealProgress = 0;
    this.lastCashTickProgress = 0;
    this.settlementChimePlayed = false;
  }

  public exit(): void {
    this.resultData = null;
    this.isEpilogueActive = false;
  }

  public update(dt: number, input: Input): void {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.canReturn = true;
      }
    }

    if (!this.isEpilogueActive) {
      if (this.revealProgress < 1) {
        this.revealProgress = Math.min(1, this.revealProgress + dt * 0.9);
        if (this.revealProgress - this.lastCashTickProgress >= 0.09) {
          this.lastCashTickProgress = this.revealProgress;
          AudioManager.getInstance().play('cash_tick');
        }
      }
      if (this.revealProgress >= 1 && !this.settlementChimePlayed) {
        this.settlementChimePlayed = true;
        AudioManager.getInstance().play('order_complete');
      }
    }

    if (this.canReturn) {
      if (
        input.isJustPressed('interact') ||
        input.isJustPressed('jump') ||
        input.isJustPressed('attack')
      ) {
        if (!this.isEpilogueActive) {
          this.isEpilogueActive = true;
          this.canReturn = false;
          this.timer = 0.6;
          AudioManager.getInstance().play('order_complete');
        } else {
          this.sceneManager.switchScene('HUB');
        }
      }
    }
  }

  public render(renderer: Renderer, _interpolation: number): void {
    if (!this.resultData) return;

    if (this.isEpilogueActive) {
      renderer.renderEpilogueCutscene(this.resultData);
    } else {
      renderer.renderResultScene(this.resultData, this.revealProgress);
    }
  }
}
