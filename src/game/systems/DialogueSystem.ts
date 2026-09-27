export interface DialogueLine {
  speaker: string;
  text: string;
  tone?: 'neutral' | 'warning' | 'boss' | 'success';
}

export interface DialogueSnapshot {
  active: boolean;
  line: DialogueLine | null;
  index: number;
  total: number;
}

export class DialogueSystem {
  private lines: DialogueLine[] = [];
  private index = 0;
  private onComplete: (() => void) | null = null;

  public start(lines: DialogueLine[], onComplete?: () => void): boolean {
    if (this.isActive() || lines.length === 0) return false;
    this.lines = lines.map((line) => ({ ...line }));
    this.index = 0;
    this.onComplete = onComplete ?? null;
    return true;
  }

  public isActive(): boolean { return this.lines.length > 0; }

  public advance(): void {
    if (!this.isActive()) return;
    this.index++;
    if (this.index >= this.lines.length) this.finish();
  }

  public skip(): void { if (this.isActive()) this.finish(); }

  public reset(): void { this.lines = []; this.index = 0; this.onComplete = null; }

  public getSnapshot(): DialogueSnapshot {
    return { active: this.isActive(), line: this.lines[this.index] ?? null, index: this.index, total: this.lines.length };
  }

  private finish(): void {
    const callback = this.onComplete;
    this.reset();
    callback?.();
  }
}
