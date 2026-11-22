---
title: Tìm kiếm theo nghĩa cho sản phẩm quảng cáo
status: planned
source:
  - src/search/**
  - src/site/search/**
  - scripts/search/**
  - tests/search/**
tests:
  - tests/search/keywords.test.mjs
  - tests/search/rank.test.mjs
  - tests/search/worker.test.mjs
  - tests/search/calibrate.test.mjs
  - tests/site/advertising-search.e2e.mjs
notion: https://app.notion.com/p/419332849a0e8118ba24ffb730cdecf5
updated: 2026-11-22
---

# Tìm kiếm theo nghĩa cho sản phẩm quảng cáo

## Mục đích

Khách trên trang Sản phẩm quảng cáo (VI, EN, mọi trang cụm và sản phẩm) tìm trong toàn bộ card bằng chữ và 1 ảnh (owner 2026-11-21),
kể cả khi gõ không dấu, gõ sai hay quên bật bộ gõ. Kết quả hiện trên lưới masonry chính, xếp theo điểm. Site không lưu câu
tìm hay ảnh, trừ ảnh của link chia sẻ. Lưới thuộc [masonry R6](masonry-live-layout.md#r6-chế-độ-tìm-kiếm); spec này chỉ gọi
API của lưới. Bản đầu CMS không tính vector lúc lưu; `pnpm search:index` ở mỗi lần dựng là nơi duy nhất tính vector, chỉ từ nội dung `published` ([CMS R9](cms-content.md#r9-tìm-kiếm-ngữ-nghĩa)). Tìm bản ghi nháp trong CMS để sau bản đầu ([CMS](cms.md#bối-cảnh-và-phương-án)).

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

Workflow `Deploy demo` (cả staging và bản thật) chạy `pnpm search:index` sau `prepare:site`, trước deploy. Script gọi Workers AI REST, model
`@cf/google/embeddinggemma-2`, 256 chiều. Mỗi card có một vector chữ: tiêu đề, mô tả, alt mọi media, tên sản phẩm, tag (không lấy tên cụm),
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

`cardTerms` lấy cụm từ trong tiêu đề, alt, tên sản phẩm, tag; card gộp nhiều media lấy thêm tiêu đề và sản phẩm riêng của từng media (không lấy mô tả, vì lưới không tải mô tả; không lấy tên cụm vì một cụm gộp 3 sản phẩm); cụm là đoạn cắt ở dấu phẩy, `&`, gạch, ngoặc;
nhãn tag chỉ lấy nhóm `product`, `variant`, `use`. Chữ được chuẩn NFC và đặt dấu thanh theo một kiểu ("hoà" và "hòa" là một). Mỗi cụm giữ bản có dấu và bản bỏ dấu
(`đ` thành `d`). Bảng `src/search/synonyms.json` (VI, EN) nối cụm cùng nghĩa, ví dụ "bảng hiệu", "biển hiệu", "biển quảng cáo"; "kiosk" cùng nhóm "gian hàng" (owner 2026-11-18: gõ "kios" phải ra gian hàng hội chợ); mỗi lần đổi đúng một thành viên, so bản bỏ dấu. Thành viên gõ sai một từ ("kios") vẫn được đổi, K ở mức 0,6.
"Khớp" nghĩa là các từ của câu nằm liền nhau trong một cụm của card; từ gõ có dấu so bản có dấu, từ gõ không dấu so bản bỏ dấu, nên "hộp den" vẫn khớp. Câu được thử thêm bản bỏ từ đệm (`src/search/stopwords.json`: "làm", "cho", "mẫu", "giá rẻ", "quảng cáo"...) khi cả câu không khớp card nào từ mức 0,85; từ đệm gõ không dấu mà cũng là từ khác của catalog ("cua": của, cửa) chỉ bỏ khi còn lại từ 2 từ; câu chỉ có từ đệm không khớp gì. K của card là mức cao nhất đạt được (rà soát 2026-11-18):

| Mức | K |
| --- | --- |
| Khớp bản có dấu | 1 |
| Khớp khi có từ gõ không dấu | 0,85 |
| Khớp qua đồng nghĩa | 0,7 |
| Mọi từ của câu (từ 2 từ, sau khi bỏ từ đệm) có trong card, không cần liền nhau ("hộp đèn inox") | 0,7 |
| Khớp khi cho một từ sai: cùng chữ cái đầu, sai 1, sai 2 chỉ khi cả hai từ từ 7 chữ cái (khoảng cách sửa trên bản có dấu) | 0,6 |
| Ít nhất nửa số từ của câu (so bản bỏ dấu) có trong cụm từ của card | 0,4 |

Mức 0,6 chỉ xét từ từ 3 chữ cái trở lên, khoảng cách Levenshtein (đảo hai chữ cái tính 2), và bỏ qua từ đã có trong catalog trừ khi chỉ khác dấu ("quang" là "quảng", không phải "bảng" sai; "hộp đen" vẫn là "hộp đèn" sai dấu). Câu không dấu được thử thêm bản đổi từ Telex ("hoopj ddenf") và VNI
("ho65p d9e2n"); K lấy mức cao nhất trong các bản, nên chữ tiếng Anh như "coffee" không bị đổi sai; bản Telex, VNI không xét mức 0,6. Không dùng LLM. Tên nhóm dịch vụ (`src/search/groups.json`, ví dụ "in ấn") gõ riêng hoặc kèm từ đệm cho cả nhóm K 0,85; kèm từ khác ("in ấn menu") chỉ cho card trong nhóm khớp các từ còn lại, ở mức của chúng (owner 2026-11-18).

```gherkin
Given card có tiêu đề "Hộp đèn tròn inox cho cà phê rang xay"
When khách gõ "hop den", "hoopj ddenf", "hộp đèm" hoặc "hộp đen"
Then K lần lượt là 0,85, 1, 0,6 và 0,6
```

### R3. Endpoint tìm kiếm

`POST /api/search` nhận JSON `{ text?, images? }`. Trình duyệt cắt `text` còn 300 ký tự trước khi gửi; mỗi ảnh là JPEG base64
cạnh dài tối đa 768 px, tối đa 300 KB, tối đa 1 ảnh; body quá 450 KB trả 413. Worker đổi câu (tiền tố
`task: search result | query:`) và ảnh thành vector bằng `env.AI.run` đồng bộ: chữ qua `input` (qua `messages` P@5 tụt 0,86
xuống 0,66), mọi ảnh một lần qua `messages`, có cả hai thì gọi song song; chuẩn hóa L2, so cosine với chỉ mục (đọc qua binding `ASSETS`, giải mã một lần mỗi isolate). Mỗi điểm được chuẩn hóa về 0 đến 1 theo cặp mốc của
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
chỉ nằm trong bộ nhớ lúc xử lý. Vector của câu chữ được giữ trong bộ nhớ isolate 5 phút (tối đa 500 câu), khóa là SHA-256
của câu, không giữ chữ, để câu lặp lại ra cùng kết quả (owner chọn 2026-11-18); ảnh không giữ. Ba binding rate limit, khóa là IP, đếm theo cửa sổ 60 giây, không chứa nội dung: chữ 30,
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

1. Ngưỡng (`threshold` trong config, hiệu chỉnh R11) áp cho điểm từng input; input không có card nào đạt bị bỏ. Chỉ có chữ (input chữ, nhóm chỉ có chữ) và có card K từ `keywordMin` thì card còn phải đạt `textRelativeMin` (0,8) lần điểm card cao nhất, để bỏ đuôi vector lỏng; câu mô tả nhu cầu không khớp từ khóa giữ ngưỡng thường (rà soát 2026-11-18: độ chính xác 0,76 lên 0,89, độ phủ 0,84 xuống 0,82 trên 157 câu). Có input chữ thì card có K từ `keywordMin` luôn đạt (xếp theo điểm, thường ở cuối): chỉ 0,2 K thì card khớp chữ rơi dưới ngưỡng khi vector trượt, kết quả vector về sau xóa mất card mà lớp từ khóa đã hiện.
2. Top 5 của input là 5 card điểm cao nhất của nó. Hai input nối nhau khi top 5 trùng từ 2 card; mỗi thành phần liên thông
   là một nhóm (cùng ý).
3. Điểm nhóm của card: phần ảnh là điểm cao nhất trong các ảnh của nhóm; có cả chữ thì = 0,3 điểm chữ (đã gồm K) + 0,7
   phần ảnh; nhóm chỉ có chữ lấy điểm chữ. Ngưỡng áp lại; thứ tự nhóm theo điểm card cao nhất của nhóm.
4. Một nhóm: card đạt ngưỡng xếp theo điểm. Từ hai nhóm: card đạt ngưỡng ở từ 2 nhóm lên đầu, xếp theo điểm trung bình các
   nhóm đó; sau đó xen kẽ, mỗi lượt lấy card kế tiếp chưa đặt của từng nhóm theo thứ tự nhóm.
5. Hòa điểm: giữ thứ tự catalog. Tên nhóm: sản phẩm chính (`productIds[0]`) gặp nhiều nhất trong 5 card đầu của nhóm, hòa thì
   lấy sản phẩm của card đầu.
6. Không có dòng trạng thái, nút nhóm hay gợi ý sản phẩm (owner bỏ khung kết quả, 2026-11-17): lưới chỉ hiện card theo
   thứ tự trên.
7. Câu 1 đến 2 ký tự chỉ dùng K, không gọi Worker. Có ảnh thì vector của câu chữ về cùng request với ảnh.

```gherkin
Given khách gửi ảnh xe bán hàng, ảnh biển văn phòng và chữ "quà tặng sinh nhật"
When chữ không có card nào đạt ngưỡng
Then lưới có card khớp cả hai ảnh trước, rồi card hai nhóm xen kẽ
```

### R6. Chờ, dự phòng và lỗi

Gửi tìm thì gọi `setPending(true)`. Câu chữ: trình duyệt tính K ngay. Worker trả trong 0,8 giây thì `setResults` theo R5.
Quá 0,8 giây, lỗi, 429 hoặc chỉ mục `unavailable` mà có card K từ `keywordMin` (0,6) thì `setResults` các card đó xếp theo K; điểm vector về muộn mà khách chưa cuộn, chạm hay bấm phím từ lúc đó thì `setResults` luôn kết quả R5 (cùng câu ra cùng lưới dù mạng nhanh hay chậm, rà soát 2026-11-18); khách đã thao tác thì `offerResults`. Không card nào có K từ `keywordMin` mà Worker còn đang chạy thì giữ `setPending(true)` tới khi điểm
vector về hoặc tới 3 giây, rồi theo R9. Có ảnh: chờ tới 3 giây, quá thì báo "Tìm bằng ảnh đang chậm" kèm nút thử lại.
Hết hạn mức hoặc mất mạng: chữ chạy bằng K, thanh báo tạm nghỉ ([Thanh tìm kiếm R3](search-bar.md#r3-chữ-gợi-ý-ảnh-và-thông-báo)), không hiện lỗi kỹ thuật. Sửa chữ, thêm hoặc bỏ ảnh khi
đang tìm thì huỷ request cũ (`AbortController`), lần mới nhất thắng; bỏ bớt ảnh sau khi có kết quả thì tự tìm lại sau 0,4
giây. Bấm tìm khi chưa có chữ và ảnh thì chỉ đưa con trỏ vào ô chữ.

```gherkin
Given Worker trả sau 2 giây
When khách tìm "bảng hiệu"
Then sau 0,8 giây lưới hiện kết quả theo K
And khi điểm vector về mà khách chưa thao tác, lưới đổi sang kết quả R5
And khách đã cuộn thì nút "Có thêm kết quả gợi ý" hiện, bấm mới xếp lại
```

### R7. Thanh tìm kiếm

Giao diện, chỗ đứng, chuyển động và audit của thanh theo spec con [Thanh tìm kiếm](search-bar.md) (owner duyệt mock 2026-11-22): một khối trắng ở khe đầu trang,
nổi ở đáy và khe CTA; hàng chip lọc trong kết quả khi nổi; một ảnh; chữ gợi ý; link CTA dưới thanh ở tâm thị giác.

### R8. Ảnh khách đưa vào

Mỗi lần tìm 1 ảnh (owner 2026-11-21). Thả hoặc dán nhiều ảnh thì lấy ảnh đầu; đưa ảnh mới thì thay ảnh đang có. PNG trong
suốt và GIF (khung đầu) được vẽ trên nền trắng; HEIC chỉ đọc được trên Safari. Trình duyệt không đọc được thì báo "Chưa đọc
được ảnh này, thử JPG hoặc PNG". File trên 25 MB, SVG, PDF bị từ chối kèm lý do; video báo "Chỉ tìm bằng ảnh". Các thông báo này trượt vào chỗ chữ trong ô, tự tắt sau 4 giây
([Thanh tìm kiếm R3](search-bar.md#r3-chữ-gợi-ý-ảnh-và-thông-báo)).

```gherkin
Given thanh đã có 1 ảnh
When khách thả thêm 3 ảnh
Then thanh chỉ còn ảnh đầu trong 3 ảnh vừa thả và tìm lại theo ảnh đó
```

### R9. Không có kết quả

Không card nào đạt ngưỡng: lưới đang ở chế độ tìm (đã `setResults`, chưa nhận `masonry:search-left`) thì gọi `clearResults()`; sự kiện `masonry:search-left` của nó có `reason: "clear"` nên
bị bỏ qua, ô chữ và khay ảnh giữ nguyên. Lưới đang duyệt thì không gọi gì. Thanh hiện "Chưa thấy mẫu phù hợp" ở chỗ chữ trong ô ([Thanh tìm kiếm R3](search-bar.md#r3-chữ-gợi-ý-ảnh-và-thông-báo)), tự tắt sau 4 giây (owner 2026-11-18; không nút Zalo, lời mời hỏi giá hay link Công trình); khách liên hệ qua "Trao đổi ý tưởng" ở CTA. Câu phủ định không được hiểu (giới hạn của model).

```gherkin
Given khách gõ "xqzw vbnk" và không card nào đạt ngưỡng
When kết quả về
Then lưới về trạng thái duyệt, ô chữ giữ câu đã gõ, thanh hiện "Chưa thấy mẫu phù hợp" rồi tắt sau 4 giây
```

### R10. Câu tìm trong link và link chia sẻ

Phiên tìm (chữ, ảnh đã thu nhỏ) lưu trong `sessionStorage` của tab, không gửi lên máy chủ; đầy bộ nhớ (`QuotaExceededError`) thì bỏ ảnh đã lưu, chỉ giữ chữ. Tìm có chữ thì thanh địa chỉ ghi
`#q=<encodeURIComponent(chữ)>` bằng `history.replaceState` giữ nguyên state của lưới (owner 2026-11-18), bỏ tìm thì xoá; ảnh chưa vào link (chờ P8). Tải lại, Back từ card, đổi ngôn ngữ (nút
đổi đặt dấu trong phiên trước khi chuyển trang) thì đọc phiên, tìm lại, gọi lại `setResults`; vào trang mới từ menu hay link thì không khôi phục. Link `#q=` (link `#tim=` cũ vẫn mở được):
script đầu trang (`head-inline.js`) lưu phần `#` vào phiên trước khi `motion.js` viết lại URL, tìm kiếm ghi vào phiên rồi chạy. `masonry:search-left` có `reason` khác `"clear"` (navbar,
breadcrumb, Back sang filter khác) thì xoá ô chữ, khay ảnh và phiên. Tìm luôn trên mọi card; lúc bắt đầu tìm rail chọn "Tất cả". Trong lúc tìm, nhóm và chip không có kết quả nào ẩn đi, số
trên chip là số kết quả; các mục còn lại trượt về chỗ mới, mục hiện lại thì hiện dần (owner 2026-11-18). Bấm một nhóm hoặc chip thì lưới chỉ còn kết quả thuộc mục đó, câu tìm giữ nguyên, URL
và lịch sử duyệt không đổi; bấm "Tất cả" thì về đủ kết quả.

Chưa có nút "Sao chép link": khung trạng thái chứa nút này đã bị bỏ (owner 2026-11-17); chỗ đặt nút chờ owner. Khi có nút, nó chép link trang kèm `#q=`. Có ảnh thì `POST /api/search/share` gửi ảnh đã
thu nhỏ (body quá 450 KB trả 413); Worker chỉ nhận JPEG (bắt đầu bằng `FF D8 FF`), cạnh dài tối đa 768 px, tối đa 300 KB mỗi ảnh, lưu R2 dưới mã
12 ký tự base62 từ `crypto.getRandomValues`; link thành `#q=<chữ>&anh=<mã>.<số ảnh>`. `GET /api/search/share/<mã>/<n>` trả
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
80% câu mỗi loại; P@5 chung không dưới 0,8 và không thấp hơn config đang chạy (2026-11-21: config mới đạt cổng
nhưng kém config cũ thì không ghi). Câu nhắm video chưa vào cổng khi catalog chưa có video.

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
| Data | `src/search/synonyms.json`, `src/search/stopwords.json`, `src/search/groups.json`, `src/search/score-config.json` | Đồng nghĩa; từ đệm; tên nhóm dịch vụ; trọng số, 4 cặp mốc, ngưỡng, `textRelativeMin` |
| Hàm public | `cardTerms(card, artifact, locale)`, `keywordScores(query, locale, artifact)`, `decodeTelex(word)`, `decodeVni(word)`, `canonical`, `plain`, `modelQuery(query, locale, artifact)` (chữ gửi model: Telex/VNI đổi sang từ catalog có dấu) (`src/search/keywords.mjs`) | R2; `keywordScores` trả `Map<id, K>` chỉ gồm card có K từ 0,4 |
| Hàm public | `rankSearch({ inputs, keyword, config, catalogOrder, productOf })`, `suggestProducts(group, productOf)`, `keywordOnly(keyword, catalogOrder, config)` (`src/search/rank.mjs`) | `{ ids, groups: [{ name, ids, inputIdx }], unmatched }` (R5); sản phẩm gợi ý; id card theo K (R6) |
| Endpoint | `POST /api/search` | R3; 400, 413, 429, 503 |
| Endpoint | `POST /api/search/share`, `GET /api/search/share/<mã>/<n>` | R10 |
| DOM hook | `[data-search-dock]` | Khe dưới tiêu đề CTA, thread masonry thêm |
| Hàm lưới | `setResults`, `setPending`, `clearResults`, `offerResults`; sự kiện `masonry:search-left` | [Masonry R6](masonry-live-layout.md#r6-chế-độ-tìm-kiếm) |
| Cấu hình | `wrangler.static.toml`: `main`, `run_worker_first = ["/api/*"]`, `AI`, `ASSETS`, 3 rate limit, R2 `SEARCH_SHARE`, observability tắt | R3, R10 |

## UI

Thanh và CTA theo mock owner duyệt 2026-11-22 (link ở R7), audit theo [Thanh tìm kiếm R6](search-bar.md#r6-audit-so-với-mock); component [SearchBar](../../design-system/components/SearchBar/README.md).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có test (`tests/search/index.test.mjs`, Workers AI giả) |
| R2 | `node --test tests/search/keywords.test.mjs` |
| R3, R4 | `node --test tests/search/worker.test.mjs` (dạng phản hồi, số lần gọi model, 400, 413, 429, 503, không log); CPU p99 xem Metrics trên Cloudflare sau deploy |
| R5, R6 | R5: `node --test tests/search/rank.test.mjs`; R6: `node tests/site/advertising-search.e2e.mjs` (Worker giả qua route Playwright) |
| R7, R9, R10 (chữ) | `node tests/site/advertising-search.e2e.mjs`: khe đầu trang, nổi, khe CTA (vị trí, chữ 16px) ở 1440 và 384px, cùng một khối ở ba chỗ, bề rộng 560 và 760px, hàng chip lọc trong kết quả, khoảng trống CTA bằng nhau, link CTA dưới thanh, chữ gợi ý đổi, phím di con trỏ không cuộn trang, không cuộn ngang ở 6 bề rộng, dòng "Chưa thấy mẫu phù hợp", `#q=` và `#tim=`, đổi ngôn ngữ, Esc, rail lọc trong kết quả, chuyển trang mềm |
| R8, R4 (ảnh ở trình duyệt), R6 (ảnh chậm) | `node tests/site/advertising-search.e2e.mjs`: 1 ảnh (ảnh mới thay ảnh cũ, thumbnail ở chỗ nút ảnh, thanh không cao thêm), không còn khối EXIF trong body, SVG và video bị từ chối, dán ảnh, bỏ ảnh thì tìm lại, chờ 3 giây rồi Thử lại |
| R10 (ảnh) | chưa có test (P8) |
| R11 | `node --test tests/search/calibrate.test.mjs`; `pnpm search:calibrate` trên máy có token. `expect`: id sản phẩm hoặc card; bộ trộn có đích riêng mỗi input, đạt khi mọi input vào top 5; thêm loại `image` (crop mỗi sản phẩm) |

## Gate còn mở

- Chưa code: ảnh trong R10 (link chia sẻ).
- Token `CLOUDFLARE_API_TOKEN` của workflow có quyền Workers AI và R2 chưa kiểm; thiếu thì owner thêm quyền.
- Binding rate limit trên gói Free: tài liệu Cloudflare chưa nói rõ; kiểm bằng deploy thử trước khi code R4.
- Bật R2 có thể đòi thẻ thanh toán dù nằm trong gói miễn phí (suy luận); kiểm trước khi làm R10, báo owner nếu cần.
- File Keyword Planner cho `synonyms.json` và bộ câu thử: owner gửi; không có thì agent viết, owner duyệt.
- Tính vector lúc CMS lưu card và tìm bản ghi nháp trong CMS (sau Cloudflare Access): sau bản đầu CMS (owner 2026-11-22).
- Video thật: đo lại poster kèm alt và đưa câu video vào cổng R11 khi catalog có card video.
- Audit ([Thanh tìm kiếm R6](search-bar.md#r6-audit-so-với-mock)) chạy sau khi code; owner xem trang so sánh trước khi merge.

## Chú thích thuật ngữ

- **Vector, embedding**: dãy số model sinh ra để so độ giống nghĩa giữa chữ, ảnh; **cosine** đo độ giống, từ -1 đến 1.
- **Chuẩn hóa L2**: chia vector cho độ dài của nó để độ dài bằng 1.
- **Lượng tử int8**: lưu mỗi số bằng một byte kèm hệ số tỉ lệ, file nhỏ hơn 4 lần.
- **Chỉ mục**: file chứa vector của mọi card. **K**: điểm lớp từ khóa của card.
- **Cùng ý**: hai input có 5 card đầu trùng nhau từ 2 card. **P@5**: tỉ lệ card đúng trong 5 card đầu.
- **Telex, VNI**: hai kiểu gõ tiếng Việt bằng phím chữ hoặc số khi chưa bật bộ gõ.
- **Rate limit**: giới hạn số request trong một khoảng thời gian. **R2**: kho file của Cloudflare.
- **Isolate**: một phiên chạy của Worker, giữ biến trong bộ nhớ giữa các request.
