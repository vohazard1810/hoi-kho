import { Input } from './Input';
import { Renderer } from '../rendering/Renderer';
import { SceneType } from './types';
import { Scene } from '../scenes/Scene';

export class SceneManager {
  private scenes: Map<SceneType, Scene> = new Map();
  private currentScene: Scene | null = null;
  private currentSceneType: SceneType | null = null;

  public registerScene(type: SceneType, scene: Scene): void {
    scene.init();
    this.scenes.set(type, scene);
  }

  public switchScene(type: SceneType): void {
    const nextScene = this.scenes.get(type);
    if (!nextScene) {
      console.error(`[SceneManager] Scene "${type}" not registered`);
      return;
    }

    if (this.currentScene) {
      this.currentScene.exit();
    }

    this.currentSceneType = type;
    this.currentScene = nextScene;
    this.currentScene.enter();
  }

  public getCurrentSceneType(): SceneType | null {
    return this.currentSceneType;
  }

  public getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  public update(dt: number, input: Input): void {
    if (this.currentScene) {
      this.currentScene.update(dt, input);
    }
  }

  public render(renderer: Renderer, interpolation: number): void {
    if (this.currentScene) {
      this.currentScene.render(renderer, interpolation);
    }
  }
}
