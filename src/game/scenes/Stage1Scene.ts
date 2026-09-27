import { BALANCE } from '../config/balance';
import { EnemySpawnData, STAGE_1_CONFIG } from '../config/stage1';
import { Camera } from '../core/Camera';
import { Input } from '../core/Input';
import { SceneManager } from '../core/SceneManager';
import { BossDog } from '../entities/BossDog';
import { Dog } from '../entities/Dog';
import { EnemyProjectile } from '../entities/EnemyProjectile';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Rival } from '../entities/Rival';
import { Thug } from '../entities/Thug';
import { Renderer } from '../rendering/Renderer';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { LootSystem } from '../systems/LootSystem';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { GameFeelSystem } from '../systems/GameFeelSystem';
import { Scene } from './Scene';
import { EnemyStatusSystem } from '../systems/EnemyStatusSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { AudioManager, meleeSwingSfx, pickupSfx } from '../audio/AudioManager';
import { DialogueSystem, DialogueLine } from '../systems/DialogueSystem';
import { calculateParcelDamage } from '../systems/ParcelDamagePolicy';
import { RunTelemetry } from '../systems/RunTelemetry';

export type ZoneEncounterState = 'NOT_STARTED' | 'ACTIVE' | 'CLEARED';

export interface EncounterCheckpoint {
  zoneId: 'A' | 'B' | 'C' | 'D' | 'E';
  playerX: number;
  playerY: number;
  playerHp: number;
  parcelCondition: number;
  bonusReward: number;
  parts: number;
  zoneStates: Record<'A' | 'B' | 'C' | 'D' | 'E', ZoneEncounterState>;
}

export class Stage1Scene implements Scene {
  public name: string = 'STAGE_1';

  private sceneManager: SceneManager;
  private camera: Camera;
  private player: Player;
  private customer: NPC;
  private checkpoint: EncounterCheckpoint | null = null;

  // Active entities
  private dogs: Dog[] = [];
  private rivals: Rival[] = [];
  private thugs: Thug[] = [];
  private bossDogs: BossDog[] = [];
  private projectiles: Projectile[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];

  // Track dropped loot to avoid duplicate drops
  private droppedLootEnemyIds: Set<string> = new Set();

  // Explicit Encounter States per Zone
  private zoneStates: Record<'A' | 'B' | 'C' | 'D' | 'E', ZoneEncounterState> = {
    A: 'NOT_STARTED',
    B: 'NOT_STARTED',
    C: 'NOT_STARTED',
    D: 'NOT_STARTED',
    E: 'NOT_STARTED',
  };

  // Systems
  private combatSystem: CombatSystem;
  private spawnSystem: SpawnSystem;
  private lootSystem: LootSystem;
  private gameFeel: GameFeelSystem;
  private enemyStatus: EnemyStatusSystem;
  private audio: AudioManager;
  private lastEnemyStates = new Map<string, string>();
  private dialogue = new DialogueSystem();
  private announcedZones = new Set<string>();
  private deliveryPending = false;
  private perfectDodgeHitboxIds = new Set<string>();
  private hazardCooldowns = new Map<string, number>();
  private hazardCues = new Map<string, { timer: number; triggered: boolean }>();
  private telemetry = RunTelemetry.getInstance();
  private koRecorded = false;

  // Interaction prompt & progress
  private nearbyPrompt: string | null = null;
  private currentZoneId: string = 'A';
  private currentZoneName: string = 'Hẻm Đầu Cầu';
  private currentEncounterName: string = 'Tutorial Dog';

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.camera = new Camera(STAGE_1_CONFIG.WORLD_WIDTH, STAGE_1_CONFIG.WORLD_HEIGHT);
    this.player = new Player(STAGE_1_CONFIG.PLAYER_START_X, STAGE_1_CONFIG.PLAYER_START_Y);

    this.customer = new NPC(
      'npc_chutu',
      STAGE_1_CONFIG.NPC_CUSTOMER_X,
      STAGE_1_CONFIG.NPC_CUSTOMER_Y,
      'chutu',
      'Chú Tư (Khách nhận)',
      'Giao hàng cho Chú Tư',
      () => this.onDeliverToCustomer()
    );

    this.combatSystem = new CombatSystem();
    this.spawnSystem = new SpawnSystem(
      STAGE_1_CONFIG.ENEMY_SPAWNS,
      BALANCE.MAX_ACTIVE_ENEMIES
    );
    this.lootSystem = new LootSystem();
    this.audio = AudioManager.getInstance();
    this.gameFeel = new GameFeelSystem(this.audio);
    this.enemyStatus = new EnemyStatusSystem();

