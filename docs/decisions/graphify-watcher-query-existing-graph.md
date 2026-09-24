---
title: Graphify watcher cho phép query graph hiện có
status: accepted
date: 2026-08-27
scope: project tooling
supersedes: []
related_specs: []
related_reports: []
---

# Graphify watcher cho phép query graph hiện có

## Decision

Wrapper tiếp tục refresh structural AST và fail closed theo mặc định. Khi
`Graphify: Watch` đang chạy và đã xử lý save gần nhất, agent dùng
`-SkipAstRefresh` trước `query`, `path` hoặc `explain`. Wrapper kiểm tra
`graphify-out/graph.json` tồn tại, bỏ bước refresh có lock, vẫn report semantic
status và gọi Graphify CLI.

Switch không chứng minh freshness, không build graph thiếu và không cho phép
semantic extraction. Agent không dừng watcher chỉ để chạy query.

## Lý do

Watcher đã sở hữu structural refresh. Wrapper refresh lần hai gây tranh lock và
làm query thất bại trước khi đọc graph, dù graph hiện có dùng được.

## Hệ quả

- Normal task không có watcher vẫn dùng command mặc định.
- Watcher active dùng switch sau khi save gần nhất đã được xử lý.
- Graph thiếu hoặc có nghi ngờ stale thì không dùng switch; chờ watcher hoặc chạy
  default freshness boundary.

## Chú thích thuật ngữ

- **Structural AST**: graph cấu trúc source dùng cho truy vấn quan hệ.
- **Refresh lock**: khóa ngăn hai tiến trình cùng cập nhật graph.
- **Fail closed**: dừng khi không chứng minh được điều kiện an toàn.
