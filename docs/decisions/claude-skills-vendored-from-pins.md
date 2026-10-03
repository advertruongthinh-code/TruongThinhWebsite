---
title: Skill vendor vào .claude từ pin để mọi phiên Claude dùng cùng bộ
status: accepted
date: 2026-10-03
scope: agent tooling
tags: [claude-code, skills, graphify]
supersedes: []
related_specs: []
related_reports: []
---

# Skill vendor vào .claude từ pin để mọi phiên Claude dùng cùng bộ

## Context

Skill chỉ nằm ở user scope (`~/.agents/skills`, link sang `~/.claude/skills`).
Thread cloud trong Claude Projects clone repo mới và không đọc
`~/.claude/skills`, nên thiếu toàn bộ skill, thiếu Graphify và không có
PowerShell. Owner muốn local, Remote Control và cloud dùng một nguồn chuẩn
(SSoT), bỏ phần trùng lặp.

Docs chính thức xác nhận thread cloud nạp `.claude/skills/` của repo, còn plugin
khai báo trong `.claude/settings.json` thì không nạp trên cloud; khi trùng tên,
skill cá nhân thắng skill của repo.

## Decision

`tooling-versions.json` là nguồn chuẩn duy nhất. `scripts/tooling/vendor-skills.mjs`
sinh 52 skill và `references/` vào `.claude/` của repo, ghi hash vào
`.claude/skills.lock.json`; bản này được commit. Bootstrap copy `.claude/skills`
sang `~/.agents/skills` cho Codex thay vì tự clone và chọn skill lần nữa. Claude
không dùng `~/.claude/skills` cho các skill này. Trên Linux/cloud, Graphify chạy
qua `scripts/tooling/invoke-graphify.sh`, tự cài bản pin khi cần.

Decision này thay câu "Repository không vendor reusable skill payload" trong
[Agent Skills dùng chung cho mọi host agent](agent-skills-workflow.md);
phần còn lại của decision đó giữ nguyên.

## Alternative đã cân nhắc

| Alternative | Lợi ích | Lý do reject |
| --- | --- | --- |
| Upload skill lên tài khoản claude.ai | Có ở mọi project và chat claude.ai | Không khóa theo commit, upload tay mỗi lần đổi, Codex không đọc được |
| Plugin marketplace | Mang theo hook | Cài hai nơi (Project settings và máy local), ba plugin cùng chèn hook Node |
| Chỉ vendor 12 skill được gọi tên | Ít context hơn | Cloud và máy local sẽ khác nhau, trái mục tiêu đồng nhất |

## Hệ quả

### Tích cực

- Một commit quyết định skill cho Claude local, Remote Control, cloud và Codex.
- CI chạy `pnpm tooling:skills:check`; doctor so `~/.agents/skills` với lock và
  báo lỗi nếu `~/.claude/skills` che bản repo.

### Tiêu cực hoặc cost đã chấp nhận

- Repo thêm khoảng 4.6 MB nội dung upstream; Graphify và Serena bỏ qua `.claude/`.
- Skill upstream giữ nguyên văn, kể cả emoji trong một số skill caveman.
- Claude ở repo khác không còn các skill này trừ khi repo đó cũng vendor.
- Hook của plugin upstream không đi theo; AGENTS.md giữ vai trò bật skill.

## Evidence

- [Skills: nơi lưu và thứ tự ưu tiên](https://code.claude.com/docs/en/skills)
- [Cloud: thứ gì đi theo từ setup](https://code.claude.com/docs/en/cloud-environments#what-carries-over-from-your-setup)
- [Projects: đưa skill vào thread](https://code.claude.com/docs/en/claude-projects#get-skills-plugins-connectors-and-tools-into-threads)

## Follow-up

- Trên máy owner: gỡ link `~/.claude/skills`, chạy bootstrap và doctor theo
  [TOOLING](../operations/TOOLING.md#claude-code-skill-trong-repo).
- Khi đổi pin: chạy `pnpm tooling:skills`, commit `.claude/`, rồi bootstrap.

## Chú thích thuật ngữ

- **Vendor**: chép mã bên thứ ba vào repo ở version cố định.
- **Lock**: file ghi hash để phát hiện bản copy bị sửa hoặc lệch pin.
- **SSoT**: một nguồn duy nhất quyết định nội dung; bản khác sinh từ đó.
- **Shadow**: skill cùng tên ở vị trí ưu tiên cao hơn che bản còn lại.
