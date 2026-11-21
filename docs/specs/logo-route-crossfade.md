---
title: Logo đổi màu khi chuyển trang
status: live
source: []
tests:
  - tests/site/logo-route-crossfade.e2e.mjs
  - tests/site/brand-mark-flip.e2e.mjs
notion: none
updated: 2026-11-15
---

# Logo đổi màu khi chuyển trang

## Mục đích

Khi chuyển trang, logo và navbar đổi màu theo nhịp Espacio (đo code và từng frame, owner 2026-11-15), giữ kiểu lật mark
của Brand. Rời trang có navbar trắng: ngay lúc bấm, chữ đổi dần sang `#2f2f2f` và mark lật sang CMYK. Trang đích gắn
vào dưới veil: chữ đổi dần sang tone trang đích, mark lật theo, rồi veil mở ngay, không giữ tối thiểu. Cả cụm logo
luôn hiện trên veil (R7). Thay quy tắc 2026-11-09 (chữ đổi ngay, chờ veil kín) và mức giữ veil `0.7s` (2026-11-13).
Spec này mô tả phần "Chuyển route" trong [state machine màu](../../design-system/brand.md#state-machine-màu)
và luồng pin header của [Shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell). Cuộn trong trang, lần
vẽ đầu và full menu giữ [Brand](../../design-system/brand.md#motion). Veil giữ nguyên
([Shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)).

## Hành vi

### R1. Lúc bấm: chữ đậm, mark CMYK

Bấm link route mềm: header ghim lại; chữ, nav và hamburger đổi dần sang `#2f2f2f` trong `0.3s expo.out` (như
`colorHeader` của Espacio); mark đang trắng lật sang CMYK ngay lúc đó (kiểu lật của
[Brand](../../design-system/brand.md#motion), `0.68s`, cyan trước), xong trước khi veil phủ kín (`0.75s power4.inOut`);
mark đang CMYK thì giữ, không lật.

```gherkin
Given /vi/ ở đầu trang, mark và chữ trắng trên hero ảnh, 1440px hoặc 412×915
When click Residential
Then chữ bắt đầu đổi sang #2f2f2f ngay lúc bấm và đậm hẳn trước khi veil phủ kín
And mark bắt đầu lật sang CMYK ngay lúc bấm, không có tween fill
```

### R2. Trang đích gắn vào: tone trang đích

Trang đích gắn vào dưới veil còn phủ kín: chữ đổi dần `0.3s expo.out` sang tone trang đích, mark lật sang màu trang
đích: trắng nếu trang đích có hero ảnh (section đầu không có `data-header-tone="ink"`, lật lùi, đen trước), CMYK nếu
hero trắng (đã CMYK thì không lật). Lượt lật CMYK của R1 chưa xong thì tua ngược từ chỗ đang dừng. Veil mở ngay khi
trang sẵn sàng (chờ font như cũ), không có thời gian phủ kín tối thiểu (owner 2026-11-15). Lúc gỡ veil, nếu tone
trang đích đã đổi (layout còn dịch), mark lật sang đúng màu.

```gherkin
Given /vi/ ở đầu trang
When click Residential, chờ veil mở xong
Then chữ dừng ở đúng ba màu: trắng, #2f2f2f, trắng
And lần đổi sang trắng bắt đầu khi veil còn phủ kín, veil mở trong 400 ms sau đó
And mark kết thúc ở trắng (is-brand-inverse)
```

### R3. Trang hero trắng

Trang hero trắng (Advertising, Công trình, Tin tức): đi từ hero ảnh vào thì mark lật sang CMYK lúc bấm (R1) rồi giữ.
Đi từ hero trắng: mark CMYK suốt, chỉ lật khi trang đích gắn vào nếu trang đích có hero ảnh. Hero trắng sang hero trắng:
chữ giữ `#2f2f2f`, mark không lật.

```gherkin
Given /vi/advertising-products/ ở đầu trang, mark CMYK
When click Công trình, chờ veil mở xong
Then chữ giữ #2f2f2f, mark không lật
```

### R4. Đổi ngôn ngữ

Đổi ngôn ngữ dùng cùng pha phủ (R1, veil phủ `0.75s`), rồi tải lại trang đích như F5
([Shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ), owner 2026-11-08). Không có R2: trang mới vào như tải
trực tiếp, header dưới veil, intro chạy lại và mark vẽ lần đầu theo [Brand](../../design-system/brand.md#motion).
Lúc bấm, cả header (logo, navbar, nút menu) ẩn ngay để không lộ chữ ngôn ngữ cũ khi menu đóng trên veil; veil
trắng phủ trống tới khi trang mới tải, rồi header ngôn ngữ mới hiện theo intro (owner 2026-11-10). Ngoại lệ của R7.

### R5. Chuyển giữa chừng

Bấm link lúc mark đang lật dở (cuộn vừa đổi màu): lượt lật đang chạy sang CMYK thì chạy tiếp; đang chạy sang trắng thì
tua ngược về CMYK theo [Brand](../../design-system/brand.md#motion).

### R6. Giữ nguyên phần còn lại

- Cuộn trong một trang (sticky, section trắng hoặc tối, về đầu trang) vẫn lật dải theo Brand, chữ đổi ngay.
- Tải trực tiếp, F5, Back không qua bfcache: lần vẽ đầu giữ như Brand (CMYK lật lên từ lớp đen dưới veil).
- Full menu, intro, FLIP scale, thời lượng và easing của veil không đổi.
- Reduced motion: không veil, mark đổi ngay sang trạng thái cuối
  ([Shell R13](site-shell.md#r13-reduced-motion)).

### R7. Cụm logo luôn hiện trên veil

Mỗi lần chuyển trang theo R1 tới R4, cả cụm logo trên header (mark, chữ "TRƯỜNG THỊNH" và dòng phụ "NỘI THẤT
· QUẢNG CÁO") giữ `opacity 1` và nằm trên veil (header `z-index 1000`, veil `999`), nên lúc veil phủ kín vẫn
thấy logo: chữ `#2f2f2f`, mark CMYK. Áp dụng cho PC và điện thoại, mọi route mềm, route từ full menu, kể cả trang
hero trắng. Đổi ngôn ngữ là ngoại lệ: header ẩn cả cụm (R4, owner 2026-11-10). Owner bỏ kiểu cả cụm mờ cùng veil.

```gherkin
Given /vi/ ở đầu trang, 1440px hoặc 412×915
When click Residential
Then opacity của cụm logo giữ 1 suốt lúc veil phủ và mở
And mark, chữ, mục menu và hamburger không có opacity riêng
```

## Hiệu năng

Đổi màu chữ là một tween GSAP `color`/`stroke` `0.3s` trên vài phần tử header, chạy lúc bấm và lúc trang đích gắn vào. Lật mark là lớp lật của Brand, chỉ chạy transform và
opacity. Giữ [gate phone Android](scroll-feel.md#r7-trên-60fps-trên-phone-android) (fps trung bình từ 60) trong lúc chuyển trang.

## UI

Logo: [BrandLockup](../../design-system/components/BrandLockup/README.md), [Brand motion](../../design-system/brand.md#motion).
Code: `pinHeaderForRoute`, `inkRouteHeader` (gọi lúc bấm trong `coverRoute`), `tweenRouteHeader`, `playRouteEnter`
(đổi tone trang đích trước khi chờ font), `clearRouteEntry`, `colorHeader` (tween khi `headerColorTween`), `paintHeaderMark`, `leadHeaderMark` (không chờ nhịp khi `headerMarkLeadFor` là
`0`), `updateHeader` (`routeVeilInk`) trong `src/site/motion.js`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R3 | `tests/site/logo-route-crossfade.e2e.mjs`: 1440px và 412×915, `/vi/` sang Residential, Advertising, Advertising sang `/vi/` và Công trình; ghi mỗi frame màu chữ, lớp lật, opacity veil; không tween fill mark, không clip-path; chữ dừng đúng các màu đích, bắt đầu đổi sang đậm lúc bấm và đậm hẳn trước khi veil kín, đổi sang tone trang đích khi veil còn kín; lượt lật CMYK bắt đầu lúc bấm, lượt lật về trắng lúc trang đích gắn vào; veil mở trong 400 ms sau khi trang đích gắn; trắng sang trắng không lật |
| R5 | `tests/site/logo-route-crossfade.e2e.mjs`: bấm link lúc đang lật, lượt lật chạy tiếp, không tween fill |
| R7 | `tests/site/logo-route-crossfade.e2e.mjs`: opacity cụm logo giữ `1` mọi frame; mark, chữ, nav, hamburger giữ `1`; reduced motion |
| R6 | `TT_E2E_BRAND_COLOR_ONLY` (đổi màu khi cuộn), `TT_E2E_REDUCED_ONLY`; `brand-mark-flip.e2e.mjs` (từng dải lật quanh trục riêng, cyan trước, chỉ transform và opacity, đổi hướng giữ mặt đang hiện) |
| Hiệu năng | phone Android thật: SurfaceFlinger `--timestats`, 4 kịch bản R1 tới R4, 3 lượt mỗi kịch bản (lớp lật đã đo ở Brand, không đo lại) |

## Gate còn mở

- Owner xem visual trên demo sau khi merge. Owner.

## Chú thích thuật ngữ

- **Mark**: phần hình tam giác bốn dải của logo.
- **Tween màu**: đổi dần giá trị màu (`fill`, `color`) từ màu đầu tới màu cuối trong một khoảng thời gian; chuyển trang dùng cho chữ, không dùng cho mark.
- **Lật mark**: từng dải của mark xoay quanh trục riêng để đổi màu ([Brand](../../design-system/brand.md#motion)).
- **Veil**: lớp trắng phủ toàn màn hình khi chuyển trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Hero**: section đầu trang.
