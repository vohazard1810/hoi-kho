import { Camera } from '../core/Camera';
import { DeliveryResultData, Hitbox, Hurtbox } from '../core/types';
import { BossDog } from '../entities/BossDog';
import { Dog } from '../entities/Dog';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { NPC } from '../entities/NPC';
import { Pickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { HazardData, PlatformData, STAGE_1_CONFIG, ZoneData } from '../config/stage1';
import { DebugOverlay, PlayerDebugTelemetry } from '../debug/DebugOverlay';
import { PlaceholderRenderer } from './PlaceholderRenderer';
import { SpriteRenderer } from './SpriteRenderer';
import { AssetManager } from '../assets/AssetManager';
import { GameFeelSnapshot } from '../systems/GameFeelSystem';
import { UpgradeId, UpgradeSnapshot } from '../systems/UpgradeSystem';
import { EquipmentVisualRenderer } from './EquipmentVisualRenderer';
import { ParallaxBackgroundRenderer } from './ParallaxBackgroundRenderer';
import { WorldGeometryRenderer } from './WorldGeometryRenderer';
import { DialogueSnapshot } from '../systems/DialogueSystem';
import { HUB_HUMAN_SCALE, HubProductionRenderer } from './HubProductionRenderer';
import { HubTutorialSnapshot } from '../systems/HubTutorialSystem';
import { StageNpcRenderer } from './StageNpcRenderer';
import { BUILD_ID } from '../config/version';
import { TrainingTarget } from '../systems/TrainingTarget';
import { ProductionVisualsV19 } from './ProductionVisualsV19';
import { EconomySnapshot } from '../systems/EconomySystem';

const STAGE_HUMAN_SCALE = 1.48;
const STAGE_DOG_SCALE = 1.35;
const STAGE_BOSS_SCALE = 1.28;

export interface HubProgressOverlay {
  economy: EconomySnapshot;
  dayRecapOpen: boolean;
  jobBoardOpen: boolean;
  selectedJobIndex: number;
  jobBoardNotice: string | null;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private devMode: boolean = false;
  private readonly stage1Background = new ParallaxBackgroundRenderer();
  private readonly worldGeometry = new WorldGeometryRenderer();
  private readonly hubProduction = new HubProductionRenderer();
  private readonly stageNpc = new StageNpcRenderer();
  private readonly v19Visuals = new ProductionVisualsV19();
  private lastPlayerTelemetry: PlayerDebugTelemetry = {
    visualState: 'idle',
    frameIndex: 0,
    totalFrames: 4,
    animTime: 0,
    renderMode: 'FALLBACK_GRAYBOX',
  };
  private portraitBounds = new WeakMap<object, { x: number; y: number; width: number; height: number }>();
  private encounterLabel = '';
  private encounterAt = 0;
  private epilogueImage: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to obtain 2D Canvas context');
    }
    this.ctx = context;
  }

  public setDevMode(enabled: boolean): void {
    this.devMode = enabled;
  }

  public toggleDevMode(): boolean {
    this.devMode = !this.devMode;
    return this.devMode;
  }

  public getDevMode(): boolean {
    return this.devMode;
  }

  public preloadStage1Background(): Promise<boolean> {
    return this.stage1Background.preload();
  }

  public preloadWorldGeometry(): Promise<boolean> {
    return this.worldGeometry.preload();
  }

  public preloadHubAssets(): Promise<boolean> { return this.hubProduction.preload(); }
  public preloadStageNpcAssets(): Promise<boolean> { return this.stageNpc.preload(); }
  public preloadV19Assets(): Promise<boolean> { return this.v19Visuals.preload(); }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public renderMenuScene(state: {
    selectedIndex: number;
    hasProgress: boolean;
    showTutorial: boolean;
    confirmNewGame: boolean;
    confirmSelection: 0 | 1;
    intro: { page: number; total: number; title: string; body: string } | null;
  }): void {
    this.clear();
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, '#07111f'); gradient.addColorStop(0.55, '#172033'); gradient.addColorStop(1, '#321524');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(249,115,22,0.08)';
    for (let x = -80; x < 1360; x += 110) { ctx.beginPath(); ctx.moveTo(x, 720); ctx.lineTo(x + 360, 0); ctx.lineTo(x + 420, 0); ctx.lineTo(x + 60, 720); ctx.fill(); }

    if (state.intro) {
      ctx.fillStyle = 'rgba(2,6,23,0.86)'; ctx.fillRect(110, 120, 1060, 480);
      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.strokeRect(110, 120, 1060, 480);
      ctx.textAlign = 'center'; ctx.fillStyle = '#fb923c'; ctx.font = 'bold 18px monospace'; ctx.fillText(`CHƯƠNG 1  •  ${state.intro.page + 1}/${state.intro.total}`, 640, 190);
      ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 34px system-ui, sans-serif'; ctx.fillText(state.intro.title, 640, 285);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '20px system-ui, sans-serif'; ctx.fillText(state.intro.body, 640, 355);
      ctx.fillStyle = '#94a3b8'; ctx.font = '14px monospace'; ctx.fillText('[ E / J / SPACE ] TIẾP TỤC     [ ESC ] BỎ QUA', 640, 545);
      return;
    }

    ctx.textAlign = 'center'; ctx.fillStyle = '#fb923c'; ctx.font = '900 62px system-ui, sans-serif'; ctx.fillText('NỢ ƠI, TỚI ĐÂY!', 640, 145);
    ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillText('HÀNH TRÌNH CỦA HỘI KHỜ', 640, 182);
    ctx.fillStyle = '#fde68a'; ctx.font = 'bold 14px monospace'; ctx.fillText('GIAO TỪNG ĐƠN • TRẢ TỪNG KHOẢN • KHÔNG BỎ CUỘC', 640, 210);
    const options = ['CHƠI MỚI', 'TIẾP TỤC', 'HƯỚNG DẪN'];
    options.forEach((label, index) => {
      const y = 285 + index * 74; const selected = state.selectedIndex === index;
      ctx.fillStyle = selected ? 'rgba(249,115,22,0.9)' : 'rgba(15,23,42,0.84)'; ctx.fillRect(430, y, 420, 54);
      ctx.strokeStyle = selected ? '#fdba74' : '#334155'; ctx.lineWidth = selected ? 3 : 1; ctx.strokeRect(430, y, 420, 54);
      ctx.fillStyle = index === 1 && !state.hasProgress ? '#64748b' : '#f8fafc'; ctx.font = 'bold 18px system-ui, sans-serif'; ctx.fillText(label, 640, y + 34);
    });
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px monospace'; ctx.fillText('[ W/S hoặc ↑/↓ ] CHỌN     [ E/J/SPACE ] XÁC NHẬN', 640, 565);
    ctx.fillStyle = '#64748b'; ctx.fillText(`Phiên bản Vertical Slice • Chapter 1  •  ${BUILD_ID}`, 640, 620);

    if (state.showTutorial || state.confirmNewGame) {
      ctx.fillStyle = 'rgba(2,6,23,0.94)'; ctx.fillRect(310, 175, 660, 380); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; ctx.strokeRect(310, 175, 660, 380);
      if (state.showTutorial) {
        ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillText('HƯỚNG DẪN SHIPPER', 640, 225);
        ctx.fillStyle = '#cbd5e1'; ctx.font = '17px monospace';
        ['A/D hoặc ←/→  Di chuyển', 'W/SPACE          Nhảy', 'J                Combo 3 đòn', 'K                Bắn băng keo', 'L                Lướt né', 'Q                Tuyệt kỹ khi Momentum đầy', 'E                Tương tác'].forEach((line, i) => ctx.fillText(line, 640, 275 + i * 34));
        ctx.fillStyle = '#94a3b8'; ctx.font = '13px monospace'; ctx.fillText('[ ESC / E ] QUAY LẠI', 640, 525);
      } else {
        ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 25px system-ui, sans-serif'; ctx.fillText('BẮT ĐẦU LẠI TỪ ĐẦU?', 640, 245);
        ctx.fillStyle = '#cbd5e1'; ctx.font = '16px system-ui, sans-serif'; ctx.fillText('Progress nâng cấp hiện tại sẽ bị xóa.', 640, 292);
        ['KHÔNG, GIỮ SAVE', 'CÓ, CHƠI MỚI'].forEach((label, i) => { const x = 380 + i * 270; const selected = state.confirmSelection === i; ctx.fillStyle = selected ? '#f97316' : '#1e293b'; ctx.fillRect(x, 360, 250, 54); ctx.strokeStyle = selected ? '#fdba74' : '#475569'; ctx.strokeRect(x, 360, 250, 54); ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 15px system-ui'; ctx.fillText(label, x + 125, 394); });
        ctx.fillStyle = '#94a3b8'; ctx.font = '13px monospace'; ctx.fillText('[ ←/→ ] CHỌN     [ E/J ] XÁC NHẬN     [ ESC ] HỦY', 640, 485);
      }
    }
  }

  public renderPrologueScene(
    index: number,
    total: number,
    beat: { kicker: string; title: string; body: string },
    elapsed: number,
    previousIndex: number | null = null,
    transitionProgress = 1
  ): void {
    this.clear();
    const ctx = this.ctx;
    const blend = Math.max(0, Math.min(1, transitionProgress));
    const easedBlend = blend * blend * (3 - 2 * blend);
    let productionArt = false;
    if (previousIndex !== null && blend < 1) {
      productionArt = this.v19Visuals.renderPrologue(ctx, previousIndex, 1280, 720);
      productionArt = this.v19Visuals.renderPrologue(ctx, index, 1280, 720, easedBlend) || productionArt;
    } else {
      productionArt = this.v19Visuals.renderPrologue(ctx, index, 1280, 720);
    }
    const dusk = ctx.createLinearGradient(0, 0, 0, 720);
    dusk.addColorStop(0, index === 0 ? '#101827' : '#47234d');
    dusk.addColorStop(0.62, index < 2 ? '#b4534b' : '#e06c3b');
    dusk.addColorStop(1, '#101827');
    ctx.fillStyle = dusk; if (!productionArt) ctx.fillRect(0, 0, 1280, 720);

    // A restrained bridge silhouette keeps the opening readable and avoids implying self-harm.
    ctx.fillStyle = 'rgba(7,15,29,0.82)'; if (!productionArt) ctx.fillRect(0, 470, 1280, 250);
    if (!productionArt) {
      ctx.fillStyle = '#243247'; ctx.fillRect(0, 500, 1280, 18);
      for (let x = 0; x < 1280; x += 95) ctx.fillRect(x, 430, 8, 90);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 448); ctx.lineTo(1280, 448); ctx.stroke();
    }

    if (!productionArt && index === 0) {
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(835, 292, 250, 150);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(865, 330, 170, 12); ctx.fillRect(865, 365, 135, 9);
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(865, 397, 190, 7);
    } else if (!productionArt && index === 2) {
      ctx.save(); ctx.translate(760, 315); ctx.rotate(-0.18 + Math.sin(elapsed * 3) * 0.03);
      ctx.fillStyle = '#fff7ed'; ctx.fillRect(-120, -72, 240, 144); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 5; ctx.strokeRect(-120, -72, 240, 144);
      ctx.fillStyle = '#f97316'; ctx.font = '900 25px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SXP TUYỂN SHIPPER', 0, -12);
      ctx.fillStyle = '#334155'; ctx.font = 'bold 15px system-ui'; ctx.fillText('NHẬN VIỆC NGAY', 0, 25); ctx.restore();
    } else if (!productionArt && index === 3) {
      ctx.fillStyle = '#f97316'; ctx.fillRect(720, 300, 330, 145); ctx.fillStyle = '#0f172a'; ctx.fillRect(735, 315, 300, 115);
      ctx.fillStyle = '#fff7ed'; ctx.font = '900 34px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SXP', 885, 385);
    }

    const fade = Math.min(1, elapsed * 4);
    ctx.save(); ctx.globalAlpha = fade;
    const captionGradient = ctx.createLinearGradient(0, 365, 0, 720);
    captionGradient.addColorStop(0, 'rgba(2,6,23,0)');
    captionGradient.addColorStop(0.42, 'rgba(2,6,23,0.68)');
    captionGradient.addColorStop(1, 'rgba(2,6,23,0.96)');
    ctx.fillStyle = captionGradient; ctx.fillRect(0, 350, 1280, 370);
    ctx.textAlign = 'left'; ctx.fillStyle = '#fb923c'; ctx.font = 'bold 15px monospace'; ctx.fillText(`${beat.kicker}  •  ${index + 1}/${total}`, 92, 492);
    ctx.fillStyle = '#fff7ed'; ctx.font = '900 32px system-ui, sans-serif'; this.drawWrappedText(beat.title, 92, 542, 1096, 40);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '19px system-ui, sans-serif'; this.drawWrappedText(beat.body, 92, 610, 1060, 29);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '13px monospace';
    ctx.fillText('[ E / J / SPACE ] TIẾP TỤC     [ ESC ] BỎ QUA', 640, 675);
  }

  public renderDialogueOverlay(snapshot: DialogueSnapshot): void {
    if (!snapshot.active || !snapshot.line) return;
    try {
      const ctx = this.ctx;
      const line = snapshot.line;
      const accent = line.tone === 'boss' ? '#ef4444' : line.tone === 'warning' ? '#f59e0b' : line.tone === 'success' ? '#22c55e' : '#38bdf8';
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const boxX = 90, boxY = 565, boxW = 1100, boxH = 135;
      ctx.shadowColor = 'rgba(0,0,0,0.72)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 7;
      ctx.fillStyle = 'rgba(7, 15, 29, 0.96)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = accent;
      ctx.fillRect(boxX, boxY, 6, boxH);
      const hasPortrait = this.renderDialoguePortrait(line.speaker, 112, 575, 96, 110, accent);
      const textX = hasPortrait ? 236 : 122;
      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      ctx.font = '900 14px system-ui, sans-serif';
      ctx.fillText(line.speaker, textX, 590);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '19px system-ui, sans-serif';
      this.drawWrappedText(line.text, textX, 618, hasPortrait ? 920 : 1035, 25);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(`${snapshot.index + 1}/${snapshot.total}  •  [SPACE / J / E] TIẾP  •  [A / D] DI CHUYỂN  •  [ESC] BỎ QUA`, 1162, 686);
      ctx.restore();
    } catch {
      // Safe fallback - dialogue rendering failure must never crash the game loop
    }
  }

  private renderDialoguePortrait(speaker: string, x: number, y: number, w: number, h: number, accent: string): boolean {
    try {
      let image: HTMLImageElement | null = null;
      let sx = 0, sy = 0, sw = 0, sh = 0;
      if (speaker.includes('CÔ BA')) {
        image = this.hubProduction.getCoBaImage();
      } else if (speaker.includes('CHÚ TƯ')) {
        image = this.stageNpc.getImage();
      } else {
        const id = speaker.includes('CHÓ ĐẠI CA') ? 'boss_dog' : speaker.includes('HỘI KHỜ') ? 'player' : '';
        const state = id ? AssetManager.getInstance().getCharacterSet(id)?.states.get('idle') : null;
        if (state) {
          image = state.image;
          sw = state.frameWidth;
          sh = state.frameHeight;
        }
      }
      if (!image || !image.complete || (image.naturalWidth === 0 && image.width === 0)) return false;
      if (!sw) {
        sw = image.naturalWidth || image.width || 100;
        sh = image.naturalHeight || image.height || 100;
      }

      // Safe portrait crop without canvas getImageData
      let cropW = sw;
      let cropH = speaker.includes('CHÓ ĐẠI CA') ? sh : Math.min(sh, Math.round(sw * 0.95));

      this.ctx.save();
      this.ctx.fillStyle = 'rgba(15,23,42,0.96)';
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeStyle = accent;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, w, h);

      this.ctx.beginPath();
      this.ctx.rect(x + 3, y + 3, w - 6, h - 6);
      this.ctx.clip();

      const scale = Math.min((w - 8) / cropW, (h - 8) / cropH);
      const dw = cropW * scale;
      const dh = cropH * scale;
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(image, sx, sy, cropW, cropH, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      this.ctx.restore();
      return true;
    } catch {
      return false;
    }
  }

  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(/\s+/); let line = ''; let row = 0;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(candidate).width > maxWidth && line) {
        this.ctx.fillText(line, x, y + row * lineHeight); line = word; row++;
      } else line = candidate;
    }
    if (line) this.ctx.fillText(line, x, y + row * lineHeight);
  }

  private renderEntityPlayer(camera: Camera, player: Player, upgrades: UpgradeSnapshot, visualScale: number = 1): void {
    const assetManager = AssetManager.getInstance();
    const playerSet = assetManager.getCharacterSet('player');

    if (playerSet && playerSet.status === 'PRODUCTION' && playerSet.isReady) {
      const result = SpriteRenderer.renderPlayer(this.ctx, camera, player, playerSet, visualScale);
      if (result.rendered) {
        this.lastPlayerTelemetry = {
          visualState: result.stateName,
          frameIndex: result.frameIndex,
          totalFrames: result.totalFrames,
          animTime: result.animTime,
          renderMode: 'SPRITE',
        };
        EquipmentVisualRenderer.renderPlayerEquipment(
          this.ctx,
          camera,
          player,
          upgrades,
          result.stateName,
          result.frameIndex,
          visualScale
        );
        return;
      }
    }

    // Safe fallback to geometric graybox representation
    PlaceholderRenderer.renderPlayer(this.ctx, camera, player);
    this.lastPlayerTelemetry = {
      visualState: player.currentVisualState,
      frameIndex: 0,
      totalFrames: 0,
      animTime: player.animTime,
      renderMode: 'FALLBACK_GRAYBOX',
    };
    EquipmentVisualRenderer.renderPlayerEquipment(
      this.ctx,
      camera,
      player,
      upgrades,
      player.currentVisualState,
      0,
      visualScale
    );
  }

  private renderEntityDog(camera: Camera, dog: Dog, visualScale: number = 1): void {
    const assetManager = AssetManager.getInstance();
    const dogSet = assetManager.getCharacterSet('dog');

    if (dogSet && dogSet.status === 'PRODUCTION' && dogSet.isReady) {
      const rendered = SpriteRenderer.renderDog(this.ctx, camera, dog, dogSet, visualScale);
      if (!rendered) {
        PlaceholderRenderer.renderDog(this.ctx, camera, dog);
      }
    } else {
      PlaceholderRenderer.renderDog(this.ctx, camera, dog);
    }
  }

  private renderDogTelegraph(camera: Camera, dog: Dog): void {
    if (dog.state !== 'TELEGRAPH') return;

    const direction = dog.facing === 'right' ? 1 : -1;
    const x = dog.x + dog.width / 2 + direction * 28;
    const position = camera.worldToScreen(x, dog.y + dog.height - 3);
    const pulse = 0.5 + Math.sin(dog.animTime * 28) * 0.2;

    this.ctx.save();
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = `rgba(255, 154, 46, ${pulse * 0.2})`;
    this.ctx.strokeStyle = `rgba(255, 194, 74, ${pulse + 0.25})`;
    this.ctx.beginPath();
    this.ctx.ellipse(position.x, position.y, 34, 9, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderEntityRival(camera: Camera, rival: Rival, visualScale: number = 1): void {
    const assetManager = AssetManager.getInstance();
    const rivalSet = assetManager.getCharacterSet('rival');

    if (rivalSet && rivalSet.status === 'PRODUCTION' && rivalSet.isReady) {
      const rendered = SpriteRenderer.renderRival(this.ctx, camera, rival, rivalSet, visualScale);
      if (!rendered) {
        PlaceholderRenderer.renderRival(this.ctx, camera, rival);
      }
    } else {
      PlaceholderRenderer.renderRival(this.ctx, camera, rival);
    }
  }

  private renderRivalTelegraph(camera: Camera, rival: Rival): void {
    if (rival.state !== 'ATTACK_STARTUP') return;
    const direction = rival.facing === 'right' ? 1 : -1;
    const x = rival.x + rival.width / 2 + direction * 34;
    const pos = camera.worldToScreen(x, rival.attackMode === 'RANGED' ? rival.y + 14 : rival.y + rival.height - 8);
    const pulse = 0.5 + Math.sin(rival.animTime * 28) * 0.2;
    this.ctx.save();
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = `rgba(249,115,22,${pulse * 0.2})`;
    this.ctx.strokeStyle = `rgba(253,186,116,${pulse + 0.25})`;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, rival.attackMode === 'RANGED' ? 22 : 34, direction > 0 ? -1.05 : Math.PI - 1.05, direction > 0 ? 1.05 : Math.PI + 1.05);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    if (rival.attackMode === 'RANGED') {
      this.ctx.fillStyle = '#fff7ed';
      this.ctx.font = 'bold 18px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('!', pos.x, pos.y + 6);
    }
    this.ctx.restore();
  }

  private renderEnemyProjectile(camera: Camera, projectile: EnemyProjectile): void {
    const pos = camera.worldToScreen(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2);
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.rotate(projectile.rotation);
    this.ctx.fillStyle = '#1e3a5f';
    this.ctx.strokeStyle = '#f97316';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 10, 7, 0, Math.PI, Math.PI * 2);
    this.ctx.lineTo(10, 3);
    this.ctx.lineTo(-10, 3);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderEntityThug(camera: Camera, thug: Thug, visualScale: number = 1): void {
    const assetManager = AssetManager.getInstance();
    const thugSet = assetManager.getCharacterSet('thug');

    if (thugSet && thugSet.status === 'PRODUCTION' && thugSet.isReady) {
      const rendered = SpriteRenderer.renderThug(this.ctx, camera, thug, thugSet, visualScale);
      if (!rendered) {
        PlaceholderRenderer.renderThug(this.ctx, camera, thug);
      }
    } else {
      PlaceholderRenderer.renderThug(this.ctx, camera, thug);
    }
  }

  private renderThugTelegraph(camera: Camera, thug: Thug): void {
    const heavy = thug.state === 'HEAVY_TELEGRAPH';
    const charge = thug.state === 'CHARGE_TELEGRAPH';
    if (!heavy && !charge) return;
    const direction = thug.facing === 'right' ? 1 : -1;
    const startX = direction > 0 ? thug.x + thug.width - 8 : thug.x + 8;
    const length = heavy ? 76 : 205;
    const endX = startX + direction * length;
    const a = camera.worldToScreen(startX, thug.y + thug.height - 30);
    const b = camera.worldToScreen(endX, thug.y + thug.height - 30);
    const pulse = 0.55 + Math.sin(thug.animTime * 24) * 0.2;
    this.ctx.save();
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = `rgba(239,68,68,${pulse * 0.25})`;
    this.ctx.strokeStyle = `rgba(254,202,202,${pulse + 0.2})`;
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y - 7);
    this.ctx.lineTo(b.x, b.y - 17);
    this.ctx.lineTo(b.x, b.y + 17);
    this.ctx.lineTo(a.x, a.y + 7);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderEntityBossDog(camera: Camera, boss: BossDog, visualScale: number = 1): void {
    const assetManager = AssetManager.getInstance();
    const bossSet = assetManager.getCharacterSet('boss_dog');

    if (bossSet && bossSet.status === 'PRODUCTION' && bossSet.isReady) {
      const rendered = SpriteRenderer.renderBossDog(this.ctx, camera, boss, bossSet, visualScale);
      if (!rendered) {
        PlaceholderRenderer.renderBossDog(this.ctx, camera, boss);
      }
    } else {
      PlaceholderRenderer.renderBossDog(this.ctx, camera, boss);
    }
  }

  private renderContactShadow(
    camera: Camera,
    entity: { x: number; y: number; width: number; height: number },
    widthScale: number = 1,
    knockedOut: boolean = false
  ): void {
    const feet = camera.worldToScreen(entity.x + entity.width / 2, entity.y + entity.height - 1);
    this.ctx.save();
    const radiusX = entity.width * (knockedOut ? 1.5 : 0.8) * widthScale;
    const shadow = this.ctx.createRadialGradient(feet.x, feet.y, 1, feet.x, feet.y, radiusX);
    shadow.addColorStop(0, knockedOut ? 'rgba(2,6,23,0.62)' : 'rgba(2,6,23,0.42)');
    shadow.addColorStop(1, 'rgba(2,6,23,0)');
    this.ctx.fillStyle = shadow;
    this.ctx.beginPath();
    this.ctx.ellipse(feet.x, feet.y + (knockedOut ? 2 : 0), radiusX, (knockedOut ? 4 : 7) * widthScale, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderBossTelegraph(camera: Camera, boss: BossDog): void {
    const isBite = boss.state === 'BITE_TELEGRAPH';
    const isDash = boss.state === 'DASH_TELEGRAPH';
    const isSlam = boss.state === 'SLAM_TELEGRAPH';
    if (!isBite && !isDash && !isSlam) return;

    const direction = boss.facing === 'right' ? 1 : -1;
    const pulse = 0.55 + Math.sin(boss.animTime * 24) * 0.2;
    const groundY = boss.y + boss.height;
    this.ctx.save();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = `rgba(255,72,42,${pulse + 0.2})`;
    this.ctx.fillStyle = `rgba(255,72,42,${pulse * 0.24})`;

    if (isBite) {
      const pos = camera.worldToScreen(boss.x + boss.width / 2 + direction * 42, boss.y + boss.height / 2);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 39, direction > 0 ? -1.05 : Math.PI - 1.05, direction > 0 ? 1.05 : Math.PI + 1.05);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else if (isDash) {
      const startX = direction > 0 ? boss.x + boss.width : boss.x;
      const endX = startX + direction * 190;
      const a = camera.worldToScreen(startX, groundY - 18);
      const b = camera.worldToScreen(endX, groundY - 18);
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y - 18);
      this.ctx.lineTo(b.x, b.y - 18);
      this.ctx.lineTo(b.x, b.y + 18);
      this.ctx.lineTo(a.x, a.y + 18);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      const center = camera.worldToScreen(boss.x + boss.width / 2 + direction * 85, groundY);
      this.ctx.beginPath();
      this.ctx.ellipse(center.x, center.y, 105, 18, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  public renderHubScene(
    camera: Camera,
    player: Player,
    coba: NPC,
    nearbyPrompt: string | null,
    isOrderAccepted: boolean,
    isOrderOffered: boolean,
    upgradeSnapshot: UpgradeSnapshot,
    isUpgradePanelOpen: boolean,
    selectedUpgradeIndex: number,
    upgradeNotice: { id: UpgradeId; kind: 'PURCHASED' | 'EQUIPPED'; timer: number } | null,
    tutorial: HubTutorialSnapshot,
    training?: TrainingTarget,
    hubProgress?: HubProgressOverlay
  ): void {
    this.clear();

    // 1. Background
    this.encounterLabel = '';
    const productionHub = this.hubProduction.renderBackground(this.ctx, this.canvas.width, this.canvas.height);
    if (!productionHub) PlaceholderRenderer.renderBackground(this.ctx, this.canvas.width, this.canvas.height, 'hub');

    // 2. Ground & Hub Stations
    if (!productionHub) {
      PlaceholderRenderer.renderPlatforms(this.ctx, camera, [{ x: 0, y: 620, width: 1400, height: 100 }], [], [], []);
      PlaceholderRenderer.renderHubStations(this.ctx, camera, isOrderAccepted);
    } else {
      PlaceholderRenderer.renderHubInteractionMarkers(this.ctx, camera, isOrderAccepted);
    }
    if ((hubProgress?.economy.deliveriesCompleted ?? 0) > 0) this.renderJobBoardMarker(camera);

    // 3. NPC Cô Ba
    if (!this.hubProduction.renderCoBa(this.ctx, camera, coba)) PlaceholderRenderer.renderNPC(this.ctx, camera, coba);

    // 4. Player (with production sprite / safe fallback)
    this.renderEntityPlayer(camera, player, upgradeSnapshot, HUB_HUMAN_SCALE);

    if (tutorial.active) {
      this.renderHubTutorial(camera, tutorial);
      if (training) {
        for (const p of training.projectiles) PlaceholderRenderer.renderProjectile(this.ctx, camera, p);
        if (training.flash > 0) {
          const pos = camera.worldToScreen(520, 554);
          this.ctx.save(); this.ctx.fillStyle = '#fde68a'; this.ctx.font = 'bold 13px system-ui'; this.ctx.textAlign = 'center';
          this.ctx.fillText('TRÚNG!', pos.x, pos.y - 36); this.ctx.restore();
        }
        if (tutorial.step?.id === 'DODGE') {
          const pos = camera.worldToScreen(450, 620); const active = training.clock % 2 >= 1.2 && training.clock % 2 < 1.55;
          this.ctx.save(); this.ctx.fillStyle = active ? '#fb923c' : 'rgba(251,146,60,0.22)';
          this.ctx.fillRect(pos.x, pos.y - 4, 140, 4);
          this.ctx.fillStyle = '#fed7aa'; this.ctx.textAlign = 'center'; this.ctx.font = 'bold 12px system-ui';
          this.ctx.fillText(active ? 'NÉ NGAY!' : 'CHỜ TÍN HIỆU', pos.x + 70, pos.y - 105); this.ctx.restore();
        }
      }
    }

    // 5. Hub HUD
    const objectiveText = tutorial.active && tutorial.step
      ? `HUẤN LUYỆN: ${tutorial.step.instruction} [ ${tutorial.step.keyLabel} ]`
      : isOrderAccepted
      ? 'MỤC TIÊU: Đi tới Cửa Ra Hẻm để bắt đầu giao hàng'
      : (hubProgress?.economy.deliveriesCompleted ?? 0) > 0
        ? 'MỤC TIÊU: Xem Bảng Đơn SXP cho ca tiếp theo'
        : 'MỤC TIÊU: Nói chuyện với Cô Ba [ E ] để nhận đơn hàng';
    PlaceholderRenderer.renderHUD(this.ctx, player, 100, 0, nearbyPrompt, objectiveText);
    EquipmentVisualRenderer.renderHud(this.ctx, upgradeSnapshot, player);

    // 6. Order Panel Modal (if open)
    if (isOrderOffered) {
      PlaceholderRenderer.renderOrderPanel(this.ctx);
      this.v19Visuals.renderParcel(this.ctx, 100, 792, 153, 132, 88);
    }
    if (isUpgradePanelOpen) {
      this.renderUpgradePanel(upgradeSnapshot, selectedUpgradeIndex);
      if (upgradeNotice) this.renderEquipmentToast(upgradeSnapshot, upgradeNotice);
    }
    if (hubProgress?.dayRecapOpen) this.renderShiftRecap(hubProgress.economy);
    else if (hubProgress?.jobBoardOpen) this.renderJobBoard(hubProgress);

    // 7. Debug Overlay
    if (this.devMode) {
      const hurtboxes: Hurtbox[] = [player.getHurtbox(), coba.getHurtbox()];
      DebugOverlay.render(
        this.ctx,
        camera,
        player,
        'HUB',
        100,
        0,
        0,
        'ZONE_HUB',
        'NONE',
        1,
        hurtboxes,
        [],
        [{ x: 0, y: 620, width: 1400, height: 100 }],
        this.lastPlayerTelemetry
      );
    }
  }

  private renderJobBoardMarker(camera: Camera): void {
    const p = camera.worldToScreen(790, 455);
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(6, 17, 31, 0.9)';
    this.ctx.fillRect(p.x, p.y, 170, 56);
    this.ctx.strokeStyle = '#fb923c'; this.ctx.lineWidth = 2; this.ctx.strokeRect(p.x, p.y, 170, 56);
    this.ctx.fillStyle = '#38bdf8'; this.ctx.font = '800 12px system-ui'; this.ctx.textAlign = 'center';
    this.ctx.fillText('BẢNG ĐƠN SXP', p.x + 85, p.y + 20);
    this.ctx.fillStyle = '#f8fafc'; this.ctx.font = '700 11px system-ui';
    this.ctx.fillText('[ E ] XEM CA TIẾP', p.x + 85, p.y + 41);
    this.ctx.restore();
  }

  private renderShiftRecap(economy: EconomySnapshot): void {
    const formatVnd = (value: number) => `${Math.max(0, Math.round(value)).toLocaleString('vi-VN')} VNĐ`;
    const x = 348; const y = 166; const w = 584; const h = 390;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(2, 8, 20, 0.78)'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#07111f'; this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#fb923c'; this.ctx.lineWidth = 3; this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = '#fb923c'; this.ctx.fillRect(x, y, w, 58);
    this.ctx.fillStyle = '#07111f'; this.ctx.font = '900 25px system-ui'; this.ctx.textAlign = 'center';
    this.ctx.fillText(`CA ${economy.deliveriesCompleted} HOÀN TẤT`, x + w / 2, y + 38);
    this.ctx.fillStyle = '#94a3b8'; this.ctx.font = '700 13px system-ui';
    this.ctx.fillText('SỔ GIAO HÀNG • SXP EXPRESS', x + w / 2, y + 88);
    const rows: [string, string, string][] = [
      ['TIỀN VỪA TRẢ NỢ', formatVnd(economy.lastPayment), '#4ade80'],
      ['TỔNG ĐÃ TRẢ', formatVnd(economy.debtPaid), '#38bdf8'],
      ['NỢ CÒN LẠI', formatVnd(economy.remainingDebt), '#f8fafc'],
    ];
    rows.forEach(([label, value, color], index) => {
      const rowY = y + 132 + index * 66;
      this.ctx.fillStyle = index % 2 === 0 ? '#0d1b2d' : '#0a1626'; this.ctx.fillRect(x + 34, rowY, w - 68, 52);
      this.ctx.textAlign = 'left'; this.ctx.fillStyle = '#94a3b8'; this.ctx.font = '700 12px system-ui'; this.ctx.fillText(label, x + 52, rowY + 31);
      this.ctx.textAlign = 'right'; this.ctx.fillStyle = color; this.ctx.font = '900 17px system-ui'; this.ctx.fillText(value, x + w - 52, rowY + 32);
    });
    this.ctx.fillStyle = '#e2e8f0'; this.ctx.textAlign = 'center'; this.ctx.font = '700 14px system-ui';
    this.ctx.fillText('[ E / J / SPACE ]  XEM ĐƠN TIẾP THEO', x + w / 2, y + h - 30);
    this.ctx.restore();
  }

  private renderJobBoard(progress: HubProgressOverlay): void {
    const x = 226; const y = 132; const w = 828; const h = 452;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(2, 8, 20, 0.8)'; this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#07111f'; this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#38bdf8'; this.ctx.lineWidth = 2; this.ctx.strokeRect(x, y, w, h);
    this.ctx.fillStyle = '#0b2034'; this.ctx.fillRect(x, y, w, 64);
    this.ctx.fillStyle = '#38bdf8'; this.ctx.font = '900 24px system-ui'; this.ctx.textAlign = 'left';
    this.ctx.fillText('BẢNG ĐƠN SXP', x + 30, y + 40);
    this.ctx.fillStyle = '#94a3b8'; this.ctx.font = '700 12px system-ui'; this.ctx.textAlign = 'right';
    this.ctx.fillText(`ĐÃ GIAO ${progress.economy.deliveriesCompleted} ĐƠN`, x + w - 30, y + 38);

    const cards = [
      { code: '#SXP-8924', title: 'HẺM KHÔNG LỐI THOÁT', meta: '50.000đ + thưởng • Dễ vỡ', status: 'CHƠI LẠI', locked: false },
      { code: '#SXP-8925', title: 'CHUNG CƯ CŨ MƯA ĐÊM', meta: 'Địa hình đa tầng • Giao đêm', status: 'STAGE 2 • SẮP MỞ', locked: true },
    ];
    cards.forEach((card, index) => {
      const cx = x + 34 + index * 391; const cy = y + 92; const cw = 369; const ch = 260;
      const selected = progress.selectedJobIndex === index;
      this.ctx.fillStyle = selected ? '#102944' : '#0b1727'; this.ctx.fillRect(cx, cy, cw, ch);
      this.ctx.strokeStyle = selected ? '#fb923c' : '#334155'; this.ctx.lineWidth = selected ? 3 : 1; this.ctx.strokeRect(cx, cy, cw, ch);
      this.ctx.fillStyle = card.locked ? '#64748b' : '#fb923c'; this.ctx.font = '900 13px system-ui'; this.ctx.textAlign = 'left'; this.ctx.fillText(card.code, cx + 22, cy + 34);
      this.ctx.fillStyle = card.locked ? '#94a3b8' : '#f8fafc'; this.ctx.font = '900 18px system-ui'; this.ctx.fillText(card.title, cx + 22, cy + 74, cw - 44);
      this.ctx.fillStyle = '#94a3b8'; this.ctx.font = '600 13px system-ui'; this.ctx.fillText(card.meta, cx + 22, cy + 108, cw - 44);
      this.ctx.fillStyle = card.locked ? '#1e293b' : '#15263b'; this.ctx.fillRect(cx + 22, cy + 142, cw - 44, 66);
      this.ctx.fillStyle = card.locked ? '#94a3b8' : '#4ade80'; this.ctx.font = '900 14px system-ui'; this.ctx.textAlign = 'center';
      this.ctx.fillText(card.locked ? '🔒 ĐANG MỞ TUYẾN' : '✓ ĐÃ HOÀN THÀNH', cx + cw / 2, cy + 169);
      this.ctx.fillStyle = selected ? '#fb923c' : '#64748b'; this.ctx.fillText(card.status, cx + cw / 2, cy + 196);
    });
    this.ctx.textAlign = 'center'; this.ctx.font = '700 13px system-ui';
    this.ctx.fillStyle = progress.jobBoardNotice ? '#fbbf24' : '#cbd5e1';
    this.ctx.fillText(progress.jobBoardNotice ?? '[ A/D hoặc ←/→ ] Chọn   •   [ E/J ] Xác nhận   •   [ ESC ] Đóng', x + w / 2, y + h - 34);
    this.ctx.restore();
  }

  private renderHubTutorial(camera: Camera, tutorial: HubTutorialSnapshot): void {
    const step = tutorial.step;
    if (!step) return;
    const ctx = this.ctx;
    const target = camera.worldToScreen(520, 620);
    const combatStep = ['ATTACK', 'PROJECTILE', 'DODGE', 'ULTIMATE'].includes(step.id);
    if (combatStep) {
      ctx.save();
      ctx.fillStyle = '#854d0e'; ctx.fillRect(target.x - 18, target.y - 66, 36, 62);
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.strokeRect(target.x - 18, target.y - 66, 36, 62);
      ctx.fillStyle = '#fde68a'; ctx.fillRect(target.x - 11, target.y - 54, 22, 18);
      ctx.fillStyle = '#0f172a'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('TẬP', target.x, target.y - 41);
      ctx.fillStyle = 'rgba(2,6,23,0.78)'; ctx.fillRect(target.x - 58, target.y - 92, 116, 20);
      ctx.fillStyle = '#fef08a'; ctx.fillText('KIỆN HÀNG TẬP', target.x, target.y - 78);
      ctx.restore();
    }

    const x = 930, y = 190, w = 310, h = 142;
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.94)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(x, y, 6, h);
    ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`HUẤN LUYỆN ${tutorial.stepIndex + 1}/${tutorial.totalSteps}`, x + 24, y + 28);
    ctx.fillStyle = '#fff7ed'; ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillText(step.title, x + 24, y + 57);
    ctx.fillStyle = '#cbd5e1'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(step.instruction, x + 24, y + 83);
    ctx.fillStyle = '#f97316'; ctx.fillRect(x + 24, y + 98, 84, 27);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.fillText(step.keyLabel, x + 66, y + 117);
    ctx.fillStyle = '#64748b'; ctx.font = '11px monospace'; ctx.textAlign = 'right'; ctx.fillText('[ESC] BỎ QUA', x + w - 18, y + 117);
    ctx.restore();
  }

  private renderEquipmentToast(
    snapshot: UpgradeSnapshot,
    notice: { id: UpgradeId; kind: 'PURCHASED' | 'EQUIPPED'; timer: number }
  ): void {
    const definition = snapshot.definitions.find((item) => item.id === notice.id);
    if (!definition) return;
    const alpha = Math.min(1, notice.timer * 2.5);
    const x = 465; const y = 278; const w = 350; const h = 112;
    this.ctx.save(); this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = 'rgba(2,6,23,0.97)'; this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = notice.kind === 'PURCHASED' ? '#f97316' : '#22d3ee'; this.ctx.lineWidth = 3; this.ctx.strokeRect(x, y, w, h);
    EquipmentVisualRenderer.renderUpgradeIcon(this.ctx, notice.id, x + 22, y + 24, 64);
    this.ctx.textAlign = 'left'; this.ctx.fillStyle = notice.kind === 'PURCHASED' ? '#fb923c' : '#67e8f9';
    this.ctx.font = 'bold 13px monospace'; this.ctx.fillText(notice.kind === 'PURCHASED' ? 'ĐÃ MỞ KHÓA' : 'ĐÃ TRANG BỊ', x + 105, y + 35);
    this.ctx.fillStyle = '#f8fafc'; this.ctx.font = 'bold 19px system-ui'; this.ctx.fillText(definition.name, x + 105, y + 62);
    this.ctx.fillStyle = '#cbd5e1'; this.ctx.font = '12px system-ui'; this.ctx.fillText(definition.effect, x + 105, y + 84);
    this.ctx.restore();
  }

  private renderUpgradePanel(snapshot: UpgradeSnapshot, selectedIndex: number): void {
    const x = 140;
    const y = 60;
    const w = 1000;
    const h = 600;

    this.ctx.save();
    // Backdrop dark scrim
    this.ctx.fillStyle = 'rgba(2, 6, 18, 0.82)';
    this.ctx.fillRect(0, 0, 1280, 720);

    // Modal background - Carbon-slate workshop aesthetic
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    this.ctx.shadowBlur = 28;
    this.ctx.shadowOffsetY = 8;
    this.ctx.fillStyle = '#070f1e';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    this.ctx.strokeStyle = '#f97316';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(x, y, w, h);

    // Header bar with industrial gradient
    const headGrad = this.ctx.createLinearGradient(x, y, x + w, y);
    headGrad.addColorStop(0, '#ea580c');
    headGrad.addColorStop(1, '#7c2d12');
    this.ctx.fillStyle = headGrad;
    this.ctx.fillRect(x, y, w, 64);
    this.ctx.strokeStyle = '#f97316';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 64);
    this.ctx.lineTo(x + w, y + 64);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '900 22px system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🛠️ BÀN ĐỒ NGHỀ SHIPPER • SXP WORKSHOP', x + 28, y + 41);

    // Right-aligned header stats
    this.ctx.fillStyle = '#fef08a';
    this.ctx.font = 'bold 15px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`⚙ ${snapshot.parts} LINH KIỆN   •   ⭐ UY TÍN ${snapshot.reputation}   •   TIER ${snapshot.unlockedTier}`, x + w - 28, y + 41);

    // Grid of 12 upgrades (2 cols x 6 rows)
    snapshot.definitions.forEach((definition, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = x + 24 + col * 480;
      const cardY = y + 78 + row * 74;
      const cardW = 468;
      const cardH = 64;

      const owned = snapshot.purchased.has(definition.id);
      const equipped = snapshot.equipped.get(definition.branch) === definition.id;
      const locked = definition.tier > snapshot.unlockedTier;
      const isSelected = index === selectedIndex;

      // Card Background
      this.ctx.fillStyle = isSelected
        ? 'rgba(67, 36, 12, 0.95)'
        : locked
        ? 'rgba(15, 23, 42, 0.65)'
        : equipped
        ? 'rgba(6, 78, 59, 0.88)'
        : owned
        ? 'rgba(30, 58, 138, 0.65)'
        : 'rgba(23, 37, 84, 0.5)';
      this.ctx.fillRect(cardX, cardY, cardW, cardH);

      // Card Border / Selection
      if (isSelected) {
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 8;
        this.ctx.strokeRect(cardX, cardY, cardW, cardH);
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.strokeStyle = equipped
          ? '#22c55e'
          : owned
          ? '#38bdf8'
          : locked
          ? '#334155'
          : '#475569';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(cardX, cardY, cardW, cardH);
      }

      // Real equipment icon plus a small branch/tier badge.
      const branchColors: Record<string, string> = { J: '#38bdf8', K: '#fde047', L: '#4ade80', Q: '#c084fc' };
      const badgeColor = branchColors[definition.branch] ?? '#94a3b8';

      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(cardX + 10, cardY + 12, 42, 40);
      this.ctx.strokeStyle = badgeColor;
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeRect(cardX + 10, cardY + 12, 42, 40);

      EquipmentVisualRenderer.renderUpgradeIcon(this.ctx, definition.id, cardX + 13, cardY + 15, 34, locked ? 0.3 : 1);
      this.ctx.fillStyle = badgeColor; this.ctx.font = 'bold 9px monospace'; this.ctx.textAlign = 'center';
      this.ctx.fillText(`${definition.branch}${definition.tier}`, cardX + 31, cardY + 59);

      // Name & Tier
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = locked ? '#64748b' : isSelected ? '#ffffff' : '#f8fafc';
      this.ctx.font = 'bold 14px system-ui, sans-serif';
      this.ctx.fillText(definition.name, cardX + 62, cardY + 26);

      // Effect text
      this.ctx.fillStyle = locked ? '#475569' : '#cbd5e1';
      this.ctx.font = '12px system-ui, sans-serif';
      this.ctx.fillText(definition.effect, cardX + 62, cardY + 48);

      // Status pill / action text on the right
      this.ctx.textAlign = 'right';
      if (locked) {
        this.ctx.fillStyle = '#64748b';
        this.ctx.font = 'bold 11px system-ui, sans-serif';
        this.ctx.fillText('🔒 CẦN UY TÍN 2', cardX + cardW - 14, cardY + 36);
      } else if (equipped) {
        this.ctx.fillStyle = '#86efac';
        this.ctx.font = 'bold 12px system-ui, sans-serif';
        this.ctx.fillText('✓ ĐANG TRANG BỊ', cardX + cardW - 14, cardY + 36);
      } else if (owned) {
        this.ctx.fillStyle = definition.variant ? '#67e8f9' : '#86efac';
        this.ctx.font = 'bold 12px system-ui, sans-serif';
        this.ctx.fillText(definition.variant ? '[ E ] TRANG BỊ' : '✓ ĐÃ KÍCH HOẠT', cardX + cardW - 14, cardY + 36);
      } else {
        const canAfford = snapshot.parts >= definition.cost;
        this.ctx.fillStyle = canAfford ? '#fb923c' : '#ef4444';
        this.ctx.font = 'bold 13px monospace';
        this.ctx.fillText(`⚙ ${definition.cost} [E] MUA`, cardX + cardW - 14, cardY + 36);
      }
    });

    // Footer Help Bar
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(x, y + h - 46, w, 46);
    this.ctx.strokeStyle = '#334155';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + h - 46);
    this.ctx.lineTo(x + w, y + h - 46);
    this.ctx.stroke();

    this.ctx.font = '13px system-ui, sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      '[A / D / W / S] Di chuyển  •  [E / Enter / Space] Mua / Trang bị  •  [Esc] Đóng Bàn Đồ Nghề',
      x + w / 2,
      y + h - 18
    );

    this.ctx.restore();
  }

  public renderStage1Scene(
    camera: Camera,
    player: Player,
    customer: NPC,
    dogs: Dog[],
    rivals: Rival[],
    thugs: Thug[],
    bossDogs: BossDog[],
    pickups: Pickup[],
    projectiles: Projectile[],
    enemyProjectiles: EnemyProjectile[],
    gates: { id: string; gateX: number; isLocked: boolean }[],
    groundSegments: any[],
    platforms: PlatformData[],
    hazards: HazardData[],
    zones: ZoneData[],
    parcelCondition: number,
    bonusReward: number,
    nearbyPrompt: string | null,
    objectiveName: string,
    currentZoneId: string,
    currentEncounterName: string,
    gameFeel: GameFeelSnapshot,
    upgradeSnapshot: UpgradeSnapshot,
    slowedTargetIds: ReadonlySet<string>,
    cueOpacities?: Record<string, number>
  ): void {
    this.clear();

    // 1. Background
    const hasProductionBackground = this.stage1Background.renderBackground(
      this.ctx,
      camera,
      this.canvas.width,
      this.canvas.height
    );
    if (!hasProductionBackground) {
      PlaceholderRenderer.renderBackground(this.ctx, this.canvas.width, this.canvas.height, 'stage1');
    }

    if (hasProductionBackground) {
      this.stage1Background.renderGroundSegments(this.ctx, camera, groundSegments);
    }

    const hasProductionGeometry = this.worldGeometry.isReady();
    if (hasProductionGeometry) {
      this.worldGeometry.renderPlatforms(this.ctx, camera, platforms);
      this.worldGeometry.renderHazards(this.ctx, camera, hazards, this.devMode);
    }

    // 2. Geometry & Hazard Hazards
    PlaceholderRenderer.renderPlatforms(
      this.ctx,
      camera,
      groundSegments,
      platforms,
      hazards,
      this.devMode ? zones : [],
      hasProductionBackground,
      hasProductionGeometry,
      cueOpacities
    );

    // 3. Encounter Gates
    if (!this.worldGeometry.renderEncounterGates(this.ctx, camera, gates, this.devMode)) {
      PlaceholderRenderer.renderEncounterGates(this.ctx, camera, gates);
    }

    // 4. Pickups / Loot
    if (this.v19Visuals.isReady()) for (const pickup of pickups) this.v19Visuals.renderPickup(this.ctx, camera, pickup);
    else PlaceholderRenderer.renderPickups(this.ctx, camera, pickups);

    // 5. Entities (with safe fallback to placeholder)
    if (!this.stageNpc.render(this.ctx, camera, customer)) PlaceholderRenderer.renderNPC(this.ctx, camera, customer);

    for (const d of dogs) {
      this.renderContactShadow(camera, d, STAGE_DOG_SCALE, !d.isAlive);
      this.renderDogTelegraph(camera, d);
      this.renderEntityDog(camera, d, STAGE_DOG_SCALE);
    }

    for (const r of rivals) {
      if (r.driveByPhase === 'DISMOUNTED') {
        this.v19Visuals.renderRivalVehicle(this.ctx, camera, r);
        this.renderContactShadow(camera, r, STAGE_HUMAN_SCALE, !r.isAlive);
        this.renderRivalTelegraph(camera, r);
        this.renderEntityRival(camera, r, STAGE_HUMAN_SCALE);
      } else if (!this.v19Visuals.renderRivalVehicle(this.ctx, camera, r)) {
        this.renderContactShadow(camera, r, STAGE_HUMAN_SCALE, !r.isAlive);
        this.renderEntityRival(camera, r, STAGE_HUMAN_SCALE);
      }
    }

    for (const t of thugs) {
      this.renderContactShadow(camera, t, STAGE_HUMAN_SCALE, !t.isAlive);
      this.renderThugTelegraph(camera, t);
      this.renderEntityThug(camera, t, STAGE_HUMAN_SCALE);
    }

    for (const b of bossDogs) {
      this.renderContactShadow(camera, b, STAGE_BOSS_SCALE, !b.isAlive);
      this.renderBossTelegraph(camera, b);
      this.renderEntityBossDog(camera, b, STAGE_BOSS_SCALE);
    }

    for (const p of projectiles) {
      if (!EquipmentVisualRenderer.renderProjectile(this.ctx, camera, p)) {
        PlaceholderRenderer.renderProjectile(this.ctx, camera, p);
      }
    }

    for (const p of enemyProjectiles) this.renderEnemyProjectile(camera, p);

    this.renderContactShadow(camera, player, STAGE_HUMAN_SCALE);
    this.renderEntityPlayer(camera, player, upgradeSnapshot, STAGE_HUMAN_SCALE);

    // Sticky Tape status is rendered as authentic parcel tape wraps around the target
    const slowTargets = [...dogs, ...rivals, ...thugs, ...bossDogs];
    this.ctx.save();
    for (const target of slowTargets) {
      if (!slowedTargetIds.has(target.id)) continue;
      const box = target.getHurtbox();
      const center = camera.worldToScreen(box.x + box.width / 2, box.y + box.height * 0.55);
      const top = camera.worldToScreen(box.x + box.width / 2, box.y);

      // Render criss-cross sticky tape bands across enemy body
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = '#fde047';
      this.ctx.beginPath();
      this.ctx.moveTo(center.x - box.width * 0.42, center.y - 12);
      this.ctx.lineTo(center.x + box.width * 0.42, center.y + 10);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(center.x - box.width * 0.42, center.y + 10);
      this.ctx.lineTo(center.x + box.width * 0.42, center.y - 12);
      this.ctx.stroke();

      // Floating status tag above head
      this.ctx.fillStyle = 'rgba(7, 15, 29, 0.9)';
      this.ctx.fillRect(top.x - 50, top.y - 22, 100, 18);
      this.ctx.strokeStyle = '#fde047';
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeRect(top.x - 50, top.y - 22, 100, 18);
      this.ctx.fillStyle = '#fef08a';
      this.ctx.font = 'bold 10px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('📦 DÍNH BĂNG KEO', top.x, top.y - 10);
    }
    this.ctx.restore();

    // Parcel protection is event-driven: no persistent ring that can be
    // mistaken for a hitbox or selection marker.
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    for (const pulse of gameFeel.parcelShieldPulses) {
      const progress = 1 - pulse.life / pulse.maxLife;
      const screen = camera.worldToScreen(pulse.x, pulse.y);
      this.ctx.globalAlpha = Math.max(0, 1 - progress);
      this.ctx.strokeStyle = '#86efac';
      this.ctx.lineWidth = Math.max(1, 4 * (1 - progress));
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, 25 + progress * 13, -2.5, 0.6);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // 5b. Combat feedback overlays: visible for grayboxes and future sprites alike.
    const flashEntities = [player, ...dogs, ...rivals, ...thugs, ...bossDogs];
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    for (const entity of flashEntities) {
      if (!gameFeel.flashingTargetIds.has(entity.id)) continue;
      const box = entity.getHurtbox();
      const screen = camera.worldToScreen(box.x + box.width / 2, box.y + box.height / 2);
      const radius = Math.max(box.width, box.height) * 0.72;
      const glow = this.ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
      glow.addColorStop(0, 'rgba(255,255,255,0.68)');
      glow.addColorStop(0.45, 'rgba(255,235,180,0.28)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    this.ctx.save();
    for (const particle of gameFeel.particles) {
      const screen = camera.worldToScreen(particle.x, particle.y);
      const alpha = Math.max(0, particle.life / particle.maxLife);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(
        Math.round(screen.x - particle.size / 2),
        Math.round(screen.y - particle.size / 2),
        particle.size,
        particle.size
      );
    }
    this.ctx.restore();

    // Floating Vietnamese Comic Action Hit Text (BỐP, CHÁT, HUỲNH, HỎA TỐC)
    this.ctx.save();
    for (const hit of gameFeel.comicTexts) {
      const screen = camera.worldToScreen(hit.x, hit.y);
      const progress = hit.life / hit.maxLife;
      this.ctx.globalAlpha = Math.min(1, progress * 1.5);
      this.ctx.font = `900 ${hit.size}px system-ui, sans-serif`;
      this.ctx.textAlign = 'center';

      // Drop shadow for punchy pop
      this.ctx.fillStyle = '#020617';
      this.ctx.fillText(hit.text, screen.x + 2, screen.y + 2);

      this.ctx.fillStyle = hit.color;
      this.ctx.fillText(hit.text, screen.x, screen.y);
    }
    this.ctx.restore();

    // Ultimate Q Explosive Energy Shockwave & Comic Callout
    this.ctx.save();
    for (const pulse of gameFeel.ultimatePulses) {
      const progress = 1 - pulse.life / pulse.maxLife;
      const screen = camera.worldToScreen(pulse.x, pulse.y);
      const radius = 24 + pulse.maxRadius * progress;
      const alpha = Math.max(0, 1 - progress);

      // Layer 1: Outer lightning burst ring
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.9;
      this.ctx.strokeStyle = progress < 0.35 ? '#ffffff' : '#fbbf24';
      this.ctx.lineWidth = Math.max(2, 9 * (1 - progress));
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Layer 2: Fiery inner radial shockwave
      const grad = this.ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(0.3, 'rgba(249, 115, 22, 0.3)');
      grad.addColorStop(0.7, 'rgba(234, 88, 12, 0.15)');
      grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Layer 3: Radiating shockwave speed spikes
      this.ctx.strokeStyle = '#fde047';
      this.ctx.lineWidth = 3;
      for (let a = 0; a < 8; a++) {
        const ang = (Math.PI * 2 * a) / 8 + progress * 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(screen.x + Math.cos(ang) * (radius * 0.5), screen.y + Math.sin(ang) * (radius * 0.5));
        this.ctx.lineTo(screen.x + Math.cos(ang) * (radius * 1.15), screen.y + Math.sin(ang) * (radius * 1.15));
        this.ctx.stroke();
      }
      this.ctx.restore();

      // Cinematic Screen Banner during Ultimate
      if (progress < 0.6) {
        this.ctx.save();
        const bannerAlpha = Math.min(1, (0.6 - progress) * 3);
        this.ctx.globalAlpha = bannerAlpha;
        const bannerW = 440;
        const bannerH = 46;
        const bannerX = 640 - bannerW / 2;
        const bannerY = 85;

        this.ctx.fillStyle = 'rgba(7, 15, 29, 0.95)';
        this.ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        this.ctx.strokeStyle = '#f59e0b';
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        this.ctx.font = '900 20px system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#fef08a';
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 12;
        this.ctx.fillText('⚡ TUYỆT KỸ: HỎA TỐC BƯU CỤC! ⚡', 640, bannerY + 31);
        this.ctx.restore();
      }
    }
    this.ctx.restore();

    // Arcade Combo Counter (Right Side)
    if (gameFeel.comboStreak >= 2) {
      this.ctx.save();
      const comboX = 1240;
      const comboY = 220;
      const pulse = 1 + Math.sin(performance.now() / 90) * 0.08;

      this.ctx.translate(comboX, comboY);
      this.ctx.scale(pulse, pulse);

      this.ctx.fillStyle = 'rgba(7, 15, 29, 0.9)';
      this.ctx.fillRect(-190, -22, 190, 44);
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-190, -22, 190, 44);

      this.ctx.font = '900 22px system-ui, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 10;
      this.ctx.fillText(`🔥 ${gameFeel.comboStreak} HITS!`, -12, 3);
      this.ctx.shadowBlur = 0;

      this.ctx.font = 'bold 11px system-ui';
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.fillText('COMBO SHIPPER', -12, 18);
      this.ctx.restore();
    }

    // 6. Boss Bar if Boss is active in Zone E
    const activeBoss = bossDogs.find((b) => b.isAlive);
    if (activeBoss) {
      PlaceholderRenderer.renderBossBar(this.ctx, activeBoss);
    }

    // 7. HUD
    PlaceholderRenderer.renderHUD(
      this.ctx,
      player,
      parcelCondition,
      bonusReward,
      nearbyPrompt,
      objectiveName
    );
    EquipmentVisualRenderer.renderHud(this.ctx, upgradeSnapshot, player);
    this.v19Visuals.renderParcel(this.ctx, parcelCondition, 882, 22, 48, 48);

    // 8. Debug Overlay (only if DEV_MODE = true)
    if (currentEncounterName !== this.encounterLabel) {
      this.encounterLabel = currentEncounterName;
      this.encounterAt = performance.now();
    }
    const encounterAge = (performance.now() - this.encounterAt) / 1000;
    const isCombatCue = !/^(ĐÃ|GIAO)/.test(currentEncounterName);
    if (isCombatCue && encounterAge < 0.9) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.min(0.96, (0.9 - encounterAge) * 4);
      this.ctx.translate(680, activeBoss ? 188 : 108);
      this.ctx.fillStyle = 'rgba(7, 15, 29, 0.9)';
      this.ctx.fillRect(-164, -18, 328, 34);
      this.ctx.fillStyle = '#fb923c';
      this.ctx.fillRect(-164, -18, 4, 34);
      this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(-163.5, -17.5, 327, 33);
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = '800 14px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(currentEncounterName.replace(/^(MINIBOSS|TRÙM):\s*/, ''), 0, 5, 298);
      this.ctx.restore();
    }
    if (this.devMode) {
      const hurtboxes: Hurtbox[] = [
        player.getHurtbox(),
        customer.getHurtbox(),
        ...dogs.map((d) => d.getHurtbox()),
        ...rivals.map((r) => r.getHurtbox()),
        ...thugs.map((t) => t.getHurtbox()),
        ...bossDogs.map((b) => b.getHurtbox()),
      ];
      const hitboxes: (Hitbox | null)[] = [
        player.getActiveHitbox(),
        ...projectiles.map((p) => p.getHitbox()),
        ...dogs.map((d) => d.getActiveHitbox()),
        ...rivals.map((r) => r.getActiveHitbox()),
        ...thugs.map((t) => t.getActiveHitbox()),
        ...bossDogs.map((b) => b.getActiveHitbox()),
      ];
      const activeEnemyCount =
        dogs.filter((d) => d.isAlive).length +
        rivals.filter((r) => r.isAlive).length +
        thugs.filter((t) => t.isAlive).length +
        bossDogs.filter((b) => b.isAlive).length;

      DebugOverlay.render(
        this.ctx,
        camera,
        player,
        'STAGE 1',
        parcelCondition,
        activeEnemyCount,
        pickups.length,
        currentZoneId,
        currentEncounterName,
        activeBoss ? activeBoss.phase : 1,
        hurtboxes,
        hitboxes,
        [...groundSegments, ...platforms],
        this.lastPlayerTelemetry
      );
    }
  }

  public renderResultScene(result: DeliveryResultData, revealProgress: number = 1): void {
    this.clear();
    PlaceholderRenderer.renderResult(this.ctx, this.canvas.width, this.canvas.height, result, revealProgress);
  }

  public renderEpilogueCutscene(result: DeliveryResultData): void {
    this.clear();
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (!this.epilogueImage && typeof Image !== 'undefined') {
      this.epilogueImage = new Image();
      this.epilogueImage.src = '/assets/cutscenes/epilogue_room.png';
    }

    if (this.epilogueImage && this.epilogueImage.complete && this.epilogueImage.naturalWidth > 0) {
      ctx.drawImage(this.epilogueImage, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#060d19';
      ctx.fillRect(0, 0, w, h);
    }

    // Semi-transparent cinematic story card on left-center
    const cardX = 60;
    const cardY = 60;
    const cardW = 680;
    const cardH = h - 120;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 18, 32, 0.88)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Accent line
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, 4, [12, 12, 0, 0]);
    ctx.fill();

    // Header & Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('HOÀN TẤT CHƯƠNG 1 • HẺM KHÔNG LỐI THOÁT', cardX + 36, cardY + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('ĐÊM VỀ PHÒNG TRỌ', cardX + 36, cardY + 86);

    const payment = result.debtPayment ?? result.totalReward ?? 0;
    const debt = result.remainingDebt ?? Math.max(0, 20_000_000 - payment);
    const lines = [
      'Một ngày giao hàng trầy da tróc vảy... nhưng kiện hàng',
      'đã đến tận tay Chú Tư an toàn nguyên vẹn.',
      '',
      `Tiền công trừ thẳng vào nợ: +${payment.toLocaleString('vi-VN')} VNĐ`,
      `Khoản nợ gốc 20 triệu còn lại: ${debt.toLocaleString('vi-VN')} VNĐ`,
      '',
      'Đêm nay nằm ngửa nhìn trần nhà, quạt máy kêu rè rè.',
      'Khờ mỉm cười nhẹ... Ngày mai Sài Gòn vẫn chờ,',
      'chặng đường giải phóng bản thân vẫn tiếp tục bước tới!'
    ];

    let textY = cardY + 130;
    for (const l of lines) {
      if (l.startsWith('Tiền công') || l.startsWith('Khoản nợ')) {
        ctx.fillStyle = l.startsWith('Tiền công') ? '#22c55e' : '#f59e0b';
        ctx.font = 'bold 17px monospace';
      } else {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '16px system-ui, sans-serif';
      }
      ctx.fillText(l, cardX + 36, textY);
      textY += 28;
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('[ E / J / SPACE ] TRỞ VỀ TRẠM SXP ĐỂ MỞ ĐƠN TIẾP THEO', cardX + 36, cardY + cardH - 26);
    ctx.restore();
  }
}
