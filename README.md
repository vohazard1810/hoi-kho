# NỢ ƠI, TỚI ĐÂY! — BÁO CÁO VÀ HƯỚNG DẪN KIỂM ĐỊNH

## 1. Tổng quan Dự án & Trạng thái Kiểm định
* **Tên dự án**: Nợ Ơi, Tới Đây! — Hành trình của Hội Khờ
* **Trạng thái**: `V19.3 — STAGE 1 FINAL POLISH, STAGE 2 HANDOFF READY`
* **Asset**: Player, Chó Hẻm, Rival, Thug, Chó Đại Ca, Cô Ba và Chú Tư đều có production art. Runtime vẫn giữ fallback độc lập nếu preload hoặc render thất bại.

## V19.3 — bản hiện tại (khép vòng Ngày 1 trước Stage 2)

Đọc `V19_3_QA_REPORT.md` và `AI_STUDIO_HANDOFF_V19_3.md` trước khi tích hợp.

* Cân lại nhạc theo cảnh: Menu/Prologue nổi hơn, Stage/Result có headroom; J3 và Tuyệt kỹ tự duck BGM trong khoảnh khắc va chạm.
* Tái sinh hit SFX với lớp transient “chát” và low-body riêng, giữ limiter và giới hạn voice hiện có.
* Zone B, C và D có hai địch phối hợp trước/sau; Rival giữ pha drive-by, giảm cảm giác quái xếp hàng chờ đánh.
* Banner encounter rút xuống 0.9 giây, nền tối mảnh; bỏ nhãn `[A]…[E]` khỏi UI người chơi và không bật banner khi khu đã clear.
* Khi về Hub sau giao hàng: hiện recap ca, số tiền vừa trả nợ, nợ còn lại; sau đó mở Bảng Đơn SXP. Stage 1 chơi lại được, Stage 2 hiện preview `SẮP MỞ` đúng trạng thái thực tế.
* Telemetry phiên chơi ghi thời lượng, số lần chết, J/K/L/Q, hit xác nhận, damage, số lần thử Boss, Boss TTK và độ bền kiện cuối màn.
* Kiểm định V19.3: 168/168 automated tests PASS trước đóng gói; tiếp tục cần Live Preview để chốt cảm giác mix trên thiết bị thật.

## V19.2 — lịch sử khóa Stage 1

Đọc `V19_2_QA_REPORT.md`, `AUDIO_DESIGN_V19_2.md` và `AI_STUDIO_HANDOFF_V19_2.md` trước khi tích hợp.

* Có nhạc nền riêng cho Menu/Prologue, Hub, Stage 1 và Result; audio tự khởi động lại sau thao tác mở khóa trình duyệt, xử lý nguyên nhân Intro im lặng.
* Bước chân có ba biến thể; J1/J2/J3, dodge và ném băng keo có nhiều biến thể; bổ sung âm nhảy, tiếp đất và gia cố kiện riêng.
* Kiện dễ vỡ bị giới hạn tối đa 10% mỗi hit. Stage 1 truyền đúng `parcelProfile` vào phép tính thay vì vô tình dùng profile tiêu chuẩn.
* Băng gia cố hồi 15%, có drop đảm bảo ở Miniboss/Boss và chỉ hồi đến 90%; kiện nguyên vẹn 100% không bị phép sửa làm giảm xuống.
* Hóa đơn đếm đồng bộ Công gốc − Khấu trừ + Thưởng = Tổng, loại bỏ trạng thái trung gian nhìn như sai số học.
* Bộ âm thanh có script sinh deterministic `npm run audio:build`; không phụ thuộc tệp có bản quyền bên ngoài.
* Kiểm định hiện tại: 156/156 automated tests PASS; lint, build, combat probe và benchmark PASS. Browser rendering FPS và cảm nhận mix trên loa/tai nghe vẫn cần playtest người thật.

## V16 — lịch sử vòng lặp gameplay

Đọc `V16_QA_REPORT.md` và `AI_STUDIO_HANDOFF_V16.md` trước khi tích hợp. V16 khép kín vòng lặp trả nợ, thêm kiện bị đánh sau lưng, loot hút, Perfect Dodge/counter window, phản đòn chống spam, bước chân và ambience. Test suite hiện tại: 115/115 PASS. Browser FPS, âm lượng thực tế và cảm giác chơi vẫn cần xác nhận trong Live Preview.

