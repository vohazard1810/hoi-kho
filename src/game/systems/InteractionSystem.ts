import { Rect } from '../core/types';

export interface Interactable {
  id: string;
  name: string;
  promptText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onInteract(): void;
}

export class InteractionSystem {
  public static INTERACTION_RADIUS = 75;

  public static getNearbyInteractable(
    playerRect: Rect,
    interactables: Interactable[]
  ): Interactable | null {
    const playerCenterX = playerRect.x + playerRect.width / 2;
    const playerCenterY = playerRect.y + playerRect.height / 2;

    for (const item of interactables) {
      const itemCenterX = item.x + item.width / 2;
      const itemCenterY = item.y + item.height / 2;

      const dx = playerCenterX - itemCenterX;
      const dy = playerCenterY - itemCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.INTERACTION_RADIUS) {
        return item;
      }
    }

    return null;
  }
}
