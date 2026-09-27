import { BALANCE } from '../config/balance';
import { EnemySpawnData } from '../config/stage1';

export interface ActiveEnemy {
  id: string;
  isAlive: boolean;
  update(dt: number, playerX: number, playerY: number): void;
}

export class SpawnSystem {
  private spawns: EnemySpawnData[] = [];
  private triggeredSpawns: Set<string> = new Set();
  private maxActiveEnemies: number = BALANCE.MAX_ACTIVE_ENEMIES;

  constructor(spawns: EnemySpawnData[], maxActive?: number) {
    this.spawns = [...spawns];
    this.maxActiveEnemies = maxActive ?? BALANCE.MAX_ACTIVE_ENEMIES;
  }

  public reset(): void {
    this.triggeredSpawns.clear();
  }

  /**
   * Evaluates if new enemies should be spawned based on player position and active cap
   */
  public update(
    playerX: number,
    currentActiveCount: number,
    onSpawn: (spawnData: EnemySpawnData) => void
  ): void {
    if (currentActiveCount >= this.maxActiveEnemies) {
      return;
    }

    let availableSlots = this.maxActiveEnemies - currentActiveCount;

    for (const spawn of this.spawns) {
      if (availableSlots <= 0) break;
      if (this.triggeredSpawns.has(spawn.id)) continue;

      if (playerX >= spawn.triggerX) {
        this.triggeredSpawns.add(spawn.id);
        onSpawn(spawn);
        availableSlots--;
      }
    }
  }

  public getTriggeredCount(): number {
    return this.triggeredSpawns.size;
  }

  public getTotalSpawns(): number {
    return this.spawns.length;
  }
}
