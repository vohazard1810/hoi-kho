# AI STUDIO HANDOFF — V19

## Baseline

Chỉ dùng `NO_OI_TOI_DAY_V19_CHAPTER_1.zip`. Không trộn code hoặc asset từ V16/V17 cũ.

## Không xóa hoặc ghi đè

- `src/game/rendering/ProductionVisualsV19.ts`
- Rival: `startDriveBy()`, `forceDismount()`, `driveByPhase`
- Pickup: bounce, fade và magnet
- Stage 1: checkpoint, retry, anti-farming, hazard gating và Zone E objective ownership
- `public/assets/pickups/`, `parcels/`, `rival/`, `prologue/`
- `public/assets/audio/sfx/glass_clink.ogg`
- `src/game/tests/v19Tests.ts`

## Nghiệm thu bắt buộc

```bash
npm ci
npm run lint
npm run test
npm run build
npm run qa:combat
```

Không báo hoàn tất nếu test thấp hơn 137/137 hoặc build/lint khác exit code 0.

## Nội dung gửi AI Studio

> Import nguyên ZIP V19 và coi đây là canonical baseline. Không khôi phục code/asset từ ZIP cũ, không thay đổi gameplay balance hay checkpoint V17.1 nếu tôi chưa yêu cầu. Trước và sau khi sửa, chạy npm run lint, npm run test, npm run build. Báo file đã đổi, lý do và output test thực tế. Giữ fallback asset, Rival drive-by, loot drop/magnet, parcel 4 trạng thái, comic prologue và nút DEV chỉ hiện khi DEV ON.
