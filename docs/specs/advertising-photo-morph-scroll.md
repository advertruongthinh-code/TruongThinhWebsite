---
title: Photo morph ổn định khi cuộn viewport
type: frontend
status: accepted
updated: 2026-09-21
notion: https://app.notion.com/p/3e0332849a0e8178a964de1dd951db71
related_decisions: []
related_reports: []
---

# Photo morph ổn định khi cuộn viewport

## 1. Vấn đề và kết quả

### Vấn đề

Clone morph đang dùng `position: fixed` và destination viewport rect đo một lần.
Khi user cuộn trong `400ms` animation, target đổi vị trí nhưng clone vẫn bay về
đích cũ.

### Kết quả mong muốn

Morph từ mọi dạng card ảnh vào cụm ảnh + mô tả không thể bị scroll làm lệch;
không nhảy, ảnh ma hoặc mất target.

| Trong scope | Ngoài scope |
| --- | --- |
| Coordinate space, cleanup/fallback và regression parent/related | Đổi timing, easing, route, packing hoặc card design |

## 2. Constraint và câu hỏi mở

- Clone tiếp tục dùng document coordinates và `position: absolute`.
- Khóa wheel, touchmove và phím cuộn trong thời gian morph chạy; không thay đổi
  vị trí logical/native scroll đang có.
- Layout reflow thật giữa chừng được phép kết thúc motion sớm và hiện target.
- Giữ reduced motion, keyboard, history và cleanup hiện hành.

## 3. User workflow và acceptance

```gherkin
Given user nhấn một card trong parent hoặc related grid
When user thử wheel, touch hoặc phím cuộn trong lúc morph đang chạy
Then viewport không đổi vị trí cho tới khi morph settle
And scroll được mở lại ngay sau finish, cancel, abort hoặc lỗi
And target cuối cùng hiển thị đúng, không còn clone hoặc visibility bị kẹt
```

## 4. System và implementation boundary

Chỉ sửa `runPhotoMorph` và regression liên quan trong runtime Advertising. Source
và destination rect được chuyển thành document coordinates tại thời điểm mount.
Fallback layout-change dùng cleanup hiện hành thay vì loop đo mỗi frame.

## 5. Hướng dẫn implementation

```text
Build: pnpm prepare:site
Test: node tests/site/advertising-photo-transitions.e2e.mjs
Verify: pnpm qa:static và DevTools scroll-during-morph
```

Scroll lock là lease hẹp chỉ tồn tại trong morph, không dùng khóa global không
có owner. Không thêm `ResizeObserver` liên tục hoặc animation library mới.
Clone phải `pointer-events:none`, được remove đúng một lần, luôn trả visibility
cho target và luôn release scroll lease trong finish/cancel/abort/error.

## 6. Thuộc tính chất lượng

| Attribute | Requirement | Evidence |
| --- | --- | --- |
| Accessibility | Reduced motion vẫn chuyển trạng thái tức thời | E2E |
| Performance | Không đo layout mỗi animation frame | trace/source review |
| Security | N/A, không có input mới | review |
| Maintainability | Một coordinate model cho parent và related card | shared regression |

## 7. Kế hoạch verification

| Level | Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- | --- |
| Browser | Wheel/touch/key scroll giữa morph | Playwright | scroll không đổi trong morph và dùng lại ngay sau settle |
| Browser | Parent và related card | Playwright | cùng behavior |
| Lifecycle | abort/history/remount | focused tests | cleanup đầy đủ |
| Visual | Desktop/mobile | DevTools | không nhảy hoặc ảnh ma |

## 8. Delivery, migration và rollback

Thin slice đổi coordinate model nhưng giữ API và timing. Rollback là phục hồi
implementation fixed hiện hành nếu regression route/lifecycle xuất hiện.

## 9. Reference và history

- [Photo browse](advertising-photo-browse.md)
- [Motion design system](../design/motion.md)

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09-20 | Initial draft | Root cause đã tái hiện và owner chọn document coordinates |
| 2026-09-20 | Owner accepted | Owner duyệt toàn bộ năm module spec |
| 2026-09-20 | Implemented | Snapshot viewport được quy đổi tại handoff; full P13 5/5 và frame đầu/cuối lệch 0px |
| 2026-09-20 | Correction R2 accepted | Owner chọn vô hiệu hóa scroll trong thời gian morph thay vì cho viewport tiếp tục cuộn |
| 2026-09-21 | Correction R3 accepted | Native Back/Forward phải phát lại morph đúng hướng; scroll lease không được tự kích hoạt ResizeObserver cancel |
| 2026-09-21 | R3 implemented và hardened | Endpoint theo đúng hover card parent/related; scrollbar lease và resize thật có regression riêng; P13 10/10 |

