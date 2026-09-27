import { Rect } from '../core/types';
import { PlatformData, HazardData } from '../config/stage1';

export class CollisionSystem {
  public static checkAABB(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * Resolves horizontal movement against solid obstacles / world bounds
   */
  public static resolveHorizontal(
    entity: { x: number; y: number; width: number; height: number; vx: number },
    worldWidth: number
  ): void {
    // World bounds clamping
    if (entity.x < 0) {
      entity.x = 0;
      entity.vx = 0;
    } else if (entity.x + entity.width > worldWidth) {
      entity.x = worldWidth - entity.width;
      entity.vx = 0;
    }
  }

  /**
   * Resolves vertical movement against ground segments and platforms
   */
  public static resolveVertical(
    entity: {
      x: number;
      y: number;
      width: number;
      height: number;
      vy: number;
      isGrounded: boolean;
    },
    platforms: PlatformData[],
    groundSegments: Rect[],
    prevY: number
  ): boolean {
    let grounded = false;
    const entityBottom = entity.y + entity.height;
    const prevBottom = prevY + entity.height;

    // Check main ground segments
    for (const ground of groundSegments) {
      // Check horizontal overlap with ground segment
      if (entity.x + entity.width > ground.x && entity.x < ground.x + ground.width) {
        // Falling down onto ground surface
        if (entity.vy >= 0 && prevBottom <= ground.y + 4 && entityBottom >= ground.y) {
          entity.y = ground.y - entity.height;
          entity.vy = 0;
          grounded = true;
          break;
        }
      }
    }

    // Check elevated platforms (one-way: land on top when falling)
    if (!grounded && entity.vy >= 0) {
      for (const plat of platforms) {
        if (entity.x + entity.width > plat.x && entity.x < plat.x + plat.width) {
          if (prevBottom <= plat.y + 6 && entityBottom >= plat.y) {
            entity.y = plat.y - entity.height;
            entity.vy = 0;
            grounded = true;
            break;
          }
        }
      }
    }

    entity.isGrounded = grounded;
    return grounded;
  }

  /**
   * Check if entity overlaps with any hazard
   */
  public static checkHazards(
    entity: Rect,
    hazards: HazardData[]
  ): HazardData | null {
    for (const hazard of hazards) {
      if (this.checkAABB(entity, hazard)) {
        return hazard;
      }
    }
    return null;
  }

  /**
   * Probes if there is solid, hazard-free ground in front of the entity
   * to prevent enemies from blindly walking or dashing off edges into pits/hazards.
   */
  public static isSafeGroundAhead(
    entity: { x: number; y: number; width: number; height: number },
    direction: 'left' | 'right',
    lookAhead: number,
    platforms: PlatformData[],
    groundSegments: Rect[],
    hazards: HazardData[]
  ): boolean {
    const probeX = direction === 'right' ? entity.x + entity.width + lookAhead : entity.x - lookAhead;
    const probeFeetY = entity.y + entity.height;

    // 1. Derive the playable right edge from geometry instead of coupling the
    // navigation probe to a stale Stage 1 magic number.
    const worldRight = Math.max(
      0,
      ...groundSegments.map((ground) => ground.x + ground.width),
      ...platforms.map((platform) => platform.x + platform.width)
    );
    if (probeX < 0 || probeX > worldRight) {
      return false;
    }

    // 2. Check if probe point overlaps with any hazard pit directly or is above a hazard pit
    for (const h of hazards) {
      if (h.type === 'puddle' || h.type === 'trash') continue;
      if (probeX >= h.x - 16 && probeX <= h.x + h.width + 16) {
        if (probeFeetY >= h.y - 120) {
          return false;
        }
      }
    }

    // 3. Check for solid ground segment support
    let hasGround = false;
    for (const g of groundSegments) {
      if (probeX >= g.x && probeX <= g.x + g.width) {
        if (probeFeetY >= g.y - 14 && probeFeetY <= g.y + 20) {
          hasGround = true;
          break;
        }
      }
    }

    // 4. Check for elevated platform support
    if (!hasGround) {
      for (const p of platforms) {
        if (probeX >= p.x && probeX <= p.x + p.width) {
          if (probeFeetY >= p.y - 14 && probeFeetY <= p.y + 20) {
            hasGround = true;
            break;
          }
        }
      }
    }

    return hasGround;
  }
}
