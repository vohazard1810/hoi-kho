import { BALANCE } from '../config/balance';
import {
  ActionState,
  AttackComboStep,
  AttackPhase,
  FacingDirection,
  Hitbox,
  Hurtbox,
  LocomotionState,
  PlayerStateType,
  Rect,
} from '../core/types';
import { Input } from '../core/Input';
import { Entity } from './Entity';
import { Projectile } from './Projectile';
import { VisualStateMapper } from '../assets/VisualStateMapper';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export class Player extends Entity {
  // Decoupled locomotion and action states
  public locomotionState: LocomotionState = 'IDLE';
  public actionState: ActionState = 'NONE';

  public get state(): PlayerStateType {
    if (this.actionState !== 'NONE') {
      return this.actionState;
    }
    return this.locomotionState;
  }

  public set state(value: PlayerStateType) {
    if (value === 'IDLE' || value === 'RUN' || value === 'JUMP' || value === 'FALL') {
      this.locomotionState = value;
      this.actionState = 'NONE';
    } else {
      this.actionState = value;
    }
  }

  // Combat & Stats
  public hp: number = BALANCE.PLAYER_MAX_HP;
  public maxHp: number = BALANCE.PLAYER_MAX_HP;
  public momentum: number = 0;
  public isInvulnerable: boolean = false;

  // Timers
  private stateTimer: number = 0;
  private invulnerableTimer: number = 0;
  private dodgeCooldownTimer: number = 0;
  private projectileCooldownTimer: number = 0;

  public get dodgeCooldownRemaining(): number { return Math.max(0, this.dodgeCooldownTimer); }
  public get tapeCooldownRemaining(): number { return Math.max(0, this.projectileCooldownTimer); }

  // Jump physics helpers
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  private wasInAir: boolean = false;

  // Landing transition timer (visual only, 2 frames @ 10fps = 0.2s)
  public landingTimer: number = 0;

  // Melee combo state
  public comboStep: AttackComboStep = 'NONE';
  public attackPhase: AttackPhase = 'NONE';
  private comboBuffer: boolean = false;
  private attackPhaseTimer: number = 0;
  private currentHitboxId: string = '';

  // Visual Animation state tracking (with clean 0s reset on state change)
  public previousVisualState: string = 'idle';
  public currentVisualState: string = 'idle';
  public animTime: number = 0;

  // Projectile spawning callback
  public onShootProjectile: ((proj: Projectile) => void) | null = null;
  public onUltimateActivated: (() => void) | null = null;
  public onMeleeStarted: ((step: AttackComboStep) => void) | null = null;
  public onDodgeStarted: (() => void) | null = null;
  public onFootstep: (() => void) | null = null;
  public onJumpStarted: (() => void) | null = null;
  public onLanded: (() => void) | null = null;
  private footstepTimer: number = 0.1;
  private slipTimer: number = 0;

  constructor(x: number, y: number) {
    super('player', x, y, BALANCE.PLAYER_WIDTH, BALANCE.PLAYER_HEIGHT);
    this.facing = 'right';
  }

  public applySlip(duration: number = 0.5): void {
    this.slipTimer = Math.max(this.slipTimer, Math.min(0.5, duration));
  }

  public isSlipping(): boolean {
    return this.slipTimer > 0;
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.momentum = 0;
    this.isAlive = true;
    this.locomotionState = 'IDLE';
    this.actionState = 'NONE';
    this.comboStep = 'NONE';
    this.attackPhase = 'NONE';
    this.comboBuffer = false;
    this.isInvulnerable = false;
    this.stateTimer = 0;
    this.invulnerableTimer = 0;
    this.dodgeCooldownTimer = 0;
    this.projectileCooldownTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wasInAir = false;
    this.landingTimer = 0;
    this.slipTimer = 0;
    this.previousVisualState = 'idle';
    this.currentVisualState = 'idle';
    this.animTime = 0;
  }

  public override getHurtbox(): Hurtbox {
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 4,
      ownerId: this.id,
      isInvulnerable: this.isInvulnerable || this.actionState === 'DODGE' || this.actionState === 'KO',
    };
  }

  public getActiveHitbox(): Hitbox | null {
    if (this.actionState !== 'ATTACK' || this.attackPhase !== 'ACTIVE') {
      return null;
    }

    let damage = 0;
    let offset_x = 0;
    let offset_y = 0;
    let w = 0;
    let h = 0;
    let kbX = 140;
    let kbY = 100;

    switch (this.comboStep) {
      case 'J1':
        damage = BALANCE.J1_DAMAGE;
        offset_x = BALANCE.J1_HITBOX_OFFSET_X;
        offset_y = BALANCE.J1_HITBOX_OFFSET_Y;
        w = BALANCE.J1_HITBOX_W;
        h = BALANCE.J1_HITBOX_H;
        break;
      case 'J2':
        damage = BALANCE.J2_DAMAGE;
        offset_x = BALANCE.J2_HITBOX_OFFSET_X;
        offset_y = BALANCE.J2_HITBOX_OFFSET_Y;
        w = BALANCE.J2_HITBOX_W;
        h = BALANCE.J2_HITBOX_H;
        kbX = 180;
        break;
      case 'J3':
        damage = Math.round(BALANCE.J3_DAMAGE * UpgradeSystem.getInstance().getJ3DamageMultiplier());
        offset_x = BALANCE.J3_HITBOX_OFFSET_X;
        offset_y = BALANCE.J3_HITBOX_OFFSET_Y;
        w = BALANCE.J3_HITBOX_W * UpgradeSystem.getInstance().getJ3WidthMultiplier();
        h = BALANCE.J3_HITBOX_H;
        kbX = 260;
        kbY = 160;
        break;
      case 'ULTIMATE':
        damage = Math.round(BALANCE.ULTIMATE_DAMAGE * UpgradeSystem.getInstance().getUltimateDamageMultiplier());
        w = BALANCE.ULTIMATE_RADIUS * UpgradeSystem.getInstance().getUltimateRadiusMultiplier();
        h = w;
        offset_x = -w / 2 + this.width / 2;
        offset_y = -h / 2 + this.height / 2;
        kbX = 350;
        kbY = 220;
        break;
      default:
        return null;
    }

    const hx = this.facing === 'right' ? this.x + offset_x : this.x + this.width - offset_x - w;
    const hy = this.y + offset_y;

    return {
      id: this.currentHitboxId,
      ownerId: this.id,
      x: hx,
      y: hy,
      width: w,
      height: h,
      damage,
      parcelDamage: 0,
      knockbackX: kbX,
      knockbackY: kbY,
    };
  }

  public addMomentum(amount: number): void {
    this.momentum = Math.min(BALANCE.MOMENTUM_MAX, this.momentum + amount);
  }

  public heal(amount: number): boolean {
    if (this.hp <= 0 || this.actionState === 'KO' || !this.isAlive) {
      return false;
    }
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return true;
  }

  public takeDamage(
    damage: number,
    knockbackX: number,
    knockbackY: number,
    sourceX: number
  ): boolean {
    if (this.isInvulnerable || this.actionState === 'DODGE' || this.actionState === 'KO') {
      return false;
    }

    this.hp = Math.max(0, this.hp - damage);
    this.actionState = this.hp <= 0 ? 'KO' : 'HURT';
    this.stateTimer = BALANCE.HURT_DURATION;
    this.isInvulnerable = true;
    this.invulnerableTimer = BALANCE.INVULNERABLE_DURATION;

    // Reset combat combos and restart animation from frame 0
    this.comboStep = 'NONE';
    this.attackPhase = 'NONE';
    this.animTime = 0;

    // Apply knockback
    const dir = this.x >= sourceX ? 1 : -1;
    this.vx = dir * knockbackX;
    this.vy = -knockbackY;

    if (this.hp <= 0) {
      this.isAlive = false;
    }

    return true;
  }

  public handleInput(input: Input): void {
    if (this.actionState === 'KO' || this.actionState === 'HURT') return;

    // Jump buffer check (W or Space)
    if (input.isJustPressed('jump')) {
      this.jumpBufferTimer = BALANCE.JUMP_BUFFER;
    }

    // Dodge (L)
    if (input.isJustPressed('dodge') && this.dodgeCooldownTimer <= 0 && this.actionState !== 'DODGE') {
      this.startDodge();
      return;
    }

    // Projectile Tape (K)
    if (
      input.isJustPressed('projectile') &&
      this.projectileCooldownTimer <= 0 &&
      this.actionState !== 'DODGE' &&
      this.actionState !== 'ATTACK'
    ) {
      this.shootProjectile();
    }

    // Ultimate (Q)
    if (
      input.isJustPressed('ultimate') &&
      this.momentum >= BALANCE.ULTIMATE_COST &&
      this.actionState !== 'DODGE'
    ) {
      this.startUltimate();
      return;
    }

    // Melee combo (J)
    if (input.isJustPressed('attack')) {
      if (this.actionState === 'ATTACK') {
        // Buffer next combo step if in combo window
        this.comboBuffer = true;
      } else if (this.actionState !== 'DODGE') {
        if (!this.isGrounded) {
          this.startAirAttack();
        } else {
          this.startMeleeCombo('J1');
        }
      }
    }
  }

  private startAirAttack(): void {
    this.actionState = 'ATTACK';
    this.comboStep = 'J3';
    this.attackPhase = 'ACTIVE';
    this.comboBuffer = false;
    this.attackPhaseTimer = 0.4;
    this.currentHitboxId = `hb_air_${Date.now()}`;
    this.animTime = 0;
    this.vx = this.facing === 'right' ? 320 : -320;
    this.vy = Math.max(this.vy, 360);
    this.onMeleeStarted?.('J3');
  }

  private shootProjectile(): void {
    this.projectileCooldownTimer = BALANCE.TAPE_COOLDOWN;
    const spawnX = this.facing === 'right' ? this.x + this.width + 4 : this.x - BALANCE.TAPE_WIDTH - 4;
    const spawnY = this.y + 20;

    const projectile = new Projectile(spawnX, spawnY, this.facing, this.id);
    if (this.onShootProjectile) {
      this.onShootProjectile(projectile);
    }
  }

  private startDodge(): void {
    this.actionState = 'DODGE';
    this.stateTimer = BALANCE.DODGE_DURATION;
    this.dodgeCooldownTimer = BALANCE.DODGE_COOLDOWN * UpgradeSystem.getInstance().getDodgeCooldownMultiplier();
    this.comboStep = 'NONE';
    this.attackPhase = 'NONE';
    this.animTime = 0; // Reset animation to frame 0

    // Move in facing direction
    this.vx = this.facing === 'right' ? BALANCE.DODGE_SPEED : -BALANCE.DODGE_SPEED;
    this.vy = 0;
    this.onDodgeStarted?.();
  }

  private startUltimate(): void {
    this.momentum = Math.max(
      UpgradeSystem.getInstance().getUltimateMomentumReserve(),
      this.momentum - BALANCE.ULTIMATE_COST
    );
    this.actionState = 'ATTACK';
    this.comboStep = 'ULTIMATE';
    this.attackPhase = 'STARTUP';
    this.attackPhaseTimer = BALANCE.ULTIMATE_STARTUP;
    this.currentHitboxId = `hb_ult_${Date.now()}`;
    this.animTime = 0; // Reset animation to frame 0
    this.vx = 0;

    if (this.onUltimateActivated) {
      this.onUltimateActivated();
    }
  }

  private startMeleeCombo(step: AttackComboStep): void {
    this.actionState = 'ATTACK';
    this.comboStep = step;
    this.attackPhase = 'STARTUP';
    this.comboBuffer = false;
    this.currentHitboxId = `hb_${step}_${Date.now()}`;
    this.animTime = 0; // Reset animation to frame 0
    this.onMeleeStarted?.(step);

    // On ground with no active motion, give a small forward step
    if (this.isGrounded && Math.abs(this.vx) < 40) {
      const lunge = step === 'J3' ? 100 : 50;
      this.vx = this.facing === 'right' ? lunge : -lunge;
    }
    // In air, airborne vx and vy are completely preserved!

    switch (step) {
      case 'J1':
        this.attackPhaseTimer = BALANCE.J1_STARTUP;
        break;
      case 'J2':
        this.attackPhaseTimer = BALANCE.J2_STARTUP;
        break;
      case 'J3':
        this.attackPhaseTimer = BALANCE.J3_STARTUP;
        break;
    }
  }

  public override update(dt: number): void {
    // Timers update
    if (this.dodgeCooldownTimer > 0) this.dodgeCooldownTimer -= dt;
    if (this.projectileCooldownTimer > 0) this.projectileCooldownTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.slipTimer > 0) this.slipTimer = Math.max(0, this.slipTimer - dt);

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    if (this.isGrounded) {
      this.coyoteTimer = BALANCE.COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // Check Landing Transition (Transition from air/fall to ground)
    if (this.wasInAir && this.isGrounded) {
      if (this.actionState === 'ATTACK' && this.comboStep === 'J3') {
        this.attackPhase = 'RECOVERY';
        this.attackPhaseTimer = 0.15;
        this.landingTimer = 0.2;
        this.onLanded?.();
      } else if (this.locomotionState === 'FALL' && this.actionState === 'NONE') {
        this.landingTimer = 0.2; // 2 frames @ 10fps
        this.onLanded?.();
      }
    }
    if (this.landingTimer > 0) {
      this.landingTimer = Math.max(0, this.landingTimer - dt);
    }
    this.wasInAir = !this.isGrounded;

    // Update locomotion physics (gravity, jump execution, locomotion state)
    this.updateLocomotion(dt);

    // Visual State Computation & Animation Timer Management
    const isLanding = this.landingTimer > 0 && this.isGrounded && this.actionState === 'NONE';
    const nextVisualState = VisualStateMapper.mapPlayerState(
      this.locomotionState,
      this.actionState,
      this.comboStep,
      isLanding
    );

    if (nextVisualState !== this.previousVisualState) {
      this.animTime = 0; // Reset animation elapsed time on visual state change
      this.previousVisualState = nextVisualState;
    } else {
      this.animTime += dt;
    }
    this.currentVisualState = nextVisualState;

    // Update active action state
    switch (this.actionState) {
      case 'ATTACK':
        this.updateAttack(dt);
        break;
      case 'DODGE':
        this.updateDodge(dt);
        break;
      case 'HURT':
        this.updateHurt(dt);
        break;
      case 'KO':
        this.updateKO(dt);
        break;
      case 'NONE':
        break;
    }
  }

  private updateLocomotion(dt: number): void {
    // Jump execution (Coyote Time + Jump Buffer)
    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
      if (this.actionState !== 'HURT' && this.actionState !== 'KO') {
        this.vy = -BALANCE.PLAYER_JUMP_FORCE;
        this.isGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.locomotionState = 'JUMP';
        this.landingTimer = 0;
        this.onJumpStarted?.();
      }
    }

    // Gravity continues smoothly in all states
    if (!this.isGrounded) {
      this.vy = Math.min(BALANCE.MAX_FALL_SPEED, this.vy + BALANCE.GRAVITY * dt);
      this.locomotionState = this.vy >= 0 ? 'FALL' : 'JUMP';
    } else {
      if (Math.abs(this.vx) > 10) {
        this.locomotionState = 'RUN';
        if (this.actionState === 'NONE') {
          this.footstepTimer -= dt;
          if (this.footstepTimer <= 0) {
            this.footstepTimer = 0.32;
            this.onFootstep?.();
          }
        }
      } else {
        this.locomotionState = 'IDLE';
        this.footstepTimer = 0.1;
      }
    }
  }

  public applyMovementInput(moveAxis: number, dt: number): void {
    if (this.actionState === 'DODGE' || this.actionState === 'HURT' || this.actionState === 'KO') {
      return;
    }

    const slipFactor = this.slipTimer > 0 ? 0.75 : 1.0;
    if (moveAxis !== 0) {
      this.facing = moveAxis > 0 ? 'right' : 'left';
      const targetVx = moveAxis * BALANCE.PLAYER_MOVE_SPEED;
      this.vx += (targetVx - this.vx) * Math.min(1, (BALANCE.PLAYER_ACCELERATION * slipFactor * dt) / BALANCE.PLAYER_MOVE_SPEED);
    } else {
      // Decelerate
      const decel = (BALANCE.PLAYER_DECELERATION * slipFactor) * dt;
      if (Math.abs(this.vx) <= decel) {
        this.vx = 0;
      } else {
        this.vx -= Math.sign(this.vx) * decel;
      }
    }
  }

  private updateAttack(dt: number): void {
    this.attackPhaseTimer -= dt;

    if (this.attackPhaseTimer <= 0) {
      if (this.attackPhase === 'STARTUP') {
        this.attackPhase = 'ACTIVE';
        if (this.comboStep === 'J1') this.attackPhaseTimer = BALANCE.J1_ACTIVE;
        else if (this.comboStep === 'J2') this.attackPhaseTimer = BALANCE.J2_ACTIVE;
        else if (this.comboStep === 'J3') this.attackPhaseTimer = BALANCE.J3_ACTIVE;
        else if (this.comboStep === 'ULTIMATE') this.attackPhaseTimer = BALANCE.ULTIMATE_ACTIVE;
      } else if (this.attackPhase === 'ACTIVE') {
        this.attackPhase = 'RECOVERY';
        if (this.comboStep === 'J1') this.attackPhaseTimer = BALANCE.J1_RECOVERY;
        else if (this.comboStep === 'J2') this.attackPhaseTimer = BALANCE.J2_RECOVERY;
        else if (this.comboStep === 'J3') this.attackPhaseTimer = BALANCE.J3_RECOVERY;
        else if (this.comboStep === 'ULTIMATE') this.attackPhaseTimer = BALANCE.ULTIMATE_RECOVERY;
      } else if (this.attackPhase === 'RECOVERY') {
        // Check if combo can proceed to next step
        if (this.comboBuffer) {
          if (this.comboStep === 'J1') {
            this.startMeleeCombo('J2');
            return;
          } else if (this.comboStep === 'J2') {
            this.startMeleeCombo('J3');
            return;
          }
        }

        // Return to normal action state - locomotion state is maintained by updateLocomotion
        this.actionState = 'NONE';
        this.comboStep = 'NONE';
        this.attackPhase = 'NONE';
        this.currentHitboxId = '';
      }
    }
  }

  private updateDodge(dt: number): void {
    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      this.actionState = 'NONE';
      this.vx = 0;
    }
  }

  private updateHurt(dt: number): void {
    this.stateTimer -= dt;
    this.vx *= 0.9;
    if (this.stateTimer <= 0) {
      this.actionState = 'NONE';
    }
  }

  private updateKO(dt: number): void {
    this.vx = 0;
  }
}
