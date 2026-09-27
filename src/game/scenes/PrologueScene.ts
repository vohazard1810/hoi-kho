import { Input } from '../core/Input';
import { SceneManager } from '../core/SceneManager';
import { Renderer } from '../rendering/Renderer';
import { Scene } from './Scene';

export const PROLOGUE_BEATS = [
  { kicker: 'SÀI GÒN • CUỐI THÁNG', title: 'NHỮNG CON SỐ KHÔNG BIẾT THƯƠNG', body: 'Tiền nhà. Tiền thuốc. Những khoản nợ cứ dài hơn sau mỗi lần Hội Khờ mở ví.' },
  { kicker: 'TRÊN CẦU • CHẠNG VẠNG', title: 'CHƯA BIẾT NGÀY MAI ĐI ĐÂU', body: 'Khờ đi bộ thật lâu cho đầu óc nhẹ bớt. Cậu chỉ cần một cơ hội để bắt đầu lại.' },
  { kicker: 'RỒI — BỘP!', title: 'MỘT TỜ GIẤY BAY THẲNG VÀO MẶT', body: '“SXP tuyển shipper. Nhận việc ngay. Thu nhập theo năng lực.” Đúng lúc đến mức đáng ngờ.' },
  { kicker: 'TRẠM GIAO HÀNG SXP • ĐIỂM XUẤT PHÁT', title: 'GIAO TỪNG ĐƠN • TRẢ TỪNG KHOẢN • KHÔNG LÙI BƯỚC!', body: 'Cô Ba trao nón cam, chìa khóa và kiện hàng đầu tiên: "Hẻm sâu chó dữ, giang hồ quậy phá... nhưng shipper SXP là giao tới nơi về tới chốn!"' },
] as const;

export function advancePrologueBeat(current: number): number { return current + 1; }

export class PrologueScene implements Scene {
  public name = 'PROLOGUE';
  private beat = 0;
  private elapsed = 0;
  private previousBeat: number | null = null;
  private transitionElapsed = 0.22;
  constructor(private readonly sceneManager: SceneManager) {}
  public init(): void {}
  public enter(): void { this.beat = 0; this.elapsed = 0; this.previousBeat = null; this.transitionElapsed = 0.22; }
  public exit(): void {}

  private finish(): void {
    try { localStorage.setItem('no_oi_toi_day_prologue_seen_v1', '1'); } catch { /* storage is optional */ }
    this.sceneManager.switchScene('HUB');
  }

  public update(dt: number, input: Input): void {
    this.elapsed += dt;
    this.transitionElapsed += dt;
    if (input.isJustPressed('cancel')) { this.finish(); return; }
    if (input.isJustPressed('interact') || input.isJustPressed('attack') || input.isJustPressed('jump')) {
      this.previousBeat = this.beat;
      this.beat = advancePrologueBeat(this.beat);
      this.elapsed = 0;
      this.transitionElapsed = 0;
      if (this.beat >= PROLOGUE_BEATS.length) this.finish();
    }
  }

  public render(renderer: Renderer): void {
    const beat = PROLOGUE_BEATS[this.beat];
    if (beat) renderer.renderPrologueScene(
      this.beat,
      PROLOGUE_BEATS.length,
      beat,
      this.elapsed,
      this.previousBeat,
      Math.min(1, this.transitionElapsed / 0.22)
    );
  }
}
