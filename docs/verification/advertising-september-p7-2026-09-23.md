# Verification Advertising P7 ngày 2026-09-23

## Phạm vi

Evidence này kiểm correction `AD-SEPT-2026-P7`: hero one-shot khi adapter tải
chậm, skeleton mobile và unified Glassmorphism, Pinterest primary/pager,
suggestion-first, cùng shared header/menu. Đây là focused technical gate của
local build; không thay full-site parity, owner visual acceptance hoặc quyền
ship.

## Kết quả triển khai

1. Filter được chặn ở shell trước khi catalog adapter sẵn sàng, chỉ phát lại
   intent mới nhất. Filter sau mount không đổi identity hero/container và không
   chạy lại hero motion.
2. Mười hai preset giữ màu, Distortion, Swirl, Speed và Finish; Scale được khóa
   `100%`. Batch luôn hoán vị bốn anchor và có thể đảo chiều. Mobile tạo tối đa
   hai WebGL canvas; tail cuối chứa skeleton, CTA và toàn footer trong một
   viewport.
3. Skeleton dùng một surface Glassmorphism full bleed: blur/tint xuất hiện trước
   white fade và kết thúc `#fff`. Photo primary chỉ bật cùng token glass khi
   `contain` tạo phần dư.
4. Pinterest mode chạy khi `primarySpan === totalColumns`: primary đúng
   `100dvh`, ảnh giữ tối thiểu `72%`, mô tả tối đa `28%`. Mô tả dài phân trang
   bằng swipe, mouse/trackpad ngang và phím mũi tên; thao tác dọc tiếp tục cuộn
   page. Suggestion là cell đầu related grid; không có nút Back.
5. Năm route dùng shared menu CTA `Gọi Zalo tư vấn` / `Talk to us on Zalo`, giữ
   Zalo href, nằm trước X. Logo, hamburger, CTA và X dùng cùng shell đã duyệt.

## Gate tự động

| Gate | Kết quả |
| --- | --- |
| `pnpm prepare:site` | PASS; source được đồng bộ sang output và sinh sáu detail page |
| `pnpm qa:static` | PASS sau khi assertion geometry cũ được cập nhật theo shared header P7 |
| Node syntax cho runtime và ba browser suite P7 | PASS |
| Skeleton Flow unit/contract | PASS |
| Advertising layout | PASS `16/16`, gồm boundary `719/720/1004/1005` và suggestion rank 0 |
| Advertising static | PASS `1/1` |
| Shared header static | PASS `7/7` |
| Hero one-shot browser | PASS delayed adapter, fallback và 10 filter activation |
| Pinterest primary P7 focused | PASS `4/4`: VI/EN tại `360×800` và suggestion cell VI/EN tại `1005×900` |
| Pinterest primary P14 unfiltered | PASS `33/33`; không còn assertion legacy che contract R15 |
| Shared header browser | PASS `10/10`: VI/EN tại `390/768/1024/1440/1922` |
| Continuation full | PASS; layout, tail, glass, lifecycle, history và performance A54 synthetic |
| `git diff --check` cho source/test P7 | PASS; chỉ có cảnh báo CRLF hiện hữu |

## Browser và performance

Chrome DevTools với user agent Galaxy A54, touch và viewport `360×800` xác nhận:

- Pinterest primary cao `800px`; hero `576px` (`72%`), mô tả `209px`,
  `touch-action: pan-y`, không inner scrollbar và không có Back.
- Nút expand cách mép phải/dưới ảnh `8px`; suggestion là child đầu related
  grid; page không overflow ngang.
- Ở cuối trang, CTA bắt đầu tại `0,67px`, footer nằm trong `449,67–800,23px`;
  cả CTA và toàn footer xuất hiện trong viewport. Mobile có hai frame và hai
  canvas; glass rộng đúng `360px`, blur `28px`, endpoint trắng tinh.
- Console không có error hoặc warning. DevTools báo một issue hiện hữu: sáu ảnh
  lazy-load chưa có width/height tĩnh.

Performance automated theo đúng target synthetic đã đạt. Headless
`360×800`, DPR 3, touch, Android UA, hai canvas `240×160` chạy ba lượt 5 giây:
median RAF `60,246fps`, paint mỗi frame `60,046fps`, paint share `0,9967`, không
có long task. Chrome DevTools mobile emulation trên D3D11 đạt median RAF
`80,016fps`, paint `79,816fps`, không long task. Full continuation giữ gate
`>=30fps`, `<=50ms` và tối đa hai context; kết quả PASS.

Desktop headless bốn canvas trên SwiftShader chỉ đạt median RAF `19,966fps`,
paint `19,767fps`, nhưng paint vẫn bám RAF khoảng `99%` và không có long task.
Đây là diagnostic software WebGL/compositing desktop, không phải profile mobile
P7. Không hạ renderer quality hoặc assertion. Actual-device gate vẫn **OPEN**
vì chưa có ba trace trên Galaxy A54 thật; emulation không được gọi là proof
thiết bị thật.

Review độc lập ban đầu tìm bốn finding chức năng: suggestion bị clip, cancel
gesture lật trang, pending filter bị nuốt khi mount lỗi và browser gate cũ bỏ
lọt regression. Cả bốn đã được sửa và có test: suggestion đủ bốn nút trong
cell, `pointercancel` giữ nguyên page, pending intent fail-open qua document
navigation, full P14/header interaction chạy không lọc. Re-review độc lập sau
fix kết luận `0 Critical`, `0 Important` code defect. Ponytail review không tìm
thấy blocker; khoảng 32 dòng cleanup lặp được hoãn để không mở rộng scope sau
functional gate.

## Hash source/output sau build

Sáu cặp source/output khớp SHA256:

- `motion.js`: `201573F6E4D4AAFDA35CFC6FF8566020755164417B7C70FD88E7E78E210127D2`
- `detail.css`: `34D8A7730CA5E1CB4B002AA02D2772244BDC048F42D0921FF48521107B14E240`
- `style.css`: `725605F57F170DA1147C0711AF2CEDC77C877E7CE4E08702B8014B5496143F29`
- `catalog-runtime.mjs`: `1CF25FF3716FD2807BA33EAD7BC351663C78EFEF24FA992042C5BC2470566EE8`
- `layout-core.mjs`: `6CE0344FF4D392CD4E6075A6003C973CE147C1C9BF160D9CD16D8DE2F367EFE4`
- `skeleton-flow.mjs`: `A7F6FE595F287F5DD6B6095241012F0D6F810C5FBC5D63A3DCCA02E751F0CFB6`

## Trạng thái gate

- Focused functional và synthetic mobile performance gate P7: đạt.
- Performance trên Galaxy A54 thật: mở.
- Owner visual acceptance: mở.
- P3-T08 xóa vật lý `skeleton-dev`: mở và chỉ chạy trước ship.
- Full `pnpm qa:site`/canonical Espacio parity: vẫn `NOT PASS`; không dùng
  focused P7 PASS để thay verdict toàn site.
- Không stage, commit, push hoặc deploy.

## Chú thích thuật ngữ

- **One-shot**: motion chỉ chạy một lần trong một document load.
- **Full bleed**: surface trải đến hai mép viewport, không dừng ở mép grid.
- **Focused gate**: kiểm thử đúng phạm vi thay đổi, không đại diện toàn site.
- **Paint share**: tỷ lệ RAF có tạo paint trong thời gian probe.
- **Owner visual acceptance**: nghiệm thu trực quan cuối của chủ sở hữu.
