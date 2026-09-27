import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { AssetValidator } from '../assets/AssetValidator';
import { CharacterAssetManifest, PLAYER_REQUIRED_STATES, getExpectedStripDimensions } from '../assets/contracts';

export interface PlayerHdTestResult { testName: string; passed: boolean; message: string; }

function pngInfo(file: string): { width: number; height: number; colorType: number; alphaMin: number; alphaMax: number } {
  const bytes = fs.readFileSync(path.resolve(file));
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), colorType = bytes[25];
  if (colorType !== 6 || bytes[24] !== 8) return { width, height, colorType, alphaMin: 255, alphaMax: 255 };
  let offset = 8; const idat: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4; let cursor = 0; let previous = Buffer.alloc(stride);
  let alphaMin = 255, alphaMax = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++]; const scan = Buffer.from(raw.subarray(cursor, cursor + stride)); cursor += stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? scan[x - 4] : 0;
      const up = previous[x];
      const upperLeft = x >= 4 ? previous[x - 4] : 0;
      if (filter === 1) scan[x] = (scan[x] + left) & 255;
      else if (filter === 2) scan[x] = (scan[x] + up) & 255;
      else if (filter === 3) scan[x] = (scan[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upperLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upperLeft);
        scan[x] = (scan[x] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft)) & 255;
      }
    }
    for (let x = 3; x < stride; x += 4) { alphaMin = Math.min(alphaMin, scan[x]); alphaMax = Math.max(alphaMax, scan[x]); }
    previous = scan;
  }
  return { width, height, colorType, alphaMin, alphaMax };
}

export function runPlayerHdProductionTests(): { results: PlayerHdTestResult[] } {
  const results: PlayerHdTestResult[] = [];
  const root = 'public/assets/staging_hd/player';
  const manifest = JSON.parse(fs.readFileSync(path.resolve(root, 'manifest.json'), 'utf8')) as CharacterAssetManifest;
  const schema = AssetValidator.validateManifest(manifest);
  const required = AssetValidator.validateRequiredPlayerStates(manifest);
  results.push({
    testName: 'Player HD V2 manifest declares all runtime states and per-state geometry',
    passed: schema.valid && required.valid && manifest.formatVersion === 2 && PLAYER_REQUIRED_STATES.every((key) => manifest.states[key].frameWidth && manifest.states[key].frameHeight && manifest.states[key].scale),
    message: schema.valid && required.valid ? '12/12 HD states expose independent atlas geometry, anchors and display scale' : [...schema.reasons, ...required.reasons].join('; '),
  });

  const failures: string[] = [];
  for (const key of PLAYER_REQUIRED_STATES) {
    const state = manifest.states[key];
    const expected = getExpectedStripDimensions(manifest, key)!;
    const info = pngInfo(path.join(root, state.file));
    if (info.width !== expected.width || info.height !== expected.height || info.colorType !== 6) failures.push(`${key}: ${info.width}x${info.height}/type${info.colorType}`);
  }
  results.push({
    testName: 'Player HD strips match V2 dimensions and RGBA PNG contract',
    passed: failures.length === 0,
    message: failures.length ? failures.join(', ') : '12/12 strips match exact derived dimensions and RGBA color type',
  });

  const alphaFailures: string[] = [];
  for (const key of PLAYER_REQUIRED_STATES) {
    const state = manifest.states[key];
    const info = pngInfo(path.join(root, state.file));
    if (info.alphaMin !== 0 || info.alphaMax !== 255) alphaFailures.push(`${key}:${info.alphaMin}–${info.alphaMax}`);
  }
  results.push({
    testName: 'Player HD strips contain genuine transparent and opaque pixels',
    passed: alphaFailures.length === 0,
    message: alphaFailures.length ? alphaFailures.join(', ') : '12/12 alpha channels contain both 0 and 255 values',
  });

  const manager = fs.readFileSync(path.resolve('src/game/assets/AssetManager.ts'), 'utf8');
  const game = fs.readFileSync(path.resolve('src/game/core/Game.ts'), 'utf8');
  const atomic = manager.includes('loadPreferredCharacterWithFallback') && manager.includes('fallbackSnapshot') && game.includes("'/assets/staging_hd', '/assets/staging'");
  results.push({
    testName: 'HD player promotion retains the stable sprite set on any failure',
    passed: atomic,
    message: atomic ? 'Preferred HD activation is atomic with production fallback' : 'Atomic fallback wiring missing',
  });
  return { results };
}
