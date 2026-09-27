import fs from 'fs';
import path from 'path';
import { BALANCE } from '../config/balance';
import { AssetValidator } from '../assets/AssetValidator';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { EnemyStatusSystem } from '../systems/EnemyStatusSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';

export interface UpgradeTestResult { testName: string; passed: boolean; message: string; }

export function runUpgradeTests(): { results: UpgradeTestResult[] } {
  const results: UpgradeTestResult[] = [];
  const upgrades = UpgradeSystem.getInstance();
  upgrades.resetForTests();

  {
    upgrades.addParts(2);
    const blocked = !upgrades.purchase('scanner_pro');
    upgrades.addParts(1);
    const bought = upgrades.purchase('scanner_pro');
    const noDoubleBuy = !upgrades.purchase('scanner_pro');
    const passed = blocked && bought && noDoubleBuy && upgrades.getSnapshot().parts === 0;
    results.push({ testName: 'Parts economy enforces cost and blocks duplicate purchase', passed, message: passed ? '3 parts buys Scanner Pro exactly once' : 'Purchase/cost contract mismatch' });
  }

  {
    const player = new Player(0, 0);
    player.actionState = 'ATTACK';
    player.comboStep = 'J3';
    player.attackPhase = 'ACTIVE';
    const hitbox = player.getActiveHitbox();
    const expected = Math.round(BALANCE.J3_DAMAGE * 1.25);
    const passed = hitbox?.damage === expected;
    results.push({ testName: 'Scanner Pro modifies J3 only through runtime hitbox', passed, message: passed ? `J3 damage ${BALANCE.J3_DAMAGE} → ${expected}` : `Actual ${hitbox?.damage}, expected ${expected}` });
  }

  {
    upgrades.addParts(5);
    upgrades.purchase('sticky_tape');
    const projectile = new Projectile(0, 0, 'right', 'player');
    const statuses = new EnemyStatusSystem();
    statuses.applyStickySlow(['enemy']);
    const slowed = statuses.getMovementMultiplier('enemy') === 0.55;
    statuses.update(1.6);
    const recovered = statuses.getMovementMultiplier('enemy') === 1;
    const passed = projectile.appliesStickySlow && slowed && recovered;
    results.push({ testName: 'Sticky Tape marks projectile and slow expires', passed, message: passed ? '45% movement reduction expires after 1.5s' : 'Sticky slow contract mismatch' });
  }

  {
    upgrades.addParts(6);
    upgrades.purchase('reflective_backpack');
    const passed = upgrades.getParcelDamageMultiplier() === 0.65;
    results.push({ testName: 'Reflective Backpack reduces parcel damage by 35%', passed, message: passed ? 'Parcel multiplier = 0.65' : `Actual multiplier ${upgrades.getParcelDamageMultiplier()}` });
  }

  {
    upgrades.resetForTests();
    upgrades.addParts(20);
    const lockedBeforeClear = !upgrades.purchaseOrEquip('wide_scan');
    upgrades.recordStageClear('STAGE_1');
    upgrades.recordStageClear('STAGE_1');
    const unlockedAfterClear = upgrades.getSnapshot().unlockedTier === 2 && upgrades.getSnapshot().reputation === 2;
    const purchased = upgrades.purchaseOrEquip('wide_scan');
    const passed = lockedBeforeClear && unlockedAfterClear && purchased && upgrades.isEquipped('wide_scan');
    results.push({ testName: 'Stage clear unlocks Tier 2 exactly once', passed, message: passed ? 'Tier 2 blocked before clear; STAGE_1 raises reputation 1 → 2 once' : 'Tier/reputation gate mismatch' });
  }

  {
    upgrades.addParts(20);
    const boughtPrecision = upgrades.purchaseOrEquip('precision_scan');
    const precisionActive = upgrades.isEquipped('precision_scan') && !upgrades.isEquipped('wide_scan');
    const bothOwned = upgrades.has('precision_scan') && upgrades.has('wide_scan');
    const switchedBack = upgrades.purchaseOrEquip('wide_scan') && upgrades.isEquipped('wide_scan') && !upgrades.isEquipped('precision_scan');
    const passed = boughtPrecision && precisionActive && bothOwned && switchedBack;
    results.push({ testName: 'Tier 2 variants are owned independently but equip exclusively', passed, message: passed ? 'J branch switches between Wide and Precision without stacking' : 'Exclusive equipment contract mismatch' });
  }

  {
    upgrades.addParts(40);
    upgrades.purchaseOrEquip('sticky_tape');
    upgrades.purchaseOrEquip('tape_range');
    upgrades.purchaseOrEquip('reflective_backpack');
    upgrades.purchaseOrEquip('agile_dodge');
    upgrades.purchaseOrEquip('express_core');
    upgrades.purchaseOrEquip('momentum_reserve');
    const passed = upgrades.getTapeSpeedMultiplier() === 1.2
      && upgrades.getTapeLifetimeMultiplier() === 1.2
      && upgrades.getDodgeCooldownMultiplier() === 0.85
      && upgrades.getUltimateDamageMultiplier() === 1.15
      && upgrades.getUltimateMomentumReserve() === 20;
    results.push({ testName: 'Equipped progression nodes expose bounded runtime modifiers', passed, message: passed ? 'K/L/Q modifiers match design caps' : 'One or more runtime modifier values mismatch' });
  }

  {
    const memory = new Map<string, string>();
    memory.set('hoi_kho_toolkit_v1', JSON.stringify({ version: 1, parts: 9, purchased: ['scanner_pro', 'sticky_tape'] }));
    const storage = {
      get length() { return memory.size; }, clear: () => memory.clear(),
      getItem: (key: string) => memory.get(key) ?? null, key: (index: number) => Array.from(memory.keys())[index] ?? null,
      removeItem: (key: string) => memory.delete(key), setItem: (key: string, value: string) => { memory.set(key, value); },
    } as Storage;
    const globalWithStorage = globalThis as typeof globalThis & { localStorage?: Storage };
    const originalStorage = globalWithStorage.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const upgradeClass = UpgradeSystem as unknown as { instance: UpgradeSystem | null; getInstance(): UpgradeSystem };
    upgradeClass.instance = null;
    const migrated = UpgradeSystem.getInstance();
    const passed = migrated.getSnapshot().parts === 9 && migrated.has('scanner_pro') && migrated.has('sticky_tape') && migrated.getSnapshot().reputation === 1;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
    else delete globalWithStorage.localStorage;
    upgradeClass.instance = null;
    UpgradeSystem.getInstance();
    results.push({ testName: 'Legacy Toolkit V1 save migrates without losing purchases', passed, message: passed ? 'Parts and legacy equipment restored into Progression V2' : 'V1 migration lost progression data' });
  }

  {
    const assetDir = path.resolve('public/assets/equipment');
    const files = ['scanner_pro.png', 'sticky_tape.png', 'reflective_badge.png'];
    const invalid = files.filter((file) => {
      const bytes = fs.readFileSync(path.join(assetDir, file));
      return !AssetValidator.validatePngSignature(bytes).valid || bytes.readUInt32BE(16) !== 64 || bytes.readUInt32BE(20) !== 64;
    });
    const passed = invalid.length === 0;
    results.push({ testName: 'Equipment visual assets are genuine 64x64 PNG files', passed, message: passed ? '3/3 equipment assets validated' : `Invalid assets: ${invalid.join(', ')}` });
  }

  {
    const memory = new Map<string, string>();
    const storage = {
      get length() { return memory.size; },
      clear: () => memory.clear(),
      getItem: (key: string) => memory.get(key) ?? null,
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
      removeItem: (key: string) => memory.delete(key),
      setItem: (key: string, value: string) => { memory.set(key, value); },
    } as Storage;
    const globalWithStorage = globalThis as typeof globalThis & { localStorage?: Storage };
    const originalStorage = globalWithStorage.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    const upgradeClass = UpgradeSystem as unknown as { instance: UpgradeSystem | null; getInstance(): UpgradeSystem };
    upgradeClass.instance = null;
    const firstSession = UpgradeSystem.getInstance();
    firstSession.addParts(8);
    firstSession.purchase('scanner_pro');
    upgradeClass.instance = null;
    const restored = UpgradeSystem.getInstance();
    const passed = restored.getSnapshot().parts === 5 && restored.has('scanner_pro');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalStorage });
    else delete globalWithStorage.localStorage;
    upgradeClass.instance = null;
    UpgradeSystem.getInstance();
    results.push({ testName: 'Toolkit progression survives browser-session reload', passed, message: passed ? 'Parts and purchased equipment restored from versioned save' : 'Persisted upgrade state did not restore' });
  }

  upgrades.resetForTests();
  return { results };
}
