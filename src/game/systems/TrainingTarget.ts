import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { CollisionSystem } from './CollisionSystem';
import { TutorialStepId } from './HubTutorialSystem';

/** Safe training uses real active hitboxes/projectiles, never key presses. */
export class TrainingTarget {
  public readonly rect = { x: 502, y: 554, width: 36, height: 66 };
  public flash = 0;
  public clock = 0;
  public projectiles: Projectile[] = [];
  private hitIds = new Set<string>();
  public reset(): void { this.flash = 0; this.clock = 0; this.projectiles = []; this.hitIds.clear(); }
  public update(dt: number, player: Player, step: TutorialStepId | undefined): TutorialStepId | null {
    this.flash = Math.max(0, this.flash - dt);
    this.clock += dt;
    for (const p of this.projectiles) { p.update(dt); p.checkSolidCollision(1280, []); }
    this.projectiles = this.projectiles.filter(p => !p.isExpired);
    const box = player.getActiveHitbox();
    const desired = step === 'ULTIMATE' ? player.comboStep === 'ULTIMATE' : player.comboStep !== 'ULTIMATE';
    if ((step === 'ATTACK' || step === 'ULTIMATE') && desired && box && !this.hitIds.has(box.id) && CollisionSystem.checkAABB(box, this.rect)) {
      this.hitIds.add(box.id); this.flash = 0.3; return step;
    }
    for (const p of this.projectiles) {
      if (step === 'PROJECTILE' && CollisionSystem.checkAABB(p.getRect(), this.rect)) {
        p.isExpired = true; this.flash = 0.3; return step;
      }
    }
    // Orange lane pulses every 2s: 1.2s warning, 0.35s active, then recovery.
    const phase = this.clock % 2;
    if (step === 'DODGE' && phase >= 1.2 && phase < 1.55 && player.actionState === 'DODGE' && player.isInvulnerable && CollisionSystem.checkAABB(player.getRect(), { x: 450, y: 544, width: 140, height: 76 })) {
      this.flash = 0.3; return 'DODGE';
    }
    return null;
  }
}
