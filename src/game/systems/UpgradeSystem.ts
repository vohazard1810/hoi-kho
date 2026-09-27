export type UpgradeBranch = 'J' | 'K' | 'L' | 'Q';
export type UpgradeId =
  | 'scanner_pro' | 'wide_scan' | 'precision_scan'
  | 'sticky_tape' | 'tape_range' | 'tape_impact'
  | 'reflective_backpack' | 'agile_dodge' | 'reinforced_parcel'
  | 'express_core' | 'express_radius' | 'momentum_reserve';

export interface UpgradeDefinition {
  id: UpgradeId;
  branch: UpgradeBranch;
  tier: 1 | 2;
  name: string;
  cost: number;
  effect: string;
  variant: boolean;
}

export interface UpgradeSnapshot {
  parts: number;
  reputation: number;
  unlockedTier: number;
  purchased: ReadonlySet<UpgradeId>;
  equipped: ReadonlyMap<UpgradeBranch, UpgradeId>;
  definitions: readonly UpgradeDefinition[];
}

export class UpgradeSystem {
  private static instance: UpgradeSystem | null = null;
  public static readonly DEFINITIONS: readonly UpgradeDefinition[] = [
    { id: 'scanner_pro', branch: 'J', tier: 1, name: 'Máy Quét Cổ Tay', cost: 3, effect: 'J3 +25% damage', variant: false },
    { id: 'wide_scan', branch: 'J', tier: 2, name: 'Quét Diện Rộng', cost: 5, effect: 'J3 rộng hơn 18%', variant: true },
    { id: 'precision_scan', branch: 'J', tier: 2, name: 'Quét Chính Xác', cost: 5, effect: 'J3 thêm 8% damage', variant: true },
    { id: 'sticky_tape', branch: 'K', tier: 1, name: 'Băng Keo Siêu Dính', cost: 5, effect: 'K slow 45% trong 1.5s', variant: false },
    { id: 'tape_range', branch: 'K', tier: 2, name: 'Cuộn Keo Tầm Xa', cost: 5, effect: 'K bay xa và nhanh hơn 20%', variant: true },
    { id: 'tape_impact', branch: 'K', tier: 2, name: 'Keo Gia Cường', cost: 5, effect: 'K +25% damage', variant: true },
    { id: 'reflective_backpack', branch: 'L', tier: 1, name: 'Balo Phản Quang', cost: 6, effect: 'Giảm 35% damage kiện', variant: false },
    { id: 'agile_dodge', branch: 'L', tier: 2, name: 'Lướt Linh Hoạt', cost: 6, effect: 'Dodge hồi nhanh hơn 15%', variant: true },
    { id: 'reinforced_parcel', branch: 'L', tier: 2, name: 'Chống Sốc Gia Cường', cost: 6, effect: 'Tổng giảm damage kiện 45%', variant: true },
    { id: 'express_core', branch: 'Q', tier: 1, name: 'Lõi Giao Hỏa Tốc', cost: 4, effect: 'Ultimate +15% damage', variant: false },
    { id: 'express_radius', branch: 'Q', tier: 2, name: 'Quét Toàn Hẻm', cost: 7, effect: 'Ultimate rộng hơn 30%', variant: true },
    { id: 'momentum_reserve', branch: 'Q', tier: 2, name: 'Pin Dự Phòng', cost: 7, effect: 'Giữ lại 20 Momentum sau Q', variant: true },
  ];

  private parts = 0;
  private reputation = 1;
  private completedStages = new Set<string>();
  private purchased = new Set<UpgradeId>();
  private equipped = new Map<UpgradeBranch, UpgradeId>();

  private constructor() { this.load(); }

  public static getInstance(): UpgradeSystem {
    if (!UpgradeSystem.instance) UpgradeSystem.instance = new UpgradeSystem();
    return UpgradeSystem.instance;
  }

  public addParts(amount: number): void {
    this.parts += Math.max(0, Math.floor(amount));
    this.persist();
  }

  public getParts(): number {
    return this.parts;
  }

  public setParts(amount: number): void {
    this.parts = Math.max(0, Math.floor(amount));
    this.persist();
  }

  public recordStageClear(stageId: string): void {
    if (!stageId || this.completedStages.has(stageId)) return;
    this.completedStages.add(stageId);
    this.reputation = Math.min(6, 1 + this.completedStages.size);
    this.persist();
  }

  public has(id: UpgradeId): boolean { return this.purchased.has(id); }

  public isEquipped(id: UpgradeId): boolean {
    const definition = this.getDefinition(id);
    return !!definition && (!definition.variant ? this.has(id) : this.equipped.get(definition.branch) === id);
  }

