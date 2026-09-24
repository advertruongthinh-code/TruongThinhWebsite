# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Chủ nhà phố, căn hộ và homestay/Airbnb cần nội thất bền, đúng công năng.
- Chủ shop, showroom, quán ăn, cafe và văn phòng cần không gian vừa nhận diện thương hiệu vừa vận hành tốt.
- Chủ điểm bán cần kiosk, xe bán hàng, bảng hiệu, chỉ dẫn, LED/hộp đèn, in hoặc decal.

Ba nhóm được trình bày như ba năng lực ngang hàng; chưa có nhóm khách hàng ưu tiên.

## Product Purpose

Website là kênh thương hiệu và tạo lead cho **Nội thất, Quảng Cáo Trường Thịnh**. Website giúp khách hiểu năng lực đi từ khảo sát, tư vấn và thiết kế đến sản xuất, lắp đặt hoàn thiện, xem bằng chứng công trình và chuyển sang Zalo tư vấn hoặc đặt lịch khảo sát.

Repository này là nguồn website public tĩnh hiện hành. Worker, D1, R2 và admin là phạm vi CMS hoặc phát triển còn dormant; chúng không tạo thêm khả năng public trong tài liệu này.

## Positioning

Trường Thịnh gắn thiết kế với khả năng sản xuất và thi công thực tế. Giọng điệu cần chắc chắn, trực diện, tiết chế và giàu cảm giác nghề nghiệp; nội dung ưu tiên hình ảnh công trình, xưởng, vật liệu và tay nghề hơn lời quảng cáo.

Tuyên bố “hơn 20 năm” được phép dùng. Năm thành lập chính xác chưa được owner xác nhận, nên không được suy ra từ tuyên bố này.

## Operating Context

Website phục vụ khách hàng, văn phòng và xưởng trong chuỗi từ khảo sát đến thi công. Tiếng Việt là source text; tiếng Anh là leaf copy tương ứng. Mỗi route cần giữ ngữ cảnh khi đổi locale, reload, dùng keyboard hoặc touch.

