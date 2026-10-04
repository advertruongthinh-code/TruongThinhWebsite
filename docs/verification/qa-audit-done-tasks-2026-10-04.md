---
title: QA và audit các task đã xong ngày 04/10
type: verification
status: partial
updated: 2026-10-04
---

# QA và audit các task đã xong ngày 04/10

Phạm vi: source đã merge vào `main` từ PR #13 tới #29 và #39 (biến thể ảnh
AVIF/WebP, vòng tải ảnh, slide hero AVIF, thanh tải nút gợi ý, focus dưới
header). Không gồm việc của các thread đang chạy (checklist P0–P10, layout và
viewport trên emulator, font và cache). Chạy trên `main` `aa2f5b9`, gate nhanh chạy
lại sau khi rebase lên `77edd37`.

## Môi trường

- Cloud Linux, Chromium 141 headless (`/opt/pw-browsers/chromium`), Playwright
  1.63, preview `serve-static-parity.mjs` cổng `8787`.
- Shim test-only ngoài repo (giống PR #39): trả Barba 2.10.3 và Locomotive 4.1.4
  từ npm tarball cùng version, SRI khớp; thêm `--ignore-certificate-errors` vì
  proxy cloud ký lại TLS của Google Fonts.
- Không có Firefox, WebKit, codec H.264 (Chromium open source), A05s hay iPhone.
- Baseline so sánh: worktree tại `40f3439^1` (trước PR #13), preview cổng `8788`,
  cùng shim.

## Kết quả gate

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site`, `pnpm qa:static` | Đạt |
| `node --test tests/site/*.test.mjs` | 120/120 |
| `pnpm audit` | Không có advisory |
| `pnpm qa:client-assets` | FAIL trước sửa, đạt sau sửa (xem dưới) |
| `pnpm qa:release-regressions` | 5/7 trước sửa; sau sửa 7/7 trên `main` `77edd37`. `shared-header-bottom-p7-1` riêng 6/6 lượt đạt; `advertising-no-titles` từng FAIL một lần khi chạy chung (timeout chờ card), 4/4 lượt riêng đạt |
| route-footer-p75, suggestion-motion, suggestion-layout, slideshow-p75, hero-once, card-interactions, primary-p14, footer-consistency | Đạt |
| random-browse (cần WebKit), skeleton-lifecycle (cần Firefox) | Không chạy được trên cloud |
| site-media-card-m02a | 9/11; hai ca video FAIL vì Chromium cloud không phát H.264 (`canPlayType` rỗng), baseline FAIL y hệt |
| site-media-card-playback | Cần `SITE_MEDIA_OUTPUT_DIR` và H.264; không chạy |
| advertising-photo-view, single-related, return-p74 | FAIL y hệt baseline `40f3439^1`: có từ trước, không do các PR đã audit |
| `site.e2e.cjs` (smoke toàn site) | Trước sửa 89 FAIL (39 FAIL mới so baseline); sau sửa 112 PASS, 53 FAIL trùng đúng tập FAIL của baseline `40f3439^1` |

## Lỗi đã sửa trong PR này

1. `qa:client-assets` đỏ: test đếm mọi file `.webp`, nên 30 biến thể
   `-480/-960` của PR #13 bị tính là asset riêng; con số 21 ảnh project đã lệch
   từ trước (thư mục có 31 ảnh gốc trước PR #13). Sửa: bỏ biến thể khỏi phép đếm,
   đếm 31 ảnh gốc.
2. `shared-header-bottom-p7-1` đỏ trên Advertising, do hai race của test:
   - Desktop: test gọi `setLogicalScroll` ngay khi có `has-scroll-smooth`, rồi
     catalog Advertising mount và khôi phục scroll của history entry về `0`. Sáu
     wheel trên Linux chỉ đi `259 px` (43 px mỗi notch), chưa qua ngưỡng ẩn
     header. Trên Windows mỗi notch 108 px nên lỗi bị che.
   - Mobile: `max` đo trước fixture; grid random ngắn lại khoảng `323 px` sau
     fixture nên bước cuộn lên bị kẹp ở đáy và không di chuyển.
   - Sửa: chờ CTA skeleton `ready` trước khi cuộn, đo lại đáy trước bước cuộn
     lên. Không đổi source.
3. `site.e2e.cjs` có 36 FAIL mới do test chưa biết ảnh AVIF:
   - 28 ca "root portal hierarchy" so `currentSrc` với file `.webp` gốc; nay
     browser chọn biến thể AVIF. Sửa: so thuộc tính `src` authored.
   - 7 ca "white overlay media fallback" chặn request `**/X.webp`; nay request
     là `X-480.avif`, `X.avif`... Sửa: route theo regex nhận mọi biến thể; hai ca
     CTA và legacy closer còn tìm ảnh bằng `:scope > img`, nay ảnh nằm trong
     `<picture>`, sửa thêm `:scope > picture > img`.
   - 1 ca "commercial gallery next moves track" (drag chỉ 16 px): sau PR #39,
     `scroll-padding-top` làm trang dừng thấp hơn 56 px khi Playwright cuộn tới
     nút Next, tâm ảnh rơi xuống `y=919` ngoài viewport `900`, nên pointer không
     chạm track. Drag thật vẫn chạy (226–228 px sau sửa, baseline 220–252 px).
     Sửa: bấm giữa phần ảnh đang hiện.
4. Trang About tải ảnh hero hai lần: `<link rel="preload">` vẫn trỏ
   `legacy-team.webp` cỡ đầy đủ trong khi `<picture>` chọn AVIF. Đo trước sửa
   ở 1440 px: `legacy-team.avif` và `legacy-team.webp`. Sau khi bỏ preload: 390 px
   chỉ `legacy-team-480.avif`, 1440 px chỉ `legacy-team.avif`. `<img>` đã có
   `fetchpriority="high"` nên không cần preload.

## Finding còn mở (chưa sửa)

Review code do Claude subagent `code-reviewer` chạy, main kiểm lại các mục
đánh dấu "đã kiểm".

| # | Vị trí | Mức | Nội dung | Trạng thái |
| --- | --- | --- | --- | --- |
| F1 | `src/site/style.css` vòng CSS, `src/site/detail.css` thanh nút gợi ý | Quan trọng | SVG SMIL `repeatCount="indefinite"` trong `background-image` tiếp tục quay sau khi ảnh đã tải, trình duyệt vẽ lại liên tục. `/vi/residential/` 1440 px, 2 giây nhàn rỗi: 509 Paint, bỏ background còn 311 | Đã kiểm; cần chọn cách tắt vòng khi ảnh xong |
| F2 | `style.css` selector vòng, `.editorial-item` | Nhỏ | Vòng khớp `article.editorial-item`; ở 390 px ảnh 167 px trong khung 350 px nên vòng không bị ảnh che | Suy luận từ review |
| F3 | `suggestion-slideshow.mjs`, `catalog-runtime.mjs` | Nhỏ | `sizes="auto, 50vw"` mất hiệu lực khi ảnh kế chuyển `loading="eager"`, có thể tải biến thể 960 cho nút 316 px | Suy luận, chưa tái hiện |
| F4 | `responsive-image.mjs` | Nhỏ | Probe AVIF bất đồng bộ: deep link `?photo=` có thể render WebP trước, mở viewer sau tải lại AVIF | Suy luận |
| F5 | `advertising-products/index.html` | Nhỏ | Ảnh nền placeholder `advertising-print-decals-cover.webp` eager luôn tải nhưng runtime thay bằng AVIF | Có từ trước PR #13 |
| F6 | `prepare-static-assets.mjs` | Nhỏ | Chỉ kiểm file `-W.webp` tồn tại nhưng ghi cả `-W.avif` vào `<source>`; CI `--check` đang che | Đã đọc code |

## Việc cần thiết bị hoặc engine khác

- Firefox/WebKit: `advertising-random-browse` (phần WebKit), `advertising-skeleton-lifecycle`.
- H.264: hai ca video M02a, `site-media-card-playback`.
- A05s, iPhone: theo [STATE](../STATE.md); không đổi.

## Chú thích thuật ngữ

- **Baseline**: bản source trước thay đổi, dùng để tách lỗi mới và lỗi có sẵn.
- **Shim**: đoạn code test-only thay dependency mạng bằng bản cục bộ.
- **SRI**: Subresource Integrity, hash bắt buộc của script tải từ CDN.
- **Race**: kết quả phụ thuộc thứ tự thời gian giữa hai việc chạy song song.
- **SMIL**: cú pháp animation khai báo trong SVG.
- **Paint**: lần trình duyệt vẽ lại pixel, đo bằng DevTools trace.
- **Preload**: thẻ báo trình duyệt tải trước một tài nguyên.