## V15 — lịch sử ổn định hóa

Đọc `V15_QA_REPORT.md` và `AI_STUDIO_HANDOFF_V15.md` trước khi tích hợp. V15 sửa render, tutorial, chống khóa đòn và UI; không tác giả lại ảnh hoặc mở Stage 2. Test suite: 109/109 PASS. Browser FPS và cảm giác chơi chưa được xác nhận trên bản AI Studio của bạn.

Các mục V14 trở xuống là lịch sử thay đổi, không phải kết quả nghiệm thu mới.

## HD Player Production V14

* Tác giả lại đủ 12 trạng thái của Hội Khờ ở độ phân giải cao: `idle`, `run`, `jump`, `fall`, `land`, `dodge`, `j1`, `j2`, `j3`, `hurt`, `ko`, `getup`.
* Toàn bộ strip là PNG RGBA thật, có nền trong suốt; pipeline loại checkerboard và mảnh ảnh thừa mà không phóng nội suy sprite 96 px cũ.
* Manifest V2 dùng kích thước, anchor và display scale riêng cho từng state để chân bám cùng mặt sàn và chiều cao thị giác ổn định.
* J3 là cú đánh dùng máy quét cổ tay gắn liền với cánh tay; không còn đạo cụ súng rời hoặc vòng xanh thường trực.
* Runtime ưu tiên `/assets/staging_hd/player`; nếu bất kỳ file HD nào lỗi preload/validation, toàn bộ Player tự động quay về bộ ổn định `/assets/staging/player` theo cơ chế atomic fallback.
* HUD Shipper Status được thu gọn; hộp thoại dùng portrait crop bán thân để không còn hình toàn thân bị ép/cắt thô.
* Kiểm định tự động: 100/100 PASS; TypeScript lint và production build PASS. Browser rendering FPS và cảm giác animation liên tục cần xác nhận lại trong Live Preview.

## Production Presentation V13

* Chú Tư dùng ảnh RGBA production 1024×1536 thay cho khối xanh cuối Stage; tải lỗi sẽ fallback an toàn.
* Hội thoại Cô Ba, Hội Khờ, Chú Tư và Chó Đại Ca tự lấy chân dung đúng người nói; Hệ Thống vẫn dùng layout không chân dung.
* KO của mọi kẻ địch hạ 2 px riêng ở lớp hình ảnh, bỏ viền làm sáng mép dưới và dùng contact shadow rộng/dẹt để xác nằm sát sàn. Physics, collider và anchor manifest không đổi.
* HUD mới dùng khung tương phản cao, header “ca đang chạy”, thanh inset và mission chip; Q READY vẫn có pulse.
* Canvas tiếp tục dùng high-quality smoothing và pixel-snapped anchor. Đây là lựa chọn cân bằng cho bộ sprite 96 px hiện tại; muốn đạt độ nét ngang Cô Ba cần tác giả lại trọn bộ Player ở 192×192, không thể tạo chi tiết thật bằng filter.
* Regression suite: 95/95 PASS, gồm kiểm tra alpha Chú Tư, preload/fallback portrait và KO contact plane.

## UI & HD Animation Foundation V13.1

* Thu gọn Shipper Status còn 320×116; giảm viền/bóng và chỉnh lại grid icon–bar–value.
* Hộp thoại thấp hơn, portrait dùng bust crop thay vì nhét ảnh toàn thân vào khung.
* Asset contract V2 hỗ trợ `frameWidth`, `frameHeight`, `anchorX`, `anchorY` riêng theo state, đồng thời tương thích hoàn toàn manifest V1.
* Kèm `public/assets/staging/player_hd_candidate/player_master_hd_v3.png` làm master RGBA cho pipeline animation mới.
* Foundation này đã được hoàn thiện và kích hoạt trong V14 sau khi 12/12 strip HD vượt asset gate.
* Regression suite tại thời điểm foundation: 96/96 PASS; bản V14 hiện tại: 100/100 PASS.

## Visual Integration V12.1

