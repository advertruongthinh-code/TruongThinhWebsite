---
title: CMS editor, media và khung crop
status: planned
source:
  - src/admin/media/**
tests:
  - tests/admin/cms-core.test.mjs
notion: https://app.notion.com/p/420332849a0e81ffb9e4e85372f1a0f7
updated: 2026-11-22
---

# CMS editor: media và khung crop

## Mục đích

Phần media của [editor](cms-editor.md): thư viện, upload ảnh và video, trạng thái xử lý, khung crop có vùng an toàn,
card Advertising và card công trình. Luật dữ liệu của media, biến thể và giới hạn file thuộc
[nội dung CMS R3, R4](cms-content.md#r3-media) và [dữ liệu CMS R5](cms-data.md#r5-media-crop-và-biến-thể); tỷ lệ khung
của từng chỗ thuộc [layout-library R7](layout-library.md#r7-khung-ảnh-cố-định-từng-khối). Spec này chỉ định giao diện
và thứ tự gọi lệnh. Chưa có code; panel Media hiện có của `src/admin/` (lọc, kéo thả, nơi dùng) giữ lại làm nền.

## Hành vi

### R1. Thư viện media

Panel Media là lưới mọi bản ghi media, đọc bằng lệnh `media-list`, tải thêm khi cuộn tới cuối. Mỗi ô có ảnh nhỏ (video
hiện poster kèm biểu tượng phát và thời lượng), tên, số chỗ đang dùng và nhãn trạng thái (R8). Ô tìm gửi `q` (tên và
alt, bỏ dấu); bộ lọc: Tất cả, Ảnh, Video, Đang dùng, Chưa dùng, Thiếu alt, Có lỗi. Bấm một ô mở chi tiết ở đầu panel:
ảnh lớn hoặc trình phát video, kích thước gốc, dung lượng, alt VI và EN, tag, danh sách nơi dùng (bấm một dòng mở đúng
bản ghi và chọn đúng chỗ), nút "Đưa vào thùng rác".

Sửa alt hay tag rồi bấm "Lưu alt" gọi `update-media`; vì alt mới được ghi vào mọi bản ghi đang dùng media, nút ghi rõ
"Lưu alt cho n chỗ dùng". Media thiếu alt VI hoặc alt EN là bản ghi `draft`: đặt được vào nội dung nhưng bản ghi dùng nó
không lên `published` cho tới khi alt đủ, và tab Còn thiếu của bản ghi đó nêu tên media.

Kéo một ô thả vào Xem trước: thả vào một khung media là đổi media của khung, thả vào tab Media của bài là thêm vào cuối
danh sách, thả vào card là thêm media cho card. "Đưa vào thùng rác" gọi `trash`; 409 `in-use` thì hiện danh sách nơi
dùng và ghi "Gỡ media khỏi các chỗ này trước."

```gherkin
Given một ảnh đang được 3 bản ghi dùng
When sửa alt VI trong chi tiết media
Then nút ghi "Lưu alt cho 3 chỗ dùng"; bấm thì cả ba bản ghi nhận alt mới ở lần dựng sau
When bấm "Đưa vào thùng rác"
Then lệnh trả 409, panel liệt kê đủ ba nơi dùng, media vẫn còn
```

### R2. Upload ảnh

Nút "Tải lên" hoặc thả file từ máy vào panel Media mở hàng chờ upload. Trước khi gửi, trình duyệt kiểm từng file: loại
JPEG, PNG, WebP, AVIF; tối đa 25 MB; đọc `width`, `height` bằng `createImageBitmap` (đã xoay theo EXIF). File sai loại
hay quá cỡ ở lại hàng chờ với lý do bằng chữ, không gửi. Mỗi file có ô alt VI (bắt buộc để bấm "Tải lên") và alt EN
(để trống được, khi đó media là `draft` theo R1). `slugBase` là slug của bản ghi đang mở, hoặc `thu-vien` khi không mở
bản ghi nào; tên file gốc của người dùng không dùng làm tên.

Hàng chờ gửi lần lượt từng file bằng `upload-media` (thân là byte file), hiện phần trăm của từng file; 429 thì chờ rồi
tự gửi tiếp; lỗi mạng hay 5xx thì file ghi "Lỗi, thử lại" kèm nút. Đóng trình duyệt giữa chừng thì file chưa gửi xong
phải chọn lại. File gửi xong vào lưới với nhãn "Đang xử lý" và dùng được ngay trong nội dung
([editor R3](cms-editor.md#r3-xem-trước): preview dùng bản gốc).

Logo khách hàng nhận thêm SVG: trình duyệt chỉ kiểm phần mở rộng và cỡ, Worker chạy `isSafeSvg`; 400 thì ghi "File SVG
có nội dung không được phép (script, link ngoài)."

```gherkin
Given người soạn thả 3 file: một JPEG 4 MB, một HEIC, một PNG 30 MB
When hàng chờ mở
Then file HEIC ghi "Chưa nhận HEIC, đổi sang JPEG", file PNG ghi "Quá 25 MB", chỉ file JPEG có ô alt và gửi được
```

### R3. Upload video

Video là MP4 tối đa 95 MB. Trình duyệt nạp file vào một thẻ `<video>` ẩn để đọc `duration`, bề rộng, bề cao; file
không đọc được thì ghi "Không đọc được video này, xuất lại dạng MP4 (H.264)". Mỗi video cần một ảnh poster cùng tỷ lệ:

1. Hàng chờ hiện video kèm thanh kéo thời gian; khung hình ở giây 0,5 được chọn sẵn làm poster, người soạn kéo để
   chọn khung khác.
2. Bấm "Tải lên": trình duyệt vẽ khung đã chọn ra canvas ở kích thước gốc của video, xuất JPEG chất lượng 0,9, gửi
   bằng `upload-media` như một ảnh (alt của video dùng cho poster), nhận `posterId`.
3. Gửi video bằng `upload-media` kèm `duration`, `posterId`.

Bước 3 lỗi thì poster đã gửi nằm lại trong thư viện ở trạng thái chưa dùng và được dọn như mọi media mồ côi. Video hiện
"Đang xử lý" tới khi thang chất lượng xong (tới 90 phút); trong lúc đó preview phát bản gốc qua `media-file`. Video chỉ
đặt được vào chỗ nhận video ([nội dung CMS R5](cms-content.md#r5-layout-khóa-theo-số-media)), khung 16:9, không crop.

```gherkin
Given người soạn chọn một MP4 quay dọc 60 MB
When kéo thanh thời gian tới giây thứ 3 rồi bấm "Tải lên"
Then thư viện có một ảnh poster dọc cùng tỷ lệ và một video trỏ tới poster đó, cả hai ghi "Đang xử lý"
```

### R4. Khung crop

Bấm một khung media trên preview mở khung crop phủ lên đúng vị trí khung đó. Khung giữ tỷ lệ đang chọn; ảnh luôn phủ
kín khung, không méo, không vùng trống.

| Thao tác | Kết quả |
| --- | --- |
| Kéo ảnh | Dời vùng crop; dừng ở mép ảnh |
| Lăn chuột, thanh trượt, phím `+` `-` | Phóng đều hai chiều quanh con trỏ; nhỏ nhất là vừa phủ kín khung |
| Phím mũi tên | Dời 1% mỗi lần bấm, giữ Shift là 10% |
| Chip tỷ lệ | Chỉ các tỷ lệ chỗ đó cho phép theo layout-library R7; đổi tỷ lệ giữ tâm vùng crop |
| "Đặt lại" | Về vùng lớn nhất ở giữa ảnh với tỷ lệ đang chọn |
| "Xong", Enter | Ghi `crop` vào nháp; Esc bỏ thay đổi |

`crop` lưu là bốn số nguyên `[x, y, w, h]` tính bằng pixel của bản gốc. Luật riêng: `media-pair` bằng nhau đổi tỷ lệ
một ảnh thì ảnh kia đổi theo; mỗi ảnh của `media-carousel` chọn tỷ lệ riêng; khối phủ (`hero-project`, ảnh hero, thẻ
`project-slider`, ảnh bìa) không có khung tỷ lệ mà chỉ có một điểm giữ kéo được trên ảnh. Chỗ đặt còn `legacySrc`
(ảnh cắt sẵn từ trước CMS) hiện nhãn "Ảnh cắt cũ"; mở khung crop và bấm "Xong" là đổi sang media gốc với vùng crop mới.

```gherkin
Given một ảnh 1200 × 1200 đặt trong media-text, chip 3:4 đang chọn
When mở khung crop và phóng tối đa ra
Then vùng crop là 900 × 1200 ở giữa ảnh, không thanh trống
When chọn chip 2:3 rồi bấm Xong
Then nháp ghi crop có tỷ lệ 2:3 nằm trọn trong ảnh, preview dựng lại khung đó
```

### R5. Vùng an toàn và cảnh báo mờ

Khung crop tô mờ phần có thể bị cắt trên site (owner 2026-11-15): khối phủ có sáu nút mốc 384, 768, 1024, 1280, 1440,
1920, bấm mốc nào thì phần nằm ngoài khung của mốc đó tô mờ, mặc định hiện phần chung của cả sáu mốc; card masonry tô
mờ 5% đáy khung. Khi bề rộng vùng crop nhỏ hơn bề rộng khung ở mốc 1920 của chỗ đó (bảng layout-library R7), khung ghi
"Ảnh có thể mờ trên màn hình rộng" kèm hai con số; đây là cảnh báo, vẫn lưu được.

```gherkin
Given đang crop ảnh hero-project, mốc mặc định
When bấm mốc 384
Then phần ảnh ngoài khung 461 × 1013 tô mờ, phần trong khung rõ
```

### R6. Card Advertising

Card mở từ panel Nội dung hoặc bấm card trên preview lưới. Panel Thuộc tính có các mục, theo thứ tự làm:

1. Tên VI, EN và mô tả VI, EN. Mô tả là chữ thuần nhiều dòng theo [nội dung CMS R8](cms-content.md#r8-soạn-chữ): ô
   nhập không có nút trình bày, dòng bắt đầu bằng "• " hiện thành danh sách ở preview.
2. Sản phẩm: thêm theo cụm của [taxonomy](advertising-taxonomy.md), bỏ, đặt sản phẩm chính; cụm theo sản phẩm chính.
3. Khung card: chọn một trong 8 tỷ lệ 3:2, 2:3, 1:1, 4:3, 3:4, 4:5, 16:9, 2:1; đổi khung thì mọi media của card về
   vùng crop lớn nhất ở giữa với tỷ lệ mới.
4. Media: thêm từ thư viện hoặc upload, kéo thả thứ tự, gỡ, chọn ảnh bìa, alt VI và EN riêng từng media; bấm một media
   mở khung crop với tỷ lệ của khung card và dải mờ 5% đáy.

Tab Còn thiếu nêu: chưa có media, chưa chọn bìa, hai media trùng alt cùng ngôn ngữ, thiếu tên hoặc mô tả. Preview lưới
dựng lại sau mỗi thay đổi với catalog vá từ nháp; số đếm chip và thứ tự xếp sẵn của điện thoại chỉ đổi ở lần dựng thật.

```gherkin
Given card có hai ảnh cùng alt VI
When mở tab Còn thiếu
Then có dòng "Hai media trùng mô tả ảnh" nêu tên hai media; Lưu giữ card ở Nháp
```

### R7. Card công trình

Tab Card của một công trình: chọn khung card trong 8 tỷ lệ, rồi chọn từ 2 media trở lên trong danh sách media của
chính trang đó (không upload riêng cho card), kéo thả thứ tự, chọn ảnh bìa, crop từng media theo khung card. Alt lấy
từ media của trang, không sửa ở đây. Gỡ một media khỏi tab Media của bài khi card còn dùng thì tab đó ghi "Card đang
dùng media này" và lệnh lưu trả 409; người soạn bỏ nó khỏi card trước.

```gherkin
Given trang công trình có 6 media, card chưa có media nào
When chọn 1 media cho card rồi Lưu
Then bản ghi giữ Nháp, tab Còn thiếu ghi "Card công trình cần ít nhất 2 media"
```

### R8. Trạng thái xử lý

| Nhãn | Khi nào | Người soạn làm được gì |
| --- | --- | --- |
| Đang xử lý | Có biến thể `pending` | Dùng media bình thường; bản ghi dùng nó chờ biến thể xong mới lên staging |
| Sẵn sàng | Mọi biến thể đang dùng đã `ready` | Không cần làm gì |
| Lỗi | Có biến thể `error` | Bấm "Thử lại" (lệnh `retry-variant`); lỗi lặp lại thì nhãn ghi lý do và "Báo owner" |

Editor hỏi lại trạng thái bằng `media-list` hoặc `get` mỗi 20 giây, chỉ khi tab đang mở và còn media "Đang xử lý".
Lý do lỗi hiện bằng chữ: `timeout` là "Xử lý quá lâu", `size` là "Kích thước file không khớp, tải lại file".

```gherkin
Given một ảnh vừa upload đang "Đang xử lý"
When job biến thể xong và editor hỏi lại
Then nhãn thành "Sẵn sàng" mà không cần tải lại trang, preview bỏ chữ "bản xem trước" ở khung dùng ảnh đó
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| File | `src/admin/media/` (thư viện, hàng chờ upload, khung crop) | R1 tới R8 |
| Lệnh | `media-list`, `upload-media`, `update-media`, `media-file`, `trash`, `retry-variant` | [Dữ liệu CMS R7](cms-data.md#r7-bảng-lệnh-admin) |
| Data | Chỗ đặt `{ mediaId, crop }`; `legacySrc` | [Dữ liệu CMS R5](cms-data.md#r5-media-crop-và-biến-thể) |
| API trình duyệt | `createImageBitmap`, `HTMLVideoElement`, canvas `toBlob` | Đọc kích thước, chụp poster (R2, R3) |

## UI

Theo [editor](cms-editor.md#ui). Khung crop: nền tối 60% quanh khung, viền khung màu nhấn, lưới ba phần mờ khi đang
kéo; chip tỷ lệ và nút mốc là nút chữ; mọi thao tác chuột có phím tương đương (R4).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1, R8 | cần: e2e lọc, sửa alt nhiều chỗ dùng, 409 khi xóa media đang dùng, đổi nhãn khi biến thể xong |
| R2, R3 | cần: e2e hàng chờ với file sai loại, quá cỡ, 429; chụp poster cùng tỷ lệ video |
| R4, R5 | cần: đơn vị phép tính crop (phủ kín, đổi tỷ lệ giữ tâm, số nguyên trong ảnh); e2e vùng mờ từng mốc |
| R6, R7 | cần: e2e alt trùng, card công trình dưới 2 media, 409 khi gỡ media card đang dùng |

## Gate còn mở

- File MOV, HEIC và video trên 95 MB chưa nhận; cần đường upload chia phần, sau bản đầu.
- Safari trên iPhone tự đổi ảnh HEIC sang JPEG khi chọn từ thư viện ảnh (suy luận, chưa thử); editor chỉ hỗ trợ máy
  tính nên chưa kiểm.

## Chú thích thuật ngữ

- **Khung crop**: khung tỷ lệ cố định; phần ảnh nằm trong khung là phần hiện trên site.
- **Điểm giữ**: điểm trên ảnh luôn nằm trong khung khi khối phủ đổi tỷ lệ theo thiết bị.
- **Vùng an toàn**: phần ảnh không bị cắt ở mọi bề rộng màn hình.
- **Poster**: ảnh tĩnh hiện trước khi video phát.
- **Biến thể**: các bản ảnh, video đã đổi cỡ và định dạng để phát trên site.
- **Hàng chờ upload**: danh sách file đã chọn, gửi lần lượt.
- **Chip**: nút nhỏ chọn một giá trị trong vài giá trị.
- **Mốc**: một trong sáu bề rộng màn hình dùng để xem trước.
