# Vai kiểm tra và kim tự tháp niềm tin

Owner yêu cầu 2026-11-22 sau PR #1061 (hàng chip thanh tìm kiếm): 27/27 test xanh nhưng owner thấy ngay trên staging chip không kéo được, thiếu "Hiện tất cả (N)", bấm một chip thì chip khác mất, motion vào khe CTA gắt. Evidence từ diff: cùng một agent viết code, test và tự QA; test bấm bằng `.click()`, không kéo chuột hay vuốt; assert chỉ đếm chip đang chọn, không kiểm chip khác còn; test nút mới chỉ chạy ở 384px; diff 7 file nên dưới [ngưỡng task dài](agent-rule-plan-review.md#ngưỡng-task-dài), không ai kiểm độc lập.

## Kim tự tháp niềm tin

Một claim chỉ mạnh bằng tầng thấp nhất có evidence. Từ đáy (mạnh nhất) lên đỉnh:

1. Check máy: `qa:docs` ([R11](../specs/docs-system.md#r11-rule-agentsmd-máy-kiểm-được)), bộ test CI, owner lock. Agent không tự gỡ được.
2. Test đã thấy đỏ: test mới hoặc sửa đỏ khi bỏ thay đổi trong `src/`, xanh khi có. Test chưa từng đỏ chưa chứng minh gì.
3. Kiểm độc lập: vai dưới đây, ngữ cảnh mới, thao tác thật, evidence là ảnh, chuỗi frame, video.
4. Tự kiểm: self-review, self-QA của chính implementer. Là claim, chưa là evidence.
5. Văn xuôi: rule, brief, câu "đã test".

- Chỉ báo owner "xong" khi đủ tầng 1-3 theo [tầng rủi ro](#tầng-rủi-ro-gọi-vai-nào); reply nêu evidence tầng 3, không chỉ "N/N test xanh".
- Sửa agent: đẩy rule xuống tầng thấp hơn (văn xuôi thành check máy), không thêm văn xuôi.

## Vai

Vai là checklist, không phải agent riêng: một agent chạy được nhiều vai.

| Vai | Kiểm gì | Đạt khi |
| --- | --- | --- |
| 1. Đối chiếu lời owner | Mỗi câu trong nguyên văn tin owner thành một hành vi trên trang, kèm evidence; không thêm phạm vi owner chưa nói | Mọi câu có evidence |
| 2. Thử tương tác | Thao tác thật ở PC 1440 và phone 384: chuột (`page.mouse` kéo, lăn, hover), touch (vuốt, chạm), bàn phím (Tab, Enter, Esc). Dữ liệu biên: 0, 1, rất nhiều kết quả, chữ dài, EN. Chuỗi: bấm lặp, đổi route, quay lại, resize. Kiểm bất biến: thứ không được đổi sau thao tác | Không lỗi; mỗi lỗi có test đỏ |
| 3. Soát motion | Mọi chuyển trạng thái đã đổi: đo hình hộp từng frame hoặc quay video; không frame nào nhảy, đúng token [Design System](../../design-system/README.md), reduced motion, khớp chữ owner tả | Chuỗi frame hoặc video đính PR |
| 4. Soát giao diện | `pnpm qa:shots` trước và sau đủ sáu bề rộng, nhìn ảnh: chồng, tràn, lệch, cắt chữ; so mock, Design System | Ảnh trước, sau đính PR |
| 5. Tiếp cận | Focus thấy được, thứ tự Tab, `aria-*`, tương phản, chữ 200% (skill `accessibility-review`) | Không lỗi chặn |
| 6. Chữ và song ngữ | VI, EN đủ; dấu câu EN theo VI; [tên gọi chuẩn](../terminology.md) | Không lệch |

Persona có sẵn theo vùng: `code-reviewer`; `security-auditor` khi chạm CMS, input người dùng, secret; `test-engineer` khi thêm hoặc đổi test ở tầng 3; `web-performance-auditor` khi chạm ảnh, tải trang, motion chạy liên tục (cuộn, fps); impeccable `audit` cho UI ở tầng 3; `seo-check` khi đổi title, meta, heading, route.

## Tầng rủi ro: gọi vai nào

Một PR khớp nhiều dòng thì theo dòng cao nhất.

| Tầng | Khi nào | Gọi thêm | Model |
| --- | --- | --- | --- |
| 0 | Mức 0; chỉ docs, CI, Notion; dữ liệu nội dung có `qa:content` | Không; tầng 1, 2 của kim tự tháp và tự review | - |
| 1 | Đổi `src/site/` nhìn thấy được, không thêm thao tác hay motion | Một subagent QA độc lập: vai 1, 4 (thêm 6 khi đổi chữ) | sonnet high |
| 2 | Thêm hoặc đổi thao tác (kéo, cuộn, chip, menu, form), motion, trạng thái nhiều bước; hoặc owner đã chê tính năng đó | QA độc lập: vai 1-5 (thêm 6 khi đổi chữ); thêm persona `code-reviewer` | sonnet high; `code-reviewer` opus medium |
| 3 | [Task dài](agent-rule-plan-review.md#ngưỡng-task-dài), chạm CMS, input người dùng, secret | Thread reviewer và persona theo vùng; có UI thì thêm QA độc lập như tầng 2 | theo [routing](agent-rule-model-routing.md#bảng-mặc-định) |

## Cách chạy cho rẻ

1. QA độc lập là subagent ngữ cảnh mới do main gọi ([lifecycle](agent-rule-workflow-tools.md#skill-lifecycle) mục 6). Brief chỉ gồm nguyên văn tin owner, link `R` trong spec, link PR hoặc diff, lệnh chạy site, vai cần chạy. Không gửi kết luận hay tóm tắt của implementer.
2. Một subagent cho mọi vai của tầng 1, 2; tách agent chỉ ở tầng 3. Không gọi advisor Fable cho vai kiểm tra.
3. Chạy sau khi tự kiểm xanh, trước khi bỏ draft. Finding chặn merge: implementer viết test đỏ, sửa, subagent kiểm lại đúng finding đó, không review lại toàn bộ. Hai vòng còn finding chặn merge thì báo điều phối.
4. PR ghi một dòng `Kiểm độc lập: tầng <N>, vai <số>, <link evidence>`, hoặc `Kiểm độc lập: tầng 0 - <lý do>`.

## Chú thích thuật ngữ

- **Kim tự tháp niềm tin**: thứ tự độ tin của evidence, check máy ở đáy mạnh nhất, văn xuôi ở đỉnh yếu nhất.
- **Vai**: một checklist kiểm tra; một agent chạy được nhiều vai.
- **QA độc lập**: subagent ngữ cảnh mới, không phải implementer, chạy các vai theo tầng.
- **Bất biến**: điều phải giữ nguyên sau thao tác, ví dụ số chip không giảm khi bấm một chip.
- **Ngữ cảnh mới**: agent không thấy lịch sử làm việc của implementer, tránh tự xác nhận.
- **Persona**: agent review chuyên biệt của bộ agent-skills.
- **Finding**: lỗi hoặc điểm cần sửa do review tìm ra.
