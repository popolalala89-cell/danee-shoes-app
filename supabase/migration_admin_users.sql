-- ========================================
-- MIGRATION: admin_users table + settings_pin
-- ========================================
-- Jalankan di Supabase SQL Editor (Dashboard > SQL Editor)
-- ========================================

-- 1. TABLE: admin_users — hak akses per user admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert default superadmin
INSERT INTO admin_users (email, display_name, permissions)
VALUES (
  'admin@danee.com',
  'Super Admin',
  '["ringkasan","pesanan","inventory","keuangan","menu-jasa","menu-store","penjualan","profit-sharing","konten","diskon","referral","settings"]'::jsonb
)
ON CONFLICT (email) DO NOTHING;

-- 3. Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'authenticated');
