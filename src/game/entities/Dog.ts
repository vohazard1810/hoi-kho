import { BALANCE } from '../config/balance';
import { DogStateType, Hitbox, Hurtbox, Rect } from '../core/types';
import { CombatTarget } from '../systems/CombatSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';
import { Entity } from './Entity';
import { PoiseGuard } from '../systems/PoiseGuard';

export class Dog extends Entity implements CombatTarget {
  public readonly poise = new PoiseGuard();
  public hp: number = BALANCE.DOG_HP;
  public maxHp: number = BALANCE.DOG_HP;
  public state: DogStateType = 'IDLE';
  public animTime: number = 0;

  private stateTimer: number = 0;
  private currentHitboxId: string = '';
  private previousVisualState: string = 'idle';

  constructor(id: string, x: number, y: number) {
    super(id, x, y, BALANCE.DOG_WIDTH, BALANCE.DOG_HEIGHT);
    this.facing = 'left';
  }

  public override getHurtbox(): Hurtbox {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      ownerId: this.id,
      isInvulnerable: this.state === 'KO',
    };
  }

  public getActiveHitbox(): Hitbox | null {
    if (this.state !== 'DASH') return null;

    return {
      id: this.currentHitboxId,
      ownerId: this.id,
      x: this.facing === 'right' ? this.x + 10 : this.x - 14,
      y: this.y + 4,
      width: this.width + 4,
      height: this.height - 8,
      damage: BALANCE.DOG_DASH_DAMAGE,
      parcelDamage: BALANCE.DOG_PARCEL_DAMAGE,
      knockbackX: 180,
      knockbackY: 100,
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
      this.stateTimer = BALANCE.DOG_HURT_DURATION;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * knockbackX;
      this.vy = -knockbackY;
    }

    return true;
  }

  public override update(dt: number): void {
    this.poise.update(dt);
    const visualState = this.getVisualState();
    if (visualState !== this.previousVisualState) {
      this.animTime = 0;
      this.previousVisualState = visualState;
    } else {
      this.animTime += dt;
    }

    // Basic gravity
    if (!this.isGrounded) {
      this.vy = Math.min(BALANCE.MAX_FALL_SPEED, this.vy + BALANCE.GRAVITY * dt);
    }
  }

  private getVisualState(): string {
    switch (this.state) {
      case 'APPROACH': return 'approach';
      case 'TELEGRAPH': return 'telegraph';
      case 'DASH': return 'dash';
      case 'HURT': return 'hurt';
      case 'KO': return 'ko';
      default: return 'idle';
    }
  }

  public updateAI(
    dt: number,
    playerX: number,
    playerY: number,
    platforms: PlatformData[] = [],
    groundSegments: Rect[] = [],
    hazards: HazardData[] = []
  ): void {
    if (this.state === 'KO') {
      this.vx = 0;
      return;
    }

    this.stateTimer -= dt;

    const dx = playerX - this.x;
    const dist = Math.abs(dx);

    switch (this.state) {
      case 'IDLE':
        this.vx = 0;
        if (dist < BALANCE.DOG_AGGRO_RANGE) {
          this.facing = dx > 0 ? 'right' : 'left';
          this.state = 'APPROACH';
        }
        break;

      case 'APPROACH':
        this.facing = dx > 0 ? 'right' : 'left';
        if (dist <= BALANCE.DOG_ATTACK_RANGE) {
          // Enter telegraph phase so player can read attack
          this.state = 'TELEGRAPH';
          this.stateTimer = BALANCE.DOG_TELEGRAPH_TIME;
          this.vx = 0;
        } else if (dist > BALANCE.DOG_AGGRO_RANGE * 1.5) {
          this.state = 'IDLE';
          this.vx = 0;
        } else {
          // Ledge and hazard safety check
          const safeAhead = CollisionSystem.isSafeGroundAhead(
            this,
            this.facing,
            14,
            platforms,
            groundSegments,
            hazards
          );

          if (safeAhead) {
            this.vx = this.facing === 'right' ? BALANCE.DOG_MOVE_SPEED : -BALANCE.DOG_MOVE_SPEED;
          } else {
            // Stop at platform ledge / hazard edge
            this.vx = 0;
          }
        }
        break;

      case 'TELEGRAPH':
        // Windup/warning before lunge
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.state = 'DASH';
          this.stateTimer = BALANCE.DOG_DASH_DURATION;
          this.currentHitboxId = `hb_dog_${this.id}_${Date.now()}`;

          // Check if dash direction has safe ground
          const safeAhead = CollisionSystem.isSafeGroundAhead(
            this,
            this.facing,
            24,
            platforms,
            groundSegments,
            hazards
          );

          if (safeAhead) {
            this.vx = this.facing === 'right' ? BALANCE.DOG_DASH_SPEED : -BALANCE.DOG_DASH_SPEED;
          } else {
            // Short bite in place if at a cliff edge
            this.vx = 0;
          }
        }
        break;

      case 'DASH':
        // If mid-dash we encounter a ledge, stop horizontal velocity
        if (!CollisionSystem.isSafeGroundAhead(this, this.facing, 10, platforms, groundSegments, hazards)) {
          this.vx = 0;
        }

        if (this.stateTimer <= 0) {
          this.state = 'RECOVERY';
          this.stateTimer = BALANCE.DOG_RECOVERY_TIME;
          this.vx = 0;
        }
        break;

      case 'RECOVERY':
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
        }
        break;

      case 'HURT':
        this.vx *= 0.85;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
        }
        break;
    }
  }
}
