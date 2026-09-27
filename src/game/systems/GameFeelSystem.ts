import { AttackComboStep } from '../core/types';
import { AudioSink, meleeHitSfx } from '../audio/AudioManager';

export interface ImpactParticle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; }
export interface UltimatePulse { x: number; y: number; life: number; maxLife: number; maxRadius: number; }
export interface ParcelShieldPulse { x: number; y: number; life: number; maxLife: number; }
export interface ComicHitText { id: string; text: string; x: number; y: number; vy: number; life: number; maxLife: number; color: string; size: number; }
export interface GameFeelSnapshot {
  particles: readonly ImpactParticle[];
  ultimatePulses: readonly UltimatePulse[];
  parcelShieldPulses: readonly ParcelShieldPulse[];
  flashingTargetIds: ReadonlySet<string>;
  hitStopRemaining: number;
  comicTexts: readonly ComicHitText[];
  comboStreak: number;
}

export class GameFeelSystem {
  private hitStopRemaining = 0;
  private particles: ImpactParticle[] = [];
  private ultimatePulses: UltimatePulse[] = [];
  private parcelShieldPulses: ParcelShieldPulse[] = [];
  private flashes = new Map<string, number>();
  private shakeRequest: { intensity: number; duration: number } | null = null;
  private comicTexts: ComicHitText[] = [];
  private comboStreak = 0;
  private comboStreakTimer = 0;

  constructor(private readonly audio?: AudioSink) {}

  public reset(): void {
    this.hitStopRemaining = 0;
    this.particles = [];
    this.ultimatePulses = [];
    this.parcelShieldPulses = [];
    this.flashes.clear();
    this.shakeRequest = null;
    this.comicTexts = [];
    this.comboStreak = 0;
    this.comboStreakTimer = 0;
  }

  /** Advances visual timers and returns true while simulation should freeze. */
  public update(dt: number): boolean {
    const frozen = this.hitStopRemaining > 0;
    this.hitStopRemaining = Math.max(0, this.hitStopRemaining - dt);
    for (const [id, remaining] of this.flashes) {
      const next = remaining - dt;
      if (next <= 0) this.flashes.delete(id); else this.flashes.set(id, next);
    }
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const pulse of this.ultimatePulses) pulse.life -= dt;
    this.ultimatePulses = this.ultimatePulses.filter((pulse) => pulse.life > 0);
    for (const pulse of this.parcelShieldPulses) pulse.life -= dt;
    this.parcelShieldPulses = this.parcelShieldPulses.filter((pulse) => pulse.life > 0);

    for (const c of this.comicTexts) {
      c.life -= dt;
      c.y += c.vy * dt;
    }
    this.comicTexts = this.comicTexts.filter((c) => c.life > 0);

    if (this.comboStreakTimer > 0) {
      this.comboStreakTimer -= dt;
      if (this.comboStreakTimer <= 0) this.comboStreak = 0;
    }