* Chống Sốc Gia Cường không còn vòng xanh thường trực; shield arc chỉ xuất hiện 160ms khi parcel damage thực sự được giảm.
* Scanner Pro J3 là máy quét cổ tay dựng dọc và scan fan barcode trong active frame 2–4, loại bỏ silhouette giống súng.
* Stage 1 tăng visual scale có kiểm soát: Human 1.3x, Dog 1.16x, Boss 1.1x; toàn bộ physics/hitbox giữ nguyên.
* Production sprite dùng silhouette outline 2px và contact shadow; background gần giảm saturation/brightness để tái lập thứ bậc thị giác.
* Regression suite có contract chống persistent equipment ring, scanner prop ở recovery và mất các lớp actor separation.

## Pixel Clarity & J3 Cleanup V12.2

* Xóa pixel badge balô ghép rời vì anchor không thể khớp ổn định trên toàn bộ animation; trạng thái trang bị vẫn hiển thị ở HUD và qua shield event thật.
* Xóa hoàn toàn scanner prop khỏi J3. Sprite giữ cú đấm gốc, chỉ thêm sweep cong trong frame 2–3.
* Sprite canvas tắt smoothing và canvas DOM dùng `image-rendering: pixelated`.
* Scale được chuẩn hóa về nấc quarter/half: Hub 1.5x, Stage human 1.25x; physics và hitbox không đổi.

## Balanced Sprite Rendering V12.3

* Hủy nearest-neighbour kép của V12.2 vì sprite 96×96 bị phóng thành pixel block lớn.
* Dùng high-quality Canvas smoothing và CSS `image-rendering: auto`.
* Snap anchor sprite về pixel nguyên để giảm shimmer khi camera hoặc entity nằm ở tọa độ lẻ.
* Giảm contrast outline từ 2px xuống 1px; visual scale và toàn bộ gameplay logic giữ nguyên.

## Stage 1 Saigon Parallax Production V1

* 4 lớp ảnh: hoàng hôn/skyline (0.08×), nhà ống (0.22×), cột điện/hoa giấy (0.36×), vỉa hè/mặt đường (1.00× world alignment).
* Texture dùng mirror-repeat để mép lặp khớp; lớp gần chạy chậm hơn thiết kế ban đầu để giảm cảm giác đối xứng lặp lại.
* Mặt đường chỉ phủ đúng các ground segment; hố, hazard và collision vẫn dùng geometry gốc.
* Preload theo cơ chế all-or-nothing. Thiếu hoặc decode lỗi bất kỳ layer nào sẽ trả toàn bộ Stage 1 về nền graybox an toàn.
* Không thay đổi world size, camera bounds, platform, hazard hoặc physics.

## World Geometry Skin V1

* 3 platform modular: mái tôn (Zone A/E), cầu gỗ (Zone B/D), ban công thép (Zone C).
* Cổng encounter production dùng rào xếp sắt có đèn cảnh báo; chỉ hiện khi gate đang khóa.
* Hazard production dùng hố sụt đường; hình mở rộng lên mặt đường nhưng collision vẫn giữ nguyên 80×30 ở đáy.
* Asset preload all-or-nothing; nếu thiếu hoặc decode lỗi sẽ quay về rectangle/laser/hazard graybox cũ.
* `DEV_MODE` mặc định OFF và React/renderer dùng cùng một state callback; phím F1/backquote và nút UI luôn đồng bộ.
* Footer đã đổi từ nhãn `Pure Geometric Graybox` lỗi thời sang `Production Art + Safe Fallback`.

## Chó Hẻm Production V1

* 6 visual states: `idle`, `approach`, `telegraph`, `dash`, `hurt`, `ko`.
* Animation timer thật được reset khi đổi state; không còn đứng cứng ở frame đầu.
* Telegraph màu cam hiển thị vùng nguy hiểm trước cú húc; sprite dash chỉ bắt đầu khi AI chuyển sang pha tấn công.
* KO non-loop giữ pose nằm đất ở frame cuối, không tạo cảm giác sống lại bằng hình.
* Không thay đổi HP, damage, hitbox, knockback, tốc độ, thời lượng telegraph/dash/recovery hoặc AI decision logic.
* Nếu manifest/PNG/decode/dimension validation lỗi, riêng Chó Hẻm tự fallback về renderer hình khối.

