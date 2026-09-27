import { BALANCE } from '../config/balance';

export interface EconomySnapshot {
  initialDebt: number;
  remainingDebt: number;
  debtPaid: number;
  lifetimeEarnings: number;
  surplusCash: number;
  deliveriesCompleted: number;
  lastPayment: number;
}

export class EconomySystem {
  private static instance: EconomySystem | null = null;
  private remainingDebt: number = BALANCE.INITIAL_DEBT_VND;
  private lifetimeEarnings = 0;
  private surplusCash = 0;
  private deliveriesCompleted = 0;
  private lastPayment = 0;

  private constructor() { this.load(); }
  public static getInstance(): EconomySystem {
    if (!this.instance) this.instance = new EconomySystem();
    return this.instance;
  }

  public recordDelivery(grossReward: number): EconomySnapshot {
    const reward = Number.isFinite(grossReward) ? Math.max(0, Math.round(grossReward)) : 0;
    const payment = Math.min(this.remainingDebt, reward);
    this.remainingDebt -= payment;
    this.surplusCash += reward - payment;
    this.lifetimeEarnings += reward;
    this.deliveriesCompleted += 1;
    this.lastPayment = payment;
    this.persist();
    return this.getSnapshot();
  }

  public getSnapshot(): EconomySnapshot {
    return {
      initialDebt: BALANCE.INITIAL_DEBT_VND,
      remainingDebt: this.remainingDebt,
      debtPaid: BALANCE.INITIAL_DEBT_VND - this.remainingDebt,
      lifetimeEarnings: this.lifetimeEarnings,
      surplusCash: this.surplusCash,
      deliveriesCompleted: this.deliveriesCompleted,
      lastPayment: this.lastPayment,
    };
  }

  public hasProgress(): boolean { return this.deliveriesCompleted > 0 || this.remainingDebt < BALANCE.INITIAL_DEBT_VND; }
  public resetProgress(): void { this.resetForTests(); this.persist(); }
  public resetForTests(): void {
    this.remainingDebt = BALANCE.INITIAL_DEBT_VND;
    this.lifetimeEarnings = 0;
    this.surplusCash = 0;
    this.deliveriesCompleted = 0;
    this.lastPayment = 0;
  }

  private load(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('no_oi_economy_v1');
      if (!raw) return;
      const value = JSON.parse(raw) as Record<string, unknown>;
      if (typeof value.remainingDebt === 'number' && Number.isFinite(value.remainingDebt)) this.remainingDebt = Math.max(0, Math.min(BALANCE.INITIAL_DEBT_VND, Math.round(value.remainingDebt)));
      if (typeof value.lifetimeEarnings === 'number' && Number.isFinite(value.lifetimeEarnings)) this.lifetimeEarnings = Math.max(0, Math.round(value.lifetimeEarnings));
      if (typeof value.surplusCash === 'number' && Number.isFinite(value.surplusCash)) this.surplusCash = Math.max(0, Math.round(value.surplusCash));
      if (typeof value.deliveriesCompleted === 'number' && Number.isFinite(value.deliveriesCompleted)) this.deliveriesCompleted = Math.max(0, Math.floor(value.deliveriesCompleted));
      if (typeof value.lastPayment === 'number' && Number.isFinite(value.lastPayment)) this.lastPayment = Math.max(0, Math.round(value.lastPayment));
    } catch { this.resetForTests(); }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem('no_oi_economy_v1', JSON.stringify({ version: 1, ...this.getSnapshot() })); }
    catch { /* Restricted storage keeps the current session playable. */ }
  }
}
