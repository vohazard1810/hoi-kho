import { Camera } from '../core/Camera';
import { HazardData, PlatformData } from '../config/stage1';

type GeometryAssetKey = 'awning' | 'wood' | 'balcony' | 'gate' | 'hazard';

export class WorldGeometryRenderer {
  private readonly images = new Map<GeometryAssetKey, HTMLImageElement>();
  private ready = false;

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

  public async preload(basePath: string = '/assets/world/geometry'): Promise<boolean> {
    const contracts: [GeometryAssetKey, string][] = [
      ['awning', 'platform_awning.png'],
      ['wood', 'platform_wood.png'],
      ['balcony', 'platform_balcony.png'],
      ['gate', 'encounter_gate.png'],
      ['hazard', 'street_hazard.png'],
    ];
    try {
      const loaded = await Promise.all(contracts.map(([, file]) => this.loadImage(`${basePath}/${file}`)));
      contracts.forEach(([key], index) => this.images.set(key, loaded[index]));
      this.ready = true;
    } catch (error) {
      this.images.clear();
      this.ready = false;
      console.warn('[WorldGeometry] Activation blocked; retaining geometric fallback.', error);
    }
    return this.ready;
  }

  public isReady(): boolean {
    return this.ready;
  }

  public static platformVariant(platformId: string): GeometryAssetKey {
    const zone = /^p_([a-e])\d+$/i.exec(platformId)?.[1].toLowerCase() ?? 'a';
    if (zone === 'b' || zone === 'd') return 'wood';
    if (zone === 'c') return 'balcony';
    return 'awning';
  }

  public renderPlatforms(ctx: CanvasRenderingContext2D, camera: Camera, platforms: PlatformData[]): boolean {
    if (!this.ready) return false;
    for (const platform of platforms) {
      const image = this.images.get(WorldGeometryRenderer.platformVariant(platform.id));
      if (!image) return false;
      const screen = camera.worldToScreen(platform.x, platform.y);
      if (screen.x + platform.width < 0 || screen.x > camera.width) continue;
      ctx.drawImage(image, screen.x, screen.y, platform.width, 64);

      // Unified Walkable Surface Contract: crisp warm amber/white top edge highlight
      ctx.save();
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(screen.x, screen.y, platform.width, 2.5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(screen.x + 2, screen.y, platform.width - 4, 1);
      ctx.restore();
    }
    return true;
  }

  public renderHazards(ctx: CanvasRenderingContext2D, camera: Camera, hazards: HazardData[], devMode: boolean): boolean {
    const image = this.images.get('hazard');
    if (!this.ready || !image) return false;
    for (const hazard of hazards) {
      if (hazard.type === 'puddle' || hazard.type === 'trash') continue;
      const screen = camera.worldToScreen(hazard.x - 40, hazard.y - 70);
      if (screen.x + 160 < 0 || screen.x > camera.width) continue;
      ctx.drawImage(image, screen.x, screen.y, 160, 100);
      if (devMode) {
        const hitbox = camera.worldToScreen(hazard.x, hazard.y);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(hitbox.x, hitbox.y, hazard.width, hazard.height);
      }
    }
    return true;
  }

  public renderEncounterGates(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    gates: { id: string; gateX: number; isLocked: boolean }[],
    devMode: boolean
  ): boolean {
    const image = this.images.get('gate');
    if (!this.ready || !image) return false;
    ctx.save();
    for (const gate of gates) {
      const screen = camera.worldToScreen(gate.gateX - 48, 240);
      if (screen.x + 96 < 0 || screen.x > camera.width) continue;
      if (gate.isLocked) {
        ctx.drawImage(image, screen.x, screen.y, 96, 380);
        const pulse = 0.3 + Math.sin(performance.now() * 0.008) * 0.12;
        ctx.fillStyle = `rgba(255, 144, 42, ${pulse})`;
        ctx.beginPath();
        ctx.arc(screen.x + 18, screen.y + 26, 13, 0, Math.PI * 2);
        ctx.fill();
      }
      if (devMode) {
        const line = camera.worldToScreen(gate.gateX, 240);
        ctx.strokeStyle = gate.isLocked ? '#ef4444' : '#22c55e';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + 380);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`GATE ${gate.id}`, line.x, line.y + 190);
      }
    }
    ctx.restore();
    return true;
  }
}
