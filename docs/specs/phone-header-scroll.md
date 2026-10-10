---
title: Header đi theo ngón tay trên điện thoại
status: planned
source: []
tests: []
notion: none
updated: 2026-10-10
---

# Header đi theo ngón tay trên điện thoại

## Mục đích

Trên điện thoại header chiếm chỗ và hiện lại quá dễ khi đọc, xem ảnh. Spec này thay
[Shell R3](site-shell.md#r3-header-ẩn-khi-cuộn-xuống-hiện-khi-cuộn-lên) trên điện thoại: header đi theo
quãng cuộn từng pixel như app mạng xã hội X, không ngưỡng, không animation ẩn hiện một lượt. Desktop,
tablet và mọi phần khác của header giữ [Shell R2, R3](site-shell.md#r2-header-tone-thu-gọn-lockup-và-nav-desktop).
Owner chốt intent 2026-10-10 qua interview-me.

## Hành vi

### R1. Phạm vi điện thoại

Áp dụng khi `(hover: none) and (pointer: coarse) and (max-width: 750px)` (mốc 750px là mốc đã ẩn nav
desktop, agent chọn). Ngoài điều kiện này, kể cả điện thoại xoay ngang rộng hơn 750px, header chạy Shell R3.
Đổi qua lại điều kiện (xoay máy, resize) thì header về hiện đủ rồi chạy theo chế độ mới.

```gherkin
Given A05s dọc (khoảng 412px CSS, touch)
When đổi sang ngang rộng hơn 750px
Then header hiện đủ và theo Shell R3; xoay về dọc thì theo spec này
```

### R2. Header đi theo quãng cuộn

Gọi `H` là quãng để header khuất hẳn (gutter trên cộng hàng header). Header có độ lệch `offset` trong
`[0, H]`, vẽ bằng `translateY(-offset)`. Mỗi lần `scrollY` đổi một lượng `delta` thì
`offset = clamp(offset + delta, 0, H)`, rồi `offset = min(offset, scrollY)`. Cuộn xuống bao nhiêu thì
header khuất bấy nhiêu, cuộn lên bao nhiêu thì lộ ra bấy nhiêu, kể cả từ đầu trang. Không ngưỡng
150px, không vùng giữa trang, không tự hiện gần cuối trang. Cuộn quán tính sau khi thả tay vẫn tính
như cuộn. Phần nảy đàn hồi ngoài giới hạn cuộn (đầu, cuối trang) không tính.

```gherkin
Given trang ở scrollY 0, header hiện đủ
When cuộn xuống 30px
Then header lệch lên 30px; cuộn lên 10px thì lệch 20px
```

### R3. Thả tay giữ nguyên

Khi cuộn dừng, header giữ đúng `offset` đang có, không tự trượt về hiện hẳn hay ẩn hẳn. Header
không có transition khi đi theo cuộn để không trễ sau ngón tay.

```gherkin
Given header đang lộ một nửa
When thả tay và cuộn dừng hẳn
Then header vẫn lộ một nửa
```

### R4. Lúc header hiện đủ

`offset = 0` khi: mở menu, bắt đầu chuyển route mềm, `pageshow`, focus vào phần tử trong header,
khôi phục vị trí cuộn khi Back. Sau đó cuộn tiếp thì tính lại theo R2. Đang khóa cuộn (menu, viewer)
thì không tính delta.

```gherkin
Given header đang khuất hẳn ở giữa trang
When mở menu rồi đóng
Then header hiện đủ; cuộn xuống 40px thì khuất 40px
```

### R5. Giữ nguyên phần còn lại

Kích thước thanh, logo, `is-collapsed` khi `scrollY > 100`, FLIP lockup, tone theo section, menu,
floating CTA giữ như Shell R2, R4, R10. Reduced motion vẫn đi theo cuộn vì header chỉ đi theo thao tác
của người dùng, không tự chạy (agent chọn).

## Hiệu năng

Chỉ ghi `transform` một lần mỗi frame, không đọc layout trong vòng cuộn. Giữ NFR fps hiện có trên A05s:
tối đa 5% frame dưới 60fps (p5 SurfaceFlinger từ 60), không long task trên 50ms khi cuộn trang dài.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1–R4 | Playwright touch emulation 412×915 (`hasTouch`, `isMobile`): đo `translateY` của header sau từng lần cuộn; chưa có test |
| R1 | Playwright 1440px và 920px: header vẫn theo Shell R3 |
| Hiệu năng | Đo A05s thật qua adb, xin điều phối trước khi dùng máy |

## Gate còn mở

- Owner duyệt spec này, rồi duyệt plan. Owner.
- Owner vuốt thử trên A05s sau khi code, so cảm giác với X. Owner.

## Chú thích thuật ngữ

- **Header**: thanh trên cùng có logo và nút menu.
- **Offset**: quãng header đang bị đẩy lên khỏi mép trên, tính bằng pixel.
- **Cuộn quán tính**: trang còn trôi sau khi thả tay vuốt nhanh.
- **Nảy đàn hồi**: trang kéo quá đầu hoặc cuối rồi bật lại.
- **Route mềm**: đổi trang bằng Barba, giữ document và phần tử shell.
- **Touch emulation**: giả lập màn hình cảm ứng trong trình duyệt để test.
