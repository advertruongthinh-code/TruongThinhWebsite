-- Metadata vị trí tùy chọn cho các slot project của full-menu.
ALTER TABLE project_categories ADD COLUMN kind TEXT NOT NULL DEFAULT 'product' CHECK (
  kind IN ('project', 'product')
);
-- SQLite chỉ cho default là hằng số khi thêm cột. Các row hiện có được
-- backfill bên dưới; update category thông thường refresh field này trong worker.
ALTER TABLE project_categories ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
UPDATE project_categories
SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE updated_at = '';

ALTER TABLE projects ADD COLUMN menu_group TEXT CHECK (
  menu_group IS NULL OR menu_group IN ('residential', 'commercial', 'projects-products')
);
ALTER TABLE projects ADD COLUMN menu_order INTEGER CHECK (
  menu_order IS NULL OR (menu_order >= 1 AND menu_order <= 999)
);

CREATE INDEX projects_menu_order
  ON projects(status, menu_group, menu_order, updated_at, id);

INSERT INTO project_categories (id, position, label_vi, label_en, cover_path, kind) VALUES
  ('residential', 101, 'Nhà ở', 'Residential', '/assets/site/generated/residential-space.webp', 'project'),
  ('commercial', 102, 'Kinh doanh', 'Commercial', '/assets/site/generated/commercial-space.webp', 'project'),
  ('kiosk-posm-project', 103, 'Kiosk & POSM', 'Kiosks & POSM', '/assets/site/generated/kiosk-posm.webp', 'project'),
  ('mobile-retail', 104, 'Xe bán hàng', 'Mobile retail', '/assets/site/advertising/mobile-retail.webp', 'project'),
  ('signage-project', 105, 'Bảng hiệu', 'Signage', '/assets/site/generated/signage-3d.webp', 'project'),
  ('light-boxes', 106, 'Hộp đèn', 'Light boxes', '/assets/site/generated/led-lightbox.webp', 'project');

UPDATE project_categories
SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE kind = 'project' AND updated_at = '';

-- Các row project hiện có từng dùng chung ID category product trước khi category kind
-- được khai báo rõ. Giữ chúng bằng cách chuyển sang category project gần nhất.
UPDATE projects
SET category_id = CASE category_id
  WHEN 'signage-3d' THEN 'signage-project'
  WHEN 'led-lighting' THEN 'light-boxes'
  ELSE 'kiosk-posm-project'
END
WHERE category_id IN (
  'kiosk-posm', 'signage-3d', 'office-wayfinding', 'led-lighting',
  'print-marketing', 'brand-showroom'
);
