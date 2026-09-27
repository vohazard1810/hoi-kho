export interface AnimationStateContract {
  file: string;
  frameCount: number;
  fps: number;
  loop: boolean;
  /** Optional V2 atlas geometry. Omitted manifests remain fully V1-compatible. */
  frameWidth?: number;
  frameHeight?: number;
  anchorX?: number;
  anchorY?: number;
  scale?: number;
}

export interface CharacterAssetManifest {
  characterId: string;
  formatVersion: number;
  frameWidth: number;
  frameHeight: number;
  anchorX: number;
  anchorY: number;
  scale: number;
  states: Record<string, AnimationStateContract>;
}

export type CharacterAssetStatus = 'GRAYBOX' | 'INVALID' | 'READY' | 'PRODUCTION';

export interface CharacterRuntimeStateData {
  image: HTMLImageElement;
  contract: AnimationStateContract;
  frameWidth: number;
  frameHeight: number;
}

export interface CharacterRuntimeSet {
  characterId: string;
  manifest: CharacterAssetManifest;
  status: CharacterAssetStatus;
  isReady: boolean;
  sourcePath: string;
  states: Map<string, CharacterRuntimeStateData>;
  validationErrors: string[];
}

/**
 * Required 12 states for Player Shipper SXP contract
 */
export const PLAYER_REQUIRED_STATES = [
  'idle',
  'run',
  'jump',
  'fall',
  'land',
  'dodge',
  'j1',
  'j2',
  'j3',
  'hurt',
  'ko',
  'getup',
] as const;

export type PlayerRequiredState = typeof PLAYER_REQUIRED_STATES[number];

/**
 * Derived Strip Dimensions helper
 * Expected strip width = frameWidth * frameCount
 * Expected strip height = frameHeight
 */
export function getExpectedStripDimensions(
  manifest: CharacterAssetManifest,
  stateKey: string
): { width: number; height: number } | null {
  const state = manifest.states[stateKey];
  if (!state) return null;
  return {
    width: (state.frameWidth ?? manifest.frameWidth) * state.frameCount,
    height: state.frameHeight ?? manifest.frameHeight,
  };
}
