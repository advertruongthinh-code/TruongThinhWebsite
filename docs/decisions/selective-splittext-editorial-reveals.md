---
title: SplitText chỉ áp dụng cho editorial reveal đã khai báo
status: accepted
date: 2026-08-31
scope: Advertising Products, Residential and Commercial text motion
tags:
  - ui
  - motion
  - accessibility
supersedes: []
related_specs:
  - ../specs/advertising-products-turnkey-services.md
related_reports:
  - ../reports/research-espacio-motion-audit.md
---

# SplitText chỉ áp dụng cho editorial reveal đã khai báo

## Context

Ba parent route đang có manual word/line/character split. Owner yêu cầu dùng
SplitText theo route tương ứng của Espacio nhưng không biến filter, card title,
body copy hoặc sáu detail page thành motion target ngoài intent.

## Decision

Pin GSAP core và SplitText `3.15.0`. Chỉ element có data attribute/target được
spec ghi rõ mới được split: hero dùng word, editorial heading dùng line, scroll
cue dùng character. Không split navigation, filter, body paragraph, card title,
portal title hoặc `.sr-only`.

Mapping tham chiếu theo vai trò trang là Advertising Products → Espacio
`/en/projects`, Residential → `/en/interior-design`, Commercial → `/en/kitchens`.
Line reveal giữ `1.9s power4.out`, stagger `0.1s`; word fade giữ `1s expo.out`,
stagger `0.2s`; scroll cue giữ loop hiện hành. SplitText không được đổi các
motion type hoặc timing này.

Line target dùng `autoSplit: true`; tween được tạo và trả về từ `onSplit()`.
Khi auto-resplit lúc reveal đang chạy, tween mới giữ tiến độ `totalTime` và timing
`1.9s`, không chuyển sang duration `0`; chỉ completed/reduced motion final ngay.
Bridge active lifecycle phải revert trước locale swap và Barba unmount, rồi sau
translate/font-ready rebuild đúng một lần. Manual splitter cũ bị thay thế, không
chạy song song.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Giữ manual splitter | Không đổi dependency | Trùng lifecycle logic và không dùng SplitText đã được owner chọn |
| Split mọi heading | Ít target mapping | Tạo motion ngoài intent, tăng wrapper và rủi ro accessibility |
| Split card/filter text | Chuyển động đồng đều | Làm nhiễu thao tác grid và không có evidence Espacio tương ứng |

## Hệ quả

### Tích cực

- Text reveal có một lifecycle dùng chung trên ba route.
- Resize, webfont và locale có contract cleanup/remount rõ.
- SplitText không can thiệp card layout hoặc filter interaction.

### Tiêu cực hoặc cost đã chấp nhận

- Cần nâng GSAP core `3.13.0` lên `3.15.0` và pin SplitText cùng version.
- Mỗi target mới phải được thêm vào live spec trước implementation.

## Evidence

- Archive Espacio dùng word, line và character split theo target class; Project
  listing chỉ dùng hero word split và scroll cue, không split card/filter.
- Owner duyệt mapping target trong Notion card
  `3cc33284-9a0e-817f-9bca-fba5e357c21c` ngày `2026-08-31`.
- Current worktree pin local GSAP/SplitText `3.15.0`; source/static lifecycle
  tests xác nhận chỉ ba parent route dùng declared word/line/character targets
  và unmount gọi `revert()`. Browser grid evidence không là full typography
  parity claim.
- Focused browser lifecycle `1/1` ngày `2026-08-31` dùng click language menu
  thật để kiểm tra VI→EN→VI: revert xảy ra trước translate, font-ready bridge
  rebuild đúng một lần nên editorial text/ARIA theo locale mới; resize/font
  trong line reveal rebuild qua `onSplit()` không duplicate wrapper, snap hoặc
  ghi đè final state. Cùng probe kiểm tra catalog remount theo locale mới và
  focus filter không để card fallback tại `(0,0)`.
- Evidence này không thay full Espacio typography parity; scoped Advertising đã
  được Sol reviewer chấp nhận `ship`. Impeccable URL detect vẫn `DEGRADED` vì
  environment thiếu Puppeteer.

## Follow-up

- Implementation đã complete; follow-up chỉ là bảo trì regression cho shared
  lifecycle, route target và browser QA direct/Barba/Back-Forward/VI-EN/reduced-motion.

## Chú thích thuật ngữ

- **Editorial reveal**: chuyển động giới thiệu heading theo nhịp nội dung.
- **AutoSplit**: SplitText tự chia lại line khi kích thước hoặc font thay đổi.
- **Revert**: khôi phục DOM trước khi instance bị hủy hoặc tạo lại.
