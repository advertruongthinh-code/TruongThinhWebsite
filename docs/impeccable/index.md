# Quyền sở hữu context của Impeccable

Ghi chú này giữ cho `AGENTS.md`, `PRODUCT.md` và `DESIGN.md` không trở thành các
authority cạnh tranh nhau.

| Nhóm rule | Nơi canonical | Ghi chú |
| --- | --- | --- |
| Product purpose, user, job, service scope, operating context | `PRODUCT.md` | `$impeccable init` chỉ update durable truth đã xác nhận. |
| Voice, CTA constraint, approved asset, evidence gap | `PRODUCT.md` và product guide | Giữ lệnh cấm invent Zalo, address, founding year và warranty claim. |
| Color role, typography, layout grammar, component, responsive behavior, motion grammar | `DESIGN.md` | `$impeccable document` ghi visual system hiện tại đã verify. |
| Copy/i18n field, media handling, route-specific content contract | `docs/product/CONTENT-MEDIA-GUIDE.md` | Đọc trước khi edit content hoặc media. |
| Tool scope, Graphify/Serena lifecycle, Git–Notion governance, QA gate, safety, handoff | `AGENTS.md` và `docs/operations/` | Đây là operating rule, không phải product/design context. |

`$impeccable init` không được overwrite `PRODUCT.md` hiện có nếu chưa có
explicit user request. `$impeccable document` không được overwrite `DESIGN.md` hiện có nếu
chưa có explicit user decision về refresh, overwrite hoặc merge.

## Những gì skill thực sự load

Context loader của skill đã cài chỉ đọc các input do project sở hữu:

- `PRODUCT.md` cho product truth.
- `DESIGN.md`, khi file tồn tại, cho visual system đã verify.
- Brief khớp trong `.impeccable/surfaces/<slug>.md`, khi có.
- Native-platform guidance chỉ khi `PRODUCT.md` khai báo native platform.

`docs/impeccable/` là guide ngắn dành cho người đọc. Nó không phải source of truth
cạnh tranh và không được duplicate token của `DESIGN.md`. Surface brief directory do
command Impeccable surface-brief tạo khi route cần durable direction riêng; không
duy trì template thứ hai hoặc directory song song ở đây.

## Bản đồ tài liệu

- [`brand-guidelines.md`](brand-guidelines.md): rule áp dụng ngắn gọn.
- [`motion-map.md`](motion-map.md): motion grammar và measurement đã verify.
- `.impeccable/surfaces/`: brief route-specific do skill sở hữu, chỉ tạo khi cần.
- Root `PRODUCT.md`: product context.
- Root `DESIGN.md`: visual system bền vững.

## Chú thích thuật ngữ

- **Context loader**: thành phần nạp đúng các file context mà skill được phép đọc.
- **Authority**: nguồn có quyền quyết định khi nhiều rule giao nhau.
- **Visual system**: hệ thống màu, chữ, layout, component và motion.
- **Surface brief**: brief dành riêng cho một route hoặc bề mặt giao diện.
- **Durable**: có giá trị bền vững và cần giữ trong Git.
