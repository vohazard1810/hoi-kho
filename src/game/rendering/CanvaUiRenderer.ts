import { DeliveryResultData } from '../core/types';
import { BALANCE } from '../config/balance';

/**
 * CanvaUiRenderer: Renders modern Canva-styled graphic design UI components,
 * specifically the handheld POS thermal delivery receipt, mobile notifications,
 * and aesthetic summary cards for SXP Express.
 */
export class CanvaUiRenderer {
  /**
   * Draws realistic perforated/sawtooth jagged tear-off edge at top or bottom of thermal paper
   */
  private static drawSawtoothEdge(
    ctx: CanvasRenderingContext2D,
    startX: number,
    y: number,
    width: number,
    teeth: number,
    toothH: number,
    pointingDown: boolean
  ): void {
    const step = width / teeth;
    ctx.moveTo(startX, y);
    for (let i = 0; i < teeth; i++) {
      const x1 = startX + (i + 0.5) * step;
      const y1 = pointingDown ? y + toothH : y - toothH;
      const x2 = startX + (i + 1) * step;
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y);
    }
  }

  /**
   * Draws a stylized SXP Express Courier Wings logo
   */
  private static drawSxpLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number = 1): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Dynamic 3-streak speed wing
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    // Wing streak 1
    ctx.moveTo(-54, -14);
    ctx.lineTo(-24, -14);
    ctx.lineTo(-34, -6);
    ctx.lineTo(-64, -6);
    ctx.closePath();
    ctx.fill();

    // Wing streak 2
    ctx.beginPath();
    ctx.moveTo(-60, -3);
    ctx.lineTo(-20, -3);
    ctx.lineTo(-30, 5);
    ctx.lineTo(-70, 5);
    ctx.closePath();
    ctx.fill();

    // Wing streak 3
    ctx.beginPath();
    ctx.moveTo(-50, 8);
    ctx.lineTo(-22, 8);
    ctx.lineTo(-32, 16);
    ctx.lineTo(-60, 16);
    ctx.closePath();
    ctx.fill();

    // Isometric Courier Box in center
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.lineTo(2, -26);
    ctx.lineTo(20, -16);
    ctx.lineTo(2, -6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-16, -16);
    ctx.lineTo(2, -6);
    ctx.lineTo(2, 16);
    ctx.lineTo(-16, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(2, -6);
    ctx.lineTo(20, -16);
    ctx.lineTo(20, 6);
    ctx.lineTo(2, 16);
    ctx.closePath();
    ctx.fill();

    // SXP Typography
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SXP', 28, -4);

    ctx.font = '800 13px system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText('EXPRESS', 30, 16);
    ctx.letterSpacing = '0px';

    ctx.restore();
  }

  /**
   * Draws a procedural authentic monospaced thermal barcode
   */
  private static drawThermalBarcode(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    caption: string
  ): void {
    ctx.save();
    // Deterministic bar widths pattern
    const pattern = [2, 1, 3, 1, 4, 2, 1, 2, 4, 1, 3, 2, 1, 4, 1, 2, 3, 1, 1, 4, 2, 1, 3, 2, 4, 1, 2, 1, 3, 4, 2, 1, 2, 3, 1, 4, 2, 1, 3, 1];
    let curX = x;
    const totalUnits = pattern.reduce((a, b) => a + b, 0) + pattern.length * 1.5;
    const unitW = width / totalUnits;

    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < pattern.length; i++) {
      const barW = pattern[i] * unitW;
      ctx.fillRect(curX, y, barW, height);
      curX += barW + unitW * 1.5;
    }

    // Monospaced text below barcode
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(caption, x + width / 2, y + height + 4);
    ctx.restore();
  }

  /**
   * Draws a weathered vintage red rubber stamp (con dấu mộc đỏ)
   */
  private static drawRubberStamp(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    title: string,
    subtitle: string,
    angleDeg: number = -8,
    scale: number = 1
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleDeg * Math.PI) / 180);
    ctx.scale(scale, scale);

    const w = 330;
    const h = 76;
    const rx = -w / 2;
    const ry = -h / 2;

    // Distressed stamp ink styling
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.07)';

    // Outer border
    ctx.beginPath();
    ctx.roundRect(rx, ry, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Inner thin border
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rx + 5, ry + 5, w - 10, h - 10, 5);
    ctx.stroke();

    // Main stamp text
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 17px "Arial Black", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 0, -10);

    // Subtitle text
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(subtitle, 0, 16);

    ctx.restore();
  }

  /**
   * Main Canva POS Thermal Delivery Receipt renderer for ResultScene / Day Recap
   */
  public static renderCanvaThermalReceipt(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    result: DeliveryResultData,
    revealProgress: number = 1
  ): void {
    ctx.save();

    // Dark cinematic dusk background with subtle warm radial amber glow
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const bgGlow = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width * 0.6);
    bgGlow.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
    bgGlow.addColorStop(0.5, 'rgba(15, 23, 42, 0.4)');
    bgGlow.addColorStop(1, 'rgba(3, 7, 18, 0.9)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);

    // Receipt dimensions
    const receiptW = 460;
    const receiptH = 650;
    const receiptX = Math.round((width - receiptW) / 2);

    // Thermal roll paper feeding down animation
    const progress = Math.max(0, Math.min(1, revealProgress));
    const feedOffsetY = (1 - Math.min(1, progress * 1.2)) * 30;
    const receiptY = Math.round((height - receiptH) / 2) + feedOffsetY;

    // 1. Realistic Deep Paper Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16;

    // Paper Base Path with Jagged Sawtooth Edges at Top & Bottom
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(receiptX, receiptY + 12);
    // Top tear-off edge
    this.drawSawtoothEdge(ctx, receiptX, receiptY, receiptW, 26, 6, true);
    ctx.lineTo(receiptX + receiptW, receiptY + receiptH);
    // Bottom tear-off edge
    this.drawSawtoothEdge(ctx, receiptX + receiptW, receiptY + receiptH, -receiptW, 26, 6, false);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Subtle Paper Grain & Left/Right Margin Crease
    ctx.save();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(receiptX + 18, receiptY + 14, receiptW - 36, receiptH - 28);
    ctx.restore();

    // 3. SXP Minimalist Logo & Header
    this.drawSxpLogo(ctx, receiptX + receiptW / 2 - 20, receiptY + 48, 0.78);

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 15px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BIÊN NHẬN QUYẾT TOÁN CA GIAO HÀNG', receiptX + receiptW / 2, receiptY + 92);

    // Monospaced metadata
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Số HĐ: SXP-2026-SG01 • Giờ in: 17:45:12', receiptX + receiptW / 2, receiptY + 110);
    ctx.fillText('Tài xế: Khờ (#SXP-099) • Nhận: Chú Tư (Hẻm 89)', receiptX + receiptW / 2, receiptY + 124);

    // Dedicated Status & Termination Reason Banner (Zero overlap, high contrast)
    const isSuccess = result.success;
    const statusBoxY = receiptY + 134;
    const statusBoxH = 46;
    const statusBoxW = receiptW - 56;
    const statusBoxX = receiptX + 28;

    ctx.fillStyle = isSuccess ? '#ecfdf5' : '#fff1f2';
    ctx.beginPath();
    ctx.roundRect(statusBoxX, statusBoxY, statusBoxW, statusBoxH, 6);
    ctx.fill();
    ctx.strokeStyle = isSuccess ? '#059669' : '#e11d48';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.font = '900 13px system-ui, sans-serif';
    ctx.fillStyle = isSuccess ? '#047857' : '#be123c';
    ctx.textAlign = 'center';
    ctx.fillText(isSuccess ? '★ GIAO HÀNG THÀNH CÔNG ★' : '⚠ GIAO HÀNG THẤT BẠI ⚠', receiptX + receiptW / 2, statusBoxY + 19);

    let reasonText = 'ĐÃ BÀN GIAO KIỆN TẬN TAY KHÁCH HÀNG';
    if (!isSuccess) {
      if (result.parcelCondition <= 0) {
        reasonText = 'LÝ DO: KIỆN HÀNG BỊ HƯ HỎNG TOÀN BỘ (0%)';
      } else if (result.remainingHp <= 0) {
        reasonText = 'LÝ DO: SHIPPER BỊ ĐÁNH GỤC TRÊN ĐƯỜNG GIAO';
      } else {
        reasonText = 'LÝ DO: QUÁ HẠN THỜI GIAN GIAO HÀNG';
      }
    }
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = isSuccess ? '#065f46' : '#9f1239';
    ctx.fillText(reasonText, receiptX + receiptW / 2, statusBoxY + 36);

    // Dashed divider line
    const drawDashedLine = (y: number) => {
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(receiptX + 28, y);
      ctx.lineTo(receiptX + receiptW - 28, y);
      ctx.stroke();
      ctx.restore();
    };

    drawDashedLine(receiptY + 190);

    // Thermal Barcode
    this.drawThermalBarcode(ctx, receiptX + 54, receiptY + 198, receiptW - 108, 24, '*SXP-SETTLEMENT-DEBT-F89*');

    drawDashedLine(receiptY + 252);

    // Calculations based on actual run data
    const shownGross = Math.round(BALANCE.BASE_REWARD * progress);
    const shownPenalty = Math.round(Math.max(0, BALANCE.BASE_REWARD - result.baseReward) * progress);
    const shownBonus = Math.round(result.bonusReward * progress);
    const shownIncome = shownGross - shownPenalty + shownBonus;
    const shownPayment = Math.round(result.debtPayment * progress);
    const debtBeforePayment = result.remainingDebt + result.debtPayment;
    const shownDebt = Math.max(result.remainingDebt, debtBeforePayment - shownPayment);

    const parcelPct = Math.round(result.parcelCondition);

    // Itemized Financial Rows
    const items = [
      {
        label: 'Cước giao hàng cơ bản:',
        val: `+${shownGross.toLocaleString('vi-VN')} đ`,
        color: '#0f172a',
        bold: false,
      },
      {
        label: `Tình trạng kiện (${parcelPct}% độ bền):`,
        val: shownPenalty > 0 ? `-${shownPenalty.toLocaleString('vi-VN')} đ` : `+0 đ (ĐẠT)`,
        color: shownPenalty > 0 ? '#dc2626' : '#16a34a',
        bold: false,
      },
      {
        label: 'Khách thương cho thêm (Tip):',
        val: `+${shownBonus.toLocaleString('vi-VN')} đ`,
        color: '#d97706',
        bold: false,
      },
      {
        label: 'Trừ nợ lãi ngày App F89:',
        val: `-${shownPayment.toLocaleString('vi-VN')} đ`,
        color: '#ea580c',
        bold: true,
      },
    ];

    let rowY = receiptY + 276;
    const rowGap = 26;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const lineThreshold = (i + 1) / (items.length + 2);
      if (progress >= lineThreshold * 0.7) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#334155';
        ctx.font = it.bold ? 'bold 12px system-ui' : '12px system-ui';
        ctx.fillText(it.label, receiptX + 38, rowY);

        ctx.textAlign = 'right';
        ctx.fillStyle = it.color;
        ctx.font = it.bold ? 'bold 14px monospace' : '13px monospace';
        ctx.fillText(it.val, receiptX + receiptW - 38, rowY);
      }
      rowY += rowGap;
    }

    drawDashedLine(rowY + 6);

    // Summary Highlight Boxes (Dedicated zones, high contrast, zero overlap)
    const summaryBoxY = rowY + 18;

    // 1. Thực nhận vào ví trả nợ
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(receiptX + 28, summaryBoxY, receiptW - 56, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 12px system-ui';
    ctx.fillText('THỰC NHẬN VÀO VÍ TRẢ NỢ:', receiptX + 42, summaryBoxY + 27);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#16a34a';
    ctx.font = '900 17px monospace';
    ctx.fillText(`+${shownIncome.toLocaleString('vi-VN')} đ`, receiptX + receiptW - 42, summaryBoxY + 28);

    // 2. Dư nợ App F89 còn lại
    const debtBoxY = summaryBoxY + 52;
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.roundRect(receiptX + 28, debtBoxY, receiptW - 56, 44, 6);
    ctx.fill();
    ctx.strokeStyle = '#fecdd3';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#9f1239';
    ctx.font = '800 12px system-ui';
    ctx.fillText('DƯ NỢ APP F89 CÒN LẠI:', receiptX + 42, debtBoxY + 27);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e11d48';
    ctx.font = '900 17px monospace';
    ctx.fillText(`${shownDebt.toLocaleString('vi-VN')} đ`, receiptX + receiptW - 42, debtBoxY + 28);

    // 3. Canva Pill CTA Button (at bottom)
    const btnY = receiptY + receiptH - 62;
    const btnW = 310;
    const btnH = 42;
    const btnX = receiptX + (receiptW - btnW) / 2;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#ea580c');
    btnGrad.addColorStop(0.5, '#f97316');
    btnGrad.addColorStop(1, '#fb923c');

    ctx.save();
    ctx.shadowColor = 'rgba(234, 88, 12, 0.45)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 21);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIẾP TỤC TRẢ NỢ (SPACE)', receiptX + receiptW / 2, btnY + btnH / 2);

    ctx.restore();
  }

  /**
   * Interactive Delivery Recap / Inspector Modal for in-game preview (Triggered via 'P' key)
   */
  public static renderDeliveryInspectorModal(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    parcelHpPct: number,
    playerHp: number,
    playerMaxHp: number,
    tapeCharges: number,
    maxTape: number,
    debtAmount: number = 20_000_000
  ): void {
    ctx.save();

    // Dark semi-transparent overlay
    ctx.fillStyle = 'rgba(10, 15, 26, 0.82)';
    ctx.fillRect(0, 0, width, height);

    // Canva UI Modal Card
    const cardW = 540;
    const cardH = 520;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    // Card background with rounded corners & shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Header Badge with Canva Gradient
    const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + 54);
    headerGrad.addColorStop(0, '#0284c7');
    headerGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, 54, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CANVA UI • TRÌNH KIỂM SOÁT ĐƠN HÀNG SXP', cardX + cardW / 2, cardY + 34);

    // Sub-header
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Nhấn [ P ] hoặc [ ESC ] để đóng và tiếp tục chiến đấu', cardX + cardW / 2, cardY + 84);

    // Stats Grid Cards
    const drawMetricCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      title: string,
      val: string,
      sub: string,
      color: string
    ) => {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(title, x + 14, y + 24);

      ctx.fillStyle = color;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(val, x + 14, y + 54);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui';
      ctx.fillText(sub, x + 14, y + 76);
    };

    const gridX = cardX + 32;
    const gridY = cardY + 104;
    const cellW = (cardW - 64 - 16) / 2;
    const cellH = 92;

    // 1. Parcel Health
    const parcelColor = parcelHpPct > 70 ? '#22c55e' : parcelHpPct > 40 ? '#f59e0b' : '#ef4444';
    drawMetricCard(gridX, gridY, cellW, cellH, '📦 ĐỘ BỀN KIỆN HÀNG', `${parcelHpPct}%`, parcelHpPct > 80 ? 'Hoàn hảo (+20k)' : 'Trầy xước (Phạt cước)', parcelColor);

    // 2. Shipper Health
    const hpPct = Math.round((playerHp / playerMaxHp) * 100);
    drawMetricCard(gridX + cellW + 16, gridY, cellW, cellH, '❤️ THỂ LỰC (HP)', `${Math.round(playerHp)}/${playerMaxHp}`, `Pin điện thoại: ${hpPct}%`, '#38bdf8');

    // 3. Tape Charges
    drawMetricCard(gridX, gridY + cellH + 14, cellW, cellH, '🩹 BĂNG KEO DÁN HÀNG', `${tapeCharges}/${maxTape} CUỘN`, 'Bấm K để ném làm chậm quái', '#fbbf24');

    // 4. Debt Status
    drawMetricCard(gridX + cellW + 16, gridY + cellH + 14, cellW, cellH, '💸 DƯ NỢ APP F89', `${(debtAmount / 1_000_000).toFixed(1)} TRIỆU`, 'Lãi 45k/ngày (Cần trả gấp)', '#f43f5e');

    // Bottom Canva Feature Showcase: POS Receipt Preview
    const previewBoxY = gridY + (cellH + 14) * 2 + 10;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(gridX, previewBoxY, cardW - 64, 88, 10);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('📄 HÓA ĐƠN IN NHIỆT POS ĐÃ TÍCH HỢP', gridX + 16, previewBoxY + 28);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.fillText('Cuối mỗi ca giao hàng, máy in nhiệt POS Canva sẽ xuất biên nhận', gridX + 16, previewBoxY + 50);
    ctx.fillText('kèm mộc đỏ "ĐÃ QUYẾT TOÁN" và bảng trừ nợ lãi chi tiết.', gridX + 16, previewBoxY + 70);

    // Close Button
    const btnW = 200;
    const btnH = 38;
    const btnX = cardX + (cardW - btnW) / 2;
    const btnY = cardY + cardH - 52;

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 19);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ĐÓNG (ESC / P)', btnX + btnW / 2, btnY + 24);

    ctx.restore();
  }
}
