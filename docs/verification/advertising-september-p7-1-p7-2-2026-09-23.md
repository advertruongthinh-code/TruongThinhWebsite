# Verification Advertising P7.1 và P7.2 ngày 2026-09-23

## Phạm vi và kết quả

P7.1 đưa skeleton tiếp tục theo frontier organic của grid, giữ CTA và toàn
footer trong viewport cuối, đặt suggestion theo split/full-span, ngăn hero
replay khi lọc và ngăn navbar expand giả tại đáy trang. P7.2 đồng bộ độ tối
portal/suggestion inactive với Pinterest và thay primary full-span từ chiều cao
cố định sang chiều cao tự nhiên có trần `100dvh`. Đây là focused technical gate
của local build, không phải full-site parity hoặc owner visual acceptance.

Pinterest pin [tham khảo](https://www.pinterest.com/pin/993043786600678877/)
do owner mở trong Codex Browser: computed overlay của nút “Điêu khắc” khi không
hover là `rgba(0, 0, 0, 0.4)`. Portal homepage và suggestion inactive dùng cùng
token này; hover/focus giữ độ tối, media zoom tiếp tục. Active suggestion vẫn
trắng với chữ/viền đen và không có hover motion.

Primary full-span hiện dùng chiều cao ảnh giữ ratio cộng mô tả tự nhiên và gap,
tối đa `100dvh`. Ảnh ngang `kiosk-posm-28` tại `756×910`: primary cao
`598,66px`, frame/ảnh cùng `706×470,66px`, mô tả `113px`, glass tắt. Ảnh dọc
`kiosk-posm-09` cùng viewport: primary cao `910px`, frame `706×760px`, ảnh
`427,72×760px` căn giữa, glass bật chỉ hai bên. Cả hai không có overflow ngang;
ảnh không có phần dư ở trên/dưới. Mô tả dài tiếp tục phân trang, không có
scrollbar riêng. Split layout giữ hình học P7.1.

Ở mobile `360×800` cuối trang, regression đo CTA heading, CTA link và toàn
footer cùng nằm trong viewport; font CTA được thu vừa khung để không clip.
Paint overflow của skeleton không tăng document height hoặc chặn hit target;
Glassmorphism R10 giữ full bleed, blur/tint trước white fade và endpoint trắng.

## Gate đã chạy

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS; sinh sáu Advertising detail page |
| `pnpm qa:static` | PASS |
| Layout unit gồm P7.2 landscape/portrait/long description | PASS `30/30` |
| Advertising static contract | PASS |
| Full P14 primary browser matrix | PASS `33/33`, VI/EN/mobile/desktop |
| P7.2 browser `756×910`, VI/EN, ảnh ngang/dọc | PASS `4/4` |
| Shared portal/suggestion hover browser | PASS VI/EN, overlay normal/hover/focus và active state |
| Suggestion split/full-span browser | PASS, một node và active state giữ qua resize |
| Header bottom browser | PASS 10 route/locale native và 2 desktop smooth cases |
| Hero one-shot browser | PASS delayed adapter, fail-open và 10 filter activation |
| Skeleton Flow unit | PASS |
| Advertising continuation browser | PASS, gồm mobile CTA/footer bounds, glass, lifecycle và synthetic performance |
| Node syntax và `git diff --check` scope source/test | PASS; warning CRLF hiện hữu ở một file Markdown |

`pnpm prepare:site` cho năm file source/output khớp SHA-256: `style.css`
`FFEC01F9C5BD2D29162785E48514F4513B5BAB1B2EFD8E3D4145A3A969B36F86`,
`detail.css` `286292F0CC8D72CC8CEDCBB28F5106F077AA062165C9B54F0D6AEA97DDDFEF14`,
`layout-core.mjs` `A5301833F53B625DCD004722F07B3665C195394017ABD31715E4FB40B5F99CE7`,
`catalog-runtime.mjs` `5910829D0624B8D58FA76C03456A4F0FEDDC227641BBC4C2AF62237A6220A9BF`
và `skeleton-flow.mjs` `863D1DB34F46801CF7512FF63EE42191B12ADBBF1C3B5241AA9DD1556556086D`.

## Giới hạn còn mở

- Owner visual acceptance trên chính cửa sổ trình duyệt của owner vẫn mở.
- Ba trace performance trên Galaxy A54 thật vẫn mở. Headless/DevTools emulation
  không thay bằng chứng thiết bị thật; không hạ chất lượng Flow để đạt fps giả.
- P3-T08: owner tune/duyệt JSON preset rồi xóa vật lý `skeleton-dev` trước ship.
- Full `pnpm qa:site` và canonical Espacio parity vẫn **NOT PASS** theo ledger
  toàn site. Không stage, commit, push hoặc deploy trong task này.

## Chú thích thuật ngữ

- **Full-span**: primary chiếm toàn bộ số cột của related grid.
- **Focused gate**: kiểm thử có phạm vi, không đại diện cho toàn website.
- **Paint overflow**: phần vẽ vượt logical grid nhưng không chiếm layout height.
