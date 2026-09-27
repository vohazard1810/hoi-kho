/** Bounded resistance to repeated stagger. Never blocks HP damage. */
export class PoiseGuard {
  private hits = 0;
  private chainTime = 0;
  private protection = 0;
  public update(dt: number): void {
    this.protection = Math.max(0, this.protection - dt);
    this.chainTime = Math.max(0, this.chainTime - dt);
    if (this.chainTime === 0) this.hits = 0;
  }
  public allowFlinch(): boolean {
    if (this.protection > 0) return false;
    this.chainTime = 1.4;
    if (++this.hits >= 3) { this.hits = 0; this.protection = 1.3; }
    return true;
  }
  public get active(): boolean { return this.protection > 0; }
}
