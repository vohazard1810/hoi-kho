import { GAME_CONFIG } from '../config/gameConfig';

export class GameLoop {
  private lastTime: number = 0;
  private accumulator: number = 0;
  private running: boolean = false;
  private animationFrameId: number | null = null;

  private onUpdate: (fixedDelta: number) => void;
  private onRender: (interpolation: number) => void;

  constructor(
    onUpdate: (fixedDelta: number) => void,
    onRender: (interpolation: number) => void
  ) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;

    const frame = (time: number) => {
      if (!this.running) return;

      try {
        let deltaSeconds = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // Clamp delta time to avoid large jumps if tab was in background
        if (deltaSeconds > GAME_CONFIG.MAX_ACCUMULATED_TIME) {
          deltaSeconds = GAME_CONFIG.MAX_ACCUMULATED_TIME;
        }

        this.accumulator += deltaSeconds;

        const fixedDt = GAME_CONFIG.FIXED_TIMESTEP;
        let steps = 0;
        while (this.accumulator >= fixedDt && steps < 8) {
          this.onUpdate(fixedDt);
          this.accumulator -= fixedDt;
          steps++;
        }
        if (this.accumulator > fixedDt) {
          this.accumulator = 0; // Prevent death spiral on scene loading spikes
        }

        // Calculate interpolation alpha for smooth rendering
        const interpolation = this.accumulator / fixedDt;
        this.onRender(interpolation);
      } catch (err) {
        console.error('[GameLoop] Error during animation frame:', err);
      } finally {
        if (this.running) {
          this.animationFrameId = requestAnimationFrame(frame);
        }
      }
    };

    this.animationFrameId = requestAnimationFrame(frame);
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public isRunning(): boolean {
    return this.running;
  }
}
