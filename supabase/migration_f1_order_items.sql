-- ========================================
-- FASE 1.1: Tabel order_items
-- ========================================
-- Menyimpan item pesanan secara terstruktur.
-- Setiap item = 1 baris = 1 jenis layanan/produk
-- HPP jadi pasti karena pake service_id → JOIN settings_profit
-- ========================================

-- 1. Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES menu_jasa(id),
  store_id UUID REFERENCES menu_store(id),
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('jasa', 'produk')) DEFAULT 'jasa',
  nama_item VARCHAR(200) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  harga_satuan INTEGER NOT NULL,
  diskon_per_item INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL DEFAULT 0,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_service_id ON order_items(service_id);

-- 2. Function: parse existing orders.layanan into order_items
-- Run this ONCE after creating the table
CREATE OR REPLACE FUNCTION backfill_order_items()
RETURNS TABLE(order_kode VARCHAR, items_created INT) AS $$
DECLARE
  o RECORD;
  item_parts TEXT[];
  part TEXT;
  nama_clean TEXT;
  qty_val INT;
  harga_val INT;
  diskon_val INT;
  created INT;
  urutan INT;
BEGIN
  FOR o IN SELECT id, kode, layanan, diskon_info FROM orders WHERE layanan IS NOT NULL AND layanan != ''
  LOOP
    created := 0;
    urutan := 0;

    -- Parse diskon_info for global discount per item approximation
    diskon_val := 0;
    IF o.diskon_info IS NOT NULL THEN
      BEGIN
        diskon_val := (regexp_matches(o.diskon_info, '[0-9]+'))[1]::INT;
      EXCEPTION WHEN OTHERS THEN
        diskon_val := 0;
      END;
    END IF;

    -- Split by comma
    item_parts := regexp_split_to_array(o.layanan, ',\s*');

    FOREACH part IN ARRAY item_parts
    LOOP
      part := trim(part);
      CONTINUE WHEN part = '';

      -- Extract qty: pattern "(Nx)"
      qty_val := 1;
      BEGIN
        qty_val := (regexp_matches(part, '\((\d+)x\)'))[1]::INT;
      EXCEPTION WHEN OTHERS THEN
        qty_val := 1;
      END;

      -- Extract harga: pattern "@ Rp N" or "Rp N"
      harga_val := 0;
      BEGIN
        harga_val := (regexp_matches(part, '@\s*Rp\s*([0-9.]+)'))[1]::INT;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          harga_val := (regexp_matches(part, 'Rp\s*([0-9.]+)'))[1]::INT;
        EXCEPTION WHEN OTHERS THEN
          harga_val := 0;
        END;
      END;

      -- Clean name: remove qty, price, brackets
      nama_clean := regexp_replace(part, '\(\d+x\)', '', 'g');
      nama_clean := regexp_replace(nama_clean, '@\s*Rp\s*[0-9.]+', '', 'g');
      nama_clean := regexp_replace(nama_clean, 'Rp\s*[0-9.]+', '', 'g');
      nama_clean := regexp_replace(nama_clean, '\[.*?\]', '', 'g');
      nama_clean := trim(nama_clean);
      CONTINUE WHEN nama_clean = '';

      urutan := urutan + 1;

      INSERT INTO order_items (order_id, tipe, nama_item, qty, harga_satuan, diskon_per_item, subtotal, urutan)
      VALUES (o.id, 'jasa', nama_clean, qty_val, harga_val, 0, harga_val * qty_val, urutan);

      created := created + 1;
    END LOOP;

    order_kode := o.kode;
    items_created := created;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Grant permissions
GRANT ALL ON order_items TO authenticated;
GRANT ALL ON order_items TO service_role;
GRANT SELECT ON order_items TO anon;
