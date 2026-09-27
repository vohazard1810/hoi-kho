import { BALANCE } from '../config/balance';
import { Camera } from '../core/Camera';
import { Input } from '../core/Input';
import { SceneManager } from '../core/SceneManager';
import { Rect } from '../core/types';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { Renderer } from '../rendering/Renderer';
import { CollisionSystem } from '../systems/CollisionSystem';
import { Interactable, InteractionSystem } from '../systems/InteractionSystem';
import { ObjectiveSystem } from '../systems/ObjectiveSystem';
import { Scene } from './Scene';
import { UpgradeId, UpgradeSystem } from '../systems/UpgradeSystem';
import { AudioManager, meleeSwingSfx } from '../audio/AudioManager';
import { GridDirection, moveGridSelection } from '../core/GridNavigation';
import { DialogueSystem } from '../systems/DialogueSystem';
import { HubTutorialSystem } from '../systems/HubTutorialSystem';
import { EconomySystem } from '../systems/EconomySystem';

export class HubScene implements Scene {
  public name: string = 'HUB';

  private sceneManager: SceneManager;
  private camera: Camera;
  private player: Player;
  private coba: NPC;
  private hubExitDoor: Interactable;
  private toolBench: Interactable;
  private jobBoard: Interactable;
  private groundSegments: Rect[] = [];

  // Interaction prompt
  private nearbyPrompt: string | null = null;
  private isUpgradePanelOpen: boolean = false;
  private selectedUpgradeIndex: number = 0;
  private dialogue = new DialogueSystem();
  private tutorial = HubTutorialSystem.getInstance();
  private tutorialCompletionDialogueShown = false;
  private tutorialIntroDialogue = false;
  private upgradeNotice: { id: UpgradeId; kind: 'PURCHASED' | 'EQUIPPED'; timer: number } | null = null;
  private isDayRecapOpen = false;
  private isJobBoardOpen = false;
  private selectedJobIndex = 0;
  private jobBoardNotice: { text: string; timer: number } | null = null;
  private lastRecappedDeliveryCount = 0;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.camera = new Camera(1280, 720);
    this.player = new Player(180, 556);

    // Bind Player Audio in Hub
    this.player.onShootProjectile = () => {
      AudioManager.getInstance().play('throw_tape');
      this.tutorial.recordAction('PROJECTILE');
    };
    this.player.onMeleeStarted = (step) => { AudioManager.getInstance().play(meleeSwingSfx(step)); if (step === 'J1') this.tutorial.recordAction('ATTACK'); };
    this.player.onDodgeStarted = () => { AudioManager.getInstance().play('dodge'); this.tutorial.recordAction('DODGE'); };
    this.player.onFootstep = () => AudioManager.getInstance().play('footstep');
    this.player.onJumpStarted = () => AudioManager.getInstance().play('jump');
    this.player.onLanded = () => AudioManager.getInstance().play('land');
    this.player.onUltimateActivated = () => { AudioManager.getInstance().play('ultimate_charge'); this.tutorial.recordAction('ULTIMATE'); };

    this.coba = new NPC(
      'npc_coba',
      680,
      556,
      'coba',
      'Cô Ba (SXP Hub)',
      'Gặp Cô Ba để nhận đơn hàng',
      () => this.onInteractWithCoBa()
    );

    this.hubExitDoor = {
      id: 'hub_exit_door',
      name: 'Cửa Ra Hẻm',
      promptText: 'Xuất phát đi Hẻm Không Lối Thoát',
      x: 1160,
      y: 470,
      width: 90,
      height: 150,
      onInteract: () => this.onInteractWithHubExit(),
    };

    this.toolBench = {
      id: 'tool_bench',
      name: 'Bàn Đồ Nghề',
      promptText: 'Mở Bàn Đồ Nghề (Nâng cấp & Trang bị) [E]',
      x: 150,
      y: 460,
      width: 260,
      height: 160,
      onInteract: () => {
        this.isUpgradePanelOpen = true;
        AudioManager.getInstance().play('pickup');
      },
    };

    this.jobBoard = {
      id: 'job_board',
      name: 'Bảng Đơn SXP',
      promptText: 'Xem Bảng Đơn Hàng [E]',
      x: 790,
      y: 455,
      width: 170,
      height: 165,
      onInteract: () => {
        this.isJobBoardOpen = true;
        this.selectedJobIndex = 0;
        AudioManager.getInstance().play('pickup');
      },
    };

