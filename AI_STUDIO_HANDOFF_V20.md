# AI STUDIO HANDOFF — V20 ARCHITECTURAL & GAMEPLAY RESTRUCTURE

## Tóm tắt các nâng cấp trọng tâm (V20)

1. **Khắc phục tỷ lệ Hub (Tăng kích thước nhân vật & NPC)**:
   - Tăng tỷ lệ hiển thị nhân vật tại Trạm SXP Hub (`HUB_HUMAN_SCALE = 1.85`), giúp Hội Khờ và Cô Ba rõ nét, nổi bật, giải quyết triệt để cảm giác nhân vật bị lọt thỏm/nhỏ bé trong không gian Hub.
   - Hạ thấp khung hội thoại (`boxY = 540`, `boxH = 155`), kèm chân dung nhân vật rõ ràng, không còn che khuất nửa dưới thân người hay cản trở tầm nhìn nhân vật.

2. **Cơ chế chiến đấu không chiến (Air Drop Kick — Nhảy + Tấn công [Jump + J])**:
   - Khờ khi đang trên không (nhảy từ gác lửng, ban công hoặc nhảy né đòn) nhấn `J` sẽ kích hoạt cú **Đạp Rơi Không Chiến** (Air Drop Kick).
   - Đòn lao chéo về phía trước (`vx = ±320`, `vy = 360`), gây sát thương lớn và đẩy văng quái khi chạm đất, mở ra chiến thuật di chuyển từ bục cao xuống đàn quái.

3. **Mở rộng chiều sâu & Độ dài Stage 1 (Platforming & Exploration Drops)**:
   - Tận dụng hệ thống bục nhảy (mái hiên Zone A/E, giàn gỗ Zone B/D, ban công sắt Zone C).
   - Bố trí các phần thưởng khám phá (Linh kiện điện tử `PARTS`, Băng keo gia cố `PARCEL_REPAIR`) trên các gác lửng cao, khuyến khích người chơi leo bục, né tránh hiểm họa dưới mặt đất và lao xuống tấn công.

4. **Cutscene Kết Thúc Chương 1 (Chapter 1 Epilogue Cutscene — "Đêm Về Phòng Trọ")**:
   - Khi hoàn tất giao kiện hàng cho Chú Tư và xem bảng quyết toán thu nhập, nhấn `Space / E / J` sẽ mở **Cutscene Đêm Về Phòng Trọ**.
   - Mang lại cảm giác thỏa mãn cốt truyện: Trực quan hóa số tiền kiếm được trừ trực tiếp vào khoản nợ gốc 20 triệu VNĐ, thể hiện tâm trạng nhẹ nhõm và quyết tâm của Khờ trước khi bước sang ngày giao hàng tiếp theo.

5. **Tích hợp Asset Dép Tổ Ong (Dép Tổ Ong Icon)**:
   - Tạo và tích hợp asset icon chuẩn 128x128 RGBA `dep_to_ong.png` vào hệ thống nâng cấp trang bị (`agile_dodge` - Lướt linh hoạt nhánh L).

---

## Chỉ thị triển khai lên Google AI Studio

1. Tải file ZIP **`hoi_kho_v20_restructured.zip`** (đã được nén sẵn tại thư mục Downloads của máy bạn).
2. Trong Google AI Studio, giải nén và **thay toàn bộ source dự án hiện tại** bằng nội dung trong ZIP.
3. Không cần cherry-pick patch cũ; toàn bộ mã nguồn V20 đã đồng bộ hoàn chỉnh.

## Lệnh kiểm định bắt buộc

```bash
npm ci
npm run lint
npm run test
npm run build
npm run qa:combat
npm run benchmark
```

**Kỳ vọng**: `168/168 PASS`, mọi lệnh hoàn tất với exit code 0.

## Checklist Trải Nghiệm Gameplay Thực Tế (Live Playtest)

1. **Hub**: Hội Khờ và Cô Ba đứng cạnh nhau với kích thước chuẩn, to rõ, cân đối với trạm SXP; hộp thoại nằm gọn gàng bên dưới.
2. **Không chiến**: Thử nhảy lên và nhấn `J` để tung cú lao đạp Air Drop Kick; cảm nhận độ nặng và uy lực khi đáp đất trúng kẻ thù.
3. **Leo bục & Nhặt đồ**: Nhảy lên các giàn gỗ và mái hiên ở Khu B, C, D để nhặt linh kiện và keo gia cố.
4. **Đánh Trùm Chó Đại Ca**: Đọc vùng cảnh báo đỏ, né đòn lướt (`L`), phản công sau recovery (`J1-J2-J3` hoặc `Jump + J`), tung Tuyệt Kỹ `Q` khi đầy Momentum.
5. **Epilogue**: Sau khi giao đơn cho Chú Tư và xem bảng tiền lương, nhấn phím tiếp tục để thưởng thức cutscene kết thúc ngày trước khi quay về Hub.