Danh sách khách hàng và hạng mục owner xác nhận ngày 2026-09-09, bổ sung ngày
2026-09-10 về gian hàng triển lãm theo ngành dừa, thực phẩm, mỹ phẩm và thời trang, được lưu một
lần tại [bối cảnh Advertising](docs/design/advertising-image-quality.md#bối-cảnh-từ-khách-hàng-thực-tế).
Nguồn này phân biệt xác nhận của owner, thông tin website khách hàng và suy
luận dùng cho brief ảnh; không dùng ảnh AI để chứng minh công trình đã thi công.

Địa chỉ trụ sở đã được owner xác nhận và phải dùng đúng chuỗi sau trong footer và các nội dung địa chỉ:

`E16 Khu đô thị Hưng Phú, Phường Phú Tân, tỉnh Vĩnh Long`

URL hoặc số Zalo thật, năm thành lập chính xác và chính sách hoặc thời hạn bảo hành vẫn là dữ kiện chưa xác minh. Href Zalo hiện tại `https://zalo.me/` là placeholder, không phải URL đã được owner xác nhận.

## Capabilities and Constraints

Public canonical routes theo locale:

| Route | Vai trò |
| --- | --- |
| `/{locale}/` | Câu chuyện thương hiệu, ba lĩnh vực và bằng chứng tay nghề |
| `/{locale}/residential/` | Nhà phố, căn hộ, homestay |
| `/{locale}/commercial/` | Shop/showroom, F&B/cafe, văn phòng |
| `/{locale}/advertising-products/` | Sản phẩm quảng cáo, filter và bằng chứng gia công |
| `/{locale}/about/` | Kinh nghiệm, xưởng, đội ngũ và cam kết |
| `/{locale}/advertising-products/{slug}/` | Sáu trang chi tiết dùng chung một template |

`{locale}` là `vi` hoặc `en`. Sáu slug hiện hành là `kiosk-posm`, `mobile-retail`, `signage-raised-letters`, `office-signs-wayfinding`, `led-displays-lightboxes` và `print-decals`. `/{locale}/projects/:slug/` chỉ là contract CMS tương lai, chưa thuộc static runtime.

Các đường dẫn legacy không locale (`/`, `/nha-o/`, `/kinh-doanh/`, `/quang-cao/`, `/gioi-thieu/`) chỉ là compatibility redirects đến route locale canonical; không dùng chúng làm route public mới. Root repository là source của website, không phải lý do để tạo thêm hierarchy public.

Quy trình nội dung canonical có bốn bước: **Khảo sát → Tư vấn → Sản xuất → Lắp đặt**. Bàn giao, khi có trong hồ sơ dự án, là phần kết thúc của lắp đặt và không tạo bước thứ năm.

Ràng buộc public:

- Dùng data và block composition của source hiện có; không tạo component API, route CMS hoặc claim sản phẩm chưa có bằng chứng.
- Filter, grid, gallery, route link, CTA và back-to-top phải có keyboard và touch path; locale phải giữ qua reload.
- Nội dung, title, description, alt và aria khác ngôn ngữ phải có cặp VI/EN ở leaf node.
- Espacio/R1 cung cấp measured baseline cho layout, câu chuyện, motion và alignment 1:1 theo accepted spec; không sao chép source, media hoặc nội dung, và exact revision hoặc cutoff chưa được khóa.
- Admin và Worker là dormant/dev; không trình bày primitive của chúng như public design system.

## Brand Commitments

- Tên hiển thị: **TRƯỜNG THỊNH — NỘI THẤT · QUẢNG CÁO**.
- Tính cách: kinh nghiệm, sáng tạo, uy tín; chữ ít, ý rõ, ưu tiên động từ và bằng chứng.
- Cho công trình lên tiếng trước lời quảng cáo; gắn sáng tạo với khả năng sản xuất và thi công.
- Xanh biển và cam là điểm nhấn; nền ưu tiên giấy sáng, vật liệu và hình ảnh.
- Giữ nhận diện Trường Thịnh; visual contract và implementation gap theo
  [design system](DESIGN.md#brand-lockup--nguồn-chuẩn), ứng dụng/favicon theo
  [style guide](docs/design/style-guide.md#typography-và-hierarchy).
- Không dùng khuôn mặt nhận diện, ngoại trừ `assets/content/shared/legacy-team.webp` đã được owner duyệt.

## Evidence on Hand

Các nguồn chuẩn đã đọc cho bản ghi này:

- Route và copy contract: `docs/specs/frontend-route-and-content.md`.
- Địa chỉ đã xác nhận: `docs/decisions/head-office-address-confirmed.md`.
- Public source: `src/site/`, đặc biệt `src/site/style.css`, các route locale và `src/site/advertising-products/`.
- Architecture boundary: `docs/architecture/index.md`.
- Brand geometry và tone: `docs/design/style-guide.md`.
- Inventory/provenance của R1: `.tmp/docs-living/design-inventory.md` và `.tmp/docs-living/reference-inventory.md`.

Trạng thái bằng chứng:

- **Đã xác nhận:** route locale, sáu Advertising slug, địa chỉ, mark geometry, lockup, ngoại lệ favicon và asset đội ngũ.
- **Quan sát từ source:** public runtime tĩnh, token CSS, shared advertising catalog/detail template, trạng thái CMYK chuyển động và các hook accessibility.
- **Có test contract:** layout/lifecycle/media/static Advertising và browser checks trong `tests/site/`; dynamic audit đầy đủ chưa chạy trong task tài liệu này.
- **Chưa xác minh:** URL hoặc số Zalo thật, năm thành lập chính xác, chính sách hoặc thời hạn bảo hành, và parity runtime với reference.

## Product Principles

- Cho công trình lên tiếng trước lời quảng cáo.
- Gắn sáng tạo với khả năng sản xuất và thi công thực tế.
- Dùng nhịp editorial, khoảng trắng và typography kiến trúc thay cho card grid đại trà.
- Dùng motion để kể quá trình hình thành không gian; reduced motion vẫn phải thấy nội dung cuối.
- CTA rõ nhưng không che nội dung và không biến placeholder thành claim đã xác nhận.

## Accessibility & Inclusion

- Mục tiêu nội dung và controls chính là WCAG 2.1 AA.
- Kiểm tra các mốc responsive 320, 390, 768, 1024 và 1440 px; không để overflow ngang.
- Focus keyboard dùng trạng thái nhìn thấy; filter, gallery, menu, route link, CTA và back-to-top có đường thao tác keyboard và touch.
- `prefers-reduced-motion` bỏ transform hoặc autoplay không thiết yếu và không để nội dung bị ẩn.
- VI/EN giữ cùng ngữ cảnh; mọi hình ảnh và control có alt, label hoặc aria phù hợp ở leaf node.
- Không dùng nhận diện khuôn mặt làm bằng chứng thương hiệu; ngoại lệ asset đã duyệt phải giữ provenance.

## Chú thích thuật ngữ

- **Lead**: khách hàng tiềm năng được tạo từ trải nghiệm website.
- **Route**: đường dẫn public tương ứng với một nhóm nội dung.
- **CTA**: lời kêu gọi hành động, như gọi Zalo hoặc đặt lịch.
- **Leaf node**: node cuối chứa text hoặc thuộc tính song ngữ.
- **Canonical**: route hoặc dữ kiện chuẩn được dùng làm nguồn quyết định.
- **Dormant**: có trong repository nhưng chưa thuộc public runtime hiện hành.
- **WCAG**: bộ tiêu chuẩn accessibility cho nội dung web.
