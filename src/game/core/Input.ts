export type GameAction =
  | 'moveLeft'
  | 'moveRight'
  | 'uiUp'
  | 'uiDown'
  | 'jump'
  | 'attack'
  | 'projectile'
  | 'dodge'
  | 'ultimate'
  | 'interact'
  | 'cancel'
  | 'toggleDev';

export class Input {
  // Persistent held keys
  private heldKeys: Set<string> = new Set();

  // Edge triggers (cleared per simulation tick update)
  private justPressedKeys: Set<string> = new Set();
  private justReleasedKeys: Set<string> = new Set();

  private keyMap: Record<GameAction, string[]> = {
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    uiUp: ['KeyW', 'ArrowUp'],
    uiDown: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyW', 'ArrowUp'],
    attack: ['KeyJ'],
    projectile: ['KeyK'],
    dodge: ['KeyL'],
    ultimate: ['KeyQ'],
    interact: ['KeyE'],
    cancel: ['Escape'],
    toggleDev: ['Backquote', 'F1'],
  };

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundBlur: () => void;

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundBlur = this.handleBlur.bind(this);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('blur', this.boundBlur);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent scrolling or unwanted default actions for gameplay keys
    if (
      [
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyJ',
        'KeyK',
        'KeyL',
        'KeyQ',
        'KeyE',
        'Escape',
        'Backquote',
        'F1',
      ].includes(e.code)
    ) {
      e.preventDefault();
    }

    // If key is already held (or OS repeat event), do not trigger one-shot press again
    if (!this.heldKeys.has(e.code)) {
      this.heldKeys.add(e.code);
      this.justPressedKeys.add(e.code);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
    this.justReleasedKeys.add(e.code);
  }

  private handleBlur(): void {
    this.reset();
  }

  /**
   * Check if action's key is currently held down
   */
  public isDown(action: GameAction): boolean {
    const codes = this.keyMap[action];
    return codes.some((code) => this.heldKeys.has(code));
  }

  public isHeld(action: GameAction): boolean {
    return this.isDown(action);
  }

  /**
   * Check if action's key was just pressed this simulation frame (one-shot edge)
   */
  public isJustPressed(action: GameAction): boolean {
    const codes = this.keyMap[action];
    return codes.some((code) => this.justPressedKeys.has(code));
  }

  public wasPressed(action: GameAction): boolean {
    return this.isJustPressed(action);
  }

  public isKeyJustPressed(code: string): boolean {
    return this.justPressedKeys.has(code);
  }

  /**
   * Check if action's key was just released this simulation frame (one-shot edge)
   */
  public isJustReleased(action: GameAction): boolean {
    const codes = this.keyMap[action];
    return codes.some((code) => this.justReleasedKeys.has(code));
  }

  public wasReleased(action: GameAction): boolean {
    return this.isJustReleased(action);
  }

  /**
   * Clears one-shot edge triggers after fixed simulation step.
   * Held keys persist across ticks.
   */
  public update(): void {
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
  }

  public reset(): void {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('blur', this.boundBlur);
  }
}
