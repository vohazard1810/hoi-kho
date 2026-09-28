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
import { AlleyRat } from '../entities/AlleyRat';
import { SaboteurShipper } from '../entities/SaboteurShipper';
import { AlleyGuard } from '../entities/AlleyGuard';
import { AlleyBrat } from '../entities/AlleyBrat';
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

const STAGE_HUMAN_SCALE = 1.48; // Baseline: const STAGE_HUMAN_SCALE = 1.25
const STAGE_DOG_SCALE = 1.35;
const STAGE_BOSS_SCALE = 1.28;

export interface HubProgressOverlay {
  economy: EconomySnapshot;
  dayRecapOpen: boolean;
  jobBoardOpen: boolean;
  selectedJobIndex: number;
  jobBoardNotice: string | null;
}

export interface StageHazardOverlay {
  droppedParcel: { x: number; y: number; condition?: number } | null;
  motorbike: { active: boolean; warning: boolean; x: number; y: number; facing: 'left' | 'right' } | null;
  dogClamp: { active: boolean; mashRemaining: number } | null;
  waterSplash: { x: number; warning: boolean; active: boolean } | null;
  phoneAlert: { title: string; text: string; timer: number; icon: string } | null;
  stageTimer: number;
  rats?: AlleyRat[];
  saboteurs?: SaboteurShipper[];
  guards?: AlleyGuard[];
  bananaTraps?: { x: number; y: number }[];
  brats?: AlleyBrat[];
  streetNpcs?: NPC[];
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
      // Drop shadow on floor
      ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
      ctx.beginPath();
      ctx.ellipse(target.x, target.y - 4, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render genuine high-res delivery parcel backpack
      const rendered = this.v19Visuals.renderParcel(ctx, 100, target.x - 32, target.y - 64, 64, 48);
      if (!rendered) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(target.x - 24, target.y - 56, 48, 40);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(target.x - 24, target.y - 56, 48, 40);
      }

