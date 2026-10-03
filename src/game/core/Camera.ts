import { BALANCE } from '../config/balance';
import { GAME_CONFIG } from '../config/gameConfig';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public width: number = GAME_CONFIG.VIEWPORT_WIDTH;
  public height: number = GAME_CONFIG.VIEWPORT_HEIGHT;

  public worldWidth: number = GAME_CONFIG.VIEWPORT_WIDTH;
  public worldHeight: number = GAME_CONFIG.VIEWPORT_HEIGHT;
  private shakeRemaining: number = 0;
  private shakeDuration: number = 0;
  private shakeIntensity: number = 0;
  private shakeX: number = 0;
  private shakeY: number = 0;

  constructor(worldWidth?: number, worldHeight?: number) {
    this.setWorldBounds(
      worldWidth ?? GAME_CONFIG.VIEWPORT_WIDTH,
      worldHeight ?? GAME_CONFIG.VIEWPORT_HEIGHT
    );
  }

  public setWorldBounds(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.clamp();
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.clamp();
  }

  public startShake(intensity: number, duration: number): void {
    if (intensity <= 0 || duration <= 0) return;
    if (intensity >= this.shakeIntensity || this.shakeRemaining <= 0) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
    }
    this.shakeRemaining = Math.max(this.shakeRemaining, duration);
  }

  public updateShake(dt: number): void {
    if (this.shakeRemaining <= 0) { this.shakeX = 0; this.shakeY = 0; return; }
    this.shakeRemaining = Math.max(0, this.shakeRemaining - dt);
    const strength = this.shakeDuration > 0 ? this.shakeRemaining / this.shakeDuration : 0;
    const phase = this.shakeRemaining * 170;
    this.shakeX = Math.sin(phase) * this.shakeIntensity * strength;
    this.shakeY = Math.cos(phase * 1.37) * this.shakeIntensity * 0.65 * strength;
  }

  public update(
    targetX: number,
    targetY: number,
    targetFacing: 'left' | 'right',
    dt: number
  ): void {
    // Lookahead in target's facing direction
    const lookahead = targetFacing === 'right' ? BALANCE.CAMERA_LOOKAHEAD_X : -BALANCE.CAMERA_LOOKAHEAD_X;
    const targetCenterX = targetX + lookahead;
    const currentCenterX = this.x + this.width / 2;

    const diffX = targetCenterX - currentCenterX;
    const deadzone = BALANCE.CAMERA_DEADZONE_X;

    let targetCamX = this.x;
    if (Math.abs(diffX) > deadzone) {
      const shift = diffX > 0 ? diffX - deadzone : diffX + deadzone;
      targetCamX = this.x + shift;
    }

    // Smooth lerp
    // Frame-rate independent lerp: 1 - Math.exp(-decay * dt) or standard lerp
    const lerpFactor = 1 - Math.pow(1 - BALANCE.CAMERA_LERP, dt * 60);
    this.x += (targetCamX - this.x) * lerpFactor;

    // Center vertical around target with vertical deadzone to prevent jump bobbing
    const desiredCamY = targetY - this.height * 0.65;
    const diffY = desiredCamY - this.y;
    const deadzoneY = 46; // Smooth deadzone for jump stability
    let targetCamY = this.y;
    if (Math.abs(diffY) > deadzoneY) {
      const shiftY = diffY > 0 ? diffY - deadzoneY : diffY + deadzoneY;
      targetCamY = this.y + shiftY;
    }
    this.y += (targetCamY - this.y) * (lerpFactor * 0.85);

    this.clamp();
  }

  private clamp(): void {
    const maxX = Math.max(0, this.worldWidth - this.width);
    const maxY = Math.max(0, this.worldHeight - this.height);

    if (this.x < 0) this.x = 0;
    if (this.x > maxX) this.x = maxX;

    if (this.y < 0) this.y = 0;
    if (this.y > maxY) this.y = maxY;
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.round(worldX - this.x + this.shakeX),
      y: Math.round(worldY - this.y + this.shakeY),
    };
  }

  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }
}
