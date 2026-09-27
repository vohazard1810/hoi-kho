# AI STUDIO HANDOFF V17.1 (HOTFIX) — NỢ ƠI, TỚI ĐÂY!

Tài liệu bàn giao phiên bản V17.1 Hotfix dự án game 2D Beat'em Up / Runner "Nợ Ơi, Tới Đây!".

---

## I. TỔNG QUAN PHIÊN BẢN V17.1 HOTFIX

Phiên bản V17.1 Hotfix hoàn thiện các tinh chỉnh quan trọng cho hệ thống Hazard, Parcel Damage, Checkpoint Anti-farming và Retry Logic tại Stage 1:
- **Sửa Parcel Damage của Hazard**: `damageParcel()` chỉ được gọi khi `player.takeDamage()` trả về `true` (không kích hoạt khi người chơi đang trong I-frame).
- **Cơ chế Cooldown Hazard**: Bổ sung cooldown riêng theo từng hazard ngăn chặn việc gây sát thương mỗi frame khi đứng trong vùng va chạm.
- **Thiết kế lại Hazard Stage 1**:
  - **Puddle**: damage = 0, parcelDamage = 0; giảm 25% gia tốc/lực bám trong tối đa 0.5s thông qua `player.applySlip(0.5)`, không dùng `vx *= 0.65` mỗi frame.
  - **Trash**: vật cản thấp có thể nhảy qua; đi bộ chạm vào không mất máu hay kiện. Chỉ gây 2–3% parcel damage nếu người chơi bị enemy knockback hoặc lao tốc độ cao vào.
  - **Bố cục Hazard**: Chỉ giữ 1 puddle tại Zone B và 1 trash pile tại Zone C (loại bỏ toàn bộ các bản sao ở Zone D). 3 hố sâu (pit) được giữ nguyên.
  - **Telegraph cảnh báo**: Nhãn `≈ TRƠN ≈` và `▲ RÁC` xuất hiện khi người chơi đến gần lần đầu, sau đó tự động mờ dần và biến mất sau 1.2 giây.
- **Bảo chứng Chống Farm Tiền Thưởng (Anti-Farming Guarantee)**: `bonusReward` được snapshot trong `captureEncounterCheckpoint()` và hoàn trả chính xác trong `retryFromCheckpoint()`, ngăn chặn triệt để hành vi cày bonus thưởng bằng cách chết đi sống lại.
- **Chuẩn hóa Retry Logic**:
  - Khi Retry Boss không kích hoạt lại đoạn thoại mở đầu Stage hay thoại Boss.
  - Loại bỏ âm thanh né hoàn hảo `perfect_dodge` không phù hợp khi hồi sinh tại checkpoint.
  - Giữ nguyên trạng thái `CLEARED` của các Zone A–D khi Retry Boss.
- **Tọa độ khởi đầu chuẩn**: `PLAYER_START_X` được chuẩn hóa tại x = 120, y = 556.
- **Bộ Kiểm thử Tự động**: Vượt qua toàn bộ 127/127 bài kiểm thử tự động (100% pass rate).

---

## II. CÁC HẠNG MỤC ĐÃ HOÀN TẤT TRONG V17.1 HOTFIX

### 1. Hệ thống Checkpoint & Retry tại Stage 1 (`Stage1Scene.ts`)
- **`enterFreshStage()`**: Bắt đầu màn chơi mới từ đầu (vị trí x: 120, y: 556).
- **`captureEncounterCheckpoint(zoneId)`**: Tự động lưu checkpoint khi Hội Khờ bước vào phạm vi kích hoạt trận đánh của từng khu vực (Zone A: 120, Zone B: 690, Zone C: 1370, Zone D: 2050, Zone E: 2730).
- **`retryFromCheckpoint()`**:
  - Hồi sinh Hội Khờ ngay tại vị trí checkpoint của khu vực hiện tại với 100% HP.
  - Khôi phục độ bền kiện hàng `parcelCondition` đúng theo mốc bắt đầu trận đấu đó.
  - Khôi phục số linh kiện `parts` và tiền thưởng phụ `bonusReward` về đúng snapshot checkpoint — ngăn chặn triệt để mọi hành vi farm tiền/linh kiện bằng cách chết đi sống lại.
  - Giữ nguyên trạng thái `CLEARED` của các khu vực đã vượt qua (Zones A–D khi Retry Boss). Chỉ kích hoạt lại kẻ địch của khu vực hiện tại.
  - Dọn sạch transient combat state qua `resetTransientCombatState()` (bao gồm đạn đạo, hiệu ứng, hội thoại và cooldown hazard).
  - Không kích hoạt lại âm thanh `perfect_dodge` hay mở lại cutscene/dialogue mở đầu màn chơi.

### 2. Chuẩn hóa Nhãn Kỹ Năng trên HUD
- **Phím [J]**: `LIÊN HOÀN`
- **Phím [K]**: `BĂNG KEO`
- **Phím [L]**: `LƯỚT NÉ`
- **Phím [Q]**: `HỎA TỐC`
- Cam kết: Không còn bất kỳ file mã nguồn nào chứa nhãn cũ "CƠ BẢN".

### 3. Hệ thống Chướng ngại vật và Telegraph Cảnh báo
- **Hố tử thần (`type: 'pit'`)**: 3 hố sâu tại Zone B (x: 900), Zone C (x: 1830), Zone D (x: 2560).
- **Vũng nước đọng (`type: 'puddle'`)**: Duy nhất 1 vũng tại Zone B (x: 1060). Không gây sát thương HP/kiện, áp dụng hiệu ứng trơn trượt 0.5s. Nhãn `≈ TRƠN ≈` mờ dần sau 1.2s.
- **Bãi rác ve chai (`type: 'trash'`)**: Duy nhất 1 bãi tại Zone C (x: 1730). Vật cản thấp có thể nhảy qua; đi bộ không mất HP/kiện; chỉ gây 3% parcel damage khi bị văng vào hoặc lao tốc độ cao. Nhãn `▲ RÁC` mờ dần sau 1.2s.

---

## III. HƯỚNG DẪN KHỞI CHẠY VÀ KIỂM THỬ

1. **Khởi chạy ứng dụng**:
   ```bash
   npm run dev
   ```
   Ứng dụng lắng nghe tại `http://localhost:3000`.

2. **Chạy bộ kiểm thử tự động**:
   ```bash
   npm test
   ```
   Toàn bộ 127 bài kiểm thử tự động sẽ chạy qua hệ thống kiểm tra logic, âm thanh, asset pipeline, và checkpoint/hazard regression.

3. **Kiểm tra TypeScript & Linter**:
   ```bash
   npm run lint
   ```

4. **Kiểm tra Production Build**:
   ```bash
   npm run build
   ```

---

## IV. QUY TẮC PHÁT TRIỂN TIẾP THEO
- **Rival Drive-by**: Chưa triển khai vì đang chờ sprite xe máy chính thức. Chỉ bắt đầu tích hợp khi đã có bộ asset xe máy chuẩn.
- **Stage 2**: Giữ nguyên phạm vi Stage 1 hoàn chỉnh trước khi mở rộng Stage 2.
- **Anti-Farming Guarantee**: Mọi thay đổi về hệ thống kinh tế hoặc pickup đều phải duy trì cơ chế bảo vệ rollback `parts` trong `retryFromCheckpoint`.
