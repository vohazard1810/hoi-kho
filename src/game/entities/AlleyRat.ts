import { Entity } from './Entity';
import { CombatTarget } from '../systems/CombatSystem';
import { Hitbox, Hurtbox, Rect } from '../core/types';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';

export type RatState = 'IDLE' | 'APPROACH' | 'TELEGRAPH' | 'LEAP' | 'RECOVERY' | 'HURT' | 'KO';

export class AlleyRat extends Entity implements CombatTarget {
  public zoneId: 'A' | 'B' | 'C' | 'D' | 'E';
  public hp: number = 25;
  public maxHp: number = 25;
  public state: RatState = 'IDLE';
  public animTime: number = 0;
  public stateTimer: number = 0;
  public currentHitboxId: string = '';

  constructor(id: string, x: number, y: number, zoneId: 'A' | 'B' | 'C' | 'D' | 'E' = 'B') {
    super(id, x, y, 32, 18);
    this.zoneId = zoneId;
    this.facing = 'left';
  }

  public override getHurtbox(): Hurtbox {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 2,
      ownerId: this.id,
      isInvulnerable: this.state === 'KO',
    };
  }

  public getActiveHitbox(): Hitbox | null {
    if (this.state !== 'LEAP') return null;
    return {
      id: this.currentHitboxId,
      ownerId: this.id,
      x: this.facing === 'right' ? this.x + 12 : this.x - 8,
      y: this.y + 2,
      width: 24,
      height: 16,
      damage: 8,
      parcelDamage: 6,
      knockbackX: 140,
      knockbackY: 90,
    };
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
      this.stateTimer = 0.28;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * knockbackX;
      this.vy = -knockbackY;
    }
    return true;
  }

  public override update(dt: number): void {
    this.animTime += dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;

    if (!this.isGrounded) {
      this.vy = Math.min(650, this.vy + 720 * dt);
    }
  }

  public updateAI(
    dt: number,
    playerX: number,
    _playerY: number,
    droppedParcelPos: { x: number; y: number } | null,
    platforms: PlatformData[],
    groundSegments: Rect[],
    hazards: HazardData[]
  ): void {
    if (this.state === 'KO') return;

    if (this.state === 'HURT') {
      this.vx *= 0.88;
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
      }
      return;
    }

    if (this.state === 'TELEGRAPH') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'LEAP';
        this.stateTimer = 0.45;
        this.currentHitboxId = `hb_rat_${this.id}_${Date.now()}`;
        this.vx = (this.facing === 'right' ? 1 : -1) * 260;
        this.vy = -180;
        this.isGrounded = false;
      }
      return;
    }

    if (this.state === 'LEAP') {
      if (this.isGrounded && this.stateTimer < 0.3) {
        this.state = 'RECOVERY';
        this.stateTimer = 0.35;
        this.vx = 0;
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

    // Target selection: prioritize dropped parcel if close!
    const targetX = droppedParcelPos ? droppedParcelPos.x : playerX;
    const dx = targetX - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    this.facing = dx > 0 ? 'right' : 'left';

    if (dist <= 85) {
      // Leap attack windup
      this.state = 'TELEGRAPH';
      this.stateTimer = 0.32;
      this.vx = 0;
    } else if (dist <= 420) {
      this.state = 'APPROACH';
      const safeAhead = CollisionSystem.isSafeGroundAhead(this, this.facing, 12, platforms, groundSegments, hazards);
      if (safeAhead) {
        this.vx = (this.facing === 'right' ? 1 : -1) * 160;
      } else {
        this.vx = 0;
      }
    } else {
      this.state = 'IDLE';
      this.vx = 0;
    }
  }
}
