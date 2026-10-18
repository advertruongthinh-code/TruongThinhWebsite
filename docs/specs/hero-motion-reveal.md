---
title: Reveal hero Residential, Commercial không đẩy LCP
status: planned
source: []
tests: []
notion: https://app.notion.com/p/3f5332849a0e812097c9ff929981a1e4
updated: 2026-10-18
---

# Reveal hero Residential, Commercial không đẩy LCP

## Mục đích

Gate phát hành còn mở: LCP Residential mobile có hai mode. Khi JS về trước lúc title hero được vẽ, SplitText và GSAP
trong `src/site/detail.js` đẩy LCP tới cuối animation (4,2 đến 5,5 s, 3/7 lượt đo); nếu không thì khoảng 3,25 s
([phát hành tĩnh](static-release.md#gate-còn-mở)). Spec này chốt cách giảm LCP mà không bớt chuyển động nào. Owner:
"không cắt motion", nên mọi timing và kiểu motion của [trang con R5](detail-pages.md) giữ nguyên.

## Hiện trạng đã đọc trong code (`detail.js`)

- Title hero tách từ bằng SplitText `type: "words"`, từ ẩn tới khi `finishRebuild` chạy; sau đó mỗi từ fade `1s expo.out`,
  stagger `0.2s`, delay `0.9s` (profile mặc định) hoặc `0.6s` (`words-06`).
- Kicker vào sau title: delay `1.2s` hoặc `0.9s` (`words-06`). Wrapper và media hero zoom bằng transition CSS.
- `finishRebuild` chỉ chạy sau khi các group chữ trên trang được chuẩn bị theo lô (`prepareBatch`) trong khung nhìn rảnh.
  Suy luận (chưa đo): hero title phải chờ cả lô này nên bắt đầu fade muộn, và phần tử chữ chỉ thành ứng viên LCP khi đã
  hiện.

## Hành vi

### R1. Đo trước khi đổi

Trước mọi thay đổi code, đo LCP và phần tử LCP của `/vi/residential/` và `/vi/commercial/`: mobile 390 và PC 1440,
mỗi bên ít nhất 10 lượt, có và không throttle CPU, trên phone Android nối adb và Chromium cloud. Kết quả (median, p90,
tên phần tử) ghi vào mô tả PR. Kết quả đo quyết định chọn phương án ở R2; không đoán.

### R2. Hai phương án (owner chọn A, 2026-10-18)

| Phương án | Nội dung | Đổi gì người dùng thấy | Rủi ro |
| --- | --- | --- | --- |
| A, khuyên dùng | Giữ nguyên chuỗi motion. Tách việc hero khỏi lô `prepareBatch`: chuẩn bị title hero trước và độc lập, các group chữ còn lại chuẩn bị sau khi hero đã bắt đầu. Ảnh hero vẫn là phần tử lớn nhất trong khung đầu | Không | Phải đảm bảo thứ tự khi đổi ngôn ngữ và route mềm |
| B | Title hero có sẵn trong HTML ở trạng thái đầu của animation (mờ nhưng đã vẽ, không `opacity: 0` toàn khối) để trình duyệt ghi LCP sớm | Lúc tải, có thể thấy chữ mờ thoáng qua trước khi fade | Có thể lệch cảm giác "chữ hiện từng từ"; cần owner nhìn thử |

Cả hai giữ: timing ở trên, reduced motion (chữ và ảnh ở trạng thái cuối, không animation), không JavaScript (chữ hiện),
đổi ngôn ngữ tại chỗ, Back và route mềm ([trang con R11](detail-pages.md)).

### R3. Tiêu chí đạt

```gherkin
Given trang Residential hoặc Commercial, mobile 390, mạng và CPU chuẩn của máy đo
When đo 10 lượt LCP sau thay đổi
Then median LCP không cao hơn median lúc chưa có hai mode (khoảng 3,25 s)
And p90 không vượt 3,5 s
And phần tử LCP là ảnh hero, không phải một từ của title

Given cùng trang
When so với bản trước thay đổi
Then thời điểm bắt đầu và kết thúc fade của title, kicker, zoom media lệch không quá 50 ms ở cùng điều kiện
```

### R4. Ngoài phạm vi

Không đổi nhịp hero, profile, ảnh, copy hay trang chủ. Hero trang chủ có gate riêng (`2.6s` hay `1s`) ở
[trang chủ](page-home.md#gate-còn-mở). Mục Hiệu năng còn lại của card (Locomotive trên điện thoại, animation thuộc tính
layout, `will-change`) làm ở spec khác.

## Gate còn mở

- Owner chọn phương án A (2026-10-18, "theo đề xuất"); B bị loại. Cần plan được duyệt trước khi code.
- Đo R1 trên phone Android nối adb cần phiên PC.

## Chú thích thuật ngữ

- **LCP**: thời điểm phần tử lớn nhất trong khung nhìn đầu được vẽ.
- **SplitText**: thư viện GSAP tách chữ thành từ hoặc dòng để animate.
- **Reveal**: chữ hoặc ảnh hiện dần khi vào khung nhìn.
- **Median, p90**: giá trị giữa và giá trị mà 90% lượt đo không vượt.
- **Throttle CPU**: giới hạn tốc độ CPU khi đo để giống máy yếu.
- **Reduced motion**: tùy chọn hệ điều hành giảm animation.
