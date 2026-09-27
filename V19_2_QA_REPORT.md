# V19.2 QA REPORT — STAGE 1 LOCK

## Kết luận

V19.2 là release candidate để khóa Stage 1 trước khi mở Stage 2. Bản này xử lý hai cụm còn yếu trong clip cuối: âm thanh thiếu bản sắc/Intro im lặng và độ bền kiện tụt quá nặng nhưng khó hồi.

## Root cause và sửa chữa

### 1. Kiện hàng mất 37.5% trong một hit Boss

`calculateParcelDamage()` đã có `ParcelProfile` và mức cap cho hàng dễ vỡ, nhưng callsite thực trong `Stage1Scene` không truyền `objective.parcelProfile`. Hàm vì vậy dùng mặc định `standard`, khiến `25 × 1.5 = 37.5%` ở rear hit.

Đã sửa callsite truyền profile thật. Đồng thời tái cân bằng damage lên kiện:

| Nguồn | Cũ | V19.2 |
| --- | ---: | ---: |
| Chó thường | 10 | 4 |
| Rival cận chiến | 15 | 5 |
| Rival projectile | 8 | 3 |
| Rival drive-by | 10 | 6 |
| Đầu gấu | 20 | 7 |
| Boss | 25 | 8 |
| Pit | 20 | 10 |

Hàng dễ vỡ luôn cap ở 10% mỗi hit sau multiplier. I-frame/dodge gate vẫn được giữ nguyên.

### 2. Không có đường hồi kiện rõ ràng

Pickup `PARCEL_REPAIR` vẫn tồn tại nhưng hồi ít, dùng chung âm pickup và không có HUD feedback nên trong clip gần như không nhận biết được.

V19.2 cho mỗi băng gia cố hồi +15%, đảm bảo Miniboss và Boss rơi một pickup, hiển thị `+X% GIA CỐ KIỆN` trong 1.8 giây và phát `parcel_repair.ogg`. Field repair cap ở 90% để giữ ý nghĩa của thành tích giao nguyên vẹn 100%.

### 3. Intro im lặng và SFX lặp/mỏng

Track/ambience từng được yêu cầu trước khi preload hoặc trước khi trình duyệt mở Web Audio Context nhưng không được khởi động lại sau unlock. Ngoài ra bước chân, swing và hit phần lớn chỉ có một sample.

V19.2 lưu `requestedMusic/requestedAmbience`, gọi `startRequestedLoops()` sau preload/resume/unlock, thêm 4 BGM theo cảnh, biến thể SFX, random nhẹ pitch/pan, âm jump/land và limiter chung.

### 4. Hóa đơn nhìn như sai tiền lúc đang đếm

Các dòng thành phần hiển thị giá trị cuối trong khi tổng còn đang chạy animation. V19.2 dùng cùng `reveal` cho gross, penalty, bonus và suy ra total từ ba giá trị đang hiển thị.

## Kết quả kiểm định

* `npm run lint`: PASS — 0 TypeScript errors.
* `npm run test`: PASS — 156/156.
* `npm run build`: PASS — Vite 6.4.3, 1728 modules.
* `npm run qa:combat`: PASS — scripted arena probe hoàn tất ở cả 3 loadout.
* `npm run benchmark`: PASS — 1000 fixed steps, P95 0.0299ms, 0 long steps.
* 48 file OGG giải mã được bằng ffmpeg; nhạc có true peak thấp hơn 0 dBFS.

## Phạm vi chưa thể chứng minh bằng test tự động

* FPS render thực trong browser và cảm nhận âm lượng trên thiết bị người chơi.
* Gu thẩm mỹ âm thanh là chủ quan; cần một lượt nghe bằng loa laptop và tai nghe sau khi AI Studio import đúng ZIP.
* Stage 2 chưa được thêm trong bản này. Không nên bắt đầu Stage 2 trước khi checklist audio/parcel ở `AUDIO_DESIGN_V19_2.md` đạt.

