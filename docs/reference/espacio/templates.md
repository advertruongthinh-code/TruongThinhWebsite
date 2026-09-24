---
title: Template reference Espacio
type: reference-templates
status: candidate-composite-baseline
snapshot_id: ESPACIO-R1-20260902
snapshot_cutoff: 2026-09-02
---

# Templates

Template evidence này bắt đầu từ archive crawl `2026-08-08`, được đo live ngày
`2026-08-30` ở sáu route đại diện tại `1440x900` và `390x844`, rồi kiểm tra
đủ 45 route ngày `2026-09-02`. Đây là composite chronology, không phải snapshot
đồng thời. Kết luận `confirmed` chỉ áp dụng cấu trúc Espacio; không phải TT
parity, content equivalence hoặc asset ownership.

## Một template family

Tất cả 45 project detail route dùng:

```html
data-barba-namespace="common"
data-barba-id="proyecto"
```

Khác biệt đến từ data và composition của block tùy chọn. Audit closure ngày
`2026-09-02` xác nhận 45/45 route load thành công, giữ namespace, template ID và
block sequence. Có `38` sequence khác nhau; đây là nhiều composition trong một
family, không phải 38 template code.

| Variant trong family | Dấu hiệu | Archive | Live sample | Status |
| --- | --- | ---: | --- | --- |
| Hero ảnh | `layout-hero-banner-image` | `39/45` | Espalmador, Can Molteni, Lonja de Mar, Pollenca, Corb Marí | `measured` |
| Hero video | Hero chứa Vimeo `iframe`, không có block ảnh hero | `6/45` | Vanity | `measured` media variant |
| Nội dung mở rộng | Block hiếm ngoài bộ chuẩn | `2/45` | Can Molteni: banner CTA; Lonja de Mar: paragraph chia cột | `measured` |

Sáu route hero video là `cfs-project`, `cps-project`, `csi-project`,
`lonja-townhouse-project`, `parallel-project`, `vanity-project`. Hero video là
variant media, không phải template thiếu hero.

Nguồn: [project-detail report](../../archive/reports/research-espacio-project-detail-templates-2026-08-30.md)
`Kết luận`, `Kiểm chứng live`; measurement IDs `E-TEMPLATE-FAMILY` và
`E-TEMPLATE-GEOMETRY` trong [evidence](evidence.md).

## Block frequency

| Block | Có trong | Vai trò |
| --- | ---: | --- |
| `layout-hero-banner` | `45/45` | Hero toàn viewport |
| `layout-titular` | `45/45` | Editorial heading và heading CTA |
| `layout-parrafo` | `45/45` | Story/content paragraph |
| `layout-bloque-facts` | `45/45` | Metadata và facts |
| `layout-slider-proyectos` | `45/45` | Related project rail |
| `layout-ctas` | `45/45` | CTA cuối trang |
| `layout-marquee` | `45/45` | Brand marquee trước footer |
| `layout-imagen-unica` | `42/45` | Ảnh đơn optional |
| `layout-galeria` | `40/45` | Gallery ngang optional |
| `layout-imagen-doble` | `27/45` | Cặp ảnh bất đối xứng optional |
| `layout-bloque-banners` | `1/45` | Banner CTA mở rộng, Can Molteni |
| `layout-parrafo-columnas` | `1/45` | Paragraph chia cột, Lonja de Mar |

Bộ bảy block đầu là family core trong archive. Block rare không được tự nâng
thành contract mọi route.

## Live sample geometry

`espalmador-project` tại `1440x900`, đo bằng Chrome DevTools:

| Thành phần | Geometry/computed observation |
| --- | --- |
| Hero | `1440x900`, `display:grid`, image `object-fit:cover` |
| Hero heading | box `1000x156.8px`, font size `112px`, line-height `156.8px` |
| Intro title | width `1440px`, padding ngang `35px`, margin-bottom `90px` |
| Gallery | width `1440px`, padding ngang `35px`, margin-bottom `90px`; mobile đổi từ `50vw` sang `75vw` tại `max-width:750px` |
| Facts | 4 cột desktop, mỗi cột `360px`; mobile 1 cột |
| Duo image | 2 cột `702.5px`, gap `35px` |
| Project rail | Giữ vùng cuộn ngang trên mobile |

Playwright kiểm tra riêng `390x844` vì DevTools window chỉ thu nhỏ đến `500px`.
Live sample routes và đặc trưng:

| Route | Variant/block | Desktop/mobile |
| --- | --- | --- |
| `espalmador-project` | Hero ảnh, gallery, facts, ảnh đơn, ảnh đôi | `1440x900`, `390x844` |
| `vanity-project` | Hero video, không `layout-hero-banner-image` | `1440x900`, `390x844` |
| `can-molteni` | Thêm `layout-bloque-banners` | `1440x900`, `390x844` |
| `lonja-de-mar-project` | Thêm `layout-parrafo-columnas` | `1440x900`, `390x844` |
| `pollenca-project` | Bộ block chuẩn, sequence dài | `1440x900`, `390x844` |
| `corb-mari` | Tổ hợp giống Espalmador | `1440x900`, `390x844` |

