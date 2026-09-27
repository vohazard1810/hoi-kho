import { BALANCE } from '../config/balance';
import { Hitbox, Hurtbox, Rect, RivalStateType } from '../core/types';
import { CombatTarget } from '../systems/CombatSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';
import { Entity } from './Entity';
import { PoiseGuard } from '../systems/PoiseGuard';

export class Rival extends Entity implements CombatTarget {
  public readonly poise = new PoiseGuard();
  public hp: number = BALANCE.RIVAL_HP;
  public maxHp: number = BALANCE.RIVAL_HP;
  public state: RivalStateType = 'IDLE';
  public animTime: number = 0;
  public attackMode: 'MELEE' | 'RANGED' = 'MELEE';
  public onRangedThrow: ((ownerId: string, x: number, y: number, targetX: number, targetY: number) => void) | null = null;
  public onDriveByCue: (() => void) | null = null;
  public driveByPhase: 'WARNING' | 'ACTIVE' | 'DISMOUNTED' = 'DISMOUNTED';
  public wreckX: number | null = null;

  private stateTimer: number = 0;
  private currentHitboxId: string = '';
  private previousAnimState: RivalStateType = 'IDLE';
  private rangedCooldown: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private driveByTimer = 0.65;
  private driveByCuePlayed = false;
  private driveByHitboxId = '';

