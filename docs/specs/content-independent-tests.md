---
title: Test không phụ thuộc nội dung
status: planned
source:
  - scripts/ci/content-contract.mjs
  - tests/fixtures/**
tests:
  - tests/tooling/content-contract.test.mjs
  - tests/tooling/content-literal-guard.test.mjs
notion: https://app.notion.com/p/402332849a0e81f0a455f750f1142504
updated: 2026-10-23
---

# Test không phụ thuộc nội dung

## Mục đích

Ảnh, card, tag, hero và gallery đổi thường xuyên; tới phase CMS, admin và nhân viên đổi chúng không qua PR. Test phải
bắt lỗi luật và hành vi, không bắt lỗi "dữ liệu khác hôm qua". PR chỉ thêm, bớt, đổi nội dung hợp lệ thì không sửa
file test nào; nội dung sai luật thì đỏ ngay, nêu đúng file. Spec này sở hữu cách viết assertion và bộ kiểm nội
dung; cách chọn và chạy bộ test vẫn thuộc [bộ test CI](ci-test-suites.md).

## Hành vi

### R1. Ba loại assertion

Mỗi assertion thuộc đúng một loại:

| Loại | Kiểm gì | Nguồn giá trị kỳ vọng |
| --- | --- | --- |
| Luật nội dung | Dữ liệu đúng luật (R2) | Luật trong spec sở hữu dữ liệu |
| Bất biến | Hành vi đúng với mọi nội dung hợp lệ: không chồng lấn, giữ thứ tự, không card lấp chỗ, không tràn khung, số card bằng độ dài manifest | Tính từ chính dữ liệu lúc chạy |
| Golden | Kết quả chính xác từng pixel hoặc hash của thuật toán | Fixture cố định trong `tests/fixtures/` (R3) |

Assertion trên nội dung thật (`media-manifest.mjs`, `photo-tags.mjs`, `project-reel.json`, HTML trang) không chứa
literal phụ thuộc nội dung: số card, số file ảnh, hash tọa độ, số card liên quan, id card hay đường dẫn ảnh cụ thể.
Giá trị đó tính từ dữ liệu, hoặc test chuyển sang fixture.

```gherkin
Given PR thêm hai card hợp lệ vào tag "Gian hàng triển lãm"
When CI chạy đủ mọi bộ
Then không test nào đỏ và PR không sửa file nào trong tests/
```

### R2. Bộ kiểm nội dung

`scripts/ci/content-contract.mjs` là entrypoint duy nhất kiểm nội dung thật, chạy trong bộ `fast` và bằng
`pnpm qa:content`. Nó gọi lại validator đang có (`validateAdvertisingCards`, `validateAdvertisingMediaPool`,
`validateProjectReel`) rồi kiểm thêm:

1. Mọi ảnh được tham chiếu tồn tại, đủ biến thể theo [chuẩn file ảnh](media-delivery.md#r5-chuẩn-file-ảnh);
   `width`, `height` khai báo bằng pixel thật.
2. Ảnh nội dung có alt VI và `data-en-alt` không rỗng; ảnh trang trí `alt=""`.
3. Tag, sản phẩm, cụm của card trỏ đúng [phân loại](advertising-taxonomy.md).
4. Hero slideshow: mảng `slides` trong head khớp thứ tự và số `figure.hero-slide`, `data-slide` liên tục từ 0.
5. Mọi file trong `src/site/assets/content/` có ít nhất một consumer (trang, data, Design System preview) và mọi
   consumer trỏ tới file có thật. Kiểm này thay cho việc đếm số file WebP.

Lỗi nêu file, id và luật bị vi phạm, không dừng ở lỗi đầu tiên.

```gherkin
Given PR thêm card có ảnh thiếu biến thể 480
When chạy pnpm qa:content
Then lệnh đỏ và nêu id card, đường dẫn ảnh, luật "đủ biến thể"

Given PR xóa ảnh khỏi gallery nhưng giữ file ảnh
When chạy pnpm qa:content
Then lệnh đỏ và nêu file không còn consumer
```

### R3. Golden chỉ trên fixture

Hash tọa độ, snapshot hình học và kỳ vọng số chính xác của thuật toán (solver masonry, related, skeleton) chạy trên
catalog mẫu cố định trong `tests/fixtures/`, không trên catalog thật. Fixture chỉ đổi khi thuật toán đổi có chủ đích,
và PR đổi fixture ghi lý do. Catalog thật chỉ chạy bất biến R1.

```gherkin
Given PR đổi ảnh A127 sang tỷ lệ 3:2
When chạy test layout
Then golden trên fixture giữ nguyên và bất biến trên catalog thật xanh
```

### R4. Test trình duyệt chọn ca bằng truy vấn

E2E chọn card, tag, slide qua helper đọc dữ liệu đã build (ví dụ "tag ít ảnh nhất có ít nhất 2 ảnh", "card đầu của
cụm"), không ghi id cụ thể. Kỳ vọng như số card liên quan tính từ cùng dữ liệu (số ảnh cùng tag trừ một, có trần).
Ca cần đúng một nội dung để tái hiện lỗi cũ thì dùng fixture
[CẦN LÀM RÕ: cho phép thêm chế độ build site với fixture không, vì sửa `scripts/site/` làm mọi bộ chạy].

### R5. Chặn tái phát

`tests/tooling/content-literal-guard.test.mjs` quét `tests/site/` và đỏ khi một assertion trên nội dung thật dùng
literal R1 (ví dụ `ADVERTISING_MEDIA_MANIFEST.length, 266`, hash 8 ký tự hex trên catalog thật, id card trong
assertion e2e). Ngoại lệ phải nằm trong danh sách có lý do; danh sách rỗng khi chuyển đổi xong.

### R6. Phase CMS

Khi CMS mở, admin dùng chung module của R2 để kiểm nội dung lúc lưu: nội dung sai luật bị từ chối trước khi
publish. CI chạy R2 trên bản xuất nội dung (seed) và R3 trên fixture, nên nhân viên sửa nội dung không làm CI đỏ.
Requirement này dormant tới khi owner mở [CMS](cms.md).

## Giao diện và dữ liệu

| Loại | Tên | Vai trò |
| --- | --- | --- |
| Script | `scripts/ci/content-contract.mjs` | Kiểm nội dung thật (R2); in lỗi theo file, id, luật; exit khác 0 khi có lỗi |
| Lệnh | `pnpm qa:content` | Gọi script trên; bộ `fast` chạy lệnh này |
| Data | `tests/fixtures/` | Catalog, tag, hero mẫu cố định cho golden (R3) và ca e2e cần nội dung cố định |
| Test | `tests/tooling/content-literal-guard.test.mjs` | Chặn literal phụ thuộc nội dung mới (R5) |

## UI

Không có; spec chỉ đổi test và tooling.

## Kiểm tra

| R | Test hoặc command |
| --- | --- |
| R1 | PR mẫu thêm, bớt, đổi card hợp lệ chạy đủ bộ mà không sửa `tests/` |
| R2 | `tests/tooling/content-contract.test.mjs`: mỗi luật có một dữ liệu hỏng làm đỏ đúng luật |
| R3 | Test layout chạy golden trên fixture; đổi tỷ lệ một ảnh thật không đổi hash fixture |
| R4 | Mỗi e2e đã chuyển xanh trên catalog thật và trên catalog thêm, bớt card |
| R5 | `tests/tooling/content-literal-guard.test.mjs` |
| R6 | Chưa có test; dormant tới phase CMS |

## Gate còn mở

- Owner duyệt spec, rồi duyệt plan chia lát.
- R4: owner chọn có cho phép build site với fixture không.
- R2 mục 5: 17 ảnh hiện không có consumer trên trang public; owner chọn xóa hay đưa vào ngoại lệ trước khi bật luật.
- Lỗi nhấp nháy P13 adv-viewer và `advertising-suggestion-layout`
  ([issue #507](https://github.com/advertruongthinh-code/TruongThinhWebsite/issues/507)) xử lý riêng, không thuộc spec này.

## Chú thích thuật ngữ

- **Assertion**: câu kiểm trong test, đúng thì test xanh.
- **Literal**: giá trị viết cứng trong code, như `266` hay `"1cba7fe2"`.
- **Bất biến**: tính chất phải đúng với mọi nội dung hợp lệ.
- **Golden**: kết quả mẫu chính xác dùng để so từng giá trị.
- **Fixture**: dữ liệu mẫu cố định chỉ dùng cho test.
- **Consumer**: trang, file dữ liệu hoặc preview đang dùng một file ảnh.
- **Seed**: bản xuất nội dung dùng để dựng dữ liệu test ở phase CMS.