    this.groundSegments = [{ x: 0, y: 620, width: 1280, height: 100 }];
  }

  public init(): void {
    // Hub initialization
  }

  public enter(): void {
    const objective = ObjectiveSystem.getInstance();
    objective.reset();

    this.player.reset(180, 556);
    this.camera.setPosition(0, 0);
    this.nearbyPrompt = null;
    this.isUpgradePanelOpen = false;
    this.selectedUpgradeIndex = 0;
    this.dialogue.reset();
    this.upgradeNotice = null;
    this.isJobBoardOpen = false;
    this.selectedJobIndex = 0;
    this.jobBoardNotice = null;
    this.tutorialCompletionDialogueShown = false;
    this.tutorialIntroDialogue = false;
    const completed = EconomySystem.getInstance().getSnapshot().deliveriesCompleted;
    this.isDayRecapOpen = completed > this.lastRecappedDeliveryCount;
    if (this.isDayRecapOpen) this.lastRecappedDeliveryCount = completed;
  }

  public exit(): void {
    this.nearbyPrompt = null;
    this.isUpgradePanelOpen = false;
    this.isDayRecapOpen = false;
    this.isJobBoardOpen = false;
    this.dialogue.reset();
    this.tutorialIntroDialogue = false;
  }

  private onInteractWithCoBa(): void {
    if (!this.tutorial.isCompleted() && !this.tutorial.isActive()) {
      this.tutorialIntroDialogue = true;
      this.dialogue.start([
        { speaker: 'CÔ BA', text: 'Trước khi nhận đơn, để cô coi tay chân con có lanh không. Tập ngay trong trạm, không mất máu, không hư kiện.', tone: 'neutral' },
        { speaker: 'CÔ BA', text: 'Làm theo bảng hướng dẫn. Không cần thì bấm Esc để bỏ qua buổi tập.', tone: 'warning' },
      ], () => { this.tutorialIntroDialogue = false; this.tutorial.start(this.player); });
      return;
    }
    const objective = ObjectiveSystem.getInstance();
    if (EconomySystem.getInstance().getSnapshot().deliveriesCompleted > 0 && objective.state === 'NO_ORDER') {
      this.dialogue.start([
        { speaker: 'CÔ BA', text: 'Ca đầu coi vậy mà qua được. Tiền đã trừ thẳng vào nợ rồi đó.', tone: 'success' },
        { speaker: 'CÔ BA', text: 'Hẻm cũ vẫn nhận giao lại. Còn đơn Chung Cư Mưa Đêm đang chờ SXP duyệt tuyến.', tone: 'warning' },
      ], () => { this.isJobBoardOpen = true; this.selectedJobIndex = 0; });
      return;
    }
    if (objective.state === 'NO_ORDER') {
      this.dialogue.start([
        { speaker: 'CÔ BA', text: 'Khờ, còn một đơn cuối. Địa chỉ nằm sâu trong Hẻm Không Lối Thoát.', tone: 'warning' },
        { speaker: 'HỘI KHỜ', text: 'Tên hẻm nghe không lành chút nào… nhưng tiền công đủ trả một phần tiền thuốc.', tone: 'neutral' },
        { speaker: 'CÔ BA', text: 'Giữ kiện hàng nguyên vẹn. Nếu thấy nguy hiểm thì né trước, giao sau.', tone: 'warning' },
      ], () => {
        objective.offerOrder();
        AudioManager.getInstance().play('pickup');
      });
    }
  }

  private onInteractWithHubExit(): void {
    const objective = ObjectiveSystem.getInstance();
    if (objective.state === 'ORDER_ACCEPTED') {
      objective.startDelivery();
      AudioManager.getInstance().play('gate_open');
      this.sceneManager.switchScene('STAGE_1');
    }
  }

  public update(dt: number, input: Input): void {
    const objective = ObjectiveSystem.getInstance();
    if (this.jobBoardNotice) {
      this.jobBoardNotice.timer -= dt;
      if (this.jobBoardNotice.timer <= 0) this.jobBoardNotice = null;
    }
    if (this.upgradeNotice) {
      this.upgradeNotice.timer -= dt;
      if (this.upgradeNotice.timer <= 0) this.upgradeNotice = null;
    }

    if (this.dialogue.isActive()) {
      if (input.isJustPressed('cancel') && this.tutorialIntroDialogue) {
        this.dialogue.reset();
        this.tutorialIntroDialogue = false;
        this.tutorial.skip();
        this.dialogue.start([{ speaker: 'CÔ BA', text: 'Được, mình bỏ qua buổi tập. Khi nào cần thì xem lại bảng hướng dẫn.', tone: 'neutral' }]);
      } else if (input.isJustPressed('cancel')) this.dialogue.skip();
      else if (input.isJustPressed('interact') || input.isJustPressed('attack') || input.isJustPressed('jump')) this.dialogue.advance();
      return;
    }

    if (this.isDayRecapOpen) {
      if (input.isJustPressed('interact') || input.isJustPressed('attack') || input.isJustPressed('jump')) {
        this.isDayRecapOpen = false;
        this.isJobBoardOpen = true;
        this.selectedJobIndex = 0;
        AudioManager.getInstance().play('order_complete');
      }
      return;
    }

    if (this.isJobBoardOpen) {
      if (input.isJustPressed('moveLeft') || input.isJustPressed('uiUp')) this.selectedJobIndex = 0;
      if (input.isJustPressed('moveRight') || input.isJustPressed('uiDown')) this.selectedJobIndex = 1;
      if (input.isJustPressed('interact') || input.isJustPressed('attack')) {
        if (this.selectedJobIndex === 0) {
          this.isJobBoardOpen = false;
          objective.offerOrder();
          AudioManager.getInstance().play('pickup');
        } else {
          this.jobBoardNotice = { text: 'STAGE 2 • Chung Cư Cũ Mưa Đêm đang được chuẩn bị.', timer: 1.8 };
          AudioManager.getInstance().play('enemy_warning');
        }
      }
      if (input.isJustPressed('cancel')) this.isJobBoardOpen = false;
      return;
    }

    if (this.tutorial.isActive() && input.isJustPressed('cancel')) {
      this.tutorial.skip();
      this.dialogue.start([{ speaker: 'CÔ BA', text: 'Được, mình bỏ qua buổi tập. Khi nào cần thì xem lại bảng hướng dẫn.', tone: 'neutral' }]);
      return;
    }

    if (this.isUpgradePanelOpen) {
      const upgrades = UpgradeSystem.getInstance();
      const definitions = upgrades.getSnapshot().definitions;
      const count = definitions.length;

      let direction: GridDirection | null = null;
      if (input.isJustPressed('moveLeft')) direction = 'left';
      else if (input.isJustPressed('moveRight')) direction = 'right';
      else if (input.isJustPressed('uiUp')) direction = 'up';
      else if (input.isJustPressed('uiDown')) direction = 'down';

      if (direction) {
        const nextIndex = moveGridSelection(this.selectedUpgradeIndex, direction, count, 2);
        if (nextIndex !== this.selectedUpgradeIndex) {
          this.selectedUpgradeIndex = nextIndex;
          AudioManager.getInstance().play('hit_light');
        }
      }
      if (input.isJustPressed('interact') || input.isJustPressed('attack')) {
        const id = definitions[this.selectedUpgradeIndex].id as UpgradeId;
        const wasOwned = upgrades.has(id);
        const success = upgrades.purchaseOrEquip(id);
        if (success) {
          AudioManager.getInstance().play('pickup');
          this.upgradeNotice = { id, kind: wasOwned ? 'EQUIPPED' : 'PURCHASED', timer: 1.15 };
        }
      }
      if (input.isJustPressed('cancel')) {
        this.isUpgradePanelOpen = false;
      }
      return;
    }

    // If the Order Panel modal is currently open:
    if (objective.state === 'ORDER_OFFERED') {
      // E = Accept Order
      if (input.isJustPressed('interact')) {
        objective.acceptOrder();
        AudioManager.getInstance().play('order_complete');
      }
      // Esc = Cancel
      else if (input.isJustPressed('cancel')) {
        objective.cancelOffer();
      }
      return;
    }

    // 1. Process Player Input
    this.player.handleInput(input);

    let moveAxis = 0;
    if (input.isDown('moveLeft')) moveAxis -= 1;
    if (input.isDown('moveRight')) moveAxis += 1;
    this.player.applyMovementInput(moveAxis, dt);

    // 2. Physics & Collision Resolution
    const prevY = this.player.y;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    CollisionSystem.resolveHorizontal(this.player, 1280);
    CollisionSystem.resolveVertical(this.player, [], this.groundSegments, prevY);

    this.player.update(dt);

    const tutorialJustCompleted = this.tutorial.observe(dt, input, this.player);
    if (tutorialJustCompleted && !this.tutorialCompletionDialogueShown) {
      this.tutorialCompletionDialogueShown = true;
      this.dialogue.start([
        { speaker: 'CÔ BA', text: 'Ổn rồi đó Khờ. Nhớ né trước khi ham đánh, giữ kiện còn quan trọng hơn giữ sĩ diện.', tone: 'success' },
        { speaker: 'HỘI KHỜ', text: 'Dạ. Con sẵn sàng nhận đơn đầu tiên.', tone: 'success' },
      ]);
      return;
    }

    if (this.tutorial.isActive()) {
      this.nearbyPrompt = null;
      this.camera.update(this.player.x, this.player.y, this.player.facing, dt);
      return;
    }

    // 3. Dynamic Prompt Text Updates
    if (!this.tutorial.isCompleted()) {
      this.coba.promptText = 'Bắt đầu hướng dẫn với Cô Ba [E]';
      this.hubExitDoor.promptText = 'Cửa ra Hẻm (Cần hoàn thành hoặc bỏ qua hướng dẫn)';
    } else if (objective.state === 'NO_ORDER') {
      this.coba.promptText = EconomySystem.getInstance().getSnapshot().deliveriesCompleted > 0
        ? 'Hỏi Cô Ba về đơn tiếp theo [E]'
        : 'Nói chuyện với Cô Ba [E]';
      this.hubExitDoor.promptText = 'Cửa ra Hẻm (Cần gặp Cô Ba nhận đơn trước)';
    } else if (objective.state === 'ORDER_ACCEPTED') {
      this.coba.promptText = 'Cô Ba: "Giao cẩn thận nha em!"';
      this.hubExitDoor.promptText = 'Xuất phát đi Hẻm Không Lối Thoát [E]';
    }

    // 4. Interaction Check
    const interactables: Interactable[] = [this.coba, this.toolBench, this.hubExitDoor];
    if (EconomySystem.getInstance().getSnapshot().deliveriesCompleted > 0) interactables.push(this.jobBoard);
    const nearby = InteractionSystem.getNearbyInteractable(this.player.getRect(), interactables);

    if (nearby) {
      this.nearbyPrompt = nearby.promptText;
      if (input.isJustPressed('interact')) {
        nearby.onInteract();
      }
    } else {
      this.nearbyPrompt = null;
    }

    // 5. Camera follow
    this.camera.update(this.player.x, this.player.y, this.player.facing, dt);
  }

  public render(renderer: Renderer, _interpolation: number): void {
    const objective = ObjectiveSystem.getInstance();

    const economy = EconomySystem.getInstance().getSnapshot();
    let objectiveText = economy.deliveriesCompleted > 0
      ? 'MỤC TIÊU: Xem Bảng Đơn SXP cho ca tiếp theo'
      : 'Nhiệm vụ: Lại gặp Cô Ba để nhận đơn hàng';
    if (objective.state === 'ORDER_OFFERED') {
      objectiveText = 'Xem chi tiết đơn hàng #SXP-8924';
    } else if (objective.state === 'ORDER_ACCEPTED') {
      objectiveText = 'Ra cửa để bắt đầu giao hàng.';
    }

    renderer.renderHubScene(
      this.camera,
      this.player,
      this.coba,
      this.nearbyPrompt,
      objective.state === 'ORDER_ACCEPTED',
      objective.state === 'ORDER_OFFERED',
      UpgradeSystem.getInstance().getSnapshot(),
      this.isUpgradePanelOpen,
      this.selectedUpgradeIndex,
      this.upgradeNotice,
      this.tutorial.getSnapshot(),
      undefined,
      {
        economy,
        dayRecapOpen: this.isDayRecapOpen,
        jobBoardOpen: this.isJobBoardOpen,
        selectedJobIndex: this.selectedJobIndex,
        jobBoardNotice: this.jobBoardNotice?.text ?? null,
      }
    );
    renderer.renderDialogueOverlay(this.dialogue.getSnapshot());
  }
}
