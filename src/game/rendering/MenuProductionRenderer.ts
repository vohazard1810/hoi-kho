/**
 * MenuProductionRenderer.ts
 * High-impact, atmospheric Canva-styled Title Screen & Menu renderer.
 * Saigon alleyway night aesthetic, animated neon signage, dynamic rain particles,
 * and modern Canva interactive pill cards.
 */

import { BUILD_ID } from '../config/version';

export interface MenuRenderState {
  selectedIndex: number;
  hasProgress: boolean;
  showTutorial: boolean;
  confirmNewGame: boolean;
  confirmSelection: 0 | 1;
  intro: { page: number; total: number; title: string; body: string } | null;
  elapsed?: number;
}

export class MenuProductionRenderer {
  private keyArtImage: HTMLImageElement | null = null;
  private ready = false;
  private internalTime = 0;

  // Rain particles for dynamic atmosphere
  private readonly rainDrops: Array<{ x: number; y: number; speed: number; length: number; alpha: number }> = [];

  constructor() {
    // Generate deterministic rain drops
    for (let i = 0; i < 48; i++) {
      this.rainDrops.push({
        x: (i * 29) % 1280,
        y: (i * 37) % 720,
        speed: 420 + (i % 7) * 45,
        length: 14 + (i % 5) * 6,
        alpha: 0.15 + (i % 4) * 0.08,
      });
    }
  }