## Chó Đại Ca Production V1

* 7 visual states: `idle`, `chase`, `bite`, `dash`, `slam`, `hurt`, `ko`.
* Telegraph runtime riêng cho cắn (vùng cắn), lao (hành lang lao) và dậm (vùng đáp).
* Animation timer reset tại từng pha telegraph/active/recovery; active và recovery bắt đầu đúng đoạn frame tương ứng.
* Không thay đổi HP, damage, hitbox, knockback, tốc độ, cooldown, phase threshold hoặc AI decision logic.
* Boss tự fallback về renderer hình khối nếu manifest/PNG/decode/dimension validation thất bại.
* V1.1: sửa state timer của `BITE_ACTIVE` để boss luôn thoát sang recovery và tiếp tục chu kỳ tấn công.

## Progression & Bộ Đồ Nghề Shipper V2

* Enemy rơi `Linh Kiện`; số linh kiện và đồ đã mua tồn tại xuyên Hub/Stage/Result trong phiên chơi.
* Tại Hub, đến `Bàn Đồ Nghề` và nhấn `E`; dùng `A/D` chọn node, `E` mua/trang bị, `Esc` đóng.
* Có 12 node thuộc bốn nhánh J/K/L/Q. Tier 1 dùng hiệu ứng nền; Tier 2 mở bằng Uy tín sau khi hoàn thành Stage 1.
* Hai biến thể Tier 2 cùng nhánh có thể sở hữu đồng thời nhưng chỉ một biến thể được trang bị, tránh cộng dồn mất cân bằng.
* Gậy Pro: J3 tăng từ 35 lên 44 damage (+25%, làm tròn).
* Băng Keo: projectile K trúng địch làm giảm 45% quãng đường di chuyển trong 1.5 giây; status tự hết và không sửa state AI.
* Balo: giảm 35% damage lên kiện hàng; không giảm damage HP của Player.
* Khi chưa mua, toàn bộ damage/movement/parcel balance giữ nguyên.

### Visual Equipment Production V1.1

* Gậy Quét Mã Pro xuất hiện trực tiếp trên tay trong animation J3, kèm cyan scan trail ở active frames.
* Băng Keo Siêu Dính có projectile sprite riêng, cyan trail và vòng keo dưới mục tiêu đang bị slow.
* Balo Phản Quang gắn badge phát sáng theo anchor của từng nhóm pose Player, bao gồm dodge/KO/getup.
* HUD Stage hiển thị ba equipment slot: xám khi chưa mua, cyan khi đã trang bị.
* Progression được lưu bằng versioned `localStorage` key `hoi_kho_progression_v2`; save `hoi_kho_toolkit_v1` tự migrate và giữ nguyên linh kiện/đồ đã mua.

## Game Feel V1

Combat feedback chỉ kích hoạt sau khi `CombatSystem.evaluateHitbox()` xác nhận
ít nhất một mục tiêu thực sự nhận damage.

* J1: hit-stop 65ms, shake 2px, 6 impact particles.
* J2: hit-stop 80ms, shake 3px, 8 impact particles.
* J3: hit-stop 110ms, shake 5px, 11 impact particles.
* Ultimate: hit-stop 130ms, shake 8px, 14 impact particles.
* Băng keo K: hit-stop 40ms và feedback nhẹ.
* Player nhận damage: hit-stop 70ms, shake 4px và impact đỏ.
* Đánh hụt: không hit-stop, không shake, không flash, không particle.
* Nhấn `F1` hoặc phím backquote để bật/tắt debug overlay khi quay clip.

Ghi chú lịch sử: hạn chế SFX của bản này đã được thay thế bởi Audio Pack V19.2.

## Enemy Production Pack V1

