import {
  CharacterAssetManifest,
  CharacterAssetStatus,
  CharacterRuntimeSet,
  CharacterRuntimeStateData,
  PLAYER_REQUIRED_STATES,
} from './contracts';
import { AssetValidator } from './AssetValidator';
import { frameGeometry } from './frameGeometry';
import { APP_VERSION } from '../config/version';

export class AssetManager {
  private static instance: AssetManager | null = null;

  // Character runtime sets by characterId
  private characterSets: Map<string, CharacterRuntimeSet> = new Map();
  private loggedErrors: Set<string> = new Set();

  private constructor() {
    this.initDefaultSets();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Initializes all character sets into default 'GRAYBOX' mode
   */
  private initDefaultSets(): void {
    const characters = ['player', 'rival', 'dog', 'coba', 'thug', 'boss_dog'];

    for (const charId of characters) {
      this.characterSets.set(charId, {
        characterId: charId,
        manifest: {
          characterId: charId,
          formatVersion: 1,
          frameWidth: 96,
          frameHeight: 96,
          anchorX: 48,
          anchorY: 78,
          scale: 1,
          states: {},
        },
        status: 'GRAYBOX',
        isReady: false,
        sourcePath: `/assets/staging/${charId}`,
        states: new Map(),
        validationErrors: [],
      });
    }
  }

  public getCharacterStatus(characterId: string): CharacterAssetStatus {
    const set = this.characterSets.get(characterId);
    return set ? set.status : 'GRAYBOX';
  }

  public getCharacterSet(characterId: string): CharacterRuntimeSet | null {
    return this.characterSets.get(characterId) ?? null;
  }

  public isProductionReady(characterId: string): boolean {
    const set = this.characterSets.get(characterId);
    return set !== undefined && set.status === 'PRODUCTION' && set.isReady;
  }

  public getValidationErrors(characterId: string): string[] {
    const set = this.characterSets.get(characterId);
    return set ? set.validationErrors : [];
  }

  public getSourcePath(characterId: string): string {
    const set = this.characterSets.get(characterId);
    return set ? set.sourcePath : `/assets/staging/${characterId}`;
  }

  /**
   * Loads a candidate image asynchronously
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to decode image from: ${url}`));
      img.src = url;
    });
  }

  /**
   * Single Source of Truth Loader & In-Memory Activator:
   * 1. Fetches manifest.json dynamically from basePath
   * 2. Validates schema and required states
   * 3. Validates PNG binary signatures
   * 4. Preloads & decodes all state images
   * 5. All-or-nothing activation: Promotes to 'PRODUCTION' only if 100% pass
   */
  public async loadAndActivateCharacter(
    characterId: string,
    basePath: string = '/assets/staging'
  ): Promise<{ success: boolean; status: CharacterAssetStatus; reasons: string[] }> {
    const sourcePath = `${basePath}/${characterId}`;
    const versionParam = `v=${encodeURIComponent(APP_VERSION)}`;
    const manifestUrl = `${sourcePath}/manifest.json?${versionParam}`;
    const currentSet = this.characterSets.get(characterId);

    // 1. Fetch manifest.json
    let manifestData: CharacterAssetManifest;
    try {
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      manifestData = await res.json();
    } catch (err: any) {
      const errorMsg = `Manifest fetch failed at ${manifestUrl}: ${err.message || err}`;
      this.logErrorOnce(`manifest_fetch_${characterId}`, errorMsg);
      if (currentSet) {
        currentSet.status = 'GRAYBOX';
        currentSet.isReady = false;
        currentSet.validationErrors = [errorMsg];
      }
      return { success: false, status: 'GRAYBOX', reasons: [errorMsg] };
    }

    // 1b. Verify characterId matches requested character
    if (manifestData.characterId !== characterId) {
      const mismatchMsg = `Manifest characterId '${manifestData.characterId}' does not match requested character '${characterId}'`;
      if (currentSet) {
        currentSet.status = 'INVALID';
        currentSet.isReady = false;
        currentSet.validationErrors = [mismatchMsg];
      }
      this.logErrorOnce(`manifest_char_mismatch_${characterId}`, mismatchMsg);
      return { success: false, status: 'INVALID', reasons: [mismatchMsg] };
    }

    // 2. Validate manifest schema
    const manifestValidation = AssetValidator.validateManifest(manifestData);
    if (!manifestValidation.valid) {
      if (currentSet) {
        currentSet.status = 'INVALID';
        currentSet.isReady = false;
        currentSet.validationErrors = manifestValidation.reasons;
      }
      this.logErrorOnce(`manifest_schema_${characterId}`, manifestValidation.reasons.join('; '));
      return { success: false, status: 'INVALID', reasons: manifestValidation.reasons };
    }

    // 3. For Player, validate required 12 states
    if (characterId === 'player') {
      const reqCheck = AssetValidator.validateRequiredPlayerStates(manifestData);
      if (!reqCheck.valid) {
        if (currentSet) {
          currentSet.status = 'INVALID';
          currentSet.isReady = false;
          currentSet.validationErrors = reqCheck.reasons;
        }
        return { success: false, status: 'INVALID', reasons: reqCheck.reasons };
      }
    }

    // 4. Preload & Validate binary PNG headers and decode single-fetch blob
    const stateKeys = Object.keys(manifestData.states);
    const loadedImages = new Map<string, HTMLImageElement>();
    const loadErrors: string[] = [];

    for (const stateName of stateKeys) {
      const state = manifestData.states[stateName];
      const fileUrl = `${sourcePath}/${state.file}?${versionParam}`;

      try {
        // Binary buffer check for PNG signature with cache: 'no-store'
        const fileRes = await fetch(fileUrl, { cache: 'no-store' });
        if (!fileRes.ok) {
          loadErrors.push(`State '${stateName}' file not found (${fileUrl})`);
          continue;
        }
        const arrayBuf = await fileRes.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        const sigCheck = AssetValidator.validatePngSignature(bytes);
        if (!sigCheck.valid) {
          loadErrors.push(`State '${stateName}' (${state.file}): ${sigCheck.reasons.join(', ')}`);
          continue;
        }

        // Image decode check: decode directly from memory buffer/blob without second network fetch
        let img: HTMLImageElement;
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof Blob !== 'undefined') {
          const blob = new Blob([arrayBuf], { type: 'image/png' });
          const blobUrl = URL.createObjectURL(blob);
          try {
            img = await this.loadImage(blobUrl);
          } finally {
            URL.revokeObjectURL(blobUrl);
          }
        } else {
          img = await this.loadImage(fileUrl);
        }

        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          loadErrors.push(`State '${stateName}' decoded as 0x0 empty image`);
          continue;
        }
        loadedImages.set(stateName, img);
      } catch (err: any) {
        loadErrors.push(`State '${stateName}' decode error: ${err.message || err}`);
      }
    }

