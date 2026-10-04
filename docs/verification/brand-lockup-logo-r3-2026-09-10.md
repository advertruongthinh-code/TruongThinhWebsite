# Kiểm chứng LOGO-R3: tỷ lệ chữ gồm dấu

- Ngày: 2026-09-10.
- Contract: [Brand lockup](../../design-system/components/BrandLockup/README.md).
- Owner duyệt delta trong [card AD-BROWSE-R1](https://app.notion.com/p/3d6332849a0e8124af03c79f3c2e8406), yêu cầu làm song song với plan grid đã duyệt.
- Trạng thái: main nghiệm thu kỹ thuật LOGO-R3 sau independent review, native UI và 45/45 focused runtime checks. Owner preview còn mở; không dùng subset này làm PASS toàn site.

## Reference trực tiếp

Main và agent mở [Espacio Projects](https://espaciohomedesign.com/en/projects)
bằng Chrome DevTools, DPR 1, chờ `document.fonts.ready`; đo expanded ở đầu
trang, sticky sau cuộn và full menu sau mở. Đây là số đo reference, không phải
kích thước ngang áp đặt cho logo Trường Thịnh.

| Viewport | Expanded W × H | Sticky W × H | Menu W × H |
| --- | --- | --- | --- |
| 390 | 145 × 57.59375 | 125 × 49.640625 | 150 × 59.578125 |
| 768 | 145 × 57.59375 | 125 × 49.640625 | 150 × 59.578125 |
| 1024 | 145 × 57.59375 | 125 × 49.640625 | 150 × 59.578125 |
| 1440 | 170 × 67.515625 | 125 × 49.640625 | 170 × 67.515625 |

Áp dụng outer height theo state; chiều ngang theo aspect ratio tự nhiên của
lockup Trường Thịnh. Expanded tại ≤767px tăng từ 49.640625 lên 57.59375px;
sticky/menu giữ height. Header track và vị trí navbar giữ contract đã khóa.

## Phép đo và thay đổi

Font Plus Jakarta Sans 600, đúng copy VI/EN; Canvas đo nguyên dòng ở 1000px
để tính ink height, gồm dấu. Với H = 153.667 SVG unit, Y = H/6 và g = 1.125Y,
giải `h_title + g + h_subtitle = 4Y`, `h_title / h_subtitle = phi` cho ink
title 45.507143, subtitle 28.124961. Không lấy font-size ratio làm ink ratio.

| Dòng | Font-size | Baseline x / y | textLength |
| --- | --- | --- | --- |
| Title | 36.86655 | 203.05517 / 88.50525 | 392.86637 |
| Subtitle VI | 21.95119 | 201.34023 / 148.70551 | 393.38262 |
| Subtitle EN | 35.99995 | VI + translate(-1.09756, 4.23932) | 393.38262 |

`lengthAdjust="spacing"` cân rộng bằng tracking, giữ hình glyph. Hai locale
dùng chung textLength; sai lệch mép được đo riêng trong tolerance 0.5 CSS px.
SVG viewBox `0 25.4515 594 153.667` chứa trọn mark và dấu. Đồng bộ SVG asset
và mười inline instance của năm route public. `motion.js` không đổi: FLIP
hiện có tự chạy khi bbox expanded/sticky khác nhau, gồm mobile sau đổi height.

Review phát hiện bản đầu rộng 245.12px ở mobile chỉ cách icon menu 2.39px tại
viewport 320px; main tái hiện native. Thu gọn tracking cho ink title rộng 390
SVG unit, không đổi chiều cao hoặc shape glyph. Bản final dùng width tự nhiên
260.981741px ở desktop, 222.62872px ở mobile/tablet, sticky 191.885904px và menu
nhỏ 230.299324px. Header track/navbar không đổi. Regression mới kiểm VI/EN tại
320px: icon clearance ít nhất 24px, hitbox không chồng và không tràn ngang.

## Regression và giới hạn

Native measurement trước sửa cho thấy ratio ink khoảng 1.55884 thay vì phi,
khối chữ cao 55.70 CSS px thay vì 45.01px tại desktop. Build đầu sau thay
geometry đạt ratio nhưng CSS `x/y` trên SVG text không được Chromium áp dụng:
logo geometry 15/21 PASS, sáu lỗi EN. Main đổi đúng lớp CSS sang `transform:
translate(...)`; không nới tolerance hoặc đổi oracle sang tọa độ source.

Artifact cục bộ của task nằm tại
`.tmp/orchestration/advertising-one-column-logo-20260910/`; baseline, report
và JSON lưu riêng cho từng build. Main đã đọc report, đối chiếu source/output
và kiểm native trước kết luận.

| Gate | Kết quả | Artifact/lệnh |
| --- | --- | --- |
| Geometry nguyên dòng VI/EN, header/menu và locale lifecycle | 21/21 PASS | `logo-final-geometry/latest.json`; `TT_E2E_BRAND_LOCKUP_ONLY=1` |
| Outer bbox, FLIP desktop/mobile, reduced motion và clearance VI/EN 320px | 13/13 PASS | `logo-final-bbox-v3/latest.json`; `TT_E2E_BRAND_HEADER_BBOX_ONLY=1` |
| Màu mark/header/menu, interrupt, navigation và cleanup | 11/11 PASS | `logo-final-color/latest.json`; `TT_E2E_BRAND_COLOR_ONLY=1` |
| Build/static | PASS | `pnpm prepare:site`, `pnpm qa:static` |
| Independent review | PASS | `logo-review.md`; bốn finding đã xử lý, main kiểm source và runtime |
| Impeccable layout detect | PASS trong scope | CLI exit 0, `[]` cho canonical SVG và style.css |

Ba flag runtime dùng terminal mới với `node tests/site/site.e2e.cjs`,
`BASE_URL=http://127.0.0.1:8787` và `TT_E2E_REPORT_DIR` trỏ artifact riêng.
Static checker so sánh geometry attributes của mười SVG inline với asset
canonical, gồm path, font, viewBox và textLength. Oracle runtime đo ink độc
lập; không thay bằng expected source coordinates.

Hai lượt bbox trước final bắt sai thời điểm khi font vừa làm chạy FLIP,
rồi chờ literal `transform: none` dù trình duyệt trả identity matrix. Final
dùng cùng điều kiện numeric identity của gate bbox hiện hữu; tất cả ngưỡng
height/clearance giữ nguyên. Lịch sử RED được giữ, không báo thành lỗi runtime.

Native Chrome EN 320px, sau font và motion ổn định: height 57.59375px,
ink ratio 1.61803411, Y 9.59879684px, gap 10.79862704px,
body 38.39521056px, padding trên/dưới 9.59877620/9.59879431px.
Icon clearance 24.875px, hitbox clearance 9.875px, overflow 0. Main xem thêm
detail VI 1440px, DOM/computed style/a11y/screenshot và console/network;
console không error/warn, các document/script/stylesheet/font được kiểm HTTP 200.

SHA-256 source/output cuối khớp:

- Style: `88cdba9847eb6c4999b94e1cffce2e3307a3e2ed2d6dc3b1fe98746fcb0e79bf`.
- Canonical SVG: `319ee29866d85d3dc72fc67cf85ba05854f20942bf14014c8f24c5dad2382d9b`.
- `motion.js`: `31df973bab4f5d1a80a2e87a727d5c772b184d2e6edea1e5ec61cd0e5544addf`, không đổi so với baseline task.

Giữ font, copy, bốn path mark, màu và lifecycle menu. Không thay Worker, CMS,
asset ảnh sản phẩm, route, CTA hoặc font delivery. Owner preview và acceptance
toàn website vẫn tách khỏi scoped verification này.

## Delta typeset AD-FINAL-R1 — 2026-09-13

Owner đã duyệt spec/plan T08–T09. Delta giữ mark bốn path, viewBox,
footprint, Plus Jakarta Sans600, copy và motion; đổi vị trí/cỡ/tracking của
hai dòng. Interline1,5Y thay lựa chọn triển khai1,125Y lịch sử; phi, khối ink4Y
và paddingY giữ nguyên. Đồng bộ10 inline consumer của Home/About/Residential/
Commercial/Advertising theo hai batch. Không dùng kết quả45/45 lịch sử trên
để gọi delta mới đã đạt.

Source hiện tại và output sau `pnpm prepare:site` khớp:

- SVG: `54A9B6A718579DF07151DB2F4F6025DEE8335BAD9AC079EFAC3422C1402C5707`.
- CSS: `D6834D0702198D8EA2DBA15A359CE7D6B986D3BABFF667B7BB95C6D5474443D3`.
- Test sau bổ sung clearance tối thiểu0,5CSSpx:
  `6F213230A9C80FE10BD2CE28DC4A458E4D135A4586354F556BEA551B04CB9CBE`.

Build/static exit0; scoped logo runtime cuối21/21PASS. Ma trận stress108
states và bổ sung88states PASS; hai lượt có lặp lại font/zoom, không gọi196
viewport khác nhau. Tổng43 bề rộng320–2560px, bao gồm1569×912/1922×912 và
hai phía breakpoint header/menu360/578/680/750/960/980/1024/1200/1440.
Đo top/menu VI/EN, font bị chặn, font tải chậm rồi FontFaceSet xác nhận đã
loaded. Zoom200% là layout emulation960CSSpx×DPR2 cho1920physicalpx,
không phải thao tác native browser zoom. Clearance phải thấp nhất1,151971CSSpx.

Review Astra độc lập không thấy P0–P2. EN spacing compression giảm từ12,94%
xuống0,767% khi font thật; fallback17,01% xuống5,413%. Main xem ảnh trước/sau
1922×912 và fallback/slow390px: dấu trọn, hai dòng tách rõ, subtitle EN thoáng
hơn. Ảnh trước được dựng bằng đúng text attributes/CSS baseline trong DOM
QA; không sửa source để chụp, không thay đổi kích thước hoặc nội dung khác.

Artifact local tại `.tmp/orchestration/advertising-final-r1-exec-20260913/t08/`:
`runtime-final/latest.json`, `stress.json`, `stress-supplement.json`,
`assessment.md`, `review.md`, cặp `en-before-1922.png`/`en-after-1922.png`
và VI tương ứng. Hai lượt stress incomplete được giữ: lần đầu chặn cả font
stylesheet làm parser chờ; lần sau Playwright screenshot chờ font đang được
test cố tình giữ. Harness cuối giữ riêngfont file và chụp bằng CDP; không
nới ngưỡng source hoặc geometry.

Native scroll/re-click cuối4/4PASS: VI/EN tại390/1922px. Hai lượt incomplete
giữ lịch sử. Trace độc lập chứng minh desktop smooth-scroll chỉ nhận108px
logical từ wheel1000, rồi wheel ngược đưa về0; thước đo ban đầu giả định
native delta là logical delta. Harness cuối gửi đủ wheel để vượt500px thực,
giữ assertion compact/unhidden/ink và re-click vềtop; không đổi runtime.
Xem `navigation.json` và `navigation-diagnostic.json`. Đây là điều chỉnh
input của test trong authorization hiện có, không cần owner chọn ngưỡng mới.

Main nghiệm thu kỹ thuật Checkpoint C cho delta T08/T09 với các giới hạn
headless/emulation nêu trên. Chrome DevTools1922×912 mở EN About từ output
thật: font loaded12 faces, title32.05787, đúng subtitleEN, không overflow
ngang. Preview EN About đã gửi vào Codex, tool trả queued. Owner preview
và full-site acceptance vẫn tách khỏi focused evidence này; không đóng
toàn logo card cũ hoặc card hợp nhất.

## Delta logo gọn D17 — 2026-09-13

Owner xác nhận khối chữ4Y, trên/dưới markY và cách ngang markY; cho phép
cân cỡ title/subtitle/gap. Mọi ink bounds gồm dấu. Cân mới title2,25Y,
subtitle0,95Y, gap0,8Y thay phi/gap1,5Y của T08; gap giảm46,7%.
Font Plus Jakarta Sans600, copy, bốn path, footprint và motion giữ nguyên.

Canonical SVG và mười inline consumer đồng bộ: title font46,68365,
baseline203,05517/98,47574, textLength390,63185; subtitleVI font18,98974,
baseline201,57159/149,35333, textLength389,43067. EN font31,14318,
translate(-0,94949;3,66739). Hai dòng cân mép trong tolerance0,5CSSpx.

- Build/static PASS. Runtime logo21/21 PASS trên năm routeVI/EN, header/menu.
- Stress108 trạng thái PASS:24 bề rộng320–2560px, font chặn/tải chậm,
  trước/sau font ready, menu và mô phỏng layout zoom200%. Không clip ink
  hoặc chồng dấu. Đây là headless/zoom emulation, không phải proof mọi
  browser hay native zoom. Evidence `.tmp/orchestration/logo-compact-d17-20260913/`.
- Native Chromium: VI stacked1569×912 và EN mobile390×844 đã xem screenshot;
  tên nổi bật hơn, khoảng dòng gọn, dấu hiện trọn. CODE review PASS,
  requested Astra/high, effective unknown; owner visual acceptance còn riêng.
- Impeccable detect: cảnh báo Plus Jakarta Sans là family phổ biến và sizeEN
  ngoài type ramp. Đây là font owner khóa và cỡ từ hình học SVG đã ghi trong
  DESIGN; các cảnh báo typography ngoài logo không thuộc delta này.
- SHA256 SVG `EBF767B7270436A94C4E7457BA9F35AF09B0605BB18D66D6BFF6A4FBA32EA6A8`;
  style.css `3E11FFDDC02D6C1AB56A0823468300D208FFD43C7C983F5722E4846845B0B8D5`.

Lần chạy runtime đầu dùng nhầm default4173, connection refused0/21;
đã chạy lại đúng preview8787 và đạt21/21. Không dùng run lỗi làm kết luận UI.
Evidence T08/T09 phía trên giữ lịch sử, không đại diện typography D17.

## Chú thích thuật ngữ

- **Ink bounds**: hộp bao nét chữ thật, gồm dấu.
- **Outer height**: chiều cao hộp CSS toàn logo.
- **CTM**: ma trận đưa tọa độ SVG về tọa độ render.
- **FLIP**: nội suy giữa hai hộp layout bằng transform.
- **Scoped verification**: kiểm chứng trong phạm vi thay đổi được nêu.
