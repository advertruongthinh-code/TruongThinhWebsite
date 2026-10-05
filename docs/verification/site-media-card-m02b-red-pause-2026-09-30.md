---
title: Checkpoint tạm dừng M02b RED Advertising
type: verification
status: paused
updated: 2026-09-30
---

# M02b RED-only — tạm dừng theo owner

Owner yêu cầu tạm dừng và lưu checkpoint ngày 30/09. Mọi thực thi website
PAUSED đến khi owner chỉ đạo tiếp tục. Giới hạn scope đã chốt trước đó vẫn là
`advertising-products` và các route con; M03–M05 Home/Residential/Commercial/
About và QA/closure toàn website M08–M09 chưa mở lại. [Plan M00–M09](../../tasks/plan.md#site-media-card-playback--plan-draft-2026-09-28)
và [spec media-card](../specs/media-card.md) giữ nguyên phê duyệt.

Managed worktree `C:\Users\halal\.codex\worktrees\mobile-ui-contract\TruongThinh-Website`
ở branch `codex/mobile-ui-contract`, HEAD
`e6cf065161cb19a8b59dd9efa8cda5d4af27fba1`. Cây làm việc dirty từ các
gói trước được giữ nguyên; không reset, stage, commit, push hoặc deploy.
[M02a checkpoint](site-media-card-m02a-checkpoint-2026-09-30.md) vẫn scoped
engineering GREEN; P14-L04R focused `37/37`, reviewer Required0. L04R rộng hơn,
L06, owner visual, clip public thật, iPhone/Safari và full-site vẫn mở.

## Evidence M02b đã khóa

[RED manifest](../../.tmp/site-media-card/m02b-red-20260930T054609583Z/manifest.json)
SHA-256 `2FD622ACB49DE3518706358B1E4065C719BF4D856BB4CB23EF0DFDA2DA8E16FE`;
runner `tests/site/advertising-photo-transitions.e2e.mjs` SHA-256
`126235861405A1036A8C16C92886DD1FB7F94E4656B1C40DB2B91B8B386F74EA`.
Đây là RED-only runner; source behavior M02b chưa sửa. Raw log, JSON và ảnh
trong cùng thư mục được giữ làm baseline, không retag thành GREEN.

| Case | Kết quả trước M02b source |
| --- | --- |
| Grid click no-clone/no-jump | RED: tạo clone `kiosk-posm-07`. |
| Marker `Vừa xem` / `Just viewed` | RED: đóng card A về grid VI chưa có marker. |
| Media active và Back/Forward scroll theo entry | RED: Forward detail `Y=0`, kỳ vọng `Y=480`. |
| Offscreen Forward no-clone | RED: tạo clone `signage-raised-letters-01`. |
| Direct/reload cover | PASS, phải giữ khi sửa. |
| Viewer open-close morph/focus/lock | PASS, phải giữ khi sửa. |

Runtime `catalog-runtime.mjs` source/build/HTTP-served cùng SHA-256
`6AD17D935CB610AE04C070848B6DF2EAD41FF3105E0DF449F7EA6811816D2EFE`;
`detail.css` cùng SHA-256
`FE269105FFE2EB5389C688E11E45B1751F329A923C3E7830A9ABFA5553CFA657`.
Manifest ghi static endpoint HTTP `200`, `nodeCheck` và `gitDiffCheck` PASS
cho RED prep; full suite/body210 không chạy.

## Điều kiện tiếp tục

1. Chỉ tiếp tục khi owner yêu cầu. Đầu tiên đối chiếu lại HEAD, dirty paths,
   runner và source/build/served SHA với manifest; giữ raw cũ bất biến.
2. Sau đó thực thi M02b trong ownership năm file và ba accepted docs theo
   [plan](../../tasks/plan.md#site-media-card-playback--plan-draft-2026-09-28);
   cập nhật tài liệu design/motion ở checkpoint thích hợp nếu diff thật đòi.
3. Chạy named RED→GREEN và affected regressions với source/build/served cùng
   SHA. Chọn thêm gate theo blast radius; không tự chạy body210/full suite,
   không gọi M02b complete khi chưa có GREEN và review.

Card [Notion media-card](https://app.notion.com/p/3e9332849a0e814995c2fbb2e5393803)
giữ `In progress` vì database chưa có lựa chọn `Paused`; nội dung card ghi rõ
thực thi PAUSED. Semantic index không được cập nhật trong checkpoint này;
manifest P14 trước đó ghi 220 file pending, freshness hiện tại chưa kiểm lại.

## Chú thích thuật ngữ

- **RED-only**: test xác nhận hành vi sai trước khi sửa product source.
- **Checkpoint**: trạng thái và raw được khóa để tiếp tục đúng vị trí sau khi mở lại.
- **Entry**: mục lịch sử trình duyệt có vị trí cuộn và media active riêng.
- **PAUSED**: dừng thực thi cho đến khi owner chỉ đạo tiếp tục.