    if (loadErrors.length > 0) {
      if (currentSet) {
        currentSet.status = 'GRAYBOX';
        currentSet.isReady = false;
        currentSet.validationErrors = loadErrors;
      }
      this.logErrorOnce(
        `load_errors_${characterId}`,
        `[AssetManager] ${characterId} activation BLOCKED (corrupted or un-decodable assets):\n` +
          loadErrors.map((e) => ` - ${e}`).join('\n')
      );
      return { success: false, status: 'GRAYBOX', reasons: loadErrors };
    }

    // 5. Validate full character set dimensions
    const setValidation = AssetValidator.validateCharacterSet(manifestData, loadedImages);
    if (!setValidation.valid) {
      if (currentSet) {
        currentSet.status = 'INVALID';
        currentSet.isReady = false;
        currentSet.validationErrors = setValidation.reasons;
      }
      return { success: false, status: 'INVALID', reasons: setValidation.reasons };
    }

    // 6. All-or-nothing In-Memory Activation
    const runtimeStates = new Map<string, CharacterRuntimeStateData>();
    for (const stateName of stateKeys) {
      const img = loadedImages.get(stateName)!;
      const contract = manifestData.states[stateName];
      const geometry = frameGeometry(manifestData, contract);
      runtimeStates.set(stateName, {
        image: img,
        contract,
        frameWidth: geometry.width,
        frameHeight: geometry.height,
      });
    }

    this.characterSets.set(characterId, {
      characterId,
      manifest: manifestData,
      status: 'PRODUCTION',
      isReady: true,
      sourcePath,
      states: runtimeStates,
      validationErrors: [],
    });

    console.log(`[AssetManager] Character '${characterId}' activated in-memory to PRODUCTION.`);
    return { success: true, status: 'PRODUCTION', reasons: [] };
  }

  /**
   * Activates the stable set first, then atomically promotes a preferred set.
   * A malformed/missing HD set can never replace a working production player.
   */
  public async loadPreferredCharacterWithFallback(
    characterId: string,
    preferredBasePath: string,
    fallbackBasePath: string
  ): Promise<{ success: boolean; status: CharacterAssetStatus; reasons: string[] }> {
    const fallbackResult = await this.loadAndActivateCharacter(characterId, fallbackBasePath);
    const activeFallback = this.characterSets.get(characterId);
    const fallbackSnapshot = activeFallback ? {
      ...activeFallback,
      states: new Map(activeFallback.states),
      validationErrors: [...activeFallback.validationErrors],
    } : null;

    const preferredResult = await this.loadAndActivateCharacter(characterId, preferredBasePath);
    if (preferredResult.success && preferredResult.status === 'PRODUCTION') return preferredResult;

    if (fallbackResult.success && fallbackSnapshot) {
      this.characterSets.set(characterId, fallbackSnapshot);
      return {
        success: true,
        status: 'PRODUCTION',
        reasons: [`Preferred HD set blocked; stable fallback retained: ${preferredResult.reasons.join('; ')}`],
      };
    }
    return preferredResult;
  }

  private logErrorOnce(key: string, message: string): void {
    if (!this.loggedErrors.has(key)) {
      this.loggedErrors.add(key);
      console.warn(`[AssetManager] ${message}`);
    }
  }

  public revertToGraybox(characterId: string): void {
    const set = this.characterSets.get(characterId);
    if (set) {
      set.status = 'GRAYBOX';
      set.isReady = false;
      set.states.clear();
      set.validationErrors = [];
    }
  }

  public resetAllToGraybox(): void {
    this.initDefaultSets();
    this.loggedErrors.clear();
  }
}