Playwright 12 lượt trả HTTP `200`, đúng namespace/id/hero viewport. Một lượt
Vanity từng ghi console `401` resource phụ; DevTools kiểm tra lại thấy `27/27`
request `200`, gồm document, Vimeo, CSS, JS và ảnh. Giữ đây là transient
observation, không gọi console clean toàn site.

## Archive/live source integrity

| Resource | Size | SHA-256 live/archive |
| --- | ---: | --- |
| `main.min.js?v=0.021` | `345871` bytes | `91f971d6f6a2f9829660f9422789ed6fb311fa915040820d16dd192ecf6b064c` |
| `main.min.css?v=0.021` | `88212` bytes | `b3cb9abf01889550121da4ebd11513ec4d7cc746f4a2672ba3d76871451c1296` |

Archive source pointers:

- Manifest Espalmador: HTML `93930` bytes, SHA
  `75d3fbb434177a655c968d05a947cad19f9cfe66ea4d82b6b3d7edbbefb9a8cc`.
- [Archive HTML Espalmador](../../../research/reference-site/archive/site/en/projects/espalmador-project/index.html)
  chứa `data-barba-id="proyecto"` và block order.
- [Archive CSS](../../../research/reference-site/archive/site/css/main.min.q-2ffef9c93cd8.css)
  và [archive JS](../../../research/reference-site/archive/site/js/main.min.q-2ffef9c93cd8.js)
  trùng bundle live tại thời điểm đo.

Archive/live hash chỉ khóa provenance cho composite baseline; không bảo đảm
current live sau `2026-09-02`.

## Trường Thịnh accepted composition mapping

Owner đã chấp nhận một shared detail family ngày `2026-08-30` và sáu
composition ngày `2026-09-02`. Đây là TT accepted design mapping, không phải
Espacio measurement mới:

| Nhóm sản phẩm | Ảnh | Route reference | Composition rationale |
| --- | ---: | --- | --- |
| Kiosk & POSM | `24` | `pollenca-project` | Long-form dài, đủ nhịp cho pool lớn |
| Xe bán hàng | `16` | `ponent` | Ba gallery, nhịp chuỗi sản phẩm di động |
| Bảng hiệu & chữ nổi | `22` | `can-molteni` | Banner full-width |
| Bảng tên, biển văn phòng & chỉ dẫn | `13` | `lonja-de-mar-project` | Paragraph chia cột cho hệ thống/kỹ thuật |
| LED, màn hình & hộp đèn | `18` | `espalmador-project` | Nhịp gallery, ảnh đơn, ảnh đôi cân bằng |
| In nhanh, ấn phẩm & decal | `16` | `pantry-project` | Bố cục ngắn, gallery tập trung |

Tổng `109` source media theo `24/16/22/13/18/16` là TT implementation evidence
ở `docs/STATE.md`/Advertising spec, không thay đổi Espacio family facts. Sáu
route TT chỉ nhận data/media/facts/optional block khác nhau; shared renderer
giữ visual language, type, header/footer và motion TT. Hero video chỉ bật khi
asset thật được owner duyệt.

## Suggested Espalmador sequence

Bảng này là accepted composition guidance cho TT, không là copy content/media:

| Phase | Espalmador block | TT use |
| --- | --- | --- |
| Mở đầu | Hero ảnh toàn viewport, title hai dòng, project name, CTA | Tên nhóm, định vị, ảnh đại diện, CTA liên hệ |
| Giới thiệu | Editorial heading, paragraph, gallery ngang | Phạm vi nhóm, gallery sản phẩm thật |
| Chứng cứ | Facts 4 cột | Vật liệu, kỹ thuật, môi trường, hoàn thiện |
| Kể chuyện | Paragraph xen ảnh đơn/đôi | Tùy biến, cấu tạo, ví dụ ứng dụng |
| Kết thúc | Contact form, related projects, CTA, marquee, footer | CTA tư vấn, nhóm liên quan, footer hiện có |

Không tạo sáu bộ HTML/CSS độc lập; không đưa asset/logo/font/copy bản quyền
Espacio vào production. Đây là accepted implementation direction và nằm ngoài
R1 refactor.

## Limits và blockers

- `45/45` chỉ xác nhận structure/template family và 45 route load; không
  xác nhận TT parity, content equivalence, ownership asset hoặc acceptance 1:1.
- Chưa đo local detail correspondence của TT trong report snapshot; parity
  canonical còn blocker project detail và `864` scoped candidate, trong đó mỗi
  candidate chưa map vẫn là blocker.
- Chưa chốt copy, facts hoặc media set của từng nhóm trong report archive; số
  `109` là TT accepted/current evidence khác lớp với archive Espacio.
- Không có claim `1:1 parity`; Espacio chỉ là reference layout/motion baseline.
- Vanity có transient `401` row như trên; không xóa khỏi provenance.
- Motion/route/accessibility limits xem [motion](motion.md) và
  [evidence limits](evidence.md#limits-conflicts-và-unknown).

## Chú thích thuật ngữ

- **Template family**: khung code chung cho nhiều page data.
- **Variant**: biến thể media/block trong cùng family.
- **Composition**: thứ tự/tổ hợp block tạo nhịp riêng.
- **Block**: module content có thể bật/tắt hoặc sắp xếp.
- **Shared renderer**: renderer dùng chung, nhận data/composition config.
- **Transient**: lỗi tạm thời không tái hiện ở lần kiểm tra sau.
