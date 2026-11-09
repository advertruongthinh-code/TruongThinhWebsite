---
title: Logo đổi màu khi chuyển trang
status: live
source: []
tests:
  - tests/site/logo-route-crossfade.e2e.mjs
  - tests/site/brand-mark-flip.e2e.mjs
notion: none
updated: 2026-11-09
---

# Logo đổi màu khi chuyển trang

## Mục đích

Khi chuyển trang, logo trên header đổi màu theo veil trắng (owner 2026-11-09). Lúc bấm, chữ và mark giữ màu đang
có. Khi veil phủ kín, chữ đổi ngay sang `#2f2f2f`, không motion, và mark lật sang CMYK từ đúng lúc đó (đang CMYK
thì giữ). Khi veil bắt đầu mở, chữ đổi ngay sang tone trang đích và mark lật sang màu trang đích. Không có tween
màu nào trong lúc chuyển trang; cả cụm logo luôn hiện trên veil (R7).
Spec này mô tả phần "Chuyển route" trong [state machine màu](../../design-system/brand.md#state-machine-màu)
và luồng pin header của [Shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell). Cuộn trong trang, lần
vẽ đầu và full menu giữ [Brand](../../design-system/brand.md#motion). Veil giữ nguyên
([Shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)).

## Hành vi

### R1. Veil phủ kín: chữ đậm, mark CMYK

Bấm link route mềm: header ghim lại, chữ, nav, hamburger và mark giữ màu đang có; veil phủ trong
`0.75s power4.inOut`. Đúng frame veil phủ kín, chữ, nav và hamburger đổi ngay sang `#2f2f2f`, không có màu trung
gian. Mark đang trắng thì lật sang CMYK ngay từ frame đó, không chờ nhịp header (kiểu lật của
[Brand](../../design-system/brand.md#motion), `0.68s`, cyan trước); mark đang CMYK thì giữ, không lật.

```gherkin
Given /vi/ ở đầu trang, mark và chữ trắng trên hero ảnh, 1440px hoặc 412×915
When click Residential
Then chữ giữ trắng tới khi veil phủ kín, rồi đổi ngay sang #2f2f2f, không màu trung gian
And mark bắt đầu lật sang CMYK khi veil phủ kín, không có tween fill
```

### R2. Veil bắt đầu mở: tone trang đích

Veil phủ kín ít nhất `1s` (owner 2026-11-09, dài hơn một lượt lật mark `0.68s`) rồi mới mở, kể cả khi trang đích có trong cache hoặc tải
rất nhanh, để chữ đậm và mark CMYK hiện đủ lâu trên veil, navbar không chớp (owner 2026-11-09); trang tải lâu hơn
thì veil mở khi trang sẵn sàng như trước. Lúc veil bắt đầu mở, chữ đổi ngay sang tone trang đích, mark lật sang màu trang đích: trắng nếu trang đích có hero
ảnh (section đầu không có `data-header-tone="ink"`, lật lùi, đen trước), CMYK nếu hero trắng (đã CMYK thì không
lật). Lượt lật CMYK của R1 chưa xong thì tua ngược từ chỗ đang dừng. Lúc gỡ veil, nếu tone trang đích đã đổi so
với lúc veil bắt đầu mở (layout còn dịch), mark lật sang đúng màu.

```gherkin
Given /vi/ ở đầu trang
When click Residential, chờ veil mở xong
Then chữ có đúng ba màu: trắng, #2f2f2f lúc veil phủ kín, trắng lúc veil bắt đầu mở
And mark kết thúc ở trắng (is-brand-inverse)
```

### R3. Trang hero trắng

Trang đích hero trắng (hiện là Advertising `/vi/advertising-products/`, `/en/advertising-products/`): mark lật sang
CMYK lúc veil phủ kín (R1), rồi giữ CMYK lúc veil mở. Đi từ trang hero trắng: mark CMYK suốt lúc veil phủ, chỉ lật
lúc veil mở nếu trang đích có hero ảnh.

```gherkin
Given /vi/ ở đầu trang, mark trắng
When click Advertising, chờ veil mở xong
Then mark lật sang CMYK khi veil phủ kín, rồi giữ CMYK
```

### R4. Đổi ngôn ngữ

Đổi ngôn ngữ dùng cùng pha phủ (R1, veil phủ `0.75s`), rồi tải lại trang đích như F5
([Shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ), owner 2026-11-08). Không có R2: trang mới vào như tải
trực tiếp, header dưới veil, intro chạy lại và mark vẽ lần đầu theo [Brand](../../design-system/brand.md#motion).

### R5. Chuyển giữa chừng

Bấm link lúc mark đang lật dở (cuộn vừa đổi màu): lúc bấm mark giữ nguyên, nên lượt lật chạy tiếp; khi veil phủ
kín, mark chạy tới hoặc tua ngược về CMYK theo [Brand](../../design-system/brand.md#motion).

### R6. Giữ nguyên phần còn lại

- Cuộn trong một trang (sticky, section trắng hoặc tối, về đầu trang) vẫn lật dải theo Brand, chữ đổi ngay.
- Tải trực tiếp, F5, Back không qua bfcache: lần vẽ đầu giữ như Brand (CMYK lật lên từ lớp đen dưới veil).
- Full menu, intro, FLIP scale, thời lượng và easing của veil không đổi.
- Reduced motion: không veil, mark đổi ngay sang trạng thái cuối
  ([Shell R13](site-shell.md#r13-reduced-motion)).

### R7. Cụm logo luôn hiện trên veil

Mỗi lần chuyển trang theo R1 tới R4, cả cụm logo trên header (mark, chữ "TRƯỜNG THỊNH" và dòng phụ "NỘI THẤT
· QUẢNG CÁO") giữ `opacity 1` và nằm trên veil (header `z-index 1000`, veil `999`), nên lúc veil phủ kín vẫn
thấy logo: chữ `#2f2f2f`, mark CMYK. Áp dụng cho PC và điện thoại, mọi route mềm, route từ full menu (đổi ngôn
ngữ chỉ có pha phủ, rồi tải lại trang), kể cả trang hero trắng. Owner bỏ kiểu cả cụm mờ cùng veil.

```gherkin
Given /vi/ ở đầu trang, 1440px hoặc 412×915
When click Residential
Then opacity của cụm logo giữ 1 suốt lúc veil phủ và mở
And mark, chữ, mục menu và hamburger không có opacity riêng
```

## Hiệu năng

Đổi màu chữ là một lần ghi `color` inline, không tween. Lật mark là lớp lật của Brand, chỉ chạy transform và
opacity. Giữ [gate phone Android](../decisions/phone-frame-budget.md) (fps trung bình từ 60) trong lúc chuyển trang.

## UI

Logo: [BrandLockup](../../design-system/components/BrandLockup/README.md), [Brand motion](../../design-system/brand.md#motion).
Code: `pinHeaderForRoute`, `inkRouteHeader` (gọi lúc veil phủ kín trong `coverRoute`), `playRouteEnter` (chờ
`routeVeilHold`),
`clearRouteEntry`, `colorHeader`, `paintHeaderMark`, `leadHeaderMark` (không chờ nhịp khi `headerMarkLeadFor` là
`0`), `updateHeader` (`routeVeilInk`) trong `src/site/motion.js`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R3 | `tests/site/logo-route-crossfade.e2e.mjs`: 1440px và 412×915, `/vi/` sang Residential, Advertising, Advertising sang `/vi/`; ghi mỗi frame màu chữ, lớp lật, opacity veil; không tween fill, không clip-path; chữ chỉ có đúng các màu đích, đổi sang đậm từ lúc veil phủ kín, sang tone trang đích lúc veil bắt đầu mở; lượt lật đầu bắt đầu từ lúc veil phủ kín, đúng màu và chiều; veil phủ kín ít nhất 1s |
| R5 | `tests/site/logo-route-crossfade.e2e.mjs`: bấm link lúc đang lật, lượt lật chạy tiếp, không tween fill |
| R7 | `tests/site/logo-route-crossfade.e2e.mjs`: opacity cụm logo giữ `1` mọi frame; mark, chữ, nav, hamburger giữ `1`; reduced motion |
| R6 | `TT_E2E_BRAND_COLOR_ONLY` (đổi màu khi cuộn), `TT_E2E_REDUCED_ONLY`; `brand-mark-flip.e2e.mjs` (từng dải lật quanh trục riêng, cyan trước, chỉ transform và opacity, đổi hướng giữ mặt đang hiện) |
| Hiệu năng | phone Android thật: SurfaceFlinger `--timestats`, 4 kịch bản R1 tới R4, 3 lượt mỗi kịch bản (lớp lật đã đo ở Brand, không đo lại) |

## Gate còn mở

- Owner xem visual trên demo sau khi merge. Owner.

## Chú thích thuật ngữ

- **Mark**: phần hình tam giác bốn dải của logo.
- **Tween màu**: đổi dần giá trị màu (`fill`, `color`) từ màu đầu tới màu cuối trong một khoảng thời gian; chuyển trang không dùng.
- **Lật mark**: từng dải của mark xoay quanh trục riêng để đổi màu ([Brand](../../design-system/brand.md#motion)).
- **Veil**: lớp trắng phủ toàn màn hình khi chuyển trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Hero**: section đầu trang.
