import { Interactable } from '../systems/InteractionSystem';
import { Entity } from './Entity';

export class NPC extends Entity implements Interactable {
  public name: string;
  public promptText: string;
  public role: 'coba' | 'chutu';
  public onInteractCallback: () => void;

  constructor(
    id: string,
    x: number,
    y: number,
    role: 'coba' | 'chutu',
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
