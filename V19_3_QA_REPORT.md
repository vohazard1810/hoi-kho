# V19.3 QA REPORT — FINAL POLISH BEFORE STAGE 2

## Kết luận

V19.3 xử lý thẳng ba điểm còn làm bản V19.2 giống demo: mix âm thanh lệch giữa cảnh, encounter thường xếp hàng một-một và vòng chơi bị cụt sau khi về Hub. Bản này không dựng Stage 2 giả; nó tạo điểm chuyển giao thật, đo được, để Stage 2 bắt đầu trên nền ổn định.

## Thay đổi chính

| Hạng mục | V19.2 | V19.3 |
| --- | --- | --- |
| Scene music gain | Menu 0.16, Hub 0.16, Stage 0.20, Result 0.16 | Menu 0.28, Hub 0.18, Stage 0.15, Result 0.15 |
| Heavy impact | Body/noise chung | Thêm transient 2.5kHz và low-body 92→34Hz |
| Music duck | Không | J3 −3dB/175ms; Q −4dB/230ms, chỉ khi hit |
| Enemy composition | 1/1/1/1/1 theo Zone A–E | 1/2/2/2/1; B–D có trước/sau |
| Encounter banner | Hộp cam 408×46, 1.5s | Chip tối 328×34, 0.9s; clear-state không hiện |
| Sau Result | Trở về Hub không có bước tiếp | Recap ca → Job Board → replay/Stage 2 preview |
| Đo playtest | Chủ yếu combat probe | Thêm RunTelemetry session-only |

## Telemetry phục vụ cân Stage 2

Snapshot cuối run được lưu ở `sessionStorage.no_oi_latest_run_v1`, gồm: thời lượng, deaths, số input J/K/L/Q, confirmed melee hits, damage events, Boss attempts, Boss TTK, parcelStart/parcelEnd. Đây là dữ liệu chẩn đoán; không thu thập mạng và không tự điều chỉnh độ khó.

## Cơ chế kiện hàng

Không đổi contract V19.2: mỗi băng gia cố +15%, cap 90%; Miniboss/Boss bảo đảm có đường hồi kiện; kiện 100% không bị hạ xuống. Giữ 100% là thành tích, không phải điều kiện bắt buộc. Người chơi vẫn có đường phục hồi để tránh cảm giác mọi sai lầm đều vĩnh viễn.

## Kết quả tự động

* `npm run lint`: PASS.
* `npm run test`: PASS — 168/168.
* `npm run build`: PASS — Vite 6.4.3, 1729 modules, JS gzip 119.44 kB.
* `npm run qa:combat`: PASS — Boss KO ở cả 3 loadout; probe được ghi đúng là mô phỏng, không phải chứng minh balance người thật.
* `npm run benchmark`: PASS — 1000 fixed steps, P95 0.0315 ms, 0 long steps.
* Clean extraction: chạy lại sau khi tạo archive; kết quả nằm trong `PACKAGE_INTEGRITY_V19_3.txt`.

## Rủi ro còn lại

* Tăng số địch có thể làm người mới khó hơn nếu cả hai AI cùng telegraph đúng một nhịp. Live Preview cần kiểm tra Zone B–D; nếu quá gắt, ưu tiên lệch spawn timing 0.35–0.5s thay vì hạ HP quái.
* Gain số học không thay thế đánh giá nghe thật. Cần nghe bằng cả loa laptop và tai nghe; không tiếp tục tăng master volume chỉ dựa trên waveform.
* Stage 2 chưa tồn tại trong scene registry. Job Board cố ý ghi `SẮP MỞ` để không hứa sai với người chơi.
