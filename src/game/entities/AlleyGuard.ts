import { Entity } from './Entity';
import { CombatTarget } from '../systems/CombatSystem';
import { Hitbox, Hurtbox, Rect } from '../core/types';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlatformData, HazardData } from '../config/stage1';
import { PoiseGuard } from '../systems/PoiseGuard';

export type GuardState =
  | 'IDLE'
  | 'APPROACH'
  | 'GUARD_STANCE'
  | 'MEGAPHONE_WINDUP'
  | 'MEGAPHONE_BLAST'
  | 'BATON_SWING'
  | 'RECOVERY'
  | 'HURT'
  | 'KO';

export class AlleyGuard extends Entity implements CombatTarget {
  public zoneId: 'A' | 'B' | 'C' | 'D' | 'E';
  public readonly poise = new PoiseGuard();
  public hp: number = 85;
  public maxHp: number = 85;
  public state: GuardState = 'IDLE';
  public animTime: number = 0;
  public stateTimer: number = 0;
  public megaphoneCooldown: number = 3.0;
  public isShieldBroken: boolean = false;
  private currentHitboxId: string = '';

  constructor(id: string, x: number, y: number, zoneId: 'A' | 'B' | 'C' | 'D' | 'E' = 'D') {
    super(id, x, y, 40, 68);
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
    if (this.state === 'MEGAPHONE_BLAST') {
      const hx = this.facing === 'right' ? this.x + 20 : this.x - 140;
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: hx,
        y: this.y + 8,
        width: 140,
        height: 48,
        damage: 16,
        parcelDamage: 10,
        knockbackX: 360,
        knockbackY: 180,
      };
    }

    if (this.state === 'BATON_SWING') {
      const hx = this.facing === 'right' ? this.x + 22 : this.x - 30;
      return {
        id: this.currentHitboxId,
        ownerId: this.id,
        x: hx,
        y: this.y + 14,
        width: 44,
        height: 38,
        damage: 20,
        parcelDamage: 8,
        knockbackX: 300,
        knockbackY: 160,
      };
    }

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

    // Check frontal guard shield: if facing attacker and in GUARD_STANCE, frontal hit blocked unless broken!
    const isFrontalHit = (this.facing === 'left' && sourceX < this.x + this.width / 2) ||
                         (this.facing === 'right' && sourceX > this.x + this.width / 2);

    if (this.state === 'GUARD_STANCE' && isFrontalHit && !this.isShieldBroken && damage < 35) {
      // Shield block! Small chip damage only
      this.hp = Math.max(0, this.hp - Math.round(damage * 0.15));
      this.vx = (this.facing === 'right' ? -1 : 1) * 40;
      return true; // Return true so attack is resolved in hitHistory and does not multihit
    }

    // Heavy hit (Air Slam 35 or Ultimate) shatters guard stance
    if (damage >= 35) {
      this.isShieldBroken = true;
    }

    this.hp = Math.max(0, this.hp - damage);
    if (this.hp <= 0) {
      this.state = 'KO';
      this.isAlive = false;
      this.vx = 0;
    } else if (this.poise.allowFlinch()) {
      this.state = 'HURT';
      this.stateTimer = 0.38;
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
    if (this.megaphoneCooldown > 0) this.megaphoneCooldown -= dt;

    if (!this.isGrounded) {
      this.vy = Math.min(650, this.vy + 720 * dt);
    }
  }

  public updateAI(
    dt: number,
    playerX: number,
    _playerY: number,
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

    if (this.state === 'MEGAPHONE_WINDUP') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'MEGAPHONE_BLAST';
        this.stateTimer = 0.45;
        this.currentHitboxId = `hb_guard_megaphone_${this.id}_${Date.now()}`;
      }
      return;
    }

    if (this.state === 'MEGAPHONE_BLAST') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'RECOVERY';
        this.stateTimer = 0.55;
      }
      return;
    }

    if (this.state === 'BATON_SWING') {
      if (this.stateTimer <= 0) {
        this.state = 'RECOVERY';
        this.stateTimer = 0.45;
        this.vx = 0;
      }
      return;
    }

    if (this.state === 'GUARD_STANCE') {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = 'IDLE';
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

    const dx = playerX - (this.x + this.width / 2);
    const dist = Math.abs(dx);
    this.facing = dx > 0 ? 'right' : 'left';

    // Megaphone sonic shout at mid range
    if (dist > 90 && dist < 240 && this.megaphoneCooldown <= 0) {
      this.state = 'MEGAPHONE_WINDUP';
      this.stateTimer = 0.45;
      this.megaphoneCooldown = 5.2;
      this.vx = 0;
      return;
    }

    // Baton swing at close range
    if (dist <= 75) {
      if (Math.random() < 0.4 && !this.isShieldBroken) {
        // Raise guard shield
        this.state = 'GUARD_STANCE';
        this.stateTimer = 1.2;
        this.vx = 0;
      } else {
        this.state = 'BATON_SWING';
        this.stateTimer = 0.38;
        this.currentHitboxId = `hb_guard_baton_${this.id}_${Date.now()}`;
        this.vx = (this.facing === 'right' ? 1 : -1) * 60;
      }
    } else if (dist <= 500) {
      this.state = 'APPROACH';
      const safeAhead = CollisionSystem.isSafeGroundAhead(this, this.facing, 18, platforms, groundSegments, hazards);
      if (safeAhead) {
        this.vx = (this.facing === 'right' ? 1 : -1) * 110;
      } else {
        this.vx = 0;
      }
    } else {
      this.state = 'IDLE';
      this.vx = 0;
    }
  }
}
