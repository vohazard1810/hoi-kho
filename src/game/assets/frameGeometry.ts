import { CharacterAssetManifest, AnimationStateContract } from './contracts';

/** Shared by loader AND renderer; stale cached geometry cannot widen a frame. */
export function frameGeometry(manifest: CharacterAssetManifest, state: AnimationStateContract) {
  return {
    width: state.frameWidth ?? manifest.frameWidth,
    height: state.frameHeight ?? manifest.frameHeight,
    anchorX: state.anchorX ?? manifest.anchorX,
    anchorY: state.anchorY ?? manifest.anchorY,
  };
}
