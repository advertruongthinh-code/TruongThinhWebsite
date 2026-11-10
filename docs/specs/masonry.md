---
title: Masonry dùng chung
status: live
source:
  - src/site/masonry/host.mjs
  - src/site/masonry/mount-budget.mjs
tests:
  - tests/site/masonry-host.test.mjs
  - tests/site/advertising-mount-budget.test.mjs
  - tests/site/masonry-hosts.e2e.mjs
  - tests/site/advertising-fast-fling.e2e.mjs
  - tests/site/advertising-detached-cards.e2e.mjs
notion: none
updated: 2026-11-10
---

# Masonry dùng chung

## Mục đích

Một bộ máy masonry cho mọi nơi có lưới card: lưới chính trang Sản phẩm quảng cáo, related ở trang card, lưới trang Công
trình. Spec này ghi phần chung và chỉ tới luật chi tiết; spec từng trang ([masonry Advertising](advertising-masonry.md),
[detail](advertising-detail.md), [Công trình](projects.md)) chỉ ghi phần khác. Luật mới áp cho mọi masonry thì ghi ở đây
hoặc ở spec chi tiết được trỏ tới, không chép sang từng trang.

## Hành vi

### R1. Ba nơi, một runtime

Ba lưới chạy chung `mountMasonry` (`masonry/runtime.mjs`). Trang Công trình mount với `viewer: false` (không
detail, related, gợi ý, chip sản phẩm, không khung detail ẩn trong HTML) và `captions: true`. Phần lưới của trang Công
trình (grid, thẻ tĩnh noscript, batch skeleton, CTA đuôi) lấy nguyên từ HTML trang quảng cáo, chỉ đổi nhãn, thẻ tĩnh, chữ
CTA ([projects R2](projects.md#r2-trang-toàn-bộ-công-trình)): thêm attribute ở trang quảng cáo thì trang Công trình có theo.

### R2. Item masonry

Mọi thứ nằm trong lưới là một item: `[data-masonry-item]` (id card; card gợi ý là `suggestion`) và `[data-masonry-kind]`
(`photo`, `video`, `multi`, `suggestion`) ([detail, bảng hook](advertising-detail.md#giao-diện-và-dữ-liệu)). Mã cần "mọi
card masonry" chọn theo hai attribute này, không liệt kê từng loại card: chặn 4K (`head-inline.js`,
[progressive-loading R8](progressive-loading.md)), CMS overlay (`src/admin/overlay.js`).

### R3. Một bộ xếp

Card thật, item ghim (primary và card gợi ý ở detail) và khung batch skeleton đều xếp bằng solver của `masonry/layout.mjs`,
cùng luật span một hoặc hai cột ([masonry R5](advertising-masonry.md#r5-hình-học-masonry),
[R6](advertising-masonry.md#r6-đặt-card-và-chuyển-vị-trí)). Không lỗ giữa lưới ở cả ba nơi: card hai
cột chờ cặp cột bằng đáy (cắt khép mép tối đa `min(0.25 × khoảng giữa, 5%)` media), card hai cột còn chờ thành dải cuối
và batch skeleton lấp lỗ dưới chúng (`layout.holes`). Related đặt primary và gợi ý là item ghim
([detail R7](advertising-detail.md#r7-related)); skeleton đổi band và số khung bằng attribute trên batch
([skeleton R1](advertising-skeleton.md#r1-batch-nối-tiếp-masonry)).

### R4. Sân masonry

Mỗi lưới là một instance của `createMasonryHost(root, { create, attach, detach, color, masonry })` (`masonry/host.mjs`):
card đang dựng, tọa độ, media đang hiện của card nhiều media, card tạm, ngân sách dựng, hàng chờ LRU theo RAM máy
(`masonry/mount-budget.mjs`), một Masonry chỉ lo motion. Một lượt dựng là `mount(placements, { allowed, render })`, gỡ là
`release(keep, { queue })` (không gỡ card đang giữ focus), dựng lẻ là `ensure`; motion layout `layoutMotion(instant)`,
hủy `stopMotion()`. Thứ tự chọn card dựng (`pickMounts`): card bắt buộc, rồi card trong hàng chờ, rồi gần giữa màn hình,
tối đa theo ngân sách frame; vuốt rất nhanh chỉ dựng card bắt buộc. Vùng dựng, vùng trễ và bàn phím theo
[masonry R7](advertising-masonry.md#r7-ảo-hóa-và-bàn-phím).

```gherkin
Given lưới chính và related ở detail cùng đang có card
When vuốt nhanh ở mỗi lưới
Then cả hai dựng card theo cùng ngân sách và hàng chờ LRU của sân mình, card chưa tới lượt có card tạm
```

### R5. Một hàm reveal

Card, primary và khung batch hiện media bằng một hàm `playReveal({ from, to, host })`: crossfade đã duyệt, có `host` thì
thêm Kính ba bậc ([loading glass R4](loading-glass-and-page-entry.md#r4-mở-ảnh-tại-chỗ)). Cung CTA đang thấy thì không
thêm Kính, cung vừa vào view thì gỡ mọi Kính reveal trong trang
([skeleton R4](advertising-skeleton.md#r4-vào-viewport-và-vòng-lặp)). Reveal bị hủy giữa chừng không báo lỗi.

### R6. Batch CTA tự chứa

Khung batch, cụm CTA và Kính cung là một bộ (`createCtaBatch`, `masonry/cta-batch.mjs`) đi giữa lưới chính và cuối related; truy
vấn, observer cung và motion vào view tính từ gốc batch nên gắn vào lưới nào cũng chạy cùng luật
([CTA R9](advertising-cta-center-parallax.md#r9-cta-cuối-related-ở-detail)).

### R7. Ma trận test chung

Hành vi chung kiểm một lần cho cả ba nơi: `masonry-hosts.e2e.mjs` chạy Advertising, Công trình, related
(`MASONRY_HOSTS` chọn nơi): vuốt nhanh, vùng giữ card, không lên 4K, Kính reveal không chồng cung, CTA chưa hiện trước khi
vào view, F5.

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| DOM hook | `[data-masonry-item]`, `[data-masonry-kind]` | Item masonry ở mọi lưới (R2) |
| Hàm public | `createMasonryHost`, `pickMounts`, `isSizeMorph`, `cancelMasonryTransitions` (`masonry/host.mjs`) | Sân masonry (R4) |
| Hàm public | `createMountBudget`, `createGhostLayer`, `createDetachedCards`, `detachedCapacity` (`masonry/mount-budget.mjs`) | Ngân sách dựng, card tạm, hàng chờ LRU (R4) |
| Runtime | `playReveal` (`masonry/runtime.mjs`, nội bộ) | Reveal chung (R5) |

## UI

Motion card theo [design-system/motion.md](../../design-system/motion.md#vị-trí-card-masonry).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | `masonry-hosts.e2e.mjs` (`MASONRY_HOSTS=projects`); `block-pages.test.mjs` |
| R2 | `masonry-hosts.e2e.mjs` (không lên 4K) |
| R3 | `advertising-products-layout.test.mjs`; `advertising-skeleton-flow.test.mjs` |
| R4 | `masonry-host.test.mjs`; `advertising-mount-budget.test.mjs`; `advertising-fast-fling.e2e.mjs`; `advertising-detached-cards.e2e.mjs` |
| R5 | `image-loading-frame.e2e.mjs`; `advertising-related-cta.e2e.mjs`; `masonry-hosts.e2e.mjs` |
| R6 | `advertising-continuation.e2e.mjs`; `advertising-related-cta.e2e.mjs` |
| R7 | `masonry-hosts.e2e.mjs` |

## Gate còn mở

Không có.

## Chú thích thuật ngữ

- Sân masonry: state và vòng dựng của một lưới (card đang dựng, tọa độ, card tạm, hàng chờ).
- Item ghim: item có chỗ cố định trong lưới related (primary, card gợi ý), card khác xếp quanh nó.
- Card tạm: khối màu chủ đạo giữ chỗ card chưa tới lượt dựng.
