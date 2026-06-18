-- ========================================
-- FASE 2: Base gaji dari database
-- ========================================

-- 1. Tambah column base_gaji ke settings_profit
ALTER TABLE settings_profit
ADD COLUMN IF NOT EXISTS base_gaji INTEGER NOT NULL DEFAULT 0;

-- 2. Update role rows dengan default values (opsional — fallback ke 50000 dari kode)
-- Misal: owner base 50000, cuci base 50000, dll
-- Tapi biarkan 0 dulu — kode otomatis fallback ke 50000 kalau base_gaji = 0
