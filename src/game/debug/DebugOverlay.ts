import { Camera } from '../core/Camera';
import { Hitbox, Hurtbox, Rect } from '../core/types';
import { Player } from '../entities/Player';
import { AssetManager } from '../assets/AssetManager';

export interface PlayerDebugTelemetry {
  visualState: string;
  frameIndex: number;
  totalFrames: number;
  animTime: number;
  renderMode: 'SPRITE' | 'FALLBACK_GRAYBOX';
}

export class DebugOverlay {
  public static render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    player: Player,
    sceneName: string,
    parcelCondition: number,
    activeEnemyCount: number,
    activePickupCount: number,
    currentZone: string,
    currentEncounter: string,
    bossPhase: number,
    hurtboxes: Hurtbox[],
    hitboxes: (Hitbox | null)[],
    groundSegments: Rect[],
    playerTelemetry?: PlayerDebugTelemetry
  ): void {
    ctx.save();

    // 1. Draw Ground Sensors & Platform boundaries in cyan/blue
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    for (const g of groundSegments) {
      const pos = camera.worldToScreen(g.x, g.y);
      ctx.strokeRect(pos.x, pos.y, g.width, g.height);
    }

    // 2. Draw Hurtboxes in GREEN (or yellow if invulnerable)
    ctx.lineWidth = 1.5;
    for (const hb of hurtboxes) {
      const pos = camera.worldToScreen(hb.x, hb.y);
      ctx.strokeStyle = hb.isInvulnerable ? '#eab308' : '#22c55e';
      ctx.strokeRect(pos.x, pos.y, hb.width, hb.height);
    }

    // 3. Draw Hitboxes in RED
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    for (const hb of hitboxes) {
      if (!hb) continue;
      const pos = camera.worldToScreen(hb.x, hb.y);
      ctx.strokeRect(pos.x, pos.y, hb.width, hb.height);
    }

    // 4. Telemetry Card (Top-Right)
    const cardX = camera.width - 290;
    const cardY = 16;
    const cardW = 274;
    const cardH = 340;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';

    ctx.fillText(`[ DEV MODE / ASSET AUDIT ]`, cardX + 10, cardY + 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText(`Scene: ${sceneName} | 60 FPS (16.6ms)`, cardX + 10, cardY + 34);
    ctx.fillText(`Zone: ${currentZone}`, cardX + 10, cardY + 48);
    ctx.fillText(`Encounter: ${currentEncounter}`, cardX + 10, cardY + 62);
    ctx.fillText(`Boss Phase: ${bossPhase}`, cardX + 10, cardY + 76);
    ctx.fillText(`Loco: ${player.locomotionState} | Act: ${player.actionState}`, cardX + 10, cardY + 90);
    ctx.fillText(`Combo: ${player.comboStep} (${player.attackPhase})`, cardX + 10, cardY + 104);
    ctx.fillText(`HP: ${Math.round(player.hp)} / ${player.maxHp}`, cardX + 10, cardY + 118);
    ctx.fillText(`Parcel: ${Math.round(parcelCondition)}%`, cardX + 10, cardY + 132);
    ctx.fillText(`Enemies: ${activeEnemyCount} | Pickups: ${activePickupCount}`, cardX + 10, cardY + 146);
    ctx.fillText(`Pos: (${Math.round(player.x)}, ${Math.round(player.y)})`, cardX + 10, cardY + 160);

    // Player Animation & Asset Telemetry
    const assetManager = AssetManager.getInstance();
    const playerStatus = assetManager.getCharacterStatus('player');
    const sourcePath = assetManager.getSourcePath('player');

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`--- PLAYER ANIM & ASSET AUDIT ---`, cardX + 10, cardY + 180);

    ctx.fillStyle = playerStatus === 'PRODUCTION' ? '#4ade80' : '#f59e0b';
    ctx.fillText(`Asset Status: ${playerStatus}`, cardX + 10, cardY + 196);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Source: ${sourcePath}`, cardX + 10, cardY + 210);

    const vState = playerTelemetry?.visualState || player.currentVisualState;
    const fIdx = playerTelemetry?.frameIndex ?? 0;
    const fTotal = playerTelemetry?.totalFrames ?? 0;
    const aTime = playerTelemetry?.animTime ?? player.animTime;
    const rMode = playerTelemetry?.renderMode ?? (playerStatus === 'PRODUCTION' ? 'SPRITE' : 'FALLBACK_GRAYBOX');

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Visual State: [ ${vState.toUpperCase()} ]`, cardX + 10, cardY + 226);
    ctx.fillText(`Frame Index:  ${fIdx} / ${fTotal > 0 ? fTotal : '-'}`, cardX + 10, cardY + 242);
    ctx.fillText(`Anim Elapsed: ${aTime.toFixed(3)}s`, cardX + 10, cardY + 258);

    ctx.fillStyle = rMode === 'SPRITE' ? '#4ade80' : '#fb923c';
    ctx.fillText(`Render Mode:  ${rMode}`, cardX + 10, cardY + 274);

    // Enemies asset status
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`--- OTHER CHARACTERS ---`, cardX + 10, cardY + 294);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      `Rival: ${assetManager.getCharacterStatus('rival')} | Dog: ${assetManager.getCharacterStatus('dog')}`,
      cardX + 10,
      cardY + 310
    );
    ctx.fillText(
      `Thug:  ${assetManager.getCharacterStatus('thug')} | Boss: ${assetManager.getCharacterStatus('boss_dog')}`,
      cardX + 10,
      cardY + 326
    );

    ctx.restore();
  }
}
