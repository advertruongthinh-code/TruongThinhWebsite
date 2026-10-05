---
title: Intent và capability map cho scrollbar và browser parity
type: cross-cutting
status: accepted
updated: 2026-10-05
intent_status: owner-confirmed
intent_confirmed: 2026-09-27
map_approved: 2026-09-27
feedback_intent_confirmed: 2026-09-27
feedback_map_status: accepted
feedback_map_approved: 2026-09-27
related_specs:
  - site-shell.md
  - advertising-skeleton.md
  - advertising-photo-browse.md
---

# Scrollbar và browser parity

Owner xác nhận intent và duyệt capability map ngày27/09/2026 sau interview.
Module contract chi tiết vẫn cần human gate. Tài liệu này
không cấp quyền sửa UI, resume recovery hoặc phát hành candidate.

Scrollbar, chữ/icon trong nút, viewport ổn định và layout mobile toàn website
(gồm landscape) nay thuộc [shell website](site-shell.md), kể cả gate còn mở;
skeleton lifecycle, Android QA và preview random nay ở [skeleton](advertising-skeleton.md),
[masonry](advertising-masonry.md) và [debug Android](../operations/android-real-device-debugging.md). File này chỉ
giữ intent và map viewer, history motion, glass và typography Advertising.

## Intent đã xác nhận

