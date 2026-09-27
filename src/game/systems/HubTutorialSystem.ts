import { BALANCE } from '../config/balance';
import { GameAction, Input } from '../core/Input';
import { Player } from '../entities/Player';

export type TutorialStepId = 'MOVE' | 'JUMP' | 'ATTACK' | 'PROJECTILE' | 'DODGE' | 'ULTIMATE';

export interface TutorialStepDefinition {
  id: TutorialStepId;
  title: string;
  instruction: string;
  keyLabel: string;
  action: GameAction;
}

export interface HubTutorialSnapshot {
  active: boolean;
  completed: boolean;
  stepIndex: number;
  totalSteps: number;
  step: TutorialStepDefinition | null;
}

export const HUB_TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  { id: 'MOVE', title: 'LÀM QUEN ĐƯỜNG PHỐ', instruction: 'Di chuyển sang trái hoặc phải', keyLabel: 'A / D', action: 'moveRight' },
  { id: 'JUMP', title: 'VƯỢT CHƯỚNG NGẠI', instruction: 'Nhảy qua vật cản', keyLabel: 'W / SPACE', action: 'jump' },
  { id: 'ATTACK', title: 'BỘ ĐỒ NGHỀ', instruction: 'Đánh thử vào kiện tập', keyLabel: 'J', action: 'attack' },
  { id: 'PROJECTILE', title: 'BĂNG KEO TỪ XA', instruction: 'Ném băng keo trúng kiện tập', keyLabel: 'K', action: 'projectile' },
  { id: 'DODGE', title: 'GIỮ NGƯỜI, GIỮ KIỆN', instruction: 'Né trong vạch cam khi nó sáng', keyLabel: 'L', action: 'dodge' },
  { id: 'ULTIMATE', title: 'GIAO HỎA TỐC', instruction: 'Đứng gần và đánh trúng kiện', keyLabel: 'Q', action: 'ultimate' },
] as const;

export class HubTutorialSystem {
  private static readonly STORAGE_KEY = 'no_oi_toi_day_hub_tutorial_v1';
  private static instance: HubTutorialSystem | null = null;
  private stepIndex = -1;
  private completed = false;
  private moveHoldTime = 0;
  private performedActions = new Set<TutorialStepId>();

  constructor(loadStorage: boolean = true) {
    if (loadStorage) this.load();
  }

  public static getInstance(): HubTutorialSystem {
    if (!HubTutorialSystem.instance) HubTutorialSystem.instance = new HubTutorialSystem();
    return HubTutorialSystem.instance;
  }

  public start(player: Player): void {
    if (this.completed) return;
    this.stepIndex = 0;
    this.moveHoldTime = 0;
    this.performedActions.clear();
    this.prepareCurrentStep(player);
  }

  public skip(): void { this.complete(); }
  public recordAction(action: TutorialStepId): void { this.performedActions.add(action); }
  public isActive(): boolean { return this.stepIndex >= 0 && !this.completed; }
  public isCompleted(): boolean { return this.completed; }

  public reset(): void {
    this.stepIndex = -1;
    this.completed = false;
    this.moveHoldTime = 0;
    this.performedActions.clear();
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(HubTutorialSystem.STORAGE_KEY); } catch { /* optional persistence */ }
    }
  }

  public resetForTests(): void { this.stepIndex = -1; this.completed = false; this.moveHoldTime = 0; this.performedActions.clear(); }

  public observe(dt: number, input: Input, player: Player): boolean {
    if (!this.isActive()) return false;
    const step = HUB_TUTORIAL_STEPS[this.stepIndex];
    let passed = false;
    if (step.id === 'MOVE') {
      if (input.isDown('moveLeft') || input.isDown('moveRight')) this.moveHoldTime += dt;
      passed = this.moveHoldTime >= 0.45;
    } else if (step.id === 'JUMP') passed = (!player.isGrounded && player.vy < 0) || input.isJustPressed('jump');
    else passed = this.performedActions.has(step.id);
    if (!passed) return false;

    this.stepIndex++;
    this.moveHoldTime = 0;
    this.performedActions.clear();
    if (this.stepIndex >= HUB_TUTORIAL_STEPS.length) {
      this.complete();
      return true;
    }
    this.prepareCurrentStep(player);
    return false;
  }

  public getSnapshot(): HubTutorialSnapshot {
    return {
      active: this.isActive(),
      completed: this.completed,
      stepIndex: Math.max(0, this.stepIndex),
      totalSteps: HUB_TUTORIAL_STEPS.length,
      step: this.isActive() ? HUB_TUTORIAL_STEPS[this.stepIndex] : null,
    };
  }

  private prepareCurrentStep(player: Player): void {
    if (HUB_TUTORIAL_STEPS[this.stepIndex]?.id === 'ULTIMATE') {
      player.momentum = Math.max(player.momentum, BALANCE.ULTIMATE_COST);
    }
  }

  private complete(): void {
    this.completed = true;
    this.stepIndex = -1;
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(HubTutorialSystem.STORAGE_KEY, '1'); } catch { /* optional persistence */ }
    }
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try { this.completed = localStorage.getItem(HubTutorialSystem.STORAGE_KEY) === '1'; } catch { this.completed = false; }
  }
}
