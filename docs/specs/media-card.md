---
title: Card nhiều media
status: live
source:
  - src/site/advertising-products/placeholder-media.mjs
tests:
  - tests/site/site-media-card-contract.test.mjs
  - tests/site/site-media-card-m01b.e2e.mjs
  - tests/site/site-media-card-r6.e2e.mjs
  - tests/site/site-media-card-m02a.e2e.mjs
  - tests/site/site-media-card-autoplay.e2e.mjs
  - tests/site/site-media-card-playback.e2e.mjs
notion: https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc
updated: 2026-10-15
---

# Card nhiều media

## Mục đích

Một card sản phẩm có thể mang nhiều ảnh và video: người xem đổi media ngay trên card, mở detail đúng media đang xem
và đổi tiếp ở primary. Runtime đã có trên masonry và related Advertising, nhưng catalog 200 card hiện chỉ có một ảnh
mỗi card. Các họ card ngoài Advertising đang tạm dừng (Gate còn mở). Code nằm trong
file của [masonry](advertising-masonry.md) và [detail](advertising-detail.md) nên spec này chỉ sở hữu dữ liệu media tạm `placeholder-media.mjs`.

## Hành vi

### R1. Dữ liệu media của card

Card có `mediaItems` (thứ tự hiển thị) và `coverMediaId`; thiếu `coverMediaId` thì cover là item đầu.
`validateAdvertisingCardMedia` (`media-contract.mjs`) chạy cho mọi card khi `catalog.mjs` nạp và từ chối card sai: danh
sách rỗng, cover không có trong danh sách, trùng `id`, `kind` khác `image`/`video`, thiếu `src` hoặc `sourceId`, thiếu
`altVi`/`altEn` hoặc `source`, `sha256`, `provenance`. `width`, `height` là số nguyên dương an toàn và mọi item cùng một
tỷ lệ chính xác (so bằng BigInt, không sai số). Video cần thêm `posterSrc`, `posterWidth`/`posterHeight` cùng tỷ lệ,
`durationSeconds` và `hasAudio` boolean. Ảnh legacy `record.media` được hiện làm cover (cùng `src`) thì cũng phải cùng
tỷ lệ; không hiện thì giữ được tỷ lệ khác. Validator chỉ kiểm metadata, không kiểm byte file; khi chuẩn bị asset, đối
chiếu kích thước thật bằng `ffprobe` (video) và giải mã ảnh (poster). `media-manifest.mjs` hiện cho mỗi card đúng một
item ảnh, `id` bằng id card.

```gherkin
Given card có hai item: ảnh 1536×1024 và video 1920×1080
When catalog.mjs nạp
Then validateAdvertisingCardMedia ném lỗi "ratio must match the card", không crop, không làm tròn
```

### R2. Canvas và dải điều khiển

