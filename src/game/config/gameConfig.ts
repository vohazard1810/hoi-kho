export const GAME_CONFIG = {
  VIEWPORT_WIDTH: 1280,
  VIEWPORT_HEIGHT: 720,
  SIMULATION_FPS: 60,
  FIXED_TIMESTEP: 1 / 60,
  MAX_ACCUMULATED_TIME: 0.25, // prevents spiral of death
  DEV_MODE: false,
} as const;

export type GameConfig = typeof GAME_CONFIG;
