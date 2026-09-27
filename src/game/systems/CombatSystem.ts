import { Hitbox, Hurtbox } from '../core/types';
import { CollisionSystem } from './CollisionSystem';

export interface CombatTarget {
  id: string;
  getHurtbox(): Hurtbox;
  takeDamage(
    damage: number,
    parcelDamage: number,
    knockbackX: number,
    knockbackY: number,
    sourceX: number
  ): boolean; // returns true if damaged
}

export class CombatSystem {
  // Keeps track of which targets have already been hit by which hitbox instance ID
  private hitHistory: Map<string, Set<string>> = new Map();

  public reset(): void {
    this.hitHistory.clear();
  }

  /**
   * Marks one active attack as resolved against a target without applying
   * damage. Used by a successful dodge so the same long-lived hitbox cannot
   * hit the player after dodge invulnerability expires.
   */
  public resolveWithoutDamage(hitboxId: string, targetId: string): void {
    if (!hitboxId || !targetId) return;
    this.recordHit(hitboxId, targetId);
  }

  /**
   * Registers a hit to prevent multi-hit in the same attack swing
   */
  private canHit(hitboxId: string, targetId: string): boolean {
    const hits = this.hitHistory.get(hitboxId);
    if (!hits) return true;
    return !hits.has(targetId);
  }

  private recordHit(hitboxId: string, targetId: string): void {
    if (!this.hitHistory.has(hitboxId)) {
      this.hitHistory.set(hitboxId, new Set());
    }
    this.hitHistory.get(hitboxId)!.add(targetId);
  }

  /**
   * Evaluates active hitbox against a list of targets
   * Returns list of hit target IDs
   */
  public evaluateHitbox(
    hitbox: Hitbox | null,
    targets: CombatTarget[]
  ): string[] {
    if (!hitbox) return [];

    const hitTargets: string[] = [];

    for (const target of targets) {
      if (target.id === hitbox.ownerId) continue;
      if (!this.canHit(hitbox.id, target.id)) continue;

      const hurtbox = target.getHurtbox();
      if (hurtbox.isInvulnerable) continue;

      if (CollisionSystem.checkAABB(hitbox, hurtbox)) {
        const damaged = target.takeDamage(
          hitbox.damage,
          hitbox.parcelDamage ?? 0,
          hitbox.knockbackX ?? 100,
          hitbox.knockbackY ?? 80,
          hitbox.x + hitbox.width / 2
        );

        if (damaged) {
          this.recordHit(hitbox.id, target.id);
          hitTargets.push(target.id);
        }
      }
    }

    return hitTargets;
  }
}
