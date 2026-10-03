import { Rect } from '../core/types';

export interface PlatformData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isOneWay?: boolean;
}

export interface HazardData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  parcelDamage: number;
  type?: 'pit' | 'puddle' | 'trash';
}

export interface EnemySpawnData {
  id: string;
  type: 'dog' | 'rival' | 'thug' | 'boss_dog';
  spawnX: number;
  spawnY: number;
  triggerX: number; // player X must cross to make eligible for spawning
  zone: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface ZoneData {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  name: string;
  startX: number;
  endX: number;
  gateX: number;
}

export const STAGE_1_CONFIG = {
  STAGE_NAME: 'HẺM KHÔNG LỐI THOÁT',
  WORLD_WIDTH: 3650,
  WORLD_HEIGHT: 720,
  GROUND_Y: 620, // Ground level surface
  GROUND_THICKNESS: 100,

  PLAYER_START_X: 120,
  PLAYER_START_Y: 556, // 620 - 64

  NPC_CUSTOMER_X: 3510,
  NPC_CUSTOMER_Y: 556,

  ZONES: [
    { id: 'A', name: 'Hẻm Đầu Cầu', startX: 0, endX: 680, gateX: 660 },
    { id: 'B', name: 'Khu Ve Chai', startX: 680, endX: 1360, gateX: 1340 },
    { id: 'C', name: 'Dốc Gỗ Sập', startX: 1360, endX: 2040, gateX: 2020 },
    { id: 'D', name: 'Ngõ Hẹp Đen', startX: 2040, endX: 2720, gateX: 2700 },
    { id: 'E', name: 'Nhà Chú Tư', startX: 2720, endX: 3650, gateX: 3440 },
  ] as ZoneData[],

  // Ground segments (with gaps for platforming)
  GROUND_SEGMENTS: [
    { x: 0, y: 620, width: 900, height: 100 },
    { x: 980, y: 620, width: 850, height: 100 },
    { x: 1910, y: 620, width: 650, height: 100 },
    { x: 2620, y: 620, width: 1030, height: 100 },
  ] as Rect[],

  // Platform geometry
  PLATFORMS: [
    // Zone A: warmup jump
    { id: 'p_a1', x: 340, y: 510, width: 140, height: 20 },
    { id: 'p_a2', x: 520, y: 440, width: 120, height: 20 },

    // Zone B: ve chai ledges over pit
    { id: 'p_b1', x: 860, y: 530, width: 100, height: 20 },
    { id: 'p_b2', x: 940, y: 460, width: 90, height: 20 },
    { id: 'p_b3', x: 1120, y: 490, width: 140, height: 20 },
    { id: 'p_b4', x: 1280, y: 430, width: 130, height: 20 },

    // Zone C: dốc gỗ elevated structure
    { id: 'p_c1', x: 1480, y: 510, width: 150, height: 20 },
    { id: 'p_c2', x: 1680, y: 440, width: 160, height: 20 },
    { id: 'p_c3', x: 1860, y: 500, width: 120, height: 20 },

    // Zone D: multi-tiered alley
    { id: 'p_d1', x: 2100, y: 520, width: 130, height: 20 },
    { id: 'p_d2', x: 2260, y: 450, width: 140, height: 20 },
    { id: 'p_d3', x: 2430, y: 390, width: 150, height: 20 },
    { id: 'p_d4', x: 2580, y: 490, width: 120, height: 20 },

    // Zone E: boss arena and porch
    { id: 'p_e1', x: 2820, y: 520, width: 160, height: 20 },
    { id: 'p_e2', x: 3040, y: 480, width: 140, height: 20 },
    { id: 'p_e3', x: 3260, y: 540, width: 150, height: 20 },
  ] as PlatformData[],

  // Hazard zones in pits & ground obstacles
  HAZARDS: [
    // Pits
    { id: 'h_b1', x: 900, y: 690, width: 80, height: 30, damage: 10, parcelDamage: 10, type: 'pit' },
    { id: 'h_c1', x: 1830, y: 690, width: 80, height: 30, damage: 10, parcelDamage: 10, type: 'pit' },
    { id: 'h_d1', x: 2560, y: 690, width: 60, height: 30, damage: 10, parcelDamage: 10, type: 'pit' },

    // Zone B: exactly 1 water puddle (no damage, traction slowdown only)
    { id: 'puddle_b1', x: 1060, y: 614, width: 64, height: 10, damage: 0, parcelDamage: 0, type: 'puddle' },

    // Zone C: exactly 1 low trash pile (jumpable; only 2-3% parcel damage on knockback or high speed)
    { id: 'trash_c1', x: 1730, y: 602, width: 36, height: 18, damage: 0, parcelDamage: 3, type: 'trash' },
  ] as HazardData[],

  // Spawners (managed by SpawnSystem with rhythmic breathing room between encounters)
  ENEMY_SPAWNS: [
    // Zone A: Tutorial Dog (triggers after player talks to Chị Ba and jumps initial platforms)
    { id: 'dog_a', type: 'dog', spawnX: 540, spawnY: 588, triggerX: 360, zone: 'A' },

    // Zone B: Pincer encounter on flat asphalt (triggers AFTER crossing pit and consulting Chú Bảy)
    { id: 'dog_b', type: 'dog', spawnX: 1260, spawnY: 588, triggerX: 1080, zone: 'B' },
    { id: 'dog_b_rear', type: 'dog', spawnX: 960, spawnY: 588, triggerX: 1080, zone: 'B' },

    // Zone C: Rival drive-by duel (triggers on open street AFTER wooden incline and Bà Năm)
    { id: 'rival_c', type: 'rival', spawnX: 1880, spawnY: 556, triggerX: 1680, zone: 'C' },
    { id: 'dog_c_flank', type: 'dog', spawnX: 1540, spawnY: 588, triggerX: 1680, zone: 'C' },

    // Zone D: Miniboss Thug duel (triggers AFTER Alley Guard and Saboteur gauntlet)
    { id: 'thug_d', type: 'thug', spawnX: 2580, spawnY: 546, triggerX: 2380, zone: 'D' },
    { id: 'dog_d_flank', type: 'dog', spawnX: 2180, spawnY: 588, triggerX: 2380, zone: 'D' },

    // Zone E: Stage Boss Chó Đại Ca (exclusive grand arena)
    { id: 'boss_e', type: 'boss_dog', spawnX: 3050, spawnY: 568, triggerX: 2760, zone: 'E' },
  ] as EnemySpawnData[],
};
