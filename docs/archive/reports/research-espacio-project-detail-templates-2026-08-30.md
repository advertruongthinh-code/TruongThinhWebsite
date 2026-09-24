# Template trang chi tiết dự án của Espacio

- Ngày đo: `2026-08-30` (`Asia/Bangkok`).
- Phạm vi live ban đầu: sáu trang con đại diện của `/en/projects/` tại
  `1440x900` và `390x844`.
- Bổ sung live `2026-09-02`: duyệt đủ 45 route archive tương ứng; tất cả load
  thành công và giữ nguyên namespace, template id cùng block sequence.
- Phạm vi archive: toàn bộ 45 trang con đã cào ngày `2026-08-08`.
- Trạng thái: `confirmed` cho cấu trúc Espacio; chưa phải acceptance hoặc parity
  claim cho website Trường Thịnh.

## Kết luận

Espacio không có nhiều template trang con độc lập. Cả 45 trang con trong
archive dùng chung một template family:

```html
data-barba-namespace="common"
data-barba-id="proyecto"
```

Khác biệt giữa các trang đến từ dữ liệu và tổ hợp block tùy chọn. Có thể gom
thành ba biến thể trình bày, nhưng cả ba vẫn là cùng template `proyecto`:

| Biến thể | Dấu hiệu | Phạm vi archive | Live đã kiểm tra |
| --- | --- | ---: | --- |
| Hero ảnh | Có `layout-hero-banner-image` | 39/45 | Espalmador, Can Molteni, Lonja de Mar, Pollenca, Corb Marí |
| Hero video | Không có block ảnh; hero chứa Vimeo `iframe` | 6/45 | Vanity |
| Nội dung mở rộng | Thêm block hiếm bên cạnh bộ block chuẩn | 2/45 | Can Molteni có banner CTA; Lonja de Mar có đoạn văn chia cột |

Hướng phù hợp cho Trường Thịnh là một shared detail component family, nhận dữ
liệu và composition config cho sáu nhóm Sản phẩm quảng cáo. Không tạo sáu
template code riêng; sáu route vẫn có sáu chuỗi block khác nhau.

Owner chấp nhận shared family ngày `2026-08-30` và xác nhận sáu composition ngày
`2026-09-02`. Quyết định canonical nằm tại
[Sáu trang nhóm Sản phẩm quảng cáo dùng một shared detail template](../decisions/shared-advertising-product-detail-template.md).

## Sáu composition được chọn cho Trường Thịnh

| Nhóm | Số ảnh | Route Espacio | Lý do chọn |
| --- | ---: | --- | --- |
| Kiosk & POSM | `24` | `pollenca-project` | Chuỗi long-form dài nhất, đủ nhịp cho pool lớn nhất |
| Xe bán hàng | `16` | `ponent` | Ba gallery tạo nhịp quan sát chuỗi sản phẩm di động |
| Bảng hiệu & chữ nổi | `22` | `can-molteni` | Banner full-width phù hợp công trình nhận diện quy mô lớn |
| Bảng tên, biển văn phòng & chỉ dẫn | `13` | `lonja-de-mar-project` | Paragraph chia cột hỗ trợ giải thích hệ thống và thông tin kỹ thuật |
| LED, màn hình & hộp đèn | `18` | `espalmador-project` | Nhịp cân bằng gallery, ảnh đơn và ảnh đôi |
| In nhanh, ấn phẩm & decal | `16` | `pantry-project` | Bố cục ngắn, tập trung gallery cho sản phẩm cỡ nhỏ |

Audit live đủ 45 route ghi `38` block sequence khác nhau. Sáu route trên đều
dùng hero ảnh và có sequence khác nhau; vì vậy lựa chọn không cần giả lập hero
video khi Trường Thịnh chưa có video production đã duyệt.

## Phương pháp và lớp bằng chứng

1. In-app Browser dùng để kiểm tra human path và thứ tự nội dung nhìn thấy trên
   `espalmador-project`.
2. Chrome DevTools dùng để đọc DOM/runtime, computed geometry, network và bundle
   CSS/JS đang chạy.
