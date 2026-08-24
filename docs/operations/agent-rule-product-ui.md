# Product và UI rule

## Product contract

- Trước đổi visible copy, `data-en*`, alt/ARIA, image path, card, gallery, filter: đọc hết `docs/product/CONTENT-MEDIA-GUIDE.md`.
- Trước đổi layout, typography, header, menu, transition, reveal, gallery, montage, motion: so sánh state đã đổi với local reference cùng viewport. Reference chỉ research; không copy source, media, logo, font, SVG, URL.

## Brand và HTML

- Voice: experienced, creative, credible, direct, concise. Blue/orange chỉ accent; neutral surface ưu tiên vật liệu và work. Tránh real-estate grid, fake-luxury black/gold.
- CTA: Zalo consultation hoặc survey booking. Không invent Zalo URL, address, founding year, warranty. Không recognizable face, trừ `src/site/assets/content/shared/legacy-team.webp`.
- Content image có `alt` VI, `data-en-alt` EN. Một `h1`; giữ `h2`, rồi `h3`. VI là source; EN ở leaf node, translated attribute.
- Process: Khảo sát, Tư vấn, Sản xuất, Lắp đặt. Public navigation dùng canonical locale route, không fragment. Đổi locale giữ query, reading position; bỏ fragment.

## Impeccable

- `PRODUCT.md` giữ confirmed product truth; `$impeccable init` chỉ update khi user explicit authorization. `DESIGN.md` giữ verified visual truth; `$impeccable document` không overwrite nếu chưa explicit authorization.
- Loader đọc hai file trên nếu có, rồi `.impeccable/surfaces/<slug>.md` khớp. `docs/impeccable/` chỉ brand/motion reference cho người đọc; không context source thứ hai, không duplicate design token.
- Dùng descriptive Markdown slug; không numeric document code.

## Chú thích thuật ngữ

- **Canonical locale route**: route chuẩn theo ngôn ngữ, không dùng fragment.
- **Leaf node**: node HTML không còn node con cần dịch.
- **Design token**: giá trị tái dùng định nghĩa visual system.
