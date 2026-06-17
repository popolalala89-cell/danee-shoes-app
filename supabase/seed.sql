-- ========================================
-- DANEE SHOES & CLEAN — Database Schema
-- ========================================
-- Jalankan di Supabase SQL Editor setelah project dibuat
-- ========================================

-- 1. TABLE: menu_jasa
CREATE TABLE IF NOT EXISTS menu_jasa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama_layanan VARCHAR(100) NOT NULL,
  kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('Cleaning', 'Repair')),
  harga INTEGER NOT NULL,
  harga_promo INTEGER,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Coming Soon', 'Nonaktif')),
  deskripsi TEXT,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLE: menu_store
CREATE TABLE IF NOT EXISTS menu_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama_produk VARCHAR(100) NOT NULL,
  kategori VARCHAR(50),
  harga INTEGER NOT NULL,
  harga_promo INTEGER,
  stok INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  deskripsi TEXT,
  link_foto TEXT,
  link_marketplace TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE: orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(15) UNIQUE NOT NULL,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  nama_pelanggan VARCHAR(100) NOT NULL,
  kontak_wa VARCHAR(20),
  layanan TEXT NOT NULL,
  harga INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'Waiting' CHECK (status IN (
    'Waiting', 'Checking', 'Proses Repair', 'Proses Cleaning',
    'Proses Pengeringan', 'Ready', 'Selesai', 'Batal'
  )),
  catatan TEXT,
  diskon_info TEXT,
  referral VARCHAR(10),
  tipe_pembayaran VARCHAR(20) DEFAULT 'Bayar di Akhir' CHECK (
    tipe_pembayaran IN ('Bayar di Awal', 'Bayar di Akhir')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE: store_sales
CREATE TABLE IF NOT EXISTS store_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(15) UNIQUE NOT NULL,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  nama_pembeli VARCHAR(100),
  produk_id UUID REFERENCES menu_store(id),
  nama_produk VARCHAR(100) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  harga_satuan INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE: inventory_store
CREATE TABLE IF NOT EXISTS inventory_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID UNIQUE REFERENCES menu_store(id) ON DELETE CASCADE,
  nama_produk VARCHAR(100) NOT NULL,
  stok_sistem INTEGER DEFAULT 0,
  stok_fisik INTEGER,
  selisih INTEGER DEFAULT 0,
  update_terakhir TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE: inventory_bahan
CREATE TABLE IF NOT EXISTS inventory_bahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama_bahan VARCHAR(100) NOT NULL,
  satuan VARCHAR(20) NOT NULL,
  stok_sistem INTEGER DEFAULT 0,
  stok_fisik INTEGER,
  selisih INTEGER DEFAULT 0,
  update_terakhir TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE: cashflow
CREATE TABLE IF NOT EXISTS cashflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(15) UNIQUE NOT NULL,
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('Pemasukan', 'Pengeluaran')),
  kategori VARCHAR(30) NOT NULL,
  sumber_id VARCHAR(20),
  keterangan TEXT,
  jumlah INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLE: konten_web
CREATE TABLE IF NOT EXISTS konten_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('Edukasi', 'Testimoni', 'Instagram', 'YouTube')),
  keterangan TEXT NOT NULL,
  isi_konten TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLE: diskon_event
CREATE TABLE IF NOT EXISTS diskon_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama_event VARCHAR(100) NOT NULL,
  potongan INTEGER NOT NULL,
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('Persentase', 'Nominal')),
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Admin Saja', 'Nonaktif')),
  target_layanan VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLE: referral
CREATE TABLE IF NOT EXISTS referral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama_referral VARCHAR(100) NOT NULL,
  link TEXT,
  total_klik INTEGER DEFAULT 0,
  total_order INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  dibuat TIMESTAMPTZ DEFAULT NOW(),
  komisi_pct DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLE: settings_profit
CREATE TABLE IF NOT EXISTS settings_profit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_layanan VARCHAR(100) NOT NULL,
  hpp INTEGER DEFAULT 0,
  kategori VARCHAR(10) CHECK (kategori IN ('CLEAN', 'REPAIR')),
  role_name VARCHAR(50),
  target_omset INTEGER DEFAULT 0,
  peran VARCHAR(50),
  clean_pct DECIMAL(5,2) DEFAULT 0,
  repair_pct DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABLE: settings (key-value untuk konfigurasi global)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('wa_number', '6285111619226'),
  ('theme_primary', '#034BB9'),
  ('theme_hover', '#023C94'),
  ('admin_password_hash', ''),
  ('settings_pin', '123456')
ON CONFLICT (key) DO NOTHING;

