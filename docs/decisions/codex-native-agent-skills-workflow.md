---
title: Codex native với Agent Skills user-global
status: accepted
date: 2026-09-01
scope: agent tooling
supersedes:
  - global-agent-stack-project-portability.md
related_specs: []
related_reports:
  - ../archive/reports/verification-2026-08-09-agent-workspace-bootstrap.md
---

# Codex native với Agent Skills user-global

Phần routing semantic Luna/max của decision này được thay thế bởi
[spec Superpowers accepted ngày 2026-09-08](../specs/superpowers-chatgpt-codex-orchestration.md),
đã retired theo yêu cầu owner ngày 2026-09-23. Spec và evidence được giữ làm
lịch sử; policy hiện hành nằm trong
[rule workflow và tool](../operations/agent-rule-workflow-tools.md).
Routing chọn model/effort callable theo task; điều kiện explicit request cho
Graphify semantic index vẫn giữ.

## Context

Reusable agent tooling cần dùng chung giữa nhiều repository nhưng project policy,
quality gate và verification vẫn phải portable cùng Git. Router plugin riêng làm
trùng trách nhiệm native orchestration của Codex, thêm cache, adapter, receipt và
installer không cần thiết. Agent Skills upstream đã có routing bằng task description
và chỉ thư mục `skills/` là interface dùng chung với Codex.

## Decision

Cài Serena, Graphify, Chrome DevTools MCP, Agent Skills, i-have-adhd, Caveman,
Impeccable, Ponytail và jq ở user scope từ version hoặc commit pin trong
`tooling-versions.json`. Giữ Playwright, browser engine,
`.serena/project.yml`, `.graphifyignore`, Graphify Git hook/watcher, Serena
language synchronization, wrapper, test và policy trong project.

Giữ 25 skill của `addyosmani/agent-skills` bằng direct user-global installation tại
commit `d2c37ef6225dd8726cdd369a8030307f48592d26`; không cài thêm marketplace/plugin
Agent Skills gây trùng tên. Mỗi task bắt đầu bằng `using-agent-skills`, chỉ load
skill có trigger khớp và đọc đủ `SKILL.md`. Feature đáng kể vẫn dừng ở hai human
gate: owner duyệt spec rồi owner duyệt plan.

Sau plan đã duyệt, Codex tự chọn solo, native worker hoặc reviewer theo task và
skill; không có router riêng hoặc model pin chung. Main agent giữ requirement,
architecture, diff inspection, verification và final acceptance. Output của
worker/reviewer là claim đến khi main agent kiểm chứng. Persona chỉ review chuyên
biệt, không gọi persona; parallel review chỉ dùng cho các góc độc lập khi
production risk đủ lớn, và main agent hợp nhất kết quả.

Không chép slash command, persona bundle hoặc lifecycle hook dành riêng cho Claude
vào Codex. Quy tắc riêng của project về semantic task vẫn áp dụng: Graphify
semantic extraction và content synthesis dùng `gpt-5.6-luna` với reasoning `max`,
chỉ khi owner explicit request. Graphify và Serena vẫn là user-global MCP bắt buộc;
project giữ structural wrapper, freshness gate và language sync.

Wrangler không thuộc active project tooling trong static phase; dormant Worker
source/config chỉ được activate lại tại CMS owner gate.

Bootstrap giữ backup-first, pinned, idempotent và update notify-only. Repository
không vendor reusable skill payload; clone mới dùng pin, automation và verification
để tái lập expected stack. Thay đổi user-global catalog cần restart Codex Desktop
hoặc mở task mới để bỏ catalog đã cache.

## Nguồn chính chủ

- [Codex setup](https://github.com/addyosmani/agent-skills/blob/d2c37ef6225dd8726cdd369a8030307f48592d26/docs/codex-setup.md)
- [Skill routing](https://github.com/addyosmani/agent-skills/blob/d2c37ef6225dd8726cdd369a8030307f48592d26/skills/using-agent-skills/SKILL.md)
- [Orchestration patterns](https://github.com/addyosmani/agent-skills/blob/d2c37ef6225dd8726cdd369a8030307f48592d26/references/orchestration-patterns.md)

## Phương án đã loại

| Phương án | Lý do loại |
| --- | --- |
| Giữ router plugin riêng | Trùng native orchestration và tăng active tooling surface. |
| Cài thêm Agent Skills plugin | Trùng 25 direct user-global skill đang được pin. |
| Luôn solo | Không dùng được native worker/reviewer khi task và risk phù hợp. |

## Hệ quả

- Codex tự định tuyến workflow bằng skill trigger và tự chọn execution mechanics.
- Human gate, project policy và final acceptance không bị worker hoặc persona thay thế.
- User-global stack không còn adapter, receipt, cache hoặc installer của router cũ.
- Historical report và ADR superseded được giữ để truy nguyên trạng thái cũ.

## Chú thích thuật ngữ

- **Native execution**: cơ chế solo, worker hoặc reviewer do Codex cung cấp trực tiếp.
- **Human gate**: điểm dừng bắt buộc để owner duyệt artifact.
- **Persona**: reviewer chuyên biệt, không phải coordinator.
- **Direct user-global installation**: skill được quản lý trực tiếp ở user scope, không qua plugin thứ hai.
- **Supersede**: decision mới thay thế decision cũ nhưng giữ record lịch sử.
