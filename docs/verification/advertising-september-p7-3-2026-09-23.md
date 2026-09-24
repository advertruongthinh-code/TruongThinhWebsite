# Verification Advertising P7.3 ngày 2026-09-23

## Phạm vi và kết quả

Owner xác nhận ba correction: primary full-span phải hiện trọn trong viewport
còn lại dưới navbar; ba link navbar ẩn cùng nhau nếu không còn nằm một hàng;
suggestion trở lại dưới mô tả khi resize từ full-span sang split. Nút suggestion
inactive có ảnh nền không có viền đen; active giữ nền trắng, chữ và viền đen.
Đây là focused technical gate trên local build, chưa là owner visual acceptance.

Primary full-span dùng trần `viewportHeight - primaryTop - safeBottom`, nên
`100dvh` chỉ là giới hạn ngoài. Ở `954×910`, photo dọc
`signage-raised-letters-07` có primary top `110,39px`, bottom `910px`, cả
ảnh/mô tả nằm trong phần còn lại. Ảnh ngang thấp hơn trần giữ chiều cao tự
nhiên; khi thu ảnh, glass chỉ xuất hiện hai bên. Split geometry không đổi.

Navbar dùng vị trí hàng thật của ba link, clipping và va chạm với logo/menu;
khi thiếu chỗ, cả nhóm ẩn và rời focus order. Kiểm resize, chữ lớn, homepage
và Advertising VI/EN đều đạt. Dải `751–960px` không còn ép navbar hai hàng.

Resize photo view `954→1165px` từng để `position:absolute` của masonry trên
suggestion khi nó chuyển vào primary info, khiến gợi ý đè mô tả. Runtime nay
xóa định vị đó trước khi chèn lại. Tại `1165px`, suggestion nằm sau CTA, không
overlap hoặc overflow ngang; đổi ngược sang full-span vẫn là card đầu grid.

## Gate đã chạy

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS, sáu Advertising detail page được sinh |
| `pnpm qa:static` | PASS |
| Layout/static Node | PASS `31/31` |
| P14 primary browser matrix | PASS `33/33` trước thay đổi guard nav cuối; guard được kiểm bởi suite nav riêng |
| Full-span browser VI/EN, ảnh ngang/dọc và `954×910` | PASS |
| Shared navbar homepage/detail VI/EN, resize, chữ lớn | PASS |
| Suggestion split/full-span VI/EN qua resize hai hướng | PASS |
| Suggestion motion/border normal và hover | PASS |
| `git diff --check` | PASS; chỉ có cảnh báo chuẩn hóa CRLF ở file khác |
| Impeccable detector | Hoàn tất; cảnh báo font/type ramp/màu hiện hữu ngoài delta này |

Sau `prepare:site`, SHA-256 source và `.site-output` khớp từng cặp:
`motion.js` `82C7A022905B86CAD224929D7074460B928A2F60EF07A263F14430C584ED0DC8`,
`style.css` `9B84022D620EC05F7F89C57967E3F071FEFC8DB8BFE97CDF3566634E74F52151`,
`layout-core.mjs` `4B7E913325B9844DDFF1DE063598545D791D7C6D11680725D6BE0E443D3FA1E9`,
`catalog-runtime.mjs` `643743AD7107DACCF443A1BA1835B6FDF8092CADF1B717A472D815A82692B0C1`.

Chrome DevTools kiểm tại `920×910` chỉ thấy logo và menu trong navbar;
`1165×910` thấy lại ba link cùng hàng. Ảnh split sau resize có suggestion
`position:relative`, bên dưới CTA, không có lỗi console; các request liên quan
đều `200`.

## Giới hạn còn mở

- Owner chưa duyệt bằng mắt trên cửa sổ của mình, nhất là `920→1165px` và ảnh
  dọc `954×910`.
- Galaxy A54 thật và P3-T08 tune/xóa `skeleton-dev` vẫn mở; kiểm trên mô phỏng
  không chứng minh hiệu năng của thiết bị thật.
- Full-site QA và canonical Espacio parity vẫn **NOT PASS** theo ledger; không
  stage, commit, push hoặc deploy trong correction này.

## Chú thích thuật ngữ

- **Full-span**: primary chiếm toàn bộ số cột của grid ở viewport hiện tại.
- **Split**: primary chỉ chiếm một phần số cột, gợi ý nằm trong primary info.
- **Focused gate**: kiểm thử đúng phạm vi correction, không đại diện toàn site.
