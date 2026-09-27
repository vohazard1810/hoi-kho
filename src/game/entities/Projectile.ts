import { BALANCE } from '../config/balance';
import { Hitbox, Rect } from '../core/types';
import { Entity } from './Entity';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export class Projectile extends Entity {
  public damage: number = BALANCE.TAPE_DAMAGE;
  public lifetime: number = BALANCE.TAPE_LIFETIME;
  public ownerId: string;
  public isExpired: boolean = false;
  private hitboxId: string;
  public readonly appliesStickySlow: boolean;
  public readonly visualUpgrade: 'BASE' | 'STICKY' | 'RANGE' | 'IMPACT';

  constructor(x: number, y: number, direction: 'left' | 'right', ownerId: string) {
    super(`proj_${Date.now()}_${Math.random()}`, x, y, BALANCE.TAPE_WIDTH, BALANCE.TAPE_HEIGHT);
    this.facing = direction;
    this.ownerId = ownerId;
    const upgrades = UpgradeSystem.getInstance();
    this.vx = (direction === 'right' ? BALANCE.TAPE_SPEED : -BALANCE.TAPE_SPEED) * upgrades.getTapeSpeedMultiplier();
    this.vy = 0;
    this.lifetime *= upgrades.getTapeLifetimeMultiplier();
    this.damage = Math.round(this.damage * upgrades.getTapeDamageMultiplier());
    this.hitboxId = `hb_${this.id}`;
    this.appliesStickySlow = upgrades.has('sticky_tape');
    this.visualUpgrade = upgrades.isEquipped('tape_range')
      ? 'RANGE'
      : upgrades.isEquipped('tape_impact')
      ? 'IMPACT'
      : this.appliesStickySlow
      ? 'STICKY'
      : 'BASE';
  }

  public getHitbox(): Hitbox | null {
    if (this.isExpired) return null;
    return {
      id: this.hitboxId,
      ownerId: this.ownerId,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      damage: this.damage,
      parcelDamage: 0,
      knockbackX: 120,
      knockbackY: 50,
    };
  }

  public update(dt: number): void {
    if (this.isExpired) return;

    this.x += this.vx * dt;
    this.lifetime -= dt;

    if (this.lifetime <= 0) {
      this.isExpired = true;
      this.isAlive = false;
    }
  }

  public checkSolidCollision(worldWidth: number, platforms: Rect[]): boolean {
    if (this.x < 0 || this.x + this.width > worldWidth) {
      this.isExpired = true;
      this.isAlive = false;
      return true;
    }

    for (const plat of platforms) {
      if (
        this.x < plat.x + plat.width &&
        this.x + this.width > plat.x &&
        this.y < plat.y + plat.height &&
        this.y + this.height > plat.y
      ) {
        this.isExpired = true;
        this.isAlive = false;
        return true;
      }
    }

    return false;
  }
}
