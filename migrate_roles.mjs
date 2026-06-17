import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim() || '';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim() || '';
if (!url || !key) { console.error('Missing env vars'); process.exit(1); }
const sb = createClient(url, key);

const sql = `
-- TABLE: admin_users — menyimpan hak akses per user admin
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS PIN: tambah key settings_pin (sengaja pakai INSERT biasa, bukan ON CONFLICT karena mungkin udah ada)
INSERT INTO settings (key, value) VALUES ('settings_pin', '123456')
ON CONFLICT (key) DO NOTHING;

-- Insert default superadmin (email dari admin utama)
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
`;

async function run() {
  // Use REST API to run SQL (requires service_role key, not anon)
  // Since we only have anon key, let's use the Supabase SQL endpoint via service_role
  // Actually we'll do it differently - use the REST API
  
  // For now, let's just print the SQL for user to run manually, 
  // OR use the Supabase management API if available
  console.log("SQL to execute in Supabase SQL Editor:");
  console.log("=".repeat(60));
  console.log(sql);
}

run();
