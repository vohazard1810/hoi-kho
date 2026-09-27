export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Hitbox extends Rect {
  id: string;
  ownerId: string;
  damage: number;
  parcelDamage?: number;
  knockbackX?: number;
  knockbackY?: number;
}

export interface Hurtbox extends Rect {
  ownerId: string;
  isInvulnerable?: boolean;
}

export type FacingDirection = 'left' | 'right';

// Decoupled locomotion and action states
export type LocomotionState = 'IDLE' | 'RUN' | 'JUMP' | 'FALL';
export type ActionState = 'NONE' | 'ATTACK' | 'DODGE' | 'HURT' | 'KO';

// Legacy / Unified player state
export type PlayerStateType = LocomotionState | ActionState;

export type AttackComboStep = 'NONE' | 'J1' | 'J2' | 'J3' | 'ULTIMATE';

export type AttackPhase = 'NONE' | 'STARTUP' | 'ACTIVE' | 'RECOVERY';

export type DogStateType =
  | 'IDLE'
  | 'APPROACH'
  | 'TELEGRAPH'
  | 'DASH'
  | 'RECOVERY'
  | 'HURT'
  | 'KO';

export type RivalStateType =
  | 'IDLE'
  | 'APPROACH'
  | 'ATTACK_STARTUP'
  | 'ATTACK_ACTIVE'
  | 'ATTACK_RECOVERY'
  | 'HURT'
  | 'KO';

export type ThugStateType =
  | 'IDLE'
  | 'CHASE'
  | 'HEAVY_TELEGRAPH'
  | 'HEAVY_ACTIVE'
  | 'HEAVY_RECOVERY'
  | 'CHARGE_TELEGRAPH'
  | 'CHARGE_ACTIVE'
  | 'CHARGE_RECOVERY'
  | 'HURT'
  | 'KO';

export type BossDogStateType =
  | 'IDLE'
  | 'CHASE'
  | 'BITE_TELEGRAPH'
  | 'BITE_ACTIVE'
  | 'BITE_RECOVERY'
  | 'DASH_TELEGRAPH'
  | 'DASH_ACTIVE'
  | 'DASH_RECOVERY'
  | 'SLAM_TELEGRAPH'
  | 'SLAM_ACTIVE'
  | 'SLAM_RECOVERY'
  | 'HURT'
  | 'KO';

export type PickupType = 'HEALTH' | 'PARCEL_REPAIR' | 'MOMENTUM' | 'BONUS_REWARD' | 'PARTS';

export type SceneType = 'MENU' | 'PROLOGUE' | 'HUB' | 'STAGE_1' | 'RESULT';

export type ObjectiveState =
  | 'NO_ORDER'
  | 'ORDER_OFFERED'
  | 'ORDER_ACCEPTED'
  | 'IN_DELIVERY'
  | 'DELIVERED';

export interface DeliveryResultData {
  success: boolean;
  remainingHp: number;
  maxHp: number;
  parcelCondition: number;
  baseReward: number;
  bonusReward: number;
  totalReward: number;
  reward: number; // For backward compatibility
  isDamaged: boolean;
  debtPayment: number;
  remainingDebt: number;
  lifetimeEarnings: number;
  deliveriesCompleted: number;
}
