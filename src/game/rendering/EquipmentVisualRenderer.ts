import { Camera } from '../core/Camera';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { UpgradeId, UpgradeSnapshot } from '../systems/UpgradeSystem';

type EquipmentImageId = UpgradeId | 'reflective_badge' | 'express_core';

export class EquipmentVisualRenderer {
  private static images = new Map<EquipmentImageId, HTMLImageElement>();

  private static getImage(id: EquipmentImageId): HTMLImageElement | null {
    if (typeof Image === 'undefined') return null;
    let image = this.images.get(id);
    if (!image) {
      image = new Image();
      const filename = id === 'reflective_backpack' || id === 'reinforced_parcel' ? 'reflective_badge'
        : id === 'agile_dodge' ? 'dep_to_ong'
        : id === 'scanner_pro' || id === 'wide_scan' || id === 'precision_scan' ? 'scanner_pro'
        : id === 'sticky_tape' || id === 'tape_range' || id === 'tape_impact' ? 'sticky_tape'
        : id === 'express_core' || id === 'express_radius' || id === 'momentum_reserve' ? 'express_core'
        : id;
      image.src = `/assets/equipment/${filename}.png`;
      this.images.set(id, image);
    }
    return image.complete && image.naturalWidth > 0 ? image : null;
  }

  public static renderUpgradeIcon(
    ctx: CanvasRenderingContext2D,
    id: UpgradeId,
    x: number,
    y: number,
    size: number,
    alpha: number = 1
  ): void {
    const branch = id === 'scanner_pro' || id === 'wide_scan' || id === 'precision_scan' ? 'J'
      : id === 'sticky_tape' || id === 'tape_range' || id === 'tape_impact' ? 'K'
      : id === 'reflective_backpack' || id === 'agile_dodge' || id === 'reinforced_parcel' ? 'L' : 'Q';
    const baseId: EquipmentImageId = id === 'agile_dodge' ? 'agile_dodge'
      : branch === 'J' ? 'scanner_pro'
      : branch === 'K' ? 'sticky_tape'
      : branch === 'L' ? 'reflective_badge'
      : 'express_core';
    const image = this.getImage(baseId);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (image) {
      ctx.drawImage(image, x, y, size, size);
    } else {
      const fallbackGrad = ctx.createLinearGradient(x, y, x + size, y + size);
      fallbackGrad.addColorStop(0, branch === 'J' ? '#0284c7' : branch === 'K' ? '#ca8a04' : branch === 'L' ? '#16a34a' : '#ea580c');
      fallbackGrad.addColorStop(1, '#070f1e');
      ctx.fillStyle = fallbackGrad;
      ctx.fillRect(x, y, size, size);
    }

    const modifier: Partial<Record<UpgradeId, string>> = {
      wide_scan: '↔', precision_scan: '◎', tape_range: '»', tape_impact: '+',
      agile_dodge: '⚡', reinforced_parcel: '◆', express_radius: '◉', momentum_reserve: 'Ⅱ',
    };
    if (modifier[id]) {
      const badgeR = Math.max(7, Math.round(size * 0.22));
      const badgeX = x + size - badgeR;
      const badgeY = y + badgeR;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = branch === 'J' ? '#38bdf8' : branch === 'K' ? '#fde047' : branch === 'L' ? '#4ade80' : '#fb923c';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(size * 0.26)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(modifier[id]!, badgeX, badgeY);
    }
    ctx.restore();
  }

  private static withFacing(
    ctx: CanvasRenderingContext2D,
    anchorX: number,
    anchorY: number,
    facing: 'left' | 'right',
    draw: () => void
  ): void {
    ctx.save();
    ctx.translate(anchorX, anchorY);
    if (facing === 'left') ctx.scale(-1, 1);
    draw();
    ctx.restore();
  }

