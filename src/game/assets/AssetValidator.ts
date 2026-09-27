import {
  CharacterAssetManifest,
  PLAYER_REQUIRED_STATES,
  getExpectedStripDimensions,
} from './contracts';

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export class AssetValidator {
  /**
   * Validates standard 8-byte PNG signature from ArrayBuffer/Uint8Array:
   * 89 50 4E 47 0D 0A 1A 0A
   */
  public static validatePngSignature(bytes: Uint8Array): ValidationResult {
    const reasons: string[] = [];
    if (bytes.length < 8) {
      return { valid: false, reasons: ['File size is less than 8 bytes (not a valid file)'] };
    }

    const expectedSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isCorruptedUtf8 =
      bytes[0] === 0xef && bytes[1] === 0xbf && bytes[2] === 0xbd && bytes[3] === 0x50;

    if (isCorruptedUtf8) {
      reasons.push(
        'Corrupted binary: File starts with UTF-8 replacement character (0xEF 0xBF 0xBD). Binary PNG was corrupted by text encoding.'
      );
      return { valid: false, reasons };
    }

    for (let i = 0; i < 8; i++) {
      if (bytes[i] !== expectedSig[i]) {
        const hex = Array.from(bytes.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
          .join(' ');
        reasons.push(`Invalid PNG signature: got [${hex}], expected [89 50 4E 47 0D 0A 1A 0A]`);
        return { valid: false, reasons };
      }
    }

    return { valid: true, reasons: [] };
  }

  /**
   * Validates manifest structure and metadata
   */
  public static validateManifest(manifest: any): ValidationResult {
    const reasons: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      return { valid: false, reasons: ['Manifest is null or not a valid JSON object'] };
    }

    if (!manifest.characterId || typeof manifest.characterId !== 'string') {
      reasons.push('Missing or invalid characterId');
    }
    if (typeof manifest.formatVersion !== 'number' || manifest.formatVersion < 1) {
      reasons.push('Invalid formatVersion (must be >= 1)');
    }
    if (typeof manifest.frameWidth !== 'number' || manifest.frameWidth < 16 || manifest.frameWidth > 4096) {
      reasons.push('Invalid frameWidth (must be between 16 and 4096)');
    }
    if (typeof manifest.frameHeight !== 'number' || manifest.frameHeight < 16 || manifest.frameHeight > 4096) {
      reasons.push('Invalid frameHeight (must be between 16 and 4096)');
    }
    if (typeof manifest.anchorX !== 'number' || manifest.anchorX < 0) {
      reasons.push('Invalid anchorX');
    }
    if (typeof manifest.anchorY !== 'number' || manifest.anchorY < 0) {
      reasons.push('Invalid anchorY');
    }
    if (typeof manifest.scale !== 'number' || manifest.scale <= 0) {
      reasons.push('Invalid scale (must be > 0)');
    }

    if (!manifest.states || typeof manifest.states !== 'object') {
      reasons.push('Missing or invalid states object in manifest');
    } else {
      const stateKeys = Object.keys(manifest.states);
      if (stateKeys.length === 0) {
        reasons.push('Manifest contains 0 animation states');
      }

      for (const key of stateKeys) {
        const state = manifest.states[key];
        if (!state || typeof state !== 'object') {
          reasons.push(`State '${key}' is not an object`);
          continue;
        }
        if (!state.file || typeof state.file !== 'string') {
          reasons.push(`State '${key}' is missing valid file name`);
        } else if (
          !/^[a-zA-Z0-9_-]+\.png$/.test(state.file) ||
          state.file.includes('..') ||
          state.file.includes('/') ||
          state.file.includes('\\')
        ) {
          reasons.push(`State '${key}' file '${state.file}' has unsafe path or non-PNG filename`);
        }

        if (typeof state.frameCount !== 'number' || state.frameCount < 1 || state.frameCount > 64) {
          reasons.push(`State '${key}' has invalid frameCount (must be between 1 and 64)`);
        }
        if (typeof state.fps !== 'number' || state.fps < 1 || state.fps > 60) {
          reasons.push(`State '${key}' has invalid fps (must be between 1 and 60)`);
        }
        if (typeof state.loop !== 'boolean') {
          reasons.push(`State '${key}' has invalid loop flag (must be boolean)`);
        }
        for (const field of ['frameWidth', 'frameHeight'] as const) {
          if (state[field] !== undefined && (typeof state[field] !== 'number' || state[field] <= 0)) {
            reasons.push(`State '${key}' has invalid optional ${field}`);
          }
        }
        for (const field of ['anchorX', 'anchorY'] as const) {
          if (state[field] !== undefined && (typeof state[field] !== 'number' || state[field] < 0)) {
            reasons.push(`State '${key}' has invalid optional ${field}`);
          }
        }
        if (state.scale !== undefined && (typeof state.scale !== 'number' || state.scale <= 0)) {
          reasons.push(`State '${key}' has invalid optional scale`);
        }
      }
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Validates that all required states for Player are declared in the manifest
   */
  public static validateRequiredPlayerStates(manifest: CharacterAssetManifest): ValidationResult {
    const reasons: string[] = [];
    if (!manifest.states) {
      return { valid: false, reasons: ['No states declared in manifest'] };
    }

    for (const requiredState of PLAYER_REQUIRED_STATES) {
      if (!manifest.states[requiredState]) {
        reasons.push(`Manifest is missing required state: '${requiredState}'`);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Validates a decoded HTMLImageElement against manifest dimensions
   */
  public static validateImageStrip(
    img: HTMLImageElement,
    expectedWidth: number,
    expectedHeight: number,
    stateName: string
  ): ValidationResult {
    const reasons: string[] = [];

    if (!img.complete) {
      reasons.push(`State '${stateName}': Image is not complete/loaded`);
      return { valid: false, reasons };
    }

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      reasons.push(`State '${stateName}': Image decode failed (0x0 dimensions - image is corrupted or invalid)`);
      return { valid: false, reasons };
    }

    if (img.naturalWidth !== expectedWidth) {
      reasons.push(
        `State '${stateName}': Width mismatch (got ${img.naturalWidth}px, expected ${expectedWidth}px)`
      );
    }

    if (img.naturalHeight !== expectedHeight) {
      reasons.push(
        `State '${stateName}': Height mismatch (got ${img.naturalHeight}px, expected ${expectedHeight}px)`
      );
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Validates an entire candidate character set (manifest + all state images)
   */
  public static validateCharacterSet(
    manifest: CharacterAssetManifest,
    loadedImages: Map<string, HTMLImageElement>
  ): ValidationResult {
    const manifestCheck = this.validateManifest(manifest);
    if (!manifestCheck.valid) {
      return manifestCheck;
    }

    const reasons: string[] = [];
    const stateKeys = Object.keys(manifest.states);

    for (const key of stateKeys) {
      const img = loadedImages.get(key);
      if (!img) {
        reasons.push(`State '${key}': Missing preloaded image strip`);
        continue;
      }

      const expected = getExpectedStripDimensions(manifest, key);
      if (!expected) {
        reasons.push(`State '${key}': Cannot calculate expected dimensions`);
        continue;
      }

      const imgCheck = this.validateImageStrip(img, expected.width, expected.height, key);
      if (!imgCheck.valid) {
        reasons.push(...imgCheck.reasons);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons,
    };
  }
}
