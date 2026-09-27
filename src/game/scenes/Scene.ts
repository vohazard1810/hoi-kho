import { Input } from '../core/Input';
import { Renderer } from '../rendering/Renderer';

export interface Scene {
  name: string;
  init(): void;
  enter(): void;
  exit(): void;
  update(dt: number, input: Input): void;
  render(renderer: Renderer, interpolation: number): void;
}
