import { Camera } from '../core/Camera';
import { NPC } from '../entities/NPC';

export class StageNpcRenderer {
  private chutu: HTMLImageElement | null = null;
  private ready = false;

  public async preload(): Promise<boolean> {
    try {
      this.chutu = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0
          ? resolve(image)
          : reject(new Error('Decoded 0x0 Chú Tư image'));
        image.onerror = () => reject(new Error('Failed to load Chú Tư'));
        image.src = '/assets/npc/chutu/chutu_idle.png';
      });
      this.ready = true;
    } catch (error) {
      console.warn('[StageNpc] Chú Tư unavailable; using safe fallback.', error);
      this.ready = false;
    }
    return this.ready;
  }

  public getImage(): HTMLImageElement | null { return this.ready ? this.chutu : null; }

  public render(ctx: CanvasRenderingContext2D, camera: Camera, npc: NPC): boolean {
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
    ctx.beginPath(); ctx.ellipse(feet.x, feet.y, 32, 5, 0, 0, Math.PI * 2); ctx.fill();

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
}