3. Playwright đo lặp lại sáu route ở hai viewport, tổng cộng 12 lượt.
4. PowerShell parse 45 HTML archive để đếm module và tìm các trường hợp hiếm.
5. SHA-256 đối chiếu bundle live với bundle archive, tránh suy luận từ snapshot
   đã cũ.

Không dùng Computer Use vì Browser, DevTools và Playwright đã bao phủ human
path, runtime và phép đo lặp lại.

## Cấu trúc chung trên 45 trang archive

| Block | Số trang có block | Vai trò |
| --- | ---: | --- |
| `layout-hero-banner` | 45/45 | Hero toàn viewport |
| `layout-titular` | 45/45 | Heading editorial và heading CTA |
| `layout-parrafo` | 45/45 | Nội dung kể chuyện |
| `layout-bloque-facts` | 45/45 | Metadata/facts của dự án |
| `layout-slider-proyectos` | 45/45 | Dự án liên quan |
| `layout-ctas` | 45/45 | CTA cuối trang |
| `layout-marquee` | 45/45 | Brand marquee trước footer |
| `layout-imagen-unica` | 42/45 | Ảnh đơn tùy chọn |
| `layout-galeria` | 40/45 | Gallery ngang tùy chọn |
| `layout-imagen-doble` | 27/45 | Cặp ảnh bất đối xứng tùy chọn |
| `layout-bloque-banners` | 1/45 | Banner CTA mở rộng, chỉ Can Molteni |
| `layout-parrafo-columnas` | 1/45 | Đoạn văn chia cột, chỉ Lonja de Mar |

Sáu route hero video là `cfs-project`, `cps-project`, `csi-project`,
`lonja-townhouse-project`, `parallel-project` và `vanity-project`. Archive của
cả sáu chứa Vimeo `iframe`; vì vậy đây là biến thể media của hero, không phải
template thiếu hero.

## Kiểm chứng live

Playwright xác nhận cả 12 lượt đều trả HTTP `200`, đúng
`namespace="common"`, `id="proyecto"`, và hero bằng đúng viewport:

| Route mẫu | Biến thể/block đặc trưng | Desktop | Mobile |
| --- | --- | --- | --- |
| `espalmador-project` | Hero ảnh, gallery, facts, ảnh đơn, ảnh đôi | `1440x900` | `390x844` |
| `vanity-project` | Hero video, không có `layout-hero-banner-image` | `1440x900` | `390x844` |
| `can-molteni` | Thêm `layout-bloque-banners` | `1440x900` | `390x844` |
| `lonja-de-mar-project` | Thêm `layout-parrafo-columnas` | `1440x900` | `390x844` |
| `pollenca-project` | Cùng block chuẩn nhưng chuỗi nội dung dài | `1440x900` | `390x844` |
| `corb-mari` | Cùng tổ hợp block với Espalmador | `1440x900` | `390x844` |

Ở `espalmador-project`, DevTools đo desktop:

| Thành phần | Geometry/computed style quan sát được |
| --- | --- |
| Hero | `1440x900`, `display:grid`, ảnh `object-fit:cover` |
| Heading hero | `1000x156.8`, font size `112px`, line-height `156.8px` |
| Intro title | Rộng `1440`, padding ngang `35px`, margin-bottom `90px` |
| Gallery | `1440x755`, padding ngang `35px`, margin-bottom `90px` |
| Facts | Bốn cột, mỗi cột `360px` |
| Ảnh đôi | Hai cột `702.5px`, gap `35px` |

CSS live xác nhận breakpoint `max-width:750px`: gallery đổi từ `50vw` sang
`75vw`, facts ép về một cột, và project rail tiếp tục là vùng cuộn ngang.
Playwright kiểm tra riêng ở `390x844` để tránh giới hạn cửa sổ DevTools chỉ thu
nhỏ đến 500 px.

Một lượt Playwright của `vanity-project` ghi một console error `401` từ resource
phụ. Khi kiểm tra lại bằng DevTools, 27 request quan sát được đều `200`, bao gồm
document, Vimeo, CSS, JS và ảnh; lỗi này được xem là transient và không làm thay
đổi kết luận template.

## Đối chiếu code live và archive

Bundle live ngày đo trùng byte với bundle archive:

