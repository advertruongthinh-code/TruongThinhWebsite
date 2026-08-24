UPDATE pages
SET
  content_json = json_set(
    content_json,
    '$.vi.hero.qualifier', 'Sản phẩm',
    '$.vi.hero.title', 'Quảng cáo',
    '$.vi.seo.title', 'Sản phẩm Quảng cáo — Trường Thịnh',
    '$.en.hero.qualifier', 'Advertising',
    '$.en.hero.title', 'products',
    '$.en.seo.title', 'Advertising products — Trường Thịnh'
  ),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'projects-products';
