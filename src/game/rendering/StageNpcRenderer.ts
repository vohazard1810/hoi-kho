import { Camera } from '../core/Camera';
import { NPC } from '../entities/NPC';
import { AlleyBrat } from '../entities/AlleyBrat';
import { AlleyGuard } from '../entities/AlleyGuard';
import { SaboteurShipper } from '../entities/SaboteurShipper';
import { AlleyRat } from '../entities/AlleyRat';
import { Thug } from '../entities/Thug';
import { Rival } from '../entities/Rival';

export class StageNpcRenderer {
  private chutu: HTMLImageElement | null = null;
  private chiba: HTMLImageElement | null = null;
  private chubay: HTMLImageElement | null = null;
  private banam: HTMLImageElement | null = null;
  private brat: HTMLImageElement | null = null;
  private guard: HTMLImageElement | null = null;
  private saboteur: HTMLImageElement | null = null;
  private enforcer: HTMLImageElement | null = null;
  private rat: HTMLImageElement | null = null;
  private ready = false;

  private loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => (image.naturalWidth > 0 && image.naturalHeight > 0 ? resolve(image) : resolve(null));
      image.onerror = () => resolve(null);
      image.src = src;
    });
  }

  public async preload(): Promise<boolean> {
    try {
      const [chutu, chiba, chubay, banam, brat, guard, saboteur, enforcer, rat] = await Promise.all([
        this.loadImage('/assets/npc/chutu/chutu_idle.png'),
        this.loadImage('/assets/npc/chiba/chiba_idle.png'),
        this.loadImage('/assets/npc/chubay/chubay_idle.png'),
        this.loadImage('/assets/npc/banam/banam_idle.png'),
        this.loadImage('/assets/npc/brat/brat_idle.png'),
        this.loadImage('/assets/enemies/guard/guard_idle.png'),
        this.loadImage('/assets/enemies/saboteur/saboteur_idle.png'),
        this.loadImage('/assets/enemies/enforcer/enforcer_idle.png'),
        this.loadImage('/assets/enemies/rat/rat_idle.png'),
      ]);
      this.chutu = chutu;
      this.chiba = chiba;
      this.chubay = chubay;
      this.banam = banam;
      this.brat = brat;
      this.guard = guard;
      this.saboteur = saboteur;
      this.enforcer = enforcer;
      this.rat = rat;
      this.ready = this.chutu !== null;
    } catch (error) {
      console.warn('[StageNpc] Street assets partial failure; fallback active.', error);
      this.ready = this.chutu !== null;
    }
    return this.ready;
  }

  public getImage(): HTMLImageElement | null {
    return this.ready ? this.chutu : null;
  }

  /**
   * Dual-layer contact shadow for perfect environment grounding:
   * 1. Soft dusk ambient shadow (wider, cast slightly according to sunset angle)
   * 2. Crisp dark occlusion shadow (tight under soles/wheels/paws)
   */
  private drawGroundedShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radiusX: number,
    radiusY: number
  ): void {
    ctx.save();
    // 1. Soft ambient dusk contact
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, radiusX * 1.25, radiusY * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Crisp occlusion shadow directly beneath soles/wheels
    ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, radiusX * 0.85, radiusY * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Environment lighting and comic combat grading:
   * - In normal state: enhances contrast and warm sunset saturation matching Stage 1 dusk.
   * - In hurt state: crisp white/comic hit-flash.
   */
  private applyEnvironmentBlend(ctx: CanvasRenderingContext2D, isHurt: boolean = false): void {
    if (isHurt) {
      ctx.filter = 'brightness(1.9) saturate(0.65)';
    } else {
      ctx.filter = 'brightness(1.02) contrast(1.02) saturate(1.05)';
    }
  }

  public render(ctx: CanvasRenderingContext2D, camera: Camera, npc: NPC): boolean {
    if (npc.role === 'chutu') {
      if (!this.ready || !this.chutu) return false;
      const feet = camera.worldToScreen(npc.x + npc.width / 2, npc.y + npc.height);
      const h = 148;
      const w = h * (this.chutu.naturalWidth / this.chutu.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Golden destination beacon on floor
      const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5;
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.45 + pulse * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(feet.x, feet.y, 48 + pulse * 8, 12 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Dual-layer grounded shadow
      this.drawGroundedShadow(ctx, feet.x, feet.y, 36, 6);

      // Character sprite with sunset grading
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.chutu, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);
      ctx.filter = 'none';

      // Animated callout bubble
      const bob = Math.sin(Date.now() * 0.005) * 4;
      const bubbleY = feet.y - h - 30 + bob;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(feet.x - 75, bubbleY - 14, 150, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📦 Shipper ơi, đây nè!', feet.x, bubbleY + 4);

      ctx.restore();
      return true;
    }

    if (npc.role === 'chiba' && this.chiba) {
      const feet = camera.worldToScreen(npc.x + npc.width / 2 + 10, npc.y + npc.height);
      const h = 138;
      const w = h * (this.chiba.naturalWidth / this.chiba.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Floor Shadow
      this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.44, 7);

      // Sprite with sunset blend
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.chiba, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);
      ctx.filter = 'none';

      // Floating friendly callout bubble
      const bob = Math.sin(Date.now() * 0.004) * 3;
      const bubbleY = feet.y - h - 22 + bob;
      ctx.fillStyle = 'rgba(14, 165, 233, 0.92)';
      ctx.beginPath();
      ctx.roundRect(feet.x - 70, bubbleY - 13, 140, 26, 6);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥤 TRÀ ĐÁ ĐÂY EM! [ E ]', feet.x, bubbleY + 4);

      ctx.restore();
      return true;
    }

    if (npc.role === 'chubay' && this.chubay) {
      const feet = camera.worldToScreen(npc.x + npc.width / 2, npc.y + npc.height);
      const h = 118;
      const w = h * (this.chubay.naturalWidth / this.chubay.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Floor Shadow
      this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.42, 6);

      // Sprite with sunset blend
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.chubay, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);
      ctx.filter = 'none';

      // Floating callout bubble
      const bob = Math.sin(Date.now() * 0.004 + 1) * 3;
      const bubbleY = feet.y - h - 22 + bob;
      ctx.fillStyle = 'rgba(234, 88, 12, 0.92)';
      ctx.beginPath();
      ctx.roundRect(feet.x - 75, bubbleY - 13, 150, 26, 6);
      ctx.fill();
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔧 VÁ XE - BĂNG KEO [ E ]', feet.x, bubbleY + 4);

      ctx.restore();
      return true;
    }

    if (npc.role === 'banam' && this.banam) {
      const feet = camera.worldToScreen(npc.x + npc.width / 2, npc.y + npc.height);
      const h = 138;
      const w = h * (this.banam.naturalWidth / this.banam.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Sprite on balcony with sunset blend
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.banam, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);
      ctx.filter = 'none';

      // Ambient talk bubble
      const bob = Math.sin(Date.now() * 0.0035 + 2) * 3;
      const bubbleY = feet.y - h - 20 + bob;
      ctx.fillStyle = 'rgba(147, 51, 234, 0.88)';
      ctx.beginPath();
      ctx.roundRect(feet.x - 65, bubbleY - 12, 130, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👵 BÀ NĂM BAN CÔNG [ E ]', feet.x, bubbleY + 4);

      ctx.restore();
      return true;
    }

    return false;
  }

  public renderBrat(ctx: CanvasRenderingContext2D, camera: Camera, brat: AlleyBrat): boolean {
    if (!this.brat) return false;
    const feet = camera.worldToScreen(brat.x + brat.width / 2, brat.y + brat.height);
    const h = 88;
    const w = h * (this.brat.naturalWidth / this.brat.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.32, 5);

    const flip = brat.facing === 'left';
    ctx.save();
    this.applyEnvironmentBlend(ctx, brat.state === 'KO');
    if (flip) {
      ctx.translate(feet.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.brat, -Math.round(w / 2), Math.round(feet.y - h), w, h);
    } else {
      ctx.drawImage(this.brat, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);
    }
    ctx.restore();

    // Aiming laser beam when in AIM state
    if (brat.state === 'AIM') {
      const muzzleX = feet.x + (flip ? -28 : 28);
      const muzzleY = feet.y - h * 0.52;
      const targetDirX = flip ? -1 : 1;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      ctx.lineTo(muzzleX + targetDirX * 220, muzzleY + 90);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name tag & KO status
    if (brat.state === 'KO') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(feet.x - 30, feet.y - h - 22, 60, 18);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('😭 x_x', feet.x, feet.y - h - 9);
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(feet.x - 26, feet.y - h - 20, 52, 16);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('BÉ BO', feet.x, feet.y - h - 8);
    }

    ctx.restore();
    return true;
  }

  public renderGuard(ctx: CanvasRenderingContext2D, camera: Camera, guard: AlleyGuard): boolean {
    if (!this.guard) return false;
    const feet = camera.worldToScreen(guard.x + guard.width / 2, guard.y + guard.height);
    const h = 132;
    const w = h * (this.guard.naturalWidth / this.guard.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.38, 6);

    const flip = guard.facing === 'left';
    ctx.save();
    this.applyEnvironmentBlend(ctx, guard.state === 'HURT');
    const shakeX = guard.state === 'HURT' ? Math.sin(Date.now() * 0.05) * 3 : 0;

    if (flip) {
      ctx.translate(feet.x + shakeX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.guard, -Math.round(w / 2), Math.round(feet.y - h), w, h);
    } else {
      ctx.drawImage(this.guard, Math.round(feet.x - w / 2) + shakeX, Math.round(feet.y - h), w, h);
    }
    ctx.restore();

    // Megaphone Soundwaves AOE
    if (guard.state === 'MEGAPHONE_BLAST') {
      const dir = flip ? -1 : 1;
      const speakerX = feet.x + dir * 18;
      const speakerY = feet.y - h * 0.65;
      ctx.save();
      for (let i = 1; i <= 3; i++) {
        const radius = i * 40;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.9 - i * 0.25})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const startAngle = dir > 0 ? -Math.PI / 4 : (3 * Math.PI) / 4;
        const endAngle = dir > 0 ? Math.PI / 4 : (5 * Math.PI) / 4;
        ctx.arc(speakerX, speakerY, radius, startAngle, endAngle);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Shield status indication
    if (guard.isShieldBroken) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💥 VỠ KHIÊN! 💥', feet.x, feet.y - h - 18);
    } else if (guard.state === 'GUARD_STANCE') {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️ THỦ KHIÊN (Né/Đạp W+J)', feet.x, feet.y - h - 18);
    }

    // Health Bar
    if (guard.state !== 'KO') {
      const hpRatio = Math.max(0, guard.hp / guard.maxHp);
      const barW = 54;
      const barH = 5;
      const barX = feet.x - barW / 2;
      const barY = feet.y - h - 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#3b82f6' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    ctx.restore();
    return true;
  }

  public renderSaboteur(ctx: CanvasRenderingContext2D, camera: Camera, sab: SaboteurShipper): boolean {
    if (!this.saboteur) return false;
    const feet = camera.worldToScreen(sab.x + sab.width / 2, sab.y + sab.height);
    const h = 126;
    const w = h * (this.saboteur.naturalWidth / this.saboteur.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.36, 6);

    const flip = sab.facing === 'left';
    ctx.save();
    this.applyEnvironmentBlend(ctx, sab.state === 'HURT');
    const shakeX = sab.state === 'HURT' ? Math.sin(Date.now() * 0.05) * 3 : 0;

    if (flip) {
      ctx.translate(feet.x + shakeX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.saboteur, -Math.round(w / 2), Math.round(feet.y - h), w, h);
    } else {
      ctx.drawImage(this.saboteur, Math.round(feet.x - w / 2) + shakeX, Math.round(feet.y - h), w, h);
    }
    ctx.restore();

    // Health bar & status
    if (sab.state !== 'KO') {
      const hpRatio = Math.max(0, sab.hp / sab.maxHp);
      const barW = 48;
      const barH = 4;
      const barX = feet.x - barW / 2;
      const barY = feet.y - h - 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#a855f7' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.fillStyle = '#f3e8ff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('GIAN THƯƠNG', feet.x, feet.y - h - 12);
    } else {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(feet.x - 30, feet.y - h - 20, 60, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('😵 BỎ CHẠY', feet.x, feet.y - h - 8);
    }

    ctx.restore();
    return true;
  }

  public renderRat(ctx: CanvasRenderingContext2D, camera: Camera, rat: AlleyRat): boolean {
    if (!this.rat) return false;
    const feet = camera.worldToScreen(rat.x + rat.width / 2, rat.y + rat.height);
    const h = 42;
    const w = h * (this.rat.naturalWidth / this.rat.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.4, 4);

    const flip = rat.facing === 'left';
    ctx.save();
    this.applyEnvironmentBlend(ctx, rat.state === 'HURT');
    const shakeX = rat.state === 'HURT' ? Math.sin(Date.now() * 0.05) * 3 : 0;

    if (flip) {
      ctx.translate(feet.x + shakeX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.rat, -Math.round(w / 2), Math.round(feet.y - h), w, h);
    } else {
      ctx.drawImage(this.rat, Math.round(feet.x - w / 2) + shakeX, Math.round(feet.y - h), w, h);
    }
    ctx.restore();

    // Health Bar
    if (rat.state !== 'KO') {
      const hpRatio = Math.max(0, rat.hp / rat.maxHp);
      const barW = 28;
      const barH = 3;
      const barX = feet.x - barW / 2;
      const barY = feet.y - h - 5;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#ef4444' : '#dc2626';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    ctx.restore();
    return true;
  }

  /**
   * Renders the hulking Debt-Collector Thug (Giang Hồ Đòi Nợ F89) with high-res cel-shaded sprite
   */
  public renderEnforcer(ctx: CanvasRenderingContext2D, camera: Camera, thug: Thug): boolean {
    if (!this.enforcer) return false;
    const feet = camera.worldToScreen(thug.x + thug.width / 2, thug.y + thug.height);
    const h = 152;
    const w = h * (this.enforcer.naturalWidth / this.enforcer.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer grounded shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.36, 7);

    if (!thug.isAlive || thug.state === 'KO') {
      ctx.globalAlpha = 0.45;
    }

    const flip = thug.facing === 'left';
    ctx.save();
    const isHurt = thug.state === 'HURT';
    this.applyEnvironmentBlend(ctx, isHurt);

    const shakeX = isHurt ? Math.sin(Date.now() * 0.05) * 3 : 0;

    if (flip) {
      ctx.translate(feet.x + shakeX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.enforcer, -Math.round(w / 2), Math.round(feet.y - h), w, h);
    } else {
      ctx.drawImage(this.enforcer, Math.round(feet.x - w / 2) + shakeX, Math.round(feet.y - h), w, h);
    }
    ctx.restore();

    // Attack / Charge visual cues
    if (thug.state === 'CHARGE_TELEGRAPH') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ RUSH LAO TỚI ⚡', feet.x, feet.y - h - 22);
    } else if (thug.state === 'HEAVY_TELEGRAPH') {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('💥 VỤT GẬY NẶNG (NÉ LÙI) 💥', feet.x, feet.y - h - 22);
    }

    // Health bar & status
    if (thug.isAlive && thug.state !== 'KO') {
      const hpRatio = Math.max(0, thug.hp / thug.maxHp);
      const barW = 64;
      const barH = 5;
      const barX = feet.x - barW / 2;
      const barY = feet.y - h - 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.3 ? '#ef4444' : '#b91c1c';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('GIANG HỒ ĐÒI NỢ', feet.x, feet.y - h - 12);
    } else if (thug.state === 'KO') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(feet.x - 32, feet.y - h - 22, 64, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('😵 GỤC NGÃ', feet.x, feet.y - h - 10);
    }

    ctx.restore();
    return true;
  }

  /**
   * Renders the Rival Shipper with high-res cel-shaded courier sprite and racing crimson grading
   */
  public renderRivalShipper(ctx: CanvasRenderingContext2D, camera: Camera, rival: Rival): boolean {
    if (!this.saboteur) return false;
    const feet = camera.worldToScreen(rival.x + rival.width / 2, rival.y + rival.height);
    const h = 130;
    const w = h * (this.saboteur.naturalWidth / this.saboteur.naturalHeight);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.36, 6);

    if (!rival.isAlive || rival.state === 'KO') {
      ctx.globalAlpha = 0.45;
    }

    const flip = rival.facing === 'left';
    ctx.save();
    const isHurt = rival.state === 'HURT';
    if (isHurt) {
      ctx.filter = 'brightness(1.9) saturate(0.6)';
    } else {
      // Crimson racing jacket tint (hue-rotate from saboteur purple to racing red)
      ctx.filter = 'hue-rotate(295deg) saturate(1.3) brightness(1.05)';
    }

    const shakeX = isHurt ? Math.sin(Date.now() * 0.05) * 3 : 0;

    if (flip) {
      ctx.translate(feet.x + shakeX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.saboteur, -Math.round(w / 2), Math.round(feet.y - h), w, h);
    } else {
      ctx.drawImage(this.saboteur, Math.round(feet.x - w / 2) + shakeX, Math.round(feet.y - h), w, h);
    }
    ctx.restore();

    // Attack state visual cue
    if (rival.state === 'ATTACK_STARTUP') {
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ CƯỚP ĐƠN! (ĐẤM)', feet.x, feet.y - h - 22);
    }

    // Health bar & status
    if (rival.isAlive && rival.state !== 'KO') {
      const hpRatio = Math.max(0, rival.hp / rival.maxHp);
      const barW = 50;
      const barH = 4;
      const barX = feet.x - barW / 2;
      const barY = feet.y - h - 8;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.3 ? '#f43f5e' : '#be123c';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.fillStyle = '#fecdd3';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('SHIPPER ĐỐI THỦ', feet.x, feet.y - h - 12);
    } else if (rival.state === 'KO') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(feet.x - 30, feet.y - h - 20, 60, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('😵 BỎ ĐƠN', feet.x, feet.y - h - 8);
    }

    ctx.restore();
    return true;
  }
}
