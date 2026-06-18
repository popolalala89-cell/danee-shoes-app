-- ========================================
-- FIX: RPC function for public order tracking
-- ========================================
-- Kenapa: RLS policy mungkin error atau ga jalan.
-- Solusi: pake SECURITY DEFINER function yang bypass RLS.
-- Jalankan di Supabase SQL Editor.
-- ========================================

-- 1. Drop existing policy & buat ulang
DROP POLICY IF EXISTS "Public read orders" ON orders;

CREATE POLICY "Public read orders" ON orders
  FOR SELECT
  USING (true);

-- 2. Buat RPC function untuk tracking
--    SECURITY DEFINER = jalan sebagai pemilik tabel (bypass RLS)
CREATE OR REPLACE FUNCTION search_orders(keyword text)
RETURNS SETOF orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kw text;
BEGIN
  kw := lower(trim(keyword));

  RETURN QUERY
  SELECT DISTINCT o.*
  FROM orders o
  WHERE
    o.kode ILIKE '%' || kw || '%'
    OR o.nama_pelanggan ILIKE '%' || kw || '%'
    OR o.kontak_wa ILIKE '%' || kw || '%'
  ORDER BY o.tanggal DESC;
END;
$$;

-- 3. Grant execute to anon & authenticated
GRANT EXECUTE ON FUNCTION search_orders(text) TO anon;
GRANT EXECUTE ON FUNCTION search_orders(text) TO authenticated;

-- 4. Verifikasi
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;
