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
import { AlleyRat } from '../entities/AlleyRat';
import { SaboteurShipper } from '../entities/SaboteurShipper';
import { AlleyGuard } from '../entities/AlleyGuard';
import { AlleyBrat } from '../entities/AlleyBrat';
import { Renderer, StageHazardOverlay } from '../rendering/Renderer';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { Hitbox } from '../core/types';
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
  private rats: AlleyRat[] = [];
  private saboteurs: SaboteurShipper[] = [];
  private guards: AlleyGuard[] = [];
  private brats: AlleyBrat[] = [];
  private streetNpcs: NPC[] = [];
  private chibaHealed: boolean = false;
  private chubayRefilled: boolean = false;
  private bananaTraps: { id: string; x: number; y: number; timer: number }[] = [];
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

  // Stage 1 Physical Harshness & Alley Friction
  private isParcelDropped = false;
  private droppedParcel: { x: number; y: number; vx: number; vy: number; gnawTimer: number } | null = null;
  private motorbike = { active: false, warning: false, timer: 0, x: 0, y: 550, vx: 0, facing: 'left' as 'left' | 'right', triggeredZones: new Set<string>() };
  private dogClamp = { active: false, dogId: null as string | null, mashRemaining: 0 };
  private waterSplash = { x: 1100, warning: false, active: false, timer: 0 };
  private phoneAlert: { title: string; text: string; timer: number; icon: string } | null = null;
  private stageTimer = 160;
  private triggeredPhoneAlerts = new Set<string>();
  private showCanvaInspector = false;

  // Interaction prompt & progress
  private nearbyPrompt: string | null = null;
  private currentZoneId: string = 'A';
  private currentZoneName: string = 'Hẻm Đầu Cầu';
  private currentEncounterName: string = 'Chó Dữ Hẻm Cầu';

  private showPhoneAlert(title: string, text: string, icon: string): void {
    this.phoneAlert = {
      title,
      text,
      icon,
      timer: 4.5,
    };
  }

  private dropParcel(x: number, y: number, vx: number, vy: number): void {
    this.isParcelDropped = true;
    this.droppedParcel = {
      x,
      y,
      vx,
      vy,
      gnawTimer: 1.0,
    };
    this.audio.play('parcel_hit');
    this.gameFeel.triggerComicText('RƠI HÀNG! [E] ĐỂ NHẶT', x, y - 25, '#f59e0b');
    this.showPhoneAlert('SXP CẢNH BÁO', 'KIỆN HÀNG ĐÃ BỊ RƠI! Nhặt lại ngay trước khi bị cắn nát hoặc cướp mất!', '📦');
  }

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
    this.player.onAirSlamLanded = () => {
      const slamX = this.player.x + this.player.width / 2;
      const slamY = this.player.y + this.player.height;
      this.gameFeel.triggerAirSlam(slamX, slamY);

      // AoE damage & knockdown to nearby enemies
      const slamRadius = 120;
      const allEnemies: (Dog | Rival | Thug | BossDog | AlleyRat | SaboteurShipper | AlleyGuard | AlleyBrat)[] = [
        ...this.dogs,
        ...this.rivals,
        ...this.thugs,
        ...this.bossDogs,
        ...this.rats,
        ...this.saboteurs,
        ...this.guards,
        ...this.brats,
      ];
      for (const enemy of allEnemies) {
        if (!enemy.isAlive) continue;
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        if (Math.abs(ex - slamX) <= slamRadius && Math.abs(ey - slamY) <= 70) {
          const knockDir = ex >= slamX ? 1 : -1;
          const wasShieldBroken = (enemy as any).isShieldBroken;
          enemy.takeDamage(35, 0, knockDir * 240, 150, slamX);
          if (enemy instanceof AlleyGuard && !wasShieldBroken && enemy.isShieldBroken) {
            this.audio.play('enemy_ko');
            this.gameFeel.triggerComicText('VỠ KHIÊN! 💥', enemy.x + 20, enemy.y - 20, '#f97316');
          }
        }
      }
    };
    this.player.onUltimateActivated = () => {
      this.audio.play('ultimate_charge');
      this.gameFeel.triggerUltimateActivation(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2
      );
    };
    this.lootSystem.onPickupCollected = (type) => {
      this.audio.play(pickupSfx(type));
      this.gameFeel.triggerLootCollected(
        this.player.x + this.player.width / 2,
        this.player.y + 10,
        type
      );
    };
  }

  public init(): void {
    // Stage init
  }

  public enter(): void {
    this.enterFreshStage();
  }

  private initStreetEnemies(): void {
    this.rats = [
      new AlleyRat('rat_b1', 980, 580, 'B'),
      new AlleyRat('rat_c1', 1520, 580, 'C'),
    ];
    const sab = new SaboteurShipper('saboteur_c1', 1940, 546, 'C');
    sab.onThrowBananaPeel = (x, y) => {
      this.bananaTraps.push({ id: `peel_${Date.now()}_${Math.random()}`, x, y: 580, timer: 14.0 });
      this.audio.play('enemy_warning');
    };
    this.saboteurs = [sab];
    this.guards = [
      new AlleyGuard('guard_d1', 2360, 538, 'D'),
    ];
    const brat = new AlleyBrat('brat_b1', 1320, 368, 'B');
    brat.onShootWater = (x, y) => {
      this.enemyProjectiles.push(
        new EnemyProjectile(brat.id, x, y, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
      );
      this.audio.play('enemy_warning');
    };
    this.brats = [brat];
    this.bananaTraps = [];

    // Ambient and interactive street NPCs
    this.chibaHealed = false;
    this.chubayRefilled = false;
    this.streetNpcs = [
      new NPC('npc_chiba', 220, 556, 'chiba', 'Chị Ba Nước Mía', 'Uống trà đá Chị Ba (Hồi 25 HP)', () => {
        if (!this.chibaHealed) {
          this.chibaHealed = true;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
          this.audio.play('pickup');
          this.gameFeel.triggerComicText('+25 HP TRÀ ĐÁ ĐƯỜNG 🥤', this.player.x, this.player.y - 25, '#38bdf8');
          this.showPhoneAlert('CHỊ BA NƯỚC MÍA', 'Uống ly trà đá mát rượi lấy sức giao hàng nghen em trai! Miễn phí đó!', '🥤');
        } else {
          this.showPhoneAlert('CHỊ BA NƯỚC MÍA', 'Giao lẹ kẻo trời mưa ướt kiện hàng nghen em trai!', '🥤');
        }
      }),
      new NPC('npc_chubay', 740, 556, 'chubay', 'Chú Bảy Vá Xe', 'Hỏi đường Chú Bảy Bơm Xe', () => {
        if (!this.chubayRefilled) {
          this.chubayRefilled = true;
          this.player.tapeCharges = this.player.maxTapeCharges;
          this.audio.play('parcel_repair');
          this.gameFeel.triggerComicText('+TỐI ĐA BĂNG KEO 📦', this.player.x, this.player.y - 25, '#facc15');
          this.showPhoneAlert('CHÚ BẢY VÁ XE', 'Khúc quẹo này xe Ninja Lead chạy dữ lắm! Nghe tiếng bíp bíp là bấm nhảy lên né liền nghen con!', '🔧');
        } else {
          this.showPhoneAlert('CHÚ BẢY VÁ XE', 'Nhớ chú dặn đó, thấy vũng nước với bãi ve chai thì nhảy qua chứ đừng lao vào!', '🔧');
        }
      }),
      new NPC('npc_banam', 1420, 376, 'banam', 'Bà Năm Ban Công', 'Bà Năm Hóng Chuyện', () => {
        this.showPhoneAlert('BÀ NĂM BAN CÔNG', 'Mấy đứa bay giành đơn đừng có quẹt trúng chậu hoa lan của bà nghen! Thằng kia vừa ném vỏ chuối kìa!', '👵');
      }),
    ];
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
    this.initStreetEnemies();
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

    // Reset hazard states
    this.isParcelDropped = false;
    this.droppedParcel = null;
    this.motorbike = { active: false, warning: false, timer: 0, x: 0, y: 550, vx: 0, facing: 'left', triggeredZones: new Set() };
    this.dogClamp = { active: false, dogId: null, mashRemaining: 0 };
    this.waterSplash = { x: 1100, warning: false, active: false, timer: 0 };
    this.phoneAlert = null;
    this.stageTimer = 160;
    this.triggeredPhoneAlerts.clear();

    // Exploration drops on elevated platforms reward vertical navigation & Air Drop Kick
    this.lootSystem.spawnDrop('PARTS', 985, 432);
    this.lootSystem.spawnDrop('PARCEL_REPAIR', 1760, 412);
    this.lootSystem.spawnDrop('PARTS', 2505, 362);

    this.nearbyPrompt = null;
    this.currentZoneId = 'A';
    this.currentZoneName = 'Hẻm Đầu Cầu';
    this.currentEncounterName = 'Chó Dữ Hẻm Cầu';
    this.updateCurrentZoneAndEncounter();

    // Capture initial checkpoint for Zone A
    this.captureEncounterCheckpoint('A');
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

    // Respawn street enemies according to checkpoint zone
    if (cp.zoneId === 'A') {
      this.initStreetEnemies();
    } else if (cp.zoneId === 'B') {
      this.rats = this.rats.filter((r) => r.zoneId !== 'B');
      this.rats.push(new AlleyRat('rat_b1', 980, 580, 'B'));
      this.brats = this.brats.filter((b) => b.zoneId !== 'B');
      const brat = new AlleyBrat('brat_b1', 1320, 368, 'B');
      brat.onShootWater = (x, y) => {
        this.enemyProjectiles.push(
          new EnemyProjectile(brat.id, x, y, this.player.x + this.player.width / 2, this.player.y + this.player.height / 2)
        );
        this.audio.play('enemy_warning');
      };
      this.brats.push(brat);
    } else if (cp.zoneId === 'C') {
      this.rats = this.rats.filter((r) => r.zoneId !== 'C');
      this.rats.push(new AlleyRat('rat_c1', 1520, 580, 'C'));
      this.saboteurs = this.saboteurs.filter((s) => s.zoneId !== 'C');
      const sab = new SaboteurShipper('saboteur_c1', 1940, 546, 'C');
      sab.onThrowBananaPeel = (x, y) => {
        this.bananaTraps.push({ id: `peel_${Date.now()}_${Math.random()}`, x, y: 580, timer: 14.0 });
        this.audio.play('enemy_warning');
      };
      this.saboteurs.push(sab);
      this.bananaTraps = [];
    } else if (cp.zoneId === 'D') {
      this.guards = this.guards.filter((g) => g.zoneId !== 'D');
      this.guards.push(new AlleyGuard('guard_d1', 2360, 538, 'D'));
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
    this.isParcelDropped = false;
    this.droppedParcel = null;
    this.bananaTraps = [];
    this.dogClamp = { active: false, dogId: null, mashRemaining: 0 };
    this.motorbike.active = false;
    this.motorbike.warning = false;
    this.waterSplash.warning = false;
    this.waterSplash.active = false;
  }

  public getCheckpoint(): EncounterCheckpoint | null {
    return this.checkpoint;
  }

  public exit(): void {
    this.dogs = [];
    this.rivals = [];
    this.thugs = [];
    this.bossDogs = [];
    this.rats = [];
    this.saboteurs = [];
    this.guards = [];
    this.brats = [];
    this.streetNpcs = [];
    this.bananaTraps = [];
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

    if (this.isParcelDropped) {
      this.dialogue.start([
        { speaker: 'CHÚ TƯ', text: 'Ủa thùng hàng đâu rồi con?! Làm rớt dọc đường rồi à? Mau quay lại tìm nhặt [ E ] về đây!', tone: 'warning' },
      ]);
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

    // Toggle Canva UI Inspector modal via P key
    if (typeof input.isKeyJustPressed === 'function' && input.isKeyJustPressed('KeyP')) {
      this.showCanvaInspector = !this.showCanvaInspector;
    }
    if (this.showCanvaInspector) {
      if (input.isJustPressed('cancel') || input.isJustPressed('interact')) {
        this.showCanvaInspector = false;
      }
      return;
    }

    // 0. Delivery Failure checks: Parcel Destroyed (0%) or Time Limit Expired
    if (objective.parcelCondition <= 0) {
      objective.failDelivery(this.player.hp, 'PARCEL_DESTROYED');
      this.sceneManager.switchScene('RESULT');
      return;
    }
    if (objective.state === 'IN_DELIVERY' && !this.dialogue.isActive()) {
      this.stageTimer = Math.max(0, this.stageTimer - dt);
      if (this.stageTimer <= 0) {
        objective.failDelivery(this.player.hp, 'TIME_EXPIRED');
        this.sceneManager.switchScene('RESULT');
        return;
      }
    }

    // Smartphone SMS alerts
    if (this.phoneAlert) {
      this.phoneAlert.timer -= dt;
      if (this.phoneAlert.timer <= 0) this.phoneAlert = null;
    }
    if (!this.triggeredPhoneAlerts.has('f89_intro') && this.stageTimer <= 155) {
      this.triggeredPhoneAlerts.add('f89_intro');
      this.showPhoneAlert('APP NỢ F89', 'LÃI SUẤT HÔM NAY: 15%. Quá hạn phạt 2.000.000đ/ngày. Liệu mà giao đúng giờ!', '🔴');
    } else if (!this.triggeredPhoneAlerts.has('zone_c_rival') && (this.currentZoneId === 'C' || this.player.x > 1500)) {
      this.triggeredPhoneAlerts.add('zone_c_rival');
      this.showPhoneAlert('SXP ĐIỀU PHỐI', 'Cảnh báo: Có shipper đối thủ lượn lờ bãi xe định cướp đơn!', '📦');
    } else if (!this.triggeredPhoneAlerts.has('chutu_rush') && this.stageTimer <= 90) {
      this.triggeredPhoneAlerts.add('chutu_rush');
      this.showPhoneAlert('KHÁCH: CHÚ TƯ', 'Giao tới đâu rồi con? Chú chờ lâu lắm rồi đó, bể đồ là không trả tiền đâu!', '👨');
    } else if (!this.triggeredPhoneAlerts.has('f89_urgent') && this.stageTimer <= 45) {
      this.triggeredPhoneAlerts.add('f89_urgent');
      this.showPhoneAlert('APP NỢ F89', 'CẢNH BÁO: Hạn chót sắp hết! Phí phạt 2 triệu sẽ cộng dồn nợ ngay lập tức!', '⚠️');
    }

    // Dog Clamp QTE
    if (this.dogClamp.active) {
      const clampedDog = this.dogs.find((d) => d.id === this.dogClamp.dogId);
      if (!clampedDog || !clampedDog.isAlive || clampedDog.state === 'KO') {
        this.dogClamp.active = false;
        this.nearbyPrompt = null;
      } else {
        this.player.vx = 0;
        clampedDog.x = this.player.x + (this.player.facing === 'right' ? 18 : -18);
        clampedDog.y = this.player.y + 12;
        this.nearbyPrompt = `[ J ] NHẤN LIÊN TỤC ĐỂ ĐÁ CHÓ! (${this.dogClamp.mashRemaining})`;
        if (input.isJustPressed('attack')) {
          this.dogClamp.mashRemaining--;
          this.audio.play('hit_light');
          this.gameFeel.triggerMeleeHit('J1', [clampedDog.id], this.player.x, this.player.y);
          if (this.dogClamp.mashRemaining <= 0) {
            this.dogClamp.active = false;
            this.nearbyPrompt = null;
            clampedDog.takeDamage(30, 0, this.player.facing === 'right' ? 240 : -240, 150, this.player.x);
            this.audio.play('hit_heavy');
            this.audio.play('dog_bark');
            this.gameFeel.triggerComicText('ĐÁ VĂNG CHÓ! 💥', this.player.x, this.player.y - 25, '#fb923c');
          }
        }
      }
    }

    if (this.dialogue.isActive()) {
      if (
        input.isJustPressed('cancel') ||
        input.isJustPressed('moveLeft') ||
        input.isJustPressed('moveRight') ||
        input.isJustPressed('jump') ||
        input.isJustPressed('dodge')
      ) {
        this.dialogue.skip();
      } else if (
        input.isJustPressed('interact') ||
        input.isJustPressed('attack')
      ) {
        this.dialogue.advance();
      }
      if (this.deliveryPending) {
        this.camera.updateShake(dt);
        return;
      }
    }

    this.telemetry.update(dt);

    // 1. Process Player Controls (buffered seamlessly even during impact hit-stop)
    if (input.isJustPressed('attack')) this.telemetry.recordAction('J');
    if (input.isJustPressed('projectile')) this.telemetry.recordAction('K');
    if (input.isJustPressed('dodge')) this.telemetry.recordAction('L');
    if (input.isJustPressed('ultimate')) this.telemetry.recordAction('Q');
    this.player.handleInput(input);

    let moveAxis = 0;
    if (input.isDown('moveLeft')) moveAxis -= 1;
    if (input.isDown('moveRight')) moveAxis += 1;
    this.player.applyMovementInput(moveAxis, dt);

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

    // 3b. Physical Dropped Parcel Mechanics
    if (this.isParcelDropped && this.droppedParcel) {
      const p = this.droppedParcel;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 650 * dt;
      p.vx *= 0.94;
      if (p.y >= 580) {
        p.y = 580;
        p.vy = 0;
      }

      const dist = Math.hypot(p.x - (this.player.x + this.player.width / 2), p.y - (this.player.y + this.player.height / 2));
      if (dist < 60) {
        this.nearbyPrompt = '[ E ] Nhặt lại kiện hàng!';
        if (input.isJustPressed('interact')) {
          this.isParcelDropped = false;
          this.droppedParcel = null;
          this.audio.play('parcel_repair');
          this.gameFeel.triggerParcelShield(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
          this.nearbyPrompt = null;
          this.showPhoneAlert('SXP GIAO HÀNG', 'Đã bảo quản lại kiện hàng an toàn trên lưng! Tiếp tục giao!', '📦');
        }
      }

      if (this.isParcelDropped && this.droppedParcel) {
        p.gnawTimer -= dt;
        for (const dog of this.dogs) {
          if (!dog.isAlive) continue;
          const dogDist = Math.hypot(dog.x + dog.width / 2 - p.x, dog.y + dog.height / 2 - p.y);
          if (dogDist < 55 && p.gnawTimer <= 0) {
            objective.damageParcel(4);
            p.gnawTimer = 1.2;
            this.audio.play('parcel_hit');
            this.audio.play('dog_bark');
            this.gameFeel.triggerComicText('CHÓ NGOẠM HÀNG! -4%', p.x, p.y - 20, '#ef4444');
            break;
          }
        }

        // Rats gnawing on parcel
        for (const rat of this.rats) {
          if (!rat.isAlive || rat.state === 'KO') continue;
          const ratDist = Math.hypot(rat.x + rat.width / 2 - p.x, rat.y + rat.height / 2 - p.y);
          if (ratDist < 50 && p.gnawTimer <= 0) {
            objective.damageParcel(3);
            p.gnawTimer = 1.0;
            this.audio.play('parcel_hit');
            this.gameFeel.triggerComicText('CHUỘT GẶM HÀNG! -3%', p.x, p.y - 20, '#ef4444');
            break;
          }
        }

        // Saboteurs kicking parcel away
        for (const sab of this.saboteurs) {
          if (!sab.isAlive || sab.state === 'KO') continue;
          const sabDist = Math.hypot(sab.x + sab.width / 2 - p.x, sab.y + sab.height / 2 - p.y);
          if (sabDist < 55 && Math.abs(p.vx) < 50) {
            p.vx = sab.facing === 'left' ? -200 : 200;
            p.vy = -140;
            objective.damageParcel(2);
            this.audio.play('parcel_hit');
            this.gameFeel.triggerComicText('GIAN THƯƠNG ĐÁ HÀNG!', p.x, p.y - 22, '#f97316');
            break;
          }
        }
      }
    }

    // 3c. Dynamic Motorbike Rush (Xe Ninja Lead)
    if (!this.motorbike.triggeredZones.has('B') && this.player.x >= 1220 && this.player.x <= 1320) {
      this.motorbike.triggeredZones.add('B');
      this.motorbike.warning = true;
      this.motorbike.timer = 1.8;
      this.motorbike.x = this.player.x + 380;
      this.motorbike.facing = 'left';
      this.motorbike.vx = -620;
      this.audio.play('boss_warning');
    }
    if (!this.motorbike.triggeredZones.has('D') && this.player.x >= 2440 && this.player.x <= 2560) {
      this.motorbike.triggeredZones.add('D');
      this.motorbike.warning = true;
      this.motorbike.timer = 1.8;
      this.motorbike.x = this.player.x + 420;
      this.motorbike.facing = 'left';
      this.motorbike.vx = -650;
      this.audio.play('boss_warning');
    }

    if (this.motorbike.warning) {
      this.motorbike.timer -= dt;
      if (this.motorbike.timer <= 0) {
        this.motorbike.warning = false;
        this.motorbike.active = true;
        this.audio.play('hit_heavy');
      }
    } else if (this.motorbike.active) {
      this.motorbike.x += this.motorbike.vx * dt;
      const isVisibleOnScreen =
        this.motorbike.x >= this.camera.x - 50 &&
        this.motorbike.x <= this.camera.x + this.camera.width + 50;

      if (isVisibleOnScreen) {
        const pCenterX = this.player.x + this.player.width / 2;
        const mbDist = Math.abs(pCenterX - this.motorbike.x);
        const playerFeetY = this.player.y + this.player.height;
        // Collision strictly matches visible vehicle body and height (jump over is safe!)
        const isBodyIntersecting = mbDist < 56 && playerFeetY > 545;

        if (isBodyIntersecting && this.player.actionState !== 'DODGE') {
          this.player.takeDamage(18, -320, 220, this.motorbike.x);
          this.audio.play('hit_heavy');
          this.gameFeel.triggerPlayerDamaged(this.player.x, this.player.y);
          this.gameFeel.triggerComicText('ĐÂM XE LEAD! -18 HP', this.player.x, this.player.y - 30, '#ef4444');
          if (!this.isParcelDropped) {
            this.dropParcel(this.player.x, this.player.y - 10, -180, -220);
          }
        }

        const allEnemies = [...this.dogs, ...this.rivals, ...this.thugs, ...this.bossDogs];
        for (const e of allEnemies) {
          if (!e.isAlive) continue;
          if (Math.abs(e.x + e.width / 2 - this.motorbike.x) < 45) {
            e.takeDamage(30, 0, -280, 180, this.motorbike.x);
          }
        }
      }

      if (this.motorbike.x < this.camera.x - 220 || this.motorbike.x > this.camera.x + this.camera.width + 220) {
        this.motorbike.active = false;
      }
    }

    // 3d. Dynamic Balcony Water Splash (Zone C laundry balcony only)
    this.waterSplash.timer -= dt;
    if (this.waterSplash.timer <= 0) {
      if (!this.waterSplash.warning && !this.waterSplash.active) {
        if (this.player.x >= 1520 && this.player.x <= 1680) {
          this.waterSplash.warning = true;
          this.waterSplash.timer = 1.4;
          this.waterSplash.x = this.player.x + 90;
        } else {
          this.waterSplash.timer = 4;
        }
      } else if (this.waterSplash.warning) {
        this.waterSplash.warning = false;
        this.waterSplash.active = true;
        this.waterSplash.timer = 0.8;
        this.audio.play('land');
      } else if (this.waterSplash.active) {
        if (Math.abs(this.player.x + this.player.width / 2 - this.waterSplash.x) < 48 && this.player.isGrounded) {
          objective.damageParcel(6);
          this.audio.play('parcel_hit');
          this.gameFeel.triggerComicText('NƯỚC TẠT ƯỚT HÀNG! -6%', this.player.x, this.player.y - 25, '#38bdf8');
        }
        this.waterSplash.active = false;
        this.waterSplash.timer = 15;
      }
    }

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

    // 8b. Update Banana Peel Traps
    for (let i = this.bananaTraps.length - 1; i >= 0; i--) {
      const trap = this.bananaTraps[i];
      trap.timer -= dt;
      if (trap.timer <= 0) {
        this.bananaTraps.splice(i, 1);
        continue;
      }
      const playerRect = this.player.getRect();
      const trapRect = { x: trap.x - 14, y: trap.y - 12, width: 28, height: 16 };
      if (CollisionSystem.checkAABB(playerRect, trapRect)) {
        this.player.applySlip(0.85);
        if (!this.isParcelDropped) {
          this.dropParcel(this.player.x, this.player.y + 10, -120, -180);
        }
        this.audio.play('player_hurt');
        this.gameFeel.triggerComicText('TRƯỢT VỎ CHUỐI! 🍌💨', this.player.x, this.player.y - 25, '#fde047');
        this.camera.startShake(3, 0.2);
        this.bananaTraps.splice(i, 1);
      }
    }

    // 8c. Update Alley Rats (AI + Physics + Hazard Safety)
    for (const rat of this.rats) {
      if (!rat.isAlive && rat.state !== 'KO') continue;
      const prevRatY = rat.y;
      rat.updateAI(
        dt,
        this.player.x,
        this.player.y,
        this.droppedParcel,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      rat.x += rat.vx * dt * this.enemyStatus.getMovementMultiplier(rat.id);
      rat.y += rat.vy * dt;
      CollisionSystem.resolveHorizontal(rat, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        rat,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevRatY
      );
      rat.update(dt);

      if (rat.isAlive && rat.state !== 'KO') {
        const outOfBounds = rat.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (outOfBounds) {
          rat.x = rat.zoneId === 'B' ? 1060 : 1650;
          rat.y = 580;
          rat.vx = 0;
          rat.vy = 0;
          rat.state = 'IDLE';
          rat.isGrounded = true;
        }
      }
      this.checkEnemyLootDrop(rat.id, 'dog', rat.isAlive, rat.x, rat.y);
    }

    // 8d. Update Saboteur Shippers (AI + Physics + Hazard Safety)
    for (const sab of this.saboteurs) {
      if (!sab.isAlive && sab.state !== 'KO') continue;
      const prevSabY = sab.y;
      sab.updateAI(
        dt,
        this.player.x,
        this.player.y,
        this.droppedParcel,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      sab.x += sab.vx * dt * this.enemyStatus.getMovementMultiplier(sab.id);
      sab.y += sab.vy * dt;
      CollisionSystem.resolveHorizontal(sab, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        sab,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevSabY
      );
      sab.update(dt);

      if (sab.isAlive && sab.state !== 'KO') {
        const outOfBounds = sab.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (outOfBounds) {
          sab.x = 1840;
          sab.y = 546;
          sab.vx = 0;
          sab.vy = 0;
          sab.state = 'IDLE';
          sab.isGrounded = true;
        }
      }
      this.checkEnemyLootDrop(sab.id, 'rival', sab.isAlive, sab.x, sab.y);
    }

    // 8e. Update Alley Guards (AI + Physics + Hazard Safety)
    for (const guard of this.guards) {
      if (!guard.isAlive && guard.state !== 'KO') continue;
      const prevGuardY = guard.y;
      guard.updateAI(
        dt,
        this.player.x,
        this.player.y,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      guard.x += guard.vx * dt * this.enemyStatus.getMovementMultiplier(guard.id);
      guard.y += guard.vy * dt;
      CollisionSystem.resolveHorizontal(guard, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        guard,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevGuardY
      );
      guard.update(dt);

      if (guard.isAlive && guard.state !== 'KO') {
        const outOfBounds = guard.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (outOfBounds) {
          guard.x = 2440;
          guard.y = 538;
          guard.vx = 0;
          guard.vy = 0;
          guard.state = 'IDLE';
          guard.isGrounded = true;
        }
      }
      this.checkEnemyLootDrop(guard.id, 'thug', guard.isAlive, guard.x, guard.y);
    }

    // 8f. Update Alley Brats
    for (const brat of this.brats) {
      if (!brat.isAlive && brat.state !== 'KO') continue;
      brat.updateAI(
        dt,
        this.player.x,
        this.player.y,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        STAGE_1_CONFIG.HAZARDS
      );
      this.announceEnemyState(brat.id, brat.state, false);

      const prevBratY = brat.y;
      brat.y += brat.vy * dt;
      CollisionSystem.resolveHorizontal(brat, STAGE_1_CONFIG.WORLD_WIDTH);
      CollisionSystem.resolveVertical(
        brat,
        STAGE_1_CONFIG.PLATFORMS,
        STAGE_1_CONFIG.GROUND_SEGMENTS,
        prevBratY
      );
      brat.update(dt);

      if (brat.isAlive && brat.state !== 'KO') {
        const outOfBounds = brat.y > STAGE_1_CONFIG.WORLD_HEIGHT - 60;
        if (outOfBounds) {
          brat.x = 1180;
          brat.y = 442;
          brat.vx = 0;
          brat.vy = 0;
          brat.state = 'IDLE';
          brat.isGrounded = true;
        }
      }
      this.checkEnemyLootDrop(brat.id, 'rival', brat.isAlive, brat.x, brat.y);
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
      ...this.rats.filter((r) => r.isAlive),
      ...this.saboteurs.filter((s) => s.isAlive),
      ...this.guards.filter((g) => g.isAlive),
      ...this.brats.filter((b) => b.isAlive),
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

        for (const guard of this.guards) {
          if (hits.includes(guard.id) && guard.state === 'GUARD_STANCE' && !guard.isShieldBroken) {
            this.audio.play('hit_medium');
            this.gameFeel.triggerComicText('CHẮN KHIÊN! 🛡️', guard.x + 20, guard.y - 18, '#38bdf8');
          }
        }
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

          // Heavy hit causes physical parcel drop!
          if (!this.isParcelDropped && (dmg >= 12 || Math.abs(kbX) >= 160)) {
            const dropDir = srcX < this.player.x ? 1 : -1;
            this.dropParcel(this.player.x, this.player.y + 10, dropDir * 140, -180);
          }
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

    const tryPerfectDodge = (hitbox: Hitbox, onEvaded?: () => void): boolean => {
      if (this.player.actionState === 'DODGE') {
        if (CollisionSystem.checkAABB(hitbox, this.player.getRect())) {
          if (!this.perfectDodgeHitboxIds.has(hitbox.id)) {
            this.perfectDodgeHitboxIds.add(hitbox.id);
            this.combatSystem.resolveWithoutDamage(hitbox.id, this.player.id);
            this.player.addMomentum(25);
            this.player.tapeCharges = Math.min(this.player.maxTapeCharges, this.player.tapeCharges + 1);
            this.gameFeel.triggerPerfectDodge(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height / 2
            );
            onEvaded?.();
            return true;
          }
        }
      }
      return false;
    };

    for (const dog of this.dogs) {
      const dogHitbox = dog.getActiveHitbox();
      if (dogHitbox) {
        if (!tryPerfectDodge(dogHitbox)) {
          const hits = this.combatSystem.evaluateHitbox(dogHitbox, [playerTarget]);
          if (hits.length > 0 && !this.dogClamp.active && dog.isAlive && Math.random() < 0.18) {
            this.dogClamp.active = true;
            this.dogClamp.dogId = dog.id;
            this.dogClamp.mashRemaining = 2;
            this.gameFeel.triggerComicText('CHÓ CẮN CHÂN!', this.player.x, this.player.y - 20, '#ef4444');
          }
        }
      }
    }

    for (const rival of this.rivals) {
      const rivalHitbox = rival.getActiveHitbox();
      if (rivalHitbox) {
        if (!tryPerfectDodge(rivalHitbox)) {
          this.combatSystem.evaluateHitbox(rivalHitbox, [playerTarget]);
        }
      }
    }

    for (const thug of this.thugs) {
      const thugHitbox = thug.getActiveHitbox();
      if (thugHitbox) {
        if (!tryPerfectDodge(thugHitbox)) {
          this.combatSystem.evaluateHitbox(thugHitbox, [playerTarget]);
        }
      }
    }

    for (const boss of this.bossDogs) {
      const bossHitbox = boss.getActiveHitbox();
      if (bossHitbox) {
        const dodged = tryPerfectDodge(bossHitbox, () => {
          boss.registerPerfectDodge();
        });
        if (!dodged) {
          this.combatSystem.evaluateHitbox(bossHitbox, [playerTarget]);
        }
      }
    }

    for (const rat of this.rats) {
      const ratHitbox = rat.getActiveHitbox();
      if (ratHitbox) {
        if (!tryPerfectDodge(ratHitbox)) {
          this.combatSystem.evaluateHitbox(ratHitbox, [playerTarget]);
        }
      }
    }

    for (const sab of this.saboteurs) {
      const sabHitbox = sab.getActiveHitbox();
      if (sabHitbox) {
        if (!tryPerfectDodge(sabHitbox)) {
          this.combatSystem.evaluateHitbox(sabHitbox, [playerTarget]);
        }
      }
    }

    for (const guard of this.guards) {
      const guardHitbox = guard.getActiveHitbox();
      if (guardHitbox) {
        if (!tryPerfectDodge(guardHitbox)) {
          const hits = this.combatSystem.evaluateHitbox(guardHitbox, [playerTarget]);
          if (hits.length > 0 && guard.state === 'MEGAPHONE_BLAST') {
            this.camera.startShake(4, 0.25);
          }
        }
      }
    }

    const shake = this.gameFeel.consumeShakeRequest ? this.gameFeel.consumeShakeRequest() : null;
    if (shake) this.camera.startShake(shake.intensity, shake.duration);

    // 11. Update Loot System & Pickups
    this.lootSystem.update(dt, this.player, objective);

    // 12. Interaction Check with Customer Chú Tư and Street NPCs
    const interactables = [...this.streetNpcs, this.customer];
    const nearby = InteractionSystem.getNearbyInteractable(this.player.getRect(), interactables);
    if (nearby) {
      if (nearby.id === this.customer.id) {
        if (this.isParcelDropped) {
          this.nearbyPrompt = 'Mất kiện hàng rồi! Hãy quay lại tìm nhặt [ E ]';
        } else if (this.zoneStates['E'] === 'CLEARED') {
          this.nearbyPrompt = nearby.promptText;
          if (input.isJustPressed('interact')) {
            nearby.onInteract();
          }
        } else {
          this.nearbyPrompt = 'Cần đánh bại Chó Đại Ca trước khi giao!';
        }
      } else {
        this.nearbyPrompt = nearby.promptText;
        if (input.isJustPressed('interact')) {
          nearby.onInteract();
        }
      }
    } else if (!this.nearbyPrompt?.includes('Nhặt lại') && !this.nearbyPrompt?.includes('ĐÁ CHÓ') && !this.nearbyPrompt?.includes('SPACE')) {
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
          const zoneRatsAlive = this.rats.some((r) => r.zoneId === zoneId && r.isAlive && r.hp > 0);
          const zoneSaboteursAlive = this.saboteurs.some((s) => s.zoneId === zoneId && s.isAlive && s.hp > 0);
          const zoneGuardsAlive = this.guards.some((g) => g.zoneId === zoneId && g.isAlive && g.hp > 0);
          const zoneBratsAlive = this.brats.some((b) => b.zoneId === zoneId && b.isAlive && b.hp > 0);
          if (zoneRatsAlive || zoneSaboteursAlive || zoneGuardsAlive || zoneBratsAlive) {
            allMandatoryDefeated = false;
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

    const stageHazards: StageHazardOverlay = {
      droppedParcel: this.isParcelDropped && this.droppedParcel ? { x: this.droppedParcel.x, y: this.droppedParcel.y, condition: objective.parcelCondition } : null,
      motorbike: (this.motorbike.active || this.motorbike.warning) ? {
        active: this.motorbike.active,
        warning: this.motorbike.warning,
        x: this.motorbike.x,
        y: this.motorbike.y,
        facing: this.motorbike.facing,
        timer: this.motorbike.timer,
      } : null,
      dogClamp: this.dogClamp.active ? { active: true, mashRemaining: this.dogClamp.mashRemaining } : null,
      waterSplash: (this.waterSplash.warning || this.waterSplash.active) ? {
        x: this.waterSplash.x,
        warning: this.waterSplash.warning,
        active: this.waterSplash.active,
      } : null,
      phoneAlert: this.phoneAlert,
      stageTimer: this.stageTimer,
      rats: this.rats,
      saboteurs: this.saboteurs,
      guards: this.guards,
      brats: this.brats,
      streetNpcs: this.streetNpcs,
      bananaTraps: this.bananaTraps,
    };

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
      cueOpacities,
      stageHazards
    );
    renderer.renderDialogueOverlay(this.dialogue.getSnapshot());

    if (this.showCanvaInspector) {
      renderer.renderDeliveryInspectorModal(
        Math.round(objective.parcelCondition),
        this.player.hp,
        this.player.maxHp,
        this.player.tapeCharges,
        this.player.maxTapeCharges,
        20_000_000
      );
    }
  }
}