* Shipper Đối Thủ dùng 5 state sprite production: idle, approach, attack, hurt, ko.
* Đầu Gấu dùng 6 state sprite production: idle, chase, heavy, charge, hurt, ko.
* Attack strip được chia theo ba phase 2-frame: telegraph, active, recovery; animation clock reset khi đổi phase.
* Telegraph nguy hiểm được vẽ độc lập với sprite để vẫn rõ vùng đòn và hướng tấn công.
* Rival và Thug được validate/promote độc lập; một bộ lỗi chỉ fallback bộ đó, không chặn nhân vật còn lại.
* Sửa regression AI Đầu Gấu: `HEAVY_ACTIVE` giảm timer đúng cách và luôn đi tiếp sang recovery/idle.
* Nhãn phase/graybox thử nghiệm đã được bỏ khỏi giao diện production; thông tin fallback chỉ còn trong Dev Mode.

## SFX Runtime V1

* Web Audio runtime có unlock theo thao tác người chơi, master volume, per-SFX cooldown và pitch variation nhẹ.
* Swing và confirmed-hit là hai channel độc lập; đánh hụt không phát impact SFX.
* Đã nối âm cho J1/J2/J3/Ultimate, băng keo, dodge, Player hurt, enemy telegraph/KO, pickup, gate và hoàn tất đơn.
* Runtime ưu tiên file OGG production trong `public/assets/audio/sfx/`; thiếu file sẽ dùng synth fallback để game không mất feedback.
* Brief tạo đủ 18 file production nằm tại `AI_STUDIO_AUDIO_BRIEF_V1.md`.

## 2. Hướng dẫn Chạy Kiểm tra (Test Suite & Lint)

### Yêu cầu môi trường
* Node.js v18+ hoặc Bun v1.0+

### Chạy Linter (Type check)
```bash
npm run lint
```
*Lệnh thực thi:* `tsc --noEmit`

### Chạy Unit Test Suite
```bash
npm run test
```
*Lệnh thực thi:* `tsx src/game/tests/runTests.ts`
*Bộ test bao gồm:*
1. 12 bài test Pipeline (Chữ ký nhị phân PNG, All-or-nothing gating, Animation timer resets, Combo step resets, Loop frame wrapping, Non-loop frame clamping, Land transition, Hitbox regression, Getup reachability audit).
2. 6 bài test Synthetic Asset Validator (Kiểm tra schema manifest, kích cỡ strip, từ chối strip sai kích thước, từ chối ảnh 0x0, từ chối set thiếu trạng thái).
3. 8 bài test Game Feel/SFX (miss gating, audio routing, J1/J3 profile, hit-stop release và camera shake reset).
4. 4 bài test Boss Dog Production (manifest 7 state, PNG/dimension contract, animation phase timer và full bite-state recovery).
5. 10 bài test Progression V2 (economy, Tier/Uy tín, lựa chọn loại trừ, runtime modifiers, V1 migration, PNG visual assets và save/reload).
6. 4 bài test Chó Hẻm Production (manifest 6 state, PNG/dimension contract, animation timer và full telegraph/dash recovery).
7. 3 bài test Stage 1 Parallax (PNG/dimension contract, depth factor ordering và tile offset wrapping).
8. 3 bài test World Geometry (PNG/dimension contract, zone skin mapping và Dev Mode default).
9. 8 bài test Rival & Thug Production (manifest, PNG/dimension contract, animation clock và full attack recovery chống freeze).

### Chạy Simulation Benchmark
```bash
npm run benchmark
```
*Lệnh thực thi:* `tsx src/game/tests/benchmark.ts`

### Build Production
```bash
npm run build
```
*Lệnh thực thi:* `vite build`

## 3. Cấu trúc Thư mục Chính
* `src/game/assets/`: Module quản lý và xác thực asset (AssetManager, AssetValidator, VisualStateMapper, contracts).
* `src/game/entities/`: Các thực thể trò chơi (Player, Dog, Rival, Thug, BossDog, NPC, Projectile, Pickup).
* `src/game/config/`: Cấu hình cân bằng gameplay (`balance.ts` — Coyote time = 0.1s, Jump buffer = 0.12s), cấu hình màn chơi (`stage1.ts`).
* `src/game/tests/`: Bộ mã kiểm định và benchmark tự động.
* `public/assets/staging/`: Thư mục chứa manifest và các tệp sprite staging.
* `PLAYER_ASSET_QA.json`: Báo cáo chi tiết trạng thái kiểm định từng tệp asset.