  private static renderJ3ScanSweep(
    ctx: CanvasRenderingContext2D,
    handX: number,
    handY: number,
    frame: number,
    wide: boolean,
    precision: boolean
  ): void {
    // J3 keeps the authored punch pose. Only a compact motion sweep is added;
    // no separate tool is composited because it cannot share the sprite's hand pose.
    if (frame < 2 || frame > 3) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const x = Math.round(handX); const y = Math.round(handY);
    const radius = wide ? 31 : 25;
    ctx.globalAlpha = frame === 2 ? 0.82 : 0.48;
    ctx.strokeStyle = precision ? '#fef08a' : '#67e8f9';
    ctx.lineCap = 'round';
    ctx.lineWidth = wide ? 3 : 2;
    ctx.beginPath(); ctx.arc(x - 3, y + 1, radius, -0.78, 0.58); ctx.stroke();
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x - 3, y + 1, radius - 6, -0.7, 0.5); ctx.stroke();
    ctx.fillStyle = precision ? '#fff7ae' : '#cffafe';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x + radius - 4, y - 2, 3, 3);
    ctx.restore();
  }

  public static renderPlayerEquipment(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    player: Player,
    snapshot: UpgradeSnapshot,
    state: string,
    frame: number,
    visualScale: number = 1
  ): void {
    const anchor = camera.worldToScreen(player.x + player.width / 2, player.y + player.height);
    this.withFacing(ctx, anchor.x, anchor.y, player.facing, () => {
      ctx.scale(visualScale, visualScale);
      if (snapshot.equipped.get('L') === 'agile_dodge' && state === 'dodge') {
        ctx.strokeStyle = 'rgba(34,211,238,0.75)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-38, -27); ctx.lineTo(-10, -27); ctx.stroke();
      }

      if (snapshot.purchased.has('express_core') && player.comboStep === 'ULTIMATE') {
        ctx.strokeStyle = snapshot.equipped.get('Q') === 'express_radius' ? '#c084fc' : '#fb923c';
        ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(0, -31, snapshot.equipped.get('Q') === 'express_radius' ? 38 : 29, 0, Math.PI * 2); ctx.stroke();
      }

      if (snapshot.purchased.has('scanner_pro') && state === 'j3') {
        const handOffsets = [
          { x: 6, y: -37 }, { x: 12, y: -37 }, { x: 24, y: -34 },
          { x: 26, y: -34 }, { x: 23, y: -35 }, { x: 8, y: -37 },
        ];
        const hand = handOffsets[Math.min(frame, handOffsets.length - 1)];
        this.renderJ3ScanSweep(
          ctx,
          hand.x,
          hand.y,
          frame,
          snapshot.equipped.get('J') === 'wide_scan',
          snapshot.equipped.get('J') === 'precision_scan'
        );
      }
    });
  }

  public static renderProjectile(ctx: CanvasRenderingContext2D, camera: Camera, projectile: Projectile): boolean {
    if (projectile.visualUpgrade === 'BASE') return false;
    const pos = camera.worldToScreen(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2);
    const tape = this.getImage('sticky_tape');
    ctx.save();
    ctx.shadowColor = projectile.visualUpgrade === 'IMPACT' ? '#fb923c' : projectile.visualUpgrade === 'RANGE' ? '#c084fc' : '#22d3ee';
    ctx.shadowBlur = 8;
    if (tape) ctx.drawImage(tape, pos.x - 15, pos.y - 15, 30, 30);
    else {
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = projectile.visualUpgrade === 'IMPACT' ? 'rgba(249,115,22,0.7)' : projectile.visualUpgrade === 'RANGE' ? 'rgba(192,132,252,0.7)' : 'rgba(34,211,238,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pos.x - (projectile.facing === 'right' ? 28 : -28), pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();
    return true;
  }

  public static renderHud(ctx: CanvasRenderingContext2D, snapshot: UpgradeSnapshot, player?: Player): void {
    const x = 390;
    const y = 650;
    const w = 500;
    const h = 58;

    ctx.save();

    // 1. Console drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;

    // Chamfered cyber console chassis
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + w - 10, y);
    ctx.lineTo(x + w, y + 10);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + 10);
    ctx.closePath();

    const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
    bgGrad.addColorStop(0, '#0a1220');
    bgGrad.addColorStop(0.5, '#070d18');
    bgGrad.addColorStop(1, '#050912');
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Dual-layer metallic & neon cyber border
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top orange neon accent strip
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 1);
    ctx.lineTo(x + w - 12, y + 1);
    ctx.stroke();

    // 2. Parts counter module on left
    const px = x + 8;
    const py = y + 7;
    const pw = 84;
    const ph = 44;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LINH KIỆN', px + pw / 2, py + 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px monospace';
    ctx.fillText(`⚙ ${snapshot.parts}`, px + pw / 2, py + 34);

    // 3. 4 Tactical Equipment Keycaps (J, K, L, Q)
    const isAirborne = !!player && !player.isGrounded;
    const slots = [
      {
        branch: 'J',
        label: isAirborne
          ? 'ĐẠP RƠI'
          : snapshot.equipped.get('J') === 'precision_scan'
          ? 'CHUẨN'
          : snapshot.equipped.get('J') === 'wide_scan'
          ? 'RỘNG'
          : snapshot.purchased.has('scanner_pro')
          ? 'PRO'
          : 'LIÊN HOÀN',
        active: snapshot.purchased.has('scanner_pro') || snapshot.equipped.has('J') || isAirborne,
        tier2: snapshot.equipped.get('J') === 'precision_scan' || snapshot.equipped.get('J') === 'wide_scan',
      },
      {
        branch: 'K',
        label: snapshot.equipped.get('K') === 'tape_impact'
          ? 'LỰC'
          : snapshot.equipped.get('K') === 'tape_range'
          ? 'TẦM XA'
          : snapshot.purchased.has('sticky_tape')
          ? 'DÍNH'
          : 'BĂNG KEO',
        active: snapshot.purchased.has('sticky_tape') || snapshot.equipped.has('K'),
        tier2: snapshot.equipped.get('K') === 'tape_impact' || snapshot.equipped.get('K') === 'tape_range',
      },
      {
        branch: 'L',
        label: snapshot.equipped.get('L') === 'reinforced_parcel'
          ? 'GIÁP'
          : snapshot.equipped.get('L') === 'agile_dodge'
          ? 'LƯỚT'
          : snapshot.purchased.has('reflective_backpack')
          ? 'BALO'
          : 'LƯỚT NÉ',
        active: snapshot.purchased.has('reflective_backpack') || snapshot.equipped.has('L'),
        tier2: snapshot.equipped.get('L') === 'reinforced_parcel' || snapshot.equipped.get('L') === 'agile_dodge',
      },
      {
        branch: 'Q',
        label: snapshot.equipped.get('Q') === 'momentum_reserve'
          ? 'PIN'
          : snapshot.equipped.get('Q') === 'express_radius'
          ? 'RỘNG'
          : snapshot.purchased.has('express_core')
          ? 'HỎA TỐC'
          : 'HỎA TỐC',
        active: snapshot.purchased.has('express_core') || snapshot.equipped.has('Q'),
        tier2: snapshot.equipped.get('Q') === 'momentum_reserve' || snapshot.equipped.get('Q') === 'express_radius',
      },
    ];

    const slotStartX = x + 100;
    const slotW = 90;
    const slotH = 44;
    const slotGap = 8;

    slots.forEach((slot, idx) => {
      const sx = slotStartX + idx * (slotW + slotGap);
      const sy = y + 7;

      const cooldown = slot.branch === 'L' ? player?.dodgeCooldownRemaining : slot.branch === 'K' ? player?.tapeCooldownRemaining : 0;
      const ready = slot.branch === 'Q' && (player?.momentum ?? 0) >= 100;
      const isAirDropSlot = slot.branch === 'J' && isAirborne;
      const isOnCooldown = !!(cooldown && cooldown > 0.01);

      // Slot Socket Base
      ctx.fillStyle = '#050914';
      ctx.fillRect(sx, sy, slotW, slotH);

      // Keycap Button Gradient Fill
      const btnGrad = ctx.createLinearGradient(sx, sy, sx, sy + slotH);
      if (ready) {
        btnGrad.addColorStop(0, '#7c2d12');
        btnGrad.addColorStop(1, '#ea580c');
      } else if (isAirDropSlot) {
        btnGrad.addColorStop(0, '#854d0e');
        btnGrad.addColorStop(1, '#ca8a04');
      } else if (slot.tier2) {
        btnGrad.addColorStop(0, '#0e3a4e');
        btnGrad.addColorStop(1, '#082535');
      } else if (slot.active) {
        btnGrad.addColorStop(0, '#2d1808');
        btnGrad.addColorStop(1, '#1b0e04');
      } else {
        btnGrad.addColorStop(0, '#131e30');
        btnGrad.addColorStop(1, '#0a101d');
      }
      ctx.fillStyle = btnGrad;
      ctx.fillRect(sx, sy, slotW, slotH);

      // Top Specular Lip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(sx, sy, slotW, 2);

      // Keycap Border
      let borderColor = '#334155';
      let borderWidth = 1;
      if (ready) {
        const qPulse = 0.7 + Math.sin(performance.now() / 110) * 0.3;
        borderColor = '#fbbf24';
        borderWidth = 2;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10 * qPulse;
      } else if (isAirDropSlot) {
        borderColor = '#facc15';
        borderWidth = 2;
      } else if (slot.tier2) {
        borderColor = '#22d3ee';
        borderWidth = 1.5;
      } else if (slot.active) {
        borderColor = '#ea580c';
        borderWidth = 1.2;
      }
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(sx, sy, slotW, slotH);
      ctx.shadowBlur = 0;

      // Icon Ambient Back-Aura
      const auraColor = ready
        ? 'rgba(251, 191, 36, 0.45)'
        : isAirDropSlot
        ? 'rgba(250, 204, 21, 0.45)'
        : slot.tier2
        ? 'rgba(34, 211, 238, 0.35)'
        : slot.active
        ? 'rgba(249, 115, 22, 0.3)'
        : 'rgba(148, 163, 184, 0.15)';
      const aura = ctx.createRadialGradient(sx + 18, sy + 22, 2, sx + 18, sy + 22, 18);
      aura.addColorStop(0, auraColor);
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(sx + 2, sy + 4, 32, 36);

      // Render Upgrade Icon
      const equippedId = snapshot.equipped.get(slot.branch as 'J' | 'K' | 'L' | 'Q');
      const baseIds: Record<string, UpgradeId> = { J: 'scanner_pro', K: 'sticky_tape', L: 'reflective_backpack', Q: 'express_core' };
      this.renderUpgradeIcon(ctx, equippedId ?? baseIds[slot.branch], sx + 6, sy + 10, 24, 1);

      // Cooldown sweep mask
      if (isOnCooldown) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.fillRect(sx, sy, slotW, slotH);
      }

      // Backlit Keybind Cap (Top-Right)
      const isTapeEmpty = slot.branch === 'K' && (player?.tapeCharges ?? 3) === 0;
      const keycapText = isOnCooldown
        ? `${cooldown.toFixed(1)}s`
        : isTapeEmpty
        ? `HỒI ${(Math.max(0.1, 4.0 - (player?.tapeRechargeTimer ?? 0))).toFixed(0)}s`
        : ready
        ? '[Q!]'
        : isAirDropSlot
        ? '[W+J!]'
        : slot.branch === 'K' && player?.tapeCharges !== undefined
        ? `[K] ${player.tapeCharges}/3`
        : `[${slot.branch}]`;

      ctx.fillStyle = isOnCooldown || isTapeEmpty ? '#ef4444' : ready ? '#fbbf24' : isAirDropSlot ? '#fef08a' : '#ffffff';
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(keycapText, sx + slotW - 6, sy + 16);

      // Vietnamese Skill Label (Bottom-Right)
      const skillLabel = slot.branch === 'K' && isTapeEmpty ? 'HẾT CUỘN!' : slot.label;
      ctx.fillStyle = isOnCooldown || isTapeEmpty
        ? '#94a3b8'
        : slot.tier2
        ? '#67e8f9'
        : isAirDropSlot
        ? '#fef08a'
        : slot.active
        ? '#fdba74'
        : '#cbd5e1';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(skillLabel, sx + slotW - 6, sy + 34);
    });

    ctx.restore();
  }
}