1. Scrollbar: chuyển sang [shell website](site-shell.md).
2. Skeleton card: chuyển sang [skeleton](advertising-skeleton.md#r4-vào-viewport-và-vòng-lặp).
3. Chữ/icon trong nút: chuyển sang [gate của shell website](site-shell.md#gate-còn-mở).
4. Bổ sung contract từng phần, bắt đầu scrollbar. Feedback mới mở đúng phần
   liên quan, có evidence và điều kiện kiểm lại; không suy full-site parity.
5. Kiểm thử Android thật bằng Chrome nối USB với máy Windows chạy Codex.
   Bằng chứng Android không thay kiểm chứng iPhone. Giữ nội dung/design khác;
   recovery, QA/release cũ và P11 tiếp tục paused.

Đối tượng là người dùng website public VI/EN.

## Quality bar và gate

Giữ [QA/handoff rule](../operations/agent-rule-evidence-qa-handoff.md),
accepted module contracts và test assertions hiện hữu. Không hạ gate để pass.
Không thêm performance budget hoặc gọi Android physical PASS từ emulation.

| Gate | Điều kiện |
| --- | --- |
| Intent | Owner đã xác nhận5 yêu cầu phía trên; Chrome/Android/USB đã xác định |
| Map | Owner đã duyệt boundary và dependency ngày27/09/2026: “Duyệt map như đề xuất” |
| Spec/plan | Từng delta có state, oracle, test và ownership; owner duyệt trước code |
| Runtime | Cùng route/locale/state, có browser/device version và source/version; desktop/browser matrix cùng Android thật; iPhone chưa kiểm thì ghi open |
| Handoff | Contract link evidence đúng scope; không biến focused PASS thành full-site/release/P11 PASS |

Android USB và Chrome/CDP/MCP đã kết nối được ngày27/09/2026; DOM read,
screenshot, menu/touch-swipe và owner manual recording đã verified tại
[hướng dẫn debug](../operations/android-real-device-debugging.md).
Owner yêu cầu kiểm local trước; sau phát hành mới debug bản Sites. Kết nối
thành công không là nghiệm thu UI hoặc permission resume recovery/P11.

## Ranh giới recovery

[Card đang giữ checkpoint](https://app.notion.com/p/3e6332849a0e81508d66ca0b3cfebf18)
vẫn paused theo owner. Checkout recovery tại `.tmp/advertising-random-media`
giữ checkpoint66 staged paths; source commit/push/deploy candidate chưa có.
Draft amendment Git gate cũ chưa được duyệt. Map mới không resume hoặc sửa
checkpoint đó. Sites public vẫn version2 tại lần đọc native27/09/2026.

<a id="feedback-viewer-và-mobile-toàn-website--map-chờ-duyệt"></a>

## Feedback viewer và mobile toàn website — map đã duyệt

Owner xác nhận intent ngày27/09/2026 bằng “Xác nhận intent này”; chọn
“Giữ card/bố cục ổn định (đề xuất)” khi toolbar hiện/ẩn và Safari trên iPhone.
Owner mở rộng kiểm layout/mobile từ Advertising sang **mọi trang website**.
Owner duyệt map và thứ tự phía dưới bằng “Duyệt map và thứ tự đề xuất”.
Approval mở soạn delta theo thứ tự, chưa approval spec, plan hoặc runtime mới.

Intent mới:

1. Layout toàn website và viewport ổn định khi toolbar đổi: nay ở
   [shell website](site-shell.md) (R11, R12).
2. Viewer ảnh Advertising hỗ trợ pinch zoom ảnh và pan khi phóng lớn;
   mở/đóng morph ảnh đồng thời chuyển nền rõ↔blur.
3. Trong detail, lingering zoom-blur bắt đầu gần cuối crossfade và có đoạn
   chạy chồng. Morph và zoom-blur phải chạy cả browser Back/Forward.
4. Glass Advertising chỉ mở rộng zone rõ→blur; giữ nguyên chuyển
   trong suốt→trắng đục. Paragraph mô tả detail căn justified.
5. Kiểm local8792; iPhone chỉ kết luận physical PASS sau evidence thiết bị thật.
   Recovery/P11 paused, chưa commit/push/deploy. QA/audit/code review dùng một
   agent requested `gpt-6-sol`/`ultra`, observed effective unknown.

| Module id | Trách nhiệm | Phụ thuộc/gate | Nguồn sở hữu contract và runtime |
| --- | --- | --- | --- |
| `mobile-viewport-stability`, `site-mobile-layout-parity` | Viewport ổn định và layout mobile toàn website | Gate thiết bị thật | [Shell website](site-shell.md) |
| `advertising-viewer-gestures-motion` | Pinch/pan ảnh trong viewer; morph ảnh và clear↔blur khi mở/đóng, interruption/cleanup/focus | `mobile-viewport-stability`, `site-mobile-layout-parity` | Delta [photo browse](advertising-photo-browse.md); `photo-viewer.mjs`, `detail.css` |
| `advertising-history-motion` | Crossfade/lingering có overlap; morph và zoom-blur đối xứng trên Back/Forward, giữ entry/scroll/random context | `mobile-viewport-stability`, `site-mobile-layout-parity`; history contract accepted | Delta [photo browse](advertising-photo-browse.md), [photo morph](advertising-photo-morph-scroll.md), [motion](../../design-system/motion.md); `catalog-runtime.mjs` và adapter shared hiện hữu |
| `advertising-glass-typography` | Blur zone rộng hơn mà không đổi opacity-to-white; paragraph mô tả justified, pagination vẫn đúng | `mobile-viewport-stability`, `site-mobile-layout-parity`; glass/preset/media accepted | Delta [skeleton](advertising-skeleton.md), [photo browse](advertising-photo-browse.md); `detail.css` và description pagination hiện hữu |

Theo [spec media-card đã duyệt](site-media-card-playback.md), supersession M02b
ngày 2026-09-30 thay phần morph card grid/related↔primary của intent và hàng
`advertising-history-motion` phía trên. Click, Back/Forward và chuyển giữa
hai detail không tạo clone card↔primary. Scroll và media active vẫn theo từng
history entry; chỉ morph
primary↔viewer được giữ. Đây là supersession của contract, không là
bằng chứng runtime hoặc nghiệm thu browser parity.

Thứ tự soạn/duyệt contract: viewport → layout toàn website (đã có trong shell)
→ viewer → history motion → glass/paragraph. Hai module motion và glass có thể
kiểm độc lập sau layout ổn định; dependency là thứ tự/gate, không đề xuất runtime layer mới.
Dùng delta tại các nguồn chuẩn hiện hữu; không tạo monolithic spec mới.

Baseline discovery: source viewer chỉ giữ một pointer drag, chưa có pinch pair;
backdrop CSS cố định `blur(4px)` và animate opacity. Advertising geometry đọc
`visualViewport.height`; đây vị trí cần đo thêm, chưa kết luận mọi resize trên
website cùng nguyên nhân. Browser Forward không chạy motion là feedback owner,
chưa có trace mới chứng minh caller gây lỗi.

Map gate đã đạt ngày27/09/2026: boundary/dependency và thứ tự phía trên được
owner duyệt trước delta đầu tiên. Mỗi delta vẫn cần state/oracle/evidence, owner duyệt spec và
plan trước code. Android capture và WebKit desktop không thay iPhone thật;
không gọi kiểm một route hoặc focused engine PASS là toàn website PASS.

## Chú thích thuật ngữ

- **Intent**: mục tiêu owner đã xác nhận; khác approval của spec/plan.
- **Capability map**: boundary, dependency và thứ tự soạn contract từng module.
- **Physical device**: browser chạy trên điện thoại thật.
- **CDP**: giao thức debug Chrome để đọc runtime và thu bằng chứng.
- **Oracle**: nguồn hoặc predicate dùng để quyết định trạng thái đúng.
- **Open**: chưa đủ evidence để nghiệm thu, không tự là product failure.