  public purchaseOrEquip(id: UpgradeId): boolean {
    const definition = this.getDefinition(id);
    if (!definition || definition.tier > this.getUnlockedTier()) return false;
    if (!this.purchased.has(id)) {
      if (this.parts < definition.cost) return false;
      this.parts -= definition.cost;
      this.purchased.add(id);
    }
    if (definition.variant) this.equipped.set(definition.branch, id);
    this.persist();
    return true;
  }

  public purchase(id: UpgradeId): boolean {
    if (this.purchased.has(id)) return false;
    return this.purchaseOrEquip(id);
  }

  public getUnlockedTier(): number { return this.reputation >= 2 ? 2 : 1; }
  public getJ3DamageMultiplier(): number { return (this.has('scanner_pro') ? 1.25 : 1) * (this.isEquipped('precision_scan') ? 1.08 : 1); }
  public getJ3WidthMultiplier(): number { return this.isEquipped('wide_scan') ? 1.18 : 1; }
  public getTapeSpeedMultiplier(): number { return this.isEquipped('tape_range') ? 1.2 : 1; }
  public getTapeLifetimeMultiplier(): number { return this.isEquipped('tape_range') ? 1.2 : 1; }
  public getTapeDamageMultiplier(): number { return this.isEquipped('tape_impact') ? 1.25 : 1; }
  public getDodgeCooldownMultiplier(): number { return this.isEquipped('agile_dodge') ? 0.85 : 1; }
  public getParcelDamageMultiplier(): number {
    const base = this.has('reflective_backpack') ? 0.65 : 1;
    return this.isEquipped('reinforced_parcel') ? Math.min(base, 0.55) : base;
  }
  public getUltimateDamageMultiplier(): number { return this.has('express_core') ? 1.15 : 1; }
  public getUltimateRadiusMultiplier(): number { return this.isEquipped('express_radius') ? 1.3 : 1; }
  public getUltimateMomentumReserve(): number { return this.isEquipped('momentum_reserve') ? 20 : 0; }

  public getSnapshot(): UpgradeSnapshot {
    return {
      parts: this.parts, reputation: this.reputation, unlockedTier: this.getUnlockedTier(),
      purchased: new Set(this.purchased), equipped: new Map(this.equipped),
      definitions: UpgradeSystem.DEFINITIONS,
    };
  }

  public hasProgress(): boolean {
    return this.parts > 0 || this.reputation > 1 || this.purchased.size > 0 || this.completedStages.size > 0;
  }

  public resetProgress(): void {
    this.resetForTests();
    this.persist();
  }

  public resetForTests(): void {
    this.parts = 0; this.reputation = 1; this.completedStages.clear(); this.purchased.clear(); this.equipped.clear();
  }

  private getDefinition(id: UpgradeId): UpgradeDefinition | undefined {
    return UpgradeSystem.DEFINITIONS.find((definition) => definition.id === id);
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const v2 = localStorage.getItem('hoi_kho_progression_v2');
      if (v2) { this.restore(JSON.parse(v2)); return; }
      const legacy = localStorage.getItem('hoi_kho_toolkit_v1');
      if (legacy) this.restore(JSON.parse(legacy));
    } catch { this.resetForTests(); }
  }

  private restore(parsed: { parts?: unknown; reputation?: unknown; completedStages?: unknown; purchased?: unknown; equipped?: unknown }): void {
    const validIds = new Set(UpgradeSystem.DEFINITIONS.map((definition) => definition.id));
    this.parts = typeof parsed.parts === 'number' && Number.isFinite(parsed.parts) ? Math.max(0, Math.floor(parsed.parts)) : 0;
    this.reputation = typeof parsed.reputation === 'number' && Number.isFinite(parsed.reputation) ? Math.max(1, Math.min(6, Math.floor(parsed.reputation))) : 1;
    if (Array.isArray(parsed.completedStages)) this.completedStages = new Set(parsed.completedStages.filter((id): id is string => typeof id === 'string'));
    if (Array.isArray(parsed.purchased)) this.purchased = new Set(parsed.purchased.filter((id): id is UpgradeId => validIds.has(id as UpgradeId)));
    if (parsed.equipped && typeof parsed.equipped === 'object') {
      for (const [branch, id] of Object.entries(parsed.equipped)) {
        if (['J', 'K', 'L', 'Q'].includes(branch) && validIds.has(id as UpgradeId) && this.purchased.has(id as UpgradeId)) this.equipped.set(branch as UpgradeBranch, id as UpgradeId);
      }
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('hoi_kho_progression_v2', JSON.stringify({
        version: 2, parts: this.parts, reputation: this.reputation,
        completedStages: Array.from(this.completedStages), purchased: Array.from(this.purchased),
        equipped: Object.fromEntries(this.equipped),
      }));
    } catch { /* Restricted storage keeps in-memory progression for this session. */ }
  }
}
