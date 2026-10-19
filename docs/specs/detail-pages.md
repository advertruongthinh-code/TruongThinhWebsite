---
title: Trang Residential, Commercial và About
status: live
source:
  - src/site/residential/**
  - src/site/commercial/**
  - src/site/about/**
  - src/site/detail.js
  - src/site/detail.css
tests:
  - tests/site/site.e2e.cjs
  - tests/site/static-locales.test.mjs
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/mobile-layout-parity.e2e.mjs
  - tests/site/cross-browser.smoke.spec.cjs
notion: https://app.notion.com/p/3ef332849a0e81f3ad86f1fd913afab7
updated: 2026-10-19
---

# Trang Residential, Commercial và About

## Mục đích

Ba trang con `/vi/residential/`, `/vi/commercial/`, `/vi/about/` (EN tương đương, mỗi trang một file
`src/site/<trang>/index.html`) dùng chung `detail.css`, `detail.js`. Residential, Commercial giới thiệu một lĩnh vực
nội thất; About kể cách làm của Trường Thịnh; cả ba kết bằng lời mời Zalo trong `.detail-cta`. Header, menu, footer, veil, scroll thuộc
[shell](site-shell.md); build, route locale thuộc [phát hành tĩnh](static-release.md); file ảnh, vệt sáng chờ ảnh thuộc
[tải ảnh](media-delivery.md); phần Advertising trong hai file chung thuộc spec Advertising.

## Hành vi

### R1. Head, file và script

`title` có `data-en`: "Không gian Nhà ở — Trường Thịnh" ("Residential spaces — Trường Thịnh"), "Không gian Kinh doanh
— Trường Thịnh" ("Commercial spaces — Trường Thịnh"), "Giới thiệu Trường Thịnh — Hơn 20 năm vững nghề" ("About Trường
Thịnh — 20+ Years of Craft"). Head còn `meta description` VI kèm `data-en-content`, `theme-color` trắng, favicon,
preload hai font, CSS Locomotive chỉ từ 981px, `style.css`, `detail.css`, script `route-enter`, `__ttMotionBoot`
([shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)); không canonical, alternate, Open Graph,
JSON-LD. `body.detail-page` (About thêm `about-page`) có `data-detail-hero-profile` `words-09` (Residential, About) hoặc
`zoom-09` (Commercial); namespace Barba là tên trang. Script `defer`: GSAP, SplitText, Locomotive, Barba, `detail.js`,
`motion.js`; Swiper chỉ tải động cho gallery (R7). Build ghi `/vi/`, `/en/` từ cùng file ([phát hành R5](static-release.md#r5-văn-bản-song-ngữ-và-route-locale)).
Vào hoặc rời About đi route mềm như các trang khác ([shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell)).

```gherkin
Given output đã build
When mở /en/commercial/
Then html có lang="en", title "Commercial spaces — Trường Thịnh", hero profile zoom-09, detail.js trước motion.js
```

### R2. Residential và Commercial: section và nội dung

`main#noi-dung` có một `h1`, mười một khối theo bảng (VI; EN ở `data-en`; Tone là `data-header-tone`), sau `main` là
footer ([shell R10](site-shell.md#r10-floating-cta-và-footer)); không có lời mời `.site-invitation` vì `.detail-cta` đã
mời (owner chọn 2026-10-11). Ảnh hero `fetchpriority="high"`, ảnh khác lazy; copy hero do owner duyệt.

| # | Khối | Residential | Commercial | Tone |
| --- | --- | --- | --- | --- |
| 1 | `.hero#top` | Kicker "NHÀ PHỐ · CĂN HỘ · HOMESTAY", `h1` "Nơi tái tạo / năng lượng sống" | "SHOP · F&B · SHOWROOM · VĂN PHÒNG", "Thiết kế tối ưu / Vận hành bền bỉ" (bố cục chữ theo [chữ hero](hero-typography.md)) | inverse |
| 2 | `.detail-intro#tong-quan` | `h2` "KHÔNG GIAN ĐỂ SỐNG", đoạn mở | "KHÔNG GIAN KINH DOANH", đoạn mở | ink |
| 3 | `figure.detail-media` | Ảnh `residential-detail` | Ảnh `commercial-active` | ink |
| 4 | `.detail-note` | `h2.sr-only` "Một ngôi nhà được kiểm chứng mỗi ngày", một câu | "Bằng chứng trong vận hành", một câu | ink |
| 5 | `.detail-gallery#cong-trinh` | `h2` "Một ngôi nhà, nhiều *lớp.*", 36 `figure`, năm chuỗi công trình (R7) | "Không gian *tiêu biểu.*", 15 `figure`: tám ảnh lẻ, chuỗi "Văn phòng chia sẻ" (R7) | ink |
| 6 | `.detail-heading#quy-trinh` | Eyebrow "MỘT NHỊP XUYÊN SUỐT", `h2` "Từ nếp sống / đến ngôi nhà hoàn thiện." | Cùng eyebrow, `h2` "Từ mặt bằng / đến ngày mở cửa." | ink |
| 7 | `.editorial-strip` | Năm bước một hàng: Khảo sát, Tư vấn, Sản xuất, Lắp đặt và bàn giao, Hậu mãi (R8) | Cùng năm bước, mô tả riêng | ink |
| 8 | `.detail-duo` | `h2.sr-only` "Vật liệu và tay nghề", hai ảnh | Như Residential | ink |
| 9 | `.portal-stage#loai-hinh` | Ba portal: Nhà phố, Căn hộ, Homestay | Shop / Showroom, F&B / Cafe, Workspace / Văn phòng (EN "Workspace / Office") | ink |
| 10 | `.detail-cta#tu-van` | "CÓ MỘT NGÔI NHÀ? / Mời chúng tôi đến xem.", nút "Gọi Zalo tư vấn" | "CÓ MẶT BẰNG? / Đặt lịch khảo sát." | inverse |
| 11 | `.capability-marquee` | Loại hình, năng lực nhà ở | Loại hình, năng lực kinh doanh | ink |

```gherkin
Given output đã build
When mở /vi/residential/ và /vi/commercial/
Then mỗi trang có một h1 và mười một khối theo thứ tự bảng, gallery lần lượt có ba mươi sáu và sáu figure
```

### R3. About: section và nội dung

`main` có một `h1` và các khối theo bảng; ba chương mở bằng `.detail-heading` (eyebrow số La Mã, `h2` hai dòng).

| # | Khối | Nội dung (VI) | Tone |
| --- | --- | --- | --- |
| 1 | `.hero.about-hero#top` | Ảnh `legacy-team` trang trí (`alt=""`), không kicker (owner 2026-10-18), `h1` "Vững nghề. / Vững niềm tin." | inverse |
| 2 | `.about-opening#mo-dau` | "MỘT CÁCH LÀM, KHÔNG CHỈ LÀ KHẨU HIỆU", đoạn mở | ink |
| 3–5 | `#di-san`, ảnh `legacy-hands`, `.about-timeline` | "I. DI SẢN", `h2` "Hơn 20 năm / vững nghề."; hai mốc "Hơn 20 năm trước", "Hôm nay" (R9) | ink |
| 6–10 | `#cach-lam`, chapter lead, ảnh `design-sketch`, `.detail-process`, `.about-process-note` | "II. CÁCH LÀM", `h2` "Mỗi công trình bắt đầu / bằng một cuộc khảo sát đúng."; lead "TRƯỚC KHI CÓ BẢN VẼ"; năm bước Khảo sát, Tư vấn, Sản xuất, Lắp đặt, Hậu mãi | ink |
| 11 | `.detail-duo` | `h2.sr-only` "Vật liệu và cách làm", ảnh `materials`, `cnc-operator-b` | ink |
| 12–15 | `#cam-ket`, chapter lead, ảnh `workshop-wide`, `.about-commitments` | "III. CAM KẾT", `h2` "Làm chắc / để đi đường dài."; lead "VIỆC LÀM ĐỨNG SAU LỜI NÓI"; ba cam kết | ink |
| 16 | `.detail-cta#tu-van` | "BẮT ĐẦU TỪ MẶT BẰNG / Mời chúng tôi đến khảo sát.", nút "Trao đổi qua Zalo" | inverse |
| 17 | `.capability-marquee` | Giá trị và cách làm | ink |

```gherkin
Given output đã build
When mở /vi/about/
Then main có một h1 "Vững nghề. Vững niềm tin.", ba chương I, II, III, năm bước quy trình và ba cam kết
```

### R4. Nội dung VI/EN và hook

Tiếng Việt là HTML gốc; EN ở node lá qua `data-en`, `data-en-alt`, `data-en-aria-label`, `data-en-content`. Không đặt
`data-en` lên phần tử có con (`span`, `em`, icon, wrapper motion) vì đổi ngôn ngữ thay `textContent`
([shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ)); chữ giống nhau ở hai ngôn ngữ (Homestay) không cần cặp. Mỗi
trang một `h1`, không nhảy cấp heading. Giữ `data-motion-lines`, `data-motion-words`, `data-motion-line-source`,
`data-motion-word-source`, `data-motion-fade|up|media`; không viết tay `.motion-line`, `.motion-word` (`detail.js` sinh
lại). Thêm, bớt ảnh gallery bằng clone hoặc xóa trọn một `figure` (ảnh, caption, alt VI/EN). Cụm portal giữ ba mục; đổi
số portal là đổi layout, motion, giao riêng. Copy dài hơn đổi nhịp reveal: kiểm VI, EN ở mobile và desktop.
`data-cms="hero.kicker"` là hook CMS dormant. Giọng văn, crop: [content](../../design-system/content.md).

```gherkin
Given output đã build, JavaScript tắt
When đọc main của ba trang
Then mỗi trang một h1, không có bước nhảy cấp heading, không phần tử nào vừa có data-en vừa có phần tử con
```

### R5. Hero và vào trang

Hero cao `100svh`, tối thiểu 44rem (About 46rem; tới 680px bớt 2rem), có kicker, `h1` hai dòng, scroll cue. Residential,
Commercial: một `.hero-slide` (không slideshow, không nút dừng), `.hero-slides` parallax speed `-2`; Commercial chọn ngẫu nhiên mỗi lần tải một trong 12 hero owner duyệt 2026-10-18 (9 hero kinh doanh F24, hai shop thời trang F19, sảnh lễ tân F25; 1920×1280 từ PNG SeedVR2.5) như hero trang chủ ([trang chủ R3](page-home.md#r3-hero-slideshow-và-nút-dừng)): script head chọn và preload, script module sau `.hero-slides` giữ slide đó, bỏ các slide còn lại, gán `src`, `srcset`, `fetchpriority="high"`; route mềm runtime chạy lại script đó; chữ hoa, đậm 600,
khung `min(80%, 62.5rem)`, dòng 1 căn trái, dòng 2 căn phải lùi lên 0,35em; tới 980px dòng được xuống hàng để chữ 200%
không tràn; tới 680px căn giữa. About tới 980px hero theo luồng chữ, cao tối thiểu `100svh`. Mỗi lần mount (tải trực tiếp hoặc route mềm), trễ
tính từ lúc mount: ảnh hero (`data-motion-hero-media`) `scale 1.2 → 1.005` trong 2,5s `ease` rồi đứng yên, như hero
Espacio interior-design (Residential) và kitchens (Commercial) đo từ frame; ảnh hero Residential, Commercial hiện cắt
cứng khi decode xong, không fade của khung chờ ảnh; kicker trượt từ trái 60px và hiện (0,6s) tại 1,2s;
Residential, Commercial tách `h1` theo từ, hiện dần tại 0,9s; About không tách nên `h1` hiện ngay. `zoom-09` khác
`words-09` chỉ ở chỗ xóa transform GSAP còn sót trên ảnh hero. Tải trực tiếp: entrance chạy song song lúc veil mở; hero
không có nhánh intro riêng nên việc `route-enter` bỏ header intro ([shell](site-shell.md#gate-còn-mở)) không chạm hero.
Scroll cue như [trang chủ R4](page-home.md#r4-hero-vào-trang-và-scroll-cue), bấm thì cuộn tới khối ngay sau hero. Resize cửa sổ (kể cả
giữa intro) thì tiêu đề hero mọi trang, kể cả Advertising, về chỗ mới ngay, không trượt.

```gherkin
Given /vi/residential/ ở 1440px, không reduced motion
When tải trực tiếp trang
Then ảnh hero đi từ scale 1.2 về gần 1 trong 2,5s, tiêu đề hiện theo từ, kicker hiện sau tiêu đề
```

### R6. Reveal, parallax, đổi ngôn ngữ và vòng đời

Chỉ chạy khi có `motion-enabled` và `detail.js` có GSAP; tách chữ cần thêm SplitText. Residential, Commercial: `[data-motion-lines]`
tách dòng trong mask, vào viewport thì trượt `2em → -0.1em` (1,9s, stagger 0,1s); `[data-motion-words]` ngoài hero hiện
theo từ (1s, stagger 0,2s); trễ theo `data-motion-delay`; tách lại sau `document.fonts.ready` và khi đổi kích thước,
giữ tiến độ. About không tách chữ: hook chữ trên About không chạy. Cả ba trang: `[data-motion-fade]`, `[data-motion-up]`
(thêm trượt từ 60px), `[data-motion-media]` (chờ ảnh tải) hiện trong 0,6s khi vào viewport. Portal reveal như
[trang chủ R5](page-home.md#r5-portal-chữ-một-dòng-cùng-cỡ). Parallax Locomotive ([motion](../../design-system/motion.md#smooth-scroll-và-parallax)):
ảnh hero About (`.about-hero__media`) speed `-2` như hero trang chủ ([cảm giác cuộn](scroll-feel.md)). Đổi ngôn ngữ: revert split, thay chữ, tách lại khi font sẵn sàng, section
đang xem phát lại qua `replaySection` ([trang chủ R11](page-home.md#r11-đổi-ngôn-ngữ-phát-lại-section-đang-xem)). Rời
trang: `unmount` hủy listener (AbortSignal), observer, frame, split, GSAP context. Không thêm thư viện animation ngoài
[danh sách tự host](static-release.md#r4-font-và-thư-viện-tự-host).

```gherkin
Given /vi/residential/ đang xem #cong-trinh
When mở menu và chọn EN
Then tiêu đề gallery trượt lên lại bằng chữ EN, section khác không reveal lại
```

### R7. Gallery ngang

`section.detail-gallery[data-gallery]` theo khối "The balance within the spaces" của Espacio interior-design (owner
duyệt 2026-10-17). `h2` riêng một hàng, canh giữa, weight 300, chữ thường kiểu câu, phần cuối trong `<i>` (`data-en`
ở `span` và `i`, R4), cỡ `clamp(2.5rem, 4.45vw, 4rem)` (64px ở 1440px), vẫn tách dòng (R6). Dưới là track
`[data-gallery-track]`: `region` focus được, `aria-label` trung tính, không ghi số ảnh; không nút prev/next. Track bắt buộc:
thiếu thì `mount` ném lỗi. Mọi ảnh cao bằng nhau `min(50vw, 45rem)` (tới 750px `75vw`), rộng theo `width`, `height` của ảnh
nên không crop và khung đúng tỷ lệ trước khi tải. `figure.detail-gallery__item` (trong `.detail-gallery__slides`) gồm khung
`.detail-gallery__media` (vệt sáng chờ ảnh) và `figcaption` dưới ảnh 10px: label 0.8rem, 700, hoa, màu `ink`, không nới figure và rộng tối đa bằng track nhìn thấy (`100vw` trừ hai `--gutter`), nên ảnh ngang rộng hơn track vẫn xuống dòng chữ ở cỡ chữ 200%.
Kéo, vuốt như gallery Espacio (owner 2026-10-17, đo 2026-10-18): gallery cách viewport một màn hình thì `detail.js` tải Swiper
14.2.0 (loader chung carousel Advertising) với tham số Espacio: `slidesPerView: "auto"`, `speed` 500 (reduced motion 0),
`spaceBetween` 20 (dưới 600px 10; `.detail-gallery__item` đặt `transition: none` để giảm chuyển động không làm Swiper đo margin cũ), `grabCursor`, `edgeSwipeDetection`, `watchOverflow`, `mousewheel.forceToAxis`, resistance
0.85, không freeMode (thả tay hút về ảnh). Track thành container thụt `--gutter`, ảnh tràn mép, section cắt; mũi tên trái/phải
trên region chuyển ảnh. `[data-gallery-pagination]` (`aria-hidden`, dưới caption 18px): chấm tròn 8px cách 8px, chấm thường đen
20%, active `ink`, bấm chấm tới ảnh, chấm theo kéo; dưới 600px chấm động. Hover ảnh không zoom, chỉ con trỏ grab (kéo: grabbing).
Ảnh `draggable=false`, chặn `dragstart`; hàng chấm nằm trong track như Espacio và cả track nhận kéo (`touchEventsTarget: "container"`), nên kéo bắt đầu ở khe dưới caption hay hàng chấm là kéo carousel, không bôi đen caption (chữ vẫn chọn được). Chưa có Swiper (không JS, tải lỗi): track cuộn native, khe 20px (tới 750px 10px),
snap `start` proximity, ẩn thanh cuộn ([shell R9](site-shell.md#r9-scrollbar)). Residential: năm chuỗi công trình theo thứ tự nhà
ống, nhà giếng trời, căn hộ hai phòng ngủ Thủ Đức, homestay bên rạch, nhà phố ba tầng; mỗi chuỗi mở bằng ảnh toàn cảnh (homestay:
ngoại thất; nhà phố ba tầng: bếp), theo thứ tự đi qua nhà; caption "<CÔNG TRÌNH> · <KHÔNG GIAN>" (owner duyệt 2026-10-17); thêm chuỗi là thêm `figure` (R4). Commercial: sáu ảnh lẻ, tiệm bánh ngọt, shop hoa tươi, rồi chuỗi "Văn phòng chia sẻ" (owner duyệt 2026-10-18) mở bằng toàn cảnh, qua bàn làm việc chung, phòng một người, phòng nhóm, phòng họp, pantry, phòng nghỉ.

```gherkin
Given /vi/commercial/ ở 1440px với chuột
When đo gallery rồi kéo track sang trái 220px
Then mọi ảnh cao 720px đúng tỷ lệ, caption cách ảnh 10px, không có nút prev/next
And thả tay hút về ảnh kế, chấm thứ hai active, không dragstart; bấm chấm thứ ba tới ảnh ba; hover không zoom
```

### R8. Dải quy trình, duo, portal loại hình

Dải `.editorial-strip.detail-process-editorial` là `region` focus được, gắn nhãn bằng tiêu đề quy trình: năm
`article.editorial-item`, mỗi bước một chữ số SVG (sprite trong trang), ảnh trong khung `.editorial-media`, `h3` cân dòng,
đoạn; năm bước luôn cùng một hàng (owner): năm cột, mỗi bước ảnh trên, chữ và chữ số dưới; tới 980px thành rail vuốt ngang (scroll snap), tới 680px chữ số nhạt hơn để không tranh với chữ. `.detail-duo`: hai ảnh; tới 680px một cột, ảnh
đầu tràn mép. `.portal-stage`: ba
`article.service-portal` không link, không hover zoom, chữ theo [trang chủ R5](page-home.md#r5-portal-chữ-một-dòng-cùng-cỡ);
tới 980px cao tối thiểu `max(72% --site-layout-viewport-height, 34rem)`, tới 680px tối thiểu 400px.

```gherkin
Given /vi/residential/ ở 390px
When cuộn qua #quy-trinh và #loai-hinh
Then năm bước nằm một hàng trong rail vuốt ngang, ba portal cao ít nhất 400px, document không tràn ngang
```

### R9. About: dòng thời gian, quy trình, cam kết

`.about-timeline`: `h2.sr-only`, hai mốc có đoạn kể; đường dọc ở 54% bề rộng, tới 980px 47%, tới 680px sát trái.
`.detail-process`: năm `article.process-step` hiện lần lượt (`data-motion-up`, trễ 0; 0,15; 0,3; 0,45; 0,6s); năm cột cùng một hàng,
tới 980px thành rail vuốt ngang. Chapter lead và `.about-process-note` hai cột 1:2, tới 980px một cột. `.about-commitments`: ba
cam kết trễ 0; 0,15; 0,3s; tới 680px một cột. Mốc thời gian trung tính, chưa có bảo hành tới khi owner xác nhận fact.

```gherkin
Given /vi/about/ ở 390px
When cuộn qua dòng thời gian, quy trình và cam kết
Then mỗi khối một cột, chữ không bị cắt, document không tràn ngang
```

### R10. CTA, marquee, hover và ảnh dưới chữ trắng

`.detail-cta#tu-van`: ảnh phủ khung có lớp tối 40%, eyebrow, `h2` hai dòng, nút mở `https://zalo.me/0949131050` ở tab mới (EN
"Talk on Zalo"), `aria-label` riêng từng trang; footer giữ `id="lien-he"`. Rule CTA chung (owner 2026-10-15) cho CTA này, khối
"Giữ nghề" ([cảm giác cuộn R5](scroll-feel.md#r5-khối-giữ-nghề-theo-banner-cta-của-espacio)) và CTA Advertising: tiêu đề
canh giữa ở mọi bề rộng, weight 600, cỡ `--cta-title-size` (`clamp(3.2rem, 6vw, 7rem)`; CTA Advertising giữ cỡ riêng,
[R3](advertising-cta-center-parallax.md#r3-tiêu-đề-luôn-lớn-hơn-nút)); eyebrow (nếu có) ở trên, nút ở
dưới. Ở `.detail-cta#tu-van` nét chữ nhìn thấy của tiêu đề (đỉnh chữ hoa tới chân chữ dòng cuối, không tính dấu) nằm đúng tâm
khối theo chiều dọc, lệch tối đa 2px: copy là grid `1fr auto 1fr`, eyebrow và nút ở hai hàng 1fr bằng nhau, cả cụm dời
theo `--cta-title-size` (owner 2026-10-17). Nút là nhãn `.legacy-link` + `.portal-subtitle` như link "VỀ CHÚNG TÔI": 16px, viết hoa, không mũi tên, vùng chạm
44px, gạch chân 3px chạy từ trái khi hover hoặc focus. Lớp bấm `::before` của nút phủ cả khối (cắt bởi `overflow: clip`),
nên hover khối làm ảnh phóng to và gạch chân chạy ra; CTA Advertising bỏ lớp bấm, gạch chân chỉ chạy khi hover nút. Dấu chấm cuối `h2` là `.text-hang-end` nhưng không treo
(`.detail-cta__copy .text-hang-end` rộng auto): cả dòng kể cả dấu nằm giữa khối (owner 2026-10-17); `data-en` nằm ở span chữ, không gồm dấu. `.capability-marquee`: hai `.marquee-line`
giống nhau (dòng sau `aria-hidden`), chạy CSS 25s lặp; không có nút dừng, chỉ đứng khi `motion-paused` (không GSAP hoặc
reduced motion). Hover ảnh duo, CTA (gallery: R7) dùng primitive của [trang chủ R6](page-home.md#r6-hover-ảnh-dùng-chung)
(`media-hover-zoom-trigger`, `media-hover-zoom`): chỉ chuột thật, reduced motion không zoom. Ảnh hero, portal, CTA nằm dưới chữ trắng: chưa giải mã xong
thì ảnh opacity 0 trên nền `media-loading-surface`, shade hero và lớp tối CTA ẩn; xong thì `motion.js` thêm
`is-overlay-media-ready`, riêng ảnh hero chỉ chờ `is-media-settled` ([trang chủ R10](page-home.md#r10-ảnh-dưới-chữ-trắng)); `motion-fallback` và không JavaScript bỏ
cổng này. Khung ảnh nội dung (gồm gallery) có vệt sáng tới khi ảnh giải mã xong; build bọc `<picture>` ([chuẩn file ảnh](media-delivery.md#r5-chuẩn-file-ảnh)).

```gherkin
Given ảnh nền CTA /vi/commercial/ bị trễ
When CTA vào viewport rồi ảnh tải xong
Then chữ trắng hiện ngay trên media-loading-surface, lớp tối ẩn, ảnh opacity 0 tới khi có is-overlay-media-ready
```

### R11. Reduced motion, fallback, không JavaScript

Reduced motion: không `motion-enabled`, không tách chữ, mọi target reveal ở trạng thái cuối; ảnh hero, ảnh About
không scale; `.detail-media img` vừa khung; marquee đứng; không Locomotive. `motion-fallback`
([shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)): `detail.js` mount settled, CSS đưa mọi target
reveal, dòng, từ về trạng thái cuối, ảnh hero About scale 1.005. Không JavaScript: chữ, ảnh hiện đủ, ảnh hero không scale.
GSAP có mà SplitText lỗi tải: chữ giữ nguyên, hiện ngay; reveal ảnh, kicker, hero vẫn chạy.

```gherkin
Given trình duyệt bật reduced motion
When tải /vi/about/ ở 1024px và cuộn hết trang
Then không phần tử reveal nào bị ẩn, ảnh hero không scale, marquee đứng yên
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `body[data-detail-hero-profile]` (`words-09`, `zoom-09`; `words-06` của Advertising) | Nhịp hero (R5); `detail.js` đọc |
| DOM hook | `[data-motion-hero-media]` (chỉ About), `[data-motion-hero-kicker]`, `[data-motion-hero-title]`, `.detail-hero-line-mask`, `[data-scroll-cue]` | Hero (R5) |
| DOM hook | `[data-motion-lines]`, `[data-motion-words]`, `[data-motion-*-source]`, `[data-motion-fade]`, `[data-motion-up]`, `[data-motion-media]`, `data-motion-delay`, `data-scroll-speed` | Reveal, parallax (R6) |
| DOM hook | `[data-gallery]`, `[data-gallery-track]` | Gallery (R7) |
| Class runtime | `motion-line`, `motion-word`, `is-motion-inview`, `is-motion-ready`, `is-dragging`, `is-overlay-media-ready` | `detail.js`, `motion.js` ghi |
| Hàm public | `window.TruongThinhDetail`: `mount(container, {settled, softNavigation})`, `unmount()`, `replaySection(section)` trả boolean, `revertSplitText()`, `rebuildSplitText()` | `motion.js` gọi; `ensureAdvertisingDependencies` thuộc Advertising |
| Data | `data-cms="hero.kicker"` | Worker CMS dormant đọc |

## UI

Component [Hero](../../design-system/components/Hero/README.md), [Gallery](../../design-system/components/Gallery/README.md),
[Footer](../../design-system/components/Footer/README.md). Motion [text](../../design-system/motion.md#text),
[hover](../../design-system/motion.md#hover), [parallax](../../design-system/motion.md#smooth-scroll-và-parallax). Copy và
ảnh: [hero ba route](../../design-system/content.md#hero-ba-route-dịch-vụ), [mạch nội dung](../../design-system/content.md#mạch-nội-dung-theo-route),
[crop](../../design-system/content.md#crop-và-con-người). Màu, chữ, layout: [Design System](../../design-system/README.md).

## Kiểm tra

E2E cần preview, `BASE_URL`; `TT_E2E_*_ONLY=1` chạy một phần `pnpm qa:site` (`site.e2e.cjs`, đầu lần chạy kiểm copy hero).

| R | Test hoặc command |
| --- | --- |
| R1 | `static-locales.test.mjs`, `cross-browser.smoke.spec.cjs` (ba route VI); head chưa có test riêng |
| R2 | `assertPersistentNavigationContracts`, `TT_E2E_RESIDENTIAL_HERO_ONLY`, `TT_E2E_COMMERCIAL_HERO_ONLY` (đỏ, xem Gate); thứ tự khối chưa có test |
| R3 | `TT_E2E_DETAIL_HERO_ONLY` (một cue, không chapter; đỏ, xem Gate); thứ tự khối chưa có test |
| R4 | `mobile-layout-parity.e2e.mjs --scope residential-commercial`, `home-about`; `TT_E2E_ESPACIO_TYPE_MOTION_ONLY`; node lá, heading chưa có test |
| R5 | `TT_E2E_DETAIL_HERO_ONLY` (zoom vào trực tiếp, route mềm), hai flag hero ở R2, `TT_E2E_WHEEL_ONLY` (`.hero-slides`), `cross-browser.smoke.spec.cjs` (tiêu đề Advertising qua 1024px) |
| R6 | `TT_E2E_LOCALE_SCROLL_ONLY` (Residential), `TT_E2E_WHEEL_ONLY` (parallax About) |
| R7 | `runGalleryCheck` trong `TT_E2E_M1_ONLY` (cao, tỷ lệ, caption, kéo chuột, chấm, không zoom); `mobile-layout-parity.e2e.mjs` ca `reduced` (mục rail 10 và 18 vào đúng khung), ca `text200` và `fallback` (caption không vượt track) |
| R8 | `mobile-layout-parity.e2e.mjs`, `TT_E2E_ESPACIO_TYPE_MOTION_ONLY` (dải quy trình) |
| R9 | `mobile-layout-parity.e2e.mjs --scope home-about`; chưa có test riêng |
| R10 | `TT_E2E_MEDIA_FALLBACK_ONLY` (CTA Commercial, hero About), `image-loading-frame.e2e.mjs`, `TT_E2E_P5_MEDIA_HOVER_ONLY` (hover); marquee chưa có test |
| R11 | `TT_E2E_FAILOPEN_ONLY` (Residential), `runNoScriptHeroCheck` trong `TT_E2E_M1_ONLY`, `cross-browser.smoke.spec.cjs`; `TT_E2E_REDUCED_ONLY` chưa đếm `[data-motion-*]` |

## Gate còn mở

- Gate chung, áp dụng cả ba trang: Zalo placeholder, SEO head ([trang chủ](page-home.md#gate-còn-mở)); LCP Residential ([phát hành](static-release.md#gate-còn-mở)).
- About thiếu fact: năm thành lập, câu chuyện khởi đầu, điều khoản bảo hành và hậu mãi. Owner cung cấp.
- Không chặn phát hành. Carousel `advertising-product-detail` trong `detail.js` không trang nào dùng; gallery R7 dùng chung loader Swiper.

## Chú thích thuật ngữ

- **Trang con**: Residential, Commercial, About; dùng chung `detail.css`, `detail.js`.
- **Hero profile**: giá trị `data-detail-hero-profile` chọn nhịp entrance hero.
- **Reveal, split**: chữ hoặc ảnh hiện khi vào viewport; split là tách chữ thành dòng hoặc từ (SplitText), mask là khung cắt cho dòng trượt lên.
- **Duo, marquee**: khối hai ảnh cạnh nhau; dải chữ chạy ngang lặp vô hạn.
- **Portal**: card ảnh lớn có chữ trắng; ở đây nêu một loại hình.
- **Scroll cue**: nút chữ ở đáy hero mời cuộn xuống.
