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
    const h = 112;
    const w = h * (this.chutu.naturalWidth / this.chutu.naturalHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'rgba(2,6,23,0.34)';
    ctx.beginPath(); ctx.ellipse(feet.x, feet.y, 25, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(this.chutu, Math.round(feet.x - w / 2), Math.round(feet.y - h), w, h);
    ctx.fillStyle = 'rgba(2,6,23,0.8)'; ctx.fillRect(feet.x - 49, feet.y - h - 22, 98, 18);
    ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('CHÚ TƯ • KHÁCH', feet.x, feet.y - h - 9);
    ctx.restore();
    return true;
  }
}
