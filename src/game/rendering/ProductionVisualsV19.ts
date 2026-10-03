import { Camera } from '../core/Camera';
import { PickupType } from '../core/types';
import { Pickup } from '../entities/Pickup';
import { Rival } from '../entities/Rival';

type AssetKey = PickupType | 'PARCEL_PRISTINE' | 'PARCEL_DENTED' | 'PARCEL_CRACKED' |
  'PARCEL_CRITICAL' | 'RIVAL_DRIVEBY' | 'RIVAL_WRECK' | 'NINJA_LEAD' | 'PROLOGUE_1' | 'PROLOGUE_2' |
  'PROLOGUE_3' | 'PROLOGUE_4';

const FILES: Record<AssetKey, string> = {
  HEALTH: '/assets/pickups/health_banh_mi.png',
  PARCEL_REPAIR: '/assets/pickups/parcel_repair_tape.png',
  MOMENTUM: '/assets/pickups/momentum_drink.png',
  PARTS: '/assets/pickups/parts_bolt.png',
  BONUS_REWARD: '/assets/pickups/bonus_coin.png',
  PARCEL_PRISTINE: '/assets/parcels/fragile_pristine.png',
  PARCEL_DENTED: '/assets/parcels/fragile_dented.png',
  PARCEL_CRACKED: '/assets/parcels/fragile_cracked.png',
  PARCEL_CRITICAL: '/assets/parcels/fragile_critical.png',
  RIVAL_DRIVEBY: '/assets/rival/rival_driveby.png',
  RIVAL_WRECK: '/assets/rival/rival_wreck.png',
  NINJA_LEAD: '/assets/hazards/ninja_lead.png',
  PROLOGUE_1: '/assets/prologue/beat_1_debt.png',
  PROLOGUE_2: '/assets/prologue/beat_2_bridge.png',
  PROLOGUE_3: '/assets/prologue/beat_3_flyer.png',
  PROLOGUE_4: '/assets/prologue/beat_4_hub.png',
};

export class ProductionVisualsV19 {
  private readonly images = new Map<AssetKey, HTMLImageElement>();
  private ready = false;

  private load(key: AssetKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
          reject(new Error(`Decoded 0x0 image: ${FILES[key]}`));
          return;
        }
        this.images.set(key, image);
        resolve();
      };
      image.onerror = () => reject(new Error(`Failed to load ${FILES[key]}`));
      image.src = FILES[key];
    });
  }

  public async preload(): Promise<boolean> {
    const keys = Object.keys(FILES) as AssetKey[];
    const results = await Promise.allSettled(keys.map((key) => this.load(key)));
    const failed = results.filter((result) => result.status === 'rejected');
    this.ready = this.images.size > 0;
    if (failed.length > 0) {
      console.warn(`[V19Visuals] ${failed.length}/${keys.length} asset(s) failed; using per-asset fallbacks.`, failed);
    }
    return this.ready;
  }

  public isReady(): boolean { return this.ready; }

  public renderPickup(ctx: CanvasRenderingContext2D, camera: Camera, pickup: Pickup): boolean {
    const image = this.images.get(pickup.type);
    if (!this.ready || !image) return false;
    const pos = camera.worldToScreen(pickup.x, pickup.getRenderY());
    const pulse = 1 + Math.sin(pickup.time * 1.5) * 0.05;
    const size = 42 * pulse;
    ctx.save();
    ctx.globalAlpha = pickup.spawnAlpha;
    ctx.shadowColor = pickup.isMagnetized ? '#fb923c' : '#e2e8f0';
    ctx.shadowBlur = pickup.isMagnetized ? 16 : 7;
    ctx.drawImage(image, pos.x + 14 - size / 2, pos.y + 14 - size / 2, size, size);
    ctx.restore();
    return true;
  }

  public parcelKey(condition: number): AssetKey {
    if (condition > 70) return 'PARCEL_PRISTINE';
    if (condition > 40) return 'PARCEL_DENTED';
    if (condition > 20) return 'PARCEL_CRACKED';
    return 'PARCEL_CRITICAL';
  }

  public renderParcel(ctx: CanvasRenderingContext2D, condition: number, x: number, y: number, w: number, h: number): boolean {
    const image = this.images.get(this.parcelKey(condition));
    if (!this.ready || !image) return false;
    ctx.drawImage(image, x, y, w, h);
    return true;
  }

  public renderPrologue(ctx: CanvasRenderingContext2D, index: number, width: number, height: number, alpha = 1): boolean {
    const keys: AssetKey[] = ['PROLOGUE_1', 'PROLOGUE_2', 'PROLOGUE_3', 'PROLOGUE_4'];
    const image = this.images.get(keys[index] ?? keys[0]);
    if (!this.ready || !image) return false;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
    return true;
  }

  public renderRivalVehicle(ctx: CanvasRenderingContext2D, camera: Camera, rival: Rival): boolean {
    if (!this.ready) return false;
    if (rival.driveByPhase === 'WARNING' || rival.driveByPhase === 'ACTIVE') {
      const image = this.images.get('RIVAL_DRIVEBY');
      if (!image) return false;
      const pos = camera.worldToScreen(rival.x - 88, rival.y - 42);
      ctx.save();
      if (rival.facing === 'left') {
        ctx.translate(pos.x + 210, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, pos.y, 210, 126);
      } else {
        ctx.drawImage(image, pos.x, pos.y, 210, 126);
      }
      ctx.restore();
      return true;
    }
    if (rival.wreckX !== null) {
      const image = this.images.get('RIVAL_WRECK');
      if (!image) return false;
      const pos = camera.worldToScreen(rival.wreckX - 90, rival.y + rival.height - 62);
      ctx.save();
      ctx.globalAlpha = rival.isAlive ? 0.88 : 0.72;
      ctx.drawImage(image, pos.x, pos.y, 170, 85);
      ctx.restore();
    }
    return false;
  }

  public renderNinjaLead(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    x: number,
    y: number,
    facing: 'left' | 'right'
  ): boolean {
    const image = this.images.get('NINJA_LEAD');
    if (!this.ready || !image) return false;
    const pos = camera.worldToScreen(x, y);
    // Render high-res scooter matching gameplay scale
    const drawW = 160;
    const drawH = 134; // matches aspect ratio ~260x217
    ctx.save();
    if (facing === 'right') {
      ctx.translate(pos.x, pos.y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -drawW / 2, -drawH + 18, drawW, drawH);
    } else {
      ctx.drawImage(image, pos.x - drawW / 2, pos.y - drawH + 18, drawW, drawH);
    }
    ctx.restore();
    return true;
  }
}
