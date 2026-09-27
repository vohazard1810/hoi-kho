# AI STUDIO HANDOFF — V19.1

Đây là bản canonical tiếp theo của dự án. Hãy import toàn bộ ZIP V19.1 và không trộn lại code từ V19/V17 cũ.

## Giữ nguyên

- `APP_VERSION = 0.19.1`, `BUILD_ID = V19.1 • build 20260913.2`.
- Boss dash speed 468; recovery pha 1/2 lần lượt 0.90/0.70 giây.
- Recovery thường nhận 100% damage; Perfect Dodge nhận 150%.
- `CombatSystem.resolveWithoutDamage()` và lệnh gọi tại Perfect Dodge.
- Boss UI `NỘ PHẢN ĐÒN`; không gọi đây là thanh combo, stagger hoặc thanh sát thương.
- Arena Stage 1 rộng 3650; gate Zone E ở 3440; Chú Tư ở 3510.
- Prologue cross-fade, bottom caption gradient, PNG integrity test và per-asset fallback.
- Hóa đơn gồm công gốc, khấu trừ kiện hư, bonus và tổng.

## Không được khôi phục

- Không đưa damage multiplier recovery thường về 20%.
- Không gọi lại cutscene Stage/Boss khi Retry checkpoint.
- Không dùng `Promise.all` để một asset phụ làm sập toàn bộ visual pack.
- Không đưa bảng đen 610×330 trở lại prologue.
- Không camera zoom làm sprite player bị scale lẻ/mờ.
- Không sửa số `TỔNG THU NHẬP` riêng lẻ; mọi dòng hóa đơn phải lấy từ cùng `DeliveryResultData`.

## Quy trình sau khi import

1. Chạy `npm ci`.
2. Chạy `npm run lint`.
3. Chạy `npm run test` và chỉ chấp nhận 146/146 PASS hoặc cao hơn.
4. Chạy `npm run build`.
5. Playtest Boss bằng save mới và loadout base; xác nhận né thường vẫn có cửa phản công, Perfect Dodge dễ nhận biết và sáu nanh là cảnh báo nguy hiểm.
6. Playtest đủ bốn beat prologue và một màn giao hàng có kiện hư để xem cross-fade và phép tính hóa đơn.

Nếu AI Studio đề xuất thay đổi cân bằng tiếp, hãy ghi giá trị cũ/mới, lý do, test hồi quy và không tự ý đổi đồng thời HP Boss, damage Player và recovery trong cùng một patch.

