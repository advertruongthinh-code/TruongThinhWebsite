---
title: Đặc tả tốc độ tải ảnh cho website tĩnh
type: frontend
status: accepted
updated: 2026-09-25
module_id: static-image-delivery
capability_map: advertising-random-grid-and-image-loading-capability-map.md
related_docs:
  - frontend-static-release.md
  - ../design/content.md
  - ../design/motion.md
  - ../decisions/sites-artifact-only-release-mirror.md
---

# Đặc tả tốc độ tải ảnh cho website tĩnh

## Mục tiêu và phạm vi

Ảnh nội dung trên website public VI/EN phải xuất hiện nhanh hơn trong phiên
tải mới trên Sites. Phạm vi gồm hero, gallery, ảnh dịch vụ và Advertising
parent/detail/suggestion/viewer; giữ chất lượng, tỷ lệ, alt, motion, route và
khả năng xem ảnh. Đo thực tế trước khi chọn thay đổi; bản Sites hiện hành là
baseline, bản mới phải được đo lại trong cùng điều kiện. Module này cung cấp
đường tải ảnh cho [image-loading-progress](image-loading-progress.md).

Đây là tối ưu website tĩnh, không mở CMS, Worker, D1/R2, CDN mới hoặc thay
branding. Chỉ ảnh có public consumer thuộc `src/site/`; ảnh nguồn chưa duyệt
trong `source-assets/` không tự được phát hành.

## Hiện trạng quan sát và delta được đề xuất

