import { BALANCE } from '../config/balance';
import { BossDogStateType, Hitbox, Hurtbox, Rect } from '../core/types';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';
import { Entity } from './Entity';
import { Player } from './Player';

export class BossDog extends Entity {
  public state: BossDogStateType = 'IDLE';
  public animTime: number = 0;
  public hp: number = BALANCE.BOSS_DOG_HP;
  public maxHp: number = BALANCE.BOSS_DOG_HP;
  public phase: 1 | 2 = 1;

  private stateTimer: number = 0;
  private attackCooldownTimer: number = 0.5;
  private slamCooldownTimer: number = 3.0;
  private currentHitboxId: string = '';
  private lastVisualState: BossDogStateType = 'IDLE';
  private retaliationPending = false;
  private pressureHits = 0;
  private pressureTimer = 0;
  private counterWindowArmed = false;
  private aggressionStacks = 0;
  private telegraphCuePlayed = false;

  public onTelegraphCue?: () => void;

  public get pressureLevel(): number { return this.pressureHits; }
  public get antiSpamLevel(): number { return this.aggressionStacks; }
  public get isCounterExposed(): boolean { return this.counterWindowArmed && this.state.endsWith('_RECOVERY'); }
  public get isEyeGleamActive(): boolean {
    return (this.state === 'DASH_TELEGRAPH' || this.state === 'SLAM_TELEGRAPH') && this.stateTimer <= 0.25;
  }

  public get damageMultiplier(): number {
    if (this.state.endsWith('_TELEGRAPH') || this.state.endsWith('_ACTIVE')) return 0.3;
    if (this.state === 'HURT') return 0.35;
    // A normal evade must still create a fair punish window. Perfect Dodge is
    // the mastery bonus, not a requirement for dealing meaningful damage.
    if (this.state.endsWith('_RECOVERY')) return this.counterWindowArmed ? 1.5 : 1;
    return 1;
  }

  public registerPerfectDodge(): boolean {
    if (!this.state.endsWith('_ACTIVE') || this.counterWindowArmed) {
      return false;
    }
    this.counterWindowArmed = true;
    this.aggressionStacks = 0;
    this.pressureHits = 0;
    return true;
  }

  public resetBossCombatState(): void {
    this.hp = this.maxHp;
    this.phase = 1;
    this.isAlive = true;
    this.state = 'IDLE';
    this.vx = 0;
    this.vy = 0;
    this.stateTimer = 0;
    this.animTime = 0;
    this.attackCooldownTimer = 0.5;
    this.slamCooldownTimer = 3.0;
    this.retaliationPending = false;
    this.pressureHits = 0;
    this.pressureTimer = 0;
    this.counterWindowArmed = false;
    this.aggressionStacks = 0;
    this.telegraphCuePlayed = false;
  }

  private punishDamage(baseDamage: number): number {
    return Math.round(baseDamage * (1 + this.aggressionStacks * 0.2));
  }

  constructor(id: string, x: number, y: number) {
    super(id, x, y, BALANCE.BOSS_DOG_WIDTH, BALANCE.BOSS_DOG_HEIGHT);
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
    if (this.state === 'BITE_ACTIVE') {
      const hx = this.facing === 'right' ? this.x + this.width - 10 : this.x - 30;
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: hx,
        y: this.y + 10,
        width: 44,
        height: 36,
        damage: this.punishDamage(BALANCE.BOSS_DOG_BITE_DAMAGE),
        parcelDamage: BALANCE.BOSS_DOG_PARCEL_DAMAGE,
        knockbackX: 200,
        knockbackY: 140,
      };
    }