-- 13. TABLE: admin_users — hak akses per user admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default superadmin
INSERT INTO admin_users (email, display_name, permissions)
VALUES (
  'admin@danee.com',
  'Super Admin',
  '["ringkasan","pesanan","inventory","keuangan","menu-jasa","menu-store","penjualan","profit-sharing","konten","diskon","referral","settings"]'::jsonb
)
ON CONFLICT (email) DO NOTHING;

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'authenticated');

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tanggal ON orders(tanggal);
CREATE INDEX IF NOT EXISTS idx_orders_kode ON orders(kode);
CREATE INDEX IF NOT EXISTS idx_cashflow_tanggal ON cashflow(tanggal);
CREATE INDEX IF NOT EXISTS idx_cashflow_tipe ON cashflow(tipe);
CREATE INDEX IF NOT EXISTS idx_store_sales_produk ON store_sales(produk_id);
CREATE INDEX IF NOT EXISTS idx_menu_jasa_kategori ON menu_jasa(kategori);
CREATE INDEX IF NOT EXISTS idx_menu_store_status ON menu_store(status);
CREATE INDEX IF NOT EXISTS idx_referral_kode ON referral(kode);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- AUTO ID SEQUENCES
CREATE SEQUENCE IF NOT EXISTS seq_menu_jasa START 1;
CREATE SEQUENCE IF NOT EXISTS seq_menu_store START 1;
CREATE SEQUENCE IF NOT EXISTS seq_orders START 1;
CREATE SEQUENCE IF NOT EXISTS seq_store_sales START 1;
CREATE SEQUENCE IF NOT EXISTS seq_cashflow START 1;
CREATE SEQUENCE IF NOT EXISTS seq_konten_web START 1;
CREATE SEQUENCE IF NOT EXISTS seq_diskon_event START 1;
CREATE SEQUENCE IF NOT EXISTS seq_referral START 1;
CREATE SEQUENCE IF NOT EXISTS seq_bahan START 1;

-- AUTO-ID FUNCTIONS
CREATE OR REPLACE FUNCTION gen_kode(prefix TEXT, seq_name TEXT)
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
BEGIN
  EXECUTE 'SELECT nextval($1)' INTO next_id USING seq_name;
  RETURN prefix || LPAD(next_id::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: auto-generate kode for menu_jasa
CREATE OR REPLACE FUNCTION tg_menu_jasa_kode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kode IS NULL OR NEW.kode = '' THEN
    NEW.kode := gen_kode('MJ', 'seq_menu_jasa');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_menu_jasa_kode
  BEFORE INSERT ON menu_jasa
  FOR EACH ROW EXECUTE FUNCTION tg_menu_jasa_kode();

-- TRIGGER: auto-generate kode for menu_store
CREATE OR REPLACE FUNCTION tg_menu_store_kode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kode IS NULL OR NEW.kode = '' THEN
    NEW.kode := gen_kode('PRD', 'seq_menu_store');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_menu_store_kode
  BEFORE INSERT ON menu_store
  FOR EACH ROW EXECUTE FUNCTION tg_menu_store_kode();

-- TRIGGER: auto-generate kode for orders
CREATE OR REPLACE FUNCTION tg_orders_kode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.kode IS NULL OR NEW.kode = '' THEN
    NEW.kode := gen_kode('ORD-', 'seq_orders');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_kode
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION tg_orders_kode();

-- TRIGGER: sync inventory_store when menu_store is inserted/updated
CREATE OR REPLACE FUNCTION tg_sync_inventory_store()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_store (produk_id, nama_produk, stok_sistem)
  VALUES (NEW.id, NEW.nama_produk, COALESCE(NEW.stok, 0))
  ON CONFLICT (produk_id)
  DO UPDATE SET
    nama_produk = EXCLUDED.nama_produk,
    stok_sistem = EXCLUDED.stok_sistem,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_inventory_store
  AFTER INSERT OR UPDATE ON menu_store
  FOR EACH ROW EXECUTE FUNCTION tg_sync_inventory_store();

-- ROW LEVEL SECURITY
ALTER TABLE menu_jasa ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_bahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE konten_web ENABLE ROW LEVEL SECURITY;
ALTER TABLE diskon_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_profit ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read menu_jasa" ON menu_jasa
  FOR SELECT USING (true);

CREATE POLICY "Public read menu_store" ON menu_store
  FOR SELECT USING (true);

CREATE POLICY "Public read konten_web" ON konten_web
  FOR SELECT USING (true);

CREATE POLICY "Public read diskon_event" ON diskon_event
  FOR SELECT USING (true);

CREATE POLICY "Public read referral" ON referral
  FOR SELECT USING (true);

CREATE POLICY "Public read settings" ON settings
  FOR SELECT USING (true);

-- Admin full access policies
CREATE POLICY "Admin all menu_jasa" ON menu_jasa
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all menu_store" ON menu_store
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all store_sales" ON store_sales
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all inventory_store" ON inventory_store
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all inventory_bahan" ON inventory_bahan
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all cashflow" ON cashflow
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all konten_web" ON konten_web
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all diskon_event" ON diskon_event
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all referral" ON referral
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all settings_profit" ON settings_profit
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Admin all settings" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- END OF SCHEMA
-- ========================================
