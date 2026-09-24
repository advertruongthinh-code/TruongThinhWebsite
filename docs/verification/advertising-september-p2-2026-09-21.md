# Kiểm chứng Advertising AD-SEPT-2026-P2

- Ngày: 2026-09-21.
- Plan: [AD-SEPT-2026-P2](../../tasks/plan.md#ad-sept-2026-p2--correction-flow-morph-detail-và-logo).
- Contract: [capability map](../specs/advertising-september-2026-capability-map.md),
  [skeleton Flow](../specs/advertising-skeleton-flow.md),
  [photo morph](../specs/advertising-photo-morph-scroll.md),
  [photo browse R7](../specs/advertising-photo-browse.md#r7--correction-owner-một-layout-span-2--2026-09-20)
  và [logo R5](../specs/brand-lockup-typeset-r4.md#10-correction-r5--en-kế-thừa-metric-vi).
- Trạng thái: scoped technical gate đạt và code review Astra/high đạt. Owner
  preview còn mở cho skeleton, CTA, detail và logo; media review vẫn là phase sau.
  Không commit, push hoặc deploy.

## Kết quả hiện hành

1. Skeleton dùng tám palette dịu ngẫu nhiên; `Scale / Distortion / Swirl / Speed`
   là một FIELD chung. Flow Canvas2D và float X/Y chỉ chạy khi visible, dừng khi
   tab ẩn hoặc reduced motion.
2. Detail từ tablet luôn span 2, ảnh trái và mô tả phải; mobile stack. Bốn mục
   “Có thể bạn thích” nằm dưới mô tả, phủ ngang, dùng shared media interaction;
   toggle không đổi rect hoặc thứ tự.
3. Photo morph khóa logical/native scroll. Native Back/Forward chạy đủ
   `grid↔detail` và `detail↔detail` trong 300 ms. Scrollbar đổi `clientWidth`
   không làm relayout giữa morph; resize thật vẫn hủy sạch. Endpoint giữ đúng
   cả khi con trỏ còn hover card parent hoặc related card.
4. Bỏ toàn bộ dải “Năng lực công trình quảng cáo”. CTA vừa vùng viewport còn
   lại dưới header, skeleton chiếm 38,2%; mobile hoặc viewport thấp dùng 28%.
   Tại 1440×400, copy nằm trọn trong composition mà không giảm cỡ chữ; footer
   chung bắt đầu ở document flow kế tiếp.
5. Logo VI giữ nguyên. Logo EN kế thừa character size, baseline và line gap VI;
   title cùng chiều ngang VI, subtitle fit cùng width bằng tracking. Focused
   runtime cuối đạt 22/22; owner visual check vẫn mở.

## Gate và bằng chứng

| Gate | Kết quả | Giới hạn |
| --- | --- | --- |
| `pnpm prepare:site` + `pnpm qa:static` | PASS | Build/output tĩnh và contract; không là full-site parity |
| Layout/media/lifecycle/skeleton Node | 58/58 PASS; 1.392 authored cases | Scoped Advertising |
| CTA continuation VI/EN | PASS tại 1440×900, 1440×400, 390×844, 390×568 | Kiểm ratio, copy, footer flow, lifecycle, overflow |
| P13 photo transition cuối | 10/10 PASS | Có history bốn hướng, parent/related hover endpoint, scrollbar, real resize, cancel, viewer lock và reduced motion |
| Detail suggestion layout/motion | PASS | VI/EN, desktop/mobile, toggle, hover/focus và reduced motion |
| Logo R5 focused runtime | 22/22 PASS | Owner visual acceptance chưa tự đóng |
| Full photo-view chạy song song | 144/146; hai geometry timeout | Hai case exact 360×800 EN và 1024×768 VI đều PASS 1/1 khi chạy riêng; ghi là concurrent-load flake, không sửa assertion |
| Independent code review | PASS CODE | Astra/high được yêu cầu; effective route không có evidence runtime nên ghi unknown |

P13 artifact cuối:
`.tmp/orchestration/ad-sept-p2-20260920/reviewer-final-p13-2/`;
report đạt 10/10 và JSON có SHA-256
`a1faeedbb6160ad5efa62cfbeabecdf2670a7fd850184a0066792f487bc0f352`.

Impeccable detect exit 0. Detector toàn file vẫn báo backlog có trước như contrast
heuristic trên inline HTML, marquee dùng chung, width transition của image action,
font-size/type ramp và màu literal trong stylesheet chung. Delta CTA chỉ còn advisory
type-ramp tại headline; không phát hiện lỗi mới buộc chặn correction này.

## Hash nguồn cuối

| Path | SHA-256 |
| --- | --- |
| `src/site/advertising-products/catalog-runtime.mjs` | `1F014F09FC757E0834D6191756FB22E855878E004154408A1029AF533FCA9C78` |
| `tests/site/advertising-photo-transitions.e2e.mjs` | `CB0D8900C30D7E6EA721EE835DBD261ED42AA28C6EB9F94F49B172012F14F832` |
| `src/site/detail.css` | `1CD6D40A62BFC244FA0FCB1FE33AA46B34809822DF64AACD33BC6B828844A226` |
| `tests/site/advertising-continuation.e2e.mjs` | `EE402B9CA7A4C62D14682BDED99FA525DF905E48C69B397DB8565C1699A900A1` |
| `src/site/advertising-products/skeleton-flow.mjs` | `7AB14E2425D6E71D8EB99CCA2519C0BCED222D7A4722FC9E1F39238DB9174103` |
| `src/site/advertising-products/layout-core.mjs` | `55FA928BBD9CDCE7C961D366CBA60A0C58FE9D54FB3EB4C2ECB5E675CA216EAC` |
| `src/site/style.css` | `BF1558059C2E26551231325835B520050A15672583552D4B1CBE773BBCE87052` |
| `src/site/assets/brand/truong-thinh-lockup.svg` | `6F88DC3657442D3268EBA9326411E30B2C0D100514E2D2B5BCADFDADA792594A` |
| `src/site/advertising-products/index.html` | `B12A01F5836D97185B17920A48931166BBAA2401041F3D44658EC02E1049C7AF` |

## Giới hạn nghiệm thu

Focused PASS không đổi verdict full website hoặc Espacio canonical parity đang
`NOT PASS`. Report ảnh chưa được owner chọn candidate nên không publish thêm ảnh.
Owner cần kiểm local VI/EN về cảm giác motion skeleton, CTA, detail suggestion và
logo; preview này là human gate cuối của phần UI, không phải quyền deploy.

## Chú thích thuật ngữ

- **FIELD**: bộ tham số chung điều khiển trường gradient động.
- **Scroll lease**: quyền khóa cuộn tạm thời, phải được trả ở mọi đường kết thúc.
- **Endpoint**: hình học đích của clone tại frame cuối của photo morph.
- **Scoped gate**: kiểm thử chỉ chứng minh đúng phạm vi nêu trong report.
- **Concurrent-load flake**: timeout chỉ xuất hiện khi nhiều browser suite chạy
  đồng thời và không tái hiện ở case exact chạy riêng.
