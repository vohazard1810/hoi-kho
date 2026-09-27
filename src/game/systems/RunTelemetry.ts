export type RunAction = 'J' | 'K' | 'L' | 'Q';

export interface StageRunTelemetrySnapshot {
  stageId: 'STAGE_1';
  elapsedSeconds: number;
  deaths: number;
  actionInputs: Record<RunAction, number>;
  confirmedMeleeHits: number;
  damageTakenEvents: number;
  parcelStart: number;
  parcelEnd: number;
  bossAttempts: number;
  bossTtkSeconds: number | null;
  completed: boolean;
}

const emptySnapshot = (parcelStart = 100): StageRunTelemetrySnapshot => ({
  stageId: 'STAGE_1',
  elapsedSeconds: 0,
  deaths: 0,
  actionInputs: { J: 0, K: 0, L: 0, Q: 0 },
  confirmedMeleeHits: 0,
  damageTakenEvents: 0,
  parcelStart,
  parcelEnd: parcelStart,
  bossAttempts: 0,
  bossTtkSeconds: null,
  completed: false,
});

/** Session-only playtest telemetry. It never blocks or changes gameplay. */
export class RunTelemetry {
  private static instance: RunTelemetry | null = null;
  private data = emptySnapshot();
  private active = false;
  private bossAttemptStartedAt: number | null = null;

  public static getInstance(): RunTelemetry {
    if (!this.instance) this.instance = new RunTelemetry();
    return this.instance;
  }

  public startStage(parcelStart: number): void {
    this.data = emptySnapshot(parcelStart);
    this.active = true;
    this.bossAttemptStartedAt = null;
  }

  public update(dt: number): void {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    this.data.elapsedSeconds += dt;
  }

  public recordAction(action: RunAction): void { if (this.active) this.data.actionInputs[action] += 1; }
  public recordMeleeHits(count: number): void { if (this.active) this.data.confirmedMeleeHits += Math.max(0, Math.floor(count)); }
  public recordDamageTaken(): void { if (this.active) this.data.damageTakenEvents += 1; }
  public recordDeath(): void { if (this.active) this.data.deaths += 1; }

  public beginBossAttempt(): void {
    if (!this.active) return;
    this.data.bossAttempts += 1;
    this.bossAttemptStartedAt = this.data.elapsedSeconds;
  }

  public recordBossDefeated(): void {
    if (!this.active || this.bossAttemptStartedAt === null) return;
    this.data.bossTtkSeconds = Math.max(0, this.data.elapsedSeconds - this.bossAttemptStartedAt);
    this.bossAttemptStartedAt = null;
  }

  public complete(parcelEnd: number): void {
    if (!this.active) return;
    this.data.parcelEnd = Math.max(0, Math.min(100, parcelEnd));
    this.data.completed = true;
    this.active = false;
    if (typeof sessionStorage !== 'undefined') {
      try { sessionStorage.setItem('no_oi_latest_run_v1', JSON.stringify(this.getSnapshot())); }
      catch { /* Telemetry is optional in restricted browsers. */ }
    }
  }

  public getSnapshot(): StageRunTelemetrySnapshot {
    return { ...this.data, actionInputs: { ...this.data.actionInputs } };
  }

  public resetForTests(): void { this.data = emptySnapshot(); this.active = false; this.bossAttemptStartedAt = null; }
}
