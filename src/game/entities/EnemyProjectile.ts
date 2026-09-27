import { BALANCE } from '../config/balance';
import { Hitbox, Rect } from '../core/types';
import { Entity } from './Entity';

export class EnemyProjectile extends Entity {
  public isExpired = false;
  public rotation = 0;
  private lifetime = BALANCE.RIVAL_RANGED_PROJECTILE_LIFETIME;
  private readonly hitboxId: string;

  constructor(ownerId: string, x: number, y: number, targetX: number, targetY: number) {
    super(`enemy_proj_${ownerId}_${Date.now()}_${Math.random()}`, x, y, 20, 16);
    const flightTime = 0.65;
    this.vx = Math.max(-500, Math.min(500, (targetX - x) / flightTime));
    this.vy = Math.max(-600, Math.min(300,
      (targetY - y - 0.5 * BALANCE.RIVAL_RANGED_PROJECTILE_GRAVITY * flightTime * flightTime) / flightTime
    ));
    this.facing = this.vx >= 0 ? 'right' : 'left';
    this.hitboxId = `hb_${this.id}`;
  }

  public getHitbox(): Hitbox | null {
    if (this.isExpired) return null;
    return {
      id: this.hitboxId,
      ownerId: this.id,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      damage: BALANCE.RIVAL_RANGED_DAMAGE,
      parcelDamage: BALANCE.RIVAL_RANGED_PARCEL_DAMAGE,
      knockbackX: 130,
      knockbackY: 90,
    };
  }

  public update(dt: number): void {
    if (this.isExpired) return;
    this.vy += BALANCE.RIVAL_RANGED_PROJECTILE_GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += (this.vx >= 0 ? 1 : -1) * dt * 10;
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.expire();
  }

  public checkSolidCollision(worldWidth: number, solids: Rect[]): boolean {
    if (this.x + this.width < 0 || this.x > worldWidth) {
      this.expire();
      return true;
    }
    for (const solid of solids) {
      if (this.x < solid.x + solid.width && this.x + this.width > solid.x &&
          this.y < solid.y + solid.height && this.y + this.height > solid.y) {
        this.expire();
        return true;
      }
    }
    return false;
  }

  public expire(): void {
    this.isExpired = true;
    this.isAlive = false;
  }
}
