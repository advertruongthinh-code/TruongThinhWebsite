PRAGMA foreign_keys = ON;

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE project_categories (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE,
  label_vi TEXT NOT NULL,
  label_en TEXT NOT NULL,
  cover_path TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL CHECK (template IN ('compact-gallery', 'editorial-case', 'process-film')),
  category_id TEXT NOT NULL REFERENCES project_categories(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  cover_media_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES project_categories(id),
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  image_media_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(category_id, position)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/webp', 'image/svg+xml')),
  kind TEXT NOT NULL CHECK (kind IN ('image', 'logo')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  approved_at TEXT,
  approved_by TEXT,
  alt_json TEXT NOT NULL CHECK (json_valid(alt_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  detail_json TEXT NOT NULL CHECK (json_valid(detail_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX projects_public_order ON projects(status, category_id, updated_at DESC);
CREATE INDEX products_public_order ON products(status, category_id, position);
CREATE INDEX media_public_lookup ON media(status, approved_at);
CREATE INDEX audit_log_resource ON audit_log(resource_type, resource_id, created_at DESC);

INSERT INTO project_categories (id, position, label_vi, label_en, cover_path) VALUES
  ('kiosk-posm', 1, 'Kiosk, xe bán hàng & POSM', 'Kiosks, mobile retail & POSM', '/assets/site/generated/kiosk-posm.webp'),
  ('signage-3d', 2, 'Biển hiệu & chữ nổi 3D', 'Signage & 3D lettering', '/assets/site/generated/signage-3d.webp'),
  ('office-wayfinding', 3, 'Biển tên & chỉ dẫn', 'Office signs & wayfinding', '/assets/site/generated/wayfinding.webp'),
  ('led-lighting', 4, 'LED & hộp đèn', 'LED & light boxes', '/assets/site/generated/led-lightbox.webp'),
  ('print-marketing', 5, 'In ấn & decal', 'Print & decals', '/assets/site/generated/print-decal.webp'),
  ('brand-showroom', 6, 'Nhận diện thương hiệu & showroom', 'Brand identity & showrooms', '/assets/site/generated/brand-showroom.webp');

INSERT INTO pages (id, status, content_json) VALUES
  ('home', 'published', '{"vi":{"hero":{"kicker":"TRƯỜNG THỊNH","qualifier":"Kinh nghiệm","title":"để làm chắc.","motto":"Từ khảo sát đến lắp đặt hoàn thiện."},"intro":"Nội thất và quảng cáo được thiết kế để thi công được.","sections":[],"cta":{"label":"Đặt lịch khảo sát"},"seo":{"title":"Trường Thịnh — Hơn 20 năm vững tay nghề","description":"Trường Thịnh thiết kế, sản xuất và thi công nội thất nhà ở, nội thất kinh doanh và công trình quảng cáo."}},"en":{"hero":{"kicker":"TRUONG THINH","qualifier":"Experience","title":"makes it solid.","motto":"From site survey to completed installation."},"intro":"Interiors and advertising designed to be built.","sections":[],"cta":{"label":"Book a site survey"},"seo":{"title":"Trường Thịnh — 20+ Years of Craft","description":"Trường Thịnh designs, manufactures, and builds residential interiors, commercial interiors, and advertising structures."}}}'),
  ('residential', 'published', '{"vi":{"hero":{"kicker":"KHÔNG GIAN","qualifier":"Nhà ở","title":"để sống bền lâu.","motto":"Làm để sống. Làm để bền lâu."},"intro":"Nhà phố, căn hộ và homestay theo nhịp sống thật.","sections":[],"cta":{"label":"Đặt lịch khảo sát"},"seo":{"title":"Không gian Nhà ở — Trường Thịnh","description":"Thiết kế và thi công nội thất nhà ở, căn hộ và homestay."}},"en":{"hero":{"kicker":"RESIDENTIAL SPACES","qualifier":"Residential","title":"made to last.","motto":"Made for living. Made to last."},"intro":"Townhouses, apartments, and homestays shaped for real life.","sections":[],"cta":{"label":"Book a site survey"},"seo":{"title":"Residential spaces — Trường Thịnh","description":"Residential, apartment, and homestay design and build."}}}'),
  ('commercial', 'published', '{"vi":{"hero":{"kicker":"KHÔNG GIAN","qualifier":"Kinh doanh","title":"để vận hành bền.","motto":"Thiết kế để bán tốt. Thi công để vận hành bền."},"intro":"Không gian thương mại gắn với dòng khách và vận hành.","sections":[],"cta":{"label":"Đặt lịch khảo sát"},"seo":{"title":"Không gian Kinh doanh — Trường Thịnh","description":"Thiết kế và thi công showroom, F&B, văn phòng và không gian thương mại."}},"en":{"hero":{"kicker":"COMMERCIAL SPACES","qualifier":"Commercial","title":"built to perform.","motto":"Designed to sell. Built to perform."},"intro":"Commercial spaces designed around customer flow and operations.","sections":[],"cta":{"label":"Book a site survey"},"seo":{"title":"Commercial spaces — Trường Thịnh","description":"Design and build for showrooms, F&B, offices, and commercial spaces."}}}'),
  ('projects-products', 'published', '{"vi":{"hero":{"kicker":"CÔNG TRÌNH","qualifier":"Quảng cáo","title":"đến ngày sáng đèn.","motto":"Từ mặt bằng đến ngày sáng đèn."},"intro":"Kiosk, POSM, biển hiệu, LED và ấn phẩm cho điểm bán.","sections":[],"cta":{"label":"Xem sản phẩm và công trình"},"seo":{"title":"Công trình & sản phẩm — Trường Thịnh","description":"Kiosk, POSM, biển hiệu, LED, in ấn và nhận diện thương hiệu."}},"en":{"hero":{"kicker":"PROJECTS","qualifier":"Advertising","title":"to lights on.","motto":"From the site to lights on."},"intro":"Kiosks, POSM, signage, LED, and print for points of sale.","sections":[],"cta":{"label":"View products and projects"},"seo":{"title":"Projects & products — Trường Thịnh","description":"Kiosks, POSM, signage, LED, print, and brand identity."}}}'),
  ('about', 'published', '{"vi":{"hero":{"kicker":"TRƯỜNG THỊNH","qualifier":"Kinh nghiệm","title":"để làm chắc.","motto":"Kinh nghiệm để làm chắc. Sáng tạo để làm khác."},"intro":"Xưởng, vật liệu và cách làm được nối từ đầu đến cuối.","sections":[],"cta":{"label":"Đặt lịch khảo sát"},"seo":{"title":"Giới thiệu — Trường Thịnh","description":"Kinh nghiệm, xưởng và cách làm của Trường Thịnh."}},"en":{"hero":{"kicker":"TRUONG THINH","qualifier":"Experience","title":"makes it solid.","motto":"Experience makes it solid. Creativity makes it different."},"intro":"Workshop, materials, and delivery connected from start to finish.","sections":[],"cta":{"label":"Book a site survey"},"seo":{"title":"About — Trường Thịnh","description":"Trường Thịnh experience, workshop, and way of working."}}}');

INSERT INTO products (id, category_id, position, content_json) VALUES
  ('kiosk-posm-01', 'kiosk-posm', 1, '{"vi":{"name":"Kiosk, gian hàng triển lãm và quầy kệ trưng bày sản phẩm (POSM)"},"en":{"name":"Kiosks, exhibition booths, and POSM display fixtures"}}'),
  ('kiosk-posm-02', 'kiosk-posm', 2, '{"vi":{"name":"Gia công tủ, kệ trang trí theo yêu cầu"},"en":{"name":"Custom display cabinets and decorative shelving"}}'),
  ('signage-01', 'signage-3d', 1, '{"vi":{"name":"Mặt dựng Aluminium (bảng hiệu Alu)"},"en":{"name":"Aluminium composite facade signage"}}'),
  ('signage-02', 'signage-3d', 2, '{"vi":{"name":"Pano và bảng quảng cáo tấm lớn ngoài trời"},"en":{"name":"Large-format outdoor advertising panels"}}'),
  ('signage-03', 'signage-3d', 3, '{"vi":{"name":"Hộp đèn bạt Hiflex / bạt 3M cao cấp"},"en":{"name":"Hiflex and premium 3M fabric light boxes"}}'),
  ('signage-04', 'signage-3d', 4, '{"vi":{"name":"Chữ nổi Inox gắn LED sáng chân hoặc âm chữ"},"en":{"name":"Stainless steel 3D letters with halo or internal LED lighting"}}'),
  ('signage-05', 'signage-3d', 5, '{"vi":{"name":"Chữ nổi Mica / Alu / Format"},"en":{"name":"Acrylic, aluminium, and foam-board 3D letters"}}'),
  ('signage-06', 'signage-3d', 6, '{"vi":{"name":"Logo và chữ nổi tòa nhà, showroom"},"en":{"name":"Building and showroom logos and dimensional lettering"}}'),
  ('signage-07', 'signage-3d', 7, '{"vi":{"name":"Bảng vẫy Mica hút nổi"},"en":{"name":"Vacuum-formed acrylic projecting signs"}}'),
  ('signage-08', 'signage-3d', 8, '{"vi":{"name":"Bảng vẫy LED và LED hiệu ứng"},"en":{"name":"LED projecting signs and animated LED signs"}}'),
  ('signage-09', 'signage-3d', 9, '{"vi":{"name":"Bảng vẫy Inox / bạt Hiflex"},"en":{"name":"Stainless steel and Hiflex projecting signs"}}'),
  ('wayfinding-01', 'office-wayfinding', 1, '{"vi":{"name":"Biển số nhà Inox ăn mòn, dập nổi, Mica hoặc Alu"},"en":{"name":"Etched stainless, embossed, acrylic, and aluminium house numbers"}}'),
  ('wayfinding-02', 'office-wayfinding', 2, '{"vi":{"name":"Bảng tên đường và bảng chỉ dẫn khu đô thị"},"en":{"name":"Street-name and urban wayfinding signs"}}'),
  ('wayfinding-03', 'office-wayfinding', 3, '{"vi":{"name":"Bảng chức danh gỗ - đồng cao cấp"},"en":{"name":"Premium wood and brass desk nameplates"}}'),
  ('wayfinding-04', 'office-wayfinding', 4, '{"vi":{"name":"Bảng chức danh Mica / Inox cho cán bộ, quản lý"},"en":{"name":"Acrylic and stainless steel executive nameplates"}}'),
  ('wayfinding-05', 'office-wayfinding', 5, '{"vi":{"name":"Biển phòng làm việc và phòng họp"},"en":{"name":"Office and meeting-room signs"}}'),
  ('wayfinding-06', 'office-wayfinding', 6, '{"vi":{"name":"Biển chỉ dẫn tầng và sơ đồ tòa nhà"},"en":{"name":"Floor directories and building maps"}}'),
  ('wayfinding-07', 'office-wayfinding', 7, '{"vi":{"name":"Biển cảnh báo và biển WC bằng Mica, Inox, Alu"},"en":{"name":"Warning and restroom signs in acrylic, stainless steel, and aluminium"}}'),
  ('led-01', 'led-lighting', 1, '{"vi":{"name":"Bảng LED ma trận đơn sắc, 3 màu và full color"},"en":{"name":"Single-colour, tri-colour, and full-colour LED message boards"}}'),
  ('led-02', 'led-lighting', 2, '{"vi":{"name":"Hệ thống LED ma trận trong nhà và ngoài trời"},"en":{"name":"Indoor and outdoor LED matrix systems"}}'),
  ('led-03', 'led-lighting', 3, '{"vi":{"name":"Màn hình LED khổ lớn cho sự kiện, hội trường, showroom"},"en":{"name":"Large LED screens for events, halls, and showrooms"}}'),
  ('led-04', 'led-lighting', 4, '{"vi":{"name":"Hộp đèn LED siêu mỏng và tranh điện nắp hít/nắp bật"},"en":{"name":"Ultra-thin LED light boxes and magnetic or hinged light frames"}}'),
  ('print-01', 'print-marketing', 1, '{"vi":{"name":"In danh thiếp (namecard / business card)"},"en":{"name":"Business-card printing"}}'),
  ('print-02', 'print-marketing', 2, '{"vi":{"name":"In tờ rơi, tờ gấp, brochure và catalogue"},"en":{"name":"Flyers, folded leaflets, brochures, and catalogues"}}'),
  ('print-03', 'print-marketing', 3, '{"vi":{"name":"In thiệp cưới, thiệp mời, giấy chứng nhận và phong bì"},"en":{"name":"Wedding invitations, invitations, certificates, and envelopes"}}'),
  ('print-04', 'print-marketing', 4, '{"vi":{"name":"Menu bồi bìa cứng, menu da và menu gỗ"},"en":{"name":"Hard-cover, leather, and wood menus"}}'),
  ('print-05', 'print-marketing', 5, '{"vi":{"name":"Menu nhựa chống nước cho quán cafe, nhà hàng, spa"},"en":{"name":"Waterproof plastic menus for cafes, restaurants, and spas"}}'),
  ('print-06', 'print-marketing', 6, '{"vi":{"name":"Menu dạng cuốn, menu để bàn và menu Mica"},"en":{"name":"Bound, tabletop, and acrylic menus"}}'),
  ('print-07', 'print-marketing', 7, '{"vi":{"name":"In bạt Hiflex chất lượng cao"},"en":{"name":"High-quality Hiflex banner printing"}}'),
  ('print-08', 'print-marketing', 8, '{"vi":{"name":"In Decal trong, mờ, dán kính, dán tường và dán xe"},"en":{"name":"Clear, frosted, window, wall, and vehicle decal printing"}}'),
  ('print-09', 'print-marketing', 9, '{"vi":{"name":"In tem nhãn decal cắt bế theo hình"},"en":{"name":"Custom die-cut decal labels"}}'),
  ('print-10', 'print-marketing', 10, '{"vi":{"name":"In tranh Canvas và tranh treo tường nghệ thuật"},"en":{"name":"Canvas and decorative wall-art printing"}}'),
  ('brand-01', 'brand-showroom', 1, '{"vi":{"name":"Thiết kế logo và quy chuẩn thương hiệu"},"en":{"name":"Logo design and brand guidelines"}}'),
  ('brand-02', 'brand-showroom', 2, '{"vi":{"name":"Bộ nhận diện văn phòng: namecard, tiêu đề thư, kẹp file"},"en":{"name":"Office identity: business cards, letterheads, and document folders"}}'),
  ('brand-03', 'brand-showroom', 3, '{"vi":{"name":"Thiết kế maquet bảng hiệu và quảng cáo 2D/3D"},"en":{"name":"2D and 3D signage and advertising artwork"}}'),
  ('brand-04', 'brand-showroom', 4, '{"vi":{"name":"Thiết kế và thi công hoàn thiện showroom, cửa hàng"},"en":{"name":"Showroom and store design and fit-out"}}');
