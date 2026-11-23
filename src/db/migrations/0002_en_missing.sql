-- 1 when a news or project record lacks a required EN field (enMissing in src/cms/contract.mjs); save and create write it,
-- so list never parses data. No seeded record lacks EN, so the default 0 is right for the seed (CMS plan part 2 E11).
ALTER TABLE records ADD COLUMN en_missing INTEGER NOT NULL DEFAULT 0;
