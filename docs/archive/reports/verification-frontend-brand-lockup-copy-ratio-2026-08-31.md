# Verification tỷ lệ chữ trong brand lockup

- Thời điểm: `2026-08-31T04:58:26+07:00`.
- Scope: header và full menu trên năm public route, hai locale VI/EN.
- Spec: [Brand shell và responsive runtime](../specs/frontend-brand-shell-responsive-runtime.md).
- Kết luận: `PASS` cho geometry logo mới; không phải production release clearance.

## Implementation đã verify

- Mark giữ nguyên bốn path và kích thước. Title giữ `52px/600`; subtitle giữ
  weight `600`, dùng `17.16px` để cap-height glyph `H` bằng đúng `33.333%`
  title.
- Subtitle dùng baseline `y=124.25`; tracking VI `9.883px`, EN `7.867px`.
  Locale EN thêm offset dọc `translateY(2.9px)` để bù khác biệt true glyph bbox,
  không scale hoặc bóp glyph.
- Hai locale giữ `textLength="396.3"` và `lengthAdjust="spacing"`; không dùng
  `spacingAndGlyphs` hoặc transform ngang.

## Kết quả runtime đại diện

Chrome DevTools đo sau `document.fonts.ready` tại `390x844`, menu đã mở:

| Locale | Surface | Copy/mark | Subtitle/title cap-height | Chênh chiều ngang title-subtitle |
| --- | --- | ---: | ---: | ---: |
| VI | Header | `59.929%` | `33.333%` | `0.0445px` |
| VI | Menu | `60.257%` | `33.333%` | `0.0253px` |
| EN | Header | `59.801%` | `33.333%` | `0.0445px` |
| EN | Menu | `60.466%` | `33.333%` | `0.0253px` |

Mọi giá trị nằm trong tolerance spec: copy/mark `60% ± 0.5` điểm phần trăm,
cap-height `33% ± 1` điểm phần trăm và chênh chiều ngang `0–0.2 CSS px`.
Console DevTools không có warning, error hoặc issue trong lượt đo.

## Gate đã chạy

| Gate | Kết quả |
| --- | --- |
| Focused static contract trước patch | `RED`, đúng mismatch geometry cũ |
| Focused static contract sau patch | `PASS` |
| `BASE_URL=http://127.0.0.1:8791 TT_E2E_BRAND_LOCKUP_ONLY=1 node tests/site/site.e2e.cjs` | `20/20 PASS`, 9 viewport VI và 5 route mỗi locale |
| `pnpm qa:static` | `PASS` |
| `pnpm qa:worker:static` | `PASS` |
| `git diff --check` trên scope logo | `PASS`; chỉ có cảnh báo line-ending CRLF hiện hữu |

Preview chính tại port `8787` đang khóa `.site-output`, nên `pnpm prepare:site`
bị `EBUSY`. Không dừng preview của luồng khác; focused runtime dùng static server
cô lập port `8791` đọc trực tiếp `src/site`.

## Impeccable

Detector đã chạy một lần trên CSS và năm HTML consumer ở scope typography.
Trạng thái `DEGRADED` vì thiếu `htmlparser2`, `css-select`, `css-tree`, `domutils`;
fallback regex chỉ báo Plus Jakarta Sans là overused font. Font này là identity
đã chấp nhận và việc thay font ngoài scope, nên không sửa theo warning. Kết quả
này không được ghi là detector pass sạch.

## Current-hash evidence

```text
b92e460f382324124838d8cb1cf4ce528f01386379901338b1e6ca573f8ec831  src/site/assets/brand/truong-thinh-lockup.svg
41390a72f29621fbd67abcd0919f1d040c174775b6dff315edb68b5d05d75277  src/site/style.css
bc39b5d6f9ba793ff1301062b158eeacf6d7df3ac97f0affd779e2d86d483235  src/site/index.html
c0d80034fbbb566cb88b07fce004e6f4cd54c8b60e868ec89a5a90f773b65ad8  src/site/about/index.html
ddfeb477d5fa116407833a87cfb1f261895a90768064b688e10bdb88c5320bd9  src/site/residential/index.html
468eabe9c50e5fbd9d72a11f4de0cdfbeaf185cd468ed39b5224b9f7826c36c7  src/site/commercial/index.html
6015262e225277df4cf51df2b186a6cd1a5bbe1904cd3bc380b6decf9180d985  src/site/advertising-products/index.html
f3a88f48c6d7dff255ffecd630266ed1df92119b2ed310a31ca6759b14fca6f2  tests/site/site.e2e.cjs
```

## Chú thích thuật ngữ

- **Cap-height**: chiều cao glyph chữ hoa cơ sở, ở đây đo bằng chữ `H`.
- **True bbox**: hình chữ nhật nhỏ nhất bao trọn geometry render thực tế.
- **Tracking**: khoảng cách đều giữa các ký tự.
- **Current-hash**: hash của file đúng tại thời điểm evidence được tạo.
- **Production release clearance**: xác nhận đủ điều kiện phát hành production.
