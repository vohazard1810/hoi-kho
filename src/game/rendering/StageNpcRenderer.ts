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
    ctx.fillStyle = 'rgba(2, 6, 23, 0.62)';
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
      // Golden hour sunset grading matching alley dusk: warm saturation, subtle sepia, gentle contrast
      ctx.filter = 'brightness(0.97) contrast(1.05) saturate(1.18) sepia(0.08)';
    }
  }

  public render(ctx: CanvasRenderingContext2D, camera: Camera, npc: NPC, playerX?: number): boolean {
    const isNear = playerX !== undefined && Math.abs(playerX - (npc.x + npc.width / 2)) < 90;
    const time = performance.now() / 1000;

    if (npc.role === 'chutu') {
      if (!this.ready || !this.chutu) return false;
      const feet = camera.worldToScreen(npc.x + npc.width / 2, npc.y + npc.height);
      const h = 138;
      const w = h * (this.chutu.naturalWidth / this.chutu.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Golden destination beacon on floor
      const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5;
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.45 + pulse * 0.5})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(feet.x, feet.y, 44 + pulse * 6, 11 + pulse * 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Dual-layer grounded shadow
      this.drawGroundedShadow(ctx, feet.x, feet.y, 34, 6);

      // Subtle breathing idle animation
      const breathScaleY = 1 + Math.sin(time * 2.2) * 0.012;
      const breathScaleX = 1 - Math.sin(time * 2.2) * 0.008;

      ctx.save();
      ctx.translate(feet.x, feet.y);
      ctx.scale(breathScaleX, breathScaleY);
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.chutu, -Math.round(w / 2), -h, w, h);
      ctx.restore();

      // Context-sensitive callout: ONLY show text bubble when player is within range!
      if (isNear || (playerX !== undefined && Math.abs(playerX - (npc.x + npc.width / 2)) < 130)) {
        const bob = Math.sin(Date.now() * 0.005) * 3;
        const bubbleY = feet.y - h - 24 + bob;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(feet.x - 70, bubbleY - 12, 140, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📦 [ E ] Giao kiện hàng', feet.x, bubbleY + 4);
      }

      ctx.restore();
      return true;
    }

    if (npc.role === 'chiba' && this.chiba) {
      // Ground firmly on sidewalk pavement (Y=622) so sandals and wheels sink 2px into concrete cracks
      const screenX = camera.worldToScreen(npc.x + npc.width / 2 + 8, 0).x;
      const groundY = camera.worldToScreen(0, 622).y;
      const feet = { x: screenX, y: groundY };
      const h = 126;
      const w = h * (this.chiba.naturalWidth / this.chiba.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Dual contact shadows: firmly under sandals and cart wheels
      this.drawGroundedShadow(ctx, feet.x - w * 0.22, feet.y, 22, 5);
      this.drawGroundedShadow(ctx, feet.x + w * 0.24, feet.y, 28, 5);

      // Subtle breathing & gentle vertical bobbing
      const breathScaleY = 1 + Math.sin(time * 2.4) * 0.012;
      const breathScaleX = 1 - Math.sin(time * 2.4) * 0.008;
      const torsoBounce = Math.sin(time * 2.4) * 0.7;

      ctx.save();
      ctx.translate(feet.x, feet.y);
      ctx.scale(breathScaleX, breathScaleY);
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.chiba, -Math.round(w / 2), -h + torsoBounce, w, h);
      ctx.restore();

      // Rotating sugarcane press crank wheel with metallic glint
      ctx.save();
      ctx.translate(feet.x + w * 0.12, feet.y - h * 0.52);
      ctx.rotate(time * 3.5);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(6, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Rising crushed ice mist vapor particles from ice box
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const pTime = (time * 0.75 + i * 0.6) % 1.8;
        const pProgress = pTime / 1.8;
        const pX = feet.x + w * 0.28 + Math.sin(time * 2.0 + i) * 5;
        const pY = feet.y - h * 0.46 - pProgress * 24;
        const pAlpha = (1 - pProgress) * 0.38;
        ctx.fillStyle = `rgba(240, 249, 255, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(pX, pY, 2.5 + pProgress * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Lime slice glint on iced sugarcane juice cup
      ctx.save();
      const glintPulse = 0.4 + Math.sin(time * 3.5) * 0.35;
      ctx.fillStyle = `rgba(254, 240, 138, ${glintPulse})`;
      ctx.beginPath();
      ctx.arc(feet.x - w * 0.28, feet.y - h * 0.62, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Context-sensitive callout: ONLY show bubble when player is nearby (< 90px)
      if (isNear) {
        const bob = Math.sin(Date.now() * 0.004) * 3;
        const bubbleY = feet.y - h - 20 + bob;
        ctx.fillStyle = 'rgba(14, 165, 233, 0.92)';
        ctx.beginPath();
        ctx.roundRect(feet.x - 65, bubbleY - 12, 130, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🥤 [ E ] Uống trà đá', feet.x, bubbleY + 4);
      }

      ctx.restore();
      return true;
    }

    if (npc.role === 'chubay' && this.chubay) {
      // Ground firmly on sidewalk pavement (Y=622) so stool legs, toolbox, and sandals plant solidly
      const screenX = camera.worldToScreen(npc.x + npc.width / 2, 0).x;
      const groundY = camera.worldToScreen(0, 622).y;
      const feet = { x: screenX, y: groundY };
      const h = 92;
      const w = h * (this.chubay.naturalWidth / this.chubay.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Triple grounded contact shadows: under toolbox, stool/front sandal, and right sandal
      this.drawGroundedShadow(ctx, feet.x - w * 0.32, feet.y - 4, 30, 5);
      this.drawGroundedShadow(ctx, feet.x, feet.y, 28, 5);
      this.drawGroundedShadow(ctx, feet.x + w * 0.34, feet.y - 2, 18, 4);

      // Sitting posture breathing deformation
      const breathScaleY = 1 + Math.sin(time * 2.0) * 0.015;
      const breathScaleX = 1 - Math.sin(time * 2.0) * 0.008;

      ctx.save();
      ctx.translate(feet.x, feet.y);
      ctx.scale(breathScaleX, breathScaleY);
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.chubay, -Math.round(w / 2), -h, w, h);
      ctx.restore();

      // Tire pump air hiss / steam puff every 2.8s
      const pumpPhase = (time % 2.8) / 2.8;
      if (pumpPhase < 0.35) {
        const puffProg = pumpPhase / 0.35;
        const puffAlpha = (1 - puffProg) * 0.55;
        ctx.save();
        ctx.fillStyle = `rgba(241, 245, 249, ${puffAlpha})`;
        ctx.beginPath();
        ctx.arc(feet.x - w * 0.38 - puffProg * 14, feet.y - 10 - puffProg * 6, 2.5 + puffProg * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Wrench metallic glint highlight in hand
      ctx.save();
      const wrenchGlint = 0.35 + Math.sin(time * 2.8) * 0.35;
      ctx.fillStyle = `rgba(255, 255, 255, ${wrenchGlint})`;
      ctx.beginPath();
      ctx.arc(feet.x + w * 0.22, feet.y - h * 0.56, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Context-sensitive callout: ONLY show bubble when player is nearby (< 90px)
      if (isNear) {
        const bob = Math.sin(Date.now() * 0.004 + 1) * 3;
        const bubbleY = feet.y - h - 20 + bob;
        ctx.fillStyle = 'rgba(234, 88, 12, 0.92)';
        ctx.beginPath();
        ctx.roundRect(feet.x - 70, bubbleY - 12, 140, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔧 [ E ] Bơm xe & Băng keo', feet.x, bubbleY + 4);
      }

      ctx.restore();
      return true;
    }

    if (npc.role === 'banam' && this.banam) {
      const feet = camera.worldToScreen(npc.x + npc.width / 2, npc.y + npc.height);
      const h = 98;
      const w = h * (this.banam.naturalWidth / this.banam.naturalHeight);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Gentle grandmother breathing & head nod
      const nod = Math.sin(time * 1.5) * 0.8;
      const breathScaleY = 1 + Math.sin(time * 1.8) * 0.01;

      ctx.save();
      ctx.translate(feet.x, feet.y);
      ctx.scale(1, breathScaleY);
      this.applyEnvironmentBlend(ctx, false);
      ctx.drawImage(this.banam, -Math.round(w / 2), -h + nod, w, h);
      ctx.restore();

      // Balcony orchid gentle blossom glow / breeze sway
      ctx.save();
      const orchidGlow = 0.25 + Math.sin(time * 2.2) * 0.2;
      ctx.fillStyle = `rgba(232, 121, 249, ${orchidGlow})`;
      ctx.beginPath();
      ctx.arc(feet.x - w * 0.35, feet.y - h * 0.62 + Math.sin(time * 1.8) * 1.2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Context-sensitive talk bubble: ONLY show when player is nearby
      if (isNear) {
        const bob = Math.sin(Date.now() * 0.0035 + 2) * 3;
        const bubbleY = feet.y - h - 18 + bob;
        ctx.fillStyle = 'rgba(147, 51, 234, 0.88)';
        ctx.beginPath();
        ctx.roundRect(feet.x - 65, bubbleY - 11, 130, 22, 6);
        ctx.fill();
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👵 [ E ] Nghe Bà Năm dặn', feet.x, bubbleY + 4);
      }

      ctx.restore();
      return true;
    }

    return false;
  }

  public renderBrat(ctx: CanvasRenderingContext2D, camera: Camera, brat: AlleyBrat): boolean {
    if (!this.brat) return false;
    // Ground +10px offset firmly onto wooden awning surface
    const feet = camera.worldToScreen(brat.x + brat.width / 2, brat.y + brat.height + 10);
    const h = 62;
    const w = h * (this.brat.naturalWidth / this.brat.naturalHeight);
    const time = performance.now() / 1000;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.32, 4);

    const flip = brat.facing === 'left';
    const isKO = brat.state === 'KO';
    const bratBounce = isKO ? 0 : Math.sin(time * 5.0) * 1.0;
    const aimBob = brat.state === 'AIM' ? Math.sin(time * 6.0) * 2.0 : 0;

    ctx.save();
    this.applyEnvironmentBlend(ctx, isKO);
    if (flip) {
      ctx.translate(feet.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.brat, -Math.round(w / 2), Math.round(feet.y - h + bratBounce), w, h);
    } else {
      ctx.drawImage(this.brat, Math.round(feet.x - w / 2), Math.round(feet.y - h + bratBounce), w, h);
    }
    ctx.restore();

    // Aiming laser beam when in AIM state
    if (brat.state === 'AIM') {
      const muzzleX = feet.x + (flip ? -20 : 20);
      const muzzleY = feet.y - h * 0.52 + aimBob;
      const targetDirX = flip ? -1 : 1;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      ctx.lineTo(muzzleX + targetDirX * 200, muzzleY + 80);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Toy water gun nozzle droplet drip every 1.6s
    const dripTime = (time % 1.6) / 1.6;
    if (!isKO && dripTime < 0.6) {
      const dripProg = dripTime / 0.6;
      const dripY = (feet.y - h * 0.52 + aimBob) + dripProg * 18;
      ctx.fillStyle = `rgba(56, 189, 248, ${(1 - dripProg) * 0.8})`;
      ctx.beginPath();
      ctx.arc(feet.x + (flip ? -20 : 20), dripY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Comic KO status (no permanent distracting yellow billboard)
    if (isKO) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(feet.x - 24, feet.y - h - 18, 48, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('😭 x_x', feet.x, feet.y - h - 6);
    }

    ctx.restore();
    return true;
  }

  public renderGuard(ctx: CanvasRenderingContext2D, camera: Camera, guard: AlleyGuard): boolean {
    if (!this.guard) return false;
    const feet = camera.worldToScreen(guard.x + guard.width / 2, guard.y + guard.height);
    const h = 130;
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
        const radius = i * 38;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.9 - i * 0.25})`;
        ctx.lineWidth = 3;
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
    const h = 124;
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
    const feet = camera.worldToScreen(rat.x + rat.width / 2, rat.y + rat.height + 2);
    const h = 32;
    const w = h * (this.rat.naturalWidth / this.rat.naturalHeight);
    const time = performance.now() / 1000;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Dual-layer shadow
    this.drawGroundedShadow(ctx, feet.x, feet.y, w * 0.4, 4);

    const flip = rat.facing === 'left';
    const isKO = rat.state === 'KO';
    const tailWiggle = isKO ? 0 : Math.sin(time * 14.0) * 1.5;
    const sniffBob = isKO ? 0 : Math.sin(time * 16.0) * 0.8;

    ctx.save();
    this.applyEnvironmentBlend(ctx, rat.state === 'HURT');
    const shakeX = rat.state === 'HURT' ? Math.sin(Date.now() * 0.05) * 3 : 0;

    if (flip) {
      ctx.translate(feet.x + shakeX, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.rat, -Math.round(w / 2) + tailWiggle, Math.round(feet.y - h + sniffBob), w, h);
    } else {
      ctx.drawImage(this.rat, Math.round(feet.x - w / 2) + shakeX + tailWiggle, Math.round(feet.y - h + sniffBob), w, h);
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
    const h = 142;
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
    const h = 124;
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
