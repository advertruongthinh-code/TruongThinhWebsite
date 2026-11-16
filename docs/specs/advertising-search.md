---
title: Tìm kiếm theo nghĩa cho sản phẩm quảng cáo
status: planned
source:
  - src/search/**
  - src/site/search/**
  - scripts/search/**
tests:
  - tests/search/keywords.test.mjs
  - tests/search/rank.test.mjs
  - tests/search/worker.test.mjs
  - tests/site/advertising-search.e2e.mjs
notion: https://app.notion.com/p/419332849a0e8118ba24ffb730cdecf5
updated: 2026-11-16
---

# Tìm kiếm theo nghĩa cho sản phẩm quảng cáo

## Mục đích

Khách trên trang Sản phẩm quảng cáo (VI, EN, mọi trang cụm và sản phẩm) tìm trong toàn bộ card bằng chữ và 1 đến 5 ảnh,
kể cả khi gõ không dấu, gõ sai hay quên bật bộ gõ. Kết quả hiện trên lưới masonry chính, xếp theo điểm. Site không lưu câu
tìm hay ảnh, trừ ảnh của link chia sẻ. Lưới thuộc [masonry R6](masonry-live-layout.md#r6-chế-độ-tìm-kiếm); spec này chỉ gọi
API của lưới. Tìm trong CMS và tính vector lúc CMS lưu card thuộc [CMS](cms.md), ghi ở Gate còn mở.

## Bản đồ module

| Module | Việc | Phụ thuộc |
| --- | --- | --- |
| `search-index` | Lúc deploy, đổi mọi card thành vector, ghi chỉ mục tĩnh | catalog Advertising |
| `search-keywords` | Lớp từ khóa, chạy ở trình duyệt | catalog Advertising |
| `search-worker` | `/api/search`: đổi câu, ảnh thành vector, trả điểm từng input | `search-index` |
| `search-rank` | Trình duyệt gộp điểm, ngưỡng, nhóm, dự phòng | `search-keywords`, `search-worker` |
| `search-bar` | Thanh tìm kiếm nổi, ghép vào CTA cuối lưới | `search-rank`, lưới R6 |
| `search-share` | Chữ trong `#`, ảnh lên R2 khi bấm Sao chép link | `search-bar` |

Thứ tự làm: tìm bằng chữ (index, keywords, worker, rank, bar), rồi tìm bằng ảnh, rồi link chia sẻ có ảnh.

## Hành vi

### R1. Chỉ mục vector lúc deploy

Workflow `Deploy demo` chạy `pnpm search:index` sau `prepare:site`, trước deploy. Script gọi Workers AI REST, model
`@cf/google/embeddinggemma-2`, 256 chiều. Mỗi card có một vector chữ: tiêu đề, mô tả, alt mọi media, tên sản phẩm, cụm, tag,
chữ VI và EN trong một input theo mẫu `title: ... | text: ...`. Mỗi media một vector: ảnh thu bằng `sharp` về cạnh dài 768 px
kèm alt của media; video lấy poster kèm alt. Mọi vector chuẩn hóa L2 rồi lượng tử int8 kèm hệ số `s` của từng vector, ghi
`.site-output/search/advertising-index.bin` và `advertising-index.json` (meta: model, dims, status, thứ tự id, số media mỗi
card). Mỗi lần gọi model thử lại tối đa 3 lần; vẫn lỗi hoặc thiếu token thì in cảnh báo rõ, ghi `status: "unavailable"`,
deploy vẫn chạy và tìm kiếm chỉ dùng lớp từ khóa (R6).

```gherkin
Given token có quyền Workers AI
When workflow Deploy demo chạy
Then chỉ mục có đúng một mục cho mọi card, mỗi media một vector 256 chiều có độ dài 1 trước lượng tử
And thiếu token thì log deploy có cảnh báo và chỉ mục ghi status unavailable
```

### R2. Lớp từ khóa

`cardTerms(card, locale)` lấy cụm từ trong tiêu đề, alt, tên sản phẩm, cụm, tag (không lấy mô tả, vì lưới không tải mô tả).
Chữ được chuẩn NFC và đặt dấu thanh theo một kiểu ("hoà" và "hòa" là một). Mỗi cụm giữ bản có dấu và bản bỏ dấu (bỏ dấu,
`đ` thành `d`). Bảng `src/search/synonyms.json` (VI, EN) nối cụm cùng nghĩa, ví dụ "bảng hiệu", "biển hiệu", "biển quảng cáo".
"Khớp" nghĩa là các từ của câu nằm liền nhau trong một cụm của card. K của card là mức cao nhất đạt được:

| Mức | K |
| --- | --- |
| Khớp bản có dấu | 1 |
| Khớp bản bỏ dấu, chỉ khi câu không có dấu nào | 0,85 |
| Khớp qua đồng nghĩa | 0,7 |
| Khớp khi cho một từ sai: từ đến 4 chữ cái sai 1, dài hơn sai đến 2 (khoảng cách sửa trên bản có dấu) | 0,6 |
| Ít nhất nửa số từ của câu (so bản bỏ dấu) có trong cụm từ của card | 0,4 |

Câu không dấu được thử thêm bản đổi từ Telex ("hoopj ddenf") và VNI ("ho65p d9e2n"); K lấy mức cao nhất trong các bản, nên chữ
tiếng Anh như "coffee" không bị đổi sai. Không dùng LLM.

```gherkin
Given card có tiêu đề "Hộp đèn tròn inox cho cà phê rang xay"
When khách gõ "hop den", "hoopj ddenf", "hộp đèm" hoặc "hộp đen"
Then K lần lượt là 0,85, 1, 0,6 và 0,6
```

### R3. Endpoint tìm kiếm

`POST /api/search` nhận JSON `{ text?, images? }`. Trình duyệt cắt `text` còn 300 ký tự trước khi gửi; mỗi ảnh là JPEG base64
cạnh dài tối đa 768 px, tối đa 300 KB, tối đa 5 ảnh; body quá 2,2 MB trả 413. Worker đổi câu (tiền tố
`task: search result | query:`) và mọi ảnh thành vector trong một lần gọi `env.AI.run` đồng bộ, chuẩn hóa L2, so cosine
với chỉ mục (đọc qua binding `ASSETS`, giải mã một lần mỗi isolate). Mỗi điểm được chuẩn hóa về 0 đến 1 theo cặp mốc của
đúng loại truy vấn và loại đích (chữ-chữ, chữ-ảnh, ảnh-chữ, ảnh-ảnh), kẹp trong 0 đến 1, rồi `sMedia` là trung bình 2 media
cao nhất của card (card một media lấy media đó). Phản hồi: mỗi input một mảng `[id, sText, sMedia]` cho mọi card. Sai dạng
trả 400; vượt giới hạn tần suất 429; model lỗi 503. Không có `mediaId`; thứ tự media trong card không đổi.

```gherkin
Given chỉ mục đã có
When trình duyệt gửi { text: "hộp đèn tay vẫy", images: [2 ảnh] }
Then phản hồi có 3 input, mỗi input đủ mọi card dạng [id, sText, sMedia], không có mediaId
```

### R4. Không lưu vết

Worker không ghi câu tìm, ảnh hay IP vào log, KV, D1 hay R2 (trừ R10); không `console.*` dữ liệu request; gọi `env.AI.run`
không kèm `gateway`, không dùng batch API bất đồng bộ; `wrangler.static.toml` ghi `[observability] enabled = false`. Ảnh
chỉ nằm trong bộ nhớ lúc xử lý. Ba binding rate limit, khóa là IP, đếm theo cửa sổ 60 giây, không chứa nội dung: chữ 30,
có ảnh 10, link chia sẻ 5 lần mỗi phút. IP chung của mạng di động có thể gây 429 giả; khi đó R6 vẫn cho kết quả từ khóa.
Trình duyệt giải mã ảnh bằng `createImageBitmap(blob, { imageOrientation: "from-image" })`, không xoay tay, vẽ lên canvas
nền trắng rồi xuất JPEG chất lượng 0,85, nên EXIF và GPS không rời máy khách.

```gherkin
Given khách tìm "biển văn phòng" kèm một ảnh có GPS
When request gửi đi
Then ảnh trong body là JPEG không có khối EXIF
And Worker không ghi gì về request vào log hay kho lưu trữ
```

### R5. Chấm điểm và gộp input

`rankSearch()` là hàm thuần không DOM. Điểm của card theo từng input:

| Input | Công thức |
| --- | --- |
| Chữ | 0,45 sText + 0,35 sMedia + 0,2 K |
| Ảnh | 0,3 sText + 0,7 sMedia |

1. Ngưỡng 0,42 áp cho điểm từng input; input không có card nào đạt bị bỏ và nêu trong dòng trạng thái.
2. Top 5 của input là 5 card điểm cao nhất của nó. Hai input nối nhau khi top 5 trùng từ 2 card; mỗi thành phần liên thông
   là một nhóm (cùng ý).
3. Điểm nhóm của card: phần ảnh là điểm cao nhất trong các ảnh của nhóm; có cả chữ thì = 0,3 điểm chữ (đã gồm K) + 0,7
   phần ảnh; nhóm chỉ có chữ lấy điểm chữ. Ngưỡng 0,42 áp lại; thứ tự nhóm theo điểm card cao nhất của nhóm.
4. Một nhóm: card đạt ngưỡng xếp theo điểm. Từ hai nhóm: card đạt ngưỡng ở từ 2 nhóm lên đầu, xếp theo điểm trung bình các
   nhóm đó; sau đó xen kẽ, mỗi lượt lấy card kế tiếp chưa đặt của từng nhóm theo thứ tự nhóm.
5. Hòa điểm: giữ thứ tự catalog. Tên nhóm: sản phẩm chính (`productIds[0]`) gặp nhiều nhất trong 5 card đầu của nhóm, hòa thì
   lấy sản phẩm của card đầu.
6. Dòng trạng thái có một nút cho mỗi nhóm; bấm thì `setResults` chỉ card của nhóm đó, card thuộc 2 nhóm có mặt ở cả hai.
   Một nhóm mà card đạt ngưỡng thuộc từ 3 sản phẩm chính trở lên (từ chung chung như "biển") thì dòng trạng thái gợi ý tối
   đa 4 sản phẩm nhiều card nhất để bấm lọc.
7. Câu 1 đến 2 ký tự chỉ dùng K, không gọi Worker. Có ảnh thì vector của câu chữ về cùng request với ảnh.

```gherkin
Given khách gửi ảnh xe bán hàng, ảnh biển văn phòng và chữ "quà tặng sinh nhật"
When chữ không có card nào đạt ngưỡng
Then lưới có card khớp cả hai ảnh trước, rồi card hai nhóm xen kẽ
And dòng trạng thái có 2 nút nhóm và dòng "Không tìm thấy theo chữ"
```

### R6. Chờ, dự phòng và lỗi

Gửi tìm thì gọi `setPending(true)`. Câu chữ: trình duyệt tính K ngay. Worker trả trong 0,8 giây thì `setResults` theo R5.
Quá 0,8 giây, lỗi, 429 hoặc chỉ mục `unavailable` mà có card K từ 0,4 thì `setResults` các card đó xếp theo K; điểm vector
về muộn thì `offerResults`. Không card nào có K từ 0,4 mà Worker còn đang chạy thì giữ `setPending(true)` tới khi điểm
vector về hoặc tới 3 giây, rồi theo R9. Có ảnh: chờ tới 3 giây, quá thì báo "Tìm bằng ảnh đang chậm" kèm nút thử lại.
Hết hạn mức hoặc mất mạng: chữ chạy bằng K, nút ảnh báo tạm nghỉ, không hiện lỗi kỹ thuật. Sửa chữ, thêm hoặc bỏ ảnh khi
đang tìm thì huỷ request cũ (`AbortController`), lần mới nhất thắng; bỏ bớt ảnh sau khi có kết quả thì tự tìm lại sau 0,4
giây. Bấm tìm khi chưa có chữ và ảnh thì chỉ đưa con trỏ vào ô chữ.

```gherkin
Given Worker trả sau 2 giây
When khách tìm "bảng hiệu"
Then sau 0,8 giây lưới hiện kết quả theo K
And khi điểm vector về, nút "Có thêm kết quả gợi ý" hiện, bấm mới xếp lại
```

### R7. Thanh tìm kiếm

Theo thiết kế owner duyệt ([bản thử, biến thể 1 Đường kẻ](https://claude.ai/artifact/9zKp1Fdq1t7VYSsvLtGSUi)). Một thanh
dài nổi ở đáy màn hình. Bên phải ô chữ: nút xoá chữ (chỉ hiện khi đã gõ), vạch ngăn, nút tìm bằng ảnh, nút kính lúp. Ảnh vào
bằng nút, kéo thả (lớp phủ "Thả ảnh vào đây để tìm") hoặc dán; khay ảnh có thumbnail, nút bỏ từng ảnh và "n/5 ảnh". Thanh
là phần tử `position: sticky; bottom` trong khe `[data-search-dock]` ngay dưới tiêu đề CTA; khe nằm trong phần tử cha chứa
cả lưới và CTA, nên thanh nổi suốt lưới rồi dừng ở khe. Tới khe thì viền tan thành đường kẻ dài dưới tiêu đề, chữ to hơn, nút
"Trao đổi ý tưởng" mở ra ở cuối đường kẻ (điện thoại: "Trao đổi"); ô chữ, khay ảnh vẫn dùng được. Rời khe thì phần mở thêm
thu lại ngay, không mờ dần; thanh luôn nền đặc. Thanh gắn xong thì ẩn link "Trao đổi ý tưởng" cũ của CTA; không có
JavaScript thì link cũ vẫn hiện. Enter tìm, Esc bỏ tìm; dòng trạng thái là vùng `aria-live`. Giảm chuyển động thì đổi trạng
thái ngay. Chữ trên thanh, thông báo và đồng nghĩa có bản EN.

```gherkin
Given trang /vi/advertising-products/ ở 384px
When khách cuộn tới CTA cuối lưới
Then thanh dừng dưới tiêu đề CTA, nút "Trao đổi" hiện ở cuối đường kẻ, ô chữ vẫn gõ được
And không có cuộn ngang ở 384, 768, 1024, 1280, 1440, 1920px
```

### R8. Ảnh khách đưa vào

Tối đa 5 ảnh; thả hơn 5 thì lấy 5 ảnh đầu và báo "Tối đa 5 ảnh". Ảnh trùng (cùng nội dung sau khi thu nhỏ) bị bỏ. PNG trong
suốt và GIF (khung đầu) được vẽ trên nền trắng; HEIC chỉ đọc được trên Safari. Trình duyệt không đọc được thì báo "Chưa đọc
được ảnh này, thử JPG hoặc PNG". File trên 25 MB, SVG, PDF bị từ chối kèm lý do; video báo "Chỉ tìm bằng ảnh".

```gherkin
Given khay đã có 4 ảnh
When khách thả thêm 3 ảnh
Then khay có 5 ảnh và thông báo "Tối đa 5 ảnh"
```

### R9. Không có kết quả, hỏi giá, nội thất

Không card nào đạt ngưỡng: lưới đang ở chế độ tìm (đã `setResults`, chưa nhận `masonry:search-left`) thì đặt cờ chặn rồi gọi
`clearResults()`; sự kiện `masonry:search-left` kế tiếp gặp cờ thì chỉ xoá cờ, ô chữ và khay ảnh giữ nguyên. Lưới đang duyệt
thì không gọi gì. Mỗi lần gửi tìm mới cũng xoá cờ. Dòng trạng thái hiện nút Zalo. Bấm
nút thì chép câu khách gõ vào clipboard, mở link Zalo lấy từ partial có sẵn của site, báo "Đã chép nội dung, dán vào khung
chat Zalo" (link Zalo không mang sẵn tin nhắn). Chỉ 1 đến 2 card đạt ngưỡng: thêm dòng "Chưa đúng ý? Gửi qua Zalo". Ảnh không
khớp: "Không tìm thấy theo ảnh n". Câu có từ hỏi giá (giá, bao nhiêu, báo giá, chi phí; EN price, cost, how much, quote) vẫn
hiện card, thêm dòng mời hỏi giá qua Zalo. Có ảnh mà câu chữ bị bỏ vì không khớp card (ví dụ "cái này làm được không") thì
thêm dòng mời gửi câu hỏi qua Zalo. Câu về nội thất (danh sách tĩnh, ví dụ tủ bếp, giường, sofa) mà không có card đạt ngưỡng
thì thêm link sang trang Công trình. Câu phủ định không được hiểu (giới hạn của model).

```gherkin
Given khách gõ "giá hộp đèn tay vẫy bao nhiêu"
When kết quả về
Then lưới hiện card hộp đèn tay vẫy và dòng trạng thái có lời mời hỏi giá qua Zalo
```

### R10. Câu tìm trong link và link chia sẻ

Phiên tìm (chữ, ảnh đã thu nhỏ) lưu trong `sessionStorage` của tab, không gửi lên máy chủ; đầy bộ nhớ
(`QuotaExceededError`) thì bỏ ảnh đã lưu và báo. Thanh địa chỉ không mang câu tìm, vì boot của `motion.js`, nút đổi ngôn ngữ
và lịch sử của lưới đều viết lại URL không có phần `#`. Tải lại, Back từ card, đổi ngôn ngữ (nút đổi đặt dấu trong phiên trước khi chuyển trang) thì đọc phiên, tìm lại,
gọi lại `setResults`; vào trang mới từ menu hay link thì không khôi phục. Link `#tim=<encodeURIComponent(chữ)>`: boot của `motion.js` chuyển phần `#` cho tìm kiếm trước khi
viết lại URL (sửa nhỏ ngoài `src/site/search/`), tìm kiếm ghi vào phiên rồi chạy. `masonry:search-left` không gặp cờ R9
(bấm chip, Back sang filter khác) thì xoá ô chữ, khay ảnh và phiên. Tìm luôn trên mọi card, không theo chip đang chọn.

Nút "Sao chép link" trong dòng trạng thái chép link trang kèm `#tim=`. Có ảnh thì `POST /api/search/share` gửi các ảnh đã
thu nhỏ (body quá 2,2 MB trả 413); Worker chỉ nhận JPEG (bắt đầu bằng `FF D8 FF`), cạnh dài tối đa 768 px, tối đa 300 KB mỗi ảnh, lưu R2 dưới mã
12 ký tự base62 từ `crypto.getRandomValues`; link thành `#tim=<chữ>&anh=<mã>.<số ảnh>`. `GET /api/search/share/<mã>/<n>` trả
ảnh với `Content-Type: image/jpeg`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`,
`Cache-Control: private`. R2 không lưu chữ, IP hay người tìm; luật vòng đời bucket xoá ảnh sau 30 ngày (Cloudflare xoá trong
khoảng 24 giờ sau mốc). Mã hết hạn thì link vẫn tìm theo chữ và báo ảnh đã hết hạn.

```gherkin
Given khách tìm "hộp đèn" kèm 2 ảnh rồi bấm Sao chép link
When người khác mở link đó trong ngày
Then trang tìm bằng "hộp đèn" và đúng 2 ảnh đó trên mọi card
And đổi ngôn ngữ rồi Back từ một card thì vẫn còn câu tìm, ảnh và kết quả
And sau 31 ngày mở lại thì chỉ tìm theo chữ, kèm thông báo ảnh đã hết hạn
```

### R11. Bộ câu thử và hiệu chỉnh

`pnpm search:calibrate` chạy `tests/search/fixtures/queries.json` trên chỉ mục thật: câu từ Keyword Planner, 15 câu trò
chuyện, 15 câu gõ sai và Telex, VNI, 10 bộ trộn input không liên quan, câu EN. Script ghi cặp mốc của 4 loại truy vấn-đích
và ngưỡng vào `src/search/score-config.json`; trọng số và ngưỡng chỉ đổi qua file này. Cổng: card đúng trong 5 card đầu từ
80% câu mỗi loại; P@5 chung không dưới 0,8. Câu nhắm video chưa vào cổng khi catalog chưa có video.

```gherkin
Given chỉ mục thật và bộ câu thử
When chạy pnpm search:calibrate
Then báo cáo nêu tỉ lệ top 5 theo từng loại câu và mọi loại từ 80%
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Command | `pnpm search:index`, `pnpm search:calibrate` | R1, R11; cần `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` có quyền Workers AI |
| Data | `.site-output/search/advertising-index.bin`, `.json` | Vector int8 và meta (R1), sinh lúc deploy |
| Data | `src/search/synonyms.json`, `src/search/score-config.json` | Đồng nghĩa; trọng số, 4 cặp mốc, ngưỡng |
| Hàm public | `cardTerms`, `keywordScores`, `decodeTelex`, `decodeVni` (`src/search/keywords.mjs`) | R2 |
| Hàm public | `rankSearch({ inputs, keyword, config, catalogOrder, productOf })`, `suggestProducts(group, productOf)`, `keywordOnly(keyword, catalogOrder, config)` (`src/search/rank.mjs`) | `{ ids, groups: [{ name, ids, inputIdx }], unmatched }` (R5); sản phẩm gợi ý; id card theo K (R6) |
| Endpoint | `POST /api/search` | R3; 400, 413, 429, 503 |
| Endpoint | `POST /api/search/share`, `GET /api/search/share/<mã>/<n>` | R10 |
| DOM hook | `[data-search-dock]` | Khe dưới tiêu đề CTA, thread masonry thêm |
| Hàm lưới | `setResults`, `setPending`, `clearResults`, `offerResults`; sự kiện `masonry:search-left` | [Masonry R6](masonry-live-layout.md#r6-chế-độ-tìm-kiếm) |
| Cấu hình | `wrangler.static.toml`: `main`, `run_worker_first = ["/api/*"]`, `AI`, `ASSETS`, 3 rate limit, R2 `SEARCH_SHARE`, observability tắt | [Decision](../decisions/advertising-search-worker.md) |

## UI

Thanh và CTA theo bản thử đã duyệt (link ở R7). Khi code xong, thêm component `SearchBar` vào
[Design System](../../design-system/README.md) và link ở đây.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có test (`tests/search/index.test.mjs`, Workers AI giả) |
| R2 | chưa có test (`tests/search/keywords.test.mjs`) |
| R3, R4 | chưa có test (`tests/search/worker.test.mjs`: dạng phản hồi, 400, 413, 429, không log) |
| R5, R6 | R5: `node --test tests/search/rank.test.mjs`; R6 chưa có test (`tests/site/advertising-search.e2e.mjs`) |
| R7 đến R10 | chưa có test (`tests/site/advertising-search.e2e.mjs`, Worker giả qua route Playwright, 6 bề rộng) |
| R11 | `pnpm search:calibrate` trên máy có token |

## Gate còn mở

- Toàn bộ R1 đến R11 chưa code; chờ owner duyệt spec rồi plan (advisor duyệt trước mỗi lần).
- Token `CLOUDFLARE_API_TOKEN` của workflow có quyền Workers AI và R2 chưa kiểm; thiếu thì owner thêm quyền.
- Binding rate limit trên gói Free: tài liệu Cloudflare chưa nói rõ; kiểm bằng deploy thử trước khi code R4.
- Bật R2 có thể đòi thẻ thanh toán dù nằm trong gói miễn phí (suy luận); kiểm trước khi làm R10, báo owner nếu cần.
- Khe `[data-search-dock]`, `event.detail.reason` cho `masonry:search-left` (thay cờ chặn R9) và chỗ boot `motion.js` chuyển
  phần `#` cho tìm kiếm: thread masonry duyệt.
- File Keyword Planner cho `synonyms.json` và bộ câu thử: owner gửi; không có thì agent viết, owner duyệt.
- Tìm trong CMS (thấy cả card nháp, sau Cloudflare Access) và tính vector khi CMS lưu card: thread CMS, sau slice CMS đầu.
- Video thật: đo lại poster kèm alt và đưa câu video vào cổng R11 khi catalog có card video.

## Chú thích thuật ngữ

- **Vector, embedding**: dãy số model sinh ra để so độ giống nghĩa giữa chữ, ảnh; **cosine** đo độ giống, từ -1 đến 1.
- **Chuẩn hóa L2**: chia vector cho độ dài của nó để độ dài bằng 1.
- **Lượng tử int8**: lưu mỗi số bằng một byte kèm hệ số tỉ lệ, file nhỏ hơn 4 lần.
- **Chỉ mục**: file chứa vector của mọi card. **K**: điểm lớp từ khóa của card.
- **Cùng ý**: hai input có 5 card đầu trùng nhau từ 2 card.
- **P@5**: tỉ lệ card đúng trong 5 card đầu.
- **Telex, VNI**: hai kiểu gõ tiếng Việt bằng phím chữ hoặc số khi chưa bật bộ gõ.
- **Rate limit**: giới hạn số request trong một khoảng thời gian. **R2**: kho file của Cloudflare.
- **Isolate**: một phiên chạy của Worker, giữ biến trong bộ nhớ giữa các request.
