# AI STUDIO HANDOFF — V19.3 FINAL POLISH

## Chỉ thị duy nhất

Giải nén ZIP V19.3 và **thay toàn bộ source dự án hiện tại** bằng nội dung trong ZIP. Không cherry-pick patch V17–V19.2 cũ lên trên, không tự tạo lại sprite/OGG và không đổi balance Boss/kiện hàng trong lượt import.

## Bắt buộc giữ nguyên

* `AudioManager.getMusicSceneGain()` và `duckMusic()`; J3/Q chỉ duck nhạc khi hit đã được xác nhận.
* 8 spawn Stage 1: A=1, B=2, C=2, D=2, E=1; Zone C gồm Rival drive-by và chó flank.
* Checkpoint, anti-farming, Perfect Dodge, Boss armor/recovery, fragile cap 10% mỗi hit và repair +15% cap 90%.
* Recap ca và Bảng Đơn SXP tại Hub. Stage 2 chỉ là preview khóa, chưa được giả lập bằng màn trống.
* `RunTelemetry` là đo lường session-only; không được dùng để tăng/giảm difficulty trong bản này.

## Không làm

* Không thêm lại nhãn `[A]`, `[B]`, `CƠ BẢN`, `Ân Oán` hoặc `DNV: OFF` vào UI production.
* Không biến banner encounter thành hộp cam lớn giữa màn hình.
* Không phát hit SFX khi đánh hụt.
* Không cho nhặt băng gia cố làm kiện 100% tụt xuống 90%.
* Không reset telemetry/checkpoint toàn Stage khi Retry Boss.

## Lệnh kiểm định bắt buộc

```bash
npm ci
npm run lint
npm run test
npm run build
npm run qa:combat
npm run benchmark
```

Kỳ vọng: `168/168 PASS`, mọi lệnh exit code 0.

## Checklist Live Preview

1. Menu/Intro nghe rõ nhưng không lấn thoại/SFX; Stage thấp hơn trước và không “dội” khi chuyển cảnh.
2. J3/Q trúng địch có thân âm trầm + tiếng chát, BGM hạ rất ngắn rồi trở về tự nhiên; đánh hụt không có impact.
3. Zone B–D sinh đúng hai mối đe dọa trước/sau, nhưng không vượt `MAX_ACTIVE_ENEMIES = 3`.
4. Rival drive-by còn telegraph công bằng và có thể né/nhảy; không spawn địch chồng trực tiếp lên Player.
5. Banner encounter nhỏ, tối, biến mất trong 0.9 giây; không có nhãn khu kiểu debug.
6. Giao xong Stage 1, về Hub thấy recap tiền trả nợ; bấm tiếp mở Bảng Đơn SXP.
7. Bảng đơn cho chơi lại Stage 1; Stage 2 ghi rõ `SẮP MỞ` và không chuyển vào scene chưa tồn tại.
8. Mở Dev Mode và chép snapshot `sessionStorage.no_oi_latest_run_v1` sau một lượt chơi để kiểm tra Boss TTK, deaths, J/K/L/Q và parcelEnd.

Nếu đủ 8 mục, báo lại: `V19.3 FINAL POLISH — LIVE PLAYTEST PASS`. Nếu có lỗi, gửi clip từ lúc vào Zone lỗi tới 3 giây sau lỗi và không tự vá bằng patch cũ.
