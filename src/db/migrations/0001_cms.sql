-- shortcut: versions grows without pruning, add pruning when the D1 size shown in the Cloudflare dashboard passes 250 MB

CREATE TABLE accounts (
  email TEXT PRIMARY KEY CHECK (email = lower(email)),
  role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
) STRICT;

CREATE TABLE records (
  type TEXT NOT NULL,
  id TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 80),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'trashed')),
  prev_status TEXT CHECK (prev_status IN ('draft', 'published')),
  version INTEGER NOT NULL CHECK (version >= 1),
  live_version INTEGER,
  pending INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug_vi TEXT,
  slug_en TEXT,
  data TEXT NOT NULL CHECK (json_valid(data)),
  write_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  trashed_at TEXT,
  PRIMARY KEY (type, id)
) STRICT;
CREATE UNIQUE INDEX records_slug_vi ON records (type, slug_vi) WHERE slug_vi IS NOT NULL AND status != 'trashed';
CREATE UNIQUE INDEX records_slug_en ON records (type, slug_en) WHERE slug_en IS NOT NULL AND status != 'trashed';
CREATE INDEX records_list ON records (type, status, position);
CREATE INDEX records_trashed ON records (trashed_at) WHERE status = 'trashed';

CREATE TABLE versions (
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  data TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  saved_by TEXT NOT NULL,
  PRIMARY KEY (type, id, version)
) STRICT;

CREATE TABLE variants (
  key TEXT PRIMARY KEY CHECK (length(key) = 32),
  media_id TEXT NOT NULL,
  crop TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'error')),
  error TEXT,
  run_id INTEGER,
  created_at TEXT NOT NULL,
  settled_at TEXT
) STRICT;
CREATE INDEX variants_pending ON variants (created_at) WHERE status = 'pending';
CREATE INDEX variants_media ON variants (media_id);

CREATE TABLE record_media (
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  variant_key TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (type, id, media_id, variant_key)
) STRICT;
CREATE INDEX record_media_media ON record_media (media_id);
CREATE INDEX record_media_variant ON record_media (variant_key) WHERE variant_key != '';

CREATE TABLE slug_history (
  type TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('vi', 'en')),
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  PRIMARY KEY (type, locale, slug)
) STRICT;

CREATE TABLE audit_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  email TEXT NOT NULL,
  command TEXT NOT NULL,
  type TEXT,
  id TEXT,
  result TEXT NOT NULL,
  detail TEXT
) STRICT;
CREATE INDEX audit_log_email ON audit_log (email, seq);
CREATE INDEX audit_log_at ON audit_log (at);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
