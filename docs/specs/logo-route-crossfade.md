---
title: Logo crossfade khi chuyển trang
status: planned
source: []
tests:
  - tests/site/logo-route-crossfade.e2e.mjs
notion: none
updated: 2026-10-11
---

# Logo crossfade khi chuyển trang

## Mục đích

Khi chuyển trang, mark của logo đổi giữa trắng và CMYK bằng crossfade thay cho kiểu bốn dải mọc từ chân.
Spec này thay phần "Chuyển route" trong [state machine màu](../../design-system/brand.md#state-machine-màu)
và luồng pin header của [Shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell). Cuộn trong trang, lần
vẽ đầu và full menu giữ [Brand](../../design-system/brand.md#motion). Veil giữ nguyên
([Shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)). Owner chốt intent 2026-10-11 qua interview-me.

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
- Full menu, intro, FLIP scale, tone chữ header, thời lượng và easing của veil không đổi.
- Reduced motion: không veil, mark đổi ngay sang trạng thái cuối ([Shell R13](site-shell.md#r13-reduced-motion)).

## Hiệu năng

Crossfade chỉ ghi `opacity` của lớp màu, không đọc layout mỗi frame. Giữ NFR fps trên A05s: tối đa 5% frame
dưới 60fps (p5 SurfaceFlinger từ 60), không long task trên 50ms trong lúc chuyển trang.

## UI

Logo: [BrandLockup](../../design-system/components/BrandLockup/README.md), [Brand motion](../../design-system/brand.md#motion).
Thiết kế chờ code: [Đã duyệt, chờ code](../../design-system/approved-designs.md#logo-crossfade-khi-chuyển-trang).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | `tests/site/logo-route-crossfade.e2e.mjs`: 1440px và 412×915, ghi mọi animation trên path của mark trong lúc chuyển `/vi/` sang Residential, Advertising, Advertising sang `/vi/`, đổi ngôn ngữ; đếm số lần đổi màu, chỉ cho opacity, không clip-path |
| R6 | `TT_E2E_BRAND_COLOR_ONLY` (mọc khi cuộn), `TT_E2E_REDUCED_ONLY` |
| Hiệu năng | Đo A05s thật qua adb khi điều phối giao máy |

## Gate còn mở

- Chưa code. Owner duyệt spec, rồi plan, rồi code.
- Đo fps chuyển trang trên A05s thật: A05s đang rút khỏi PC, ghi vào nợ phiên sau.
- Owner xem visual trên demo sau khi merge. Owner.

## Chú thích thuật ngữ

- **Mark**: phần hình tam giác bốn dải của logo.
- **Crossfade**: lớp cũ mờ đi trong khi lớp mới hiện lên tại cùng vị trí.
- **Veil**: lớp trắng phủ toàn màn hình khi chuyển trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Hero**: section đầu trang.