    if (this.state === 'DASH_ACTIVE') {
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: this.x - 6,
        y: this.y + 6,
        width: this.width + 12,
        height: this.height - 6,
        damage: this.punishDamage(BALANCE.BOSS_DOG_DASH_DAMAGE),
        parcelDamage: BALANCE.BOSS_DOG_PARCEL_DAMAGE,
        knockbackX: 340,
        knockbackY: 180,
      };
    }

    if (this.state === 'SLAM_ACTIVE') {
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: this.x - 20,
        y: this.y + 10,
        width: this.width + 40,
        height: this.height,
        damage: this.punishDamage(BALANCE.BOSS_DOG_SLAM_DAMAGE),
        parcelDamage: BALANCE.BOSS_DOG_PARCEL_DAMAGE,
        knockbackX: 380,
        knockbackY: 240,
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

    if (!Number.isFinite(damage) || damage <= 0) return false;
    this.hp = Math.max(0, this.hp - Math.max(1, Math.round(damage * this.damageMultiplier)));

    this.pressureHits++;
    this.pressureTimer = BALANCE.BOSS_DOG_PRESSURE_RESET;
    if (this.pressureHits >= 2) {
      this.aggressionStacks = Math.min(6, this.aggressionStacks + 1);
    }

    // Phase 2 transition check
    if (this.hp <= this.maxHp * BALANCE.BOSS_DOG_PHASE2_THRESHOLD) {
      this.phase = 2;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.state = 'KO';
      this.vx = 0;
      this.animTime = 0;
      this.lastVisualState = 'KO';
      return true;
    }

    // Boss has high poise - only slight flinch during normal states
    if (this.state === 'IDLE' || this.state === 'CHASE') {
      this.state = 'HURT';
      this.animTime = 0;
      this.lastVisualState = 'HURT';
      this.stateTimer = BALANCE.BOSS_DOG_HURT_DURATION;
      this.retaliationPending = true;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * (knockbackX * 0.4);
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

    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;
    if (this.slamCooldownTimer > 0) this.slamCooldownTimer -= dt;

    if (this.pressureTimer > 0) {
      this.pressureTimer -= dt;
      if (this.pressureTimer <= 0) {
        this.pressureHits = 0;
        if (this.aggressionStacks > 0) {
          this.aggressionStacks--;
          if (this.aggressionStacks > 0) {
            this.pressureTimer = 0.5; // Continue decaying 1 stack every 0.5s
          }
        }
      }
    }

    // Check Phase
    if (this.hp <= this.maxHp * BALANCE.BOSS_DOG_PHASE2_THRESHOLD) {
      this.phase = 2;
    }

    const moveSpeed = this.phase === 2 ? BALANCE.BOSS_DOG_PHASE2_SPEED : BALANCE.BOSS_DOG_MOVE_SPEED;
    const telegraphTime = this.phase === 2 ? BALANCE.BOSS_DOG_PHASE2_TELEGRAPH : BALANCE.BOSS_DOG_TELEGRAPH_TIME;
    const recoveryTime = this.phase === 2 ? BALANCE.BOSS_DOG_PHASE2_RECOVERY : BALANCE.BOSS_DOG_RECOVERY_TIME;

    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dist = Math.abs(dx);

    switch (this.state) {
      case 'IDLE':
      case 'CHASE':
        if (dist <= BALANCE.BOSS_DOG_AGGRO_RANGE) {
          this.facing = dx > 0 ? 'right' : 'left';

          if (this.attackCooldownTimer <= 0) {
            // Close Range -> Bite Attack
            if (dist <= BALANCE.BOSS_DOG_ATTACK_RANGE) {
              this.state = 'BITE_TELEGRAPH';
              this.stateTimer = telegraphTime;
              this.vx = 0;
              this.telegraphCuePlayed = false;
              return;
            }

            // Phase 2 Special -> Leap Slam
            if (this.phase === 2 && dist >= 120 && dist <= 280 && this.slamCooldownTimer <= 0) {
              this.state = 'SLAM_TELEGRAPH';
              this.stateTimer = telegraphTime * 1.2;
              this.vx = 0;
              this.telegraphCuePlayed = false;
              return;
            }

            // Mid Range -> Dash Pounce
            if (dist >= 100 && dist <= 320) {
              this.state = 'DASH_TELEGRAPH';
              this.stateTimer = telegraphTime;
              this.vx = 0;
              this.telegraphCuePlayed = false;
              return;
            }
          }

          // Chase Player with ground safety probe
          const safeAhead = CollisionSystem.isSafeGroundAhead(
            this,
            this.facing,
            16,
            platforms,
            groundSegments,
            hazards
          );

          if (safeAhead) {
            this.state = 'CHASE';
            this.vx = (dx > 0 ? 1 : -1) * moveSpeed;
          } else {
            this.state = 'IDLE';
            this.vx = 0;
          }
        } else {
          this.state = 'IDLE';
          this.vx = 0;
        }
        break;

      case 'BITE_TELEGRAPH':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'BITE_ACTIVE';
          this.stateTimer = 0.16;
          this.currentHitboxId = `boss_bite_${Date.now()}`;
          const safeAhead = CollisionSystem.isSafeGroundAhead(this, this.facing, 16, platforms, groundSegments, hazards);
          this.vx = safeAhead ? (this.facing === 'right' ? 1 : -1) * 120 : 0;
        }
        break;

      case 'BITE_ACTIVE':
        this.vx *= 0.8;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'BITE_RECOVERY';
          this.stateTimer = recoveryTime;
          this.vx = 0;
        }
        break;

      case 'BITE_RECOVERY':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.counterWindowArmed = false;
          this.attackCooldownTimer = this.phase === 2 ? 0.3 : 0.6;
        }
        break;

      case 'DASH_TELEGRAPH':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0.25 && !this.telegraphCuePlayed) {
          this.telegraphCuePlayed = true;
          this.onTelegraphCue?.();
        }
        if (this.stateTimer <= 0) {
          this.state = 'DASH_ACTIVE';
          this.stateTimer = BALANCE.BOSS_DOG_DASH_DURATION;
          this.currentHitboxId = `boss_dash_${Date.now()}`;
          this.vx = (this.facing === 'right' ? 1 : -1) * BALANCE.BOSS_DOG_DASH_SPEED;
        }
        break;

      case 'DASH_ACTIVE':
        if (!CollisionSystem.isSafeGroundAhead(this, this.facing, 16, platforms, groundSegments, hazards)) {
          this.vx = 0;
        }

        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'DASH_RECOVERY';
          this.stateTimer = recoveryTime;
          this.vx = 0;
        }
        break;

      case 'DASH_RECOVERY':
        this.vx *= 0.85;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.counterWindowArmed = false;
          this.attackCooldownTimer = this.phase === 2 ? 0.4 : 0.7;
        }
        break;

      case 'SLAM_TELEGRAPH':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0.25 && !this.telegraphCuePlayed) {
          this.telegraphCuePlayed = true;
          this.onTelegraphCue?.();
        }
        if (this.stateTimer <= 0) {
          this.state = 'SLAM_ACTIVE';
          this.stateTimer = 0.35;
          this.currentHitboxId = `boss_slam_${Date.now()}`;
          // Leap forward and down
          this.vx = (this.facing === 'right' ? 1 : -1) * 260;
          this.vy = -350;
        }
        break;

      case 'SLAM_ACTIVE':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'SLAM_RECOVERY';
          this.stateTimer = recoveryTime * 1.2;
          this.slamCooldownTimer = 4.5;
          this.vx = 0;
        }
        break;

      case 'SLAM_RECOVERY':
        this.vx = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'IDLE';
          this.counterWindowArmed = false;
          this.attackCooldownTimer = 0.5;
        }
        break;

      case 'HURT':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.vx = 0;
          if (this.retaliationPending && dist <= BALANCE.BOSS_DOG_AGGRO_RANGE) {
            this.facing = dx >= 0 ? 'right' : 'left';
            this.state = dist <= BALANCE.BOSS_DOG_ATTACK_RANGE ? 'BITE_TELEGRAPH' : 'DASH_TELEGRAPH';
            this.stateTimer = Math.max(0.55, telegraphTime);
          } else {
            this.state = 'IDLE';
          }
          this.retaliationPending = false;
        }
        break;
    }
  }

  public override update(dt: number): void {
    if (this.state !== this.lastVisualState) {
      this.animTime = 0;
      this.lastVisualState = this.state;
    } else {
      this.animTime += dt;
    }
    if (!this.isGrounded) {
      this.vy = Math.min(BALANCE.MAX_FALL_SPEED, this.vy + BALANCE.GRAVITY * dt);
    }
  }
}
