import { BALANCE } from '../config/balance';
import { GAME_CONFIG } from '../config/gameConfig';
import { Camera } from '../core/Camera';
import { DeliveryResultData, Hitbox, Hurtbox, Rect } from '../core/types';
import { BossDog } from '../entities/BossDog';
import { Dog } from '../entities/Dog';
import { NPC } from '../entities/NPC';
import { Pickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { HazardData, PlatformData, ZoneData } from '../config/stage1';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { AssetManager } from '../assets/AssetManager';

export class PlaceholderRenderer {
  private static playerPortrait: HTMLImageElement | null = null;

  private static getPlayerPortrait(): HTMLImageElement | null {
    if (typeof Image === 'undefined') return null;
    if (!this.playerPortrait) {
      this.playerPortrait = new Image();
      this.playerPortrait.src = '/assets/ui/portrait_player.png';
    }
    return this.playerPortrait.complete && this.playerPortrait.naturalWidth > 0 ? this.playerPortrait : null;
  }

  public static renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number, theme: 'hub' | 'stage1'): void {
    if (theme === 'hub') {
      // Hub Background - clean warm neutral workshop ambiance
      ctx.fillStyle = '#1e242b';
      ctx.fillRect(0, 0, width, height);

      // Warehouse / Hub rafters
      ctx.strokeStyle = '#2b333d';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 160) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 620);
        ctx.stroke();
      }

      // Hub sign banner
      ctx.fillStyle = '#26303b';
      ctx.fillRect(440, 60, 400, 70);
      ctx.strokeStyle = '#3e4c5e';
      ctx.strokeRect(440, 60, 400, 70);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRẠM GIAO HÀNG SXP (HUB)', 640, 102);
    } else {
      // Stage 1 - Moody alleyway backdrop
      ctx.fillStyle = '#14181d';
      ctx.fillRect(0, 0, width, height);

      // Distant building silhouettes
      ctx.fillStyle = '#1c2229';
      ctx.fillRect(0, 180, width, 440);

      // Overhead wires
      ctx.strokeStyle = '#232b35';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 220);
      ctx.bezierCurveTo(width * 0.3, 290, width * 0.7, 180, width, 240);
      ctx.stroke();
    }
  }

  public static renderPlatforms(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    groundSegments: Rect[],
    platforms: PlatformData[],
    hazards: HazardData[],
    zones: ZoneData[],
    skipGroundRendering: boolean = false,
    skipWorldGeometry: boolean = false,
    cueOpacities?: Record<string, number>
  ): void {
    // Render Zone Labels
    for (const zone of zones) {
      const screenPos = camera.worldToScreen(zone.startX + 20, 140);
      if (screenPos.x > -400 && screenPos.x < camera.width + 100) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(screenPos.x, screenPos.y, 220, 36);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(screenPos.x, screenPos.y, 220, 36);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[ ${zone.id} ] ${zone.name}`, screenPos.x + 12, screenPos.y + 24);
      }
    }

    // Render gray ground only when the production road layer is unavailable.
    if (!skipGroundRendering) {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      for (const g of groundSegments) {
        const pos = camera.worldToScreen(g.x, g.y);
        if (pos.x + g.width >= 0 && pos.x <= camera.width) {
          ctx.fillRect(pos.x, pos.y, g.width, g.height);
          ctx.strokeRect(pos.x, pos.y, g.width, g.height);

          // Ground top edge accent
          ctx.fillStyle = '#64748b';
          ctx.fillRect(pos.x, pos.y, g.width, 4);
          ctx.fillStyle = '#334155';
        }
      }
    }

    if (!skipWorldGeometry) {
      // Render Elevated Platforms
      for (const p of platforms) {
        const pos = camera.worldToScreen(p.x, p.y);
        if (pos.x + p.width >= 0 && pos.x <= camera.width) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(pos.x, pos.y, p.width, p.height);
          ctx.strokeStyle = '#64748b';
          ctx.strokeRect(pos.x, pos.y, p.width, p.height);

          // Top edge
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(pos.x, pos.y, p.width, 3);
        }
      }

      // Render Pit Hazards
      for (const h of hazards) {
        if (h.type === 'puddle' || h.type === 'trash') continue;
        const pos = camera.worldToScreen(h.x, h.y);
        if (pos.x + h.width >= 0 && pos.x <= camera.width) {
          ctx.fillStyle = '#7f1d1d';
          ctx.fillRect(pos.x, pos.y, h.width, h.height);
          ctx.strokeStyle = '#ef4444';
          ctx.strokeRect(pos.x, pos.y, h.width, h.height);

          ctx.fillStyle = '#ef4444';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('HỐ SÂU', pos.x + h.width / 2, pos.y + 18);
        }
      }
    }

    // Render Ground Obstacles (Puddles with telegraph, Low Trash Piles)
    for (const h of hazards) {
      if (h.type === 'puddle') {
        const pos = camera.worldToScreen(h.x, h.y);
        if (pos.x + h.width >= 0 && pos.x <= camera.width) {
          ctx.save();
          // Water puddle body
          ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(pos.x + h.width / 2, pos.y + h.height / 2, h.width / 2, h.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Water ripple / reflection lines
          const ripplePhase = (performance.now() * 0.003) % 1;
          ctx.strokeStyle = `rgba(224, 242, 254, ${0.7 - ripplePhase * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(pos.x + h.width / 2, pos.y + h.height / 2, (h.width / 2) * (0.3 + ripplePhase * 0.6), (h.height / 2) * (0.3 + ripplePhase * 0.6), 0, 0, Math.PI * 2);
          ctx.stroke();

          // Telegraph warning cue above puddle (fade within 1.2s on first approach)
          const cueAlpha = cueOpacities ? (cueOpacities[h.id] ?? 0) : 0;
          if (cueAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = cueAlpha;
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('≈ TRƠN ≈', pos.x + h.width / 2, pos.y - 4);
            ctx.restore();
          }
          ctx.restore();
        }
      } else if (h.type === 'trash') {
        const pos = camera.worldToScreen(h.x, h.y);
        if (pos.x + h.width >= 0 && pos.x <= camera.width) {
          ctx.save();
          // Low trash / ve chai pile (cardboard carton + scrap)
          ctx.fillStyle = '#78350f';
          ctx.fillRect(pos.x + 4, pos.y + 2, h.width - 8, h.height - 2);
          ctx.strokeStyle = '#a16207';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(pos.x + 4, pos.y + 2, h.width - 8, h.height - 2);

          // Tape / band on carton
          ctx.fillStyle = '#fde047';
          ctx.fillRect(pos.x + 8, pos.y + 6, h.width - 16, 3);

          // Small scrap bottle next to carton
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc(pos.x + h.width - 4, pos.y + h.height - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Telegraph cue (fade within 1.2s on first approach)
          const cueAlpha = cueOpacities ? (cueOpacities[h.id] ?? 0) : 0;
          if (cueAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = cueAlpha;
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 8px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▲ RÁC', pos.x + h.width / 2, pos.y - 3);
            ctx.restore();
          }
          ctx.restore();
        }
      }
    }
  }

  public static renderEncounterGates(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    gates: { id: string; gateX: number; isLocked: boolean }[]
  ): void {
    ctx.save();
    for (const gate of gates) {
      const pos = camera.worldToScreen(gate.gateX, 240);
      if (pos.x >= -60 && pos.x <= camera.width + 60) {
        if (gate.isLocked) {
          // Locked Barrier Laser / Gate
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.fillRect(pos.x - 10, pos.y, 20, 380);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x, pos.y + 380);
          ctx.stroke();

          // Gate warning badge
          ctx.fillStyle = 'rgba(185, 28, 28, 0.9)';
          ctx.fillRect(pos.x - 60, pos.y + 140, 120, 32);
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 1;
          ctx.strokeRect(pos.x - 60, pos.y + 140, 120, 32);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`CỬA CHẶN ${gate.id}`, pos.x, pos.y + 160);
        } else {
          // Cleared / Open indicator
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x, pos.y + 380);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    ctx.restore();
  }

  public static renderPlayer(ctx: CanvasRenderingContext2D, camera: Camera, player: Player): void {
    const pos = camera.worldToScreen(player.x, player.y);

    ctx.save();

    // Invulnerability flashing or dodge transparency
    if (player.actionState === 'DODGE') {
      ctx.globalAlpha = 0.5;
    } else if (player.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Player Body: ORANGE RECTANGLE
    ctx.fillStyle = player.actionState === 'HURT' ? '#ef4444' : '#f97316';
    ctx.fillRect(pos.x, pos.y, player.width, player.height);

    // Border
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x, pos.y, player.width, player.height);

    // Parcel backpack on back
    ctx.fillStyle = '#b45309';
    const backpackX = player.facing === 'right' ? pos.x - 6 : pos.x + player.width - 6;
    ctx.fillRect(backpackX, pos.y + 16, 12, 26);
    ctx.strokeStyle = '#78350f';
    ctx.strokeRect(backpackX, pos.y + 16, 12, 26);

    // Facing indicator (eye / visor)
    ctx.fillStyle = '#ffffff';
    const eyeX = player.facing === 'right' ? pos.x + player.width - 10 : pos.x + 4;
    ctx.fillRect(eyeX, pos.y + 12, 6, 6);

    // Attack visual feedback
    if (player.actionState === 'ATTACK' && player.attackPhase === 'ACTIVE') {
      const hitbox = player.getActiveHitbox();
      if (hitbox) {
        const hbPos = camera.worldToScreen(hitbox.x, hitbox.y);
        if (player.comboStep === 'ULTIMATE') {
          // AOE Ring pulse
          ctx.fillStyle = 'rgba(249, 115, 22, 0.3)';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(
            pos.x + player.width / 2,
            pos.y + player.height / 2,
            BALANCE.ULTIMATE_RADIUS,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.stroke();
        } else {
          // Melee slash cue; physics rectangle remains invisible outside DEV overlay.
          ctx.strokeStyle = 'rgba(254, 215, 170, 0.85)';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(hbPos.x + hitbox.width / 2, hbPos.y + hitbox.height / 2, Math.max(hitbox.width, hitbox.height) * 0.48, -0.9, 0.9);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  public static renderDog(ctx: CanvasRenderingContext2D, camera: Camera, dog: Dog): void {
    const pos = camera.worldToScreen(dog.x, dog.y);

    ctx.save();
    if (!dog.isAlive) {
      ctx.globalAlpha = 0.4;
    }

    // Dog Body: URBAN ASPHALT HOUND
    ctx.fillStyle = dog.state === 'HURT' ? '#ef4444' : '#292524';
    ctx.fillRect(pos.x, pos.y, dog.width, dog.height);

    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x, pos.y, dog.width, dog.height);

    // Snout / Facing
    ctx.fillStyle = '#78350f';
    const snoutX = dog.facing === 'right' ? pos.x + dog.width - 8 : pos.x;
    ctx.fillRect(snoutX, pos.y + 12, 8, 12);

    // Amber street eyes
    ctx.fillStyle = '#f59e0b';
    const dogEyeX = dog.facing === 'right' ? pos.x + dog.width - 12 : pos.x + 6;
    ctx.fillRect(dogEyeX, pos.y + 8, 4, 4);

    // Name label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chó Dữ Hẻm', pos.x + dog.width / 2, pos.y - 8);

    // Telegraph visual cue
    if (dog.state === 'TELEGRAPH') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('!', pos.x + dog.width / 2, pos.y - 20);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.strokeRect(pos.x - 2, pos.y - 2, dog.width + 4, dog.height + 4);
    }

    // HP bar above enemy
    if (dog.isAlive && dog.hp < dog.maxHp) {
      const hpPct = Math.max(0, dog.hp / dog.maxHp);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pos.x, pos.y - 6, dog.width, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(pos.x, pos.y - 6, dog.width * hpPct, 3);
    }

    ctx.restore();
  }

  public static renderRival(ctx: CanvasRenderingContext2D, camera: Camera, rival: Rival): void {
    const pos = camera.worldToScreen(rival.x, rival.y);

    ctx.save();
    if (!rival.isAlive) {
      ctx.globalAlpha = 0.4;
    }

    // Rival Body: CRIMSON COURIER RACING JACKET
    ctx.fillStyle = rival.state === 'HURT' ? '#ef4444' : '#be123c';
    ctx.fillRect(pos.x, pos.y, rival.width, rival.height);

    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x, pos.y, rival.width, rival.height);

    // Cyan High-Tech Visor / Eye
    ctx.fillStyle = '#38bdf8';
    const eyeX = rival.facing === 'right' ? pos.x + rival.width - 10 : pos.x + 4;
    ctx.fillRect(eyeX, pos.y + 12, 6, 6);

    // Name label
    ctx.fillStyle = '#fecdd3';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Shipper Đối Thủ', pos.x + rival.width / 2, pos.y - 10);

    // Attack state visual cue
    if (rival.state === 'ATTACK_STARTUP') {
      ctx.fillStyle = '#fb7185';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('⚠️', pos.x + rival.width / 2, pos.y - 24);
    } else if (rival.state === 'ATTACK_ACTIVE') {
      const hitbox = rival.getActiveHitbox();
      if (hitbox) {
        const hbPos = camera.worldToScreen(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height / 2);
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(hbPos.x, hbPos.y, Math.max(hitbox.width, hitbox.height) * 0.48, -0.9, 0.9);
        ctx.stroke();
      }
    }

    // HP bar above enemy
    if (rival.isAlive && rival.hp < rival.maxHp) {
      const hpPct = Math.max(0, rival.hp / rival.maxHp);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pos.x, pos.y - 6, rival.width, 4);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(pos.x, pos.y - 6, rival.width * hpPct, 4);
    }

    ctx.restore();
  }

  public static renderThug(ctx: CanvasRenderingContext2D, camera: Camera, thug: Thug): void {
    const pos = camera.worldToScreen(thug.x, thug.y);

    ctx.save();
    if (!thug.isAlive) {
      ctx.globalAlpha = 0.4;
    }

    // Miniboss Body: HEAVY TACTICAL SLATE VEST
    ctx.fillStyle = thug.state === 'HURT' ? '#f87171' : '#1e293b';
    ctx.fillRect(pos.x, pos.y, thug.width, thug.height);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x, pos.y, thug.width, thug.height);

    // Red Knuckle Bandana / Accent
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(pos.x + 2, pos.y + 6, thug.width - 4, 6);

    // Steel shoulder plates
    ctx.fillStyle = '#475569';
    ctx.fillRect(pos.x - 4, pos.y + 12, 8, 14);
    ctx.fillRect(pos.x + thug.width - 4, pos.y + 12, 8, 14);

    // Label: MINIBOSS ĐẦU GẤU
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MINIBOSS', pos.x + thug.width / 2, pos.y - 20);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('ĐẦU GẤU', pos.x + thug.width / 2, pos.y - 8);

    // Attack state visual cue
    if (thug.state === 'HEAVY_TELEGRAPH' || thug.state === 'CHARGE_TELEGRAPH') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(thug.state === 'CHARGE_TELEGRAPH' ? '⚡ RUSH ⚡' : '💥 HEAVY 💥', pos.x + thug.width / 2, pos.y - 34);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.strokeRect(pos.x - 3, pos.y - 3, thug.width + 6, thug.height + 6);
    } else if (thug.state === 'HEAVY_ACTIVE' || thug.state === 'CHARGE_ACTIVE') {
      const hitbox = thug.getActiveHitbox();
      if (hitbox) {
        const hbPos = camera.worldToScreen(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(hbPos.x, hbPos.y, hitbox.width * 0.55, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // HP Bar
    if (thug.isAlive) {
      const hpPct = Math.max(0, thug.hp / thug.maxHp);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pos.x - 4, pos.y - 4, thug.width + 8, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(pos.x - 4, pos.y - 4, (thug.width + 8) * hpPct, 5);
    }

    ctx.restore();
  }

  public static renderBossDog(ctx: CanvasRenderingContext2D, camera: Camera, bossDog: BossDog): void {
    const pos = camera.worldToScreen(bossDog.x, bossDog.y);

    ctx.save();
    if (!bossDog.isAlive) {
      ctx.globalAlpha = 0.4;
    }

    // Boss Body: MIDNIGHT APEX HOUND (ENRAGED PHASE 2: TWILIGHT RAGE)
    ctx.fillStyle = bossDog.state === 'HURT' ? '#f87171' : bossDog.phase === 2 ? '#312e81' : '#18181b';
    ctx.fillRect(pos.x, pos.y, bossDog.width, bossDog.height);

    ctx.strokeStyle = bossDog.phase === 2 ? '#ef4444' : '#52525b';
    ctx.lineWidth = 3;
    ctx.strokeRect(pos.x, pos.y, bossDog.width, bossDog.height);

    // Studded Spiked Collar
    ctx.fillStyle = bossDog.phase === 2 ? '#ef4444' : '#ea580c';
    const collarX = bossDog.facing === 'right' ? pos.x + bossDog.width - 18 : pos.x + 8;
    ctx.fillRect(collarX, pos.y + 12, 10, bossDog.height - 24);

    // Glowing Golden Eyes
    ctx.fillStyle = '#eab308';
    const bossEyeX = bossDog.facing === 'right' ? pos.x + bossDog.width - 24 : pos.x + 18;
    ctx.fillRect(bossEyeX, pos.y + 16, 6, 6);

    // 6th stack red aura outline (does not tint solid red)
    if (bossDog.antiSpamLevel >= 6) {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.strokeRect(pos.x - 4, pos.y - 4, bossDog.width + 8, bossDog.height + 8);
      ctx.restore();
    }

    // Eye flash in last 0.25s of telegraph
    if (bossDog.isEyeGleamActive) {
      const eyeX = bossDog.facing === 'right' ? pos.x + bossDog.width - 24 : pos.x + 18;
      const eyeY = pos.y + 24;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(eyeX - 8, eyeY);
      ctx.lineTo(eyeX + 8, eyeY);
      ctx.moveTo(eyeX, eyeY - 8);
      ctx.lineTo(eyeX + 8, eyeY);
      ctx.stroke();
      ctx.restore();
    }

    // Label: BOSS CHÓ ĐẠI CA
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`STAGE 1 BOSS • PHASE ${bossDog.phase}`, pos.x + bossDog.width / 2, pos.y - 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('CHÓ ĐẠI CA', pos.x + bossDog.width / 2, pos.y - 6);

    // Attack visual cue
    if (
      bossDog.state === 'BITE_TELEGRAPH' ||
      bossDog.state === 'DASH_TELEGRAPH' ||
      bossDog.state === 'SLAM_TELEGRAPH'
    ) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 18px monospace';
      const attackLabel =
        bossDog.state === 'SLAM_TELEGRAPH'
          ? '💀 GROUND SLAM 💀'
          : bossDog.state === 'DASH_TELEGRAPH'
          ? '⚡ DASH POUNCE ⚡'
          : '⚠️ BITE ⚠️';
      ctx.fillText(attackLabel, pos.x + bossDog.width / 2, pos.y - 34);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.strokeRect(pos.x - 4, pos.y - 4, bossDog.width + 8, bossDog.height + 8);
    } else if (
      bossDog.state === 'BITE_ACTIVE' ||
      bossDog.state === 'DASH_ACTIVE' ||
      bossDog.state === 'SLAM_ACTIVE'
    ) {
      const hitbox = bossDog.getActiveHitbox();
      if (hitbox) {
        const hbPos = camera.worldToScreen(hitbox.x + hitbox.width / 2, hitbox.y + hitbox.height / 2);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(hbPos.x, hbPos.y, hitbox.width * 0.52, hitbox.height * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public static renderBossBar(ctx: CanvasRenderingContext2D, bossDog: BossDog): void {
    if (!bossDog.isAlive && bossDog.state === 'KO') return;

    ctx.save();
    const barW = 420;
    const barH = 14;
    const barX = (1280 - barW) / 2;
    const barY = 58;
    const dangerMaxed = bossDog.antiSpamLevel >= 6;
    const dangerNear = bossDog.antiSpamLevel >= 4;

    // Compact Background Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(barX - 10, barY - 24, barW + 20, 68);
    ctx.strokeStyle = dangerMaxed ? '#ef4444' : bossDog.phase === 2 ? '#fb7185' : '#fb923c';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 10, barY - 24, barW + 20, 68);

    // Title
    ctx.fillStyle = bossDog.phase === 2 ? '#fb7185' : '#fdba74';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(bossDog.isCounterExposed ? 'SƠ HỞ — PHẢN CÔNG NGAY!' : dangerMaxed ? 'NỘ PHẢN ĐÒN ĐÃ ĐẦY — NÉ NGAY!' : dangerNear ? 'NỘ PHẢN ĐÒN SẮP ĐẦY' : bossDog.pressureLevel >= 3 ? 'CHÓ ĐẠI CA • LÌ ĐÒN — CHỜ SƠ HỞ!' : bossDog.damageMultiplier < 1 ? 'CHÓ ĐẠI CA • GIÁP — NÉ ĐÒN!' : bossDog.phase === 2 ? 'CHÓ ĐẠI CA • NỔI GIẬN' : 'CHÓ ĐẠI CA • CHỦ HẺM', barX, barY - 8);

    // HP Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(bossDog.hp)} / ${bossDog.maxHp}`, barX + barW, barY - 8);

    // HP Bar Track
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(barX, barY, barW, barH);

    // HP Bar Fill
    const hpPct = Math.max(0, bossDog.hp / bossDog.maxHp);
    ctx.fillStyle = bossDog.phase === 2 ? '#fb7185' : '#fb923c';
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Six compact fangs communicate danger; this is not a damage-progress bar.
    const pipGap = 9;
    const pipW = 15;
    const pipH = 11;
    const pipY = barY + barH + 8;
    ctx.textAlign = 'left';
    ctx.fillStyle = dangerMaxed ? '#fecaca' : '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('NỘ PHẢN ĐÒN', barX, pipY + 9);
    for (let i = 0; i < 6; i++) {
      const px = barX + 112 + i * (pipW + pipGap);
      const active = i < bossDog.antiSpamLevel;
      const isMax = active && dangerMaxed;
      ctx.fillStyle = isMax ? '#ef4444' : active ? '#f97316' : '#334155';
      ctx.beginPath();
      ctx.moveTo(px, pipY);
      ctx.lineTo(px + pipW, pipY);
      ctx.lineTo(px + pipW / 2, pipY + pipH);
      ctx.closePath();
      ctx.fill();
      if (isMax) {
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = dangerMaxed ? '#fca5a5' : '#64748b';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(dangerMaxed ? 'PHẢN ĐÒN SẮP TỚI' : 'CÀNG ĐẦY CÀNG NGUY HIỂM', barX + barW, pipY + 9);

    ctx.restore();
  }

  public static renderPickups(ctx: CanvasRenderingContext2D, camera: Camera, pickups: Pickup[]): void {
    ctx.save();

    for (const pickup of pickups) {
      const renderY = pickup.getRenderY();
      const pos = camera.worldToScreen(pickup.x, renderY);

      if (pos.x < -50 || pos.x > camera.width + 50) continue;

      if (pickup.isMagnetized) {
        ctx.strokeStyle = 'rgba(253,186,116,0.42)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pos.x + 14, pos.y + 14); ctx.lineTo(pos.x + 14 - Math.cos(pickup.time) * 20, pos.y + 14 + Math.sin(pickup.time) * 5); ctx.stroke();
      }

      let bgColor = '#22c55e';
      let borderColor = '#15803d';
      let label = '+HP';

      switch (pickup.type) {
        case 'HEALTH':
          bgColor = '#22c55e';
          borderColor = '#16a34a';
          label = 'HP +15';
          break;
        case 'PARCEL_REPAIR':
          bgColor = '#38bdf8';
          borderColor = '#0284c7';
          label = 'PARCEL +10';
          break;
        case 'MOMENTUM':
          bgColor = '#f59e0b';
          borderColor = '#d97706';
          label = 'MOMENTUM +20';
          break;
        case 'BONUS_REWARD':
          bgColor = '#eab308';
          borderColor = '#ca8a04';
          label = '+10.000 VNĐ';
          break;
        case 'PARTS':
          bgColor = '#64748b';
          borderColor = '#f97316';
          label = 'LINH KIỆN +1';
          break;
      }

      const cx = pos.x + 14, cy = pos.y + 14;
      ctx.shadowColor = bgColor; ctx.shadowBlur = pickup.isMagnetized ? 14 : 7;
      ctx.fillStyle = bgColor; ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
      if (pickup.type === 'BONUS_REWARD') {
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'; ctx.fillText('₫', cx, cy + 5);
      } else if (pickup.type === 'PARTS') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i - Math.PI / 6; const x = cx + Math.cos(a) * 12, y = cy + Math.sin(a) * 12; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      } else if (pickup.type === 'MOMENTUM') {
        ctx.beginPath(); ctx.moveTo(cx + 2, cy - 13); ctx.lineTo(cx - 9, cy + 2); ctx.lineTo(cx - 1, cy + 2); ctx.lineTo(cx - 5, cy + 13); ctx.lineTo(cx + 10, cy - 4); ctx.lineTo(cx + 2, cy - 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (pickup.type === 'PARCEL_REPAIR') {
        ctx.fillRect(cx - 11, cy - 9, 22, 18); ctx.strokeRect(cx - 11, cy - 9, 22, 18);
        ctx.strokeStyle = '#e0f2fe'; ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9); ctx.moveTo(cx - 11, cy - 2); ctx.lineTo(cx + 11, cy - 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(cx - 5, cy - 3, 7, 0, Math.PI * 2); ctx.arc(cx + 5, cy - 3, 7, 0, Math.PI * 2); ctx.lineTo(cx, cy + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, pos.x + pickup.width / 2, pos.y - 6);
    }

    ctx.restore();
  }

  public static renderNPC(ctx: CanvasRenderingContext2D, camera: Camera, npc: NPC): void {
    const pos = camera.worldToScreen(npc.x, npc.y);

    // GREEN for Cô Ba, BLUE for Chú Tư
    const fillColor = npc.role === 'coba' ? '#16a34a' : '#2563eb';
    const strokeColor = npc.role === 'coba' ? '#15803d' : '#1d4ed8';

    ctx.fillStyle = fillColor;
    ctx.fillRect(pos.x, pos.y, npc.width, npc.height);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(pos.x, pos.y, npc.width, npc.height);

    // Name Tag
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, pos.x + npc.width / 2, pos.y - 10);
  }

  public static renderHubStations(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    isOrderAccepted: boolean
  ): void {
    ctx.save();

    // 1. Bàn Đồ Nghề Shipper (Equipment & Upgrade Workbench Station)
    const benchPos = camera.worldToScreen(370, 470);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fillRect(benchPos.x, benchPos.y, 170, 150);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(benchPos.x, benchPos.y, 170, 150);

    // Station Roof / Header Accent
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(benchPos.x, benchPos.y, 170, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BÀN ĐỒ NGHỀ SHIPPER', benchPos.x + 85, benchPos.y + 19);

    // Workbench Visual Tool Rack
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(benchPos.x + 12, benchPos.y + 36, 146, 56);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(benchPos.x + 12, benchPos.y + 36, 146, 56);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('NÂNG CẤP & TRANG BỊ', benchPos.x + 85, benchPos.y + 56);

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('NHÁNH J • K • L • Q', benchPos.x + 85, benchPos.y + 76);

    // Interactive Action Prompt
    ctx.fillStyle = 'rgba(249, 115, 22, 0.2)';
    ctx.fillRect(benchPos.x + 12, benchPos.y + 102, 146, 36);
    ctx.strokeStyle = '#f97316';
    ctx.strokeRect(benchPos.x + 12, benchPos.y + 102, 146, 36);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('[ E ] MỞ BÀN ĐỒ NGHỀ', benchPos.x + 85, benchPos.y + 125);

    // 2. Hub Exit Door (to Stage 1)
    const doorPos = camera.worldToScreen(1160, 470);
    ctx.fillStyle = isOrderAccepted ? 'rgba(6, 78, 59, 0.85)' : 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(doorPos.x, doorPos.y, 90, 150);
    ctx.strokeStyle = isOrderAccepted ? '#22c55e' : '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(doorPos.x, doorPos.y, 90, 150);

    // Exit sign
    ctx.fillStyle = isOrderAccepted ? '#22c55e' : '#334155';
    ctx.fillRect(doorPos.x + 5, doorPos.y + 5, 80, 26);

    ctx.fillStyle = isOrderAccepted ? '#ffffff' : '#94a3b8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CỬA RA HẺM', doorPos.x + 45, doorPos.y + 22);

    ctx.fillStyle = isOrderAccepted ? '#86efac' : '#64748b';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(isOrderAccepted ? '→ XUẤT PHÁT' : 'KHÓA', doorPos.x + 45, doorPos.y + 90);

    ctx.restore();
  }

  public static renderHubInteractionMarkers(ctx: CanvasRenderingContext2D, camera: Camera, isOrderAccepted: boolean): void {
    ctx.save();
    const stations = [
      { x: 280, y: 520, w: 150, label: 'BÀN ĐỒ NGHỀ', color: '#38bdf8' },
      { x: 1145, y: 520, w: 105, label: isOrderAccepted ? 'XUẤT PHÁT' : 'CỬA HẺM', color: isOrderAccepted ? '#22c55e' : '#94a3b8' },
    ];
    for (const station of stations) {
      const pos = camera.worldToScreen(station.x, station.y);
      ctx.fillStyle = 'rgba(2,6,23,0.78)'; ctx.fillRect(pos.x - station.w / 2, pos.y, station.w, 26);
      ctx.strokeStyle = station.color; ctx.lineWidth = 1; ctx.strokeRect(pos.x - station.w / 2, pos.y, station.w, 26);
      ctx.fillStyle = station.color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText(station.label, pos.x, pos.y + 18);
    }
    ctx.restore();
  }

  public static renderOrderPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Dark cinematic backdrop overlay
    ctx.fillStyle = 'rgba(2, 6, 18, 0.82)';
    ctx.fillRect(0, 0, 1280, 720);

    // Order Panel Modal (Center) - Authentic Courier Dispatch Docket
    const modalX = 360;
    const modalY = 120;
    const modalW = 560;
    const modalH = 460;

    // Outer drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#08111e';
    ctx.fillRect(modalX, modalY, modalW, modalH);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Metallic beveled border
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(modalX, modalY, modalW, modalH);

    // Top steel binder clip
    ctx.fillStyle = '#334155';
    ctx.fillRect(modalX + modalW / 2 - 60, modalY - 10, 120, 18);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(modalX + modalW / 2 - 60, modalY - 10, 120, 18);

    // Header bar
    const headGrad = ctx.createLinearGradient(modalX, modalY, modalX + modalW, modalY);
    headGrad.addColorStop(0, '#ea580c');
    headGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = headGrad;
    ctx.fillRect(modalX, modalY, modalW, 64);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📦 PHIẾU GIAO HÀNG HỎA TỐC #SXP-8924', modalX + 24, modalY + 40);

    // Badge: HÀNG DỄ VỠ
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('⚡ ƯU TIÊN LOẠI 1', modalX + modalW - 24, modalY + 40);

    // Content rows
    const startY = modalY + 104;
    const lineGap = 48;

    const details = [
      { label: '👤 Người nhận:', value: 'Chú Tư (Tạp hóa đầu hẻm)' },
      { label: '📍 Địa chỉ giao:', value: 'Cuối Hẻm Không Lối Thoát (Màn 1)' },
      { label: '📦 Tình trạng kiện:', value: '100% Nguyên Kiện (⭐ Đạt 5 sao)' },
      { label: '🛡️ Quy cách giữ kiện:', value: 'Balo chống va đập • Tránh bị móc sau lưng' },
      { label: '💰 Tiền công nhận:', value: '50.000 VNĐ (+ Tiền bo khi kiện tốt)' },
    ];

    details.forEach((item, idx) => {
      const rowY = startY + idx * lineGap;

      // Row background zebra
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(modalX + 18, rowY - 18, modalW - 36, 40);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, modalX + 32, rowY + 6);

      ctx.fillStyle = idx === 4 ? '#4ade80' : idx === 2 ? '#38bdf8' : '#f8fafc';
      ctx.font = idx === 4 ? 'bold 16px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.value, modalX + modalW - 32, rowY + 6);
    });

    // Action buttons footer
    const btnY = modalY + modalH - 82;

    // Accept Button with glowing gradient
    const btnGrad = ctx.createLinearGradient(modalX + 24, btnY, modalX + 264, btnY);
    btnGrad.addColorStop(0, '#ea580c');
    btnGrad.addColorStop(1, '#c2410c');
    ctx.fillStyle = btnGrad;
    ctx.fillRect(modalX + 24, btnY, 240, 52);
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 2;
    ctx.strokeRect(modalX + 24, btnY, 240, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🚀 [ E ] NHẬN ĐƠN NGAY', modalX + 144, btnY + 32);

    // Cancel Button
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(modalX + 296, btnY, 240, 52);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(modalX + 296, btnY, 240, 52);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('[ Esc ] ĐỂ LẠI SAU', modalX + 416, btnY + 32);

    ctx.restore();
  }

  public static renderProjectile(ctx: CanvasRenderingContext2D, camera: Camera, proj: Projectile): void {
    const pos = camera.worldToScreen(proj.x, proj.y);

    // TAPE PROJECTILE: Beige / Yellowish rectangular strip
    ctx.fillStyle = '#fde047';
    ctx.fillRect(pos.x, pos.y, proj.width, proj.height);
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x, pos.y, proj.width, proj.height);
  }

  public static renderHUD(
    ctx: CanvasRenderingContext2D,
    player: Player,
    parcelCondition: number,
    bonusReward: number,
    nearbyPrompt: string | null,
    objectiveName: string
  ): void {
    ctx.save();

    // ==========================================
    // 1. ARCADE STREET-BRAWLER STATUS CARD (Top-Left)
    // ==========================================
    const cardX = 20, cardY = 14, cardW = 380, cardH = 118;

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;

    // Angled chamfered cyber chassis
    ctx.beginPath();
    ctx.moveTo(cardX, cardY);
    ctx.lineTo(cardX + cardW - 14, cardY);
    ctx.lineTo(cardX + cardW, cardY + 14);
    ctx.lineTo(cardX + cardW, cardY + cardH);
    ctx.lineTo(cardX + 12, cardY + cardH);
    ctx.lineTo(cardX, cardY + cardH - 12);
    ctx.closePath();

    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    cardGrad.addColorStop(0, '#070f1e');
    cardGrad.addColorStop(0.5, '#0b162c');
    cardGrad.addColorStop(1, '#070f1e');
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Double metallic & neon border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top subtle specular highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 1, cardY + 1);
    ctx.lineTo(cardX + cardW - 14, cardY + 1);
    ctx.stroke();

    // Left neon orange brand strip
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cardX, cardY + 2, 4, cardH - 14);

    // Top Header Banner
    ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
    ctx.fillRect(cardX + 6, cardY + 3, cardW - 22, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('HỘI KHỜ', cardX + 14, cardY + 18);

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('SXP • SHIPPER TẬP SỰ', cardX + 84, cardY + 18);

    const isHub = objectiveName.includes('Cô Ba') || objectiveName.includes('Hub') || objectiveName.includes('HUẤN LUYỆN') || objectiveName.includes('Bảng Đơn');
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(isHub ? 'TRẠM GIAO HÀNG SXP' : 'MÀN 1: SÀI GÒN', cardX + cardW - 14, cardY + 18);

    // Left Column: Shipper Avatar Portrait
    const portX = cardX + 10;
    const portY = cardY + 28;
    const portW = 54;
    const portH = 58;

    // Portrait Frame background & border
    ctx.fillStyle = '#060d1a';
    ctx.fillRect(portX, portY, portW, portH);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(portX, portY, portW, portH);

    // Try to render authentic Hội Khờ HD portrait
    let renderedSprite = false;
    try {
      const portrait = this.getPlayerPortrait();
      if (portrait) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(portX + 1, portY + 1, portW - 2, portH - 2);
        ctx.clip();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Precise crop centered on face & cap from 260x260 image
        ctx.drawImage(portrait, 45, 0, 200, 215, portX + 2, portY + 2, portW - 4, portH - 4);
        ctx.restore();
        renderedSprite = true;
      } else {
        const playerSet = AssetManager.getInstance().getCharacterSet('player');
        const idleState = playerSet?.states.get('idle');
        if (idleState && idleState.image && idleState.image.complete && idleState.image.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(portX + 1, portY + 1, portW - 2, portH - 2);
          ctx.clip();

          const sw = idleState.frameWidth || 96;
          const sh = idleState.frameHeight || 96;
          // Head & chest crop of Hội Khờ's real sprite (always starting at Y=0 so head is never cut off)
          const cropX = Math.round(sw * 0.20);
          const cropY = 0;
          const cropW = Math.round(sw * 0.58);
          const cropH = Math.round(sh * 0.62);

          ctx.imageSmoothingEnabled = false; // keep pixel art crisp
          ctx.drawImage(idleState.image, cropX, cropY, cropW, cropH, portX + 2, portY + 2, portW - 4, portH - 4);
          ctx.restore();
          renderedSprite = true;
        }
      }
    } catch {
      renderedSprite = false;
    }

    // High-tech courier crest fallback (if sprite not yet loaded) - sleek metallic SXP monogram
    if (!renderedSprite) {
      ctx.save();
      const crestGrad = ctx.createLinearGradient(portX, portY, portX + portW, portY + portH);
      crestGrad.addColorStop(0, '#1e293b');
      crestGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = crestGrad;
      ctx.fillRect(portX + 1, portY + 1, portW - 2, portH - 2);

      ctx.fillStyle = '#f97316';
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SXP', portX + portW / 2, portY + portH / 2 + 1);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SHIPPER', portX + portW / 2, portY + portH / 2 + 14);
      ctx.restore();
    }

    // Rank pill below portrait
    const pillY = portY + portH + 4;
    ctx.fillStyle = 'rgba(234, 88, 12, 0.25)';
    ctx.fillRect(portX, pillY, portW, 14);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(portX, pillY, portW, 14);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CẤP 1', portX + portW / 2, pillY + 10);

    // Gauges (HP, KIỆN, Q) - Right of portrait
    const labelX = cardX + 74;
    const barX = cardX + 114;
    const barW = cardW - 126;
    const barH = 17;
    const hpY = cardY + 30;
    const parcelY = cardY + 54;
    const momY = cardY + 78;

    // Helper to draw beveled slot
    const drawSlotBackground = (y: number) => {
      ctx.fillStyle = '#07101e';
      ctx.fillRect(barX, y, barW, barH);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, y, barW, barH);
      // Subtle background grid hatch
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      for (let gx = barX + 28; gx < barX + barW; gx += 28) {
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + barH); ctx.stroke();
      }
    };

    // --- HP BAR ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f87171';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.fillText('HP', labelX, hpY + 13);

    drawSlotBackground(hpY);

    const hpPct = Math.max(0, player.hp / player.maxHp);
    const hpGrad = ctx.createLinearGradient(barX, hpY, barX + barW, hpY);
    if (player.hp > 30) {
      hpGrad.addColorStop(0, '#059669');
      hpGrad.addColorStop(0.5, '#10b981');
      hpGrad.addColorStop(1, '#34d399');
    } else {
      hpGrad.addColorStop(0, '#991b1b');
      hpGrad.addColorStop(0.5, '#dc2626');
      hpGrad.addColorStop(1, '#f87171');
    }
    const currentHpW = Math.max(0, (barW - 4) * hpPct);
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX + 2, hpY + 2, currentHpW, barH - 4);

    if (currentHpW > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(barX + 2, hpY + 2, currentHpW, 4);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(player.hp)}/${player.maxHp}`, barX + barW - 6, hpY + 13);

    // --- PARCEL INTEGRITY BAR ---
    const objective = ObjectiveSystem.getInstance();
    const parcelLabel = objective.parcelProfile?.shortLabel ?? 'KIỆN';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.fillText('KIỆN', labelX, parcelY + 13);

    drawSlotBackground(parcelY);

    const parcelPct = Math.max(0, parcelCondition / BALANCE.PARCEL_MAX_CONDITION);
    const parcelGrad = ctx.createLinearGradient(barX, parcelY, barX + barW, parcelY);
    if (parcelCondition > 70) {
      parcelGrad.addColorStop(0, '#0284c7');
      parcelGrad.addColorStop(0.5, '#38bdf8');
      parcelGrad.addColorStop(1, '#7dd3fc');
    } else if (parcelCondition > 30) {
      parcelGrad.addColorStop(0, '#b45309');
      parcelGrad.addColorStop(0.5, '#f59e0b');
      parcelGrad.addColorStop(1, '#fde68a');
    } else {
      parcelGrad.addColorStop(0, '#991b1b');
      parcelGrad.addColorStop(0.5, '#dc2626');
      parcelGrad.addColorStop(1, '#f87171');
    }
    const currentParcelW = Math.max(0, (barW - 4) * parcelPct);
    ctx.fillStyle = parcelGrad;
    ctx.fillRect(barX + 2, parcelY + 2, currentParcelW, barH - 4);

    if (currentParcelW > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(barX + 2, parcelY + 2, currentParcelW, 4);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(parcelCondition)}%`, barX + barW - 6, parcelY + 13);

    // --- MOMENTUM / ULTIMATE GAUGE (Q) ---
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.fillText('⚡ Q', labelX, momY + 13);

    drawSlotBackground(momY);

    const momentumPct = Math.min(1, player.momentum / BALANCE.MOMENTUM_MAX);
    const isQReady = player.momentum >= BALANCE.ULTIMATE_COST;
    const momGrad = ctx.createLinearGradient(barX, momY, barX + barW, momY);
    momGrad.addColorStop(0, '#c2410c');
    momGrad.addColorStop(0.5, isQReady ? '#fbbf24' : '#ea580c');
    momGrad.addColorStop(1, isQReady ? '#fef08a' : '#f59e0b');

    const currentMomW = Math.max(0, (barW - 4) * momentumPct);
    ctx.fillStyle = momGrad;
    ctx.fillRect(barX + 2, momY + 2, currentMomW, barH - 4);

    if (currentMomW > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(barX + 2, momY + 2, currentMomW, 4);
    }

    if (isQReady) {
      const pulse = 0.72 + Math.sin(performance.now() / 130) * 0.28;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12 * pulse;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, momY, barW, barH);
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('⚡ Q READY!', barX + barW - 6, momY + 13);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(player.momentum)}%`, barX + barW - 6, momY + 13);
    }

    // Bonus Reward pill
    if (bonusReward > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BONUS +${bonusReward.toLocaleString()} VNĐ`, 40, cardY + cardH + 26);
    }

    // ==========================================
    // 2. DISPATCH SLIP (Top Center)
    // ==========================================
    ctx.fillStyle = 'rgba(7, 15, 29, 0.94)';
    ctx.fillRect(420, 16, 520, 60);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(420, 16, 4, 60);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(420, 16, 520, 60);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px system-ui';
    ctx.fillText('📦 ĐƠN ĐANG GIAO (SXP-8924)', 438, 35);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(objectiveName.replace(/^MỤC TIÊU:\s*/, ''), 438, 59, 484);

    const damageAge = (performance.now() - objective.parcelDamageAt) / 1000;
    const repairAge = (performance.now() - objective.parcelRepairAt) / 1000;
    if (repairAge < 1.8 && objective.lastParcelRepair > 0) {
      ctx.globalAlpha = Math.min(1, (1.8 - repairAge) * 2);
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`+${objective.lastParcelRepair.toFixed(0)}% GIA CỐ KIỆN`, 40, 168);
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, parcelY, barW, barH);
      ctx.globalAlpha = 1;
    } else if (damageAge < 1.6 && objective.lastParcelDamage > 0) {
      ctx.globalAlpha = Math.min(1, (1.6 - damageAge) * 2);
      ctx.fillStyle = '#fb7185';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`−${objective.lastParcelDamage.toFixed(0)}% [${parcelLabel}]`, 40, 168);
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, parcelY, barW, barH);
      ctx.globalAlpha = 1;
    } else if (objective.state === 'IN_DELIVERY' && parcelCondition <= 70) {
      ctx.fillStyle = parcelCondition <= 30 ? '#fb7185' : '#fbbf24';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(parcelCondition <= 30 ? '⚠️ KIỆN SẮP HỎNG — NÉ ĐÒN TRƯỚC!' : '⚠️ KIỆN BỊ MÓP — CẨN THẬN!', 40, 168);
    }

    // ==========================================
    // 3. INTERACTION PROMPT (Bottom Center)
    // ==========================================
    if (nearbyPrompt) {
      ctx.fillStyle = 'rgba(7,15,29,0.96)';
      ctx.fillRect(440, 580, 400, 40);
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(440, 580, 400, 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`[ E ] ${nearbyPrompt.replace(/\[\s*E\s*\]/g, '').trim()}`, 640, 605, 376);
    }

    // ==========================================
    // 4. DEBT PROGRESS (Top Right)
    // ==========================================
    const economy = EconomySystem.getInstance().getSnapshot();
    const paidRatio = economy.initialDebt > 0 ? economy.debtPaid / economy.initialDebt : 1;
    ctx.fillStyle = 'rgba(7, 15, 29, 0.94)';
    ctx.fillRect(970, 16, 280, 60);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(970, 16, 4, 60);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(970, 16, 280, 60);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('💰 HÀNH TRÌNH TRẢ NỢ', 986, 35);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${economy.remainingDebt.toLocaleString()} ₫`, 1234, 35);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(986, 48, 248, 10);
    ctx.fillStyle = economy.remainingDebt <= 0 ? '#22c55e' : '#fb923c';
    ctx.fillRect(986, 48, 248 * paidRatio, 10);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${economy.deliveriesCompleted} đơn đã giao`, 986, 70);

    ctx.restore();
  }

  public static renderResult(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    result: DeliveryResultData,
    revealProgress: number = 1
  ): void {
    ctx.save();

    // Backdrop
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Card
    const cardW = 600;
    const cardH = 530;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Title
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KẾT QUẢ GIAO HÀNG', width / 2, cardY + 50);

    // Status banner
    ctx.fillStyle = result.success ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(
      result.success ? 'GIAO HÀNG THÀNH CÔNG!' : 'GIAO HÀNG THẤT BẠI!',
      width / 2,
      cardY + 90
    );

    // Metrics Table
    const startY = cardY + 132;
    const rowH = 39;
    const reveal = Math.max(0, Math.min(1, revealProgress));
    const shownGross = Math.round(BALANCE.BASE_REWARD * reveal);
    const shownPenalty = Math.round(Math.max(0, BALANCE.BASE_REWARD - result.baseReward) * reveal);
    const shownBonus = Math.round(result.bonusReward * reveal);
    const shownIncome = shownGross - shownPenalty + shownBonus;
    const shownPayment = Math.round(result.debtPayment * reveal);
    const debtBeforePayment = result.remainingDebt + result.debtPayment;
    const shownDebt = Math.max(result.remainingDebt, debtBeforePayment - shownPayment);
    const parcelLabel = Number.isInteger(result.parcelCondition)
      ? result.parcelCondition.toFixed(0)
      : result.parcelCondition.toFixed(1);
    const rows = [
      { label: 'Tình trạng kiện hàng:', val: `${parcelLabel}%`, color: result.parcelCondition > 70 ? '#22c55e' : '#f59e0b' },
      { label: 'Máu còn lại (HP):', val: `${Math.round(result.remainingHp)} / ${result.maxHp}`, color: '#ffffff' },
      { label: 'Công giao hàng gốc:', val: `${shownGross.toLocaleString()} VNĐ`, color: '#ffffff' },
      { label: 'Khấu trừ kiện hư:', val: `−${shownPenalty.toLocaleString()} VNĐ`, color: '#fb7185' },
      { label: 'Tiền thưởng thêm:', val: `+${shownBonus.toLocaleString()} VNĐ`, color: '#fbbf24' },
      { label: 'TỔNG THU NHẬP:', val: `${shownIncome.toLocaleString()} VNĐ`, color: '#4ade80' },
      { label: 'TRẢ NỢ KỲ NÀY:', val: `−${shownPayment.toLocaleString()} VNĐ`, color: '#fb923c' },
      { label: 'NỢ CÒN LẠI:', val: `${shownDebt.toLocaleString()} VNĐ`, color: result.remainingDebt <= 0 ? '#4ade80' : '#f8fafc' },
    ];

    ctx.font = '16px system-ui, sans-serif';
    rows.forEach((r, idx) => {
      const y = startY + idx * rowH;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(r.label, cardX + 50, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = r.color;
      ctx.font = idx >= rows.length - 3 ? 'bold 18px monospace' : '16px monospace';
      ctx.fillText(r.val, cardX + cardW - 50, y);
      ctx.font = '16px system-ui, sans-serif';
    });

    // Continue Prompt
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nhấn [SPACE] hoặc [E] hoặc [J] để về HUB', width / 2, cardY + cardH - 35);

    ctx.restore();
  }
}
