import { BALANCE } from '../config/balance';
import { DeliveryResultData, ObjectiveState } from '../core/types';
import { EconomySystem } from './EconomySystem';
import { PARCEL_PROFILES, ParcelProfile } from './ParcelDamagePolicy';

export class ObjectiveSystem {
  private static instance: ObjectiveSystem | null = null;

  public state: ObjectiveState = 'NO_ORDER';
  public parcelProfile: ParcelProfile = PARCEL_PROFILES.fragile_glass;
  public parcelCondition: number = BALANCE.PARCEL_MAX_CONDITION;
  public playerHp: number = BALANCE.PLAYER_MAX_HP;
  public playerMaxHp: number = BALANCE.PLAYER_MAX_HP;
  public bonusReward: number = 0;
  public deliveryResult: DeliveryResultData | null = null;
  public lastParcelDamage: number = 0;
  public parcelDamageAt: number = 0;
  public lastParcelRepair: number = 0;
  public parcelRepairAt: number = 0;
  private lastParcelDamageTime: number = 0;

  private constructor() {
    this.reset();
  }

  public static getInstance(): ObjectiveSystem {
    if (!ObjectiveSystem.instance) {
      ObjectiveSystem.instance = new ObjectiveSystem();
    }
    return ObjectiveSystem.instance;
  }

  public reset(): void {
    this.state = 'NO_ORDER';
    this.parcelProfile = PARCEL_PROFILES.fragile_glass;
    this.parcelCondition = BALANCE.PARCEL_MAX_CONDITION;
    this.playerHp = BALANCE.PLAYER_MAX_HP;
    this.playerMaxHp = BALANCE.PLAYER_MAX_HP;
    this.bonusReward = 0;
    this.deliveryResult = null;
    this.lastParcelDamage = 0;
    this.parcelDamageAt = 0;
    this.lastParcelRepair = 0;
    this.parcelRepairAt = 0;
    this.lastParcelDamageTime = 0;
  }

  public restoreSnapshot(data: number | { parcelCondition?: number; bonusReward?: number }, bonusReward: number = 0): void {
    if (typeof data === 'number') {
      this.parcelCondition = data;
      this.bonusReward = bonusReward;
    } else {
      if (data.parcelCondition !== undefined) this.parcelCondition = data.parcelCondition;
      if (data.bonusReward !== undefined) this.bonusReward = data.bonusReward;
    }
    this.lastParcelDamage = 0;
    this.parcelDamageAt = 0;
    this.lastParcelRepair = 0;
    this.parcelRepairAt = 0;
    this.lastParcelDamageTime = 0;
  }

  public offerOrder(): void {
    if (this.state === 'NO_ORDER') {
      this.state = 'ORDER_OFFERED';
    }
  }

  public cancelOffer(): void {
    if (this.state === 'ORDER_OFFERED') {
      this.state = 'NO_ORDER';
    }
  }

  public acceptOrder(): void {
    this.state = 'ORDER_ACCEPTED';
    this.parcelCondition = BALANCE.PARCEL_MAX_CONDITION;
    this.bonusReward = 0;
  }

  public startDelivery(): void {
    this.state = 'IN_DELIVERY';
  }

  public damageParcel(amount: number, force: boolean = false): number {
    if (this.state !== 'IN_DELIVERY') return 0;
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // i-frame prevention: minimum 300ms between parcel damage ticks in real-time gameplay (delta >= 1ms)
    if (!force && this.lastParcelDamageTime > 0) {
      const delta = now - this.lastParcelDamageTime;
      if (delta >= 1 && delta < 300) {
        return 0;
      }
    }
    this.lastParcelDamageTime = now;
    const previous = this.parcelCondition;
    this.parcelCondition = Math.max(0, this.parcelCondition - amount);
    const actualLoss = previous - this.parcelCondition;
    if (actualLoss > 0) {
      this.lastParcelDamage = actualLoss;
      this.parcelDamageAt = now;
    }
    return actualLoss;
  }

  public repairParcel(amount: number): number {
    if (this.state !== 'IN_DELIVERY' || !Number.isFinite(amount) || amount <= 0) return 0;
    const previous = this.parcelCondition;
    if (previous >= BALANCE.PARCEL_FIELD_REPAIR_CAP) return 0;
    this.parcelCondition = Math.min(BALANCE.PARCEL_FIELD_REPAIR_CAP, this.parcelCondition + amount);
    const actualRepair = this.parcelCondition - previous;
    if (actualRepair > 0) {
      this.lastParcelRepair = actualRepair;
      this.parcelRepairAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.lastParcelDamage = 0;
    }
    return actualRepair;
  }

  public addBonusReward(amount: number): void {
    this.bonusReward += amount;
  }

  public completeDelivery(currentHp: number): DeliveryResultData {
    if (this.state === 'DELIVERED' && this.deliveryResult) {
      return this.deliveryResult;
    }

    this.state = 'DELIVERED';
    this.playerHp = currentHp;

    const isDamaged = this.parcelCondition <= 0;
    const conditionRatio = Math.max(0.1, this.parcelCondition / BALANCE.PARCEL_MAX_CONDITION);

    // Calculate base reward based on parcel condition
    const baseReward = Math.round(
      BALANCE.BASE_REWARD * (isDamaged ? BALANCE.DAMAGED_REWARD_MULTIPLIER : conditionRatio)
    );

    const bonusReward = this.bonusReward;
    const totalReward = baseReward + bonusReward;
    const econ = EconomySystem.getInstance().recordDelivery(totalReward);

    this.deliveryResult = {
      success: true,
      remainingHp: Math.max(0, this.playerHp),
      maxHp: this.playerMaxHp,
      parcelCondition: this.parcelCondition,
      baseReward,
      bonusReward,
      totalReward,
      reward: totalReward,
      isDamaged,
      debtPayment: econ.lastPayment,
      remainingDebt: econ.remainingDebt,
      lifetimeEarnings: econ.lifetimeEarnings,
      deliveriesCompleted: econ.deliveriesCompleted,
    };

    return this.deliveryResult;
  }
}
