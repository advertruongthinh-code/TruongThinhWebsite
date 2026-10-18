---
title: SEO cho media của card
status: planned
source: []
tests: []
notion: https://app.notion.com/p/3ef332849a0e81978563c89bcb5d1ffc
updated: 2026-10-18
---

# SEO cho media của card

## Mục đích

Khách tìm sản phẩm quảng cáo qua Google Hình ảnh, kết quả có ảnh, hoặc công cụ tìm kiếm AI (Google AI Overviews,
ChatGPT search, Perplexity) thấy ảnh, video của card và bấm vào là mở đúng card đó. Card là một sản phẩm, media là ảnh
mô tả sản phẩm; tag giữ ở cấp card ([media-card](media-card.md)). Pinterest là mốc: mỗi card có trang riêng như một
pin. Phạm vi chỉ card Advertising; SEO toàn site, từ khóa, khu vực, bot thuộc [SEO](seo.md).

## Hành vi

### R1. Mỗi card có trang riêng

Build sinh trang tĩnh `/<locale>/advertising-products/p/<card-id>/` cho mọi card, VI và EN (200 card thành 400 trang).
Trang có `title` là tên card, `meta description` là mô tả card, `canonical` tuyệt đối, `hreflang` vi, en, x-default.
Detail đổi URL sang path này: bấm card masonry hoặc related ghi path bằng `pushState` thay cho `?photo=<id>`; URL cũ
`?photo=<id>` vào thẳng thì runtime `replaceState` sang path. Mở thẳng path thì runtime mở detail của card như vào
thẳng `?photo=` hiện nay ([detail R1](advertising-detail.md#r1-url-và-vào-detail)); hành vi, motion, scroll giữ nguyên.
Sitemap, schema và link nội bộ chỉ dùng path này, nên Google Hình ảnh dẫn khách về đúng card.

```gherkin
Given card signage-raised-letters-02
When mở /vi/advertising-products/p/signage-raised-letters-02/
Then detail của card mở, canonical là https://truongthinhads.vn/vi/advertising-products/p/signage-raised-letters-02/
And bấm một card related ghi path của card đó, history thêm đúng một entry
```

### R2. HTML ban đầu đọc được khi không chạy JavaScript

Bot AI lớn (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot) đọc HTML ban đầu, không chạy JavaScript (suy luận từ
phân tích của Vercel, nguồn thứ cấp; Googlebot thì có chạy). Nên trang R1 có sẵn trong HTML: `h1` tên card, đoạn mô tả,
mọi media theo thứ tự hiển thị (ảnh là `<img>` có `src`, `alt`, `width`, `height`; video là `<video>` có `poster` và
`<img>` poster), link tới trang cụm, trang sản phẩm của card. Runtime dựng detail tương tác trên cùng nội dung này;
không ẩn chữ chỉ để bot đọc.

```gherkin
Given trang R1 của một card có năm media
When tải HTML không chạy JavaScript
Then có h1 tên card, đoạn mô tả và năm phần tử media đúng thứ tự, mỗi phần tử có alt khác rỗng
```

### R3. Alt và tên file của từng media

Mỗi media có `altVi`, `altEn` riêng, mô tả đúng thứ trong media đó (góc chụp, chi tiết, bối cảnh), không lặp lại
giữa các media trong cùng card, không nhồi từ khóa. Validator (`media-contract.mjs`) từ chối card có hai media trùng
alt cùng ngôn ngữ. File media mới đặt tên ngắn có nghĩa theo sản phẩm, ví dụ `chu-noi-inox-mat-tien-2.webp`; file đang
có giữ tên vì tên file chỉ là gợi ý rất nhẹ với Google. VI và EN dùng chung một file, không dịch tên file.

```gherkin
Given một card có hai media cùng altVi
When catalog.mjs nạp card
Then validator từ chối card và nêu id hai media trùng alt
```

### R4. Dữ liệu cấu trúc và ảnh đại diện

Trang R1 có JSON-LD trong HTML ban đầu: `WebPage` với `primaryImageOfPage` là media cover; mỗi ảnh một `ImageObject`
(`contentUrl`, `creator` Organization Trường Thịnh, `creditText`, `copyrightNotice`); mỗi video một `VideoObject`
(`name`, `description`, `thumbnailUrl` là poster, `uploadDate`, `duration`, `contentUrl`). `og:image` là media cover.
Không dùng `Product`: Google chỉ nhận Product snippet khi có `offers`, `review` hoặc `aggregateRating`, mà card chưa
có giá hay đánh giá (Gate còn mở).

```gherkin
Given trang R1 của một card có ảnh và video
When chạy Rich Results Test của Google
Then mục Image metadata và Video hợp lệ, không có lỗi nghiêm trọng
```

### R5. Image sitemap

Build sinh `sitemap-advertising.xml`: mỗi trang R1 (VI và EN) một `<url>`, trong đó mỗi media một `<image:image>` với
`<image:loc>` tuyệt đối, video dùng poster. Chỉ dùng thẻ `loc`; các thẻ caption, title của image sitemap Google đã bỏ.
Sitemap chính của Worker CMS trỏ tới file này ([CMS R2](cms.md#r2-redirect-route-locale-robots-và-sitemap)).

```gherkin
Given catalog 200 card, 414 media
When chạy pnpm prepare:site
Then sitemap-advertising.xml có 400 url và mỗi url có số image:loc bằng số media của card
```

### R6. URL tuyệt đối theo truongthinhads.vn

Một hằng origin `https://truongthinhads.vn` dùng cho `canonical`, `hreflang`, `og:image`, JSON-LD và sitemap của R1
đến R5. Demo trên workers.dev dùng cùng HTML nên canonical của demo trỏ về domain thật.

```gherkin
Given build hiện tại
When đọc canonical, og:image, JSON-LD và sitemap của mọi trang R1
Then mọi URL tuyệt đối bắt đầu bằng https://truongthinhads.vn/
```

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Route | `/<locale>/advertising-products/p/<card-id>/` | trang card (R1, R2), thay URL detail `?photo=` |
| Data | `mediaItems[].altVi`, `altEn` | alt riêng từng media (R3), kiểm trong `media-contract.mjs` |
| File build | `sitemap-advertising.xml` | image sitemap (R5) |
| Hằng | origin `https://truongthinhads.vn` | URL tuyệt đối (R6) |

## UI

Không đổi giao diện: trang R1 hiện detail đã có ([detail](advertising-detail.md), MediaCard trong
[Design System](../../design-system/README.md)).

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 đến R6 | chưa có test; plan sẽ thêm unit test cho build, contract alt, sitemap và e2e cho route |

## Gate còn mở

- Owner duyệt spec, rồi plan (hai human gate).
- Slug: spec chọn `<card-id>` tiếng Anh, ổn định khi CMS sửa tên. Phương án khác: slug tiếng Việt từ tên card kèm số
  (77 tên cho 200 card nên phải có số). Owner chọn.
- Product snippet cần giá hoặc đánh giá thật; owner quyết có công bố giá tham khảo hay không.
- Ảnh hiện tại là ảnh minh họa AI. Google đọc IPTC Digital Source Type (`trainedAlgorithmicMedia`) để ghi nhãn ảnh AI;
  owner quyết có gắn nhãn này không, hoặc đợi ảnh thật.
- Video chỉ có thể lên kết quả video khi là nội dung chính của trang (suy luận từ yêu cầu lập chỉ mục video của
  Google); card nhiều ảnh, một video có thể không đạt.
- Demo workers.dev chưa có `noindex`; quyết thuộc [phát hành tĩnh](static-release.md).
- Ảnh site cũ có nằm trên CDN Sapo không: chưa kiểm được (domain không phân giải từ môi trường cloud).
- Placeholder đang lặp alt của card nên sẽ trượt validator R3: plan sinh alt tạm phân biệt (thêm số thứ tự ảnh),
  alt thật viết khi có ảnh thật.

## Chú thích thuật ngữ

- **Image sitemap**: sitemap liệt kê ảnh của từng trang để Google tìm ra ảnh.
- **JSON-LD**: dữ liệu cấu trúc schema.org nhúng trong thẻ script của trang.
- **Canonical**: URL chuẩn của trang, Google gộp các bản trùng về URL này.
- **Rich Results Test**: công cụ Google kiểm dữ liệu cấu trúc của một trang.
- **IPTC**: chuẩn metadata nhúng trong file ảnh (tác giả, bản quyền, nguồn gốc).
- **Bot AI**: crawler của công cụ tìm kiếm hoặc trợ lý AI.
