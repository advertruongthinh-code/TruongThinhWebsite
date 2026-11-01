-- Nội dung editor CMS đã lưu (docs/specs/cms-editor.md R8, R10): một dòng một trang sửa được, cộng dòng "advertising"
-- cho card Sản phẩm Quảng cáo. edits_json là nháp editor; anchors_json là dấu của chỗ gốc lúc lưu để Worker bỏ sửa đổi
-- mà HTML nguồn đã đổi (khóa lệch). updated_at cũng là phiên bản cho ghi có điều kiện (409 khi người khác vừa lưu).
CREATE TABLE page_edits (
  page TEXT PRIMARY KEY CHECK (page IN ('home', 'residential', 'commercial', 'about', 'advertising')),
  edits_json TEXT NOT NULL CHECK (json_valid(edits_json)),
  anchors_json TEXT NOT NULL CHECK (json_valid(anchors_json)),
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
