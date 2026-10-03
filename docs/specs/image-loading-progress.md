---
title: Đặc tả khung chờ và vòng tải ảnh toàn website
type: frontend
status: accepted
updated: 2026-09-25
module_id: image-loading-progress
capability_map: advertising-random-grid-and-image-loading-capability-map.md
depends_on: static-image-delivery
related_docs:
  - static-image-delivery.md
  - ../design/content.md
  - ../design/motion.md
  - advertising-skeleton-flow.md
---

# Đặc tả khung chờ và vòng tải ảnh toàn website

## Mục tiêu và phạm vi

Khi ảnh nội dung đang tải trên website public, khách thấy khung chờ có **đúng
kích thước và tỷ lệ cuối** cùng một vòng tiến trình tròn ở giữa. Cung tròn
phản ánh byte ảnh đã nhận so với tổng byte **khi biết tổng**, không hiển thị
chữ số phần trăm. Ảnh sẵn sàng thì vòng biến mất, ảnh hiện ra bằng motion đang
được duyệt. Khung chờ này khác batch skeleton Flow trước CTA của Advertising.

Áp dụng cho ảnh nội dung trên home, residential, commercial, about,
Advertising parent/detail, gallery, suggestion và ảnh mở rộng. Logo/biểu tượng
nhận diện, favicon, ảnh nền chỉ trang trí và canvas skeleton CTA không dùng
vòng này. Không random grid của route ngoài Advertising.

## Giả định cần owner kiểm trong spec

- Khi response không có tổng byte đáng tin, vòng ở trạng thái chờ không xác
  định; không tính phần trăm từ thời gian, kích thước dự đoán hay số request.
- Ảnh đã nằm trong browser cache và decode được ngay không lóe vòng chờ.
- Không đổi hành vi đóng dialog khi ảnh phóng to lỗi; các media frame thông
  thường giữ khung trung tính và alt thay vì sập kích thước.

## State và visual contract

| State | Hiển thị | Điều kiện |
| --- | --- | --- |
| `reserved` | Khung đúng ratio, nền loading theo token hiện hành | Trước khi request bắt đầu, kể cả ảnh lazy ngoài viewport |
| `loading-known` | Vòng tròn biểu diễn `loadedBytes / totalBytes`, không có số | Tổng byte response hợp lệ và đã nhận chunk thật |
| `loading-unknown` | Vòng chờ không xác định, không có số | Response không có tổng byte hoặc browser không cho đọc |
| `ready` | Ảnh đã decode, vòng rời khỏi frame, reveal/fade hiện hành | Chỉ sau khi nội dung ảnh sẵn sàng |
| `error` | Khung trung tính giữ tỷ lệ, alt và đường tương tác còn dùng được | Request/decode lỗi; fullscreen viewer giữ lifecycle lỗi hiện hành |

Khung phải có width/height hoặc `aspect-ratio` lấy từ pixel thật/manifest trước
request; không đợi `naturalWidth` mới cấp chỗ. Không crop/kéo méo chỉ để vừa
skeleton. Vòng dùng palette trung tính và nét mảnh, không che caption, nhãn,
control hoặc vùng bấm. Vòng không là nút, không nhận focus/pointer. Trạng thái
loading được thông báo vừa đủ bằng `aria-busy`; không spam live region theo từng
chunk. Reduced motion giữ frame và cung tiến trình tĩnh theo byte; trạng thái
không xác định không quay liên tục.

Giữ media reveal/fade/hover hiện hành, trong đó slideshow suggestion không tự zoom.
Không đặt thêm một lớp opacity gate làm ảnh đã decode vẫn bị ẩn. Khi ảnh đổi
do slideshow hoặc route lifecycle, cleanup listener, request và object URL của
ảnh cũ; không gắn vòng của ảnh A lên ảnh B.

## Contract byte thật và hiệu năng

- Chỉ tiến tới một tỷ lệ xác định khi byte nhận thực sự tăng. Dùng cùng request
  cung cấp ảnh hiển thị; không tải thêm bản sao ảnh để đo. Chỉ dùng
  `Content-Length` làm mẫu số khi đã xác nhận nó cùng đơn vị với byte mà
  `Response.body` trả về. Nếu header thiếu/sai, body không đọc được,
  `Content-Encoding` biến đổi đơn vị đếm, hoặc số byte vượt tổng đã khai báo,
  chuyển `loading-unknown`; không kẹp cung ở 100% để che sai số. Với cache hit,
  đi thẳng `ready`.
- Giữ phát hiện sớm/ưu tiên hero, native lazy cho ảnh dưới fold và bounded
  Advertising virtualization. Không buộc mọi ảnh đi qua một hàng đợi JS hoặc
  buffer toàn catalog trước khi hiển thị. Nếu đường đọc byte làm chậm LCP,
  media-ready hoặc tăng request/byte ngoài [gate delivery](static-image-delivery.md),
  phương án đó không đạt; phải thử giải pháp khác trước khi phát hành.
