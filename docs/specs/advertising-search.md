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

Khách trên trang Sản phẩm quảng cáo (VI, EN) tìm card bằng chữ và bằng 1 đến 5 ảnh, kể cả khi gõ không dấu, gõ sai
hay quên bật bộ gõ. Kết quả hiện trên lưới masonry chính, xếp theo điểm. Site không lưu câu tìm hay ảnh của khách,
trừ ảnh của link chia sẻ khi khách bấm Sao chép link. Lưới thuộc [masonry xếp trực tiếp R6](masonry-live-layout.md#r6-chế-độ-tìm-kiếm);
spec này chỉ gọi API của lưới. Tìm trong CMS và tính vector lúc CMS lưu card thuộc [CMS](cms.md), ghi ở Gate còn mở.

## Bản đồ module

| Module | Việc | Phụ thuộc |
| --- | --- | --- |
| `search-index` | Lúc deploy, đổi mọi card thành vector, ghi file chỉ mục tĩnh | catalog Advertising |
| `search-keywords` | Lớp từ khóa có dấu và không dấu, đồng nghĩa, sửa lỗi gõ, Telex và VNI; chạy cả ở trình duyệt và Worker | catalog Advertising |
| `search-worker` | Endpoint `/api/search`: đổi câu, ảnh thành vector, so với chỉ mục, trả điểm từng input | `search-index` |
| `search-rank` | Trình duyệt gộp điểm, ngưỡng, nhóm khác ý, kết quả từ khóa dự phòng | `search-keywords`, `search-worker` |
| `search-bar` | Thanh tìm kiếm nổi ở đáy màn hình, ghép vào CTA cuối lưới | `search-rank`, lưới R6 |
| `search-share` | Link chia sẻ: chữ trong `#`, ảnh lên R2 khi bấm Sao chép link | `search-bar` |

Thứ tự làm: tìm bằng chữ (index, keywords, worker, rank, bar), rồi tìm bằng ảnh, rồi link chia sẻ có ảnh.

## Hành vi

### R1. Chỉ mục vector lúc deploy

Workflow `Deploy demo` chạy `pnpm search:index` sau `prepare:site` và trước khi deploy. Script gọi Workers AI REST với model
`@cf/google/embeddinggemma-2`, 256 chiều, và ghi `.site-output/search/advertising-index.json`. Mỗi card có một vector chữ
(tiêu đề, alt mọi media, tên sản phẩm, cụm, tag; chữ VI và EN trong cùng một input, theo mẫu `title: ... | text: ...` của
trang model) và mỗi media một vector (ảnh thu về cạnh dài 768 px, kèm alt của media đó). Media video lấy poster kèm alt.
Vector lưu dạng int8 kèm hệ số tỉ lệ của từng vector. Gọi model lỗi thì deploy vẫn chạy và ghi chỉ mục rỗng có
`status: "unavailable"`; khi đó tìm kiếm chỉ dùng lớp từ khóa (R6).

```gherkin
Given catalog có 203 card và token Cloudflare có quyền Workers AI
When workflow Deploy demo chạy
Then .site-output/search/advertising-index.json có đúng một mục cho mỗi card, mỗi media một vector 256 chiều
And chạy lại không đổi catalog cho ra cùng danh sách id và cùng số vector
```

### R2. Lớp từ khóa

Từ mỗi card, `cardTerms(card, locale)` lấy cụm từ trong tiêu đề, alt, tên sản phẩm, cụm và tag, giữ cả bản có dấu và bản
bỏ dấu (bỏ dấu và đổi `đ` thành `d`). Bảng đồng nghĩa `src/search/synonyms.json` (VI và EN, lấy từ dữ liệu Keyword Planner)
nối các cụm cùng nghĩa, ví dụ "bảng hiệu", "biển hiệu", "biển quảng cáo". Không có ô từ khóa riêng trong CMS.

Điểm từ khóa K của card là mức khớp tốt nhất giữa câu khách gõ và cụm từ của card:

| Mức | K |
| --- | --- |
| Trùng đúng bản có dấu | 1 |
| Chỉ trùng bản bỏ dấu | 0,85 |
| Trùng qua đồng nghĩa | 0,7 |
| Gần đúng: từ đến 4 chữ cái sai 1, từ dài hơn sai đến 2 (khoảng cách sửa) | 0,6 |
| Trùng một phần: ít nhất nửa số từ của câu có trong card | 0,4 |

Từ không dấu có dạng Telex ("hoopj ddenf") hoặc VNI ("ho65p d9e2n") được đổi về tiếng Việt trước khi so. Không dùng LLM
để sửa lỗi.

```gherkin
Given card có tiêu đề "Hộp đèn tròn inox cho cà phê rang xay"
When khách gõ "hop den", "hoopj ddenf" hoặc "hộp đèm"
Then K của card lần lượt là 0,85, 1 và 0,6
And khách gõ "hộp đen" thì K không bằng 1, vì bản có dấu khác
```

### R3. Endpoint tìm kiếm

`POST /api/search` nhận JSON `{ text?, images?, locale }`: `text` tối đa 300 ký tự, `images` tối đa 5 ảnh JPEG base64, mỗi ảnh
tối đa 1,5 MB. Worker đổi câu (tiền tố `task: search result | query:`) và từng ảnh thành vector, so cosine với chỉ mục, chuẩn
hóa về 0 đến 1 theo cặp mốc riêng cho chữ, ảnh và video (đo trên bộ câu thử, R11), rồi trả về mỗi input một danh sách
`[id, sText, sMedia]` cho mọi card. `sMedia` là trung bình 2 media khớp nhất của card (card một media lấy media đó).
Request sai dạng trả 400; vượt giới hạn tần suất trả 429; model lỗi trả 503. Worker không trả `mediaId` và không đổi thứ tự
media trong card.

```gherkin
Given chỉ mục đã có
When trình duyệt gửi { text: "hộp đèn tay vẫy", images: [2 ảnh], locale: "vi" }
Then Worker trả 3 input, mỗi input đủ 203 dòng [id, sText, sMedia]
And không có trường mediaId trong phản hồi
```

### R4. Không lưu vết

Worker không ghi câu tìm, ảnh hay IP vào log, KV, D1 hay R2 (trừ R10); không bật log hay cache của AI Gateway; Workers
Logs tắt. Ảnh khách gửi chỉ nằm trong bộ nhớ lúc xử lý. Giới hạn tần suất dùng binding rate limit của Cloudflare: bộ đếm theo
từng vị trí, khóa là IP, chỉ sống trong cửa sổ 60 giây, không chứa nội dung request; 30 lần mỗi phút mỗi IP cho chữ, 10 lần cho request có ảnh. Trình duyệt thu ảnh về cạnh dài 768 px,
xoay theo EXIF, vẽ lại qua canvas thành JPEG nền trắng, nên EXIF và GPS không rời máy khách.

```gherkin
Given Worker đang chạy
When khách tìm "biển văn phòng" kèm một ảnh có GPS
Then ảnh gửi lên là JPEG không có khối EXIF
And log của Worker không chứa câu tìm hay dữ liệu ảnh
```

### R5. Chấm điểm và gộp input

Trình duyệt gộp điểm bằng `rankSearch()`, hàm thuần không DOM. Điểm của card theo từng input:

| Input | Công thức |
| --- | --- |
| Chữ | 0,45 sText + 0,35 sMedia + 0,2 K |
| Một ảnh | 0,3 sText + 0,7 sMedia |

Input không có card nào đạt ngưỡng 0,42 bị bỏ và được nêu trong dòng trạng thái. Hai input "cùng ý" khi 5 card đầu của
chúng trùng nhau từ 2 card. Các input cùng ý gộp thành một nhóm: điểm ảnh của nhóm là điểm cao nhất trong các ảnh; có chữ
thì điểm nhóm = 0,3 điểm chữ + 0,7 điểm ảnh. Một nhóm: card đạt ngưỡng xếp theo điểm. Từ hai nhóm: card đạt ngưỡng ở từ
2 nhóm lên đầu, xếp theo điểm trung bình; sau đó card còn lại của các nhóm xếp xen kẽ, mỗi lượt một card theo thứ tự điểm
trong nhóm. Tên nhóm là tên sản phẩm xuất hiện nhiều nhất trong 5 card đầu của nhóm. Câu 1 đến 2 ký tự chỉ dùng K.

```gherkin
Given khách gửi ảnh xe bán hàng, ảnh biển văn phòng và chữ "quà tặng sinh nhật"
When chữ không có card nào đạt ngưỡng
Then lưới có card khớp cả hai ảnh trước, rồi card xe bán hàng và biển văn phòng xen kẽ
And dòng trạng thái nêu 2 nhóm và báo không tìm thấy theo chữ
```

### R6. Chờ, dự phòng và lỗi

Gửi tìm thì gọi `setPending(true)`. Câu chữ: trình duyệt tính K ngay; Worker trả trong 0,8 giây thì `setResults` theo R5; quá
0,8 giây, lỗi, 429 hoặc chỉ mục `unavailable` thì `setResults` theo K (card có K từ 0,4, xếp theo K) và khi điểm vector về
muộn thì `offerResults`. Có ảnh: chờ tới 3 giây, quá thì báo "Tìm bằng ảnh đang chậm" kèm nút thử lại; phần chữ vẫn
hiện theo K. Hết hạn mức hoặc mất mạng: chữ chạy bằng K, nút ảnh báo tạm nghỉ, không hiện lỗi kỹ thuật. Sửa chữ, thêm
hoặc bỏ ảnh khi đang tìm thì huỷ request cũ (`AbortController`), lần mới nhất thắng. Bỏ bớt ảnh sau khi đã có kết quả
thì tự tìm lại sau 0,4 giây.

```gherkin
Given Worker trả sau 2 giây
When khách tìm "bảng hiệu"
Then sau 0,8 giây lưới hiện kết quả theo K
And khi điểm vector về, nút "Có thêm kết quả gợi ý" hiện, bấm mới xếp lại
```

### R7. Thanh tìm kiếm

Thanh theo thiết kế owner duyệt ([bản thử, biến thể 1 Đường kẻ](https://claude.ai/artifact/9zKp1Fdq1t7VYSsvLtGSUi)). Một thanh
dài nổi ở đáy màn hình trên trang Sản phẩm quảng cáo và các trang cụm, sản phẩm. Bên phải ô chữ, theo thứ tự: nút xoá chữ
(chỉ hiện khi đã gõ), vạch ngăn, nút tìm bằng ảnh, nút kính lúp. Ảnh vào bằng nút, kéo thả (lớp phủ "Thả ảnh vào đây để
tìm") hoặc dán; khay ảnh hiện thumbnail, nút bỏ từng ảnh và số "n/5 ảnh". Thanh là phần tử sticky đặt trong khe
`[data-search-dock]` ngay dưới tiêu đề CTA: cuộn tới CTA thì thanh dừng ở khe, viền tan thành đường kẻ dài dưới tiêu
đề, chữ to hơn và nút "Trao đổi ý tưởng" mở ra ở cuối đường kẻ (điện thoại: "Trao đổi"); ô chữ, khay ảnh vẫn dùng được.
Rời CTA thì phần mở thêm thu lại ngay, không mờ dần, thanh luôn nền đặc. Thanh gắn xong thì ẩn link "Trao đổi ý tưởng"
cũ của CTA; không có JavaScript thì link cũ vẫn hiện. Enter tìm, Esc bỏ tìm; dòng trạng thái là vùng `aria-live`. Giảm
chuyển động thì đổi trạng thái ngay. Chữ trên thanh, thông báo và đồng nghĩa có bản EN.

```gherkin
Given trang /vi/advertising-products/ ở 384px
When khách cuộn tới CTA cuối lưới
Then thanh dừng dưới tiêu đề CTA, nút "Trao đổi" hiện ở cuối đường kẻ, ô chữ vẫn gõ được
And không có cuộn ngang ở 384, 768, 1024, 1280, 1440, 1920px
```

### R8. Ảnh khách đưa vào

Tối đa 5 ảnh; thả hơn 5 thì lấy 5 ảnh đầu và báo "Tối đa 5 ảnh". Ảnh trùng (cùng nội dung sau khi thu nhỏ) bị bỏ. HEIC,
PNG trong suốt và GIF (khung đầu) được vẽ lại qua canvas trên nền trắng; trình duyệt không đọc được thì báo "Chưa đọc được
ảnh này, thử JPG hoặc PNG". File trên 25 MB, SVG, PDF bị từ chối kèm lý do; video báo "Chỉ tìm bằng ảnh".

```gherkin
Given khay đã có 4 ảnh
When khách thả thêm 3 ảnh
Then khay có 5 ảnh và thông báo "Tối đa 5 ảnh"
```

### R9. Không có kết quả, hỏi giá, nội thất

Không card nào đạt ngưỡng: lưới giữ nguyên chế độ duyệt và dòng trạng thái hiện nút Zalo; bấm thì chép câu khách gõ vào
clipboard, mở `https://zalo.me/0949131050` và báo "Đã chép nội dung, dán vào khung chat Zalo" (link Zalo không mang sẵn tin
nhắn). Chỉ 1 đến 2 card đạt ngưỡng: hiện card và dòng "Chưa đúng ý? Gửi qua Zalo". Câu có từ hỏi giá (danh sách tĩnh: giá,
bao nhiêu, báo giá, chi phí; EN price, cost, how much, quote) vẫn hiện card và thêm dòng mời hỏi giá qua Zalo. Câu về nội
thất (danh sách tĩnh, ví dụ tủ bếp, giường, sofa) mà không có card đạt ngưỡng thì thêm link sang trang Công trình. Câu phủ
định không được hiểu (giới hạn của model).

```gherkin
Given khách gõ "giá hộp đèn tay vẫy bao nhiêu"
When kết quả về
Then lưới hiện card hộp đèn tay vẫy
And dòng trạng thái có lời mời hỏi giá qua Zalo
```

### R10. Câu tìm trong link và link chia sẻ

Mỗi lần tìm, chữ được ghi vào `#tim=<chữ>` (cả VI và EN) bằng `history.replaceState`, không chồng lịch sử, không gửi lên
máy chủ. Ảnh giữ trong `sessionStorage` của tab. Tải lại, Back từ card hay mở link có `#tim=` thì chạy lại tìm kiếm và
gọi lại `setResults`. Sự kiện `masonry:search-left` (bấm chip, Back sang filter khác) xoá ô chữ, khay ảnh và phần `#`.
Nút "Sao chép link" trong dòng trạng thái: không có ảnh thì chép link hiện tại; có ảnh thì `POST /api/search/share` gửi các
ảnh đã thu nhỏ, R2 lưu dưới mã ngắn ngẫu nhiên, link thành `#tim=<chữ>&anh=<mã>`. R2 không lưu chữ, IP hay người tìm; luật
vòng đời của bucket xoá ảnh sau 30 ngày; giới hạn 5 link có ảnh mỗi phút mỗi IP. Mã hết hạn thì link vẫn tìm theo chữ và
báo ảnh đã hết hạn.

```gherkin
Given khách tìm "hộp đèn" kèm 2 ảnh rồi bấm Sao chép link
When người khác mở link đó trong ngày
Then trang tìm bằng "hộp đèn" và đúng 2 ảnh đó, kết quả giống người gửi
And sau 30 ngày mở lại thì chỉ tìm theo chữ, kèm thông báo ảnh đã hết hạn
```

### R11. Bộ câu thử và hiệu chỉnh

`scripts/search/calibrate.mjs` chạy bộ câu thử `tests/search/fixtures/queries.json` (khoảng 60 câu từ Keyword Planner, 15 câu
trò chuyện, 15 câu gõ sai và Telex, VNI, 10 bộ trộn input không liên quan, 10 câu nhắm card video, câu EN) trên chỉ mục
thật và ghi cặp mốc chuẩn hóa, ngưỡng vào `src/search/score-config.json`. Cổng: card đúng nằm trong 5 card đầu từ 80% câu
mỗi loại; P@5 chung không dưới 0,8. Trọng số và ngưỡng chỉ đổi qua file này.

```gherkin
Given chỉ mục thật và bộ câu thử
When chạy pnpm search:calibrate
Then báo cáo nêu tỉ lệ top 5 theo từng loại câu và mọi loại từ 80%
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Command | `pnpm search:index`, `pnpm search:calibrate` | Ghi chỉ mục (R1); đo và ghi mốc, ngưỡng (R11); cần `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` có quyền Workers AI |
| Data | `.site-output/search/advertising-index.json` | `{ model, dims, status, cards: [{ id, text, media: [{ kind, v }] }] }`, sinh lúc deploy, Worker đọc qua binding `ASSETS` |
| Data | `src/search/synonyms.json`, `src/search/score-config.json` | Đồng nghĩa VI, EN; trọng số, mốc, ngưỡng |
| Hàm public | `cardTerms`, `keywordScores`, `decodeTelex`, `decodeVni` (`src/search/keywords.mjs`) | Lớp từ khóa (R2), dùng chung trình duyệt và Worker |
| Hàm public | `rankSearch({ inputs, keyword, config })` (`src/search/rank.mjs`) | `{ ids, groups, unmatched }` (R5) |
| Endpoint | `POST /api/search` | R3; 400, 429, 503 |
| Endpoint | `POST /api/search/share`, `GET /api/search/share/<mã>/<n>` | R10 |
| DOM hook | `[data-search-dock]` | Khe của thanh ngay dưới tiêu đề CTA, thread masonry thêm |
| Hàm lưới | `setResults(ids)`, `setPending(bool)`, `clearResults()`, `offerResults(ids)`; sự kiện `masonry:search-left` | [Masonry R6](masonry-live-layout.md#r6-chế-độ-tìm-kiếm) |
| Cấu hình | `wrangler.static.toml`: `main`, `run_worker_first = ["/api/*"]`, binding `AI`, `ASSETS`, rate limit, R2 `SEARCH_SHARE` | [Decision](../decisions/advertising-search-worker.md) |

## UI

Thanh và CTA theo bản thử đã duyệt (link ở R7). Khi code xong, thêm component `SearchBar` vào
[Design System](../../design-system/README.md) và link ở đây.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | chưa có test (`tests/search/index.test.mjs` với Workers AI giả) |
| R2 | chưa có test (`tests/search/keywords.test.mjs`) |
| R3, R4 | chưa có test (`tests/search/worker.test.mjs`: dạng phản hồi, 400, 429, không log) |
| R5, R6 | chưa có test (`tests/search/rank.test.mjs`) |
| R7 đến R10 | chưa có test (`tests/site/advertising-search.e2e.mjs`, Worker giả qua route Playwright, 6 bề rộng) |
| R11 | `pnpm search:calibrate` trên PC có token |

## Gate còn mở

- Toàn bộ R1 đến R11 chưa code; chờ owner duyệt spec rồi plan.
- Token `CLOUDFLARE_API_TOKEN` của workflow có quyền Workers AI và R2 chưa kiểm; thiếu thì owner thêm quyền trên Cloudflare.
- Binding rate limit chạy trên gói Free và không ghi nội dung: kiểm trên tài liệu Cloudflare trước khi code R4.
- Khe `[data-search-dock]` dưới tiêu đề CTA: thread masonry làm sau PR hiện tại của họ.
- Tìm trong CMS (thấy cả card nháp, sau Cloudflare Access) và tính vector khi CMS lưu card: thread CMS, sau slice CMS đầu.
- Video thật: đo lại cách lấy poster kèm alt khi catalog có card video.

## Chú thích thuật ngữ

- **Vector, embedding**: dãy số model sinh ra để so độ giống nghĩa giữa chữ, ảnh.
- **Cosine**: độ giống giữa hai vector, từ -1 đến 1.
- **Chỉ mục**: file chứa vector của mọi card.
- **K**: điểm lớp từ khóa của card.
- **Cùng ý**: hai input có 5 card đầu trùng nhau từ 2 card.
- **P@5**: tỉ lệ card đúng trong 5 card đầu.
- **Telex, VNI**: hai kiểu gõ tiếng Việt bằng phím số hoặc chữ khi chưa bật bộ gõ.
- **Rate limit**: giới hạn số request trong một khoảng thời gian.
- **R2**: kho file của Cloudflare.
