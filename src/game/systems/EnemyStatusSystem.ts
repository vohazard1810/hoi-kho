export class EnemyStatusSystem {
  private slowRemaining = new Map<string, number>();

  public reset(): void {
    this.slowRemaining.clear();
  }

  public applyStickySlow(targetIds: string[], duration: number = 1.5): void {
    for (const id of targetIds) {
      this.slowRemaining.set(id, Math.max(this.slowRemaining.get(id) ?? 0, duration));
    }
  }

  public update(dt: number): void {
    for (const [id, remaining] of this.slowRemaining) {
      const next = remaining - dt;
      if (next <= 0) this.slowRemaining.delete(id);
      else this.slowRemaining.set(id, next);
    }
  }

  public getMovementMultiplier(targetId: string): number {
    return this.slowRemaining.has(targetId) ? 0.55 : 1;
  }

  public getSlowedTargetIds(): ReadonlySet<string> {
    return new Set(this.slowRemaining.keys());
  }
}
