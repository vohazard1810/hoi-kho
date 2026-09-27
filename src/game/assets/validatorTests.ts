import {
  CharacterAssetManifest,
  getExpectedStripDimensions,
} from './contracts';
import { AssetValidator } from './AssetValidator';

const SAMPLE_VALID_MANIFEST: CharacterAssetManifest = {
  characterId: 'player',
  formatVersion: 1,
  frameWidth: 96,
  frameHeight: 96,
  anchorX: 48,
  anchorY: 78,
  scale: 1,
  states: {
    idle: { file: 'player_idle.png', frameCount: 4, fps: 10, loop: true },
    run: { file: 'player_run.png', frameCount: 8, fps: 12, loop: true },
    jump: { file: 'player_jump.png', frameCount: 5, fps: 10, loop: false },
    fall: { file: 'player_fall.png', frameCount: 2, fps: 10, loop: false },
    land: { file: 'player_land.png', frameCount: 2, fps: 10, loop: false },
    dodge: { file: 'player_dodge.png', frameCount: 4, fps: 12, loop: false },
    j1: { file: 'player_j1.png', frameCount: 4, fps: 12, loop: false },
    j2: { file: 'player_j2.png', frameCount: 4, fps: 12, loop: false },
    j3: { file: 'player_j3.png', frameCount: 6, fps: 12, loop: false },
    hurt: { file: 'player_hurt.png', frameCount: 3, fps: 10, loop: false },
    ko: { file: 'player_ko.png', frameCount: 5, fps: 8, loop: false },
    getup: { file: 'player_getup.png', frameCount: 5, fps: 10, loop: false },
  },
};

export function runSyntheticValidatorTests(): {
  allPassed: boolean;
  results: { testName: string; passed: boolean; message: string }[];
} {
  const results: { testName: string; passed: boolean; message: string }[] = [];

  // Test 1: Valid Manifest Contract
  const validManifestResult = AssetValidator.validateManifest(SAMPLE_VALID_MANIFEST);
  results.push({
    testName: 'Valid Manifest Structure',
    passed: validManifestResult.valid,
    message: validManifestResult.valid ? 'Passed' : validManifestResult.reasons.join(', '),
  });

  // Test 2: Derived Dimensions Calculation
  const idleDim = getExpectedStripDimensions(SAMPLE_VALID_MANIFEST, 'idle');
  const j3Dim = getExpectedStripDimensions(SAMPLE_VALID_MANIFEST, 'j3');
  const derivedCheck =
    idleDim?.width === 384 && idleDim?.height === 96 && j3Dim?.width === 576 && j3Dim?.height === 96;
  results.push({
    testName: 'Derived Strip Dimensions (idle: 384x96, j3: 576x96)',
    passed: derivedCheck,
    message: derivedCheck ? 'Passed' : `Got idle: ${JSON.stringify(idleDim)}, j3: ${JSON.stringify(j3Dim)}`,
  });

  const hdManifest: CharacterAssetManifest = JSON.parse(JSON.stringify(SAMPLE_VALID_MANIFEST));
  hdManifest.formatVersion = 2;
  hdManifest.states.idle = {
    ...hdManifest.states.idle,
    frameWidth: 543,
    frameHeight: 724,
    anchorX: 271.5,
    anchorY: 700,
  };
  const hdDim = getExpectedStripDimensions(hdManifest, 'idle');
  const hdSchema = AssetValidator.validateManifest(hdManifest);
  results.push({
    testName: 'V2 per-state HD atlas geometry overrides global V1 defaults',
    passed: hdSchema.valid && hdDim?.width === 2172 && hdDim.height === 724,
    message: hdSchema.valid ? `HD idle contract: ${hdDim?.width}x${hdDim?.height}` : hdSchema.reasons.join(', '),
  });

  // Test 3: Invalid Manifest (Missing states, wrong format)
  const invalidManifest: CharacterAssetManifest = {
    characterId: '',
    formatVersion: 0,
    frameWidth: -10,
    frameHeight: 0,
    anchorX: -5,
    anchorY: -5,
    scale: 1,
    states: {},
  };
  const invalidCheck = AssetValidator.validateManifest(invalidManifest);
  results.push({
    testName: 'Reject Malformed Manifest',
    passed: !invalidCheck.valid && invalidCheck.reasons.length >= 4,
    message: !invalidCheck.valid ? `Correctly rejected: ${invalidCheck.reasons.length} errors found` : 'Failed to reject',
  });

  // Test 4: Simulated Image Strip Dimension Mismatch
  const mockImageWrongDimensions = {
    complete: true,
    naturalWidth: 400, // expected 384
    naturalHeight: 96,
  } as unknown as HTMLImageElement;

  const dimCheck = AssetValidator.validateImageStrip(mockImageWrongDimensions, 384, 96, 'idle');
  results.push({
    testName: 'Reject Image Strip Dimension Mismatch',
    passed: !dimCheck.valid && dimCheck.reasons.some((r) => r.includes('Width mismatch')),
    message: !dimCheck.valid ? 'Correctly rejected width mismatch' : 'Failed to reject wrong dimensions',
  });

  // Test 5: Simulated Image Decode Failure (0x0)
  const mockImageFailedDecode = {
    complete: true,
    naturalWidth: 0,
    naturalHeight: 0,
  } as unknown as HTMLImageElement;

  const decodeCheck = AssetValidator.validateImageStrip(mockImageFailedDecode, 384, 96, 'idle');
  results.push({
    testName: 'Reject 0x0 / Un-decoded Image',
    passed: !decodeCheck.valid && decodeCheck.reasons.some((r) => r.includes('0x0')),
    message: !decodeCheck.valid ? 'Correctly rejected un-decoded image' : 'Failed to reject 0x0 image',
  });

  // Test 6: Incomplete Character Set (Missing state images)
  const partialImages = new Map<string, HTMLImageElement>();
  // Only idle provided, missing other 11 required states
  partialImages.set('idle', {
    complete: true,
    naturalWidth: 384,
    naturalHeight: 96,
  } as unknown as HTMLImageElement);

  const incompleteCheck = AssetValidator.validateCharacterSet(SAMPLE_VALID_MANIFEST, partialImages);
  results.push({
    testName: 'Incomplete Character Set rejected as NOT READY',
    passed: !incompleteCheck.valid && incompleteCheck.reasons.length >= 11,
    message: !incompleteCheck.valid
      ? `Correctly identified ${incompleteCheck.reasons.length} missing state strips`
      : 'Failed to reject incomplete set',
  });

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}
