# NỢ ƠI, TỚI ĐÂY! — V19 CHAPTER 1 QA REPORT

Build: `V19 • build 20260913.1`  
Version: `0.19.0`

## Phạm vi hoàn thành

- Giữ checkpoint, retry Boss, anti-farming, parcel i-frame và hazard V17.1.
- Rival có telegraph 0.65 giây, drive-by, xuống xe đấu và xe đổ lưu lại trong cảnh.
- Loot có ảnh production, fade-in, rơi, nảy một lần, magnet và collection.
- Đơn chai lọ có 4 hình thái: nguyên vẹn, móp, nứt và nguy cấp.
- Prologue 4 beat dùng tranh kể chuyện 16:9 và vẫn có nút bỏ qua.
- Bổ sung `glass_clink.ogg`, biển hiệu hẻm, ẩn DEV khi tắt và dọn hướng dẫn phím khỏi gameplay.
- Zone E ACTIVE luôn giữ đúng objective Boss sau knockback.

## Kết quả

| Hạng mục | Kết quả |
|---|---:|
| `npm run lint` | PASS — 0 TypeScript errors |
| `npm run test` | PASS — 137/137 |
| `npm run build` | PASS — Vite 6.4.3 |
| `npm run qa:combat` | PASS — spam J/no dodge bị Boss KO ở 3/3 loadout |
| `npm run benchmark` | PASS — 1000 bước, P95 0.0236 ms, 0 long steps |

Benchmark đo simulation step, không tuyên bố FPS trình duyệt. V19 là vertical slice Chapter 1 và không thêm Stage 2.