    return frozen;
  }

  /** Activation feedback is visible even when the ultimate does not hit a target. */
  public triggerUltimateActivation(x: number, y: number): void {
    this.ultimatePulses.push({ x, y, life: 0.65, maxLife: 0.65, maxRadius: 260 });
    this.shakeRequest = { intensity: 3.5, duration: 0.35 };
    this.spawnImpact(x, y, 18, '#FBBF24');
    this.addComicText('⚡ HỎA TỐC GIAO HÀNG! ⚡', x, y - 48, '#FBBF24', 28);
  }

  public triggerMeleeHit(combo: AttackComboStep, targetIds: string[], x: number, y: number): void {
    if (targetIds.length === 0) return;
    this.comboStreak++;
    this.comboStreakTimer = 2.2;

    this.audio?.play(meleeHitSfx(combo));
    if (combo === 'J3') this.audio?.duckMusic?.(-3, 175);
    if (combo === 'ULTIMATE') this.audio?.duckMusic?.(-4, 230);
    const profile = combo === 'ULTIMATE'
      ? { stop: 0.12, shake: 13, duration: 0.28, particles: 32 }
      : combo === 'J3' ? { stop: 0.11, shake: 5, duration: 0.18, particles: 14 }
      : combo === 'J2' ? { stop: 0.05, shake: 3.5, duration: 0.12, particles: 9 }
      : { stop: 0.065, shake: 2, duration: 0.1, particles: 6 };
    this.hitStopRemaining = Math.max(this.hitStopRemaining, profile.stop);
    for (const id of targetIds) this.flashes.set(id, 0.09);
    this.shakeRequest = { intensity: profile.shake, duration: profile.duration };
    this.spawnImpact(x, y, profile.particles, combo === 'ULTIMATE' ? '#FFE36A' : '#FF8A2A');

    // Spawn floating Vietnamese comic action text
    if (combo === 'J1') this.addComicText('BỐP!', x, y - 24, '#FEF08A', 16);
    else if (combo === 'J2') this.addComicText('CHÁT!', x, y - 28, '#FDBA74', 19);
    else if (combo === 'J3') this.addComicText('HUỲNH!', x, y - 34, '#F87171', 23);
    else if (combo === 'ULTIMATE') this.addComicText('HỎA TỐC! 💥', x, y - 40, '#FBBF24', 28);
  }

  private addComicText(text: string, x: number, y: number, color: string, size: number): void {
    this.comicTexts.push({
      id: `comic_${Date.now()}_${Math.random()}`,
      text,
      x: x + (Math.random() * 24 - 12),
      y,
      vy: -55,
      life: 0.65,
      maxLife: 0.65,
      color,
      size,
    });
  }

  public triggerProjectileHit(targetIds: string[], x: number, y: number): void {
    if (targetIds.length === 0) return;
    this.audio?.play('tape_hit');
    this.hitStopRemaining = Math.max(this.hitStopRemaining, 0.04);
    for (const id of targetIds) this.flashes.set(id, 0.07);
    this.shakeRequest = { intensity: 1.5, duration: 0.08 };
    this.spawnImpact(x, y, 5, '#F4D35E');
  }

  public triggerPlayerDamaged(x: number, y: number): void {
    this.audio?.play('player_hurt');
    this.hitStopRemaining = Math.max(this.hitStopRemaining, 0.07);
    this.flashes.set('player', 0.1);
    this.shakeRequest = { intensity: 4, duration: 0.14 };
    this.spawnImpact(x, y, 8, '#FF4D4D');
  }

  /** Brief confirmation that parcel protection actually reduced incoming damage. */
  public triggerParcelShield(x: number, y: number): void {
    this.parcelShieldPulses.push({ x, y, life: 0.16, maxLife: 0.16 });
    this.spawnImpact(x, y, 5, '#86EFAC');
  }

  public triggerParcelImpact(x: number, y: number, rearHit: boolean): void {
    this.audio?.play('parcel_hit');
    this.spawnImpact(x, y, rearHit ? 10 : 6, rearHit ? '#FB7185' : '#D6A35F');
  }

  public triggerLootCollected(x: number, y: number, type?: string): void {
    this.spawnImpact(x, y, 8, '#FBBF24');
    if (type === 'HEALTH') {
      this.addComicText('+25 HP CƠM TẤM! 🍚', x, y - 24, '#4ADE80', 16);
    } else if (type === 'MOMENTUM') {
      this.addComicText('+30 Q BÒ HÚC! ⚡', x, y - 24, '#38BDF8', 16);
    } else if (type === 'PARCEL_REPAIR') {
      this.addComicText('+GIA CỐ KIỆN! 📦', x, y - 24, '#FDE047', 16);
    } else if (type === 'BONUS_REWARD') {
      this.addComicText('+TIỀN TIP! 💵', x, y - 24, '#FBBF24', 16);
    } else if (type === 'PARTS') {
      this.addComicText('+LINH KIỆN SXP! ⚙️', x, y - 24, '#A78BFA', 16);
    }
  }

  public triggerPerfectDodge(x: number, y: number): void {
    this.audio?.play('perfect_dodge');
    this.hitStopRemaining = Math.max(this.hitStopRemaining, 0.045);
    this.shakeRequest = { intensity: 2.5, duration: 0.12 };
    this.spawnImpact(x, y, 12, '#67E8F9');
  }

  public consumeShakeRequest(): { intensity: number; duration: number } | null {
    const request = this.shakeRequest;
    this.shakeRequest = null;
    return request;
  }

  public getSnapshot(): GameFeelSnapshot {
    return {
      particles: this.particles,
      ultimatePulses: this.ultimatePulses,
      parcelShieldPulses: this.parcelShieldPulses,
      flashingTargetIds: new Set(this.flashes.keys()),
      hitStopRemaining: this.hitStopRemaining,
      comicTexts: this.comicTexts,
      comboStreak: this.comboStreak,
    };
  }

  private spawnImpact(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = (-Math.PI * 0.85) + (Math.PI * 1.7 * (i + 0.5)) / count;
      const speed = 90 + (i % 4) * 28; const life = 0.16 + (i % 3) * 0.035;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: 2 + (i % 3), color });
    }
  }
}
