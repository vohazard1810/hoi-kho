import { Camera } from '../core/Camera';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';

// Player idle has a 76 px opaque body inside its 96 px frame. Keeping Cô Ba
// at 84 px makes her ~10.5% taller without visually detaching her from gameplay scale.
export const COBA_RENDER_HEIGHT = 84;
export const HUB_HUMAN_SCALE = 2.65;

export class HubProductionRenderer {
  private background: HTMLImageElement | null = null;
  private coba: HTMLImageElement | null = null;
  private playerIdle: HTMLImageElement | null = null;
  private ready = false;

  private load(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0
        ? resolve(image)
        : reject(new Error(`Decoded 0x0 image: ${url}`));
      image.onerror = () => reject(new Error(`Failed to load ${url}`));
      image.src = url;
    });
  }

  public async preload(): Promise<boolean> {
    try {
      const [bg, coba, playerIdle] = await Promise.all([
        this.load('/assets/world/hub/hub_sxp_interior.png'),
        this.load('/assets/npc/coba/coba_idle.png'),
        this.load('/assets/staging_hd/player/player_idle.png')
          .catch(() => this.load('/assets/staging/player/player_idle.png'))
          .catch(() => null),
      ]);
      this.background = bg;
      this.coba = coba;
      this.playerIdle = playerIdle;
      this.ready = true;
    } catch (error) {
      console.warn('[HubProduction] Asset activation blocked; using safe fallback.', error);
      this.ready = false;
    }
    return this.ready;
  }

  public isReady(): boolean { return this.ready; }
  public getCoBaImage(): HTMLImageElement | null { return this.ready ? this.coba : null; }
  public getPlayerIdleImage(): HTMLImageElement | null { return this.playerIdle; }

  public renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    if (!this.ready || !this.background) return false;
    // The generated curb sits at source y≈574; shift it onto the gameplay floor y=620.
    ctx.fillStyle = '#07111f'; ctx.fillRect(0, 0, width, height);
    ctx.drawImage(this.background, 0, 46, width, height);
    ctx.fillStyle = 'rgba(5, 15, 30, 0.08)';
    ctx.fillRect(0, 0, width, height);
    return true;
  }

  public renderCoBa(ctx: CanvasRenderingContext2D, camera: Camera, npc: NPC): boolean {
    if (!this.ready || !this.coba) return false;
    const feet = camera.worldToScreen(npc.x + npc.width / 2, npc.y + npc.height);
    const h = COBA_RENDER_HEIGHT * HUB_HUMAN_SCALE;
    const w = h * (this.coba.naturalWidth / this.coba.naturalHeight);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.coba, feet.x - w / 2, feet.y - h, w, h);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.fillRect(feet.x - 60, feet.y - h - 25, 120, 20);
    ctx.fillStyle = '#fff7ed';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CÔ BA • QUẢN LÝ HUB', feet.x, feet.y - h - 10);
    ctx.restore();
    return true;
  }

  /**
   * Renders the true HD Player idle sprite immediately in Hub if the multi-state AssetManager pipeline
   * is still verifying secondary states (jump/dodge/ultimate), completely preventing any dark box placeholder.
   */
  public renderPlayerFallback(ctx: CanvasRenderingContext2D, camera: Camera, player: Player): boolean {
    if (!this.playerIdle || this.playerIdle.naturalWidth <= 0 || this.playerIdle.naturalHeight <= 0) return false;
    const feet = camera.worldToScreen(player.x + player.width / 2, player.y + player.height);
    const frameCount = 4;
    const frameW = Math.round(this.playerIdle.naturalWidth / frameCount);
    const frameH = this.playerIdle.naturalHeight;
    const h = 78.6 * HUB_HUMAN_SCALE;
    const w = h * (frameW / frameH);

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    // Floor shadow matching Cô Ba
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y - 2, 42 * (HUB_HUMAN_SCALE / 1.5), 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const flip = player.facing === 'left';
    if (flip) {
      ctx.translate(feet.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(this.playerIdle, 0, 0, frameW, frameH, -w / 2, feet.y - h, w, h);
    } else {
      ctx.drawImage(this.playerIdle, 0, 0, frameW, frameH, feet.x - w / 2, feet.y - h, w, h);
    }
    ctx.restore();
    return true;
  }
}
