-- ========================================
-- FIX: Public read policy for orders
-- ========================================
-- Jalankan di Supabase SQL Editor
-- Pertama: drop policy yang existing, lalu buat ulang
-- Kedua: tes SELECT langsung
-- ========================================

-- 1. Drop existing policy (kalo ada)
DROP POLICY IF EXISTS "Public read orders" ON orders;

-- 2. Buat ulang policy — izinkan SELECT untuk SEMUA user
CREATE POLICY "Public read orders" ON orders
  FOR SELECT
  USING (true);

-- 3. Verifikasi policy sudah benar
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 4. Test query langsung — ganti 'ORD-001' dengan kode order yang dicari
-- SELECT * FROM orders WHERE kode ILIKE '%ORD-001%';
