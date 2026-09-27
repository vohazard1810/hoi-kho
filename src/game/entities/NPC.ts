import { Interactable } from '../systems/InteractionSystem';
import { Entity } from './Entity';

export type NpcRole = 'coba' | 'chutu' | 'chiba' | 'chubay' | 'banam';

export class NPC extends Entity implements Interactable {
  public name: string;
  public promptText: string;
  public role: NpcRole;
  public onInteractCallback: () => void;

  constructor(
    id: string,
    x: number,
    y: number,
    role: NpcRole,
    name: string,
    promptText: string,
    onInteract: () => void
  ) {
    super(id, x, y, 36, 64);
    this.role = role;
    this.name = name;
    this.promptText = promptText;
    this.onInteractCallback = onInteract;
  }

  public onInteract(): void {
    this.onInteractCallback();
  }

  public override update(_dt: number): void {
    // Static NPC
  }
}
