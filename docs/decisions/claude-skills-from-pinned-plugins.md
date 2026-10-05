---
title: Skill Claude chỉ đến từ plugin pin ở user scope
status: accepted
date: 2026-10-04
scope: agent tooling
tags: [claude-code, skills, cloud]
supersedes:
  - https://github.com/advertruongthinh-code/TruongThinhWebsite/blob/f7795ffa3b416af8187738d5f9445b48558fada7/docs/decisions/claude-skills-vendored-from-pins.md
related_specs: []
related_reports: []
---

# Skill Claude chỉ đến từ plugin pin ở user scope

## Bối cảnh

Cloud stack (`scripts/tooling/cloud-setup.sh`) cài năm plugin skill cho mọi repo.
Repo này còn vendor cùng bộ skill vào `.claude/skills`, nên mỗi skill có hai bản
(`ponytail` và `ponytail:ponytail`). Thread Project (beta) không đọc
`.claude/settings.json` của repo, nên tắt bản trùng bằng `enabledPlugins` không
đủ. Owner muốn đúng một bản thật, không ẩn hay tắt.

## Decision

1. Năm plugin (agent-skills, caveman, ponytail, impeccable, i-have-adhd) cài từ
   commit trong `tooling-versions.json` ở user scope: cloud qua `cloud-setup.sh`,
   máy local qua `scripts/tooling/local-setup.ps1` (bootstrap gọi script này).
2. Cùng quy tắc ở mọi nơi: không lifecycle hook, skill caveman chỉ chạy khi user
   gọi, `i-have-adhd` tự gọi.
3. Repo bỏ `.claude/skills`, `.claude/references`, lock, `vendor-skills.mjs`,
   override Codex và `.claude/settings.json`. Codex tự cài skill khi cần;
   bootstrap chỉ giữ Graphify skill cho Codex.

## Hệ quả

- Một bản cho mỗi skill ở cloud, Project thread và local.
- Đổi pin: sửa `tooling-versions.json` và pin trong `cloud-setup.sh`, dán lại
  script vào environment, chạy lại `local-setup.ps1` trên máy local.
- Override Codex (cavecrew, caveman-explore, caveman-stats, using-agent-skills)
  bị bỏ; nội dung `using-agent-skills` override đã nằm trong `AGENTS.md`.

## Chú thích thuật ngữ

- **Plugin pin**: plugin lấy từ một commit cố định.
- **User scope**: cài cho người dùng, áp dụng mọi repo.
- **Override**: bản skill sửa riêng thay bản upstream.