## 10. Correction R3 — native Back/Forward

- Back/Forward giữa hai detail dùng hero trước đó làm source, related card đúng
  photo ID làm destination và chạy morph `300ms` theo đúng hướng history.
- Forward từ grid về detail chụp card đang focus trước khi ẩn grid rồi morph vào
  hero. Deep link không có source vẫn chuyển tức thời.
- Thay đổi `clientWidth` do chính scroll lease ẩn scrollbar không được coi là
  resize thật. Resize viewport thật vẫn cancel an toàn, hiện target và nhả lock.
- Khi con trỏ còn trên card đích, endpoint dùng đúng geometry hover ở frame kế
  tiếp cho cả parent grid và related grid; đường keyboard/neutral giữ geometry
  không hover. Không để clone kết thúc ở kích thước card trước interaction.
- Clone phải tồn tại qua frame giữa, khóa scroll trong motion và được dọn sau
  settle; reduced motion không tạo clone.

Acceptance R3: focused E2E dùng native `goBack()`/`goForward()` cho detail↔detail
và grid↔detail, kiểm photo ID/source, duration, midpoint, endpoint, lock/release,
parent/related pointer retained, scrollbar threshold, resize thật và reduced
motion.

## 11. Correction R4 accepted — nền zoom-blur theo lifecycle morph

Owner duyệt R4 ngày `2026-09-21`. Motion của nền dư quanh hero chỉ được bắt đầu
khi `runPhotoMorph()` đã tạo được morph thật. Deep link, render trực tiếp, reduced
motion hoặc nhánh fail-open không có morph phải giữ nền tĩnh.

Nền và morph dùng cùng generation cùng lifecycle: bắt đầu cùng transition, cancel
khi morph bị thay thế/hủy và settle khi morph kết thúc. Nền vẫn có biên độ nhỏ
hơn để tạo vận tốc cảm nhận chậm hơn foreground nhưng không được tiếp tục chạy
sau khi clone morph đã settle.

Acceptance R4: click grid/related và native Back/Forward có morph thì background
animation tồn tại trong đúng active interval; direct load, unknown source,
reduced motion và canceled morph không để animation dư hoặc nền sai photo ID.

## 12. Correction R5 accepted — white erase, zoom-blur và linger độc lập scroll

R5 supersede yêu cầu R4 rằng backdrop phải kết thúc đồng thời với clone. Backdrop
vẫn chỉ chạy khi có morph thật và vẫn dùng cùng photo identity/generation.

- Foreground morph giữ `400ms` cho click grid/related và `300ms` cho native
  Back/Forward. Scroll lease chỉ thuộc foreground morph và được release ngay khi
  clone finish/cancel/abort/error; backdrop linger không được giữ khóa scroll.
- Trong `25%` đầu duration foreground, vùng nền dư chuyển về trắng để xóa frame
  cũ. Từ mốc `25%` tới lúc foreground settle, trắng chuyển sang zoom-blur của
  photo đích với biên độ nhỏ hơn foreground.
- Sau foreground settle, zoom-blur được giữ và hoàn tất thêm `200ms`, trong lúc
  user đã cuộn được. Linger không được tạo clone, đổi geometry hero hoặc giữ
  target `visibility:hidden`.
- Retarget/cancel trong bất kỳ phase nào phải hủy pending erase/linger cũ, lấy
  generation mới và bắt đầu sequence mới mà không flash photo sai identity.
  Deep link, direct render, fail-open và reduced motion giữ backdrop tĩnh.
- Nếu user cuộn trong linger, backdrop vẫn neo trong hero và cleanup đúng sau
  `200ms`; không đo destination lại, không đổi logical scroll và không kích hoạt
  morph mới.

Acceptance R5: timeline probe chứng minh white erase chiếm `25% ± 1 frame`,
zoom-blur chạy tới foreground settle và linger `200ms ± 1 frame`. Wheel/touch/key
bị khóa trong foreground nhưng thay đổi scroll được ngay trong linger. Rapid
retarget, Back/Forward, resize, image load chậm và unmount không để animation,
timer, clone, visibility hoặc scroll lease dư; reduced motion không tạo sequence.

## Chú thích thuật ngữ

- **Document coordinates**: tọa độ cố định theo tài liệu, cùng thay đổi viewport khi cuộn.
- **Morph**: chuyển tiếp hình học từ card nguồn sang ảnh detail.
- **Linger**: phần motion trang trí còn tiếp tục ngắn sau khi foreground morph đã
  hoàn tất và tương tác cuộn đã được trả lại.
