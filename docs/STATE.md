# Trạng thái hiện tại

- Updated: 2026-08-25T01:58:03+07:00
- Phase: chuẩn bị public website theo hướng static-first
- Active work: audit source/project file đã phân loại lifecycle và trạng thái
  Git. Chỉ `src/site/products.js` được chứng minh dead và xóa; raw generated,
  research, cache và untracked chỉ được ignore/phân loại, không xóa. README có
  canonical tree, AGENTS có routing tree, report ở
  `docs/reports/verification-2026-08-25-project-source-cleanup.md`. Fresh output
  có 64 file bằng source, không còn `products.js`; Worker static contract và
  VI/EN HTTP smoke pass. Notion card `Done`. Không đổi UI behavior và Public
  Codex Site chưa đổi.
- Current delivery goal: đưa static marketing site live trước CMS phase
- Canonical source: `src/site/`; generated output: `.site-output/`
- Current Git source of truth: `docs/`, `PRODUCT.md`, `DESIGN.md` khi được tạo
- Notion boundary: draft, work item, NOW/Kanban, priority, status, blocker,
  next action và discovery/knowledge note có thể thay đổi
- Canonical spec: `docs/specs/`
- Decision recording: `docs/decisions/`
- Durable evidence: `docs/reports/`
- Constraint: không bao giờ để public static release bị chặn bởi D1, R2, CMS
  hoặc private admin
- Verified blocker: parity 1:1 chưa đạt. Affected subset dùng runner hash
  `b2a7c271ee33363eee6dbaa92f44d8d0373fdd44e57e528f417be449d37596a1`
  có 16 `hero-layout` binding sai local `#top` với live `main#main-wrapper`, 16
  `main-sections` thiếu pair binding, 16 `responsive-transition` thiếu template
  correspondence và 160.517 visible layout box chưa map. Kế hoạch hiện khóa không
  cho đổi binding hoặc coverage contract nên không thể đạt PASS. Inline report cũ
  còn OOM sau khi ghi đủ runtime/coverage; regression defer ledger lớn đã pass
  `48/48`, làm runner worktree đổi hash thành
  `116207b13b0141d895bbc6a43ab1d3b541232202b162207d56c72bcc54582bed`.
  Residential hero, media-loading fallback, Commercial hero và Advertising
  Products hero vừa đổi source nên affected subset phải chạy lại. Full
  current-hash, release QA và Sites publish chưa chạy. Report canonical cũ
  vẫn `NOT PASS`; evidence mới ở
  `docs/reports/research-espacio-layout-motion-parity-targeted.md`.
- Agent context: `AGENTS.md` là index; rule module và scripts map ở
  prefix `agent-rule-` trong `docs/operations/`. Caveman ultra,
  ADHD/Ponytail ultra active.
  Automation sở hữu Graphify structural refresh và Serena startup sync; rule chỉ
  nêu trigger/boundary/fallback. Impeccable detector manual chỉ khi context báo cần.
- Documentation model: Git giữ spec/decision/report; `STATE.md` chỉ giữ snapshot
  repo. Notion giữ mutable board, status, blocker, work log.
- Next action: owner quyết định có cho phép sửa exact parity binding/coverage
  contract trước full run hoặc publish hay không.

## Chú thích thuật ngữ

- **Static-first**: ưu tiên phát hành phần website tĩnh trước phần dynamic.
- **Release readiness**: trạng thái sẵn sàng để phát hành.
- **Durable evidence**: bằng chứng có thể truy nguyên và giữ lâu dài trong Git.
- **Work item**: đơn vị công việc được theo dõi trong Notion.
- **Rule module**: file rule theo chủ đề, đọc khi trigger task khớp.
- **Automation**: hook, watcher, wrapper hoặc launcher tự xử lý mechanics.
- **Parity**: mức tương đồng runtime giữa website local và website tham chiếu.
- **Current-hash**: artifact và kết quả cùng khớp bộ hash đang được báo cáo.
