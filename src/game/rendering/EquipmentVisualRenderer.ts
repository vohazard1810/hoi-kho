import { Camera } from '../core/Camera';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { UpgradeId, UpgradeSnapshot } from '../systems/UpgradeSystem';

type EquipmentImageId = UpgradeId | 'reflective_badge';

export class EquipmentVisualRenderer {
  private static images = new Map<EquipmentImageId, HTMLImageElement>();

  private static getImage(id: EquipmentImageId): HTMLImageElement | null {
    if (typeof Image === 'undefined') return null;
    let image = this.images.get(id);
    if (!image) {
      image = new Image();
      const filename = id === 'reflective_backpack' ? 'reflective_badge' : id === 'agile_dodge' ? 'dep_to_ong' : id;
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
    const baseId: EquipmentImageId = id === 'agile_dodge' ? 'agile_dodge' : branch === 'J' ? 'scanner_pro' : branch === 'K' ? 'sticky_tape' : 'reflective_badge';
    const image = branch === 'Q' || branch === 'J' ? null : this.getImage(baseId);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (branch === 'J') {
      // Wrist scanner, not the obsolete pistol-shaped inventory prop.
      ctx.save(); ctx.translate(x, y); ctx.scale(size / 32, size / 32);
      ctx.fillStyle = '#fb923c'; ctx.fillRect(10, 1, 12, 30);
      ctx.fillStyle = '#17283c'; ctx.fillRect(5, 7, 22, 18);
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.strokeRect(5, 7, 22, 18);
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(9, 11, 14, 7);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(10, 12, 2, 5); ctx.fillRect(15, 12, 1, 5); ctx.fillRect(19, 12, 2, 5);
      ctx.fillStyle = '#fb923c'; ctx.fillRect(12, 21, 8, 2); ctx.restore();
    } else if (image) ctx.drawImage(image, x, y, size, size);
    else {
      const gradient = ctx.createRadialGradient(x + size / 2, y + size / 2, 2, x + size / 2, y + size / 2, size / 2);
      gradient.addColorStop(0, '#fef08a'); gradient.addColorStop(0.45, '#f97316'); gradient.addColorStop(1, '#9a3412');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 2; ctx.stroke();
    }
    const modifier: Partial<Record<UpgradeId, string>> = {
      wide_scan: '↔', precision_scan: '◎', tape_range: '»', tape_impact: '+',
      agile_dodge: '›', reinforced_parcel: '◆', express_radius: '◉', momentum_reserve: 'Ⅱ',
    };
    if (modifier[id]) {
      ctx.fillStyle = 'rgba(2,6,23,0.9)'; ctx.beginPath(); ctx.arc(x + size - 5, y + 6, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(modifier[id]!, x + size - 5, y + 10);
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
    const x = 410;
    const y = 650;
    const w = 460;
    const h = 56;

    ctx.save();
    // Container background & border
    ctx.fillStyle = 'rgba(7, 15, 29, 0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Parts counter badge on left
    ctx.fillStyle = 'rgba(249, 115, 22, 0.18)';
    ctx.fillRect(x + 8, y + 8, 84, 40);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 8, y + 8, 84, 40);

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LINH KIỆN', x + 50, y + 23);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`⚙ ${snapshot.parts}`, x + 50, y + 42);

    // 4 Equipment Slots (J, K, L, Q)
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

    const slotStartX = x + 102;
    const slotW = 80;
    const slotH = 40;
    const slotGap = 6;

    slots.forEach((slot, idx) => {
      const sx = slotStartX + idx * (slotW + slotGap);
      const sy = y + 8;

      ctx.fillStyle = slot.tier2
        ? 'rgba(6, 182, 212, 0.2)'
        : slot.active
        ? 'rgba(234, 88, 12, 0.2)'
        : 'rgba(30, 41, 59, 0.6)';
      ctx.fillRect(sx, sy, slotW, slotH);

      ctx.strokeStyle = slot.tier2
        ? '#22d3ee'
        : slot.active
        ? '#ea580c'
        : '#475569';
      ctx.lineWidth = slot.active ? 1.5 : 1;
      ctx.strokeRect(sx, sy, slotW, slotH);

      ctx.fillStyle = slot.tier2 ? '#67e8f9' : slot.active ? '#fdba74' : '#94a3b8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      const equippedId = snapshot.equipped.get(slot.branch as 'J' | 'K' | 'L' | 'Q');
      const baseIds: Record<string, UpgradeId> = { J: 'scanner_pro', K: 'sticky_tape', L: 'reflective_backpack', Q: 'express_core' };
      this.renderUpgradeIcon(ctx, equippedId ?? baseIds[slot.branch], sx + 5, sy + 2, 24, 1);
      ctx.textAlign = 'right';
      const cooldown = slot.branch === 'L' ? player?.dodgeCooldownRemaining : slot.branch === 'K' ? player?.tapeCooldownRemaining : 0;
      const ready = slot.branch === 'Q' && (player?.momentum ?? 0) >= 100;
      const isAirDropSlot = slot.branch === 'J' && isAirborne;
      ctx.fillStyle = ready ? '#fbbf24' : isAirDropSlot ? '#facc15' : '#cbd5e1';
      ctx.fillText(
        cooldown && cooldown > 0.01
          ? `${cooldown.toFixed(1)}s`
          : ready
          ? '[Q!]'
          : isAirDropSlot
          ? '[W+J!]'
          : `[${slot.branch}]`,
        sx + slotW - 6,
        sy + 15
      );
      if (ready) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, slotW, slotH);
      } else if (isAirDropSlot) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, slotW, slotH);
      }

      ctx.fillStyle = slot.tier2 ? '#e0f2fe' : isAirDropSlot ? '#fef08a' : slot.active ? '#ffedd5' : '#cbd5e1';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText(slot.label, sx + slotW - 6, sy + 32);
    });

    ctx.restore();
  }
}