  constructor(id: string, x: number, y: number) {
    super(id, x, y, BALANCE.RIVAL_WIDTH, BALANCE.RIVAL_HEIGHT);
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
    if (this.driveByPhase === 'ACTIVE') return {
      id: this.driveByHitboxId, ownerId: this.id, x: this.x - 54, y: this.y + 8,
      width: this.width + 108, height: this.height - 8, damage: 14, parcelDamage: 6,
      knockbackX: 320, knockbackY: 150,
    };
    if (this.state !== 'ATTACK_ACTIVE' || this.attackMode === 'RANGED') return null;

    const hitX =
      this.facing === 'right'
        ? this.x + this.width - 10 + BALANCE.RIVAL_HITBOX_OFFSET_X - BALANCE.RIVAL_HITBOX_W / 2
        : this.x + 10 - BALANCE.RIVAL_HITBOX_OFFSET_X - BALANCE.RIVAL_HITBOX_W / 2;

    return {
      id: this.currentHitboxId,
      ownerId: this.id,
      x: hitX,
      y: this.y + BALANCE.RIVAL_HITBOX_OFFSET_Y,
      width: BALANCE.RIVAL_HITBOX_W,
      height: BALANCE.RIVAL_HITBOX_H,
      damage: BALANCE.RIVAL_DAMAGE,
      parcelDamage: BALANCE.RIVAL_PARCEL_DAMAGE,
      knockbackX: 200,
      knockbackY: 120,
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
    if (this.driveByPhase !== 'DISMOUNTED') return false;

    this.hp = Math.max(0, this.hp - damage);

    if (this.hp <= 0) {
      this.state = 'KO';
      this.isAlive = false;
      this.vx = 0;
    } else if (this.poise.allowFlinch()) {
      this.state = 'HURT';
      this.stateTimer = BALANCE.RIVAL_HURT_DURATION;
      const dir = this.x >= sourceX ? 1 : -1;
      this.vx = dir * knockbackX;
      this.vy = -knockbackY;
    }

    return true;
  }

  public override update(dt: number): void {
    this.poise.update(dt);
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
    if (this.driveByPhase === 'WARNING') {
      this.vx = 0; this.facing = 'left'; this.driveByTimer -= dt;
      if (!this.driveByCuePlayed) { this.driveByCuePlayed = true; this.onDriveByCue?.(); }
      if (this.driveByTimer <= 0) {
        this.driveByPhase = 'ACTIVE'; this.driveByTimer = 1.05;
        this.driveByHitboxId = `hb_rival_driveby_${this.id}_${Date.now()}`;
      }
      return;
    }
    if (this.driveByPhase === 'ACTIVE') {
      this.vx = -560; this.facing = 'left'; this.driveByTimer -= dt;
      if (this.driveByTimer <= 0 || this.x < playerX - 230) this.forceDismount();
      return;
    }

    this.stateTimer -= dt;
    this.rangedCooldown = Math.max(0, this.rangedCooldown - dt);
    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    const verticalGap = Math.abs(playerY - this.y);
    this.targetX = playerX;
    this.targetY = playerY;

    switch (this.state) {
      case 'IDLE':
        this.vx = 0;
        if (dist < BALANCE.RIVAL_AGGRO_RANGE) {
          this.facing = dx > 0 ? 'right' : 'left';
          this.state = 'APPROACH';
        }
        break;

      case 'APPROACH':
        this.facing = dx > 0 ? 'right' : 'left';
        if (
          verticalGap >= BALANCE.RIVAL_RANGED_VERTICAL_GAP &&
          dist >= BALANCE.RIVAL_RANGED_MIN_DISTANCE &&
          dist <= BALANCE.RIVAL_AGGRO_RANGE &&
          this.rangedCooldown <= 0
        ) {
          this.attackMode = 'RANGED';
          this.state = 'ATTACK_STARTUP';
          this.stateTimer = BALANCE.RIVAL_RANGED_TELEGRAPH;
          this.vx = 0;
        } else if (verticalGap < BALANCE.RIVAL_RANGED_VERTICAL_GAP && dist <= BALANCE.RIVAL_ATTACK_RANGE) {
          this.attackMode = 'MELEE';
          this.state = 'ATTACK_STARTUP';
          this.stateTimer = BALANCE.RIVAL_ATTACK_STARTUP;
          this.vx = 0;
        } else if (dist > BALANCE.RIVAL_AGGRO_RANGE * 1.4) {
          this.state = 'IDLE';
          this.vx = 0;
        } else {
          // Check ground ahead
          const safeAhead = CollisionSystem.isSafeGroundAhead(
            this,
            this.facing,
            14,
            platforms,
            groundSegments,
            hazards
          );

          if (safeAhead) {
            this.vx = this.facing === 'right' ? BALANCE.RIVAL_MOVE_SPEED : -BALANCE.RIVAL_MOVE_SPEED;
          } else {
            this.vx = 0;
          }
        }
        break;

      case 'ATTACK_STARTUP':
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.state = 'ATTACK_ACTIVE';
          this.stateTimer = BALANCE.RIVAL_ATTACK_ACTIVE;
          this.currentHitboxId = `hb_rival_${this.id}_${Date.now()}`;

          if (this.attackMode === 'RANGED') {
            this.rangedCooldown = BALANCE.RIVAL_RANGED_COOLDOWN;
            this.onRangedThrow?.(
              this.id,
              this.x + this.width / 2,
              this.y + 18,
              this.targetX,
              this.targetY + 20
            );
            this.vx = 0;
            break;
          }

          const safeAhead = CollisionSystem.isSafeGroundAhead(
            this,
            this.facing,
            16,
            platforms,
            groundSegments,
            hazards
          );

          // Small lunge only if safe
          this.vx = safeAhead ? (this.facing === 'right' ? 80 : -80) : 0;
        }
        break;

      case 'ATTACK_ACTIVE':
        this.vx *= 0.85;
        if (this.stateTimer <= 0) {
          this.state = 'ATTACK_RECOVERY';
          this.stateTimer = BALANCE.RIVAL_ATTACK_RECOVERY;
          this.vx = 0;
        }
        break;

      case 'ATTACK_RECOVERY':
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
  public forceDismount(): void {
    if (this.driveByPhase === 'DISMOUNTED') return;
    this.driveByPhase = 'DISMOUNTED'; this.wreckX = this.x; this.vx = 0; this.state = 'IDLE'; this.stateTimer = 0.3;
  }
  public startDriveBy(): void {
    this.driveByPhase = 'WARNING'; this.driveByTimer = 0.65; this.driveByCuePlayed = false;
    this.driveByHitboxId = ''; this.wreckX = null; this.state = 'IDLE';
  }
}
