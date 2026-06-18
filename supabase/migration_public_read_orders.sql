-- ========================================
-- MIGRATION: Public read policy for orders
-- ========================================
-- Guest (anon) users need SELECT access on orders
-- for order tracking (cek order) feature.
-- ========================================

-- Public read policy for tracking orders
CREATE POLICY "Public read orders" ON orders
  FOR SELECT USING (true);