- Cả direct load, Barba/soft navigation, Back/Forward, đổi locale/filter,
  resize, rapid scroll, tab hidden và abort đều phải có state đúng. Ảnh thật
  không biến thành skeleton CTA và CTA/footer không đổi geometry vì trạng thái
  tải ảnh.

Đọc chunk qua Fetch `ReadableStream` là một **phương án để đánh giá**, chưa
được chốt cho mọi ảnh. [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
cho phép đếm chunk; [Content-Length](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length)
có thể vắng mặt. [Fetch Standard](https://fetch.spec.whatwg.org/) và
[vấn đề giải nén/giữ header](https://github.com/whatwg/fetch/issues/1729)
cho thấy cần kiểm encoding trước khi chia byte từ stream cho `Content-Length`.
Native `<img>` không phát event tiến trình byte từng chunk;
việc thay `src` hero bằng JS fetch cần chứng minh không làm chậm ảnh đầu trang.
[HTML image lifecycle](https://html.spec.whatwg.org/multipage/images.html) là
nguồn chuẩn cho load/error và cách browser xử lý ảnh.

Đầu implementation phải thử một hero và một card lazy trong môi trường tách
biệt, đo request count, time-to-decode và memory/cleanup. Nếu chưa có đường
tải đạt đồng thời byte thật và gate tốc độ, dừng rollout toàn site, đưa số đo
cho owner chọn tradeoff; không thay bằng phần trăm giả.

## Giao diện module và nơi đặt code

Provider [static-image-delivery](static-image-delivery.md) sở hữu URL/variant,
pixel dimensions và priority. Module này chỉ sở hữu trạng thái tải/reveal;
điểm gắn ở `src/site/motion.js`, `src/site/detail.js`, các HTML public và
`src/site/advertising-products/catalog-runtime.mjs`/`photo-viewer.mjs`.
Ví dụ state cho test và UI, chưa khóa function signature:

```js
const mediaLoad = {
  status: "loading-known",
  loadedBytes: 32768,
  totalBytes: 98304,
};
```

Trong phase tĩnh, HTML/no-script path vẫn phải hiển thị ảnh cùng alt và kích
thước thật khi JavaScript lỗi; cách giữ fallback không được gây request trùng
trên JS path. Không thêm dependency spinner, WebGL, service worker hoặc endpoint
server chỉ để vẽ vòng.

## Lệnh và kiểm thử

| Mục đích | Lệnh |
| --- | --- |
| Build và static contract | `pnpm prepare:site` rồi `pnpm qa:static` |
| Media regression hiện hành | `node --test tests/site/advertising-products-media.test.mjs tests/site/advertising-products-lifecycle.test.mjs` |
| Browser preview | `pnpm dev` |

Test mới phải stream ảnh thử theo chunk có/không có tổng byte và response có
`Content-Encoding`/header lệch: xác nhận chỉ dùng determinate khi đơn vị khớp,
cung tròn chỉ tăng theo byte thật, không có text số, cache hit không lóe, error giữ
frame, abort/Back không leak hoặc request trùng. Browser matrix VI/EN ở
`320/390/768/1024/1440` gồm hero, dịch vụ, Advertising card/related,
gallery, suggestion và viewer; kiểm CLS, geometry trước/sau, screenshot slow
network, reduced motion, keyboard/touch và failure. Đo candidate trên Sites
theo [phương pháp delivery](static-image-delivery.md#phương-pháp-đo-và-điều-kiện-nghiệm-thu),
không dùng vẻ mượt của vòng thay bằng chứng ảnh thật tải nhanh. Owner spot-check
loading state VI/EN trên mobile và desktop trước merge/deploy.

## Ranh giới

- **Luôn làm:** reuse token/motion hiện hành, giữ alt VI/EN và cập nhật
  `docs/design/content.md`, `docs/design/motion.md` cùng owning component guide
  khi hành vi thực sự đổi.
- **Cần owner duyệt riêng:** đổi ảnh/crop, redesign hover/reveal, đổi visual
  direction/token hay làm chậm ảnh quan trọng để lấy progress chính xác.
- **Không làm:** hiển thị phần trăm số, progress giả theo timer, download ảnh
  hai lần, đặt spinner trên skeleton CTA hoặc che ảnh mãi khi JS thất bại.

## Chú thích thuật ngữ

- **Frame**: khung có tỷ lệ dành sẵn cho ảnh thật trước khi tải.
- **Determinate**: biết tổng byte nên có thể biểu diễn phần đã tải.
- **Indeterminate**: chưa biết tổng byte nên không tính được phần trăm thật.
- **Decode**: bước browser chuyển bytes ảnh thành bitmap sẵn sàng hiển thị.
