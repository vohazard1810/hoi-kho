# AI STUDIO HANDOFF — V19.2 STAGE 1 LOCK

## Chỉ thị tích hợp

Hãy thay toàn bộ source hiện tại bằng nội dung ZIP V19.2, không cherry-pick lại patch cũ và không tự tái sinh sprite/audio. Không đổi gameplay balance ngoài các giá trị đã có trong bản này.

## Giữ nguyên

* `src/game/audio/AudioManager.ts` và toàn bộ `public/assets/audio/`.
* `scripts/generate-audio-v19-2.mjs` cùng script `npm run audio:build`.
* Parcel profile wiring trong `Stage1Scene`.
* Field repair cap 90%, repair +15%, fragile per-hit cap 10%.
* Checkpoint/anti-farming, Boss retry, Perfect Dodge, Rival drive-by, UI và art pipeline V19/V19.1.

## Không làm

* Không thay OGG bằng file rỗng/placeholder/base64 text.
* Không gọi lại `enterFreshStage()` khi retry Boss.
* Không tăng lại parcel damage về giá trị V17/V19.1.
* Không hiển thị DEV UI khi Debug đang OFF.
* Không tạo Stage 2 trong cùng lượt import; trước hết phải xác nhận Stage 1 pass checklist bên dưới.

## Lệnh bắt buộc sau import

```bash
npm ci
npm run lint
npm run test
npm run build
npm run qa:combat
npm run benchmark
```

Kỳ vọng: test `156/156 PASS`; mọi lệnh exit code 0.

## Checklist Live Preview

1. Menu/Intro có BGM sau thao tác đầu tiên, không im lặng 27 giây.
2. Hub và Stage dùng track khác nhau; Result đổi sang cadence nhận thưởng.
3. Chạy, nhảy, tiếp đất và J1/J2/J3 nghe khác nhau; đánh hụt không phát tiếng trúng.
4. Bị Boss đánh từ sau lưng không mất hơn 10% kiện trong một hit.
5. Nhặt băng gia cố hiện `+15% GIA CỐ KIỆN`, có âm riêng; không vượt 90%.
6. Kiện đang 100% không tụt xuống 90% khi nhặt repair.
7. Hóa đơn luôn thỏa `Công gốc − Khấu trừ + Thưởng = Tổng` trong toàn bộ animation.

Nếu cả 7 mục đạt, báo lại đúng câu: `V19.2 STAGE 1 LOCK — LIVE PLAYTEST PASS`. Sau đó mới bắt đầu brief thiết kế Stage 2.

