# AUDIO DESIGN V19.2 — NỢ ƠI, TỚI ĐÂY!

## Mục tiêu

V19.2 thay bộ âm thanh lặp và mỏng bằng một hệ thống có nhịp, phân lớp và phản hồi rõ. Tất cả file mới được sinh nguyên bản bằng pipeline deterministic trong `scripts/generate-audio-v19-2.mjs`; không dùng sample tải ngoài và không phát sinh nghĩa vụ bản quyền bên thứ ba.

## Nhạc theo cảnh

| Cảnh | Track | Vai trò | Runtime gain |
| --- | --- | --- | ---: |
| Menu + Prologue | `menu_music.ogg` | Nhẹ, hơi buồn, dẫn vào câu chuyện | 0.16 |
| Hub | `hub_music.ogg` | Nhịp làm việc thư giãn, nằm dưới ambience kho | 0.16 |
| Stage 1 | `stage_music.ogg` | Beat nhanh hơn, giữ áp lực chiến đấu | 0.20 |
| Result | `result_music.ogg` | Cadence sáng, tạo cảm giác nhận thưởng | 0.16 |

Menu/Prologue không còn im lặng sau khi người chơi tương tác. `AudioManager` lưu track được yêu cầu và tự phát lại sau khi Web Audio Context được mở khóa hoặc preload hoàn tất.

## SFX chuyển động và chiến đấu

* Bước chân có 3 sample và tránh phát lại ngay biến thể vừa dùng; pitch/pan chỉ dao động nhẹ để không nghe máy móc.
* Nhảy và tiếp đất là hai event riêng, chỉ phát khi physics thực sự chuyển trạng thái.
* J1/J2/J3 có whoosh riêng theo trọng lượng; impact chỉ phát khi `CombatSystem` xác nhận trúng mục tiêu.
* J3 và Ultimate có low-end rõ hơn nhưng vẫn đi qua limiter chung.
* Dodge và ném băng keo có 2 biến thể; sửa kiện có tiếng kéo/dán riêng, không dùng chung tiếng nhặt đồ.

## Mix safety

* SFX master: `0.62`.
* Tối đa 10 SFX đồng thời.
* Per-event gain không vượt `0.90`.
* Music chạy ở gain 0.16–0.20; ambience 0.20; tất cả đi qua compressor/limiter Web Audio.
* OGG nguồn có true peak từ -0.8 đến -0.5 dBFS ở nhạc; gain runtime tạo headroom trước master/limiter.

## Tái tạo asset

```bash
npm run audio:build
```

Yêu cầu hệ thống có Node.js và `ffmpeg` với encoder `libvorbis`. Lệnh luôn dùng cùng seed và cùng thuật toán nên đầu ra có thể tái tạo để audit.

## Acceptance playtest bắt buộc

1. Từ Menu bật âm thanh, nhấn phím bất kỳ: nhạc phải vào trong vòng 1 giây.
2. Chạy 10 giây: bước chân không tạo cảm giác một file lặp cứng.
3. Nhảy/tiếp đất nghe được nhưng không lấn BGM.
4. J1/J2/J3 tăng dần cảm giác lực; đánh hụt chỉ có whoosh, đánh trúng mới có impact.
5. Ultimate nghe lớn hơn J3 nhưng không rè/vỡ trên loa laptop và tai nghe.
6. Chuyển Menu → Prologue → Hub → Stage → Result không có hai track phát chồng.