`scripts/site/prepare-static-assets.mjs` hiện copy media từ `src/site/` sang
`.site-output/` mà không tạo derivative; [content guide](../design/content.md#loading-và-alt)
giữ một WebP/card, hoãn `srcset/sizes` tới CMS. Các hero có ưu tiên cao;
ảnh dưới fold dùng lazy + async; Advertising card dùng LazySizes và
virtualization. Source này là baseline, không suy rằng mọi route đều có cùng
nút thắt.

Một phép đo thăm dò trên Sites version 2 ngày `2026-09-25`, phiên trình duyệt
mới, `390×844`, Slow 4G, CPU chậm 4 lần: đợt ảnh grid đầu của Advertising bắt
đầu khoảng `5,7 s`, ảnh cuối đợt xong khoảng `14,2 s`. Đây chỉ là **một lần đo**;
chưa là baseline thống kê hay bằng chứng nguyên nhân. Trước implementation,
đo lại bằng nhiều lượt cold-cache và phân rã request discovery, queue, transfer,
decode/reveal; chỉ tối ưu phần được đo là chậm.

Nếu số byte media là nút thắt, module **được phép đề xuất** derivative responsive
trong pipeline tĩnh, với URL/dimensions/provenance và kiểm chất lượng rõ ràng.
Khi owner duyệt spec và phương án đo xác nhận cần derivative, điều này thay
duy nhất câu hoãn derivative tới CMS trong content guide; không tạo pipeline
CMS thứ hai. Nếu thời điểm discovery/priority là nút thắt, giữ một WebP và sửa
đường request trước. Không chốt cách tối ưu từ quan sát một lượt.

## Contract hiệu năng và media

1. Giữ ảnh hero/LCP được phát hiện sớm và ưu tiên cao; không đặt `loading=lazy`
   lên ảnh nhìn thấy ngay. Ảnh dưới fold không tranh băng thông với ảnh đang
   nhìn; chỉ request đúng cohort cần thiết khi scroll/virtual window thay đổi.
2. Mỗi ảnh hiển thị dùng một URL/biến thể phù hợp kích thước hiển thị, không
   request trùng cho spinner, preloader, suggestion và `<img>`. Nếu có variant,
   giữ cùng nội dung/crop đã duyệt, intrinsic ratio thật, alt VI/EN, stable ID
   và không đưa nhầm asset source-only vào `.site-output/`.
3. Giữ browser cache hoạt động qua Back/locale/route; không thêm cache-buster
   chỉ để tạo cảm giác random. Bản cache nóng không phát sinh vòng loading giả.
4. Progress module không được trì hoãn thời điểm browser nhận diện ảnh quan
   trọng hoặc buộc tải toàn bộ ảnh ngoài viewport. Hệ thống phải đo riêng ảnh
   hero, ảnh grid và ảnh trong dialog; nếu transport báo byte thật gây chậm
   đáng kể, phương án đó không qua gate và phải được thiết kế lại.
5. Sites chỉ nhận `dist/` từ `.site-output/` cùng hosting manifest theo
   [release mirror](../decisions/sites-artifact-only-release-mirror.md); source,
   test, script, docs ở GitHub. Không chỉnh generated output bằng tay.

## Phương pháp đo và điều kiện nghiệm thu

- Trước thay đổi, lưu baseline từ Sites version hiện hành cho VI/EN ở home,
  residential, commercial, about, Advertising All và một detail. Chạy ít nhất
  5 lượt **cold** mỗi route đại diện ở `390×844` và `1440×900`, cùng Slow 4G,
  CPU chậm 4 lần và đường scroll cố định. Mỗi lượt dùng browser context mới
  hoặc cache disabled thực sự; kiểm `transferSize > 0` của ảnh mẫu, không dùng
  304/cache hit làm cold result. Đo warm cache riêng.
- Thu `navigation→LCP`, CLS, thời gian từ ảnh đầu vào viewport tới decode/reveal,
  thời điểm request đầu, số request/byte ảnh, kích thước biến thể, lỗi network
  và long task. Với Advertising random, ghi ID/kích thước của cohort đầu để
  giải thích khác biệt media giữa các lượt. So cùng ID/kích thước hoặc phân tầng
  theo byte cohort khi kết luận tốc độ; không tính lượt bốc ảnh nhẹ hơn là cải
  thiện delivery. Báo thêm median không phân tầng để phản ánh trải nghiệm thật.
- Trước khi publish, kiểm build candidate bằng local static preview, QA,
  browser và owner spot-check. Sites hiện có là public; không gọi URL Sites
  mới là preview riêng. Lưu version Sites đang chạy để rollback, rồi phát
  hành candidate theo [release mirror](../decisions/sites-artifact-only-release-mirror.md).
  Ngay sau deploy, đo version candidate **trên Sites** theo đúng ma trận và
  cùng điều kiện; nếu gate trượt, khôi phục version Sites trước và ghi evidence.
  Với hero đầu trang, đo `navigation→decode`; với ảnh lazy, đo từ lần scroll cố
  định đưa card đầu vào viewport tới `decode`. Advertising masonry phải giảm
  median thời gian ảnh đầu sẵn sàng ít nhất `10%`; route khác có median baseline
  trên `3 s` cũng phải giảm ít nhất `10%`. Mức giảm phải vượt biến thiên giữa
  các lượt; những route còn lại không chậm đi ngoài nhiễu đo. LCP không tăng
  quá `5%` ngoài nhiễu, CLS không quá `0,1` và không tăng do khung ảnh. Nếu
  chưa đạt, không gọi là tối ưu xong; thay hoặc bỏ kỹ thuật không đem lại lợi ích.
- Review bằng Network waterfall và màn hình browser thật tại đầu trang, scroll
  tới grid/gallery, Back, locale, mobile/desktop, normal/reduced motion. Static
  QA và browser smoke phải pass; focused metric không thay full-site parity gate.

Các ngưỡng `10%/5%/3 s` là **đề xuất để owner duyệt**, chưa phải số đo đã đạt.
Hiện chưa có RUM cho website; phép đo trên Sites chỉ chứng minh điều kiện thử,
không suy thành kết quả của mọi người dùng.
[Chrome LCP guidance](https://web.dev/articles/optimize-lcp) là nguồn cho việc
giữ ảnh quan trọng discoverable và không lazy-load; phép đo Sites mới quyết
định tối ưu cụ thể.

## Giao diện module và nơi đặt code

Source media nằm ở `src/site/assets/content/`; HTML và runtime thuộc
`src/site/`; script build ở `scripts/site/prepare-static-assets.mjs` nếu cần
biến thể. Một media record/HTML image phải truyền được URL, intrinsic dimensions,
vai trò ưu tiên và `alt`; progress module dùng cùng URL, không tạo bản sao
request riêng. Ví dụ biểu diễn nếu có variant:

```html
<img src="/assets/content/example.webp" width="1536" height="1024"
     srcset="/assets/content/example-768.webp 768w, /assets/content/example.webp 1536w"
     sizes="(max-width: 768px) 100vw, 50vw" alt="..." decoding="async">
```

Ví dụ chưa khóa danh sách variant, breakpoint hoặc pipeline; chỉ thể hiện
contract nhất quán giữa kích thước thật, URL và browser selection.

## Lệnh và kiểm thử

| Mục đích | Lệnh |
| --- | --- |
| Build artifact | `pnpm prepare:site` |
| Static contract | `pnpm qa:static` |
| Media contract | `node --test tests/site/advertising-products-media.test.mjs` |
| Local preview | `pnpm dev` |

Test build/asset kiểm đúng URL, dimensions, alt, variant được tham chiếu, không
trùng request do source/runtime và không đưa source/test/docs vào Sites mirror.
Browser đo cold/warm trên Sites sau deploy là acceptance cuối cho tốc độ, không
dùng kết quả local `no-store` thay Sites. Trước deploy chỉ kết luận candidate
qua build, static QA, browser preview và review visual; release chưa hoàn tất
cho tới khi số đo Sites đạt và rollback vẫn khả dụng.

## Ranh giới

- **Luôn làm:** giữ chất lượng/provenance ảnh, đo trước/sau trên Sites và cập
  nhật content guide, release evidence khi contract media thực sự đổi.
- **Cần owner duyệt riêng:** thay ảnh/crop/claim, giảm chất lượng vật liệu thấy
  được, đổi hosting/audience/domain hoặc đưa pipeline media mới ngoài static.
- **Không làm:** tải mọi ảnh cùng lúc, nhân đôi request để đo progress, edit
  `.site-output/`, phát hành ảnh nguồn chưa duyệt hoặc bỏ QA vì số đo nhanh hơn.

## Chú thích thuật ngữ

- **Cold-cache**: lần tải không dùng body ảnh đã lưu trong browser cache.
- **Derivative**: biến thể kích thước của cùng ảnh đã duyệt.
- **LCP**: thời điểm phần tử nội dung lớn nhất hiển thị trong viewport đầu.
- **CLS**: tổng dịch chuyển layout ngoài ý muốn khi trang tải.
