---
title: Logo crossfade khi chuyển trang
status: live
source: []
tests:
  - tests/site/logo-route-crossfade.e2e.mjs
notion: none
updated: 2026-10-12
---

# Logo crossfade khi chuyển trang

## Mục đích

Khi chuyển trang, mark của logo đổi giữa trắng và CMYK bằng crossfade thay cho kiểu bốn dải mọc từ chân,
và cả cụm logo (mark và chữ) mờ đi rồi hiện lại cùng veil (R7).
Spec này mô tả phần "Chuyển route" trong [state machine màu](../../design-system/brand.md#state-machine-màu)
và luồng pin header của [Shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell). Cuộn trong trang, lần
vẽ đầu và full menu giữ [Brand](../../design-system/brand.md#motion). Veil giữ nguyên
([Shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)). Owner chốt intent 2026-10-11 qua interview-me;
R7 owner chốt 2026-10-12 qua interview-me.

## Hành vi

### R1. Crossfade lúc veil phủ

Bấm link route mềm khi mark đang trắng: lớp trắng mờ dần, lớp CMYK hiện dần tại chỗ, cùng lúc và cùng nhịp
với veil phủ (`0.75s power4.inOut`). Chỉ đổi `opacity`, hình bốn dải không đổi, không frame nào có dải mọc
(`clip-path`). Mark đang CMYK thì không chạy gì.

```gherkin
Given /vi/ ở đầu trang, mark trắng trên hero ảnh, 1440px hoặc 412×915
When click Residential
Then trong lúc veil phủ, mark chuyển trắng sang CMYK chỉ bằng opacity, xong cùng lúc veil phủ kín
And không path nào của mark có animation clip-path
```

### R2. Crossfade lúc veil mở

Trang đích có hero ảnh (section đầu không có `data-header-tone="ink"`): mark giữ CMYK suốt lúc veil phủ kín,
rồi CMYK mờ dần, trắng hiện dần cùng lúc và cùng nhịp với veil mở (`1s power4.inOut`). Trang đích hero trắng
thì mark giữ CMYK, không chạy gì. Từ trang ảnh sang trang ảnh có đúng hai crossfade: R1 rồi R2 (owner chốt).
Lúc gỡ veil, nếu tone trang đích đã đổi so với lúc veil bắt đầu mở (layout còn dịch), mark sửa bằng crossfade
ngắn `0.3s power2.out`, không bao giờ mọc dải trong lúc chuyển trang.

```gherkin
Given /vi/ ở đầu trang
When click Residential, chờ veil mở xong
Then mark có đúng hai lần đổi màu, cả hai bằng opacity: trắng sang CMYK lúc phủ, CMYK sang trắng lúc mở
And lúc veil phủ kín mark là CMYK
```

### R3. Trang hero trắng chỉ đổi một lần

Đi từ trang khác tới trang có hero trắng (hiện là Advertising `/vi/advertising-products/`,
`/en/advertising-products/`): mark đổi màu tối đa một lần, là crossfade R1; đang CMYK sẵn thì không đổi lần
nào. Không còn hai lần mọc như hiện tại.

```gherkin
Given /vi/ ở đầu trang, mark trắng
When click Advertising, chờ veil mở xong
Then mark có đúng một lần đổi màu, trắng sang CMYK bằng opacity, rồi giữ CMYK
```

### R4. Đổi ngôn ngữ

Đổi ngôn ngữ dùng cùng veil ([Shell R5](site-shell.md#r5-đổi-ngôn-ngữ-và-ghi-nhớ)) nên theo R1 tới R3
(agent chọn, owner duyệt trong intent).

### R5. Chuyển giữa chừng

Bấm link lúc mark đang mọc dở (cuộn vừa đổi màu): dừng kiểu mọc, phần đang hiển thị làm lớp cũ và mờ đi,
lớp đích hiện dần theo R1. Không frame nào trống mark hoặc có hai lớp cùng đậm đặc ở trạng thái cuối.

### R6. Giữ nguyên phần còn lại

- Cuộn trong một trang (sticky, section trắng hoặc tối, về đầu trang) vẫn mọc từ chân theo Brand.
- Tải trực tiếp, F5, Back không qua bfcache: lần vẽ đầu giữ như Brand (CMYK mọc trên lớp đen dưới veil).
- Full menu, intro, FLIP scale, tone chữ header, thời lượng và easing của veil không đổi; mục menu và hamburger
  không mờ theo R7.
- Reduced motion: không veil, mark đổi ngay sang trạng thái cuối, cụm logo không mờ
  ([Shell R13](site-shell.md#r13-reduced-motion)).

### R7. Cả cụm logo mờ và hiện cùng veil

Mỗi lần chuyển trang theo R1 tới R4, cả cụm logo trên header (mark, chữ "TRƯỜNG THỊNH" và dòng phụ "NỘI THẤT · QUẢNG CÁO") là một
khối: `opacity` của cụm đi `1 → 0` cùng lúc và cùng nhịp với veil phủ (`0.75s power4.inOut`), nên lúc veil
phủ kín không thấy logo; rồi đi `0 → 1` cùng lúc và cùng nhịp với veil mở (`1s power4.inOut`). Mark và chữ
luôn cùng một độ mờ ở mọi frame, không phần nào mờ trước phần nào. Crossfade màu của mark (R1 tới R3) và
đổi màu chữ theo tone header vẫn chạy như cũ, chỉ diễn ra bên trong lúc cụm đang mờ hoặc đang hiện.
Áp dụng cho PC và điện thoại, mọi route mềm, đổi ngôn ngữ, route từ full menu, kể cả trang hero trắng.
Bấm link lúc veil đang mở: route không chạy lại (Barba bỏ qua click giữa lúc chuyển), cụm tiếp tục hiện cùng
veil, không đứng hình rồi nhảy về `1`. Đổi tone header giữa chừng chỉ hủy tween màu, không hủy opacity của cụm.

```gherkin
Given /vi/ ở đầu trang, 1440px hoặc 412×915
When click Residential
Then trong lúc veil phủ, opacity của cụm logo giảm cùng nhịp veil và bằng 0 khi veil phủ kín
And trong lúc veil mở, opacity của cụm tăng cùng nhịp veil và bằng 1 khi veil mở xong
And mark và chữ không có opacity riêng lệch nhau
And mục menu và hamburger không đổi opacity
```

## Hiệu năng

Crossfade và R7 chỉ ghi `opacity` (lớp màu, cụm logo), không đọc layout mỗi frame. Giữ [gate A05s](../decisions/a05s-frame-budget.md)
(fps trung bình từ 60) trong lúc chuyển trang.

## UI

Logo: [BrandLockup](../../design-system/components/BrandLockup/README.md), [Brand motion](../../design-system/brand.md#motion).
Code: `paintHeaderMark` (tùy chọn `fade`, lớp `.brand-lockup__mark-fade`), `pinHeaderForRoute`, `playRouteEnter`,
`coverRoute` và `playRouteEnter` (opacity `#header-logo` trong cùng timeline với veil), `clearRouteEntry` (trả opacity),
`colorHeader` (chỉ hủy tween `color`, `stroke`), `syncDocumentState` (giữ class `is-brand-*` và opacity logo)
trong `src/site/motion.js`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | `tests/site/logo-route-crossfade.e2e.mjs`: 1440px và 412×915, ghi mọi animation trên path của mark trong lúc chuyển `/vi/` sang Residential, Advertising, Advertising sang `/vi/`, đổi ngôn ngữ; đếm số lần đổi màu, chỉ cho opacity, không clip-path |
| R7 | `tests/site/logo-route-crossfade.e2e.mjs`: mỗi frame opacity cụm logo cộng opacity veil bằng 1, logo bằng 0 khi veil phủ kín, về 1 sau veil; mark, chữ, nav, hamburger giữ `1`; bấm link lúc veil mở; reduced motion logo giữ `1` |
| R6 | `TT_E2E_BRAND_COLOR_ONLY` (mọc khi cuộn), `TT_E2E_REDUCED_ONLY` |
| Hiệu năng | A05s thật: SurfaceFlinger `--timestats`, 4 kịch bản R1 tới R4, 3 lượt mỗi kịch bản (số đo trong PR đóng gate) |

## Gate còn mở

- Owner xem visual trên demo sau khi merge. Owner.

## Chú thích thuật ngữ

- **Mark**: phần hình tam giác bốn dải của logo.
- **Crossfade**: lớp cũ mờ đi trong khi lớp mới hiện lên tại cùng vị trí.
- **Veil**: lớp trắng phủ toàn màn hình khi chuyển trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Hero**: section đầu trang.
