---
title: <tiêu đề frontend slice>
type: frontend
status: draft
updated: YYYY-MM-DD
notion: <Notion URL hoặc none>
related_decisions: []
related_reports: []
---

# <Tiêu đề frontend slice>

## Kết quả và boundary

- User outcome: <kết quả quan sát được>
- Route/surface: <route hoặc component>
- Trong scope: <behavior hoàn chỉnh nhỏ nhất>
- Ngoài scope: <điều defer rõ ràng>

## Information architecture và state

<Route hierarchy, content state, empty/loading/error behavior và VI/EN pairing.>

## Hướng visual

- Surface brief: <.impeccable/surfaces/<slug>.md hoặc none>
- Visual thesis/mode: <link tới mục trong surface brief; không copy prose>
- Design authority: <link đúng mục DESIGN/style-guide/motion/patterns theo docs/design/index.md>

## Component và layout contract

<DOM/component responsibility và runtime integration. Link visual/layout/media
contract về owning design doc; không lặp token, ratio, timing hoặc copy.>

## Responsive, motion và accessibility

<Link responsive/motion/accessibility target; ghi runtime consumer và cách QA
kiểm contract. Giá trị visual chỉ định nghĩa tại nguồn chuẩn.>

## Localization, SEO và performance

<Metadata, alt/ARIA contract, loading strategy, image/video budget và runtime
constraint.>

## Verification và evidence

| Scenario | Method | Evidence kỳ vọng |
| --- | --- | --- |
| Route/content | Playwright hoặc static check | <result> |
| Visual | Playwright + Computer Use + Chrome DevTools | <result> |
| Responsive | Viewport matrix | <result> |
| Accessibility | Playwright + Computer Use + Chrome DevTools tree | <result> |
| Performance | Runtime hoặc static evidence | <result> |

## Thin slice và rollback

<Implementation increment nhỏ nhất, changed path và rollback path.>

## Chú thích thuật ngữ

- **Information architecture**: cách tổ chức route, nội dung và điều hướng.
- **Surface**: bề mặt hoặc route UI cụ thể.
- **Visual thesis**: luận điểm hình ảnh định hướng một màn hình.
- **Viewport matrix**: tập kích thước màn hình dùng để kiểm tra.
- **Runtime constraint**: giới hạn của code khi đang chạy.
