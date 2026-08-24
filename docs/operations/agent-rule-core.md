# Core rule

## Phạm vi

- Ship site tĩnh VI/EN nhanh, an toàn. `src/site/` canonical; `.site-output/` generated. CMS, private admin, D1, R2, dynamic publishing: phase sau; không chặn public release.
- Solo dev: diff nhỏ, reversible; ưu tiên dependency có sẵn, native platform, handoff có evidence.
- Static page không cần D1, R2, Access, CMS secret, admin state. Không mở rộng CMS/admin ngoài CMS phase; không speculative abstraction.
- Không deploy, connect domain, publish owner data nếu user chưa explicit approval.

## STATE không stale

- `docs/STATE.md` là snapshot Git ngắn: phase, active work, hard boundary, canonical link, verified blocker, next repo action. Không là changelog, Kanban, work log, hay bản sao Notion.
- Trước plan/implement: đọc toàn bộ `STATE.md`. Sau khi một field của snapshot đổi vì behavior, verification, blocker, handoff: verify evidence, update field và `Updated` trong cùng task.
- Bỏ item resolved/hết hạn; link spec, decision, report thay vì copy evidence. Không refresh `Updated` nếu facts không đổi.
- `STATE` mâu thuẫn hoặc nghi stale: repository evidence, test, accepted Git document thắng. Verify, sửa `STATE`; chưa rõ thì ghi unknown.

## Viết và phản hồi

- Code comment English. Mọi Markdown project Vietnamese; giữ English technical term khi cần. Cuối file có `## Chú thích thuật ngữ`. Vietnamese product copy không là code comment.
- Mỗi role load `i-have-adhd`, `caveman` ultra, `ponytail` ultra. Đọc đủ `SKILL.md` của skill đã chọn trước action. Caveman nén prose, không nén nghĩa; safety/clarity override.
- Response: state/next action đầu. Work nhiều bước: đánh số, mỗi bước bounded, tối đa 5. Nêu progress, time estimate cụ thể, lỗi theo location/cause/fix, thứ đang work. Xử lý issue hiện tại trước tangent; cuối nêu một next action dưới hai phút.
- Mơ hồ thật: hỏi một câu ngắn. Không preamble, recap, closing filler.

## Chú thích thuật ngữ

- **Canonical**: nguồn chuẩn dùng để quyết định nội dung được chấp nhận.
- **Evidence**: bằng chứng verify được từ repository, test, tool.
- **Snapshot**: ảnh trạng thái ngắn tại thời điểm hiện tại.
- **Stale**: đã cũ, không còn khớp evidence hiện tại.
