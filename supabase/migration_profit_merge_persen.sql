-- Danee Shoes Care — Merge clean_pct & repair_pct into single persen column
-- GAS v83 merge: each role now has one combined percentage
-- Spesialis cuci & repair merged into single 'spesialis' role

-- 1. Add persen column
ALTER TABLE settings_profit ADD COLUMN IF NOT EXISTS persen numeric DEFAULT 0;

-- 2. Migrate data: for most roles clean_pct == repair_pct, use that value
-- For merged spesialis, persen = clean_pct + repair_pct = 0.2 + 0.2 = 0.4
UPDATE settings_profit SET persen = clean_pct WHERE peran != 'cuci' AND peran != 'repair';
UPDATE settings_profit SET persen = clean_pct + repair_pct WHERE peran = 'cuci' OR peran = 'repair';

-- 3. Merge cuci & repair rows into single 'spesialis' row
-- First, ensure the 'spesialis' row exists with combined values
INSERT INTO settings_profit (nama_layanan, hpp, kategori, role_name, target_omset, peran, persen, base_gaji)
SELECT
  'role_spesialis',
  0,
  NULL,
  'Spesialis',
  0,
  'spesialis',
  (SELECT COALESCE(SUM(persen), 0) FROM settings_profit WHERE peran IN ('cuci', 'repair')),
  (SELECT COALESCE(SUM(base_gaji), 50000) FROM settings_profit WHERE peran IN ('cuci', 'repair'))
WHERE NOT EXISTS (SELECT 1 FROM settings_profit WHERE peran = 'spesialis');

-- 4. Remove old cuci & repair rows (after data migrated)
DELETE FROM settings_profit WHERE peran IN ('cuci', 'repair');

-- 5. Drop old columns (optional — keep for backward compat during transition)
-- ALTER TABLE settings_profit DROP COLUMN IF EXISTS clean_pct;
-- ALTER TABLE settings_profit DROP COLUMN IF EXISTS repair_pct;
