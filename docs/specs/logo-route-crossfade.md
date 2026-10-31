---
title: Logo đổi màu khi chuyển trang
status: live
source: []
tests:
  - tests/site/logo-route-crossfade.e2e.mjs
  - tests/site/brand-mark-rise.e2e.mjs
notion: none
updated: 2026-10-31
---

# Logo đổi màu khi chuyển trang

## Mục đích

Khi chuyển trang, mark của logo đổi màu như Espacio: lúc bấm, mark sang màu đậm `#2f2f2f` cùng chữ bằng một tween
màu `0.3s`; lúc veil mở, mark về màu trang đích (trắng hoặc CMYK) cũng bằng tween màu. Không còn kiểu bốn dải mọc
từ chân hay lớp crossfade trong lúc chuyển trang; cả cụm logo luôn hiện trên veil (R7).
Spec này mô tả phần "Chuyển route" trong [state machine màu](../../design-system/brand.md#state-machine-màu)
và luồng pin header của [Shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell). Cuộn trong trang, lần
vẽ đầu và full menu giữ [Brand](../../design-system/brand.md#motion). Veil giữ nguyên
([Shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)). Veil dùng mark đậm theo
Espacio (kiểu b) thay mark CMYK, không có crossfade riêng của mark.

## Hành vi

### R1. Sang màu đậm lúc bấm

Bấm link route mềm: từng dải của mark tween `fill` từ màu đang hiển thị (trắng hoặc CMYK) sang `#2f2f2f` ngay lúc
bấm, trong `0.3s expo.out`, cùng lúc với chữ, nav, hamburger; veil phủ sau đó (`0.75s power4.inOut`). Hình bốn
dải không đổi, không frame nào có dải mọc (`clip-path`), không có lớp chồng.

```gherkin
Given /vi/ ở đầu trang, mark trắng trên hero ảnh, 1440px hoặc 412×915
When click Residential
Then fill của mark và chữ cùng chuyển sang #2f2f2f, bắt đầu ngay lúc bấm và xong trong khoảng 0.3s
And không path nào của mark có animation clip-path
```

### R2. Về màu trang đích lúc veil mở

Mark giữ màu đậm suốt lúc veil phủ kín. Lúc veil bắt đầu mở, từng dải tween sang màu trang đích trong
`0.3s expo.out`, cùng tween chữ: trắng nếu trang đích có hero ảnh (section đầu không có
`data-header-tone="ink"`), CMYK nếu hero trắng. Mỗi lần chuyển trang có đúng hai tween màu: R1 rồi R2.
Lúc gỡ veil, nếu tone trang đích đã đổi so với lúc veil bắt đầu mở (layout còn dịch), mark sửa bằng tween màu
ngắn `0.3s power2.out`, không bao giờ mọc dải trong lúc chuyển trang.

```gherkin
Given /vi/ ở đầu trang
When click Residential, chờ veil mở xong
Then mark có đúng hai tween màu: sang đậm lúc bấm, sang trắng lúc veil bắt đầu mở
And lúc veil phủ kín mark là #2f2f2f
```

### R3. Trang hero trắng

Trang đích hero trắng (hiện là Advertising `/vi/advertising-products/`, `/en/advertising-products/`): mark sang
đậm lúc bấm (R1), rồi từng dải về CMYK của nó lúc veil mở (R2). Mark đang CMYK lúc bấm vẫn sang đậm, vì mark
luôn cùng màu chữ trên veil (kiểu b).

```gherkin
Given /vi/ ở đầu trang, mark trắng
When click Advertising, chờ veil mở xong
Then mark sang đậm lúc bấm, sang CMYK lúc veil bắt đầu mở, rồi giữ CMYK
```

### R4. Đổi ngôn ngữ

Đổi ngôn ngữ dùng cùng veil ([Shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ)) nên theo R1 tới R3
(owner duyệt).

### R5. Chuyển giữa chừng

Bấm link lúc mark đang mọc dở (cuộn vừa đổi màu): dừng kiểu mọc, gỡ lớp cũ, từng dải tween từ màu đang có
của nó sang đậm theo R1. Bấm link khi tween màu trước còn chạy: tween mới đi tiếp từ màu hiện tại.

### R6. Giữ nguyên phần còn lại

- Cuộn trong một trang (sticky, section trắng hoặc tối, về đầu trang) vẫn mọc từ chân theo Brand.
- Tải trực tiếp, F5, Back không qua bfcache: lần vẽ đầu giữ như Brand (CMYK mọc trên lớp đen dưới veil).
- Full menu, intro, FLIP scale, tone chữ header, thời lượng và easing của veil không đổi.
- Reduced motion: không veil, mark đổi ngay sang trạng thái cuối
  ([Shell R13](site-shell.md#r13-reduced-motion)).

### R7. Cụm logo luôn hiện trên veil

Mỗi lần chuyển trang theo R1 tới R4, cả cụm logo trên header (mark, chữ "TRƯỜNG THỊNH" và dòng phụ "NỘI THẤT
· QUẢNG CÁO") giữ `opacity 1` và nằm trên veil (header `z-index 1000`, veil `999`), nên lúc veil phủ kín vẫn
thấy logo: chữ và mark cùng `#2f2f2f`. Mark và chữ đổi màu cùng lúc, cùng `0.3s expo.out` (R1, R2), như Espacio
(logo, nav, hamburger đổi màu chung một tween ngay lúc bấm, logo không mờ). Áp dụng cho PC và điện thoại, mọi
route mềm, đổi ngôn ngữ, route từ full menu, kể cả trang hero trắng. Owner bỏ kiểu cả cụm mờ cùng veil.

```gherkin
Given /vi/ ở đầu trang, 1440px hoặc 412×915
When click Residential
Then opacity của cụm logo giữ 1 suốt lúc veil phủ và mở
And mark, chữ, mục menu và hamburger không có opacity riêng
```

## Hiệu năng

Tween màu chỉ ghi `fill` của bốn path, không đọc layout mỗi frame, không thêm lớp DOM. Giữ [gate phone Android](../decisions/phone-frame-budget.md)
(fps trung bình từ 60) trong lúc chuyển trang.

## UI

Logo: [BrandLockup](../../design-system/components/BrandLockup/README.md), [Brand motion](../../design-system/brand.md#motion).
Code: `paintHeaderMark` (tùy chọn `tween`, class `is-brand-ink`), `pinHeaderForRoute`, `playRouteEnter`,
`clearRouteEntry`, `colorHeader`, `syncDocumentState` (giữ class `is-brand-*`)
trong `src/site/motion.js`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | `tests/site/logo-route-crossfade.e2e.mjs`: 1440px và 412×915, ghi mọi animation trên path của mark trong lúc chuyển `/vi/` sang Residential, Advertising, Advertising sang `/vi/`, đổi ngôn ngữ; đếm tween màu (fill inline trên path), không clip-path; mỗi tween dưới 0.5s, sang đậm bắt đầu lúc bấm, sang màu trang đích bắt đầu khi veil phủ kín và trước khi mở xong |
| R7 | `tests/site/logo-route-crossfade.e2e.mjs`: opacity cụm logo giữ `1` mọi frame; mark, chữ, nav, hamburger giữ `1`; reduced motion |
| R6 | `TT_E2E_BRAND_COLOR_ONLY` (mọc khi cuộn), `TT_E2E_REDUCED_ONLY`; `brand-mark-rise.e2e.mjs` (lớp màu mọc từ chân lên theo thứ tự dải, cùng xong ở 1s) |
| Hiệu năng | phone Android thật: SurfaceFlinger `--timestats`, 4 kịch bản R1 tới R4, 3 lượt mỗi kịch bản (kiểu b thay lớp crossfade bằng tween fill trên bốn path, nhẹ hơn, không đo lại) |

## Gate còn mở

- Owner xem visual trên demo sau khi merge. Owner.

## Chú thích thuật ngữ

- **Mark**: phần hình tam giác bốn dải của logo.
- **Tween màu**: đổi dần giá trị màu (`fill`, `color`) từ màu đầu tới màu cuối trong một khoảng thời gian.
- **Veil**: lớp trắng phủ toàn màn hình khi chuyển trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Hero**: section đầu trang.
