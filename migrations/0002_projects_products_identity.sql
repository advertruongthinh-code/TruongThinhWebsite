-- Forward-only and repeat-safe: reconcile databases that already applied 0001.
UPDATE pages
SET
  content_json = json_set(
    content_json,
    '$.vi.hero.qualifier', 'Công trình &',
    '$.vi.hero.title', 'sản phẩm',
    '$.vi.seo.title', 'Công trình & sản phẩm — Trường Thịnh',
    '$.en.hero.qualifier', 'Projects &',
    '$.en.hero.title', 'products',
    '$.en.seo.title', 'Projects & products — Trường Thịnh'
  ),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'projects-products';
