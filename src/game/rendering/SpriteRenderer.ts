import { Camera } from '../core/Camera';
import { CharacterRuntimeSet } from '../assets/contracts';
import { VisualStateMapper } from '../assets/VisualStateMapper';
import { Player } from '../entities/Player';
import { Dog } from '../entities/Dog';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { BossDog } from '../entities/BossDog';
import { frameGeometry } from '../assets/frameGeometry';

export interface RenderResultInfo {
  rendered: boolean;
  stateName: string;
  frameIndex: number;
  totalFrames: number;
  animTime: number;
}

export class SpriteRenderer {
  private static loggedDrawErrors: Set<string> = new Set();
  private static isolatedFrames = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

  public static calculateFrameIndex(
    animTime: number,
    fps: number,
    totalFrames: number,
    loop: boolean
  ): number {
    if (totalFrames <= 0) return 0;
    const safeFps = fps > 0 ? fps : 10;
    const frameDuration = 1 / safeFps;
    if (loop) {
      return Math.floor(Math.max(0, animTime) / frameDuration) % totalFrames;
    } else {
      return Math.min(Math.floor(Math.max(0, animTime) / frameDuration), totalFrames - 1);
    }
  }

  /**
   * Generic character sprite draw method using manifest anchor and frame strip slicing
   */
  public static renderCharacter(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    characterSet: CharacterRuntimeSet,
    stateName: string,
    animTime: number,
    worldX: number,
    worldY: number,
    facing: 'left' | 'right',
    scale: number = 1,
    contrastOutline: boolean = false
  ): RenderResultInfo {
    if (!characterSet.isReady || characterSet.status !== 'PRODUCTION') {
      return {
        rendered: false,
        stateName,
        frameIndex: 0,
        totalFrames: 0,
        animTime,
      };
    }

    const stateData = characterSet.states.get(stateName) || characterSet.states.get('idle');
    if (!stateData) {
      return {
        rendered: false,
        stateName,
        frameIndex: 0,
        totalFrames: 0,
        animTime,
      };
    }

    const { image, contract } = stateData;
    const { width: frameWidth, height: frameHeight, anchorX, anchorY } = frameGeometry(characterSet.manifest, contract);
    if (image.naturalWidth !== frameWidth * contract.frameCount || image.naturalHeight !== frameHeight) {
      return { rendered: false, stateName, frameIndex: 0, totalFrames: contract.frameCount, animTime };
    }

    // Calculate active frame index using standard frame calculator
    const totalFrames = contract.frameCount;
    const frameIndex = this.calculateFrameIndex(animTime, contract.fps, totalFrames, contract.loop);

    const sourceX = frameIndex * frameWidth;
    const sourceY = 0;

    // Convert world position to screen position based on anchor
    const rawScreenAnchor = camera.worldToScreen(worldX, worldY);
    // Snap the character anchor, not the source art, so camera/player fractions
    // do not create a different blur pattern on every frame.
    const koGroundOffset = stateName === 'ko' ? 2 : 0;
    const screenAnchor = {
      x: Math.round(rawScreenAnchor.x),
      y: Math.round(rawScreenAnchor.y) + koGroundOffset,
    };

    try {
      ctx.save();
      let drawSource: CanvasImageSource = image;
      let cropX = sourceX;
      // Downsampling an atlas can sample pixels outside the requested source
      // rectangle in some Canvas engines. Isolate once, not once per draw.
      if (typeof document !== 'undefined') {
        let frames = this.isolatedFrames.get(image);
        if (!frames) { frames = new Map(); this.isolatedFrames.set(image, frames); }
        const key = `${frameWidth}:${frameHeight}:${frameIndex}`;
        let tile = frames.get(key);
        if (!tile) {
          tile = document.createElement('canvas'); tile.width = frameWidth; tile.height = frameHeight;
          const tileCtx = tile.getContext('2d');
          if (tileCtx) {
            tileCtx.imageSmoothingEnabled = false;
            tileCtx.drawImage(image, sourceX, sourceY, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
            frames.set(key, tile);
          }
        }
        if (frames.has(key)) { drawSource = tile!; cropX = 0; }
      }
      // The 96px source is displayed above native size. High-quality smoothing
      // avoids both bilinear mush and nearest-neighbour pixel blocks.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const stateScale = scale * (contract.scale ?? 1);

      const drawFrame = (offsetX = 0, offsetY = 0) => {
        ctx.drawImage(drawSource, cropX, sourceY, frameWidth, frameHeight, -anchorX * stateScale + offsetX, -anchorY * stateScale + offsetY, frameWidth * stateScale, frameHeight * stateScale);
      };
      if (facing === 'left') {
        ctx.translate(screenAnchor.x, screenAnchor.y);
        ctx.scale(-1, 1);
        if (contrastOutline && stateName !== 'ko') {
          ctx.save();
          ctx.filter = 'brightness(0)';
          ctx.globalAlpha = 0.45;
          drawFrame(-1, 0);
          drawFrame(1, 0);
          drawFrame(0, -1);
          drawFrame(0, 1);
          ctx.restore();
        }
        drawFrame();
      } else {
        ctx.translate(screenAnchor.x, screenAnchor.y);
        if (contrastOutline && stateName !== 'ko') {
          ctx.save();
          ctx.filter = 'brightness(0)';
          ctx.globalAlpha = 0.45;
          drawFrame(-1, 0);
          drawFrame(1, 0);
          drawFrame(0, -1);
          drawFrame(0, 1);
          ctx.restore();
        }
        drawFrame();
      }

      ctx.restore();

      return {
        rendered: true,
        stateName,
        frameIndex,
        totalFrames,
        animTime,
      };
    } catch (err: any) {
      ctx.restore();
      const errKey = `draw_err_${characterSet.characterId}_${stateName}`;
      if (!this.loggedDrawErrors.has(errKey)) {
        this.loggedDrawErrors.add(errKey);
        console.warn(`[SpriteRenderer] Error rendering ${characterSet.characterId} (${stateName}):`, err.message || err);
      }
      return {
        rendered: false,
        stateName,
        frameIndex,
        totalFrames,
        animTime,
      };
    }
  }

  public static renderPlayer(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    player: Player,
    playerSet: CharacterRuntimeSet,
    visualScale: number = 1
  ): RenderResultInfo {
    const isLanding = player.landingTimer > 0 && player.isGrounded && player.actionState === 'NONE';
    const animState = VisualStateMapper.mapPlayerState(
      player.locomotionState,
      player.actionState,
      player.comboStep,
      isLanding
    );

    // Entity world anchor position corresponds to center-bottom of player collision box
    const worldAnchorX = player.x + player.width / 2;
    const worldAnchorY = player.y + player.height;

    return this.renderCharacter(
      ctx,
      camera,
      playerSet,
      animState,
      player.animTime,
      worldAnchorX,
      worldAnchorY,
      player.facing,
      playerSet.manifest.scale * visualScale,
      true
    );
  }

  public static renderDog(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    dog: Dog,
    dogSet: CharacterRuntimeSet,
    visualScale: number = 1
  ): boolean {
    const animState = VisualStateMapper.mapDogState(dog.state);
    const worldAnchorX = dog.x + dog.width / 2;
    const worldAnchorY = dog.y + dog.height;

    const res = this.renderCharacter(
      ctx,
      camera,
      dogSet,
      animState,
      dog.animTime,
      worldAnchorX,
      worldAnchorY,
      dog.facing,
      dogSet.manifest.scale * visualScale,
      false
    );
    return res.rendered;
  }

  public static renderRival(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    rival: Rival,
    rivalSet: CharacterRuntimeSet,
    visualScale: number = 1
  ): boolean {
    const animState = VisualStateMapper.mapRivalState(rival.state);
    const worldAnchorX = rival.x + rival.width / 2;
    const worldAnchorY = rival.y + rival.height;

    const stateData = rivalSet.states.get(animState);
    const phaseOffsetFrames = rival.state === 'ATTACK_ACTIVE' ? 2 : rival.state === 'ATTACK_RECOVERY' ? 4 : 0;
    const phaseTime = stateData && animState === 'attack'
      ? phaseOffsetFrames / stateData.contract.fps + Math.min(rival.animTime, 1.999 / stateData.contract.fps)
      : rival.animTime;

    const res = this.renderCharacter(
      ctx,
      camera,
      rivalSet,
      animState,
      phaseTime,
      worldAnchorX,
      worldAnchorY,
      rival.facing,
      rivalSet.manifest.scale * visualScale,
      false
    );
    return res.rendered;
  }

  public static renderThug(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    thug: Thug,
    thugSet: CharacterRuntimeSet,
    visualScale: number = 1
  ): boolean {
    const animState = VisualStateMapper.mapThugState(thug.state);
    const worldAnchorX = thug.x + thug.width / 2;
    const worldAnchorY = thug.y + thug.height;

    const stateData = thugSet.states.get(animState);
    const active = thug.state === 'HEAVY_ACTIVE' || thug.state === 'CHARGE_ACTIVE';
    const recovery = thug.state === 'HEAVY_RECOVERY' || thug.state === 'CHARGE_RECOVERY';
    const phaseOffsetFrames = active ? 2 : recovery ? 4 : 0;
    const isAttack = animState === 'heavy' || animState === 'charge';
    const phaseTime = stateData && isAttack
      ? phaseOffsetFrames / stateData.contract.fps + Math.min(thug.animTime, 1.999 / stateData.contract.fps)
      : thug.animTime;

    const res = this.renderCharacter(
      ctx,
      camera,
      thugSet,
      animState,
      phaseTime,
      worldAnchorX,
      worldAnchorY,
      thug.facing,
      thugSet.manifest.scale * visualScale,
      false
    );
    return res.rendered;
  }

  public static renderBossDog(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    boss: BossDog,
    bossSet: CharacterRuntimeSet,
    visualScale: number = 1
  ): boolean {
    const animState = VisualStateMapper.mapBossDogState(boss.state);
    const worldAnchorX = boss.x + boss.width / 2;
    const worldAnchorY = boss.y + boss.height;

    const phaseOffsetFrames = (() => {
      if (boss.state.endsWith('_ACTIVE')) return 2;
      if (boss.state.endsWith('_RECOVERY')) return 4;
      return 0;
    })();
    const stateData = bossSet.states.get(animState);
    const fps = stateData?.contract.fps ?? 10;
    const animationTime = boss.animTime + phaseOffsetFrames / fps;

    const res = this.renderCharacter(
      ctx,
      camera,
      bossSet,
      animState,
      animationTime,
      worldAnchorX,
      worldAnchorY,
      boss.facing,
      bossSet.manifest.scale * visualScale,
      false
    );

    if (res.rendered) {
      const screenPos = camera.worldToScreen(boss.x, boss.y);
      if (boss.antiSpamLevel >= 6) {
        ctx.save();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.strokeRect(screenPos.x - 4, screenPos.y - 4, boss.width + 8, boss.height + 8);
        ctx.restore();
      }

      if (boss.isEyeGleamActive) {
        const eyeX = boss.facing === 'right' ? screenPos.x + boss.width - 24 : screenPos.x + 18;
        const eyeY = screenPos.y + 24;
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
        ctx.lineTo(eyeX, eyeY + 8);
        ctx.stroke();
        ctx.restore();
      }
    }

    return res.rendered;
  }
}