      // Glowing targeting / training ring
      const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.55 + pulse * 0.45})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y - 38, 36 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      // Modern stylish label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(target.x - 55, target.y - 88, 110, 22);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(target.x - 55, target.y - 88, 110, 22);
      ctx.fillStyle = '#fed7aa';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('📦 MỤC TIÊU TẬP', target.x, target.y - 73);
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
    const x = 120;
    const y = 44;
    const w = 1040;
    const h = 632;

    this.ctx.save();
    // Backdrop dark scrim with radial ambient
    this.ctx.fillStyle = 'rgba(2, 6, 18, 0.88)';
    this.ctx.fillRect(0, 0, 1280, 720);

    // Vignette shadow behind modal
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    this.ctx.shadowBlur = 32;
    this.ctx.shadowOffsetY = 12;

    // Angled chamfered modal chassis
    const chamfer = 14;
    this.ctx.beginPath();
    this.ctx.moveTo(x + chamfer, y);
    this.ctx.lineTo(x + w - chamfer, y);
    this.ctx.lineTo(x + w, y + chamfer);
    this.ctx.lineTo(x + w, y + h - chamfer);
    this.ctx.lineTo(x + w - chamfer, y + h);
    this.ctx.lineTo(x + chamfer, y + h);
    this.ctx.lineTo(x, y + h - chamfer);
    this.ctx.lineTo(x, y + chamfer);
    this.ctx.closePath();

    // High-tech carbon gradient body
    const bodyGrad = this.ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0, '#0a101d');
    bodyGrad.addColorStop(0.5, '#070c16');
    bodyGrad.addColorStop(1, '#050811');
    this.ctx.fillStyle = bodyGrad;
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    // Armored outer chassis border
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Corner tactical brackets in glowing neon orange
    const bracketLen = 22;
    this.ctx.strokeStyle = '#f97316';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'square';

    // Top-Left bracket
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + chamfer + bracketLen);
    this.ctx.lineTo(x, y + chamfer);
    this.ctx.lineTo(x + chamfer, y);
    this.ctx.lineTo(x + chamfer + bracketLen, y);
    this.ctx.stroke();

    // Top-Right bracket
    this.ctx.beginPath();
    this.ctx.moveTo(x + w - chamfer - bracketLen, y);
    this.ctx.lineTo(x + w - chamfer, y);
    this.ctx.lineTo(x + w, y + chamfer);
    this.ctx.lineTo(x + w, y + chamfer + bracketLen);
    this.ctx.stroke();

    // Bottom-Left bracket
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + h - chamfer - bracketLen);
    this.ctx.lineTo(x, y + h - chamfer);
    this.ctx.lineTo(x + chamfer, y + h);
    this.ctx.lineTo(x + chamfer + bracketLen, y + h);
    this.ctx.stroke();

    // Bottom-Right bracket
    this.ctx.beginPath();
    this.ctx.moveTo(x + w - chamfer - bracketLen, y + h);
    this.ctx.lineTo(x + w - chamfer, y + h);
    this.ctx.lineTo(x + w, y + h - chamfer);
    this.ctx.lineTo(x + w, y + h - chamfer - bracketLen);
    this.ctx.stroke();

    // Header bar with industrial gradient and top hazard warning line
    const headerH = 66;
    const headGrad = this.ctx.createLinearGradient(x, y, x + w, y);
    headGrad.addColorStop(0, '#1c1917');
    headGrad.addColorStop(0.3, '#292524');
    headGrad.addColorStop(0.7, '#1c1917');
    headGrad.addColorStop(1, '#0c0a09');
    this.ctx.fillStyle = headGrad;
    this.ctx.fillRect(x + 2, y + 2, w - 4, headerH);

    // Hazard accent strip along the very top of header
    this.ctx.fillStyle = '#ea580c';
    this.ctx.fillRect(x + chamfer, y + 2, w - chamfer * 2, 3);

    // Bottom border of header
    this.ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + headerH);
    this.ctx.lineTo(x + w, y + headerH);
    this.ctx.stroke();

    // SXP Icon & Title
    this.ctx.fillStyle = '#f97316';
    this.ctx.font = '900 13px system-ui, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('SXP LOGISTICS ARMORY', x + 24, y + 26);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '900 20px system-ui, sans-serif';
    this.ctx.fillText('🛠️ BÀN ĐỒ NGHỀ SHIPPER', x + 24, y + 50);

    // Tactical Pill Badges for Parts, Reputation, Tier
    const badgeY = y + 22;
    const badgeH = 26;

    const drawBadge = (bx: number, bw: number, label: string, valText: string, color: string, bg: string) => {
      this.ctx.fillStyle = bg;
      this.ctx.fillRect(bx, badgeY, bw, badgeH);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeRect(bx, badgeY, bw, badgeH);
      this.ctx.fillStyle = color;
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(label, bx + 8, badgeY + 17);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '900 12px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(valText, bx + bw - 8, badgeY + 17);
    };

    const b3W = 120, b2W = 140, b1W = 150;
    const b3X = x + w - 24 - b3W;
    const b2X = b3X - 12 - b2W;
    const b1X = b2X - 12 - b1W;

    drawBadge(b1X, b1W, '⚙ LINH KIỆN', `${snapshot.parts}`, '#fbbf24', 'rgba(245, 158, 11, 0.15)');
    drawBadge(b2X, b2W, '⭐ UY TÍN', `CẤP ${snapshot.reputation}`, '#fde047', 'rgba(234, 179, 8, 0.15)');
    drawBadge(b3X, b3W, '🛡️ CẤP BẬC', `TIER ${snapshot.unlockedTier}`, '#38bdf8', 'rgba(56, 189, 248, 0.15)');

    // Grid of 12 upgrades (2 cols x 6 rows)
    const cardW = 488;
    const cardH = 70;
    const startY = y + headerH + 12;
    const rowGap = 12;
    const colGap = 16;
    const leftMargin = x + 24;

    snapshot.definitions.forEach((definition, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = leftMargin + col * (cardW + colGap);
      const cardY = startY + row * (cardH + rowGap);

      const owned = snapshot.purchased.has(definition.id);
      const equipped = snapshot.equipped.get(definition.branch) === definition.id;
      const locked = definition.tier > snapshot.unlockedTier;
      const isSelected = index === selectedIndex;

      const branchColors: Record<string, string> = {
        J: '#38bdf8',
        K: '#facc15',
        L: '#4ade80',
        Q: '#fb923c',
      };
      const branchColor = branchColors[definition.branch] ?? '#94a3b8';

      // Card Base Background
      this.ctx.save();
      const cardGrad = this.ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
      if (isSelected) {
        cardGrad.addColorStop(0, '#2e1807');
        cardGrad.addColorStop(0.5, '#431407');
        cardGrad.addColorStop(1, '#1c0a00');
      } else if (equipped) {
        cardGrad.addColorStop(0, '#062d1f');
        cardGrad.addColorStop(0.7, '#041f16');
        cardGrad.addColorStop(1, '#02150f');
      } else if (owned) {
        cardGrad.addColorStop(0, '#0c223c');
        cardGrad.addColorStop(0.7, '#08172c');
        cardGrad.addColorStop(1, '#050d1a');
      } else if (locked) {
        cardGrad.addColorStop(0, '#0b0f19');
        cardGrad.addColorStop(1, '#060910');
      } else {
        cardGrad.addColorStop(0, '#0f172a');
        cardGrad.addColorStop(1, '#090d16');
      }

      this.ctx.fillStyle = cardGrad;

      // Chamfered top-right card shape
      const cChamfer = 10;
      this.ctx.beginPath();
      this.ctx.moveTo(cardX, cardY);
      this.ctx.lineTo(cardX + cardW - cChamfer, cardY);
      this.ctx.lineTo(cardX + cardW, cardY + cChamfer);
      this.ctx.lineTo(cardX + cardW, cardY + cardH);
      this.ctx.lineTo(cardX, cardY + cardH);
      this.ctx.closePath();
      this.ctx.fill();

      // Card Border & Glow
      if (isSelected) {
        const pulse = 0.7 + Math.sin(performance.now() * 0.006) * 0.3;
        this.ctx.shadowColor = '#f59e0b';
        this.ctx.shadowBlur = 10 * pulse;
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Selection left indicator chevron
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.beginPath();
        this.ctx.moveTo(cardX - 12, cardY + cardH / 2 - 6);
        this.ctx.lineTo(cardX - 4, cardY + cardH / 2);
        this.ctx.lineTo(cardX - 12, cardY + cardH / 2 + 6);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        this.ctx.strokeStyle = equipped
          ? '#22c55e'
          : owned
          ? '#38bdf8'
          : locked
          ? '#1e293b'
          : '#334155';
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }

      // Branch color stripe on left edge
      this.ctx.fillStyle = locked ? '#475569' : branchColor;
      this.ctx.fillRect(cardX, cardY, 4, cardH);

      // Recessed Icon Socket
      const sockX = cardX + 12;
      const sockY = cardY + 9;
      const sockW = 50;
      const sockH = 50;

      this.ctx.fillStyle = '#030712';
      this.ctx.fillRect(sockX, sockY, sockW, sockH);
      this.ctx.strokeStyle = locked ? '#1e293b' : branchColor;
      this.ctx.lineWidth = 1.2;
      this.ctx.strokeRect(sockX, sockY, sockW, sockH);

      // Render authentic illustrated equipment artwork
      EquipmentVisualRenderer.renderUpgradeIcon(
        this.ctx,
        definition.id,
        sockX + 5,
        sockY + 5,
        40,
        locked ? 0.3 : 1
      );

      // Branch tag pill on bottom-right of icon socket
      this.ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
      this.ctx.fillRect(sockX + sockW - 20, sockY + sockH - 12, 19, 11);
      this.ctx.fillStyle = locked ? '#64748b' : branchColor;
      this.ctx.font = 'bold 8px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${definition.branch}${definition.tier}`, sockX + sockW - 10, sockY + sockH - 3);

      // Name & Variant Tag
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = locked ? '#64748b' : isSelected ? '#ffffff' : '#f8fafc';
      this.ctx.font = '900 13px system-ui, sans-serif';
      const nameW = this.ctx.measureText(definition.name).width;
      this.ctx.fillText(definition.name, cardX + 70, cardY + 25);

      if (definition.variant) {
        const tagX = cardX + 70 + nameW + 8;
        const tagY = cardY + 14;
        const tagW = 68;
        const tagH = 15;
        this.ctx.fillStyle = locked ? 'rgba(51, 65, 85, 0.4)' : 'rgba(2, 6, 23, 0.7)';
        this.ctx.fillRect(tagX, tagY, tagW, tagH);
        this.ctx.strokeStyle = locked ? '#334155' : branchColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(tagX, tagY, tagW, tagH);

        this.ctx.fillStyle = locked ? '#64748b' : branchColor;
        this.ctx.font = 'bold 8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('★ BIẾN THỂ', tagX + tagW / 2, tagY + 11);
      }

      // Effect Text
      this.ctx.fillStyle = locked ? '#475569' : '#cbd5e1';
      this.ctx.font = '11px system-ui, sans-serif';
      this.ctx.fillText(definition.effect, cardX + 70, cardY + 47);

      // Status Pill / Action Button on the Right
      const btnW = 124;
      const btnH = 26;
      const btnX = cardX + cardW - btnW - 12;
      const btnY = cardY + (cardH - btnH) / 2;

      this.ctx.textAlign = 'center';
      if (locked) {
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        this.ctx.fillRect(btnX, btnY, btnW, btnH);
        this.ctx.strokeStyle = '#334155';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        this.ctx.fillStyle = '#64748b';
        this.ctx.font = 'bold 10px system-ui, sans-serif';
        this.ctx.fillText('🔒 CẦN UY TÍN 2', btnX + btnW / 2, btnY + 17);
      } else if (equipped) {
        this.ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        this.ctx.fillRect(btnX, btnY, btnW, btnH);
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        this.ctx.fillStyle = '#4ade80';
        this.ctx.font = '900 10px system-ui, sans-serif';
        this.ctx.fillText('✓ ĐANG TRANG BỊ', btnX + btnW / 2, btnY + 17);
      } else if (owned) {
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        this.ctx.fillRect(btnX, btnY, btnW, btnH);
        this.ctx.strokeStyle = '#0284c7';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        this.ctx.fillStyle = '#38bdf8';
        this.ctx.font = '900 10px system-ui, sans-serif';
        this.ctx.fillText(definition.variant ? '[ E ] TRANG BỊ' : '✓ ĐÃ MỞ KHÓA', btnX + btnW / 2, btnY + 17);
      } else {
        const canAfford = snapshot.parts >= definition.cost;
        this.ctx.fillStyle = canAfford ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.15)';
        this.ctx.fillRect(btnX, btnY, btnW, btnH);
        this.ctx.strokeStyle = canAfford ? '#f97316' : '#ef4444';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(btnX, btnY, btnW, btnH);

        this.ctx.fillStyle = canAfford ? '#fbbf24' : '#f87171';
        this.ctx.font = '900 11px monospace';
        this.ctx.fillText(`⚙ ${definition.cost} [ E ] MUA`, btnX + btnW / 2, btnY + 17);
      }

      this.ctx.restore();
    });

    // Footer Control Bar
    const footerY = y + h - 42;
    this.ctx.fillStyle = '#050a14';
    this.ctx.fillRect(x + 2, footerY, w - 4, 40);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, footerY);
    this.ctx.lineTo(x + w, footerY);
    this.ctx.stroke();

    this.ctx.font = 'bold 11px system-ui, sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      '[ W / S hoặc ↑ / ↓ ] Chọn trang bị   •   [ A / D hoặc ← / → ] Chuyển cột   •   [ E / Space / Enter ] Mua hoặc Trang bị   •   [ ESC ] Đóng',
      x + w / 2,
      footerY + 25
    );

    this.ctx.restore();
  }

  private renderStageHazards(camera: Camera, player: Player, hazards: StageHazardOverlay): void {
    const ctx = this.ctx;

    // 1. Water Splash Hazard (from balcony above)
    if (hazards.waterSplash) {
      const splash = hazards.waterSplash;
      const screenPos = camera.worldToScreen(splash.x, 575);
      if (splash.warning) {
        ctx.save();
        const pulse = 0.5 + Math.sin(performance.now() / 120) * 0.3;
        ctx.fillStyle = `rgba(56, 189, 248, ${pulse * 0.35})`;
        ctx.strokeStyle = `rgba(186, 230, 253, ${pulse + 0.3})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y, 45, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ COI CHỪNG NƯỚC TẠT! 💦', screenPos.x, screenPos.y - 18);
        ctx.restore();
      } else if (splash.active) {
        ctx.save();
        // Pouring water stream from top
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.75)';
        ctx.lineWidth = 3;
        for (let i = -3; i <= 3; i++) {
          const offX = i * 10;
          ctx.beginPath();
          ctx.moveTo(screenPos.x + offX, screenPos.y - 260);
          ctx.lineTo(screenPos.x + offX * 1.3, screenPos.y);
          ctx.stroke();
        }
        // Splash impact rings
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y, 55, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'italic 900 13px system-ui';
        ctx.fillStyle = '#e0f2fe';
        ctx.textAlign = 'center';
        ctx.fillText('XÈO! NƯỚC RỬA BÁT! 🧼💦', screenPos.x, screenPos.y - 30);
        ctx.restore();
      }
    }

    // 2. Motorbike Rush Hazard (Xe Ninja Lead)
    if (hazards.motorbike) {
      const mb = hazards.motorbike;
      if (mb.warning) {
        ctx.save();
        const pulse = 0.5 + Math.sin(performance.now() / 90) * 0.4;
        const bannerW = 460;
        const bannerH = 34;
        const bannerX = 640 - bannerW / 2;
        const bannerY = 150;
        ctx.fillStyle = `rgba(220, 38, 38, ${0.85 + pulse * 0.15})`;
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
        ctx.font = '900 14px system-ui';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ BÍP BÍP! XE NINJA LEAD SẮP LAO QUA HẺM! (NHẢY LÊN ĐỂ NÉ!) 🛵', 640, bannerY + 22);
        ctx.restore();
      } else if (mb.active) {
        const bikeScreen = camera.worldToScreen(mb.x, mb.y);
        ctx.save();
        // Headlight beam casting forward
        const beamDir = mb.facing === 'right' ? 1 : -1;
        const beamGrad = ctx.createRadialGradient(
          bikeScreen.x + beamDir * 20, bikeScreen.y, 10,
          bikeScreen.x + beamDir * 180, bikeScreen.y, 140
        );
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.6)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(bikeScreen.x + beamDir * 20, bikeScreen.y - 10);
        ctx.lineTo(bikeScreen.x + beamDir * 220, bikeScreen.y - 45);
        ctx.lineTo(bikeScreen.x + beamDir * 220, bikeScreen.y + 45);
        ctx.closePath();
        ctx.fill();

        // Lead Scooter Body
        ctx.translate(bikeScreen.x, bikeScreen.y);
        if (mb.facing === 'left') ctx.scale(-1, 1);

        // Scooter frame & wheels
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-24, 20, 14, 0, Math.PI * 2);
        ctx.arc(28, 20, 14, 0, Math.PI * 2);
        ctx.fill();

        // Lead chassis
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(-28, 14);
        ctx.lineTo(16, 14);
        ctx.lineTo(24, -12);
        ctx.lineTo(12, -26);
        ctx.lineTo(-12, -18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ninja rider coat
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.ellipse(0, -32, 14, 18, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Helmet with visor
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(6, -50, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(8, -52, 9, 5);

        // Speed lines and sound tag
        ctx.restore();
        ctx.save();
        ctx.font = 'italic 900 16px system-ui';
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'center';
        ctx.fillText('VROOOOOOM!! 🛵💨', bikeScreen.x, bikeScreen.y - 65);
        ctx.restore();
      }
    }

    // 3. Dropped Physical Parcel
    if (hazards.droppedParcel) {
      const pScreen = camera.worldToScreen(hazards.droppedParcel.x, hazards.droppedParcel.y);
      ctx.save();
      const bounce = Math.sin(performance.now() / 160) * 3;
      // Pulsing floor indicator ring
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(pScreen.x, pScreen.y + 12, 34, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Floor shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
      ctx.beginPath();
      ctx.ellipse(pScreen.x, pScreen.y + 10, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render actual high-res delivery bag reflecting damage condition
      const condition = hazards.droppedParcel.condition ?? 100;
      const rendered = this.v19Visuals.renderParcel(ctx, condition, pScreen.x - 28, pScreen.y - 24 + bounce, 56, 42);
      if (!rendered) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(pScreen.x - 16, pScreen.y - 14 + bounce, 32, 26);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.strokeRect(pScreen.x - 16, pScreen.y - 14 + bounce, 32, 26);
      }

      // Callout prompt tag
      const tagPulse = 0.8 + Math.sin(performance.now() / 110) * 0.2;
      ctx.fillStyle = `rgba(220, 38, 38, ${tagPulse})`;
      ctx.fillRect(pScreen.x - 62, pScreen.y - 44 + bounce, 124, 22);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pScreen.x - 62, pScreen.y - 44 + bounce, 124, 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('📦 [ E ] NHẶT LẠI HÀNG!', pScreen.x, pScreen.y - 29 + bounce);
      ctx.restore();
    }

    // 4. Dog Clamp QTE (immobilizing player)
    if (hazards.dogClamp && hazards.dogClamp.active) {
      const plScreen = camera.worldToScreen(player.x + player.width / 2, player.y - 25);
      ctx.save();
      const shakeX = (Math.random() - 0.5) * 4;
      const shakeY = (Math.random() - 0.5) * 4;

      // QTE Banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fillRect(plScreen.x - 100 + shakeX, plScreen.y - 50 + shakeY, 200, 44);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(plScreen.x - 100 + shakeX, plScreen.y - 50 + shakeY, 200, 44);

      ctx.fillStyle = '#fee2e2';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('CHÓ CẮN CHÂN! NHẤN [ J ] LIÊN TỤC!', plScreen.x + shakeX, plScreen.y - 32 + shakeY);

      // Mash button icon & counter
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(plScreen.x - 30 + shakeX, plScreen.y - 25 + shakeY, 60, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px monospace';
      ctx.fillText(`⚡ ĐÁ: ${hazards.dogClamp.mashRemaining} ⚡`, plScreen.x + shakeX, plScreen.y - 13 + shakeY);

      ctx.restore();
    }

    // 5. Banana Peel Traps
    if (hazards.bananaTraps && hazards.bananaTraps.length > 0) {
      for (const trap of hazards.bananaTraps) {
        this.renderBananaTrap(camera, trap);
      }
    }

    // 6. Alley Rats (Chuột Cống Hẻm Sâu)
    if (hazards.rats && hazards.rats.length > 0) {
      for (const rat of hazards.rats) {
        this.renderEntityAlleyRat(camera, rat);
      }
    }

    // 7. Saboteur Shippers (Shipper Gian Thương)
    if (hazards.saboteurs && hazards.saboteurs.length > 0) {
      for (const sab of hazards.saboteurs) {
        this.renderEntitySaboteur(camera, sab);
      }
    }

    // 8. Alley Guards (Tổ Trưởng Dân Phòng)
    if (hazards.guards && hazards.guards.length > 0) {
      for (const guard of hazards.guards) {
        this.renderEntityAlleyGuard(camera, guard);
      }
    }

    // 9. Alley Brats (Trẻ Trâu Bắn Súng Nước - Bé Bo)
    if (hazards.brats && hazards.brats.length > 0) {
      for (const brat of hazards.brats) {
        this.renderEntityAlleyBrat(camera, brat);
      }
    }

    // 10. Ambient Street NPCs (Chị Ba Nước Mía, Chú Bảy Sửa Xe, Bà Năm Ban Công)
    if (hazards.streetNpcs && hazards.streetNpcs.length > 0) {
      for (const npc of hazards.streetNpcs) {
        this.renderStreetNpc(camera, npc);
      }
    }
  }

  private renderEntityAlleyBrat(camera: Camera, brat: AlleyBrat): void {
    if (this.stageNpc.renderBrat(this.ctx, camera, brat)) return;
    const ctx = this.ctx;
    const pos = camera.worldToScreen(brat.x, brat.y);
    const isRight = brat.facing === 'right';
    const isKO = brat.state === 'KO';

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.ellipse(pos.x + brat.width / 2, pos.y + brat.height - 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(pos.x + brat.width / 2, pos.y + brat.height / 2);
    if (!isRight) ctx.scale(-1, 1);
    if (isKO) {
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -10);
    }

    // Brat Body / Yellow tank top
    ctx.fillStyle = brat.state === 'HURT' ? '#ef4444' : '#eab308';
    ctx.beginPath();
    ctx.roundRect(-8, -10, 16, 20, 3);
    ctx.fill();

    // Moss green shorts
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(-7, 10, 6, 8);
    ctx.fillRect(1, 10, 6, 8);

    // Slippers
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-8, 18, 7, 3);
    ctx.fillRect(1, 18, 7, 3);

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -17, 8, 0, Math.PI * 2);
    ctx.fill();

    // Red baseball cap worn sideways
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -20, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(isRight ? 2 : -10, -21, 9, 3);

    // Face / Expression
    if (isKO) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, -18); ctx.lineTo(0, -15);
      ctx.moveTo(0, -18); ctx.lineTo(-3, -15);
      ctx.moveTo(2, -18); ctx.lineTo(5, -15);
      ctx.moveTo(5, -18); ctx.lineTo(2, -15);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(2, -17, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(1, -14, 2.5, 0, Math.PI);
      ctx.stroke();
    }

    // Toy Water Gun in hands
    if (!isKO) {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(4, -8, 14, 5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(14, -7, 4, 3);
      ctx.fillRect(6, -3, 3, 5);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.beginPath();
      ctx.arc(8, -11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // Water Gun Aiming Line & Telegraph
    if (brat.state === 'AIM') {
      ctx.save();
      const muzzlePos = {
        x: isRight ? pos.x + brat.width + 10 : pos.x - 10,
        y: pos.y + 18,
      };
      const pulse = 0.5 + Math.sin(performance.now() / 80) * 0.4;
      ctx.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(muzzlePos.x, muzzlePos.y);
      ctx.lineTo(muzzlePos.x + (isRight ? 180 : -180), muzzlePos.y + 90);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💦 NHẮM BẮN!', pos.x + brat.width / 2, pos.y - 12);
      ctx.restore();
    }

    // Overhead HUD / Tag
    if (!isKO) {
      ctx.save();
      const hpRatio = Math.max(0, brat.hp / brat.maxHp);
      const barW = 28;
      const barH = 3;
      const barX = pos.x + brat.width / 2 - barW / 2;
      const barY = pos.y - 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('BÉ BO', pos.x + brat.width / 2, barY - 3);
      ctx.restore();
    } else {
      ctx.save();
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('😭 x_x', pos.x + brat.width / 2, pos.y - 4);
      ctx.restore();
    }
  }

  private renderStreetNpc(camera: Camera, npc: NPC): void {
    if (this.stageNpc.render(this.ctx, camera, npc)) return;
    const ctx = this.ctx;
    const pos = camera.worldToScreen(npc.x, npc.y);

    ctx.save();
    // 1. Chị Ba Nước Mía (Zone A - Đầu Cầu)
    if (npc.role === 'chiba') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.ellipse(pos.x + 24, pos.y + 60, 36, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Xe Nước Mía Inox Cart
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(pos.x + 8, pos.y + 20, 42, 38);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pos.x + 8, pos.y + 20, 42, 38);

      // Glass cabinet on cart with green sugarcanes inside
      ctx.fillStyle = 'rgba(224, 242, 254, 0.6)';
      ctx.fillRect(pos.x + 12, pos.y + 4, 34, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(pos.x + 12, pos.y + 4, 34, 18);

      // Sugarcane stalks
      ctx.fillStyle = '#84cc16';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(pos.x + 15 + i * 7, pos.y + 6, 4, 14);
      }

      // Wheels
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(pos.x + 16, pos.y + 60, 6, 0, Math.PI * 2);
      ctx.arc(pos.x + 42, pos.y + 60, 6, 0, Math.PI * 2);
      ctx.fill();

      // Umbrella
      const umbrellaX = pos.x + 28;
      const umbrellaY = pos.y - 12;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(umbrellaX, umbrellaY, 32, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(umbrellaX, umbrellaY, 32, Math.PI * 1.25, Math.PI * 1.75);
      ctx.fill();

      // Signboard
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(pos.x + 10, pos.y + 28, 38, 14);
      ctx.strokeStyle = '#ca8a04';
      ctx.strokeRect(pos.x + 10, pos.y + 28, 38, 14);
      ctx.fillStyle = '#854d0e';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('NƯỚC MÍA', pos.x + 29, pos.y + 38);

      // Chị Ba
      const cbX = pos.x - 14;
      const cbY = pos.y + 12;
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.roundRect(cbX, cbY + 14, 16, 22, 3);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cbX + 1, cbY + 36, 6, 14);
      ctx.fillRect(cbX + 9, cbY + 36, 6, 14);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(cbX + 8, cbY + 6, 7, 0, Math.PI * 2);
      ctx.fill();
      // Nón lá
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(cbX - 4, cbY + 2);
      ctx.lineTo(cbX + 20, cbY + 2);
      ctx.lineTo(cbX + 8, cbY - 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Speech bubble
      const bob = Math.sin(performance.now() / 250) * 3;
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(pos.x - 22, pos.y - 36 + bob, 115, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🥤 TRÀ ĐÁ ĐÂY EM!', pos.x + 35, pos.y - 22 + bob);
    }

    // 2. Chú Bảy Sửa Xe (Zone B - Khu Ve Chai)
    else if (npc.role === 'chubay') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.ellipse(pos.x + 20, pos.y + 60, 32, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Old tires
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(pos.x + 36, pos.y + 54, 14, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(pos.x + 36, pos.y + 45, 14, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(pos.x + 36, pos.y + 36, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.stroke();

      // Signboard
      ctx.fillStyle = '#78350f';
      ctx.fillRect(pos.x + 26, pos.y + 12, 28, 16);
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 7px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('VÁ VỎ', pos.x + 40, pos.y + 22);

      // Chú Bảy
      const cbX = pos.x;
      const cbY = pos.y + 16;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cbX + 2, cbY + 34, 14, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cbX + 2, cbY + 12, 14, 16);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(cbX + 1, cbY + 28, 16, 8);
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(cbX + 9, cbY + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.arc(cbX + 9, cbY + 2, 7, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cbX + 7, cbY + 6, 5, 2);

      // Wrench
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cbX + 16, cbY + 18);
      ctx.lineTo(cbX + 24, cbY + 12);
      ctx.stroke();

      // Speech bubble
      const bob = Math.sin(performance.now() / 250) * 3;
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(pos.x - 14, pos.y - 28 + bob, 110, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('🔧 CẨN THẬN XE LEAD!', pos.x + 41, pos.y - 14 + bob);
    }

    // 3. Bà Năm Hóng Chuyện Ban Công (Zone C)
    else if (npc.role === 'banam') {
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pos.x - 15, pos.y + 44);
      ctx.lineTo(pos.x + 45, pos.y + 44);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(pos.x - 10 + i * 15, pos.y + 44, 4, 18);
      }

      // Flower pot
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(pos.x + 28, pos.y + 36, 12, 10);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(pos.x + 34, pos.y + 32, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bà Năm
      const bnX = pos.x;
      const bnY = pos.y + 6;
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.roundRect(bnX, bnY + 12, 18, 24, 3);
      ctx.fill();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(bnX + 9, bnY + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.arc(bnX + 9, bnY + 1, 7, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bnX + 9, bnY - 6, 4, 0, Math.PI * 2);
      ctx.fill();

      // Fan
      const fanSway = Math.sin(performance.now() / 200) * 0.3;
      ctx.save();
      ctx.translate(bnX + 18, bnY + 16);
      ctx.rotate(fanSway);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(6, -6, 8, 12, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.stroke();
      ctx.restore();

      // Speech bubble
      const bob = Math.sin(performance.now() / 250) * 3;
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.roundRect(pos.x - 28, pos.y - 32 + bob, 126, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('👵 ĐỪNG BỂ HOA NHÀ BÀ!', pos.x + 35, pos.y - 18 + bob);
    }

    ctx.restore();
  }

  private renderBananaTrap(camera: Camera, trap: { x: number; y: number }): void {
    const ctx = this.ctx;
    const pos = camera.worldToScreen(trap.x, trap.y);
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 4, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Peels radiating
    ctx.translate(pos.x, pos.y);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 - 0.5;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * 8, Math.sin(angle) * 5, 8, 4, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Green stem center
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(0, -1, 3, 0, Math.PI * 2);
    ctx.fill();

    // Tiny warning sparkle
    const pulse = 0.5 + Math.sin(performance.now() / 150) * 0.4;
    ctx.fillStyle = `rgba(254, 240, 138, ${pulse})`;
    ctx.font = '900 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🍌', 0, -12);

    ctx.restore();
  }

  private renderEntityAlleyRat(camera: Camera, rat: AlleyRat): void {
    if (this.stageNpc.renderRat(this.ctx, camera, rat)) return;
    const ctx = this.ctx;
    const pos = camera.worldToScreen(rat.x, rat.y);
    const isRight = rat.facing === 'right';
    const isKO = rat.state === 'KO';

    ctx.save();
    // Contact Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(pos.x + rat.width / 2, pos.y + rat.height - 1, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(pos.x + rat.width / 2, pos.y + rat.height / 2);
    if (!isRight) ctx.scale(-1, 1);
    if (isKO) ctx.scale(1, -1);

    // Whip-like pink tail
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    const tailWiggle = Math.sin(rat.animTime * 14) * 6;
    ctx.quadraticCurveTo(-22, tailWiggle - 2, -28, tailWiggle + 4);
    ctx.stroke();

    // Rat Body (slouching sewer rodent)
    ctx.fillStyle = rat.state === 'HURT' ? '#ef4444' : '#334155';
    ctx.beginPath();
    ctx.ellipse(-2, 1, 13, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Underbelly tint
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(-1, 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head / Snout
    ctx.fillStyle = rat.state === 'HURT' ? '#f87171' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(16, 2);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();

    // Pink nose
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(16, 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Ear
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(5, -6, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Glowing red beady eye
    ctx.fillStyle = rat.state === 'TELEGRAPH' ? '#fde047' : isKO ? '#94a3b8' : '#ef4444';
    ctx.beginPath();
    ctx.arc(10, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Little scurry claws
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(4, 7, 3, 3);
    ctx.fillRect(-8, 7, 3, 3);

    ctx.restore();

    // Overhead cues & Health bar (if alive)
    if (!isKO) {
      ctx.save();
      const hpRatio = Math.max(0, rat.hp / rat.maxHp);
      const barW = 28;
      const barH = 3;
      const barX = pos.x + rat.width / 2 - barW / 2;
      const barY = pos.y - 8;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#ef4444' : '#dc2626';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      if (rat.state === 'TELEGRAPH') {
        const pulse = 0.8 + Math.sin(performance.now() / 90) * 0.2;
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ TÁP GÓT!', pos.x + rat.width / 2, pos.y - 12);
      }
      ctx.restore();
    }
  }

  private renderEntitySaboteur(camera: Camera, sab: SaboteurShipper): void {
    if (this.stageNpc.renderSaboteur(this.ctx, camera, sab)) return;
    const ctx = this.ctx;
    const pos = camera.worldToScreen(sab.x, sab.y);
    const isRight = sab.facing === 'right';
    const isKO = sab.state === 'KO';

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.beginPath();
    ctx.ellipse(pos.x + sab.width / 2, pos.y + sab.height - 2, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(pos.x + sab.width / 2, pos.y + sab.height / 2);
    if (!isRight) ctx.scale(-1, 1);
    if (isKO) {
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -10);
    }

    // Saboteur Delivery Backpack (bulging dark grey backpack)
    ctx.fillStyle = '#334155';
    ctx.fillRect(-22, -18, 12, 26);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-22, -18, 12, 26);

    // Sticking-out banana peel from backpack
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(-18, -22, 4, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Body / Hoodie (Dark Purple rival courier uniform)
    ctx.fillStyle = sab.state === 'HURT' ? '#ef4444' : '#312e81';
    ctx.beginPath();
    ctx.roundRect(-12, -14, 24, 28, 4);
    ctx.fill();

    // Cyan racing stripes across jacket
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(10, -4);
    ctx.stroke();

    // Head / Cap
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, -22, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cap visor facing backwards
    ctx.fillStyle = '#4338ca';
    ctx.fillRect(-12, -26, 8, 4);

    // Face / Eyes
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(3, -20, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isKO) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      // x_x eyes
      ctx.beginPath();
      ctx.moveTo(1, -22); ctx.lineTo(5, -18);
      ctx.moveTo(5, -22); ctx.lineTo(1, -18);
      ctx.stroke();
    } else {
      // Sly squinting eye
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(3, -21, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Legs / Pants & yellow sneakers
    if (sab.state === 'SWEEP_KICK') {
      // Extended slide kick pose
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-14, 8, 14, 10);
      ctx.fillRect(0, 10, 24, 8);
      // Sneaker
      ctx.fillStyle = '#eab308';
      ctx.fillRect(20, 9, 8, 10);
    } else {
      // Normal standing / running stance
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, 14, 7, 14);
      ctx.fillRect(2, 14, 7, 14);
      // Yellow sneakers
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-9, 25, 9, 5);
      ctx.fillRect(2, 25, 9, 5);
    }

    // Arm posing
    if (sab.state === 'THROW_PEEL') {
      ctx.fillStyle = '#4338ca';
      ctx.beginPath();
      ctx.ellipse(8, -8, 5, 10, -0.6, 0, Math.PI * 2);
      ctx.fill();
      // Banana peel in hand
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(14, -14, 4, 7, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Overhead HUD / Callouts
    ctx.save();
    const hpRatio = Math.max(0, sab.hp / sab.maxHp);
    const barW = 38;
    const barH = 4;
    const barX = pos.x + sab.width / 2 - barW / 2;
    const barY = pos.y - 12;

    if (!isKO) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#818cf8' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.fillStyle = '#e0e7ff';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('SHIPPER GIAN THƯƠNG', pos.x + sab.width / 2, barY - 4);

      if (sab.state === 'THROW_PEEL') {
        ctx.fillStyle = '#facc15';
        ctx.font = 'italic 900 11px system-ui';
        ctx.fillText('TRƯỢT ĐI BẠN! 🍌', pos.x + sab.width / 2, barY - 16);
      } else if (sab.state === 'SWEEP_KICK') {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'italic 900 11px system-ui';
        ctx.fillText('QUÉT TRỤ! ⚡', pos.x + sab.width / 2, barY - 16);
      }
    } else {
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💫 x_x', pos.x + sab.width / 2, pos.y - 6);
    }
    ctx.restore();
  }

  private renderEntityAlleyGuard(camera: Camera, guard: AlleyGuard): void {
    if (this.stageNpc.renderGuard(this.ctx, camera, guard)) return;
    const ctx = this.ctx;
    const pos = camera.worldToScreen(guard.x, guard.y);
    const isRight = guard.facing === 'right';
    const isKO = guard.state === 'KO';

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.ellipse(pos.x + guard.width / 2, pos.y + guard.height - 2, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(pos.x + guard.width / 2, pos.y + guard.height / 2);
    if (!isRight) ctx.scale(-1, 1);
    if (isKO) {
      ctx.rotate(Math.PI / 2);
      ctx.translate(0, -14);
    }

    // Civil Defense Patrol Uniform (Khaki brown shirt & dark pants)
    ctx.fillStyle = guard.state === 'HURT' ? '#ef4444' : '#92400e';
    ctx.beginPath();
    ctx.roundRect(-14, -18, 28, 32, 4);
    ctx.fill();

    // Red Dân Phòng Armband on shoulder
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-14, -14, 6, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 6px system-ui';
    ctx.fillText('DP', -13, -8);

    // Dark patrol trousers & black boots
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, 14, 8, 18);
    ctx.fillRect(2, 14, 8, 18);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-12, 28, 10, 6);
    ctx.fillRect(2, 28, 10, 6);

    // Head / Patrol Helmet with gold insignia
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, -26, 11, 0, Math.PI * 2);
    ctx.fill();

    // Hardhat / Helmet
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(0, -29, 13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-14, -29, 28, 4);
    // Gold star badge
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -32, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Face / Expression
    if (isKO) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, -26); ctx.lineTo(2, -22);
      ctx.moveTo(2, -26); ctx.lineTo(-2, -22);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#0f172a';
      // Stern eyes & mustache
      ctx.fillRect(2, -26, 3, 2);
      ctx.fillRect(0, -22, 6, 2.5);
    }

    // FRONT HAND: Riot Shield
    if (!guard.isShieldBroken) {
      ctx.save();
      const isBlocking = guard.state === 'GUARD_STANCE';
      const shieldPulse = isBlocking ? 0.8 + Math.sin(performance.now() / 100) * 0.2 : 0.65;
      ctx.fillStyle = `rgba(2, 132, 199, ${shieldPulse})`;
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(8, -24, 12, 50, 4);
      ctx.fill();
      ctx.stroke();

      // Specular highlight line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(11, -20);
      ctx.lineTo(11, 20);
      ctx.stroke();

      // Steel reinforcement handles
      ctx.fillStyle = '#334155';
      ctx.fillRect(6, -10, 4, 22);
      ctx.restore();
    } else {
      // Shattered shield remnants
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(8, -10); ctx.lineTo(14, 5);
      ctx.moveTo(12, 10); ctx.lineTo(8, 22);
      ctx.stroke();
    }

    // BACK HAND: Portable Megaphone or Baton
    if (guard.state === 'MEGAPHONE_WINDUP' || guard.state === 'MEGAPHONE_BLAST') {
      // Holding Megaphone up
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(6, -22);
      ctx.lineTo(24, -28);
      ctx.lineTo(24, -14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Rubber baton in hand
      ctx.fillStyle = '#1e293b';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(-20, 12);
      ctx.stroke();
    }

    ctx.restore();

    // Megaphone Shockwave Sonic Blast Rings (World coordinates / Screen overlay)
    if (guard.state === 'MEGAPHONE_BLAST') {
      ctx.save();
      const blastX = isRight ? pos.x + guard.width + 10 : pos.x - 10;
      const blastY = pos.y + 20;
      const blastDir = isRight ? 1 : -1;

      for (let i = 1; i <= 3; i++) {
        const radius = i * 40;
        const ringAlpha = 0.8 - i * 0.22;
        ctx.strokeStyle = `rgba(245, 158, 11, ${ringAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          blastX,
          blastY,
          radius,
          isRight ? -0.55 : Math.PI - 0.55,
          isRight ? 0.55 : Math.PI + 0.55
        );
        ctx.stroke();
      }

      // Comic Blast Banner
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.font = 'italic 900 13px system-ui';
      ctx.textAlign = 'center';
      const textX = blastX + blastDir * 70;
      ctx.fillText('ALÔ ALÔ! ĐỨNG LẠI! 📢⚡', textX, blastY - 26);
      ctx.restore();
    }

    // Overhead Guard HUD
    if (!isKO) {
      ctx.save();
      const hpRatio = Math.max(0, guard.hp / guard.maxHp);
      const barW = 46;
      const barH = 5;
      const barX = pos.x + guard.width / 2 - barW / 2;
      const barY = pos.y - 14;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = hpRatio > 0.4 ? '#eab308' : '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      // Title & shield tag
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      const shieldTag = guard.isShieldBroken ? '[VỠ KHIÊN]' : '[🛡️ CHẮN TRƯỚC]';
      ctx.fillText(`TỔ TRƯỞNG DP ${shieldTag}`, pos.x + guard.width / 2, barY - 4);
      ctx.restore();
    }
  }

  private renderStageHazardHud(hazards: StageHazardOverlay): void {
    const ctx = this.ctx;

    // 1. Delivery Countdown Clock
    if (hazards.stageTimer > 0) {
      ctx.save();
      const totalSec = Math.max(0, Math.ceil(hazards.stageTimer));
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      const timeStr = `${min}:${sec < 10 ? '0' : ''}${sec}`;
      const isUrgent = totalSec <= 30;

      const badgeX = 520;
      const badgeY = 22;
      const badgeW = 120;
      const badgeH = 26;

      ctx.fillStyle = isUrgent ? 'rgba(185, 28, 28, 0.92)' : 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = isUrgent ? '#fca5a5' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = isUrgent ? '#ffffff' : '#e0f2fe';
      ctx.textAlign = 'center';
      ctx.fillText(`⏱️ ${timeStr}`, badgeX + badgeW / 2, badgeY + 18);
      ctx.restore();
    }

    // 2. Smartphone Notification Distress Bubble (Bottom-Right)
    if (hazards.phoneAlert && hazards.phoneAlert.timer > 0) {
      const alert = hazards.phoneAlert;
      ctx.save();
      const notifW = 340;
      const notifH = 68;
      const notifX = 1280 - notifW - 20;
      const notifY = 620;

      ctx.globalAlpha = Math.min(1, alert.timer * 1.5);

      // Glassmorphic panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(notifX, notifY, notifW, notifH);
      ctx.strokeStyle = alert.title.includes('F89') ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(notifX, notifY, notifW, notifH);

      // App Header with Icon
      ctx.fillStyle = alert.title.includes('F89') ? '#fca5a5' : '#fde68a';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${alert.icon} ${alert.title}`, notifX + 12, notifY + 22);

      // Body text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px system-ui';
      ctx.fillText(alert.text, notifX + 12, notifY + 44, notifW - 24);

      ctx.restore();
    }
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
    cueOpacities?: Record<string, number>,
    stageHazards?: StageHazardOverlay
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

    // Floating Vietnamese Comic Action Hit Text (CHÁT, HUỲNH, HỎA TỐC)
    this.ctx.save();
    for (const hit of gameFeel.comicTexts) {
      const screen = camera.worldToScreen(hit.x, hit.y);
      const progress = hit.life / hit.maxLife;
      this.ctx.globalAlpha = Math.min(1, progress * 1.6);
      this.ctx.font = `italic 900 ${hit.size}px monospace, system-ui, sans-serif`;
      this.ctx.textAlign = 'center';

      // Clean crisp dark stroke outline instead of clumsy offset shadow
      this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeText(hit.text, screen.x, screen.y);

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

    if (stageHazards) {
      this.renderStageHazards(camera, player, stageHazards);
    }

    // Sleek Arcade Combo Counter (Top Right, docked below Debt display)
    if (gameFeel.comboStreak >= 2) {
      this.ctx.save();
      const comboW = 152;
      const comboH = 30;
      const comboX = 1250 - comboW;
      const comboY = 84;
      const pulse = 1 + Math.min(0.04, Math.sin(performance.now() / 140) * 0.03);

      this.ctx.translate(comboX + comboW, comboY + comboH / 2);
      this.ctx.scale(pulse, pulse);
      this.ctx.translate(-(comboX + comboW), -(comboY + comboH / 2));

      // Tier styling
      let tierColor = '#fde047';
      let tierText = 'LIÊN HOÀN';
      if (gameFeel.comboStreak >= 10) {
        tierColor = '#f87171';
        tierText = 'BÃO SHIPPER';
      } else if (gameFeel.comboStreak >= 5) {
        tierColor = '#fb923c';
        tierText = 'HỎA TỐC';
      }

      // Compact chassis
      this.ctx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      this.ctx.fillRect(comboX, comboY, comboW, comboH);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(comboX, comboY, comboW, comboH);

      // Left Accent Strip in tier color
      this.ctx.fillStyle = tierColor;
      this.ctx.fillRect(comboX, comboY, 3, comboH);

      // Hits text (Left aligned inside badge)
      this.ctx.font = '900 13px monospace';
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = tierColor;
      this.ctx.fillText(`⚡ ${gameFeel.comboStreak} HITS`, comboX + 10, comboY + 20);

      // Tier label (Right aligned inside badge)
      this.ctx.font = 'bold 9px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillText(tierText, comboX + comboW - 10, comboY + 19);

      this.ctx.restore();
    }

    // 6. Boss Bar & HUD
    const activeBoss = bossDogs.find((b) => b.isAlive);

    // 7. HUD (integrates Boss Bar directly into the top-center dispatch slot when active)
    PlaceholderRenderer.renderHUD(
      this.ctx,
      player,
      parcelCondition,
      bonusReward,
      nearbyPrompt,
      objectiveName,
      activeBoss
    );
    EquipmentVisualRenderer.renderHud(this.ctx, upgradeSnapshot, player);
    if (!activeBoss || !activeBoss.isAlive || activeBoss.state === 'KO') {
      this.v19Visuals.renderParcel(this.ctx, parcelCondition, 882, 22, 48, 48);
    }
    if (stageHazards) {
      this.renderStageHazardHud(stageHazards);
    }

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
