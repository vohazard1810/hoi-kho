import { BALANCE } from '../config/balance';
import { PickupType, Rect } from '../core/types';

export class Pickup {
  public id: string;
  public type: PickupType;
  public x: number;
  public y: number;
  public width: number = 28;
  public height: number = 28;
  public isCollected: boolean = false;
  public time: number = Math.random() * Math.PI * 2;
  public isMagnetized: boolean = false;
  public spawnAlpha: number = 0;
  private readonly groundY: number;
  private vx: number;
  private vy: number;
  private bouncesRemaining: number = 1;

  constructor(id: string, type: PickupType, x: number, y: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.groundY = y;
    this.vx = (Math.random() - 0.5) * 90;
    this.vy = -150 - Math.random() * 55;
  }

  public update(dt: number): void {
    this.time += dt * BALANCE.PICKUP_BOB_SPEED;
    this.spawnAlpha = Math.min(1, this.spawnAlpha + dt * 8);
    if (this.isMagnetized) return;
    if (this.bouncesRemaining >= 0 || this.y < this.groundY) {
      this.vy += 620 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        if (this.bouncesRemaining > 0) { this.vy = -Math.max(45, Math.abs(this.vy) * 0.34); this.vx *= 0.55; this.bouncesRemaining--; }
        else { this.vy = 0; this.vx = 0; this.bouncesRemaining = -1; }
      }
    }
  }

  public attractTo(playerRect: Rect, dt: number): void {
    const px = playerRect.x + playerRect.width / 2;
    const py = playerRect.y + playerRect.height / 2;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    const distance = Math.hypot(dx, dy);
    this.isMagnetized = distance > BALANCE.PICKUP_RADIUS && distance <= BALANCE.PICKUP_MAGNET_RADIUS;
    if (!this.isMagnetized || distance <= 0) return;
    this.bouncesRemaining = -1;
    const speed = BALANCE.PICKUP_MAGNET_SPEED * (1 + (1 - distance / BALANCE.PICKUP_MAGNET_RADIUS));
    this.x += (dx / distance) * speed * dt;
    this.y += (dy / distance) * speed * dt;
  }

  public getRenderY(): number {
    return this.y + Math.sin(this.time) * 4;
  }

  public checkCollection(playerRect: Rect): boolean {
    if (this.isCollected) return false;

    const px = playerRect.x + playerRect.width / 2;
    const py = playerRect.y + playerRect.height / 2;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    const dx = px - cx;
    const dy = py - cy;
    const distSq = dx * dx + dy * dy;

    return distSq <= BALANCE.PICKUP_RADIUS * BALANCE.PICKUP_RADIUS;
  }
}
