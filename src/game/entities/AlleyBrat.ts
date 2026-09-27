import { Entity } from './Entity';
import { CombatTarget } from '../systems/CombatSystem';
import { Hitbox, Hurtbox, Rect } from '../core/types';
import { PlatformData, HazardData } from '../config/stage1';

export type BratState = 'IDLE' | 'AIM' | 'SHOOT' | 'RECOVERY' | 'HURT' | 'KO';

export class AlleyBrat extends Entity implements CombatTarget {
  public zoneId: 'A' | 'B' | 'C' | 'D' | 'E';
  public hp: number = 20;
  public maxHp: number = 20;
  public state: BratState = 'IDLE';
  public animTime: number = 0;
  public stateTimer: number = 0;
  public shootCooldown: number = 2.5;
  public onShootWater: ((x: number, y: number, vx: number, vy: number) => void) | null = null;

  constructor(id: string, x: number, y: number, zoneId: 'A' | 'B' | 'C' | 'D' | 'E' = 'B') {
    super(id, x, y, 28, 48);
    this.zoneId = zoneId;
    this.facing = 'left';
  }

  public override getHurtbox(): Hurtbox {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4,
      ownerId: this.id,
      isInvulnerable: this.state === 'KO',
    };
  }

  public getActiveHitbox(): Hitbox | null {
    // Brat does not do contact damage; attacks via water gun projectiles
    return null;
  }

  public takeDamage(
    damage: number,
    _parcelDamage: number,
    knockbackX: number,
    knockbackY: number,
    sourceX: number
  ): boolean {
    if (this.state === 'KO') return false;

    this.hp = Math.max(0, this.hp - damage);
    if (this.hp <= 0) {
      this.state = 'KO';
      this.isAlive = false;
      this.vx = 0;
    } else {
      this.state = 'HURT';
      this.stateTimer = 0.3;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * knockbackX * 0.5;
      this.vy = -knockbackY * 0.5;
    }
    return true;
  }

  public override update(dt: number): void {
    this.animTime += dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    if (!this.isGrounded) {
      this.vy = Math.min(650, this.vy + 720 * dt);
    }
  }

  public updateAI(
    _dt: number,
    playerX: number,
    playerY: number,
    _platforms: PlatformData[],
    _groundSegments: Rect[],
    _hazards: HazardData[]
  ): void {
    if (this.state === 'KO') return;

    if (this.state === 'HURT') {
      this.vx *= 0.88;
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
      }
      return;
    }

    const dx = playerX - (this.x + this.width / 2);
    const dy = playerY - (this.y + this.height / 2);
    const dist = Math.hypot(dx, dy);

    this.facing = dx > 0 ? 'right' : 'left';

    if (this.state === 'AIM') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'SHOOT';
        this.stateTimer = 0.2;
        // Fire water bullet diagonally toward player
        const speed = 360;
        const norm = Math.max(1, dist);
        const vx = (dx / norm) * speed;
        const vy = (dy / norm) * speed;
        const muzzleX = this.facing === 'right' ? this.x + this.width + 6 : this.x - 6;
        const muzzleY = this.y + 18;
        this.onShootWater?.(muzzleX, muzzleY, vx, vy);
        this.shootCooldown = 3.2;
      }
      return;
    }

    if (this.state === 'SHOOT') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'RECOVERY';
        this.stateTimer = 0.4;
      }
      return;
    }

    if (this.state === 'RECOVERY') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
      }
      return;
    }

    // IDLE state: look for player in range to aim
    if (dist < 360 && dist > 40 && this.shootCooldown <= 0) {
      this.state = 'AIM';
      this.stateTimer = 0.65; // 0.65s aiming telegraph
      this.vx = 0;
    } else {
      this.vx = 0;
    }
  }
}
