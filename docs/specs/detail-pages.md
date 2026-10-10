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
updated: 2026-10-07
---

# Trang Residential, Commercial và About

## Mục đích

Ba trang con `/vi/residential/`, `/vi/commercial/`, `/vi/about/` (EN tương đương, mỗi trang một file
`src/site/<trang>/index.html`) dùng chung `detail.css`, `detail.js`. Residential, Commercial giới thiệu một lĩnh vực
nội thất; About kể cách làm của Trường Thịnh; cả ba kết bằng lời mời Zalo. Header, menu, footer, veil, scroll thuộc
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
`motion.js`; không Swiper. Build ghi `/vi/`, `/en/` từ cùng file ([phát hành R5](static-release.md#r5-văn-bản-song-ngữ-và-route-locale)).
Vào hoặc rời About đi route mềm như các trang khác ([shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell)).

```gherkin
Given output đã build
When mở /en/commercial/
Then html có lang="en", title "Commercial spaces — Trường Thịnh", hero profile zoom-09, detail.js trước motion.js
```

### R2. Residential và Commercial: section và nội dung

`main#noi-dung` có một `h1`, mười một khối theo bảng (VI; EN ở `data-en`; Tone là `data-header-tone`), sau `main` là lời
mời rồi footer ([shell R10](site-shell.md#r10-floating-cta-và-footer)). Ảnh hero `fetchpriority="high"`, ảnh khác lazy; copy hero do owner duyệt.

| # | Khối | Residential | Commercial | Tone |
| --- | --- | --- | --- | --- |
| 1 | `.hero#top` | Kicker "NHÀ PHỐ · CĂN HỘ · HOMESTAY", `h1` "Nơi tái tạo / năng lượng sống" | "SHOP · F&B · SHOWROOM · VĂN PHÒNG", "Thiết kế để bán tốt. / Thi công để vận hành bền." | inverse |
| 2 | `.detail-intro#tong-quan` | `h2` "KHÔNG GIAN ĐỂ SỐNG", đoạn mở | "KHÔNG GIAN KINH DOANH", đoạn mở | ink |
| 3 | `figure.detail-media` | Ảnh `residential-detail` | Ảnh `commercial-active` | ink |
| 4 | `.detail-note` | `h2.sr-only` "Một ngôi nhà được kiểm chứng mỗi ngày", một câu | "Bằng chứng trong vận hành", một câu | ink |
| 5 | `.detail-gallery#cong-trinh` | `h2` "MỘT NGÔI NHÀ, NHIỀU LỚP", 9 `figure` có caption (R7) | "KHÔNG GIAN TIÊU BIỂU", 5 `figure` | ink |
| 6 | `.detail-heading#quy-trinh` | Eyebrow "MỘT NHỊP XUYÊN SUỐT", `h2` "Từ nếp sống / đến ngôi nhà hoàn thiện." | Cùng eyebrow, `h2` "Từ mặt bằng / đến ngày mở cửa." | ink |
| 7 | `.editorial-strip` | Bốn bước Khảo sát, Tư vấn, Sản xuất, Lắp đặt và bàn giao (R8) | Cùng bốn bước, mô tả riêng | ink |
| 8 | `.detail-duo` | `h2.sr-only` "Vật liệu và tay nghề", hai ảnh | Như Residential | ink |
| 9 | `.portal-stage#loai-hinh` | Ba portal: Nhà phố, Căn hộ, Homestay | Shop & showroom, F&B · Cafe, Văn phòng | ink |
| 10 | `.detail-cta#tu-van` | "CÓ MỘT NGÔI NHÀ? / Mời chúng tôi đến xem.", nút "Gọi Zalo tư vấn" | "CÓ MẶT BẰNG? / Đặt lịch khảo sát." | inverse |
| 11 | `.capability-marquee` | Loại hình, năng lực nhà ở | Loại hình, năng lực kinh doanh | ink |

```gherkin
Given output đã build
When mở /vi/residential/ và /vi/commercial/
Then mỗi trang có một h1 và mười một khối theo thứ tự bảng, gallery lần lượt có chín và năm figure
```

### R3. About: section và nội dung

`main` có một `h1` và các khối theo bảng; ba chương mở bằng `.detail-heading` (eyebrow số La Mã, `h2` hai dòng).

| # | Khối | Nội dung (VI) | Tone |
| --- | --- | --- | --- |
| 1 | `.hero.about-hero#top` | Ảnh `legacy-team` trang trí (`alt=""`), kicker "CÂU CHUYỆN TRƯỜNG THỊNH", `h1` "Vững nghề. / Vững niềm tin." | inverse |
| 2 | `.about-opening#mo-dau` | "MỘT CÁCH LÀM, KHÔNG CHỈ LÀ KHẨU HIỆU", đoạn mở | ink |
| 3–5 | `#di-san`, ảnh `legacy-hands`, `.about-timeline` | "I. DI SẢN", `h2` "Hơn 20 năm / vững nghề."; hai mốc "Hơn 20 năm trước", "Hôm nay" (R9) | ink |
| 6–10 | `#cach-lam`, chapter lead, ảnh `design-sketch`, `.detail-process`, `.about-process-note` | "II. CÁCH LÀM", `h2` "Mỗi công trình bắt đầu / bằng một cuộc khảo sát đúng."; lead "TRƯỚC KHI CÓ BẢN VẼ"; bốn bước Khảo sát, Tư vấn, Sản xuất, Lắp đặt | ink |
| 11 | `.detail-duo` | `h2.sr-only` "Vật liệu và cách làm", ảnh `materials`, `cnc-operator-b` | ink |
| 12–15 | `#cam-ket`, chapter lead, ảnh `workshop-wide`, `.about-commitments` | "III. CAM KẾT", `h2` "Làm chắc / để đi đường dài."; lead "VIỆC LÀM ĐỨNG SAU LỜI NÓI"; ba cam kết | ink |
| 16 | `.detail-cta#tu-van` | "BẮT ĐẦU TỪ MẶT BẰNG / Mời chúng tôi đến khảo sát.", nút "Trao đổi qua Zalo" | inverse |
| 17 | `.capability-marquee` | Giá trị và cách làm | ink |

```gherkin
Given output đã build
When mở /vi/about/
Then main có một h1 "Vững nghề. Vững niềm tin.", ba chương I, II, III, bốn bước quy trình và ba cam kết
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
Commercial: một `.hero-slide` (không slideshow, không nút dừng), `.hero-slides` parallax speed `-2`; chữ hoa, đậm 600,
khung `min(80%, 62.5rem)`, dòng 1 căn trái, dòng 2 căn phải lùi lên 0,35em; tới 980px dòng được xuống hàng để chữ 200%
không tràn; tới 680px căn giữa. About tới 980px hero theo luồng chữ. Mỗi lần mount (tải trực tiếp hoặc route mềm), trễ
tính từ lúc mount: ảnh hero About `scale 1.2 → 1.005` trong 2,5s (ảnh hero Residential, Commercial đứng yên, không zoom); kicker trượt từ trái 60px và hiện (0,6s) tại 1,2s;
Residential, Commercial tách `h1` theo từ, hiện dần tại 0,9s; About không tách nên `h1` hiện ngay. `zoom-09` khác
`words-09` chỉ ở chỗ xóa transform GSAP còn sót trên ảnh hero. Tải trực tiếp: entrance chạy song song lúc veil mở; hero
không có nhánh intro riêng nên việc `route-enter` bỏ header intro ([shell](site-shell.md#gate-còn-mở)) không chạm hero.
Scroll cue như [trang chủ R4](page-home.md#r4-hero-vào-trang-và-scroll-cue), bấm thì cuộn tới khối ngay sau hero.

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

`section.detail-gallery[data-gallery]` có `h2`, hai nút `[data-gallery-prev]`, `[data-gallery-next]` (nhãn "Xem ảnh
trước", "Xem ảnh tiếp theo", có EN) và track `[data-gallery-track]` là `region` focus được có `aria-label` trung tính, không ghi số ảnh. Track bắt
buộc: thiếu thì `mount` ném lỗi; hai nút tùy chọn. Nút cuộn 0,82 lần bề rộng track, `smooth` (reduced motion: tức
thì). Chuột kéo track (pointer không phải touch, nút chính, `is-dragging` lúc kéo); ảnh `draggable=false`, chặn
`dragstart`; touch cuộn native. Track snap giữa ảnh, ẩn thanh cuộn ngang ([shell R9](site-shell.md#r9-scrollbar)), cao
`min(50vw, 45rem)`, ảnh rộng `min(32vw, 29rem)`, khe 20px; tới 980px cao 28rem, ảnh `min(56vw, 23rem)`; tới 680px cao
75vw, ảnh 47vw, khe 10px. Caption chữ trắng trên ảnh (R10).

```gherkin
Given /vi/commercial/ ở 1440px với chuột
When bấm nút tiếp theo, rồi kéo track sang trái 220px
Then track cuộn sang phải, rồi dịch ít nhất 150px, không có dragstart hay pointercancel
```

### R8. Dải quy trình, duo, portal loại hình

Dải `.editorial-strip.detail-process-editorial` là `region` focus được, gắn nhãn bằng tiêu đề quy trình: bốn
`article.editorial-item`, mỗi bước một chữ số SVG (sprite trong trang), ảnh trong khung `.editorial-media`, `h3`, đoạn; bốn cột, tới 980px hai cột,
tới 680px một cột. `.detail-duo`: hai ảnh; tới 680px một cột, ảnh đầu tràn mép. `.portal-stage`: ba
`article.service-portal` không link, không hover zoom, chữ theo [trang chủ R5](page-home.md#r5-portal-chữ-một-dòng-cùng-cỡ);
tới 980px cao tối thiểu `max(72% --site-layout-viewport-height, 34rem)`, tới 680px tối thiểu 400px.

```gherkin
Given /vi/residential/ ở 390px
When cuộn qua #quy-trinh và #loai-hinh
Then bốn bước xếp một cột, ba portal cao ít nhất 400px, document không tràn ngang
```

### R9. About: dòng thời gian, quy trình, cam kết

`.about-timeline`: `h2.sr-only`, hai mốc có đoạn kể; đường dọc ở 54% bề rộng, tới 980px 47%, tới 680px sát trái.
`.detail-process`: bốn `article.process-step` hiện lần lượt (`data-motion-up`, trễ 0; 0,15; 0,3; 0,45s); bốn cột, tới
980px hai, tới 680px một. Chapter lead và `.about-process-note` hai cột 1:2, tới 980px một cột. `.about-commitments`: ba
cam kết trễ 0; 0,15; 0,3s; tới 680px một cột. Mốc thời gian trung tính, chưa có bảo hành tới khi owner xác nhận fact.

```gherkin
Given /vi/about/ ở 390px
When cuộn qua dòng thời gian, quy trình và cam kết
Then mỗi khối một cột, chữ không bị cắt, document không tràn ngang
```

### R10. CTA, marquee, hover và ảnh dưới chữ trắng

`.detail-cta#tu-van`: ảnh phủ khung có lớp tối 40%, eyebrow, `h2` hai dòng, nút mở `https://zalo.me/` ở tab mới (EN
"Talk on Zalo"), `aria-label` riêng từng trang; footer giữ `id="lien-he"`. `.capability-marquee`: hai `.marquee-line`
giống nhau (dòng sau `aria-hidden`), chạy CSS 25s lặp; không có nút dừng, chỉ đứng khi `motion-paused` (không GSAP hoặc
reduced motion). Hover ảnh gallery, duo, CTA dùng primitive của [trang chủ R6](page-home.md#r6-hover-ảnh-dùng-chung)
(`media-hover-zoom-trigger`, `media-hover-zoom`): chỉ chuột thật, reduced motion không zoom. Ảnh hero, gallery, portal, CTA nằm dưới chữ trắng: chưa giải mã xong
thì ảnh opacity 0 trên nền `media-loading-surface`, shade hero và lớp tối CTA ẩn; xong thì `motion.js` thêm
`is-overlay-media-ready`, riêng ảnh hero chỉ chờ `is-media-settled` ([trang chủ R10](page-home.md#r10-ảnh-dưới-chữ-trắng)); `motion-fallback` và không JavaScript bỏ
cổng này. Khung ảnh nội dung có vệt sáng tới khi ảnh giải mã xong; build bọc `<picture>` ([chuẩn file ảnh](media-delivery.md#r5-chuẩn-file-ảnh)).

```gherkin
Given ảnh figure đầu gallery /vi/residential/ bị trễ
When gallery vào viewport rồi ảnh tải xong
Then caption trắng hiện ngay trên media-loading-surface, ảnh opacity 0 tới khi có is-overlay-media-ready
```

### R11. Reduced motion, fallback, không JavaScript

Reduced motion: không `motion-enabled`, không tách chữ, mọi target reveal ở trạng thái cuối; ảnh hero, ảnh About
không scale; `.detail-media img` vừa khung; gallery cuộn tức thì; marquee đứng; không Locomotive. `motion-fallback`
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
| DOM hook | `[data-gallery]`, `[data-gallery-track]`, `[data-gallery-prev]`, `[data-gallery-next]` | Gallery (R7) |
| Class runtime | `motion-line`, `motion-word`, `is-motion-inview`, `is-motion-ready`, `is-dragging`, `is-overlay-media-ready` | `detail.js`, `motion.js` ghi |
| Hàm public | `window.TruongThinhDetail`: `mount(container, {settled, softNavigation})`, `unmount()`, `replaySection(section)` trả boolean, `revertSplitText()`, `rebuildSplitText()` | `motion.js` gọi; `ensureAdvertisingDependencies` thuộc Advertising |
| Data | `data-cms="hero.kicker"` | Worker CMS dormant đọc |

## UI

Component [Hero](../../design-system/components/Hero/README.md), [Gallery](../../design-system/components/Gallery/README.md),
[Footer](../../design-system/components/Footer/README.md) (lời mời). Motion [text](../../design-system/motion.md#text),
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
| R5 | `TT_E2E_DETAIL_HERO_ONLY` (zoom vào trực tiếp, route mềm), hai flag hero ở R2, `TT_E2E_M1_ONLY`, `TT_E2E_WHEEL_ONLY` (`.hero-slides`) |
| R6 | `TT_E2E_LOCALE_SCROLL_ONLY` (Residential), `TT_E2E_WHEEL_ONLY` (parallax About; đỏ trong M1, xem Gate) |
| R7 | `runGalleryCheck` trong `TT_E2E_M1_ONLY` |
| R8 | `mobile-layout-parity.e2e.mjs`, `TT_E2E_ESPACIO_TYPE_MOTION_ONLY` (dải quy trình) |
| R9 | `mobile-layout-parity.e2e.mjs --scope home-about`; chưa có test riêng |
| R10 | `TT_E2E_MEDIA_FALLBACK_ONLY` (gallery Residential, CTA Commercial, hero About), `image-loading-frame.e2e.mjs`, `TT_E2E_P5_MEDIA_HOVER_ONLY` (hover); marquee chưa có test |
| R11 | `TT_E2E_FAILOPEN_ONLY` (Residential), `runNoScriptHeroCheck` trong `TT_E2E_M1_ONLY`, `cross-browser.smoke.spec.cjs`; `TT_E2E_REDUCED_ONLY` chưa đếm `[data-motion-*]` |

## Gate còn mở

- Gate chung, áp dụng cả ba trang: Zalo placeholder, SEO head ([trang chủ](page-home.md#gate-còn-mở)); LCP Residential ([phát hành](static-release.md#gate-còn-mở)).
- [Gallery](../../design-system/components/Gallery/README.md) ghi "một ảnh thì bỏ control", `detail.js` không xử lý; main thêm hoặc owner bỏ quy tắc.
- About thiếu fact: năm thành lập, câu chuyện khởi đầu, điều khoản bảo hành và hậu mãi. Owner cung cấp.
- Không chặn phát hành. Carousel Swiper trong `detail.js` (namespace `advertising-product-detail`) không trang nào dùng; owner giữ (24/09) để
  thiết kế lại carousel cho Residential, Commercial. Owner giao spec khi làm.

## Chú thích thuật ngữ

- **Trang con**: Residential, Commercial, About; dùng chung `detail.css`, `detail.js`.
- **Hero profile**: giá trị `data-detail-hero-profile` chọn nhịp entrance hero.
- **Reveal, split**: chữ hoặc ảnh hiện khi vào viewport; split là tách chữ thành dòng hoặc từ (SplitText), mask là khung cắt cho dòng trượt lên.
- **Duo, marquee**: khối hai ảnh cạnh nhau; dải chữ chạy ngang lặp vô hạn.
- **Portal**: card ảnh lớn có chữ trắng; ở đây nêu một loại hình.
- **Scroll cue**: nút chữ ở đáy hero mời cuộn xuống.
