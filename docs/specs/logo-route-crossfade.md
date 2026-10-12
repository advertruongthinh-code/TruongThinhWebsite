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

Khi chuyển trang, mark của logo đổi giữa trắng và CMYK bằng crossfade `0.3s` cùng tween màu chữ, thay cho kiểu
bốn dải mọc từ chân; cả cụm logo luôn hiện trên veil, theo nhịp chuyển trang của Espacio (R7).
Spec này mô tả phần "Chuyển route" trong [state machine màu](../../design-system/brand.md#state-machine-màu)
và luồng pin header của [Shell R6](site-shell.md#r6-route-mềm-và-click-trong-shell). Cuộn trong trang, lần
vẽ đầu và full menu giữ [Brand](../../design-system/brand.md#motion). Veil giữ nguyên
([Shell R7](site-shell.md#r7-veil-khi-tải-trực-tiếp-fallback-và-bfcache)). Owner chốt intent 2026-10-11 qua interview-me;
R7 owner chốt 2026-10-12 sau khi so đo Espacio frame theo frame và xem bản thử (kiểu a, PR #309).

## Hành vi

### R1. Crossfade lúc bấm

Bấm link route mềm khi mark đang trắng: lớp trắng mờ dần, lớp CMYK hiện dần tại chỗ ngay lúc bấm, trong
`0.3s expo.out`, cùng tween với chữ, nav, hamburger sang `#2f2f2f`; veil phủ sau đó (`0.75s power4.inOut`).
Chỉ đổi `opacity`, hình bốn dải không đổi, không frame nào có dải mọc (`clip-path`). Mark đang CMYK thì không
chạy gì.

```gherkin
Given /vi/ ở đầu trang, mark trắng trên hero ảnh, 1440px hoặc 412×915
When click Residential
Then mark chuyển trắng sang CMYK chỉ bằng opacity, bắt đầu ngay lúc bấm và xong trong khoảng 0.3s
And không path nào của mark có animation clip-path
```

### R2. Crossfade lúc veil mở

Trang đích có hero ảnh (section đầu không có `data-header-tone="ink"`): mark giữ CMYK suốt lúc veil phủ kín,
rồi CMYK mờ dần, trắng hiện dần trong `0.3s expo.out` lúc veil bắt đầu mở, cùng tween chữ sang trắng. Trang đích hero trắng
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
- Full menu, intro, FLIP scale, tone chữ header, thời lượng và easing của veil không đổi.
- Reduced motion: không veil, mark đổi ngay sang trạng thái cuối
  ([Shell R13](site-shell.md#r13-reduced-motion)).

### R7. Cụm logo luôn hiện trên veil

Mỗi lần chuyển trang theo R1 tới R4, cả cụm logo trên header (mark, chữ "TRƯỜNG THỊNH" và dòng phụ "NỘI THẤT
· QUẢNG CÁO") giữ `opacity 1` và nằm trên veil (header `z-index 1000`, veil `999`), nên lúc veil phủ kín vẫn
thấy logo: chữ `#2f2f2f`, mark CMYK. Mark và chữ đổi màu cùng lúc, cùng `0.3s expo.out` (R1, R2), như Espacio
(logo, nav, hamburger đổi màu chung một tween ngay lúc bấm, logo không mờ). Áp dụng cho PC và điện thoại, mọi
route mềm, đổi ngôn ngữ, route từ full menu, kể cả trang hero trắng. Owner bỏ kiểu cả cụm mờ cùng veil
(#303) ngày 2026-10-12.

```gherkin
Given /vi/ ở đầu trang, 1440px hoặc 412×915
When click Residential
Then opacity của cụm logo giữ 1 suốt lúc veil phủ và mở
And mark, chữ, mục menu và hamburger không có opacity riêng
```

## Hiệu năng

Crossfade chỉ ghi `opacity` của lớp màu, không đọc layout mỗi frame. Giữ [gate A05s](../decisions/a05s-frame-budget.md)
(fps trung bình từ 60) trong lúc chuyển trang.

## UI

Logo: [BrandLockup](../../design-system/components/BrandLockup/README.md), [Brand motion](../../design-system/brand.md#motion).
Code: `paintHeaderMark` (tùy chọn `fade`, lớp `.brand-lockup__mark-fade`), `pinHeaderForRoute`, `playRouteEnter`,
`clearRouteEntry`, `colorHeader`, `syncDocumentState` (giữ class `is-brand-*`)
trong `src/site/motion.js`.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R5 | `tests/site/logo-route-crossfade.e2e.mjs`: 1440px và 412×915, ghi mọi animation trên path của mark trong lúc chuyển `/vi/` sang Residential, Advertising, Advertising sang `/vi/`, đổi ngôn ngữ; đếm số lần đổi màu, chỉ cho opacity, không clip-path; crossfade dưới 0.5s, sang CMYK bắt đầu lúc bấm, sang trắng bắt đầu khi veil phủ kín |
| R7 | `tests/site/logo-route-crossfade.e2e.mjs`: opacity cụm logo giữ `1` mọi frame; mark, chữ, nav, hamburger giữ `1`; reduced motion |
| R6 | `TT_E2E_BRAND_COLOR_ONLY` (mọc khi cuộn), `TT_E2E_REDUCED_ONLY` |
| Hiệu năng | A05s thật: SurfaceFlinger `--timestats`, 4 kịch bản R1 tới R4, 3 lượt mỗi kịch bản (số đo trong PR đóng gate #307; kiểu a chỉ bớt tween opacity và rút crossfade, không đo lại) |

## Gate còn mở

- Owner xem visual trên demo sau khi merge. Owner.

## Chú thích thuật ngữ

- **Mark**: phần hình tam giác bốn dải của logo.
- **Crossfade**: lớp cũ mờ đi trong khi lớp mới hiện lên tại cùng vị trí.
- **Veil**: lớp trắng phủ toàn màn hình khi chuyển trang.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Hero**: section đầu trang.
