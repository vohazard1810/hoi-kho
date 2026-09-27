import { BALANCE } from '../config/balance';
import { Hitbox, Hurtbox, Rect, ThugStateType } from '../core/types';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';
import { Entity } from './Entity';
import { Player } from './Player';
import { PoiseGuard } from '../systems/PoiseGuard';

export class Thug extends Entity {
  public readonly poise = new PoiseGuard();
  public state: ThugStateType = 'IDLE';
  public hp: number = BALANCE.THUG_HP;
  public maxHp: number = BALANCE.THUG_HP;
  public animTime: number = 0;

  private stateTimer: number = 0;
  private chargeCooldownTimer: number = 2.0;
  private currentHitboxId: string = '';
  private previousAnimState: ThugStateType = 'IDLE';

  constructor(id: string, x: number, y: number) {
    super(id, x, y, BALANCE.THUG_WIDTH, BALANCE.THUG_HEIGHT);
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
    if (this.state === 'HEAVY_ACTIVE') {
      const hx = this.facing === 'right' ? this.x + BALANCE.THUG_HITBOX_OFFSET_X : this.x + this.width - BALANCE.THUG_HITBOX_OFFSET_X - BALANCE.THUG_HITBOX_W;
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: hx,
        y: this.y + BALANCE.THUG_HITBOX_OFFSET_Y,
        width: BALANCE.THUG_HITBOX_W,
        height: BALANCE.THUG_HITBOX_H,
        damage: BALANCE.THUG_HEAVY_DAMAGE,
        parcelDamage: BALANCE.THUG_PARCEL_DAMAGE,
        knockbackX: 300,
        knockbackY: 180,
      };
    }

    if (this.state === 'CHARGE_ACTIVE') {
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: this.x - 4,
        y: this.y + 10,
        width: this.width + 8,
        height: this.height - 10,
        damage: BALANCE.THUG_CHARGE_DAMAGE,
        parcelDamage: BALANCE.THUG_PARCEL_DAMAGE,
        knockbackX: 360,
        knockbackY: 220,
      };
    }

    return null;
  }

  public takeDamage(
    damage: number,
    knockbackX: number,
    knockbackY: number,
    sourceX: number
  ): boolean {
    if (this.state === 'KO') return false;

    this.hp = Math.max(0, this.hp - damage);

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.state = 'KO';
      this.vx = 0;
      return true;
    }

    // Only flinch if not mid-charge
    if (this.state !== 'CHARGE_ACTIVE' && this.poise.allowFlinch()) {
      this.state = 'HURT';
      this.stateTimer = BALANCE.THUG_HURT_DURATION;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * (knockbackX * 0.6);
      this.vy = -knockbackY * 0.4;
    }

    return true;
  }

  public updateAI(
    player: Player,
    dt: number,
    platforms: PlatformData[] = [],
    groundSegments: Rect[] = [],
    hazards: HazardData[] = []
  ): void {
    if (this.state === 'KO') return;

    this.poise.update(dt);

    if (this.chargeCooldownTimer > 0) {
      this.chargeCooldownTimer -= dt;
    }

    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    switch (this.state) {
      case 'IDLE':
      case 'CHASE':
        if (dist <= BALANCE.THUG_AGGRO_RANGE) {
          this.facing = dx > 0 ? 'right' : 'left';

          // Heavy Attack trigger at close range
          if (dist <= BALANCE.THUG_ATTACK_RANGE) {
            this.state = 'HEAVY_TELEGRAPH';
            this.stateTimer = BALANCE.THUG_TELEGRAPH_TIME;
            this.vx = 0;
          }
          // Charge / Rush Attack trigger at mid range (only if safe path ahead)
          else if (
            dist >= 140 &&
            dist <= BALANCE.THUG_CHARGE_RANGE &&
            this.chargeCooldownTimer <= 0 &&
            CollisionSystem.isSafeGroundAhead(this, this.facing, 40, platforms, groundSegments, hazards)
          ) {
            this.state = 'CHARGE_TELEGRAPH';
            this.stateTimer = 0.5;
            this.vx = 0;
          }
          // Chase movement with ledge probe
          else {
            const safeAhead = CollisionSystem.isSafeGroundAhead(
              this,
              this.facing,
              18,
              platforms,
              groundSegments,
              hazards
            );

            if (safeAhead) {
              this.state = 'CHASE';
              this.vx = (dx > 0 ? 1 : -1) * BALANCE.THUG_MOVE_SPEED;
            } else {
              this.state = 'IDLE';
              this.vx = 0;
            }
          }
        } else {
          this.state = 'IDLE';
          this.vx = 0;
        }
        break;

      case 'HEAVY_TELEGRAPH':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'HEAVY_ACTIVE';
          this.stateTimer = 0.18;
          this.currentHitboxId = `thug_heavy_${Date.now()}`;
          const safeAhead = CollisionSystem.isSafeGroundAhead(this, this.facing, 14, platforms, groundSegments, hazards);
          this.vx = safeAhead ? (this.facing === 'right' ? 1 : -1) * 80 : 0;
        }
        break;

      case 'HEAVY_ACTIVE':
        this.vx *= 0.8;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'HEAVY_RECOVERY';
          this.stateTimer = BALANCE.THUG_RECOVERY_TIME;
          this.vx = 0;
        }
        break;

      case 'HEAVY_RECOVERY':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
        }
        break;

      case 'CHARGE_TELEGRAPH':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'CHARGE_ACTIVE';
          this.stateTimer = BALANCE.THUG_CHARGE_DURATION;
          this.currentHitboxId = `thug_charge_${Date.now()}`;
          this.vx = (this.facing === 'right' ? 1 : -1) * BALANCE.THUG_CHARGE_SPEED;
        }
        break;

      case 'CHARGE_ACTIVE':
        // Check ledge mid-charge
        if (!CollisionSystem.isSafeGroundAhead(this, this.facing, 14, platforms, groundSegments, hazards)) {
          this.vx = 0;
        }

        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'CHARGE_RECOVERY';
          this.stateTimer = BALANCE.THUG_RECOVERY_TIME;
          this.chargeCooldownTimer = 4.0;
          this.vx = 0;
        }
        break;

      case 'CHARGE_RECOVERY':
        this.vx *= 0.8;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
        }
        break;

      case 'HURT':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.vx = 0;
        }
        break;
    }
  }

  public override update(dt: number): void {
    if (this.state !== this.previousAnimState) {
      this.animTime = 0;
      this.previousAnimState = this.state;
    } else {
      this.animTime += dt;
    }

    if (!this.isGrounded) {
      this.vy = Math.min(BALANCE.MAX_FALL_SPEED, this.vy + BALANCE.GRAVITY * dt);
    }
  }
}