    // Bind player projectile shooting callback
    this.player.onShootProjectile = (proj) => {
      this.projectiles.push(proj);
      this.audio.play('throw_tape');
    };
    this.player.onMeleeStarted = (step) => this.audio.play(meleeSwingSfx(step));
    this.player.onDodgeStarted = () => this.audio.play('dodge');
    this.player.onFootstep = () => {
      this.audio.play('footstep');
      if (ObjectiveSystem.getInstance().state === 'IN_DELIVERY') this.audio.play('glass_clink');
    };
    this.player.onJumpStarted = () => this.audio.play('jump');
    this.player.onLanded = () => this.audio.play('land');
    this.player.onUltimateActivated = () => {
      this.audio.play('ultimate_charge');
      this.gameFeel.triggerUltimateActivation(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );
    };
    this.lootSystem.onPickupCollected = (type) => this.audio.play(pickupSfx(type));
  }

  public init(): void {
    // Stage init
  }

  public enter(): void {
    this.enterFreshStage();
  }

  public enterFreshStage(): void {
    const objective = ObjectiveSystem.getInstance();
    objective.startDelivery();
    this.telemetry.startStage(objective.parcelCondition);
    this.koRecorded = false;

    // Reset player position and state
    this.player.reset(STAGE_1_CONFIG.PLAYER_START_X, STAGE_1_CONFIG.PLAYER_START_Y);
    this.camera.setPosition(0, 0);

    // Reset entities and systems
    this.dogs = [];
    this.rivals = [];
    this.thugs = [];
    this.bossDogs = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.droppedLootEnemyIds.clear();
    this.lastEnemyStates.clear();
    this.dialogue.reset();
    this.announcedZones.clear();
    this.deliveryPending = false;
    this.perfectDodgeHitboxIds.clear();

    // Reset encounter states
    this.zoneStates = {
      A: 'NOT_STARTED',
      B: 'NOT_STARTED',
      C: 'NOT_STARTED',
      D: 'NOT_STARTED',
      E: 'NOT_STARTED',
    };

    this.announcedZones.clear();
    this.hazardCooldowns.clear();
    this.hazardCues.clear();

    this.combatSystem.reset();
    this.spawnSystem.reset();
    this.lootSystem.reset();
    this.gameFeel.reset();
    this.enemyStatus.reset();

    // Exploration drops on elevated platforms reward vertical navigation & Air Drop Kick
    this.lootSystem.spawnDrop('PARTS', 985, 432);
    this.lootSystem.spawnDrop('PARCEL_REPAIR', 1760, 412);
    this.lootSystem.spawnDrop('PARTS', 2505, 362);

    this.nearbyPrompt = null;
    this.currentZoneId = 'A';
    this.currentZoneName = 'Hẻm Đầu Cầu';

    // Capture initial checkpoint for Zone A
    this.captureEncounterCheckpoint('A');

    this.dialogue.start([
      { speaker: 'HỘI KHỜ', text: 'Địa chỉ ở cuối hẻm. Cứ giữ bình tĩnh, giữ kiện hàng… rồi tìm đường ra.', tone: 'neutral' },
      { speaker: 'HỆ THỐNG', text: 'Hạ kẻ chặn đường để mở cổng từng khu vực. Momentum đầy sẽ kích hoạt Tuyệt Kỹ [Q].', tone: 'warning' },
    ]);
  }

  public captureEncounterCheckpoint(zoneId: 'A' | 'B' | 'C' | 'D' | 'E'): void {
    const objective = ObjectiveSystem.getInstance();
    const upgradeSystem = UpgradeSystem.getInstance();

    let spawnX = STAGE_1_CONFIG.PLAYER_START_X;
    let spawnY = STAGE_1_CONFIG.PLAYER_START_Y;

    if (zoneId === 'A') {
      spawnX = STAGE_1_CONFIG.PLAYER_START_X;
      spawnY = STAGE_1_CONFIG.PLAYER_START_Y;
    } else if (zoneId === 'B') {
      spawnX = 690;
      spawnY = 556;
    } else if (zoneId === 'C') {
      spawnX = 1370;
      spawnY = 556;
    } else if (zoneId === 'D') {
      spawnX = 2050;
      spawnY = 556;
    } else if (zoneId === 'E') {
      spawnX = 2730;
      spawnY = 556;
    }

    this.checkpoint = {
      zoneId,
      playerX: spawnX,
      playerY: spawnY,
      playerHp: this.player.maxHp,
      parcelCondition: objective.parcelCondition,
      bonusReward: objective.bonusReward,
      parts: upgradeSystem.getSnapshot().parts,
      zoneStates: { ...this.zoneStates },
    };
  }

  public retryFromCheckpoint(): void {
    if (!this.checkpoint) {
      this.enterFreshStage();
      return;
    }

    const cp = this.checkpoint;
    const objective = ObjectiveSystem.getInstance();
    const upgradeSystem = UpgradeSystem.getInstance();

    // 1. Restore anti-farming economics & condition snapshot
    upgradeSystem.setParts(cp.parts);
    objective.restoreSnapshot({
      parcelCondition: cp.parcelCondition,
      bonusReward: cp.bonusReward,
    });

    // 2. Reset player state & position
    this.player.reset(cp.playerX, cp.playerY);
    this.player.hp = cp.playerHp;
    this.camera.setPosition(cp.playerX - 200, 0);
    this.koRecorded = false;
    if (cp.zoneId === 'E') this.telemetry.beginBossAttempt();

    // 3. Reset transient combat state
    this.resetTransientCombatState();

    // 4. Restore zone states: previously CLEARED zones stay CLEARED
    this.zoneStates = { ...cp.zoneStates };
    this.zoneStates[cp.zoneId] = 'ACTIVE';

    // 5. Respawn only the current zone's enemies freshly
    const currentSpawns = STAGE_1_CONFIG.ENEMY_SPAWNS.filter((s) => s.zone === cp.zoneId);
    const currentSpawnIds = new Set(currentSpawns.map((s) => s.id));

    this.dogs = this.dogs.filter((d) => !currentSpawnIds.has(d.id));
    this.rivals = this.rivals.filter((r) => !currentSpawnIds.has(r.id));
    this.thugs = this.thugs.filter((t) => !currentSpawnIds.has(t.id));
    this.bossDogs = this.bossDogs.filter((b) => !currentSpawnIds.has(b.id));

    // Clear loot drop tracking for current zone spawns
    for (const id of currentSpawnIds) {
      this.droppedLootEnemyIds.delete(id);
    }

    // Spawn encounter enemies for this zone
    for (const spawnData of currentSpawns) {
      this.handleEnemySpawn(spawnData);
    }

    this.nearbyPrompt = null;
  }

  public resetTransientCombatState(): void {
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.combatSystem.reset();
    this.gameFeel.reset();
    this.enemyStatus.reset();
    this.lootSystem.reset();
    this.dialogue.reset();
    this.hazardCooldowns.clear();
    this.perfectDodgeHitboxIds.clear();
  }

  public getCheckpoint(): EncounterCheckpoint | null {
    return this.checkpoint;
  }

  public exit(): void {
    this.dogs = [];
    this.rivals = [];
    this.thugs = [];
    this.bossDogs = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.droppedLootEnemyIds.clear();
    this.lootSystem.reset();
    this.gameFeel.reset();
    this.enemyStatus.reset();
    this.dialogue.reset();
  }

  public isZoneCleared(zoneId: 'A' | 'B' | 'C' | 'D' | 'E'): boolean {
    return this.zoneStates[zoneId] === 'CLEARED';
  }

  private onDeliverToCustomer(): void {
    // Delivery requires Zone E to be legitimately CLEARED
    if (this.zoneStates['E'] !== 'CLEARED') {
      return;
    }

    if (this.deliveryPending) return;
    this.deliveryPending = true;
    const cond = ObjectiveSystem.getInstance().parcelCondition;
    const chutuFeedback = cond >= 80
      ? 'Kiện hàng nguyên vẹn 100%! Chú chấm 5 sao ⭐⭐⭐⭐⭐ và bo thêm cho con ly nước mía nhé!'
      : 'Hơi móp một góc do tụi giang hồ chặn đường, nhưng đồ bên trong an toàn! Cảm ơn con nhiều nghen!';
    this.dialogue.start([
      { speaker: 'CHÚ TƯ', text: 'Tới được đây là giỏi lắm rồi! Đơn SXP-8924 của chú phải không con?', tone: 'neutral' },
      { speaker: 'HỘI KHỜ', text: 'Dạ, kiện hàng giao đúng người tận tay! Chú kiểm tra ký nhận giúp con nha.', tone: 'success' },
      { speaker: 'CHÚ TƯ', text: chutuFeedback, tone: 'success' },
    ], () => {
      const objective = ObjectiveSystem.getInstance();
      this.telemetry.complete(objective.parcelCondition);
      objective.completeDelivery(this.player.hp);
      UpgradeSystem.getInstance().recordStageClear('STAGE_1');
      this.audio.play('order_complete');
      setTimeout(() => this.sceneManager.switchScene('RESULT'), 200);
    });
  }

  private handleEnemySpawn(spawnData: EnemySpawnData): void {
    if (spawnData.type === 'dog') {
      if (!this.dogs.some((d) => d.id === spawnData.id)) {
        const dog = new Dog(spawnData.id, spawnData.spawnX, spawnData.spawnY);
        this.dogs.push(dog);
      }
    } else if (spawnData.type === 'rival') {
      if (!this.rivals.some((r) => r.id === spawnData.id)) {
        const rival = new Rival(spawnData.id, spawnData.spawnX, spawnData.spawnY);
        rival.startDriveBy();
        rival.onRangedThrow = (ownerId, x, y, targetX, targetY) => {
          this.enemyProjectiles.push(new EnemyProjectile(ownerId, x, y, targetX, targetY));
          this.audio.play('enemy_warning');
        };
        rival.onDriveByCue = () => { this.audio.play('enemy_warning'); this.audio.play('rival_taunt'); };
        this.rivals.push(rival);
      }
    } else if (spawnData.type === 'thug') {
      if (!this.thugs.some((t) => t.id === spawnData.id)) {
        const thug = new Thug(spawnData.id, spawnData.spawnX, spawnData.spawnY);
        this.thugs.push(thug);
      }
    } else if (spawnData.type === 'boss_dog') {
      if (!this.bossDogs.some((b) => b.id === spawnData.id)) {
        const bossDog = new BossDog(spawnData.id, spawnData.spawnX, spawnData.spawnY);
        this.bossDogs.push(bossDog);
      }
    }
  }

  public update(dt: number, input: Input): void {
    const objective = ObjectiveSystem.getInstance();

    if (this.dialogue.isActive()) {
      if (input.isJustPressed('cancel')) this.dialogue.skip();
      else if (input.isJustPressed('interact') || input.isJustPressed('attack') || input.isJustPressed('jump')) this.dialogue.advance();
      this.camera.updateShake(dt);
      return;
    }

    this.telemetry.update(dt);

    // Hit-stop freezes gameplay simulation only. Visual timers and camera shake continue.
    const simulationFrozen = this.gameFeel.update(dt);
    this.camera.updateShake(dt);
    if (simulationFrozen) return;
    this.enemyStatus.update(dt);

    // If Player is KO, check for quick restart on 'E' or Space
    if (this.player.state === 'KO') {
      if (!this.koRecorded) { this.telemetry.recordDeath(); this.koRecorded = true; }
      this.nearbyPrompt = 'Bị đánh gục! Nhấn [SPACE] để thử lại';
      if (input.isJustPressed('jump') || input.isJustPressed('interact')) {
        this.retryFromCheckpoint();
      }
      this.player.update(dt);
      return;
    }

    // 1. Process Player Controls
    if (input.isJustPressed('attack')) this.telemetry.recordAction('J');
    if (input.isJustPressed('projectile')) this.telemetry.recordAction('K');
    if (input.isJustPressed('dodge')) this.telemetry.recordAction('L');
    if (input.isJustPressed('ultimate')) this.telemetry.recordAction('Q');
    this.player.handleInput(input);

    let moveAxis = 0;
    if (input.isDown('moveLeft')) moveAxis -= 1;
    if (input.isDown('moveRight')) moveAxis += 1;
    this.player.applyMovementInput(moveAxis, dt);

    // 2. Resolve Player Physics
    const prevPlayerY = this.player.y;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    CollisionSystem.resolveHorizontal(this.player, STAGE_1_CONFIG.WORLD_WIDTH);
    CollisionSystem.resolveVertical(
      this.player,
      STAGE_1_CONFIG.PLATFORMS,
      STAGE_1_CONFIG.GROUND_SEGMENTS,
      prevPlayerY
    );

    // 3. Resolve Encounter Gates Solid Collisions
    // Gate opens strictly when encounterState === 'CLEARED'
    for (const zone of STAGE_1_CONFIG.ZONES) {
      if (this.zoneStates[zone.id] !== 'CLEARED') {
        const gateX = zone.gateX;
        if (this.player.x + this.player.width >= gateX && this.player.x < gateX + 60) {
          this.player.x = gateX - this.player.width;
          if (this.player.vx > 0) this.player.vx = 0;
        }
      }
    }

    // Update hazard cooldowns
    for (const [id, time] of this.hazardCooldowns.entries()) {
      if (time <= dt) {
        this.hazardCooldowns.delete(id);
      } else {
        this.hazardCooldowns.set(id, time - dt);
      }
    }

    // Update telegraph warning cues for hazards (appear once on first approach, then fade out over 1.2s)
    for (const h of STAGE_1_CONFIG.HAZARDS) {
      if (h.type === 'puddle' || h.type === 'trash') {
        const cue = this.hazardCues.get(h.id);
        const dist = Math.abs(this.player.x - (h.x + h.width / 2));
        if (!cue) {
          if (dist < 150) {
            this.hazardCues.set(h.id, { timer: 1.2, triggered: true });
          }
        } else if (cue.timer > 0) {
          cue.timer = Math.max(0, cue.timer - dt);
        }
      }
    }

    // Check Player bottom pit fall / hazard
    if (this.player.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60) {
      const tookDamage = this.player.takeDamage(15, 200, 300, this.player.x);
      if (tookDamage) {
        objective.damageParcel(BALANCE.PARCEL_HAZARD_DAMAGE);
      }
      // Respawn slightly back on platform
      this.player.y = 480;
      this.player.vy = 0;
    }

    const hazard = CollisionSystem.checkHazards(this.player.getRect(), STAGE_1_CONFIG.HAZARDS);
    if (hazard) {
      const cd = this.hazardCooldowns.get(hazard.id) || 0;
      if (cd <= 0) {
        if (hazard.type === 'puddle') {
          // Puddle: damage = 0, parcelDamage = 0; traction reduced by 25% for 0.5s max (handled by Player.applySlip)
          this.player.applySlip(0.5);
          this.hazardCooldowns.set(hazard.id, 0.5);
        } else if (hazard.type === 'trash') {
          // Trash: low obstacle; normal walking does not inflict HP or parcel damage.
          // Only inflicts 2-3% parcel damage if knocked back by enemy or rushing at high speed.
          const isHighSpeedImpact = this.player.actionState !== 'HURT' && Math.abs(this.player.vx) > 220;
          if (isHighSpeedImpact) {
            const tookDamage = this.player.takeDamage(hazard.damage, 60, 80, hazard.x + hazard.width / 2);
            if (tookDamage) {
              objective.damageParcel(hazard.parcelDamage);
            }
            this.hazardCooldowns.set(hazard.id, 1.0);
          }
        } else {
          // Pit hazards
          const tookDamage = this.player.takeDamage(hazard.damage, 150, 250, hazard.x + hazard.width / 2);
          if (tookDamage) {
            objective.damageParcel(hazard.parcelDamage);
          }
          this.hazardCooldowns.set(hazard.id, 1.0);
        }
      }
    }

    this.player.update(dt);

    // 4. Update Zone Encounter States & Spawner Trigger
    this.updateEncounterStates();

    const activeEnemiesCount =
      this.dogs.filter((d) => d.isAlive).length +
      this.rivals.filter((r) => r.isAlive).length +
      this.thugs.filter((t) => t.isAlive).length +
      this.bossDogs.filter((b) => b.isAlive).length;

    this.spawnSystem.update(this.player.x, activeEnemiesCount, (spawnData) => {
      this.handleEnemySpawn(spawnData);
    });

    // 5. Update Dogs (AI + Physics + Navigation Safety + Hazard Recovery)
    for (const dog of this.dogs) {
      if (!dog.isAlive && dog.state !== 'KO') continue;

      dog.updateAI(
        dt,
        this.player.x,
        this.player.y,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      this.announceEnemyState(dog.id, dog.state, false);

      const prevDogY = dog.y;
      dog.x += dog.vx * dt * this.enemyStatus.getMovementMultiplier(dog.id);
      dog.y += dog.vy * dt;

      CollisionSystem.resolveHorizontal(dog, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        dog,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevDogY
      );

      dog.update(dt);

      // Hazard Fall Recovery: if dog falls in hazard pit or out of bounds while alive, reposition safely
      if (dog.isAlive && dog.state !== 'KO') {
        const inHazard = CollisionSystem.checkHazards(dog.getRect(), STAGE_1_CONFIG.HAZARDS);
        const inFatalPit = inHazard ? inHazard.type === 'pit' || inHazard.y >= 680 : false;
        const outOfBounds = dog.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (inFatalPit || outOfBounds) {
          const spawnInfo = STAGE_1_CONFIG.ENEMY_SPAWNS.find((s) => s.id === dog.id);
          dog.x = spawnInfo ? spawnInfo.spawnX : 520;
          dog.y = spawnInfo ? spawnInfo.spawnY : 588;
          dog.vx = 0;
          dog.vy = 0;
          dog.state = 'IDLE';
          dog.isGrounded = true;
        }
      }

      this.checkEnemyLootDrop(dog.id, 'dog', dog.isAlive, dog.x, dog.y);
    }

    // 6. Update Rivals (AI + Physics + Navigation Safety + Hazard Recovery)
    for (const rival of this.rivals) {
      if (!rival.isAlive && rival.state !== 'KO') continue;

      rival.updateAI(
        dt,
        this.player.x,
        this.player.y,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      this.announceEnemyState(rival.id, rival.state, false);

      const prevRivalY = rival.y;
      rival.x += rival.vx * dt * this.enemyStatus.getMovementMultiplier(rival.id);
      rival.y += rival.vy * dt;

      CollisionSystem.resolveHorizontal(rival, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        rival,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevRivalY
      );

      rival.update(dt);

      // Hazard Fall Recovery for Rival
      if (rival.isAlive && rival.state !== 'KO') {
        const inHazard = CollisionSystem.checkHazards(rival.getRect(), STAGE_1_CONFIG.HAZARDS);
        const inFatalPit = inHazard ? inHazard.type === 'pit' || inHazard.y >= 680 : false;
        const outOfBounds = rival.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (inFatalPit || outOfBounds) {
          const spawnInfo = STAGE_1_CONFIG.ENEMY_SPAWNS.find((s) => s.id === rival.id);
          rival.x = spawnInfo ? spawnInfo.spawnX : 1720;
          rival.y = spawnInfo ? spawnInfo.spawnY : 556;
          rival.vx = 0;
          rival.vy = 0;
          rival.state = 'IDLE';
          rival.isGrounded = true;
          rival.forceDismount();
        }
      }

      this.checkEnemyLootDrop(rival.id, 'rival', rival.isAlive, rival.x, rival.y);
    }

    // 7. Update Thugs (Miniboss Safety: cannot die from hazard, repositions with preserved HP)
    for (const thug of this.thugs) {
      if (!thug.isAlive && thug.state !== 'KO') continue;

      thug.updateAI(
        this.player,
        dt,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      this.announceEnemyState(thug.id, thug.state, false);

      const prevThugY = thug.y;
      thug.x += thug.vx * dt * this.enemyStatus.getMovementMultiplier(thug.id);
      thug.y += thug.vy * dt;

      CollisionSystem.resolveHorizontal(thug, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        thug,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevThugY
      );

      thug.update(dt);

      // Miniboss Safety
      if (thug.isAlive && thug.state !== 'KO') {
        const inHazard = CollisionSystem.checkHazards(thug.getRect(), STAGE_1_CONFIG.HAZARDS);
        const inFatalPit = inHazard ? inHazard.type === 'pit' || inHazard.y >= 680 : false;
        const outOfBounds = thug.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (inFatalPit || outOfBounds) {
          const spawnInfo = STAGE_1_CONFIG.ENEMY_SPAWNS.find((s) => s.id === thug.id);
          thug.x = spawnInfo ? spawnInfo.spawnX : 2360;
          thug.y = spawnInfo ? spawnInfo.spawnY : 546;
          thug.vx = 0;
          thug.vy = 0;
          thug.state = 'IDLE';
          thug.isGrounded = true;
        }
      }

      this.checkEnemyLootDrop(thug.id, 'thug', thug.isAlive, thug.x, thug.y);
    }

    // 8. Update Boss Dogs (Stage Boss Safety: cannot die from hazard, repositions with preserved HP & phase)
    for (const boss of this.bossDogs) {
      if (!boss.isAlive && boss.state !== 'KO') continue;

      boss.updateAI(
        this.player,
        dt,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      this.announceEnemyState(boss.id, boss.state, true);

      const prevBossY = boss.y;
      boss.x += boss.vx * dt * this.enemyStatus.getMovementMultiplier(boss.id);
      boss.y += boss.vy * dt;

      CollisionSystem.resolveHorizontal(boss, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        boss,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevBossY
      );

      boss.update(dt);

      // Boss Safety
      if (boss.isAlive && boss.state !== 'KO') {
        const inHazard = CollisionSystem.checkHazards(boss.getRect(), STAGE_1_CONFIG.HAZARDS);
        const outOfBounds = boss.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (inHazard || outOfBounds) {
          const spawnInfo = STAGE_1_CONFIG.ENEMY_SPAWNS.find((s) => s.id === boss.id);
          boss.x = spawnInfo ? spawnInfo.spawnX : 2980;
          boss.y = spawnInfo ? spawnInfo.spawnY : 568;
          boss.vx = 0;
          boss.vy = 0;
          boss.state = 'IDLE';
          boss.isGrounded = true;
        }
      }

      this.checkEnemyLootDrop(boss.id, 'boss_dog', boss.isAlive, boss.x, boss.y);
    }

    // 9. Update Projectiles
    for (const proj of this.projectiles) {
      if (proj.isExpired) continue;
      proj.update(dt);
      proj.checkSolidCollision(STAGE_1_CONFIG.WORLD_WIDTH, STAGE_1_CONFIG.PLATFORMS);
    }
    this.projectiles = this.projectiles.filter((p) => !p.isExpired);

    for (const proj of this.enemyProjectiles) {
      if (proj.isExpired) continue;
      proj.update(dt);
      proj.checkSolidCollision(
        STAGE_1_CONFIG.WORLD_WIDTH,
        [...STAGE_1_CONFIG.PLATFORMS, ...STAGE_1_CONFIG.GROUND_SEGMENTS]
      );
    }
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => !p.isExpired);

    // 10. Combat Hitbox Evaluation
    // (a) Player Attacks -> Enemies
    const enemyTargets = [
      ...this.dogs.filter((d) => d.isAlive),
      ...this.rivals.filter((r) => r.isAlive),
      ...this.thugs.filter((t) => t.isAlive),
      ...this.bossDogs.filter((b) => b.isAlive),
    ];

    const playerHitbox = this.player.getActiveHitbox();
    if (playerHitbox) {
      const hits = this.combatSystem.evaluateHitbox(playerHitbox, enemyTargets);
      if (hits.length > 0) {
        let gain: number = BALANCE.J1_MOMENTUM_GAIN;
        if (this.player.comboStep === 'J2') gain = BALANCE.J2_MOMENTUM_GAIN;
        else if (this.player.comboStep === 'J3') gain = BALANCE.J3_MOMENTUM_GAIN;
        this.player.addMomentum(gain * hits.length);
        const impacted = enemyTargets.filter((target) => hits.includes(target.id));
        const impactX = impacted.reduce((sum, target) => sum + target.getHurtbox().x + target.getHurtbox().width / 2, 0) / impacted.length;
        const impactY = impacted.reduce((sum, target) => sum + target.getHurtbox().y + target.getHurtbox().height / 2, 0) / impacted.length;
        this.gameFeel.triggerMeleeHit(this.player.comboStep, hits, impactX, impactY);
        this.telemetry.recordMeleeHits(hits.length);
      }
    }

    // (b) Projectiles -> Enemies
    for (const proj of this.projectiles) {
      const pHitbox = proj.getHitbox();
      if (pHitbox) {
        const hits = this.combatSystem.evaluateHitbox(pHitbox, enemyTargets);
        if (hits.length > 0) {
          proj.isExpired = true;
          this.player.addMomentum(BALANCE.TAPE_MOMENTUM_GAIN * hits.length);
          if (proj.appliesStickySlow) this.enemyStatus.applyStickySlow(hits);
          this.gameFeel.triggerProjectileHit(hits, pHitbox.x + pHitbox.width / 2, pHitbox.y + pHitbox.height / 2);
        }
      }
    }

    // (c) Enemies Attacks -> Player
    const playerTarget = {
      id: this.player.id,
      getHurtbox: () => this.player.getHurtbox(),
      takeDamage: (dmg: number, parcelDmg: number, kbX: number, kbY: number, srcX: number) => {
        const damaged = this.player.takeDamage(dmg, kbX, kbY, srcX);
        if (damaged && parcelDmg > 0) {
          const parcelMultiplier = UpgradeSystem.getInstance().getParcelDamageMultiplier();
          const calc = calculateParcelDamage(
            parcelDmg,
            parcelMultiplier,
            this.player.x + this.player.width / 2,
            this.player.facing,
            srcX,
            objective.parcelProfile
          );
          objective.damageParcel(calc.amount);
          this.audio.play('parcel_hit');
          if (parcelMultiplier < 1) {
            this.gameFeel.triggerParcelShield(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height / 2
            );
          }
        }
        if (damaged) {
          this.telemetry.recordDamageTaken();
          this.gameFeel.triggerPlayerDamaged(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
          );
        }
        return damaged;
      },
    };

    for (const proj of this.enemyProjectiles) {
      const hitbox = proj.getHitbox();
      if (!hitbox) continue;
      const hits = this.combatSystem.evaluateHitbox(hitbox, [playerTarget]);
      if (hits.length > 0) proj.expire();
    }

    for (const dog of this.dogs) {
      const dogHitbox = dog.getActiveHitbox();
      if (dogHitbox) {
        this.combatSystem.evaluateHitbox(dogHitbox, [playerTarget]);
      }
    }

    for (const rival of this.rivals) {
      const rivalHitbox = rival.getActiveHitbox();
      if (rivalHitbox) {
        this.combatSystem.evaluateHitbox(rivalHitbox, [playerTarget]);
      }
    }

    for (const thug of this.thugs) {
      const thugHitbox = thug.getActiveHitbox();
      if (thugHitbox) {
        this.combatSystem.evaluateHitbox(thugHitbox, [playerTarget]);
      }
    }

    for (const boss of this.bossDogs) {
      const bossHitbox = boss.getActiveHitbox();
      if (bossHitbox) {
        if (this.player.actionState === 'DODGE') {
          if (CollisionSystem.checkAABB(bossHitbox, this.player.getRect())) {
            if (!this.perfectDodgeHitboxIds.has(bossHitbox.id)) {
              this.perfectDodgeHitboxIds.add(bossHitbox.id);
              if (boss.registerPerfectDodge()) {
                // Consume this concrete attack instance. Without this record,
                // the same dash can hit on the first frame after DODGE ends.
                this.combatSystem.resolveWithoutDamage(bossHitbox.id, this.player.id);
                this.player.addMomentum(20);
                this.audio.play('perfect_dodge');
                this.gameFeel.triggerParcelShield(
                  this.player.x + this.player.width / 2,
                  this.player.y + this.player.height / 2
                );
              }
            }
          }
        }
        this.combatSystem.evaluateHitbox(bossHitbox, [playerTarget]);
      }
    }

    const shake = this.gameFeel.consumeShakeRequest();
    if (shake) this.camera.startShake(shake.intensity, shake.duration);

    // 11. Update Loot System & Pickups
    this.lootSystem.update(dt, this.player, objective);

    // 12. Interaction Check with Customer Chú Tư
    const nearby = InteractionSystem.getNearbyInteractable(this.player.getRect(), [this.customer]);
    if (nearby) {
      if (this.zoneStates['E'] === 'CLEARED') {
        this.nearbyPrompt = nearby.promptText;
        if (input.isJustPressed('interact')) {
          nearby.onInteract();
        }
      } else {
        this.nearbyPrompt = 'Cần đánh bại Chó Đại Ca trước khi giao!';
      }
    } else {
      this.nearbyPrompt = null;
    }

    // 13. Zone & Encounter Label Tracking
    this.updateCurrentZoneAndEncounter();

    // 14. Update Camera
    this.camera.update(this.player.x, this.player.y, this.player.facing, dt);
  }

  private updateEncounterStates(): void {
    const zones: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

    for (const zoneId of zones) {
      const zoneSpawns = STAGE_1_CONFIG.ENEMY_SPAWNS.filter((s) => s.zone === zoneId);
      if (zoneSpawns.length === 0) continue;

      const minTriggerX = Math.min(...zoneSpawns.map((s) => s.triggerX));

      // Check transition to ACTIVE
      if (this.zoneStates[zoneId] === 'NOT_STARTED' && this.player.x >= minTriggerX) {
        this.zoneStates[zoneId] = 'ACTIVE';
        if (zoneId === 'E') this.telemetry.beginBossAttempt();
        this.captureEncounterCheckpoint(zoneId);
        this.startZoneDialogue(zoneId);
      }

      // Check transition to CLEARED: ONLY when every spawn in this zone is present and legitimately defeated
      if (this.zoneStates[zoneId] === 'ACTIVE') {
        let allMandatoryDefeated = true;

        for (const spawn of zoneSpawns) {
          let foundEnemy: { isAlive: boolean; hp: number } | undefined;

          if (spawn.type === 'dog') {
            foundEnemy = this.dogs.find((d) => d.id === spawn.id);
          } else if (spawn.type === 'rival') {
            foundEnemy = this.rivals.find((r) => r.id === spawn.id);
          } else if (spawn.type === 'thug') {
            foundEnemy = this.thugs.find((t) => t.id === spawn.id);
          } else if (spawn.type === 'boss_dog') {
            foundEnemy = this.bossDogs.find((b) => b.id === spawn.id);
          }

          // If enemy hasn't spawned yet or is still alive, cannot clear
          if (!foundEnemy || foundEnemy.isAlive || foundEnemy.hp > 0) {
            allMandatoryDefeated = false;
            break;
          }
        }

        if (allMandatoryDefeated) {
          this.zoneStates[zoneId] = 'CLEARED';
          if (zoneId === 'E') this.telemetry.recordBossDefeated();
          this.audio.play('gate_open');
          if (zoneId === 'E') {
            this.dialogue.start([
              { speaker: 'CHÓ ĐẠI CA', text: 'Gừ… lần này coi như mày thắng, shipper áo cam.', tone: 'boss' },
              { speaker: 'HỘI KHỜ', text: 'Đường giao hàng không thuộc về riêng ai. Tránh ra cho tôi giao đơn.', tone: 'success' },
            ]);
          }
        }
      }
    }
  }

  private startZoneDialogue(zoneId: 'A' | 'B' | 'C' | 'D' | 'E'): void {
    if (this.announcedZones.has(zoneId)) return;
    this.announcedZones.add(zoneId);
    // Regular encounters announce themselves through sound and the existing
    // objective banner, without freezing movement or combat input.
    if (zoneId === 'A' || zoneId === 'B') {
      this.audio.play('dog_bark');
      return;
    }
    if (zoneId === 'C') {
      this.audio.play('rival_taunt');
      return;
    }
    if (zoneId === 'D') {
      this.audio.play('thug_grunt');
      return;
    }
    this.audio.play('boss_growl');
    const bossLines: DialogueLine[] = [
      { speaker: 'CHÓ ĐẠI CA', text: 'GỪỪỪ… Không ai mang hàng qua lãnh địa của tao!', tone: 'boss' },
      { speaker: 'HỆ THỐNG', text: 'BOSS — Đọc vùng cảnh báo, né đòn lao và phản công sau recovery.', tone: 'warning' },
    ];
    this.dialogue.start(bossLines);
  }

  private checkEnemyLootDrop(
    enemyId: string,
    enemyType: 'dog' | 'rival' | 'thug' | 'boss_dog',
    isAlive: boolean,
    x: number,
    y: number
  ): void {
    if (!isAlive && !this.droppedLootEnemyIds.has(enemyId)) {
      this.droppedLootEnemyIds.add(enemyId);
      this.audio.play('enemy_ko');
      this.lootSystem.spawnEnemyLoot(enemyType, x, y);
    }
  }

  private announceEnemyState(enemyId: string, state: string, isBoss: boolean): void {
    const previous = this.lastEnemyStates.get(enemyId);
    if (previous === state) return;
    this.lastEnemyStates.set(enemyId, state);
    if (state.includes('TELEGRAPH')) this.audio.play(isBoss ? 'boss_warning' : 'enemy_warning');
  }

  private updateCurrentZoneAndEncounter(): void {
    if (this.zoneStates.E === 'ACTIVE') {
      this.currentZoneId = 'E'; this.currentZoneName = 'Sân Chó Đại Ca';
      this.currentEncounterName = 'TRÙM: CHÓ ĐẠI CA'; return;
    }
    for (const zone of STAGE_1_CONFIG.ZONES) {
      if (this.player.x >= zone.startX && this.player.x < zone.endX) {
        this.currentZoneId = zone.id;
        this.currentZoneName = zone.name;
        break;
      }
    }

    if (this.currentZoneId === 'A') {
      this.currentEncounterName = this.isZoneCleared('A') ? 'ĐÃ QUA KHU VỰC A' : 'Chó Dữ Hẻm Cầu';
    } else if (this.currentZoneId === 'B') {
      this.currentEncounterName = this.isZoneCleared('B') ? 'ĐÃ QUA KHU VỰC B' : 'Chó Bãi Ve Chai';
    } else if (this.currentZoneId === 'C') {
      this.currentEncounterName = this.isZoneCleared('C') ? 'ĐÃ HẠ SHIPPER ĐỐI THỦ' : 'Shipper Đối Thủ';
    } else if (this.currentZoneId === 'D') {
      this.currentEncounterName = this.isZoneCleared('D') ? 'ĐÃ HẠ ĐẦU GẤU' : 'MINIBOSS: Đầu Gấu';
    } else if (this.currentZoneId === 'E') {
      this.currentEncounterName = this.isZoneCleared('E') ? 'GIAO HÀNG CHO CHÚ TƯ' : 'TRÙM: CHÓ ĐẠI CA';
    }
  }

  public render(renderer: Renderer, _interpolation: number): void {
    const objective = ObjectiveSystem.getInstance();

    const gates = STAGE_1_CONFIG.ZONES.map((z) => ({
      id: z.id,
      gateX: z.gateX,
      isLocked: !this.isZoneCleared(z.id),
    }));

    let objectiveBanner = this.currentEncounterName;
    if (this.isZoneCleared('E')) {
      objectiveBanner = 'Giao hàng cho Chú Tư [ E ]';
    }

    const cueOpacities: Record<string, number> = {};
    for (const [id, cue] of this.hazardCues.entries()) {
      if (cue.timer > 0) {
        cueOpacities[id] = Math.min(1, cue.timer / 0.4);
      }
    }

    renderer.renderStage1Scene(
      this.camera,
      this.player,
      this.customer,
      this.dogs,
      this.rivals,
      this.thugs,
      this.bossDogs,
      this.lootSystem.pickups,
      this.projectiles,
      this.enemyProjectiles,
      gates,
      STAGE_1_CONFIG.GROUND_SEGMENTS,
      STAGE_1_CONFIG.PLATFORMS,
      STAGE_1_CONFIG.HAZARDS,
      STAGE_1_CONFIG.ZONES,
      objective.parcelCondition,
      objective.bonusReward,
      this.nearbyPrompt,
      objectiveBanner,
      this.currentZoneId,
      this.currentEncounterName,
      this.gameFeel.getSnapshot(),
      UpgradeSystem.getInstance().getSnapshot(),
      this.enemyStatus.getSlowedTargetIds(),
      cueOpacities
    );
    renderer.renderDialogueOverlay(this.dialogue.getSnapshot());
  }
}
