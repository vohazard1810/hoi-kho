import {
  LocomotionState,
  ActionState,
  AttackComboStep,
  DogStateType,
  RivalStateType,
  ThugStateType,
  BossDogStateType,
} from '../core/types';

export class VisualStateMapper {
  /**
   * Maps Player locomotion, action state, and landing transition to visual animation state name.
   * Action state has visual precedence over locomotion.
   */
  public static mapPlayerState(
    locomotion: LocomotionState,
    action: ActionState,
    comboStep: AttackComboStep,
    isLanding: boolean = false
  ): string {
    // 1. KO State
    if (action === 'KO') {
      return 'ko';
    }

    // 2. Hurt / Flinch
    if (action === 'HURT') {
      return 'hurt';
    }

    // 3. Dodge Roll / Dash
    if (action === 'DODGE') {
      return 'dodge';
    }

    // 4. Attack Actions (Works seamlessly during ground or aerial locomotion)
    if (action === 'ATTACK') {
      switch (comboStep) {
        case 'J1':
          return 'j1';
        case 'J2':
          return 'j2';
        case 'J3':
        case 'ULTIMATE':
          return 'j3';
        default:
          return 'j1';
      }
    }

    // 5. Landing Visual Transition (when touching ground after falling)
    if (isLanding) {
      return 'land';
    }

    // 6. Locomotion States (when no action is active)
    switch (locomotion) {
      case 'RUN':
        return 'run';
      case 'JUMP':
        return 'jump';
      case 'FALL':
        return 'fall';
      case 'IDLE':
      default:
        return 'idle';
    }
  }

  /**
   * Maps Dog state to animation state name
   */
  public static mapDogState(state: DogStateType): string {
    switch (state) {
      case 'APPROACH':
        return 'approach';
      case 'TELEGRAPH':
        return 'telegraph';
      case 'DASH':
        return 'dash';
      case 'HURT':
        return 'hurt';
      case 'KO':
        return 'ko';
      case 'IDLE':
      case 'RECOVERY':
      default:
        return 'idle';
    }
  }

  /**
   * Maps Rival state to animation state name
   */
  public static mapRivalState(state: RivalStateType): string {
    switch (state) {
      case 'APPROACH':
        return 'approach';
      case 'ATTACK_STARTUP':
      case 'ATTACK_ACTIVE':
      case 'ATTACK_RECOVERY':
        return 'attack';
      case 'HURT':
        return 'hurt';
      case 'KO':
        return 'ko';
      case 'IDLE':
      default:
        return 'idle';
    }
  }

  /**
   * Maps Thug (Đầu Gấu) state to animation state name
   */
  public static mapThugState(state: ThugStateType): string {
    switch (state) {
      case 'CHASE':
        return 'chase';
      case 'HEAVY_TELEGRAPH':
      case 'HEAVY_ACTIVE':
      case 'HEAVY_RECOVERY':
        return 'heavy';
      case 'CHARGE_TELEGRAPH':
      case 'CHARGE_ACTIVE':
      case 'CHARGE_RECOVERY':
        return 'charge';
      case 'HURT':
        return 'hurt';
      case 'KO':
        return 'ko';
      case 'IDLE':
      default:
        return 'idle';
    }
  }

  /**
   * Maps BossDog (Chó Đại Ca) state to animation state name
   */
  public static mapBossDogState(state: BossDogStateType): string {
    switch (state) {
      case 'CHASE':
        return 'chase';
      case 'BITE_TELEGRAPH':
      case 'BITE_ACTIVE':
      case 'BITE_RECOVERY':
        return 'bite';
      case 'DASH_TELEGRAPH':
      case 'DASH_ACTIVE':
      case 'DASH_RECOVERY':
        return 'dash';
      case 'SLAM_TELEGRAPH':
      case 'SLAM_ACTIVE':
      case 'SLAM_RECOVERY':
        return 'slam';
      case 'HURT':
        return 'hurt';
      case 'KO':
        return 'ko';
      case 'IDLE':
      default:
        return 'idle';
    }
  }
}
