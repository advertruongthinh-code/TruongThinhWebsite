---
title: Design System và Impeccable
status: live
updated: 2026-10-23
source:
  - scripts/docs/build-design-system.mjs
  - scripts/docs/capture-design-system.mjs
  - scripts/docs/stage-design-system.mjs
  - scripts/docs/build-design-md.mjs
  - scripts/docs/captures/**
tests:
  - scripts/docs/check-docs.mjs
notion: none
---

# Design System và Impeccable

## Mục đích

`design-system/` là nguồn chuẩn duy nhất của hình thức website Trường Thịnh: token, quy tắc, component, motion,
thương hiệu. Bản xem trên claude.ai để owner duyệt bằng mắt. Impeccable đọc `DESIGN.md` và `.impeccable/design.json`;
hai file này trỏ về `design-system/`, không chép lại. Hành vi từng phần website thuộc spec của phần đó.

## Hành vi

### R1. Cấu trúc và token

1. `design-system/` theo cấu trúc `project/` của loại artifact Design System trên claude.ai: `README.md`,
   `tokens.json`, `components/<Tên>/README.md` và `preview.html`, `components/bundle.css`, `components/bundle.js`,
   ảnh preview ở `preview-media/`, các section `*.md` khác (`brand.md`, `motion.md`, `content.md`,
   `advertising-images.md`), `design-system.json`. Không có `assets/`: ảnh nội dung thuộc website, sau này là CMS.
2. Giá trị token lấy đúng từ CSS đang chạy (`src/site/style.css`, `detail.css`); không chế giá trị. Check
   design-drift so khối `:root` đầu `style.css` với token cùng tên: thiếu token hoặc khác giá trị thì fail. Biến
   motion không có family token, khai trong `tokens.json` `meta.cssOnly` kèm lý do. Literal rải trong selector không
   thuộc check.
3. Motion là section `motion.md` (format không có nhóm token motion).
4. Chỉ mô tả Trường Thịnh: số đo là của website Trường Thịnh. Site tham khảo chỉ ghi ở section `Nguồn tham khảo` của
   `README.md` (owner 2026-10-04).
5. Thiết kế owner đã duyệt nhưng website chưa chạy ghi trong spec sở hữu phần đó (`status: planned` hoặc
   `Gate còn mở`). `design-system/` chỉ mô tả code đang chạy; không có trang "chờ code" (owner 2026-10-23).

```gherkin
Given một biến mới hoặc giá trị đổi trong :root của style.css
When CI chạy pnpm qa:docs
Then check design-drift fail cho tới khi tokens.json có token cùng tên và giá trị
```

### R2. README là Overview gọn

`README.md` là trang Overview trên claude.ai, người đọc là owner và Impeccable. Nó chỉ chứa quy tắc thiết kế, theo
đúng tám heading Impeccable đọc (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's
and Don'ts) cộng `Nguồn tham khảo`. Mỗi mục nêu quy tắc và token nào dùng khi nào, chi tiết thì link sang README
component hoặc section khác.

1. Không chứa: hướng dẫn publish, lệnh build, ghi chú file nào sinh từ đâu, bảng số đo theo độ rộng màn hình
   (số đo nằm ở README component). Quy trình nằm trong spec này.
2. Tối đa 150 dòng.
3. Section `*.md` khác không lặp nội dung README hoặc lặp nhau; trùng thì giữ một chỗ, chỗ còn lại link.

```gherkin
Given owner mở mục Overview trên claude.ai
When đọc README
Then không có lệnh, đường dẫn script hay hướng dẫn publish
And README dài tối đa 150 dòng
```

### R3. Preview component đứng yên, đúng hình

1. Component bao phủ mọi pattern UI đang có: header, menu, footer, brand lockup, floating CTA, hero, project reel,
   gallery ngang, banner CTA, filter, media card, masonry, skeleton, vệt sáng chờ ảnh, primary, suggestion,
   viewer, kính.
2. Preview dùng chính CSS website: `components/bundle.css` sinh từ `style.css`, `detail.css`, bỏ `@font-face` tự
   host (preview nạp font từ Google). `scripts/docs/build-design-system.mjs` sinh preview từ HTML website (card
   rail công trình chèn từ dữ liệu như build) hoặc từ bản chụp, sinh `bundle.css`, `bundle.js` rỗng và ảnh
   `preview-media/` (xóa ảnh thừa). `qa:docs` chạy chế độ `--check`; file sinh lệch source thì fail.
3. `bundle.js` rỗng nhưng bắt buộc: thiếu file này, trang ép mọi preview thành tĩnh, không chạy script, không tải
   ảnh (verify 2026-10-23).
4. Preview đứng yên: không chạy JS của site. Chỉ có script boot nhỏ do generator viết (gắn class trạng thái, cuộn
   tới phần tử chính). Hover, focus và transition bằng CSS vẫn chạy.
5. Bấm trong preview không rời trang: script boot chặn điều hướng của mọi link, nên card không rơi vào trạng thái
   "Live preview stopped" và ảnh trong card không vỡ.
6. Mọi card hiện đủ nội dung khi mở và sau khi bấm: không card trống, không ảnh vỡ.
7. Ảnh chỉ để minh họa: được khác demo, không cần chụp lại khi website chỉ đổi ảnh. Logo và màu thương hiệu phải
   trùng source (owner 2026-10-23).
8. Gallery giống gallery ngang trang Residential: tiêu đề, track ảnh, caption và dải chấm chỉ báo. Dải chấm do
   runtime dựng nên lấy từ bản chụp trang thật.
9. Kính giống khung ảnh chính trang chi tiết Advertising: ảnh đặt giữa khung, kính mờ phủ ảnh nền, có lớp hạt.
   Hạt do runtime vẽ ra blob URL nên preview phải có hạt thay thế nhìn tương đương, không để trống.
10. Phần do JavaScript dựng (Advertising, Kính, dải chấm Gallery) được `scripts/docs/capture-design-system.mjs` chụp
    từ trang chạy thật vào `scripts/docs/captures/`, viewport 1440px, seed cố định. Card chụp mang `width=1440`
    để claude.ai dựng ở khổ đó rồi thu nhỏ. `qa:docs` fail khi preview dùng class không còn trong `src/site/` hay
    `scripts/site/`. Capture không tự chạy; chạy lại khi bố cục hoặc copy đổi, rồi build. Catalog public chưa có
    card nhiều media nên capture MediaCard thay catalog bằng dữ liệu giả qua `window.__TT_ADVERTISING_ARTIFACT__`
    như test e2e; video chỉ giữ poster.

```gherkin
Given owner mở mục Components trên claude.ai
When bấm vào link hoặc nút bất kỳ trong một card
Then card vẫn live, không có dòng "Live preview stopped"
And mọi ảnh trong card vẫn hiện
```

```gherkin
Given card Kính trên claude.ai
When owner so với khung ảnh chính trang chi tiết Advertising trên demo
Then thấy ảnh giữa khung, kính mờ bao quanh và lớp hạt
```

### R4. Impeccable trỏ về Design System

1. `scripts/docs/build-design-md.mjs` sinh `DESIGN.md` theo định dạng Impeccable: frontmatter YAML từ
   `design-system/tokens.json` (dòng GENERATED là comment YAML ngay sau `---`), rồi tám mục canonical. Mỗi mục
   lấy đoạn mở đầu và các đoạn `**Quy tắc ...**` của mục cùng tên trong `README.md` cộng một link tới mục đó;
   Do's and Don'ts giữ nguyên vì toàn là quy tắc. Không chép bảng hay danh sách khác. `--check` chạy trong
   `qa:docs`.
2. Cùng script sinh `.impeccable/design.json` (schemaVersion 2), chỉ phần frontmatter không chứa được:
   `extensions.shadows` (rỗng, site không dùng shadow), `extensions.motion` (biến motion trong `:root` của
   `style.css`, purpose trỏ `design-system/motion.md`), `extensions.breakpoints` (dòng breakpoint của mục Layout
   trong README). Không specimen component, không narrative: preview và README của `design-system/` đã giữ.
3. Surface brief trong `.impeccable/surfaces/` chỉ giữ chiến lược riêng route, link component thay vì chép mô tả.
4. Impeccable là công cụ critique, audit, polish, `impeccable detect`; file làm việc khác của nó (`config.json`,
   `mocks/`, `review/`) ngoài phạm vi spec này.

```gherkin
Given owner sửa quy tắc hoặc token trong design-system/
When chạy node scripts/docs/build-design-md.mjs
Then DESIGN.md và .impeccable/design.json đổi theo
And DESIGN.md chỉ chứa đoạn mở đầu, đoạn quy tắc và Do's and Don'ts của README
And impeccable context đọc được không báo CONTEXT_STALE
```

### R5. Publish lên claude.ai

Sau khi PR đổi `design-system/` merge vào `main`, agent publish lên một artifact Design System duy nhất; URL ghi ở
README. Chỉ publish khi owner tự gõ `republish` trong chính thread đó (AGENTS.md). Không sửa trực tiếp trên
claude.ai; có sửa thì đưa ngược vào Git qua PR. CI không publish được (cần công cụ Artifact), nên đây là bước của
agent:

1. `node scripts/docs/stage-design-system.mjs` dựng `.tmp/design-system-publish/project/`: file nhị phân chép
   nguyên byte, link ra ngoài `design-system/` trỏ GitHub, in danh sách `files`.
2. Đọc index live (`project/design-system.json`), giữ mọi key, chỉ đổi `lastChange`.
3. File live không còn trong danh sách stage được gỡ bằng `null` trong cùng lần publish.
4. Đọc lại artifact sau publish; ghi `lastChange` vào `design-system/design-system.json` qua một PR nhỏ.

```gherkin
Given PR đổi design-system/ đã merge và owner gõ republish
When agent publish
Then artifact có đúng các file của bản stage, không còn file đã bỏ
And lastChange trên claude.ai khớp design-system/design-system.json sau PR ghi lại
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Marker | `<!-- @dsCard group height width -->` | Dòng đầu mỗi `preview.html`; generator ghi |
| DOM hook | `[data-ds-frame]`, `[data-ds-focus]` | Script boot cuộn khung tới phần tử chính |
| Data | `design-system/design-system.json` | Index artifact; `assetGroups` rỗng, `lastChange` mỗi đợt |
| Data | `scripts/docs/captures/*.html` | Markup runtime đã chụp, comment đầu ghi class `html`, `body` |
| File | `DESIGN.md`, `.impeccable/design.json` | Sinh bởi `build-design-md.mjs`, không sửa tay |

## UI

[README](../../design-system/README.md), [Motion](../../design-system/motion.md),
[Brand](../../design-system/brand.md), [component](../../design-system/components/).

## Kiểm tra

| R | Cách kiểm |
| --- | --- |
| R1 | `pnpm qa:docs` (design-drift, link) |
| R2 | `wc -l design-system/README.md`; review PR |
| R3 | `node scripts/docs/build-design-system.mjs --check`; render preview local ở 1440px; owner mở Components |
| R4 | `node scripts/docs/build-design-md.mjs --check`; `impeccable context`, `impeccable doctor` |
| R5 | Đọc lại artifact bằng công cụ Artifact sau publish |

## Gate còn mở

- Owner kiểm mục Components và Overview trên claude.ai sau lần republish kế tiếp.

## Chú thích thuật ngữ

- **Design System**: loại artifact claude.ai gồm README, token, component, preview.
- **Preview**: file `preview.html` hiển thị một component trong mục Components.
- **Bản chụp (capture)**: markup trang thật lưu lại để preview dùng khi phần đó do JavaScript dựng.
- **Script boot**: đoạn script nhỏ đầu preview, không phải JS của site.
- **Sidecar**: file phụ `.impeccable/design.json` chứa thứ frontmatter `DESIGN.md` không chứa được.
- **Design drift**: giá trị trong CSS lệch với token đã ghi.
- **Index live**: file `project/design-system.json` đang ở trên claude.ai.
