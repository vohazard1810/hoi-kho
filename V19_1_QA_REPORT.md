# NỢ ƠI, TỚI ĐÂY! — V19.1 QA REPORT

Build: `V19.1 • build 20260913.2`  
Version: `0.19.1`

## Kết quả nghiệm thu

- `npm ci`: PASS.
- `npm run lint`: PASS, TypeScript 0 lỗi.
- `npm run test`: PASS, 146/146 bài kiểm thử.
- `npm run build`: PASS, Vite production build hoàn tất.
- `npm run qa:combat`: PASS, scripted arena probe hoàn tất cho 3 loadout.
- `npm run benchmark`: PASS, 1000 simulation steps, 0 long step trên 16.67 ms.

Lưu ý: benchmark và `qa:combat` là mô phỏng logic, không thay thế playtest cảm giác điều khiển hoặc đo FPS trình duyệt.

## Thay đổi đã kiểm định

### Boss Stage 1

- Tốc độ lao giảm từ 520 xuống 468 (-10%).
- Recovery pha 1 tăng từ 0.65 giây lên 0.90 giây.
- Recovery pha 2 tăng từ 0.45 giây lên 0.70 giây.
- Recovery thường nhận 100% damage; Perfect Dodge mở cửa sổ 150% damage.
- Perfect Dodge ghi nhận attack ID đã né, ngăn hitbox dài gây sát thương muộn sau khi hết i-frame.
- Sáu nấc chống spam được đổi thành biểu tượng nanh và ghi rõ `NỘ PHẢN ĐÒN`; đây không phải thanh tiến độ sát thương.
- Arena Boss rộng hơn, có thêm không gian sau cổng để giảm kẹt góc mà không dùng camera zoom gây mờ sprite.

### Prologue

- Bỏ bảng đen đặc che nửa tranh; caption dùng gradient tối ở đáy khung hình.
- Chuyển beat bằng cross-fade 0.22 giây.
- Thay `beat_4_hub.png` bị truncate bằng ảnh Hub PNG hợp lệ.
- Loader đổi sang fallback riêng từng asset: một ảnh lỗi không còn vô hiệu hóa toàn bộ visual pack V19.
- Test mới đọc cấu trúc chunk PNG và bắt buộc có `IEND`, không chỉ tin kích thước IHDR.

### Kết quả giao hàng

- Hóa đơn hiển thị tách bạch: công giao hàng gốc, khấu trừ do kiện hư, tiền thưởng và tổng thu nhập.
- Phần trăm kiện giữ được một chữ số thập phân khi cần.
- Tăng độ rõ của tiếng đếm tiền và phát chime xác nhận khi tổng tiền đếm xong.

## Phạm vi không thay đổi

- Không thay công thức trả nợ hoặc số tiền thực nhận.
- Không thay HP, damage combo J/K/Q hay physics nền của Player.
- Không thêm camera scale/zoom trong combat để tránh tái phát hiện tượng sprite mờ/vỡ nét.
- Không biến nộ phản đòn thành thanh stagger; nộ vẫn giảm khi người chơi ngừng spam theo đúng thiết kế chống khóa Boss.

## Rủi ro còn lại cần playtest người thật

- Nhịp Boss cần 3–5 lượt chơi bằng bàn phím ở loadout chưa nâng cấp để xác nhận mức khó đầu game.
- Âm lượng chime/cash tick cần nghe trên loa và tai nghe vì test tự động chỉ xác nhận đường gọi và giới hạn mix.
- Cross-fade cần kiểm tra trên trình duyệt mục tiêu để xác nhận không có khựng do decode ảnh lần đầu.

