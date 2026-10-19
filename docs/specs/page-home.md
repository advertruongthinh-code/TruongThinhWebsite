---
title: Trang chủ
status: live
source:
  - src/site/index.html
  - src/site/content/client-logos.json
  - src/site/content/project-reel.json
  - src/site/assets/content/client-logos/**
  - src/site/assets/content/projects/home-*
tests:
  - tests/site/site.e2e.cjs
  - tests/site/static-locales.test.mjs
  - tests/site/client-logo-assets-contract.cjs
  - tests/site/client-logo-marquee.e2e.cjs
  - tests/site/image-loading-frame.e2e.mjs
  - tests/site/mobile-layout-parity.e2e.mjs
  - tests/site/footer-consistency.e2e.mjs
notion: https://app.notion.com/p/3ef332849a0e81f3ad86f1fd913afab7
updated: 2026-10-19
---

# Trang chủ

## Mục đích

Trang chủ `/vi/`, `/en/` (một file `src/site/index.html`) giới thiệu ba lĩnh vực, bằng chứng tay
nghề, công trình và khách hàng, rồi mời tư vấn qua Zalo. Spec giữ thứ tự section, nội dung, hero,
reveal và responsive riêng của trang chủ. Header, menu, footer, veil, scroll thuộc
[shell](site-shell.md); build và route locale thuộc [phát hành tĩnh](static-release.md); file ảnh và
vệt sáng chờ ảnh thuộc [tải ảnh](media-delivery.md).

## Hành vi

### R1. Section và nội dung

`main#noi-dung` có một `h1` (hero) và bảy section theo bảng; section 2 đến 5 có `h2` `.sr-only`, closer có
`h2` hiện, marquee dùng `aria-label`. Sau `main` là lời mời dùng chung với ba trang detail rồi footer
([shell R10](site-shell.md#r10-floating-cta-và-footer)); cột Tone là `data-header-tone` ([shell R2](site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop)).

| # | Section | Nội dung (VI, EN ở `data-en`) | Link | Tone |
| --- | --- | --- | --- | --- |
| 1 | `.hero#top` | Sáu ảnh slideshow, `h1` "Làm chắc / Làm khác" ("Built solid / Made different", EN không dấu chấm, giống VI; bố cục theo [chữ hero](hero-typography.md)), nút dừng chuyển động, scroll cue | Cue cuộn tới section 2 | inverse |
| 2 | `#dich-vu` | Ba `a.service-portal`: Không gian Nhà ở, Không gian Kinh doanh, Sản phẩm Quảng cáo, mỗi portal một phụ đề | `/vi/residential/`, `/vi/commercial/`, `/vi/advertising-products/` | ink |
| 3 | `#tay-nghe` | Heritage: bốn hàng "Kinh nghiệm và / sáng tạo là / cam kết trong / Từng sản phẩm." xen bốn ảnh nhỏ | "Xem cách chúng tôi làm" tới `/vi/about/` | ink |
| 4 | `#nang-luc` | Ba `article.service-portal` không link: Vật liệu, Xưởng CNC, Quy trình (phụ đề "Năm bước: Khảo sát đến Hậu mãi", EN "Five steps: Survey to Aftercare"; EN Xưởng CNC là "Workshop"; bước theo [PRODUCT](../../PRODUCT.md)) | Không | ink |
| 5 | `#du-an` | Sáu `figure` công trình so le sinh từ dữ liệu, caption nêu đúng hạng mục trong ảnh (R8) | Không | ink |
| 6 | `.legacy-closer` | Banner CTA theo Espacio: ảnh xưởng toàn cảnh, `h2` "Giữ nghề, / Không ngừng làm mới" cỡ CTA chung, mỗi dòng không xuống dòng và chỉ co khi không vừa khung ([chữ hero R1](hero-typography.md#r1-xuống-dòng-theo-chốt-của-owner-2026-10-18)), dấu phẩy cuối dòng 1 là `.text-hang-end`, link "VỀ CHÚNG TÔI" sang About ([cảm giác cuộn R5](scroll-feel.md#r5-khối-giữ-nghề-theo-banner-cta-của-espacio)) | Không | inverse |
| 7 | `.capability-marquee--clients` | Marquee 12 logo khách hàng (R9) | Không | ink |
| sau | `.site-invitation` | "Có mặt bằng? Mời chúng tôi đến xem." | "Gọi Zalo tư vấn" mở `https://zalo.me/0949131050` ở tab mới | ink |

```gherkin
Given output đã build
When mở /vi/ và đọc main
Then có một h1 và bảy section theo thứ tự hero, #dich-vu, #tay-nghe, #nang-luc, #du-an, closer, marquee
And portal dịch vụ đầu trỏ /vi/residential/, phụ đề portal Quy trình là "Năm bước: Khảo sát đến Hậu mãi"
```

### R2. Head và bản EN

Head có `title` "Trường Thịnh — Hơn 20 năm vững tay nghề" (EN "Trường Thịnh — 20+ Years of Craft"),
`meta description` VI kèm `data-en-content`, `theme-color` trắng, favicon sáng, tối, preload hai font, CSS
Locomotive chỉ từ 981px; không có canonical, alternate, Open Graph, JSON-LD. Build ghi `/vi/`, `/en/` từ
cùng file ([phát hành R5](static-release.md#r5-văn-bản-song-ngữ-và-route-locale)), link nội bộ `/vi/...`
hoặc `/` thành `/<locale>/...`. Mọi chữ, `alt`, `aria-label` có cặp EN ở node lá; nhãn nút dừng
có `data-en-aria-label`, runtime đổi theo trạng thái (R3). Đổi ngôn ngữ tại chỗ theo [shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ).

```gherkin
Given output đã build
When mở /en/
Then html có lang="en", title là "Trường Thịnh — 20+ Years of Craft", h1 là "Built solid Made different"
And portal dịch vụ đầu trỏ /en/residential/, logo header trỏ /en/
```

### R3. Hero: slideshow và nút dừng

Sáu ảnh nền trang trí (`aria-hidden`, `alt=""`), owner duyệt 2026-10-17: phòng khách nhà ống, sảnh lễ tân, bếp và phòng ăn,
phòng ngủ óc chó, rồi hai hero Quảng cáo owner duyệt 2026-10-18: dãy mặt tiền bảng hiệu lúc chạng vạng, sảnh có tranh ốp tường (`home-hero-*`, 1920×1280 từ PNG SeedVR2.5). Thứ tự cả sáu slide, gồm ảnh đầu, ngẫu nhiên mỗi lần tải trang (owner 2026-10-17). Tải trực tiếp: script head, trước CSS, chọn ảnh đầu và preload (AVIF `imagesrcset`, `imagesizes="100vw"`; không `fetchpriority` để khỏi tranh băng thông với CSS); script module sau `.hero-slides` (không chặn parser, chạy khi parse xong, trước `motion.js`) xáo DOM, đưa slide đó lên đầu với `is-active`, gán `src`, `srcset`, `sizes="100vw"`, `fetchpriority="high"` khớp preload nên ảnh tải một lần. Route mềm: runtime chạy lại script đó. DOM đổi theo nên z-order, `:first-child` và slide đầu của runtime khớp ảnh đang hiện. Năm ảnh sau giữ `data-src`, runtime gán `src`, `srcset` khi trình duyệt rảnh, chậm nhất 1,8s (không có `requestIdleCallback` thì 250ms). Mỗi slide zoom `1.06` về `1` trong 6,6s; giây 5 crossfade 1,6s sang slide kế, cả hai ảnh vẫn đang zoom suốt crossfade (owner 10/10), lặp vòng, ảnh vào không nhảy scale.
Slideshow và scroll cue dừng khi hero ra khỏi viewport, tab ẩn hoặc bấm
`[data-motion-toggle]`: nút đổi `aria-pressed`, nhãn "Tạm dừng chuyển động" / "Tiếp tục chuyển động"
(EN "Pause motion" / "Resume motion"), dừng cả marquee (R9). Có Locomotive: `.hero-slides` parallax speed
`-2`. Hero cao `100svh`; tới 980px theo luồng chữ, tối thiểu `100svh`, cue xếp dưới tiêu đề nên chữ 200% không
đè header; tới 680px tiêu đề căn trái. Nút dừng nằm cột phải hero, ngay trên floating CTA đang hiện ở màn đầu
([shell R10](site-shell.md#r10-floating-cta-và-footer)): cách 16px, thẳng mép phải nút chữ; từ 750px trở xuống thẳng
trục giữa nút vuông, cách 14px. Hai nút không chồng nhau.

```gherkin
Given /vi/ ở 1440px, không reduced motion
When chờ slideshow đi hết sáu slide
Then sáu slide, gồm ảnh đầu, theo thứ tự ngẫu nhiên mỗi lần tải; ảnh đầu là ảnh đã preload, chỉ tải một lần
And mỗi lần chuyển là crossfade, scale ảnh vào không nhảy
When bấm nút dừng chuyển động
Then nút có aria-pressed="true", slide và marquee đứng yên
```

### R4. Hero vào trang và scroll cue

Bốn `.hero-word` hiện dần theo từ, bắt đầu 0,9s sau khi trang mount, ở mọi lần vào (tải trực tiếp,
route mềm); tải trực tiếp thì chạy song song lúc veil mở ([shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)).
Tải trực tiếp: nhánh intro (giữ nền tối, slide đầu mờ vào, kèm header intro) chạy dưới veil; route
mềm bỏ nhánh này, slide đầu và shade hiện ngay lúc mount. Scroll cue "CUỘN XUỐNG" /
"SCROLL DOWN": sau 3s ký tự lần lượt hiện rồi ẩn, lặp; bấm thì cuộn tới `#dich-vu`; cuộn quá 200px
thì cue mờ đi, rời thứ tự Tab.

```gherkin
Given /vi/ ở 768px, không reduced motion
When tải trực tiếp trang
Then veil phủ rồi mở, slide đầu hiện đầy đủ ngay khi trang dựng xong, tiêu đề hiện theo từ
When cuộn xuống 300px
Then scroll cue có is-hidden và tabindex="-1"
```

### R5. Portal: chữ một dòng, cùng cỡ

Portal dịch vụ có kicker, tiêu đề, phụ đề; portal năng lực có tiêu đề, phụ đề; tiêu đề nằm giữa card
theo chiều dọc. Cỡ chữ theo bề rộng card (container query) nên ba portal cùng nhóm cùng cỡ cho từng vai
trò. Toàn site chung token chữ portal (owner 2026-10-17): `--portal-title-size` weight 600, `--portal-kicker-size`, `--portal-subtitle-size` weight 700; portal loại hình trang con theo layout ba tầng của portal dịch vụ; portal năng lực cùng token, copy rút gọn để vừa (owner 2026-10-17). Mỗi vai trò một dòng, không tràn, cách mép card ít nhất 8px ở VI, EN, 320 tới 1920px, chữ gốc 200%;
không ép bằng `scaleX` hay `textLength`. Layout ba cột cao 600px; tới 980px một cột cao `72svh`; tới
680px cao 400px. Vào viewport: dòng tiêu đề trượt lên trong mask, trễ theo cột, phụ đề hiện sau. Hover
hoặc focus portal dịch vụ gạch chân phụ đề.

```gherkin
Given /en/ ở 320px, cỡ chữ gốc 200%
When đo sáu portal sau khi font tải xong
Then kicker, tiêu đề, phụ đề mỗi cái một dòng, nằm trong card cách mép ít nhất 8px
And ba portal cùng nhóm có cùng cỡ chữ theo vai trò, document không tràn ngang
```

### R6. Hover ảnh dùng chung

Portal là consumer của primitive hover ảnh dùng chung (trigger `.media-hover-zoom-trigger`, ảnh
`.media-hover-zoom`, CSS ở `style.css`), cũng dùng cho card masonry, related, suggestion inactive
([detail R5](advertising-detail.md#r5-suggestion)).
Chuột thật (`hover: hover` và `pointer: fine`) hoặc `:focus-visible` phóng ảnh trong khung; kích thước
card không đổi, ảnh bị clip; touch không giả hover. `portal-shade` (`--media-label-overlay`) giữ nguyên độ
tối ở normal, hover, focus. Consumer không thêm transition, scale riêng. Reduced motion: không zoom.

```gherkin
Given /vi/ ở 1440px với chuột
When hover lần lượt sáu portal
Then ảnh đạt scale 1.15 sau 600ms ease-out, kích thước card không đổi, màu portal-shade không đổi
When bật reduced motion
Then ảnh không còn transform hay transition
```

### R7. Heritage montage

Bốn hàng chữ hoa cỡ display; mỗi hàng gồm từ, ảnh nhỏ, từ; hàng căn giữa, trái, phải, giữa. Từ 681px chữ
nối (và, là, trong, từng; EN and, are, to, every) còn nửa cỡ (`.heritage-text--minor`) và cách ảnh bằng
margin ảnh như từ khóa; tới 680px mọi chữ cùng cỡ. Từ 981px hàng trái và phải lệch ra mép gutter. Khi vào
viewport, chữ trong mask trượt lên, từ thứ hai của hàng trễ 0,3s; ảnh phóng nhẹ và hiện sau. Hàng dài hơn
khung (EN "our commitment" ở 981-1282px) xuống dòng thay vì tràn mép trái; tới 980px từ dài còn ngắt.
Tới 680px cỡ chữ `6.5vw` (bằng motto Espacio cùng bề rộng) nên mỗi hàng nằm trên một dòng;
section không có padding dọc riêng nên khoảng trên và dưới chỉ bằng `section-gap`, link cách chữ 2rem.
Ảnh tính theo em của hàng (1.875em x 1.44em, giữ tỉ lệ chữ/ảnh như PC 1440px), cách chữ bằng `column-gap`
0.15em nên ảnh đầu dòng thẳng mép trái. Từ 681 tới 1299px các hàng cách thêm 0.2em, riêng 981-1279px hàng
1 và 2 dịch ngang (`translate`). Ở mọi bề rộng, mực ký tự nằm trong cột của ảnh dòng kề (cả dấu tiếng Việt)
cách ảnh ít nhất `max(0.1em, 6px)` ở vị trí cuối sau animation; thiếu thì `fitHeritageGaps` (`motion.js`)
chỉ giãn đúng cặp dòng đó (margin hàng dưới, hoặc `row-gap` với dòng wrap cùng hàng), chạy lại khi tải
trang, đổi bề rộng, đổi ngôn ngữ. Link "Xem cách chúng tôi làm" có mũi tên trượt khi hover.

```gherkin
Given /vi/ ở 390px
When cuộn tới #tay-nghe
Then bốn hàng hiện đủ chữ và ảnh, chữ không bị cắt, document không tràn ngang
And chữ cỡ khoảng 25.4px, mỗi hàng một dòng, khoảng từ section trước tới chữ và từ link tới section sau đều 64px
And ảnh khoảng 48x37px, không đè lên mực chữ của dòng nào
And ở 1185px sau animation, móc chữ Ẩ cách đáy ảnh sợi dây ít nhất 10px
```

### R8. Rail công trình

Card đầu dùng ảnh quán cà phê nhà phố `home-commercial-cafe` (owner duyệt 2026-10-18); portal Kinh doanh (R1) dùng ảnh riêng `home-commercial-cnc-cafe` (owner duyệt 2026-10-19) nên hai chỗ không trùng ảnh. Nguồn duy nhất là `src/site/content/project-reel.json` (chỉ build, test đọc): `renderProjectReel` (`scripts/site/project-reel.mjs`) validate, rồi build và preview Design System thay `<!-- project-reel-cards -->` trong `.project-track` bằng `figure.project-card` theo `order`; dữ liệu sai thì build dừng trước khi xóa output cũ. Ràng buộc, cũng là contract cho CMS phase ([CMS](cms.md)): 3 tới 6 card (dưới 3 mất nhịp so le, trên 6 card ở lưới 981px hẹp dưới 130px); `id` kebab-case, `order` nguyên dương, cả hai duy nhất, `id` giữ nguyên khi sửa nội dung; `variant` là `high`, `mid` hoặc `low` (`mid`, `low` cùng độ lệch), xen kẽ cao, thấp theo `order` vì tới 980px card chẵn luôn đẩy xuống; `src` là WebP `/assets/content/...` có trong `src/site/`, đã sinh biến thể ([tải ảnh R5](media-delivery.md#r5-chuẩn-file-ảnh)), `width`, `height` bằng pixel thật; `altVi`, `altEn`, `captionVi`, `captionEn` không rỗng, caption vài từ nêu đúng hạng mục trong ảnh, không dấu "/", không nêu tên thương hiệu trong ảnh. Card ảnh cao so le, caption có ô vuông màu lặp ba (xanh, cam, viền). Track là `region` focus được (`tabindex="0"`, nhãn "Nhịp công trình — cuộn ngang để xem thêm"); vào viewport track trượt vào từ phải, hover zoom ảnh. Từ 981px: lưới mỗi card một cột, cao tối thiểu 650px, caption dài thì lưới cao thêm, không bị cắt; có Locomotive thì track parallax ngang speed `4`; thiết bị có hover thì caption ẩn tới khi hover. Tới 980px: rail cuộn ngang, snap giữa card, ẩn thanh cuộn ngang ([shell R9](site-shell.md#r9-scrollbar)), card chẵn đẩy xuống.

```gherkin
Given /vi/ ở 390px
When vuốt ngang track công trình
Then track dừng ở từng card, mọi card tới được, document không tràn ngang
Given project-reel.json có hai card trùng id hoặc ảnh không tồn tại
When chạy pnpm prepare:site
Then build dừng với lỗi "project-reel data invalid", .site-output/ cũ còn nguyên
```

### R9. Closer và marquee khách hàng

Closer: ảnh xưởng phủ khung có shade; `h2` hai dòng trượt lên trong mask khi vào viewport, nhãn
hiện sau; hover zoom ảnh nhẹ; tới 980px khung cao 400px, chữ ngắt dòng trong khung.

Marquee: hai nhóm 12 logo giống hệt, nhóm sau `aria-hidden`, `alt=""`; thứ tự, tên, file khớp
`content/client-logos.json` (chỉ build, test đọc; không ra output). Logo tải `eager`, không vệt sáng.
Track chạy CSS `client-logo-marquee` lặp, không lộ mép nối, chỉ chạy (`is-running`) khi trong viewport,
tab hiện và chuyển động không bị dừng (R3). Reduced motion: đứng yên ở nhóm đầu.

```gherkin
Given /vi/ ở 1440px
When cuộn tới marquee
Then track có is-running, mỗi nhóm 12 logo, khe giữa hai nhóm lệch tối đa 0,5px ở mọi pha
```

### R10. Ảnh dưới chữ trắng

Hero, portal, closer đặt chữ trắng trên ảnh. Ảnh chưa giải mã xong: khung nền `media-loading-surface`,
chữ trắng vẫn hiện, ảnh opacity 0, shade ẩn; giải mã xong, runtime thêm `is-overlay-media-ready`, ảnh
và shade hiện. Ảnh hero có `<picture>` mang `is-media-settled` (script head) thì hiện luôn, không chờ runtime;
`motion-fallback` bỏ cổng này. Khung ảnh nội dung có vệt sáng tới khi ảnh giải mã xong (trừ
marquee, [tải ảnh R6](media-delivery.md#r6-vệt-sáng-chờ-ảnh-tĩnh)); build bọc `<picture>` AVIF, `srcset` ([chuẩn file ảnh](media-delivery.md#r5-chuẩn-file-ảnh)).

```gherkin
Given ảnh portal đầu của #dich-vu bị trễ
When portal vào viewport
Then nền portal là #2b2c2b, chữ trắng hiện, ảnh opacity 0, shade ẩn
When ảnh tải xong
Then ảnh có is-overlay-media-ready, ảnh và shade hiện
```

### R11. Đổi ngôn ngữ phát lại section đang xem

Đổi ngôn ngữ tại chỗ thì section chiếm nhiều diện tích nhất trong viewport (hoặc section lúc mở
menu) phát lại entrance: tiêu đề portal và phụ đề, dòng heritage và ảnh, closer, rail, word fade
hero; nếu là hero thì slideshow chạy lại từ slide đầu của lần tải đó. Section khác giữ trạng thái. Runtime phát
`site:section-replay` kèm section đã phát lại.

```gherkin
Given /vi/ đang xem #nang-luc
When mở menu và chọn EN
Then tiêu đề ba portal năng lực trượt lên lại bằng chữ EN, section khác không reveal lại
```

### R12. Reduced motion, fallback, không JavaScript

Reduced motion: chỉ slide đầu (slide khác `display: none`), không zoom, word fade, reveal (chữ, ảnh ở
trạng thái cuối), nút dừng `hidden`, scroll cue tĩnh, marquee và hover zoom tắt. `motion-fallback`
([shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)): slide active và mọi target
reveal ở trạng thái cuối, không slideshow, nút dừng ẩn. Không JavaScript: hero, chữ hiện; không slide nào nhận `src`,
`.hero-slides` hiện nền cố định `home-hero-tube-house-living.webp` qua `@media (scripting: none)`.

```gherkin
Given trình duyệt bật reduced motion
When tải /vi/ ở 1024px
Then không phần tử reveal nào bị ẩn, slide đầu hiện ngay, nút dừng ẩn, marquee không chạy
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `.hero[data-hero-intro]`, `.hero-slide[data-slide]`, `img[data-src]`, `.hero-word`, `.hero-shade`, `[data-motion-toggle]`, `[data-scroll-cue]`, `[data-scroll-cue-label]` | Hero, nút dừng, scroll cue (R3, R4); `motion.js` đọc |
| DOM hook | `.service-portal`, `.portal-line`, `.portal-title__quiet`, `.portal-title__strong`, `.portal-title-mask`, `.portal-subtitle`, `.media-hover-zoom-trigger`, `.media-hover-zoom` | Portal và hover chung (R5, R6) |
| DOM hook | `.heritage-text > .heritage-line`, `.heritage-line--delay`, `.heritage-image`, `.project-track`, `.legacy-copy`, `.client-logo-marquee__track`, `__group` | Reveal, rail, marquee |
| Class runtime | `is-active`, `is-inview`, `is-subtitle-inview`, `is-overlay-media-ready`, `is-running`, `is-hidden` (cue), `motion-paused` (body) | `motion.js` ghi |
| Data | `src/site/content/client-logos.json`, `content/project-reel.json` | 12 logo: id, tên, file, viewBox, thứ tự; card rail (R8); build và test đọc |
| Hàm, event | `mountPageMotion`, `hydrateDeferredHeroImages`, `fitHeritageGaps` (R7), `state.replayMotion(section)` trong `motion.js`; event `site:section-replay` | Nội bộ, không export; test nghe event |
| Script | `scripts/site/sanitize-client-logos.ps1` | Làm sạch SVG logo khách hàng trước khi đưa vào `assets/content/client-logos/` |

## UI

Component [Hero](../../design-system/components/Hero/README.md), [Project reel](../../design-system/components/ProjectReel/README.md),
[Footer](../../design-system/components/Footer/README.md) (lời mời). Motion [trang chủ](../../design-system/motion.md#text),
[hover](../../design-system/motion.md#hover), [parallax](../../design-system/motion.md#smooth-scroll-và-parallax).
Mạch nội dung và ảnh: [Content](../../design-system/content.md#mạch-nội-dung-theo-route),
[crop](../../design-system/content.md#crop-và-con-người). Màu, chữ, layout: [Design System](../../design-system/README.md).

## Kiểm tra

E2E cần preview và `BASE_URL`; `TT_E2E_*_ONLY=1` chạy một phần `pnpm qa:site` (`site.e2e.cjs`).

| R | Test hoặc command |
| --- | --- |
| R1 | `TT_E2E_PORTAL_ONLY` (số portal, ảnh portal Advertising); smoke `pnpm qa:site`; thứ tự section và một `h1` chưa có test riêng |
| R2 | `static-locales.test.mjs`; `TT_E2E_HERO_INTRO_ONLY` (chữ hero VI, EN) |
| R3 | `TT_E2E_HERO_CONTINUITY_ONLY` (ảnh đầu khác slide 0, thứ tự xáo, preload khớp ảnh đầu với `Math.random` stub), `TT_E2E_WHEEL_ONLY` (parallax hero); `footer-consistency.e2e.mjs` (nút dừng không chồng floating CTA, 320×568 tới 1440×900); bấm nút dừng chưa có test |
| R4 | `TT_E2E_HERO_INTRO_ONLY`, `TT_E2E_SCROLL_CUE_ONLY` (12/13, xem Gate) |
| R5 | `TT_E2E_PORTAL_ONLY` (14 bề rộng × VI, EN, chữ 200%) |
| R6 | `TT_E2E_P5_MEDIA_HOVER_ONLY` (portal và gallery, duo, CTA ba trang con) |
| R7 | `mobile-layout-parity.e2e.mjs` (chữ không cắt); khoảng thở ảnh chưa có test |
| R8 | `project-reel.test.mjs` (validate, số card, caption, ảnh VI/EN), `TT_E2E_WHEEL_ONLY` (rail), `mobile-layout-parity.e2e.mjs` (control trong rail tới được) |
| R9 | `pnpm qa:client-assets`, `client-logo-marquee.e2e.cjs` |
| R10 | `TT_E2E_MEDIA_FALLBACK_ONLY` (hero, hero reduced, portal, closer), `image-loading-frame.e2e.mjs` |
| R11 | chưa có test trên trang chủ (`TT_E2E_LOCALE_SCROLL_ONLY` kiểm Residential) |
| R12 | `TT_E2E_REDUCED_ONLY`, `TT_E2E_HERO_INTRO_ONLY` (ca reduced), `client-logo-marquee.e2e.cjs` (reduced) |

## Gate còn mở

- Owner chưa nghiệm thu trên máy mình hover, overlay, chữ portal, ảnh portal Advertising, hero,
  heritage; khoảng thở dọc của ảnh heritage ở mọi breakpoint (intent owner) chưa có test. Owner, main.
- Cache hit: tải lại, ảnh lazy `home-residential-kitchen` ở mép màn hình chưa xong trong 2 frame;
  chưa xác nhận vệt sáng có lóe. Main đo lại.
- Không có canonical, alternate, Open Graph, JSON-LD; `/` của output ở [phát hành tĩnh](static-release.md#gate-còn-mở).
  [CẦN LÀM RÕ: cần SEO head trước khi public?] Owner.
- Lời mời và floating CTA trỏ Zalo `https://zalo.me/0949131050`, cùng số hotline ([PRODUCT](../../PRODUCT.md)).
- [ADR hero trang chủ](../decisions/home-hero-crossfade-drift.md) ghi giữ media `2.6s` khi vào thẳng; code giữ `1s`
  (`introOffset` trong `motion.js`). [CẦN LÀM RÕ: giữ `2.6s` hay `1s`?] Owner.

## Chú thích thuật ngữ

- **Portal**: card ảnh lớn có chữ trắng, dẫn tới một lĩnh vực hoặc nêu một năng lực.
- **Heritage montage**: các hàng chữ display xen ảnh nhỏ kể cam kết tay nghề.
- **Closer**: khối ảnh toàn khung có câu kết trước marquee.
- **Marquee**: dải logo chạy ngang lặp vô hạn.
- **Scroll cue**: nút chữ ở đáy hero mời cuộn xuống.
- **Primitive, consumer**: khối CSS dùng chung; phần giao diện chỉ gắn class để dùng nó.
