---
title: Worker tìm kiếm chạy cùng Worker demo tĩnh
status: proposed
date: 2026-11-16
scope: static website release, advertising search
tags: [search, cloudflare, workers-ai, r2]
supersedes: []
related_specs:
  - ../specs/advertising-search.md
  - ../specs/static-release.md
related_reports: []
---

# Worker tìm kiếm chạy cùng Worker demo tĩnh

## Context

[Tìm kiếm theo nghĩa](../specs/advertising-search.md) cần một endpoint gọi Workers AI để đổi câu và ảnh của khách thành
vector. [Decision demo](cloudflare-workers-static-demo.md) đang chốt Worker demo chỉ có asset: không `main`, không binding.
[AGENTS.md](../../AGENTS.md#ranh-giới) chốt trang tĩnh không dùng D1, R2, Access, CMS secret. Owner đã duyệt hướng tìm kiếm:
ngân sách 0 đồng trong gói miễn phí Cloudflare, site không lưu vết, riêng ảnh của link chia sẻ được lưu R2 và tự xoá sau
30 ngày.

## Decision

Thêm một Worker script nhỏ vào chính Worker demo (`wrangler.static.toml`): `main = "src/search/worker.mjs"`,
`run_worker_first = ["/api/*"]` để chỉ `/api/*` chạy code, mọi route khác vẫn phục vụ thẳng từ asset như hiện nay. Binding:
`AI` (Workers AI), `ASSETS` (đọc chỉ mục tĩnh), rate limit, và R2 `SEARCH_SHARE` chỉ cho ảnh của link chia sẻ. Không D1,
không KV, không Access, không secret CMS. Workers Logs tắt.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Worker tìm kiếm riêng, domain riêng | Tách hẳn khỏi demo | Phải mở CORS, thêm một lần deploy và một URL; không có lợi gì thêm ở quy mô này |
| Chạy model trên trình duyệt khách | Không cần Worker | Khách tải khoảng 316 MB lần đầu, máy không WebGPU không chạy |
| Vectorize hoặc AI Search | Dịch vụ có sẵn | 203 card chỉ cần so tuần tự trong Worker; AI Search tính phí phần không cần |
| Chỉ mục tính lười trong Worker lúc chạy | Không cần token lúc deploy | Mỗi lần Worker khởi động lại tốn neuron và làm chậm lần tìm đầu |
| Commit chỉ mục vào Git | CI không cần token | Mọi PR thêm card phải có người chạy lại bằng token; file sinh làm repo nặng dần |

## Hệ quả

### Tích cực

- Cùng origin với site: không CORS, một workflow deploy, rollback như cũ.
- Route tĩnh không đổi hành vi: chỉ `/api/*` đi qua code.

### Tiêu cực hoặc cost đã chấp nhận

- Worker demo không còn assets-only; `cloudflare-workers-static-demo.md` mục 1 và câu ranh giới trong AGENTS.md phải sửa
  trong PR code đầu tiên của tìm kiếm.
- Workflow `Deploy demo` cần token có quyền Workers AI (chỉ mục) và R2 (link chia sẻ).
- R2 giữ ảnh khách tới 30 ngày khi khách tự bấm Sao chép link; luật vòng đời của bucket là nơi xoá.

## Evidence

- Đo thử EmbeddingGemma 2 trên Workers AI với 203 card: top 5 đạt 100% cả chữ và ảnh, P@5 0,86, chữ p50 0,6 giây
  (tài liệu hướng đi, mục Kết quả đo thử).
- Chính sách dữ liệu Workers AI: Cloudflare không giữ input, output sau khi xử lý và không dùng để train model.
- [Static assets binding](https://developers.cloudflare.com/workers/static-assets/binding/): `run_worker_first` nhận mảng
  route, ví dụ `["/api/*"]`. Binding Workers AI, R2 cạnh `ASSETS` trong cùng Worker là suy luận từ danh sách binding,
  kiểm bằng `wrangler deploy --dry-run` trong PR code.
- [Rate limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/): đếm gần đúng, riêng
  từng vị trí; trang không nói gói Free có dùng được không (Gate còn mở của spec).

## Follow-up

- PR code đầu tiên: sửa `wrangler.static.toml`, decision demo mục 1, câu ranh giới AGENTS.md, [static release](../specs/static-release.md).
- Owner tạo bucket R2 `truong-thinh-search-share` với luật xoá sau 30 ngày, hoặc thread làm bằng token khi token có quyền.

## Chú thích thuật ngữ

- **Worker script**: code chạy trên Cloudflare cho mỗi request khớp route.
- **Binding**: cấu hình nối Worker với Workers AI, R2 hoặc tài nguyên khác.
- **run_worker_first**: danh sách route chạy script trước khi tìm asset tĩnh.
- **Neuron**: đơn vị tính phí của Workers AI.
- **Luật vòng đời**: luật R2 tự xoá object sau một số ngày.