| Bundle | Kích thước | SHA-256 live và archive |
| --- | ---: | --- |
| `main.min.js?v=0.021` | 345871 bytes | `91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c` |
| `main.min.css?v=0.021` | 88212 bytes | `b3cb9abf01889550121da4ebd11513ec4d7cc746f4a2672ba3d76871451c1296` |

JS live khởi tạo Barba theo `namespace="common"`, đọc `data-barba-id` để chọn
section và gọi chung `initCommons`. CSS live định nghĩa cùng các module
`layout-*` đã đếm trong HTML archive. Vì hash trùng tuyệt đối, có thể dùng code
archive để đọc cấu trúc hiện tại mà không cần giả định nó còn đúng.

Nguồn archive chính:

- [Manifest crawl](../../research/reference-site/archive/manifest.jsonl) ghi
  Espalmador HTTP `200`, HTML 93930 bytes, SHA-256
  `75d3fbb434177a655c968d05a947cad19f9cfe66ea4d82b6b3d7edbbefb9a8cc`.
- [HTML Espalmador](../../research/reference-site/archive/site/en/projects/espalmador-project/index.html)
  chứa `data-barba-id="proyecto"` và thứ tự block.
- [CSS archive](../../research/reference-site/archive/site/css/main.min.q-2ffef9c93cd8.css)
  và [JS archive](../../research/reference-site/archive/site/js/main.min.q-2ffef9c93cd8.js)
  trùng bundle live.

## Baseline Espalmador cho Trường Thịnh

Espalmador dùng một chuỗi nội dung cân bằng, phù hợp làm baseline cho sáu trang
nhóm Sản phẩm quảng cáo:

| Pha trang | Block Espalmador | Áp dụng đề xuất |
| --- | --- | --- |
| Mở đầu | Hero ảnh toàn viewport, title hai dòng, tên project, CTA | Tên nhóm sản phẩm, câu định vị ngắn, ảnh đại diện và CTA liên hệ |
| Giới thiệu | Heading editorial, paragraph, gallery ngang | Mô tả phạm vi nhóm và gallery sản phẩm thực tế |
| Chứng cứ | Facts bốn cột | Vật liệu, kỹ thuật, môi trường dùng, tùy chọn hoàn thiện |
| Kể chuyện | Paragraph xen ảnh đơn và ảnh đôi | Năng lực tùy biến, cấu tạo và ví dụ ứng dụng |
| Kết thúc | Contact form, related projects, CTA, marquee, footer | CTA tư vấn, nhóm liên quan hoặc sản phẩm cùng nhóm, footer hiện có |

Đề xuất implementation sau khi được duyệt:

1. Một shared detail template, không copy thành sáu bộ HTML/CSS độc lập.
2. Sáu trang chỉ khác data, media, facts và block tùy chọn.
3. Giữ visual language, typography, header/footer và motion của Trường Thịnh;
   chỉ học nhịp layout và thứ tự nội dung từ Espalmador.
4. Hero ảnh là mặc định; hero video chỉ bật khi có asset thật và được duyệt.
5. Trang Pinterest/filter vẫn là trang cha; card dẫn thẳng tới trang nhóm, không
   mở modal.

## Giới hạn và việc chưa làm

- Chưa sửa source website, taxonomy hoặc dữ liệu sản phẩm.
- Chưa đo local correspondence của route detail Trường Thịnh; blocker trong
  report parity tổng vẫn còn.
- Chưa chốt copy, facts và bộ ảnh cho từng nhóm quảng cáo.
- Không có claim `1:1 parity`; Espacio chỉ là reference layout.
- Không dùng asset, logo, font hoặc nội dung bản quyền của Espacio.

## Chú thích thuật ngữ

- **Template family**: một khung code chung dùng cho nhiều trang dữ liệu.
- **Composition**: thứ tự và tổ hợp block tạo nhịp trình bày riêng.
- **Variant**: biến thể trình bày bên trong cùng template.
- **Block**: module nội dung có thể sắp xếp hoặc bật/tắt theo dữ liệu.
- **Human path**: luồng quan sát và thao tác giống người dùng thật.
- **Computed geometry**: kích thước và vị trí thực tế sau khi browser áp CSS.
- **Transient**: lỗi tạm thời, không tái hiện ổn định khi kiểm tra lại.
- **Parity claim**: kết luận hai hệ thống tương đương theo acceptance đã định.
