-- ========================================
-- FASE 3: Snapshot Bulanan Profit Sharing
-- ========================================
-- Menyimpan hasil hitung profit per bulan
-- Supaya gak perlu hitung ulang tiap render
-- ========================================

-- 1. Create profit_snapshot table
CREATE TABLE IF NOT EXISTS profit_snapshot (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  omset_gross INTEGER NOT NULL DEFAULT 0,
  alokasi_hpp INTEGER NOT NULL DEFAULT 0,
  total_komisi INTEGER NOT NULL DEFAULT 0,
  omset_nett INTEGER NOT NULL DEFAULT 0,
  target_omset INTEGER NOT NULL DEFAULT 0,
  dompet JSONB NOT NULL DEFAULT '{}',
  komisi_breakdown JSONB NOT NULL DEFAULT '[]',
  terakhir_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique per bulan+tahun — upsert friendly
  CONSTRAINT profit_snapshot_periode_unique UNIQUE (bulan, tahun)
);

-- 2. RLS: enable but allow all authenticated users
ALTER TABLE profit_snapshot ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Admin all profit_snapshot" ON profit_snapshot;
DROP POLICY IF EXISTS "Public read profit_snapshot" ON profit_snapshot;

-- Admin (authenticated) can do everything
CREATE POLICY "Admin all profit_snapshot"
  ON profit_snapshot
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public can read snapshots
CREATE POLICY "Public read profit_snapshot"
  ON profit_snapshot
  FOR SELECT
  TO public
  USING (true);

-- 3. Index for fast history query
CREATE INDEX IF NOT EXISTS idx_profit_snapshot_periode
  ON profit_snapshot (tahun DESC, bulan DESC);
