import { FacingDirection, Hurtbox, Rect } from '../core/types';

export abstract class Entity {
  public id: string;
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public width: number = 32;
  public height: number = 32;
  public facing: FacingDirection = 'right';
  public isGrounded: boolean = false;
  public isAlive: boolean = true;

  constructor(id: string, x: number, y: number, width: number, height: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  public getRect(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  public getHurtbox(): Hurtbox {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      ownerId: this.id,
      isInvulnerable: false,
    };
  }

  public abstract update(dt: number): void;
}
