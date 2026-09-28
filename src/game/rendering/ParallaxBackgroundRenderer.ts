import { Camera } from '../core/Camera';
import { Rect } from '../core/types';

interface ParallaxLayer {
  file: string;
  factor: number;
  y: number;
  image: HTMLImageElement | null;
}

export class ParallaxBackgroundRenderer {
  private readonly layers: ParallaxLayer[] = [
    { file: 'bg_far_sky.png', factor: 0.08, y: 0, image: null },
    { file: 'bg_mid_houses.png', factor: 0.22, y: 100, image: null },
    { file: 'bg_near_street.png', factor: 0.36, y: 0, image: null },
  ];
  private groundImage: HTMLImageElement | null = null;
  private ready = false;

  public static calculateOffset(cameraX: number, factor: number, tileWidth: number): number {
    if (tileWidth <= 0) return 0;
    return ((cameraX * factor) % tileWidth + tileWidth) % tileWidth;
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0
        ? resolve(image)
        : reject(new Error(`Decoded 0x0 image: ${url}`));
      image.onerror = () => reject(new Error(`Failed to load ${url}`));
      image.src = url;
    });
  }

  public async preload(basePath: string = '/assets/world/stage1'): Promise<boolean> {
    try {
      const images = await Promise.all([
        ...this.layers.map((layer) => this.loadImage(`${basePath}/${layer.file}`)),
        this.loadImage(`${basePath}/bg_foreground_ground.png`),
      ]);
      this.layers.forEach((layer, index) => { layer.image = images[index]; });
      this.groundImage = images[images.length - 1];
      this.ready = true;
    } catch (error) {
      console.warn('[Parallax] Stage 1 background activation blocked; using safe fallback.', error);
      this.ready = false;
    }
    return this.ready;
  }

  public isReady(): boolean {
    return this.ready;
  }

  public renderBackground(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    viewportWidth: number,
    viewportHeight: number
  ): boolean {
    if (!this.ready) return false;

    for (const layer of this.layers) {
      const image = layer.image;
      if (!image) return false;
      const offset = ParallaxBackgroundRenderer.calculateOffset(camera.x, layer.factor, image.width);
      ctx.save();
      // Preserve the sunset identity while reserving contrast for actors.
      // Nearer, busier layers receive a slightly stronger reduction.
      ctx.filter = layer.factor >= 0.3
        ? 'saturate(0.82) brightness(0.90)'
        : layer.factor >= 0.2
        ? 'saturate(0.88) brightness(0.94)'
        : 'saturate(0.94) brightness(0.97)';
      for (let x = -offset; x < viewportWidth; x += image.width) {
        ctx.drawImage(image, Math.round(x), layer.y, image.width, image.height);
        if (layer.factor >= 0.3) this.renderStreetSigns(ctx, Math.round(x), layer.y);
      }
      ctx.restore();
    }

    // Subtle dusk veil keeps silhouettes and UI readable over detailed art.
    ctx.fillStyle = 'rgba(16, 20, 30, 0.12)';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    return true;
  }
  private renderStreetSigns(ctx: CanvasRenderingContext2D, tileX: number, tileY: number): void {
    const signs = [
      { x: 848, y: 317, w: 230, h: 48, text: 'CƠM TẤM CÔ NĂM', color: '#f59e0b', sub: 'ĐÊM KHUYA • CHUẨN VỊ SÀI GÒN' },
      { x: 1512, y: 320, w: 230, h: 48, text: 'SỬA XE TƯ LÙN', color: '#38bdf8', sub: 'VÁ VỎ • THAY NHỚT 24/7' },
    ];
    ctx.save();
    for (const sign of signs) {
      const x = tileX + sign.x;
      const y = tileY + sign.y;
      if (x + sign.w < 0 || x > 1280) continue;

      // 1. Hanging wrought iron chains from shophouse eaves
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 24, y - 10); ctx.lineTo(x + 24, y);
      ctx.moveTo(x + sign.w - 24, y - 10); ctx.lineTo(x + sign.w - 24, y);
      ctx.stroke();

      // 2. Weathered vintage wooden / enamel signboard plate
      const bgGrad = ctx.createLinearGradient(x, y, x, y + sign.h);
      if (sign.color === '#f59e0b') {
        bgGrad.addColorStop(0, '#2d1808');
        bgGrad.addColorStop(0.5, '#1e0e04');
        bgGrad.addColorStop(1, '#120701');
      } else {
        bgGrad.addColorStop(0, '#0c2338');
        bgGrad.addColorStop(0.5, '#071624');
        bgGrad.addColorStop(1, '#030a12');
      }
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, sign.w, sign.h, 4);
      ctx.fill();

      // 3. Aged metallic border with corner rivets
      ctx.strokeStyle = sign.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x + 2, y + 2, sign.w - 4, 1);

      // Corner rivets
      ctx.fillStyle = sign.color;
      const r = 1.8;
      ctx.beginPath();
      ctx.arc(x + 6, y + 6, r, 0, Math.PI * 2);
      ctx.arc(x + sign.w - 6, y + 6, r, 0, Math.PI * 2);
      ctx.arc(x + 6, y + sign.h - 6, r, 0, Math.PI * 2);
      ctx.arc(x + sign.w - 6, y + sign.h - 6, r, 0, Math.PI * 2);
      ctx.fill();

      // 4. Authentic Hand-painted Signboard Lettering
      ctx.shadowColor = sign.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#fffbeb';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(sign.text, x + sign.w / 2, y + 26, sign.w - 24);
      ctx.shadowBlur = 0;

      // Subtitle tagline
      ctx.fillStyle = sign.color;
      ctx.font = 'bold 9px monospace';
      ctx.fillText(sign.sub, x + sign.w / 2, y + 40, sign.w - 24);
    }
    ctx.restore();
  }

  public renderGroundSegments(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    groundSegments: Rect[]
  ): void {
    const image = this.groundImage;
    if (!this.ready || !image) return;

    const firstTileWorldX = Math.floor(camera.x / image.width) * image.width;
    for (const segment of groundSegments) {
      const screen = camera.worldToScreen(segment.x, segment.y);
      if (screen.x + segment.width < 0 || screen.x > camera.width) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(screen.x, screen.y, segment.width, segment.height);
      ctx.clip();
      for (
        let tileWorldX = firstTileWorldX;
        tileWorldX < camera.x + camera.width + image.width;
        tileWorldX += image.width
      ) {
        ctx.drawImage(image, Math.round(tileWorldX - camera.x), screen.y, image.width, image.height);
      }
      ctx.restore();
    }
  }
}
