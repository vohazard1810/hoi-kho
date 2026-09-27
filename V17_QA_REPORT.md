# BÁO CÁO NGHIỆM THU & BẢO CHỨNG CHẤT LƯỢNG V17.1 HOTFIX (V17_QA_REPORT)

**Dự án:** Nợ Ơi, Tới Đây! (SXP — Giao Hàng Bất Chấp)  
**Phiên bản:** V17.1 (Hotfix)  
**Build Target:** AI Studio / Vite + TypeScript  
**Tình trạng kiểm thử:** 127/127 tests PASSED (100% pass rate)

---

## 1. HỆ THỐNG CHECKPOINT & RETRY (CHỐNG RESET TOÀN BỘ STAGE)

### A. Kiến trúc Checkpoint Độc lập theo Khu vực (Zone)
- **`enterFreshStage()`**: Khởi tạo stage mới từ đầu khi bắt đầu chuyến giao hàng từ Hub hoặc làm mới đơn hàng (tọa độ x: 120, y: 556).
- **`captureEncounterCheckpoint(zoneId)`**: Lưu lại snapshot trạng thái chuẩn xác ngay tại thời điểm kích hoạt khu vực chạm trán (`ACTIVE`):
  - Tọa độ hồi sinh chuẩn theo checkpoint của khu vực (Zone A: 120, Zone B: 690, Zone C: 1370, Zone D: 2050, Zone E: 2730).
  - Khôi phục `playerHp` đầy đủ (`maxHp`) để người chơi có thể tái chiến công bằng.
  - Khôi phục `parcelCondition` tại mốc bắt đầu zone đó.
  - Lưu trữ chính xác số lượng linh kiện (`parts`) và tiền thưởng phụ (`bonusReward`) tại thời điểm vào zone.
  - Lưu trữ trạng thái khu vực (`zoneStates`): Các zone đã hoàn thành (`CLEARED`) trước đó được giữ nguyên.
- **`retryFromCheckpoint()`**:
  - Tái tạo vị trí của Hội Khờ tại checkpoint khu vực hiện tại.
  - Tái tạo trạng thái kẻ địch của riêng khu vực đó (respawn kẻ địch trong zone, giữ nguyên các zone A–D đã CLEARED).
  - Dọn dẹp transient combat state qua `resetTransientCombatState()` (bao gồm đạn đạo, hiệu ứng, cooldown hazard, và reset dialogue).
  - Không kích hoạt lại âm thanh `perfect_dodge` hay mở lại cutscene/dialogue mở đầu màn chơi.
- **Cơ chế chống farm linh kiện / bonus (Anti-Farming Exploits)**:
  - Khi người chơi bị KO và Retry, cả `parts` và `bonusReward` đều được rollback nghiêm ngặt về snapshot lúc vào checkpoint (`upgradeSystem.setParts(cp.parts)` và `objective.restoreSnapshot({ bonusReward: cp.bonusReward, ... })`).
  - Toàn bộ pickup rơi trên sàn thuộc khu vực được thu hồi và tracking loot drop được làm mới theo zone spawns.

---

## 2. CHUẨN HÓA HUD & SKILL LABELS

### A. Nhãn Kỹ năng Độc lập (Không dùng nhãn "CƠ BẢN")
- 4 phím kỹ năng trên HUD hiển thị đúng danh pháp thiết kế:
  - **Phím [J]**: `LIÊN HOÀN` (Nâng cấp: `CHUẨN` / `RỘNG` / `PRO`)
  - **Phím [K]**: `BĂNG KEO` (Nâng cấp: `LỰC` / `TẦM XA` / `DÍNH`)
  - **Phím [L]**: `LƯỚT NÉ` (Nâng cấp: `GIÁP` / `LƯỚT` / `BALO`)
  - **Phím [Q]**: `HỎA TỐC` (Nâng cấp: `PIN` / `RỘNG`)
- **Kiểm định từ khóa cấm**: Toàn bộ codebase production không còn bất kỳ sự xuất hiện nào của chuỗi từ khóa "CƠ BẢN".

---

## 3. HỆ THỐNG VẬT CẢN VÀ CẢNH BÁO TELEGRAPH TRÊN STAGE 1 (V17.1 HOTFIX)

### A. Phân loại Vật cản (Hazards)
1. **Hố tử thần (Fatal Pit - `type: 'pit'`)**:
   - Vị trí: 3 hố sâu tại Zone B (x: 900), Zone C (x: 1830), Zone D (x: 2560).
   - Tác động: Gây 10 sát thương người chơi, 20 sát thương kiện hàng (chỉ khi `takeDamage()` trả về `true`), và đưa người chơi về vị trí an toàn gần nhất với cooldown 1.0s.
2. **Vũng nước đọng (Water Puddle - `type: 'puddle'`)**:
   - Vị trí: Duy nhất 1 vũng tại Zone B (x: 1060). Đã loại bỏ các bản sao ở Zone D.
   - Tác động: damage = 0, parcelDamage = 0; không trừ máu hay kiện hàng; áp dụng `player.applySlip(0.5)` giảm 25% gia tốc/lực bám trong tối đa 0.5s.
   - Telegraph: Hiệu ứng gợn sóng lân tinh mặt nước kết hợp nhãn cảnh báo `≈ TRƠN ≈` mờ dần sau 1.2s.
3. **Bãi rác ve chai thấp (Trash Pile - `type: 'trash'`)**:
   - Vị trí: Duy nhất 1 bãi tại Zone C (x: 1730). Đã loại bỏ các bản sao ở Zone D.
   - Tác động: Vật cản thấp có thể nhảy qua; đi bộ chạm vào không mất máu hay kiện. Chỉ gây 2–3% parcel damage nếu người chơi bị enemy knockback vào hoặc lao tốc độ cao vào nó.
   - Telegraph: Cọc báo phản quang và nhãn `▲ RÁC` mờ dần sau 1.2s.

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

- **Tổng số bài kiểm tra**: 127 test cases.
- **Kết quả**: 127 PASSED, 0 FAILED (100% pass rate).
  - Nhóm V17.1 Checkpoint, Hazard & HUD Tests: 12/12 PASSED.
    - Đứng trong puddle 2 giây không mất HP/parcel liên tục.
    - I-frame chặn HP hit thì parcel damage không áp dụng.
    - Một lần đi qua trash không gây damage thông thường.
    - Bonus reward rollback chính xác.
    - Boss Retry giữ các zone A–D ở trạng thái CLEARED.
    - Retry Boss không kích hoạt lại Stage intro hoặc Boss intro dialogue.
  - Nhóm V16 Combat, Balance & Audio Tests: 14/14 PASSED.
  - Nhóm V15 Tests: 1/1 PASSED.
  - Nhóm UI Navigation & Grid Navigation Tests: 12/12 PASSED.
  - Nhóm Combat Pacing, Audio Mix, Game Feel: 10/10 PASSED.
  - Nhóm Asset Validation & Visual Manifests: 19/19 PASSED.
  - Nhóm Shipper Toolkit Progression V2: 10/10 PASSED.
  - Nhóm Enemies & Boss Dog Production Tests: 15/15 PASSED.
  - Nhóm Parallax, Geometry & World Layers: 9/9 PASSED.
  - Nhóm Stabilization & HD Pipeline: 25/25 PASSED.

---

## 6. DANH MỤC CÂY THỦ TỤC CANONICAL TẠI ROOT

```
/
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── metadata.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── V17_QA_REPORT.md
├── AI_STUDIO_HANDOFF_V17.md
├── public/
│   └── assets/
├── scripts/
└── src/
```
