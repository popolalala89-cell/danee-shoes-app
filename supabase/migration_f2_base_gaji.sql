-- ========================================
-- FASE 2: Base gaji dari database
-- ========================================

ALTER TABLE settings_profit
ADD COLUMN IF NOT EXISTS base_gaji INTEGER NOT NULL DEFAULT 0;<...[truncated]