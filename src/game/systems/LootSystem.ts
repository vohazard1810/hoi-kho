import { BALANCE } from '../config/balance';
import { PickupType } from '../core/types';
import { Pickup } from '../entities/Pickup';
import { Player } from '../entities/Player';
import { ObjectiveSystem } from './ObjectiveSystem';
import { UpgradeSystem } from './UpgradeSystem';

export interface LootEntry {
  type: PickupType;
  weight: number;
}

export class LootSystem {
  public pickups: Pickup[] = [];
  public onPickupCollected: ((type: PickupType) => void) | null = null;
  private pickupCounter: number = 0;

  // Data-driven weighted loot tables
  private static LOOT_TABLES = {
    dog: [
      { type: 'HEALTH' as PickupType, weight: 35 },
      { type: 'MOMENTUM' as PickupType, weight: 30 },
      { type: 'PARCEL_REPAIR' as PickupType, weight: 15 },
      { type: null, weight: 20 }, // Nothing
    ],
    rival: [
      { type: 'HEALTH' as PickupType, weight: 45 },
      { type: 'MOMENTUM' as PickupType, weight: 35 },
      { type: 'BONUS_REWARD' as PickupType, weight: 20 },
    ],
    thug: [
      // Miniboss drops multiple guaranteed/high-value pickups
      { type: 'HEALTH' as PickupType, weight: 100 },
      { type: 'PARCEL_REPAIR' as PickupType, weight: 100 },
      { type: 'BONUS_REWARD' as PickupType, weight: 100 },
    ],
    boss_dog: [
      // Stage Boss drops guaranteed reward package
      { type: 'BONUS_REWARD' as PickupType, weight: 100 },
      { type: 'HEALTH' as PickupType, weight: 100 },
      { type: 'PARCEL_REPAIR' as PickupType, weight: 100 },
      { type: 'MOMENTUM' as PickupType, weight: 100 },
    ],
  };

  public reset(): void {
    this.pickups = [];
    this.pickupCounter = 0;
  }

  public spawnDrop(type: PickupType, x: number, y: number): void {
    this.pickupCounter++;
    const id = `pickup_${this.pickupCounter}_${Date.now()}`;
    this.pickups.push(new Pickup(id, type, x, y));
  }

  public spawnEnemyLoot(
    enemyType: 'dog' | 'rival' | 'thug' | 'boss_dog',
    x: number,
    y: number
  ): void {
    // Every defeated enemy contributes deterministic long-term progression.
    this.spawnDrop('PARTS', x, y - 18);
    if (enemyType === 'thug' || enemyType === 'boss_dog') this.spawnDrop('PARTS', x + 18, y - 18);
    if (enemyType === 'boss_dog') this.spawnDrop('PARTS', x - 18, y - 18);

    if (enemyType === 'thug') {
      // Guaranteed drops spaced out slightly
      this.spawnDrop('HEALTH', x - 24, y);
      this.spawnDrop('PARCEL_REPAIR', x, y - 8);
      this.spawnDrop('BONUS_REWARD', x + 24, y);
      return;
    }

    if (enemyType === 'boss_dog') {
      // Guaranteed boss reward cluster
      this.spawnDrop('BONUS_REWARD', x - 36, y);
      this.spawnDrop('HEALTH', x - 12, y - 10);
      this.spawnDrop('PARCEL_REPAIR', x + 12, y - 10);
      this.spawnDrop('MOMENTUM', x + 36, y);
      return;
    }

    const table = LootSystem.LOOT_TABLES[enemyType];
    if (!table) return;

    // Roll weighted table
    const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const entry of table) {
      if (rand < entry.weight) {
        if (entry.type !== null) {
          this.spawnDrop(entry.type, x, y);
        }
        break;
      }
      rand -= entry.weight;
    }
  }

  public update(dt: number, player: Player, objective: ObjectiveSystem): void {
    for (const pickup of this.pickups) {
      pickup.update(dt);

      // Only alive player can collect
      if (player.isAlive && player.state !== 'KO') {
        pickup.attractTo(player.getRect(), dt);
        if (pickup.checkCollection(player.getRect())) {
          pickup.isCollected = true;
          this.applyPickupEffect(pickup.type, player, objective);
          this.onPickupCollected?.(pickup.type);
        }
      }
    }

    // Remove collected
    this.pickups = this.pickups.filter((p) => !p.isCollected);
  }

  private applyPickupEffect(type: PickupType, player: Player, objective: ObjectiveSystem): void {
    switch (type) {
      case 'HEALTH':
        player.heal(BALANCE.PICKUP_HEALTH_AMOUNT);
        break;
      case 'PARCEL_REPAIR':
        objective.repairParcel(BALANCE.PICKUP_PARCEL_REPAIR_AMOUNT);
        break;
      case 'MOMENTUM':
        player.addMomentum(BALANCE.PICKUP_MOMENTUM_AMOUNT);
        break;
      case 'BONUS_REWARD':
        objective.addBonusReward(BALANCE.PICKUP_BONUS_REWARD_AMOUNT);
        break;
      case 'PARTS':
        UpgradeSystem.getInstance().addParts(1);
        break;
    }
  }
}