  public async preload(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      this.keyArtImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => (img.naturalWidth > 0 ? resolve(img) : reject(new Error('0x0 image')));
        img.onerror = () => reject(new Error('Failed to load menu_key_art.jpg'));
        img.src = '/assets/menu/menu_key_art.jpg';
      });
      this.ready = true;
    } catch {
      // Graceful procedural fallback if image asset is unavailable
      this.ready = false;
    }
    return this.ready;
  }

  public isReady(): boolean {
    return this.ready && this.keyArtImage !== null;
  }

  /**
   * Main render entry point for the Start Menu
   */
  public render(ctx: CanvasRenderingContext2D, width: number, height: number, state: MenuRenderState): void {
    const time = state.elapsed ?? (this.internalTime += 0.016);

    // 1. Background layer: Cinematic Key Art or Procedural Night Alley
    this.renderAtmosphericBackground(ctx, width, height, time);

    // 2. Dynamic Rain & Atmosphere
    this.renderRainAndAtmosphere(ctx, width, height, time);

    // 3. Intro story beat mode (if active)
    if (state.intro) {
      this.renderIntroCard(ctx, state.intro);
      return;
    }

    // 4. Left-side Header & Neon Title ("NỢ ƠI, TỚI ĐÂY!")
    this.renderTitleAndBranding(ctx, time);

    // 5. Debt Ticker Card (Canva Style)
    this.renderDebtTicker(ctx);

    // 6. Interactive Canva Menu Cards
    this.renderMenuCards(ctx, state, time);

    // 7. Footer keybinding guide
    this.renderFooterGuide(ctx);

    // 8. Modals (Tutorial or Confirm New Game)
    if (state.showTutorial) {
      this.renderTutorialModal(ctx, width, height);
    } else if (state.confirmNewGame) {
      this.renderConfirmNewGameModal(ctx, width, height, state.confirmSelection);
    }
  }

  /**
   * Renders the Saigon dusk/night key art with smooth camera drift and contrast scrim
   */
  private renderAtmosphericBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    if (this.ready && this.keyArtImage) {
      ctx.save();
      // Gentle cinematic camera breath
      const scale = 1.02 + 0.012 * Math.sin(time * 0.4);
      const offsetX = Math.sin(time * 0.3) * 6;
      const offsetY = Math.cos(time * 0.35) * 4;

      const drawW = width * scale;
      const drawH = height * scale;
      const drawX = (width - drawW) / 2 + offsetX;
      const drawY = (height - drawH) / 2 + offsetY;

      ctx.drawImage(this.keyArtImage, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // High-grade procedural dusk city alley backdrop
      const duskGrad = ctx.createLinearGradient(0, 0, 0, height);
      duskGrad.addColorStop(0, '#090d16');
      duskGrad.addColorStop(0.4, '#1e1b4b');
      duskGrad.addColorStop(0.75, '#31102f');
      duskGrad.addColorStop(1, '#050811');
      ctx.fillStyle = duskGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant city silhouette
      ctx.fillStyle = '#0a0e1a';
      for (let i = 0; i < 18; i++) {
        const bw = 60 + (i * 23) % 80;
        const bh = 140 + (i * 47) % 220;
        ctx.fillRect(i * 74, height - bh - 60, bw, bh);
      }
    }

    // Left-side dark scrim vignette: ensures menu text is 100% crisp & readable
    const scrim = ctx.createLinearGradient(0, 0, 680, 0);
    scrim.addColorStop(0, 'rgba(5, 9, 20, 0.95)');
    scrim.addColorStop(0.45, 'rgba(7, 12, 26, 0.85)');
    scrim.addColorStop(0.75, 'rgba(11, 18, 38, 0.5)');
    scrim.addColorStop(1, 'rgba(11, 18, 38, 0)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, 680, height);

    // Top & bottom subtle letterbox shadows
    const topVignette = ctx.createLinearGradient(0, 0, 0, 140);
    topVignette.addColorStop(0, 'rgba(3, 7, 18, 0.7)');
    topVignette.addColorStop(1, 'rgba(3, 7, 18, 0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, width, 140);

    const bottomVignette = ctx.createLinearGradient(0, height - 120, 0, height);
    bottomVignette.addColorStop(0, 'rgba(3, 7, 18, 0)');
    bottomVignette.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
    ctx.fillStyle = bottomVignette;
    ctx.fillRect(0, height - 120, width, 120);
  }

  /**
   * Renders dynamic diagonal rain and ambient neon particles
   */
  private renderRainAndAtmosphere(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    ctx.save();
    ctx.lineWidth = 1.2;

    for (let i = 0; i < this.rainDrops.length; i++) {
      const drop = this.rainDrops[i];
      const curY = (drop.y + time * drop.speed) % (height + 40);
      const curX = (drop.x - time * (drop.speed * 0.28)) % width;
      const safeX = curX < 0 ? curX + width : curX;

      ctx.strokeStyle = `rgba(186, 230, 253, ${drop.alpha})`;
      ctx.beginPath();
      ctx.moveTo(safeX, curY);
      ctx.lineTo(safeX - 4, curY + drop.length);
      ctx.stroke();
    }

    // Ambient warm motorcycle headlight beam on wet street
    const headlightCone = ctx.createRadialGradient(880, 520, 20, 880, 520, 340);
    const pulse = 0.08 + 0.03 * Math.sin(time * 3);
    headlightCone.addColorStop(0, `rgba(254, 240, 138, ${pulse * 1.5})`);
    headlightCone.addColorStop(0.5, `rgba(251, 146, 60, ${pulse})`);
    headlightCone.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = headlightCone;
    ctx.fillRect(600, 360, 680, 360);

    ctx.restore();
  }

  /**
   * Renders the top-left branding pill and neon main game title
   */
  private renderTitleAndBranding(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();

    // 1. Canva Pill Badge: Department & Night Shift
    const badgeX = 84;
    const badgeY = 62;
    const badgeW = 390;
    const badgeH = 32;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pulsing live indicator
    const livePulse = Math.sin(time * 4) > 0;
    ctx.fillStyle = livePulse ? '#22c55e' : '#15803d';
    ctx.beginPath();
    ctx.arc(badgeX + 18, badgeY + 16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SXP COURIER • SÀI GÒN 2026', badgeX + 32, badgeY + 20);

    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('CA ĐÊM HẺM 89', badgeX + badgeW - 16, badgeY + 20);
    ctx.restore();

    // 2. Electric Neon Title: "NỢ ƠI, TỚI ĐÂY!"
    // Neon tube flicker effect
    const isFlickering = (Math.sin(time * 7.3) > 0.96 && Math.sin(time * 19) > 0.5);
    const neonIntensity = isFlickering ? 0.45 : 1.0;

    const titleX = 84;
    const titleY = 145;

    // Glowing wire mount behind neon letters
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(titleX - 10, titleY - 18);
    ctx.lineTo(titleX + 440, titleY - 18);
    ctx.stroke();

    // Multi-pass neon glow
    ctx.textAlign = 'left';
    ctx.font = '900 58px system-ui, -apple-system, sans-serif';

    // Pass 1: Outer wide bloom
    ctx.save();
    ctx.shadowColor = `rgba(249, 115, 22, ${0.85 * neonIntensity})`;
    ctx.shadowBlur = 32;
    ctx.fillStyle = '#ea580c';
    ctx.fillText('NỢ ƠI, TỚI ĐÂY!', titleX, titleY);
    ctx.restore();

    // Pass 2: Sharp mid glow
    ctx.save();
    ctx.shadowColor = `rgba(253, 186, 116, ${0.9 * neonIntensity})`;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f97316';
    ctx.fillText('NỢ ƠI, TỚI ĐÂY!', titleX, titleY);
    ctx.restore();

    // Pass 3: White-hot neon tube core
    ctx.fillStyle = isFlickering ? '#fdba74' : '#fff7ed';
    ctx.fillText('NỢ ƠI, TỚI ĐÂY!', titleX, titleY);

    // 3. Subtitle Banner: Canva comic tag
    const subY = titleY + 36;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('★ HÀNH TRÌNH CỦA HỘI KHỜ — ĐỜI SHIPPER TRẢ NỢ ★', titleX + 2, subY);
    ctx.letterSpacing = '0px';

    ctx.restore();
  }

  /**
   * Renders the F89 Debt Status Ticket (Canva card)
   */
  private renderDebtTicker(ctx: CanvasRenderingContext2D): void {
    const cardX = 84;
    const cardY = 202;
    const cardW = 440;
    const cardH = 58;

    ctx.save();
    // Glassmorphism card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Red warning accent bar on left edge
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 6, cardH, [10, 0, 0, 10]);
    ctx.fill();

    // Debt ledger labels
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('HỢP ĐỒNG NỢ F89 • KHOẢN VAY BAN ĐẦU:', cardX + 18, cardY + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px monospace';
    ctx.fillText('20.000.000 VNĐ', cardX + 18, cardY + 44);

    // Right side: Interest tag
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('LÃI SUẤT: 15%/NGÀY', cardX + cardW - 14, cardY + 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText('Chủ nợ: Đại Ca Bảy Thầu', cardX + cardW - 14, cardY + 42);

    ctx.restore();
  }

  /**
   * Renders modern Canva-styled interactive menu buttons
   */
  private renderMenuCards(ctx: CanvasRenderingContext2D, state: MenuRenderState, time: number): void {
    const startX = 84;
    const startY = 282;
    const cardW = 440;
    const cardH = 68;
    const gap = 16;

    const options = [
      {
        id: '01',
        label: 'CHƠI MỚI',
        sub: 'Bắt đầu ca giao hàng mới & xem câu chuyện mở đầu',
        badge: '★ BẮT ĐẦU',
        available: true,
      },
      {
        id: '02',
        label: 'TIẾP TỤC',
        sub: state.hasProgress
          ? 'Trở lại Hub SXP với xe & trang bị đã nâng cấp'
          : 'Chưa có bản lưu — chọn [Chơi mới] để bắt đầu',
        badge: state.hasProgress ? '✔ CÓ SAVE' : '🔒 CHƯA LƯU',
        available: state.hasProgress,
      },
      {
        id: '03',
        label: 'HƯỚNG DẪN',
        sub: 'Bảng phím điều khiển, combo tự vệ & kỹ năng shipper',
        badge: '? KỸ NĂNG',
        available: true,
      },
    ];

    options.forEach((opt, index) => {
      const isSelected = state.selectedIndex === index;
      const y = startY + index * (cardH + gap);

      // Selected card slides slightly right with elastic spring animation
      const animOffset = isSelected ? 14 + Math.sin(time * 5) * 1.5 : 0;
      const curX = startX + animOffset;

      ctx.save();

      if (isSelected) {
        // 1. Glowing outer shadow
        ctx.shadowColor = 'rgba(249, 115, 22, 0.65)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // 2. Vibrant SXP sunset gradient card fill
        const btnGrad = ctx.createLinearGradient(curX, y, curX + cardW, y + cardH);
        btnGrad.addColorStop(0, '#ea580c');
        btnGrad.addColorStop(0.5, '#f97316');
        btnGrad.addColorStop(1, '#fb923c');
        ctx.fillStyle = btnGrad;
        ctx.beginPath();
        ctx.roundRect(curX, y, cardW, cardH, 14);
        ctx.fill();

        // White-gold active border
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        // Unselected card: Dark translucent glassmorphism
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(curX, y, cardW, cardH, 14);
        ctx.fill();

        ctx.strokeStyle = opt.available ? 'rgba(51, 65, 85, 0.8)' : 'rgba(51, 65, 85, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();

      // Card Content
      ctx.save();

      // Leading indicator icon or number
      if (isSelected) {
        // Animated scooter cursor
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('🛵 ▶', curX + 16, y + 36);

        // Main label
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px system-ui, -apple-system, sans-serif';
        ctx.fillText(opt.label, curX + 70, y + 32);

        // Subtitle text
        ctx.fillStyle = '#fff7ed';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(opt.sub, curX + 70, y + 52);

        // Right-side badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.roundRect(curX + cardW - 96, y + 14, 82, 24, 6);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(opt.badge, curX + cardW - 55, y + 30);
      } else {
        // Number badge
        ctx.fillStyle = opt.available ? '#94a3b8' : '#475569';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`[${opt.id}]`, curX + 18, y + 34);

        // Main label
        ctx.fillStyle = opt.available ? '#f8fafc' : '#64748b';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(opt.label, curX + 66, y + 32);

        // Subtitle text
        ctx.fillStyle = opt.available ? '#94a3b8' : '#475569';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(opt.sub, curX + 66, y + 52);

        // Right-side badge
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.beginPath();
        ctx.roundRect(curX + cardW - 96, y + 14, 82, 24, 6);
        ctx.fill();

        ctx.fillStyle = opt.available ? '#cbd5e1' : '#475569';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(opt.badge, curX + cardW - 55, y + 30);
      }

      ctx.restore();
    });
  }

  /**
   * Renders the footer keycap control pill
   */
  private renderFooterGuide(ctx: CanvasRenderingContext2D): void {
    const barX = 84;
    const barY = 560;
    const barW = 440;
    const barH = 42;

    ctx.save();
    // Glass pill background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 21);
    ctx.fill();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('[ ↑ / ↓ ] CHỌN     [ ENTER / E / J ] BẮT ĐẦU', barX + barW / 2, barY + 26);

    // Build ID and engine label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(`Phiên bản Vertical Slice • Chapter 1  •  ${BUILD_ID}`, barX + 6, barY + 68);

    ctx.restore();
  }

  /**
   * Renders modern Canva-styled Tutorial Modal
   */
  private renderTutorialModal(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    // Dark backdrop
    ctx.fillStyle = 'rgba(3, 7, 18, 0.88)';
    ctx.fillRect(0, 0, width, height);

    // Modal card
    const mw = 720;
    const mh = 530;
    const mx = (width - mw) / 2;
    const my = (height - mh) / 2;

    // Card shadow & base
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 32;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 16);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header gradient
    const headGrad = ctx.createLinearGradient(mx, my, mx + mw, my + 54);
    headGrad.addColorStop(0, '#0284c7');
    headGrad.addColorStop(1, '#6366f1');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, 54, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CẨM NANG SHIPPER SÀI GÒN — HỘI KHỜ', mx + mw / 2, my + 34);

    // Sections
    const sections = [
      {
        title: 'DI CHUYỂN & LUỒN LÁCH HẺM',
        keys: [
          { key: 'A / D hoặc ← / →', desc: 'Chạy qua lại trong hẻm' },
          { key: 'W / SPACE', desc: 'Nhảy qua chướng ngại vật & mái tôn' },
        ],
      },
      {
        title: 'TÁC CHIẾN SHIPPER TỰ VỆ',
        keys: [
          { key: 'J', desc: 'Đấm combo 3 đòn liên hoàn' },
          { key: 'K', desc: 'Bắn súng băng keo SXP giữ hàng & trói quái' },
          { key: 'L', desc: 'Lướt né phản xạ (Perfect Dodge làm chậm)' },
          { key: 'Q', desc: 'Kích hoạt Tuyệt Kỹ khi thanh Momentum đầy' },
        ],
      },
      {
        title: 'TƯƠNG TÁC & THƯƠNG MẠI',
        keys: [
          { key: 'E', desc: 'Nói chuyện Chú Bảy (vá xe), Chị Ba (nước mía), trả nợ' },
          { key: 'P', desc: 'Bật / Tắt máy in hóa đơn POS SXP Inspector' },
        ],
      },
    ];

    let secY = my + 74;
    sections.forEach((sec) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`● ${sec.title}`, mx + 36, secY);
      secY += 18;

      sec.keys.forEach((k) => {
        // Key badge
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(mx + 36, secY, 190, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(k.key, mx + 131, secY + 16);

        // Description
        ctx.textAlign = 'left';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(k.desc, mx + 242, secY + 16);

        secY += 30;
      });
      secY += 10;
    });

    // Close button
    const btnW = 280;
    const btnH = 40;
    const btnX = mx + (mw - btnW) / 2;
    const btnY = my + mh - 58;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#0284c7');
    btnGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 20);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ĐÃ HIỂU [ ESC / E ]', mx + mw / 2, btnY + 25);

    ctx.restore();
  }

  /**
   * Renders modern New Game Confirmation Modal
   */
  private renderConfirmNewGameModal(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    confirmSelection: 0 | 1
  ): void {
    ctx.save();

    // Dark backdrop
    ctx.fillStyle = 'rgba(3, 7, 18, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Modal card
    const mw = 620;
    const mh = 360;
    const mx = (width - mw) / 2;
    const my = (height - mh) / 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 32;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 16);
    ctx.fill();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Warning Header
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, 52, [16, 16, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ CẢNH BÁO: BẮT ĐẦU CHƠI MỚI?', mx + mw / 2, my + 33);

    // Body text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Bắt đầu chơi mới sẽ xóa toàn bộ số tiền tiết kiệm và các trang bị xe', mx + mw / 2, my + 110);
    ctx.fillText('đã nâng cấp tại Trạm Hub SXP của bạn.', mx + mw / 2, my + 138);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText('Hành động này không thể hoàn tác!', mx + mw / 2, my + 175);

    // Action buttons
    const btns = [
      { label: 'KHÔNG, GIỮ SAVE', danger: false },
      { label: 'CÓ, CHƠI MỚI', danger: true },
    ];

    btns.forEach((btn, i) => {
      const isSelected = confirmSelection === i;
      const bx = mx + 50 + i * 270;
      const by = my + 220;
      const bw = 250;
      const bh = 54;

      if (isSelected) {
        ctx.shadowColor = btn.danger ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = btn.danger ? '#dc2626' : '#0284c7';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e293b';
      }

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 12);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ffffff' : '#475569';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, bx + bw / 2, by + 33);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ ← / → ] CHỌN     [ ENTER / E / J ] XÁC NHẬN     [ ESC ] HỦY', mx + mw / 2, my + 316);

    ctx.restore();
  }

  /**
   * Renders the prologue intro card
   */
  private renderIntroCard(
    ctx: CanvasRenderingContext2D,
    intro: { page: number; total: number; title: string; body: string }
  ): void {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(110, 120, 1060, 480);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.strokeRect(110, 120, 1060, 480);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fb923c';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`CHƯƠNG 1  •  ${intro.page + 1}/${intro.total}`, 640, 190);

    ctx.fillStyle = '#fff7ed';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(intro.title, 640, 285);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(intro.body, 640, 355);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText('[ E / J / SPACE ] TIẾP TỤC     [ ESC ] BỎ QUA', 640, 545);
  }
}