Canvas card lấy tỷ lệ của item cover (`layoutMedia`, `layout-core.mjs`), kể cả khi cover là video. Card từ hai item có
thêm dải điều khiển cao 44px dưới canvas (`mediaControlStripHeight`), tính ngay trong lần xếp đầu ở masonry và related;
dải không phủ ảnh. Card một item không có dải, không chỉ báo; item đó là video hoặc ảnh khác `record.media` thì card hiện
đúng item đó. Nhãn thời lượng video ở góc trên trái canvas. Đổi media, tải chậm hay lỗi không
đổi khung card, canvas hay dải (lệch tối đa 1px). Card 200 ảnh hiện tại giữ hình học và thứ tự của
[masonry R5](advertising-masonry.md#r5-hình-học-masonry).

```gherkin
Given card nhiều media, cover 16:9, cột rộng 172.5px ở viewport 390px
When masonry xếp lần đầu
Then canvas 172.5×97.03px, card cao thêm 44px cho dải chấm dưới canvas
And chuyển sang video chậm tải thì khung card, canvas, dải lệch tối đa 1px
```

### R3. Đổi media trên card

2–6 item: một hàng chấm trong dải (UI chấm của [Gallery](../../design-system/components/Gallery/README.md)), mỗi chấm là nút 20×44px tên "Xem media i trên N" / "Show media i of N", chấm đang
xem có `aria-current="true"`; nhóm có nhãn "Media của thẻ" / "Card media". Từ 7 item: nút "Media trước" / "Previous
media" và "Media tiếp" / "Next media" 44×44px, bộ đếm `i/N` (`role="status"`, `aria-live="polite"`); nút trước vô hiệu ở
item đầu, nút sau ở item cuối. Vuốt ngang trên card (`|dx|` từ 40px và lớn hơn `|dy|`, pointer event, `touch-action:
pan-y`) đổi một item, dừng ở hai đầu, rồi chặn click chuột, chạm trong 400ms để không mở detail; click bàn phím không
bị chặn. Chuột thật hover card thì hiện mũi tên "Media trước" / "Media tiếp" giữa canvas (cùng mũi tên dải media primary R6),
ẩn ở hai đầu; cảm ứng không có mũi tên. Card không zoom media khi hover. Nút và vuốt chỉ đổi media; bấm thân card mở detail ở media đang xem
([detail R1](advertising-detail.md#r1-url-và-vào-detail)). Card rời cửa sổ ảo hóa rồi quay lại vẫn ở media đã chọn.

```gherkin
Given card 11 media ở /en/advertising-products/, viewport 1440px
When bấm "Next media" hai lần
Then bộ đếm là "3/11", URL không đổi, detail không mở
And vuốt trái trên ảnh đổi sang 4/11, click ngay sau vuốt không mở detail
```

### R4. Video trên card

Layer video tạo khi item thành active: `muted`, `playsInline`, `preload="metadata"`, có `poster`, nhãn bằng alt của item.
Card video theo Pinterest (owner 2026-10-17): không nút phát, không icon loa; nhãn tổng thời lượng `m:ss` làm tròn lên,
không đếm ngược. Mỗi lúc chỉ một video phát, luôn tắt tiếng. Cuộn dừng 200ms thì giữ video đang phát nếu tâm còn trong
vùng trọng tâm (dải 40% giữa phần nhìn thấy dưới navbar), không thì chọn ngẫu nhiên card có item video đang active trong
vùng, chưa phát trong chu kỳ; hết một vòng thì chọn card khác, hết card thì sang chu kỳ mới. Chuột vào card video thì
phát card đó, dừng card khác, tiếp tục ở thời điểm cũ; rời card thì dừng mọi video tới hover hoặc cuộn kế. Cuộn dừng
khi con trỏ nằm trên card video thì card đó thắng. Touch không có hover: chạm card mở detail như ảnh. Reduced motion
không tự phát, hover vẫn phát. Đổi item hoặc card rời cửa sổ ảo hóa thì video tạm dừng.

```gherkin
Given hai card video 0:07 trong vùng trọng tâm, chưa phát
When cuộn dừng
Then đúng một video phát tắt tiếng, không card nào có nút phát
And rê chuột vào card còn lại thì card đó phát, card trước dừng
```

### R5. Chờ tải và lỗi media

Item active chưa sẵn sàng thì card có status ẩn "Đang tải media" / "Loading media" và skeleton trong khung
([loading glass R5](loading-glass-and-page-entry.md#r5-skeleton-thay-vòng-xoay)). Ảnh phụ tải lazy theo biến thể
([tải ảnh R3](media-delivery.md#r3-runtime-advertising-chọn-biến-thể)). Ảnh lỗi: card về ảnh vừa sẵn sàng gần nhất, rồi
ảnh cover, rồi ảnh đầu chưa lỗi. Video lỗi: thử poster; poster tải được thì hiện poster, lịch phát bỏ qua card đó, dải vẫn dùng được;
poster cũng lỗi thì về ảnh như trên. Lỗi cũ không đè lựa chọn mới hơn. Mọi asset đều lỗi thì runtime dừng, không gọi
lại vô hạn, không có UI lỗi riêng.

```gherkin
Given card ba media, item 2 là ảnh trả 404
When chọn item 2
Then card về item 1 đã tải, chấm 1 có aria-current, không vòng lặp tải lại
```

### R6. Media trong primary

Mở từ card, primary bắt đầu ở media đang xem của card; vào thẳng hoặc reload `?photo=<id>` bắt đầu ở cover; Back,
Forward khôi phục media của entry; đổi ngôn ngữ giữ media đang xem. URL không có tham số media. Card có hơn một item,
hoặc item khác ảnh legacy, có nhóm thumbnail "Media sản phẩm" / "Product media" cạnh mô tả: mỗi nút tên "Xem ảnh|video
i trên N: <alt>", thumbnail 60px bo 16px, đang xem `aria-current` có viền đôi, video có biểu tượng phát. Khung media
theo dải trượt của pin Pinterest nhiều media (đo 2026-10-18): khung giữ tỷ lệ cover nên đổi media không đổi kích thước
primary và related đứng yên; mỗi media vừa khung (contain), vùng dư là nền zoom blur, kể cả video. Bấm thumbnail, mũi
tên trắng 36px hiện khi trỏ vào khung (ẩn ở đầu, cuối), vuốt ngang trên cảm ứng hoặc phím trái, phải khi focus trong
khung đổi media: media cũ trượt ra, media mới trượt vào 350ms (reduced motion đổi ngay); chấm 8px ở đáy theo vị trí.
Video vào khung phát lại từ đầu, giữ lựa chọn tiếng của card. Đổi media ghi vào entry hiện tại, không thêm entry.
Video primary tự phát tắt tiếng, lặp, `playsinline`, player theo trang pin
Pinterest (đo 2026-10-18), không `controls` gốc: bấm video phát/dừng, đang dừng hiện biểu tượng phát 48px giữa video;
dải gradient đáy 128px (đen 0.4 lên trong suốt, lề 24px) có nút phát/dừng, thời gian "hiện tại / tổng" (16px đậm, tổng
mờ 0.6), nút tiếng và thanh tua (track 4px, núm 12px, bấm, kéo, phím mũi tên). Dải hiện khi chuột trên video, khi focus
bên trong hoặc khi đang dừng; màn hình cảm ứng luôn hiện. Thanh âm lượng (thêm theo owner) đứng dọc 104px phía trên
nút tiếng để không nhầm với thanh tua, mở khi trỏ hoặc focus vào cụm tiếng; kéo về 0 là tắt tiếng nhưng giữ mức cũ.
Nút "Toàn màn hình" / "Full screen" (thêm theo owner) phóng khung video ra toàn màn hình nền đen, không nền blur;
bấm lại hoặc Esc thoát, đổi sang ảnh thì tự thoát. Nút "Bật tiếng" / "Unmute" và
"Tắt tiếng" / "Mute" cùng thanh âm lượng ẩn khi `hasAudio` false, bật tiếng mà volume 0 thì đặt 1. "Xem lớn hơn" ẩn
với video. Đóng detail tạm dừng video; rời route thì dừng và gỡ nguồn. Hình học và đổi ảnh primary theo
[detail R4](advertising-detail.md#r4-media-primary-và-nền); Back, Forward theo
[detail R8](advertising-detail.md#r8-back-forward-và-vị-trí-cuộn).

```gherkin
Given card grid EN đang ở item video có tiếng
When bấm thân card
Then primary phát video đó tắt tiếng, thumbnail video có aria-current, nút "Unmute" hiện
And tải lại URL thì primary bắt đầu ở cover
```

```gherkin
Given primary đang phát video có tiếng trên desktop
When trỏ vào nút tiếng rồi kéo thanh âm lượng dọc tới 0.4
Then video bật tiếng ở volume 0.4
And kéo về 0 thì tắt tiếng, bấm nút tiếng thì về lại 0.4
```

```gherkin
Given primary card nhiều media đang ở video cuối dải
When bấm mũi tên trước
Then ảnh trượt vào khung cũ, chấm đầu active, related không đổi vị trí
And phím phải đưa video về khung và phát lại
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Data | `mediaItems[]`: `id`, `kind`, `src`, `sourceId`, `width`, `height`, `altVi`, `altEn`, `source`, `sha256`, `provenance`; video thêm `posterSrc`, `posterWidth`, `posterHeight`, `durationSeconds`, `hasAudio` | R1 |
| Data | `coverMediaId` | Cover và tỷ lệ canvas (R1, R2) |
| Hàm | `validateAdvertisingCardMedia`, `validateAdvertisingMediaPool` (`media-contract.mjs`) | Chặn dữ liệu sai khi catalog nạp |
| Hàm | `mediaControlStripHeight`, `layoutMedia` (`layout-core.mjs`) | Dải 44px, tỷ lệ cover |
| Hàm | `createPhotoCard`, `renderPrimaryMedia`, `renderPrimaryThumbs` (`catalog-runtime.mjs`) | R3–R6 |
| Attribute | `data-advertising-active-media-id` trên card và `[data-advertising-photo-view]` | Media đang xem; click card đọc để mở detail |
| Attribute | `data-advertising-media-select`, `-prev`, `-next`, `-count`, `-duration`, `-loading`, `-item` | Hook test và control card |
| Attribute | `data-advertising-photo-media-select`, `data-advertising-photo-audio-toggle`, `data-advertising-photo-video`, `data-advertising-photo-player\|play-surface\|play\|progress\|volume\|volume-group\|fullscreen\|time-current\|time-total`, `data-advertising-photo-media-step\|media-dots` | Thumbnail, nút tiếng, video primary, player, mũi tên, chấm |
| History | `grid.mediaId`, `detail.mediaId` trong state history | Khôi phục media theo entry (R6) |

## UI

[MediaCard](../../design-system/components/MediaCard/README.md) (dải, chấm, bộ đếm, nhãn thời lượng),
[ảnh trong card](../../design-system/motion.md#ảnh-trong-card), [ảnh Advertising](../../design-system/advertising-images.md).

## Kiểm tra

Unit `node --test <file>`; E2E cần `pnpm dev`, `BASE_URL`. Fixture card nhiều media là synthetic, chèn trong test.

| R | Test hoặc command |
| --- | --- |
| R1 | `site-media-card-contract.test.mjs` (11 ca); `advertising-products-layout.test.mjs` |
| R2 | `advertising-products-layout.test.mjs` (dải 44px); `site-media-card-r6.e2e.mjs` (rect ổn định, singleton không dải) |
| R3 | `site-media-card-m01b.e2e.mjs` (vuốt, chặn click, chấm, bộ đếm, mũi tên hover); `site-media-card-r6.e2e.mjs` (pointer thật ở mép nút) |
| R4 | `site-media-card-m01b.e2e.mjs` (cover video tắt tiếng có poster, không nút phát); `site-media-card-autoplay.e2e.mjs` (một video trong vùng, hết vòng đổi card, hover, reduced motion) |
| R5 | `site-media-card-m01b.e2e.mjs` (chuỗi fallback, lỗi cũ, mọi asset lỗi) |
| R6 | `site-media-card-m02a.e2e.mjs` (cover khi vào thẳng, media active, thumbnail, tiếng, player: phát/dừng, dải hiện khi hover hoặc dừng, tua, thời gian, âm lượng dọc, cảm ứng, unmount, dải media giữ khung và related, mũi tên, phím, nền blur video, toàn màn hình) |
| Họ card | `site-media-card-playback.e2e.mjs`: baseline theo họ card (cần `SITE_MEDIA_OUTPUT_DIR`, `SITE_MEDIA_EXPECTED_HEAD`) |

## Gate còn mở

Gate thiết bị theo card [kiểm thiết bị](https://app.notion.com/p/3ef332849a0e8100bbd1e62ad5229067).

- Không chặn phát hành. Owner 2026-10-17: card là một loại sản phẩm; chờ ảnh nhiều góc thật, `placeholder-media.mjs`
  (sinh bởi `scripts/site/build-placeholder-media.mjs`) cho 1/3 card media tạm chỉ trên branch xem trước, `main` để rỗng.
  Chưa có clip thật, chất lượng hay ngân sách byte. Owner.
- Phạm vi owner duyệt 28/09 là mọi họ media-card VI/EN: Home project reel (rail mobile), item gallery Residential,
  Commercial, và portal, process, duo nào có identity sản phẩm hoặc công trình và đích detail. Đề xuất giữ nguyên About
  timeline, commitments, logo marquee, heritage montage. Họ hẹp hơn dải 44px thì kiểm riêng trước khi chọn fallback.
  Chưa có code ngoài Advertising. Owner xác nhận ranh giới; Thread code khi mở lại.
- Vùng trọng tâm (owner chọn phương án A 28/09), đã code cho lịch phát (R4): dải vô hình rộng toàn viewport, cao 40% phần nhìn thấy dưới
  mép dưới navbar thực, đặt giữa phần đó, tính lại khi navbar đổi; tâm card quyết định thuộc vùng; không có card cover
  video trong vùng thì không autoplay. Solver ưu tiên mềm phân tán ứng viên, không đổi thứ tự, seed, hình học, không
  thêm filler. Solver chưa phân tán ứng viên; Main đo fallback solver trên viewport thật trước khi sửa layout.
- Lịch phát (R4) đã code trên branch xem trước. Owner 2026-10-17 bỏ nút phát trên touch theo Pinterest; card video
  trên touch chỉ tự phát trong vùng. Item video active (không chỉ cover) được vào lượt.
- Player và dải media primary (R6) đã code trên branch xem trước, chờ owner duyệt. Pinterest không có thanh âm lượng,
  toàn màn hình hay nền blur; ba thứ thêm theo owner 2026-10-18. Trên cảm ứng dải nút luôn hiện, thanh âm lượng chỉ mở
  khi focus cụm tiếng: mặc định Thread chọn, chưa đo Pinterest mobile. Owner.
- Phân loại: tag nằm trên card ([taxonomy R1](advertising-taxonomy.md#r1-ba-tầng-phân-loại)), media chỉ có `kind`; chưa có
  tag hay vai trò (góc chụp, chi tiết) theo từng media. Owner quyết khi có ảnh nhiều góc thật.
- Vùng tải trước đã duyệt: rộng hơn viewport, chuẩn bị poster, metadata trước, không cố tải cả file; đề xuất preload
  metadata cho video kế trong vùng đệm. Code chỉ tạo video khi item thành active, `preload="metadata"`. Ngân sách byte,
  lề preload, buffer chưa khóa, cần clip thật và trace thiết bị. Owner gửi clip; Main trace.
- Định dạng video: không lưu GIF public; owner chọn 03/10 AV1/WebM kèm MP4 H.264, poster WebP
  ([quyết định](https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/8138757/tasks/plan.md#advertising-random-grid-và-tải-ảnh--plan-duyệt-2026-10-03)). Code gán một `src` cho
  mỗi video, chưa có nguồn theo codec. Thread code khi có clip.
- Thời điểm phát video qua Back, Forward, đổi ngôn ngữ và khi chuyển masonry sang detail chưa chốt; không tự bật lại âm
  thanh hay hứa giữ thời điểm. Owner.
- Chấm 8px theo UI chấm Gallery (owner 2026-10-17), test `site-media-card-r6.e2e.mjs:211` đo 8px; khe nhìn thấy 12px thay vì 8px
  của Gallery để giữ vùng bấm 20×44px.
- Mọi asset của card đều lỗi: chưa có UI kết thúc riêng. Owner chọn UI; Thread code.
- Clip fixture của `m01b`, `m02a`, `r6` là AV1 + Opus trong MP4 vì Chromium của Playwright (CI, cloud) không giải mã
  H.264/AAC; WebKit chỉ phát AV1 trên phần cứng mới nên chạy tay WebKit có thể đỏ ca video. Nhánh H.264 của video
  thật chưa có test trên trình duyệt có H.264; `site-media-card-playback.e2e.mjs` chưa có kết quả trong tree. Máy PC.
- Android thật, iPhone Safari, owner xem trên demo, full suite chưa chạy cho card nhiều media. Owner, máy PC.

## Chú thích thuật ngữ

- **Media-card**: card có identity, một hoặc nhiều media và đích detail.
- **Cover**: item `coverMediaId` chọn làm mặt trước và tỷ lệ canvas của card.
- **Canvas**: vùng media giữ tỷ lệ cover, không gồm dải điều khiển.
- **Dải điều khiển**: hàng 44px dưới canvas chứa chấm hoặc bộ đếm.
- **Fixture synthetic**: dữ liệu và file giả chèn trong test, không phải media thật.
- **Vùng trọng tâm**: dải vô hình chọn ứng viên autoplay, khác vùng tải trước.
- **Số nguyên an toàn**: số nguyên JavaScript biểu diễn chính xác (`Number.isSafeInteger`).
- **Scroll settle**: lúc cuộn đã dừng đủ lâu để tính lại ứng viên.
