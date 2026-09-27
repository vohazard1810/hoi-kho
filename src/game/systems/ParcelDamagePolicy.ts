import { BALANCE } from '../config/balance';
import { FacingDirection } from '../core/types';

export type ParcelType = 'standard' | 'fragile_glass';

export interface ParcelProfile {
  type: ParcelType;
  displayName: string;
  shortLabel: string;
  maxDamagePerHitPercent: number;
  jingleOnMovement: boolean;
}

export const PARCEL_PROFILES: Record<ParcelType, ParcelProfile> = {
  standard: {
    type: 'standard',
    displayName: 'Kiện Tiêu Chuẩn',
    shortLabel: 'TIÊU CHUẨN',
    maxDamagePerHitPercent: 100,
    jingleOnMovement: false,
  },
  fragile_glass: {
    type: 'fragile_glass',
    displayName: 'Kiện Dễ Vỡ (Đồ Thủy Tinh)',
    shortLabel: 'DỄ VỠ',
    maxDamagePerHitPercent: 10,
    jingleOnMovement: true,
  },
};

export interface ParcelDamageResult {
  amount: number;
  rearHit: boolean;
  directionMultiplier: number;
}

export function calculateParcelDamage(
  baseDamage: number,
  protectionMultiplier: number,
  playerCenterX: number,
  playerFacing: FacingDirection,
  sourceX: number,
  profile: ParcelProfile = PARCEL_PROFILES.standard
): ParcelDamageResult {
  if (!Number.isFinite(baseDamage) || baseDamage <= 0) {
    return { amount: 0, rearHit: false, directionMultiplier: 1 };
  }

  const rearHit = Number.isFinite(sourceX) && (playerFacing === 'right' ? sourceX < playerCenterX : sourceX > playerCenterX);
  const directionMultiplier = rearHit ? BALANCE.PARCEL_REAR_HIT_MULTIPLIER : 1;
  const protection = Number.isFinite(protectionMultiplier) ? Math.max(0, protectionMultiplier) : 1;

  let calculated = baseDamage * directionMultiplier * protection;

  if (profile && profile.maxDamagePerHitPercent < 100) {
    const maxAllowed = (profile.maxDamagePerHitPercent / 100) * BALANCE.PARCEL_MAX_CONDITION;
    calculated = Math.min(calculated, maxAllowed);
  }

  const amount = Math.round(calculated * 10) / 10;
  return { amount, rearHit, directionMultiplier };
}
