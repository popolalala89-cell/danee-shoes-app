Langkah menjalankan migration profit merge di Supabase Dashboard:

1. BUKA https://supabase.com/dashboard/project/faqueaejsbkmpurjmubv/sql/new

2. PASTE SQL ini:
```sql
-- 1. Add persen column
ALTER TABLE settings_profit ADD COLUMN IF NOT EXISTS persen numeric DEFAULT 0;

-- 2. Migrate data
UPDATE settings_profit SET persen = clean_pct WHERE peran NOT IN ('cuci', 'repair');
UPDATE settings_profit SET persen = clean_pct + repair_pct WHERE peran IN ('cuci', 'repair');

-- 3. Merge cuci & repair into spesialis row
INSERT INTO settings_profit (nama_layanan, hpp, kategori, role_name, target_omset, peran, persen, base_gaji)
SELECT
  'role_spesialis', 0, NULL, 'Spesialis', 0, 'spesialis',
  (SELECT COALESCE(SUM(persen), 0) FROM settings_profit WHERE peran IN ('cuci', 'repair')),
  (SELECT COALESCE(SUM(base_gaji), 50000) FROM settings_profit WHERE peran IN ('cuci', 'repair'))
WHERE NOT EXISTS (SELECT 1 FROM settings_profit WHERE peran = 'spesialis');

-- 4. Remove old cuci & repair rows
DELETE FROM settings_profit WHERE peran IN ('cuci', 'repair');

-- 5. Optional: cek hasilnya
SELECT peran, persen, base_gaji FROM settings_profit ORDER BY peran;
```

3. KLIK **Run**

4. Verifikasi hasil di langkah 5 — harusnya keliatan:
   - `spesialis` → persen 0.4
   - Role lain → persen sesuai (0.025, 0.125, dst)
   - Gak ada lagi `cuci` / `repair`
