import { Camera } from '../core/Camera';
import { NPC } from '../entities/NPC';
import { AlleyBrat } from '../entities/AlleyBrat';

export class StageNpcRenderer {
  private chutu: HTMLImageElement | null = null;
  private chiba: HTMLImageElement | null = null;
  private chubay: HTMLImageElement | null = null;
  private banam: HTMLImageElement | null = null;
  private brat: HTMLImageElement | null = null;
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
      const [chutu, chiba, chubay, banam, brat] = await Promise.all([
        this.loadImage('/assets/npc/chutu/chutu_idle.png'),
        this.loadImage('/assets/npc/chiba/chiba_idle.png'),
        this.loadImage('/assets/npc/chubay/chubay_idle.png'),
        this.loadImage('/assets/npc/banam/banam_idle.png'),
        this.loadImage('/assets/npc/brat/brat_idle.png'),
      ]);
      this.chutu = chutu;
      this.chiba = chiba;
      this.chubay = chubay;
      this.banam = banam;
      this.brat = brat;
      this.ready = this.chutu !== null;
    } catch (error) {
      console.warn('[StageNpc] NPC assets partial failure; fallback active.', error);
      this.ready = this.chutu !== null;
    }
    return this.ready;
  }

  public getImage(): HTMLImageElement | null {
    return this.ready ? this.chutu : null;
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

      // Shadow
      ctx.fillStyle = 'rgba(2,6,23,0.4)';
      ctx.beginPath();
      ctx.ellipse(feet.x, feet.y, 32, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Character sprite
      ctx.drawImage(this.chutu, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);

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
      ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
      ctx.beginPath();
      ctx.ellipse(feet.x, feet.y - 1, w * 0.44, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite
      ctx.drawImage(this.chiba, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);

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
      ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
      ctx.beginPath();
      ctx.ellipse(feet.x, feet.y - 1, w * 0.42, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite
      ctx.drawImage(this.chubay, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);

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

      // Sprite on balcony
      ctx.drawImage(this.banam, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);

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

    // Shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y - 1, w * 0.32, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // The raw sprite faces right. If facing left, flip horizontally around feet.x
    const flip = brat.facing === 'left';
    ctx.save();
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

      // Laser dot at muzzle
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
}
