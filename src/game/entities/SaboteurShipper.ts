import { Entity } from './Entity';
import { CombatTarget } from '../systems/CombatSystem';
import { Hitbox, Hurtbox, Rect } from '../core/types';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';
import { PoiseGuard } from '../systems/PoiseGuard';

export type SaboteurState = 'IDLE' | 'APPROACH' | 'THROW_PEEL' | 'SWEEP_KICK' | 'RECOVERY' | 'HURT' | 'KO';

export class SaboteurShipper extends Entity implements CombatTarget {
  public zoneId: 'A' | 'B' | 'C' | 'D' | 'E';
  public readonly poise = new PoiseGuard();
  public hp: number = 55;
  public maxHp: number = 55;
  public state: SaboteurState = 'IDLE';
  public animTime: number = 0;
  public stateTimer: number = 0;
  public peelCooldown: number = 2.0;
  public onThrowBananaPeel: ((x: number, y: number, vx: number, vy: number) => void) | null = null;
  private currentHitboxId: string = '';

  constructor(id: string, x: number, y: number, zoneId: 'A' | 'B' | 'C' | 'D' | 'E' = 'C') {
    super(id, x, y, 36, 60);
    this.zoneId = zoneId;
    this.facing = 'left';
  }

  public override getHurtbox(): Hurtbox {
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 4,
      ownerId: this.id,
      isInvulnerable: this.state === 'KO',
    };
  }

  public getActiveHitbox(): Hitbox | null {
    if (this.state !== 'SWEEP_KICK') return null;
    return {
      id: this.currentHitboxId,
      ownerId: this.id,
      x: this.facing === 'right' ? this.x + 16 : this.x - 22,
      y: this.y + this.height - 24,
      width: 38,
      height: 22,
      damage: 14,
      parcelDamage: 8,
      knockbackX: 280,
      knockbackY: 150,
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
    } else if (this.poise.allowFlinch()) {
      this.state = 'HURT';
      this.stateTimer = 0.35;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * knockbackX;
      this.vy = -knockbackY;
    }
    return true;
  }

  public override update(dt: number): void {
    this.poise.update(dt);
    this.animTime += dt;
    if (this.stateTimer > 0) this.stateTimer -= dt;
    if (this.peelCooldown > 0) this.peelCooldown -= dt;

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

    if (this.state === 'THROW_PEEL') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        const throwDir = this.facing === 'right' ? 1 : -1;
        this.onThrowBananaPeel?.(
          this.x + this.width / 2 + throwDir * 20,
          this.y + 15,
          throwDir * 220,
          -160
        );
        this.state = 'RECOVERY';
        this.stateTimer = 0.4;
      }
      return;
    }

    if (this.state === 'SWEEP_KICK') {
      if (this.stateTimer <= 0) {
        this.state = 'RECOVERY';
        this.stateTimer = 0.45;
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

    // Target: dropped parcel if on floor, else player
    const targetX = droppedParcelPos ? droppedParcelPos.x : playerX;
    const dx = targetX - (this.x + this.width / 2);
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 'right' : 'left';

    // Ranged peel throw check
    if (dist > 150 && dist < 380 && this.peelCooldown <= 0) {
      this.state = 'THROW_PEEL';
      this.stateTimer = 0.35;
      this.peelCooldown = 4.8;
      this.vx = 0;
      return;
    }

    if (dist <= 75) {
      // Low sweep kick
      this.state = 'SWEEP_KICK';
      this.stateTimer = 0.38;
      this.currentHitboxId = `hb_saboteur_${this.id}_${Date.now()}`;
      this.vx = (this.facing === 'right' ? 1 : -1) * 90;
    } else if (dist <= 480) {
      this.state = 'APPROACH';
      const safeAhead = CollisionSystem.isSafeGroundAhead(this, this.facing, 16, platforms, groundSegments, hazards);
      if (safeAhead) {
        this.vx = (this.facing === 'right' ? 1 : -1) * 135;
      } else {
        this.vx = 0;
      }
    } else {
      this.state = 'IDLE';
      this.vx = 0;
    }
  }
}
