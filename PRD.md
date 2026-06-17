# DANEE SHOES & CLEAN — Product Requirements Document (PRD)
# ==========================================================
# Versi: 2.0 — Full Migration dari Google Apps Script ke Supabase
# Tanggal: 16 Juni 2026
# Status: Draft
# ==========================================================

---

## 1. RINGKASAN PROJEK

### 1.1 Visi
Danee Shoes Care adalah bisnis cuci sepatu dan perbaikan sepatu di Purwakarta.
Aplikasi ini terdiri dari:
- **Landing Page** — Website publik untuk pelanggan (order, tracking, info)
- **Admin Panel** — Dashboard manajemen untuk pemilik bisnis
- **Mobile App** — APK Android (Capacitor) dengan UI profesional

### 1.2 Masalah Saat Ini
Backend menggunakan Google Apps Script (GAS) + Google Sheets. Masalah:
- Tidak ada auth yang benar-benar aman (hanya SHA-256 hash password)
- Performance lambat (Google Sheets sebagai database)
- Tidak ada relasi data (foreign keys)
- Tidak ada real-time updates
- Tidak ada backup otomatis
- CORS bermasalah (previously fixed with Content-Type text/plain)
- Scaling terbatas

### 1.3 Solusi
Migrasi ke **Supabase** (PostgreSQL + Auth + Storage + Realtime + Edge Functions).
Frontend tetap React + TypeScript + Capacitor, tapi dengan UI yang benar-benar
seperti aplikasi Android profesional.

---

## 2. TECH STACK

### 2.1 Backend: Supabase
- **Database**: PostgreSQL (managed)
- **Auth**: Supabase Auth (email/password, magic link)
- **Storage**: Supabase Storage (untuk gambar produk/konten)
- **Edge Functions**: Supabase Edge Functions (Deno) untuk logika bisnis kompleks
- **Realtime**: Supabase Realtime untuk live updates
- **API**: Auto-generated REST API dari PostgreSQL (PostgREST)

### 2.2 Frontend
- **Framework**: React 19 + TypeScript
- **Build**: Vite
- **Mobile**: Capacitor 8 (Android)
- **State**: React hooks (useState, useEffect, useCallback)
- **Routing**: React Router v7
- **HTTP**: Supabase JS Client + fetch
- **Styling**: CSS Modules + Design System kustom

### 2.3 Infrastruktur
- **Hosting Frontend**: Vercel / Netlify (untuk web version)
- **APK Build**: GitHub Actions (Android build)
- **CI/CD**: GitHub Actions
- **Domain**: Custom domain untuk landing page

---

## 3. DATABASE SCHEMA (Supabase PostgreSQL)

### 3.1 Tabel: menu_jasa
```sql
CREATE TABLE menu_jasa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,        -- MJ001, MJ002, dll
  nama_layanan VARCHAR(100) NOT NULL,
  kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('Cleaning', 'Repair')),
  harga INTEGER NOT NULL,                    -- dalam Rupiah
  harga_promo INTEGER,                       -- NULL jika tidak ada promo
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Coming Soon', 'Nonaktif')),
  deskripsi TEXT,
  urutan INTEGER DEFAULT 0,                  -- untuk sorting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Tabel: menu_store
```sql
CREATE TABLE menu_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,        -- PRD001, PRD002, dll
  nama_produk VARCHAR(100) NOT NULL,
  kategori VARCHAR(50),                      -- free text
  harga INTEGER NOT NULL,
  harga_promo INTEGER,
  stok INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  deskripsi TEXT,
  link_foto TEXT,                            -- URL gambar
  link_marketplace TEXT,                     -- URL Shopee/toko
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Tabel: orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(15) UNIQUE NOT NULL,         -- ORD-001, ORD-002, dll
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  nama_pelanggan VARCHAR(100) NOT NULL,
  kontak_wa VARCHAR(20),
  layanan TEXT NOT NULL,                     -- comma-separated services
  harga INTEGER NOT NULL,
  status VARCHAR(30) DEFAULT 'Waiting' CHECK (status IN (
    'Waiting', 'Checking', 'Proses Repair', 'Proses Cleaning',
    'Proses Pengeringan', 'Ready', 'Selesai', 'Batal'
  )),
  catatan TEXT,
  diskon_info TEXT,
  referral VARCHAR(10),                      -- referral code
  tipe_pembayaran VARCHAR(20) DEFAULT 'Bayar di Akhir' CHECK (
    tipe_pembayaran IN ('Bayar di Awal', 'Bayar di Akhir')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 Tabel: store_sales
```sql
CREATE TABLE store_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(15) UNIQUE NOT NULL,         -- SAL-001, SAL-002, dll
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  nama_pembeli VARCHAR(100),
  produk_id UUID REFERENCES menu_store(id),
  nama_produk VARCHAR(100) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  harga_satuan INTEGER NOT NULL,
  total INTEGER NOT NULL,                    -- qty × harga_satuan
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.5 Tabel: inventory_store
```sql
CREATE TABLE inventory_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID REFERENCES menu_store(id) ON DELETE CASCADE,
  nama_produk VARCHAR(100) NOT NULL,
  stok_sistem INTEGER DEFAULT 0,
  stok_fisik INTEGER,
  selisih INTEGER,                           -- stok_fisik - stok_sistem
  update_terakhir TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.6 Tabel: inventory_bahan
```sql
CREATE TABLE inventory_bahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,         -- BAH-001, BAH-002, dll
  nama_bahan VARCHAR(100) NOT NULL,
  satuan VARCHAR(20) NOT NULL,              -- Liter, Botol, Pcs, dll
  stok_sistem INTEGER DEFAULT 0,
  stok_fisik INTEGER,
  selisih INTEGER,
  update_terakhir TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.7 Tabel: cashflow
```sql
CREATE TABLE cashflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(15) UNIQUE NOT NULL,         -- CF-001, CF-002, dll
  tanggal TIMESTAMPTZ DEFAULT NOW(),
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('Pemasukan', 'Pengeluaran')),
  kategori VARCHAR(30) NOT NULL,            -- Jasa, Penjualan, Pembelian Stok, Komisi, Operasional, Lainnya
  sumber_id VARCHAR(20),                     -- OrderID atau SaleID
  keterangan TEXT,
  jumlah INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.8 Tabel: konten_web
```sql
CREATE TABLE konten_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,         -- KW-001, KW-002, dll
  kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('Edukasi', 'Testimoni', 'Instagram', 'YouTube')),
  keterangan TEXT NOT NULL,                  -- caption/judul
  isi_konten TEXT NOT NULL,                  -- URL gambar atau link
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.9 Tabel: diskon_event
```sql
CREATE TABLE diskon_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,         -- EVT-001, EVT-002, dll
  nama_event VARCHAR(100) NOT NULL,
  potongan INTEGER NOT NULL,                 -- jumlah diskon (Rp atau %)
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('Persentase', 'Nominal')),
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Admin Saja', 'Nonaktif')),
  target_layanan VARCHAR(100),              -- "Semua Layanan", "Semua Menu Jasa", dll
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.10 Tabel: referral
```sql
CREATE TABLE referral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,         -- 6-char code
  nama_referral VARCHAR(100) NOT NULL,
  link TEXT,
  total_klik INTEGER DEFAULT 0,
  total_order INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  dibuat TIMESTAMPTZ DEFAULT NOW(),
  komisi_pct DECIMAL(5,2) DEFAULT 0,        -- persentase komisi
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.11 Tabel: settings_profit
```sql
CREATE TABLE settings_profit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_layanan VARCHAR(100) NOT NULL,       -- lowercase key
  hpp INTEGER DEFAULT 0,                    -- harga pokok penjualan
  kategori VARCHAR(10) CHECK (kategori IN ('CLEAN', 'REPAIR')),
  role_name VARCHAR(50),                    -- nama role
  target_omset INTEGER DEFAULT 0,           -- target omset bulanan
  peran VARCHAR(50),                        -- owner, spesialis cuci, dll
  clean_pct DECIMAL(5,2) DEFAULT 0,         -- % untuk cleaning
  repair_pct DECIMAL(5,2) DEFAULT 0,        -- % untuk repair
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.12 Tabel: settings
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Contoh: ('admin_password_hash', 'sha256hash...'), ('wa_number', '6285111619226'), ('theme_primary', '#034BB9')
```

### 3.13 Indexes
```sql
-- Performance indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_tanggal ON orders(tanggal);
CREATE INDEX idx_orders_kode ON orders(kode);
CREATE INDEX idx_cashflow_tanggal ON cashflow(tanggal);
CREATE INDEX idx_cashflow_tipe ON cashflow(tipe);
CREATE INDEX idx_store_sales_produk ON store_sales(produk_id);
CREATE INDEX idx_menu_jasa_kategori ON menu_jasa(kategori);
CREATE INDEX idx_menu_store_status ON menu_store(status);
CREATE INDEX idx_referral_kode ON referral(kode);
```

### 3.14 Row Level Security (RLS)
```sql
-- Public read untuk menu_jasa, menu_store, konten_web, diskon_event
ALTER TABLE menu_jasa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON menu_jasa FOR SELECT USING (true);
CREATE POLICY "Admin all" ON menu_jasa FOR ALL USING (auth.role() = 'authenticated');

-- Semua tabel lain: hanya authenticated user (admin)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- dst untuk semua tabel...
```

---

## 4. API ENDPOINTS

### 4.1 Autentikasi
Supabase Auth sudah menyediakan:
- `supabase.auth.signUp({email, password})`
- `supabase.auth.signInWithPassword({email, password})`
- `supabase.auth.signOut()`
- `supabase.auth.getSession()`

**Edge Function: /auth-admin**
- Login khusus admin dengan email tetap (admin@danee-shoes.com)
- Return JWT token yang disimpan di localStorage
- Session timeout: 30 menit (configurable)

### 4.2 Menu Jasa (Services)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /menu-jasa | GET | Public | Ambil semua menu aktif |
| /menu-jasa | GET | Admin | Ambil semua menu (termasuk nonaktif) |
| /menu-jasa | POST | Admin | Tambah/update menu |
| /menu-jasa/:id | DELETE | Admin | Soft delete (set status Nonaktif) |

### 4.3 Menu Store (Products)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /menu-store | GET | Public | Ambil semua produk aktif |
| /menu-store | GET | Admin | Ambil semua produk |
| /menu-store | POST | Admin | Tambah/update produk |
| /menu-store/:id | DELETE | Admin | Soft delete |

### 4.4 Orders
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /orders | GET | Admin | Ambil semua order |
| /orders | POST | Admin | Tambah order baru |
| /orders/:id | PUT | Admin | Update order |
| /orders/:id/status | PUT | Admin | Update status order |
| /orders/track | GET | Public | Cari order by keyword |
| /orders/:id | DELETE | Admin | Batal order |

### 4.5 Store Sales
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /sales | GET | Admin | Ambil semua penjualan |
| /sales | POST | Admin | Record penjualan baru |

### 4.6 Inventory Store
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /inventory/store | GET | Admin | Ambil data inventory |
| /inventory/store/opname | POST | Admin | Stock opname |
| /inventory/store/purchase | POST | Admin | Beli stok |

### 4.7 Inventory Bahan
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /inventory/bahan | GET | Admin | Ambil data bahan |
| /inventory/bahan | POST | Admin | Tambah bahan baru |
| /inventory/bahan/opname | POST | Admin | Stock opname bahan |
| /inventory/bahan/purchase | POST | Admin | Beli bahan |

### 4.8 Cashflow
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /cashflow | GET | Admin | Ambil cashflow (filter by date) |
| /cashflow | POST | Admin | Tambah cashflow manual |

### 4.9 Dashboard
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /dashboard/summary | GET | Admin | Ringkasan dashboard |
| /dashboard/profit | GET | Admin | Data profit sharing |
| /dashboard/profit/history | GET | Admin | History profit bulanan |

### 4.10 Konten Web
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /konten | GET | Public | Ambil konten aktif |
| /konten | GET | Admin | Ambil semua konten |
| /konten | POST | Admin | Tambah/update konten |
| /konten/:id | DELETE | Admin | Hapus konten |

### 4.11 Diskon Event
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /diskon | GET | Public | Ambil event aktif |
| /diskon | GET | Admin | Ambil semua event |
| /diskon | POST | Admin | Tambah/update event |
| /diskon/:id | DELETE | Admin | Hapus event |

### 4.12 Referral
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /referral | GET | Admin | Ambil semua referral |
| /referral | POST | Admin | Tambah/update referral |
| /referral/:id | DELETE | Admin | Hapus referral |
| /referral/:code | GET | Public | Ambil info referral by kode |
| /referral/:code/track | POST | Public | Track klik referral |

### 4.13 Settings
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /settings/theme | GET | Public | Ambil tema |
| /settings/theme | PUT | Admin | Update tema |

### 4.14 File Upload
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /upload | POST | Admin | Upload gambar ke Supabase Storage |

---

## 5. BUSINESS LOGIC (Edge Functions)

### 5.1 Order Status Flow
```
Waiting → Checking → Proses Repair/Proses Cleaning → Proses Pengeringan → Ready → Selesai
                                                                 ↑
                                                              Batal (dari semua non-terminal)
```

### 5.2 Payment Rules
1. **Bayar di Awal**: Cashflow "Pemasukan/Jasa" dibuat saat order dibuat
2. **Bayar di Akhir**: Cashflow "Pemasukan/Jasa" dibuat saat status → Selesai
3. **Referral Commission**: Saat Selesai + ada referral aktif → "Pengeluaran/Komisi"

### 5.3 Stock Management
1. **Sync**: MenuStore ↔ InventoryStore selalu sinkron
2. **Sale**: Kurangi stok MenuStore + InventoryStore
3. **Purchase**: Tambah stok MenuStore + InventoryStore
4. **Stock Opname**: Update stok_fisik, hitung selisih

### 5.4 Profit Sharing Engine
1. Filter order "Selesai" dalam rentang tanggal
2. Parse layanan (comma-separated, ada qty Nx)
3. Match HPP dari settings_profit (longest-match-first)
4. Hitung omset gross, alokasi HPP, total komisi referral
5. Hitung omset nett = gross - HPP - komisi
6. Distribusi ke 8 "dompet" berdasarkan target:
   - Di bawah target: akumulasi ke target
   - Di atas target: distribusi persentase per role

### 5.5 Auto-ID Generation
Format: `{PREFIX}{sequential_3digit}`
- MJ001, MJ002... (menu_jasa)
- PRD001, PRD002... (menu_store)
- ORD-001, ORD-002... (orders)
- SAL-001, SAL-002... (store_sales)
- CF-001, CF-002... (cashflow)
- KW-001, KW-002... (konten_web)
- EVT-001, EVT-002... (diskon_event)
- REF-001, REF-002... (referral)
- BAH-001, BAH-002... (inventory_bahan)

### 5.6 Referral Code Generation
- 6 karakter dari: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- (Exclude: I, O, 0, 1 untuk menghindari kebingungan)
- Format link: `{app_url}?ref={code}`

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Struktur Aplikasi
```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router setup
├── index.css                   # Design system global
├── lib/
│   ├── supabase.ts             # Supabase client config
│   ├── api.ts                  # API service layer
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utility functions
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Table.tsx
│   │   ├── Spinner.tsx
│   │   └── Toast.tsx
│   ├── layout/
│   │   ├── LandingLayout.tsx   # Layout untuk landing page
│   │   └── AdminLayout.tsx     # Layout untuk admin
│   └── features/
│       ├── orders/             # Order-related components
│       ├── inventory/          # Inventory components
│       └── profit-sharing/     # Profit sharing components
├── pages/
│   ├── Landing.tsx             # Landing page
│   ├── Login.tsx               # Login page
│   └── admin/
│       ├── Dashboard.tsx       # Ringkasan
│       ├── MenuJasa.tsx        # Service management
│       ├── MenuStore.tsx       # Product management
│       ├── Orders.tsx          # Order management
│       ├── Penjualan.tsx       # Sales recording
│       ├── Inventory.tsx       # Stock management
│       ├── Cashflow.tsx        # Financial tracking
│       ├── ProfitSharing.tsx   # Profit sharing
│       ├── KontenWeb.tsx       # Content management
│       ├── Diskon.tsx          # Discount management
│       └── Referral.tsx        # Referral management
└── hooks/
    ├── useAuth.ts              # Authentication hook
    └── useDebounce.ts          # Debounce hook
```

### 6.2 Routing
```
/                    → Landing Page (public)
/login               → Login Page
/admin               → Admin Dashboard (protected)
/admin/menu-jasa     → Menu Jasa
/admin/menu-store    → Menu Store
/admin/orders        → Orders
/admin/penjualan     → Penjualan
/admin/inventory     → Inventory
/admin/cashflow      → Cashflow
/admin/profit-sharing → Profit Sharing
/admin/konten-web    → Konten Web
/admin/diskon        → Diskon
/admin/referral      → Referral
```

### 6.3 Authentication Flow
1. User buka `/login`
2. Input email + password
3. Supabase Auth: `signInWithPassword({email, password})`
4. JWT token disimpan di localStorage
5. Semua API call menyertakan `Authorization: Bearer {token}`
6. RLS di Supabase memastikan hanya admin yang bisa akses data
7. Logout: `supabase.auth.signOut()` + hapus localStorage

---

## 7. UI/UX DESIGN SYSTEM

### 7.1 Design Principles
- **Mobile-first**: Semua halaman dirancang untuk layar HP (360px+)
- **Material Design 3**: Elevation, ripple, rounded corners, color system
- **Dark mode ready**: CSS custom properties untuk tema gelap
- **Performan**: Lazy loading, skeleton loading, optimistic updates

### 7.2 Color System
```css
:root {
  --primary: #034BB9;        /* Biru utama */
  --primary-light: #1565C0;
  --primary-dark: #023C94;
  --secondary: #FFC107;      /* Emas/aksen */
  --success: #10B981;        /* Hijau */
  --warning: #F59E0B;        /* Kuning */
  --danger: #EF4444;         /* Merah */
  --info: #3B82F6;           /* Biru info */
  --background: #F5F5F5;     /* Background abu-abu */
  --surface: #FFFFFF;        /* Card/surface putih */
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --border: #E5E7EB;
  --shadow: 0 1px 3px rgba(0,0,0,0.12);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 16px;
}
```

### 7.3 Typography
```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */
```

### 7.4 Spacing
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### 7.5 Components
- **Card**: Rounded corners (12px), subtle shadow, padding 16px
- **Button**: Rounded (8px), 48px height (touch target), ripple effect
- **Badge**: Pill shape (rounded-full), small text, color-coded
- **Modal**: Bottom sheet on mobile, centered on desktop, backdrop blur
- **Table**: Striped rows, sticky header, horizontal scroll on mobile
- **Input**: Rounded (8px), 48px height, focus ring
- **Toast**: Slide in from top, auto-dismiss 3s

### 7.6 Status Colors (Orders)
```
Waiting         → #F59E0B (amber)
Checking        → #3B82F6 (blue)
Proses Repair   → #8B5CF6 (purple)
Proses Cleaning → #8B5CF6 (purple)
Proses Pengeringan → #06B6D4 (cyan)
Ready           → #10B981 (emerald)
Selesai         → #10B981 (green)
Batal           → #EF4444 (red)
```

---

## 8. LANDING PAGE SPECIFICATION

### 8.1 Sections
1. **Header/Navbar**
   - Logo "Danee Shoes Care"
   - Menu: Layanan, Store, Tracking, Kontak
   - Tombol "Admin" (link ke /login)

2. **Hero Section**
   - Headline: "SOLUSI MAGER NYUCI SEPATU"
   - Subheadline: "Cuci sepatu profesional, antar jemput gratis"
   - CTA: "Order Sekarang" (WhatsApp) + "Cek Status" (scroll to tracking)
   - Background: Gradient biru + gambar sepatu

3. **Layanan Cleaning**
   - Grid cards: nama, harga, promo price, deskripsi
   - Tombol "Order via WhatsApp"

4. **Layanan Repair**
   - Grid cards: nama, harga, promo price, deskripsi
   - Tombol "Order via WhatsApp"

5. **Store Produk**
   - Grid cards: foto, nama, harga, stok, deskripsi
   - Tombol "Beli" (WhatsApp)

6. **Tracking Order**
   - Input: "Masukkan nama atau ID order"
   - Hasil: status, detail order, timeline visual

7. **Edukasi & Testimoni**
   - Cards dari konten_web (kategori Edukasi/Testimoni)
   - Image + caption

8. **Footer**
   - Brand info
   - Links: Layanan, Store, Tracking
   - Social media: Instagram, YouTube, WhatsApp
   - Google Maps embed
   - Copyright

### 8.2 WhatsApp Integration
- Format pesan: `https://wa.me/6285111619226?text={encoded_message}`
- Template order: "Halo Danee Shoes, saya mau order:\n- {layanan}\n\nNama: {nama}\nKontak: {wa}\n\nTerima kasih!"

---

## 9. ADMIN PANEL SPECIFICATION

### 9.1 Layout
- **Top Bar**: Logo, judul halaman, tanggal hari ini, hamburger menu
- **Sidebar** (desktop) / **Bottom Nav** (mobile): 5 tab utama + "Lainnya"
- **Main Content**: Konten halaman aktif

### 9.2 Pages

#### 9.2.1 Dashboard (Ringkasan)
- Summary cards: Omset Hari Ini, Order Aktif, Stok Menipis
- Leaderboard: Top Layanan, Top Produk (dengan progress bar)
- Low Stock Alerts: Item dengan stok ≤ 3

#### 9.2.2 Menu Jasa
- Tabel: ID, Nama, Kategori, Harga, Status, Aksi
- Modal Tambah/Edit: Nama, Kategori, Harga, HargaPromo, Status, Deskripsi, Urutan
- Tombol Nonaktifkan (soft delete)

#### 9.2.3 Menu Store
- Tabel: ID, Nama, Kategori, Harga, Stok, Status, Aksi
- Modal Tambah/Edit: Nama, Kategori, Harga, Stok, Status, Deskripsi, LinkFoto, LinkMarketplace
- Tombol Nonaktifkan

#### 9.2.4 Orders (Pesanan)
- Tabel: ID, Tanggal, Nama, WA, Layanan, Harga, Status, Aksi
- Search bar dengan debounce
- Filter by status
- Status workflow buttons:
  - Waiting → Checking | Batal
  - Checking → Proses Repair | Batal
  - Proses Repair → Proses Cleaning | Selesai | Batal
  - Proses Cleaning → Proses Pengeringan | Selesai | Batal
  - Proses Pengeringan → Ready | Selesai | Batal
  - Ready → Selesai | Batal
- Modal Tambah Order: Nama, WA, Layanan, Harga, Catatan, TipeBayar, ReferralCode
- Modal Detail Order: Info lengkap
- Modal Edit Order: Edit field

#### 9.2.5 Penjualan
- Form input: Pilih produk, qty, nama pembeli
- Tabel riwayat: ID, Tanggal, Produk, Qty, Total

#### 9.2.6 Inventory
- Tab "Dagangan": Tabel + Stock Opname + Beli Stok
- Tab "Bahan Baku": Tabel + Tambah Bahan + Beli Bahan + Stock Opname

#### 9.2.7 Cashflow (Keuangan)
- Filter: tanggal awal, tanggal akhir, tipe
- Summary cards: Total Pemasukan, Total Pengeluaran, Laba/Rugi
- Tabel: ID, Tanggal, Tipe, Kategori, Keterangan, Jumlah
- Modal Tambah Manual

#### 9.2.8 Profit Sharing
- Month picker
- Summary cards: Omset Kotor, HPP, Komisi, Omset Nett
- Target progress bar
- Dompet breakdown (8 role cards)
- Tabel komisi referral
- History profit bulanan

#### 9.2.9 Konten Web
- Sub-tabs: Konten | Theme
- Konten: Tabel + filter kategori + CRUD
- Theme: Color picker + live preview

#### 9.2.10 Diskon
- Tabel: ID, Nama Event, Potongan, Tipe, Target, Status, Aksi
- Modal Tambah/Edit

#### 9.2.11 Referral
- Tabel: ID, Kode, Nama, Klik, Order, Revenue, Status, Aksi
- Modal Tambah/Edit

---

## 10. MIGRATION PLAN

### 10.1 Phase 1: Setup Supabase (Hari 1)
1. Buat project Supabase baru
2. Setup database tables (SQL migration)
3. Setup auth (admin account)
4. Setup storage bucket (gambar)
5. Setup RLS policies
6. Deploy Edge Functions

### 10.2 Phase 2: Backend API (Hari 2-3)
1. Buat Supabase client config
2. Implement semua API endpoints
3. Test dengan Postman/curl
4. Setup auto-ID generation (database trigger)
5. Implement profit sharing logic (Edge Function)

### 10.3 Phase 3: Frontend Rewrite (Hari 4-7)
1. Setup project baru (React + Vite + Capacitor)
2. Implement design system
3. Build Landing Page
4. Build Login + Auth flow
5. Build Admin Layout + all pages
6. Integrate dengan Supabase API

### 10.4 Phase 4: Testing & Deploy (Hari 8)
1. Test semua fitur
2. Fix bugs
3. Build APK
4. Deploy landing page
5. Documentation

---

## 11. ENVIRONMENT VARIABLES

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Config
VITE_WA_NUMBER=6285111619226
VITE_APP_URL=https://danee-shoes.com

# Optional
VITE_GA_ID=G-XXXXXXXXXX
```

---

## 12. SECURITY CONSIDERATIONS

1. **RLS**: Semua tabel di-protect dengan Row Level Security
2. **Auth**: Supabase Auth dengan JWT tokens
3. **Admin Only**: Hanya email `admin@danee-shoes.com` yang bisa akses admin
4. **Public Read**: menu_jasa, menu_store, konten_web, diskon_event bisa dibaca publik
5. **HTTPS**: Semua komunikasi via HTTPS
6. **Input Validation**: Server-side validation di Edge Functions
7. **Rate Limiting**: Supabase built-in rate limiting
8. **Backup**: Supabase automatic daily backups

---

## 13. PERFORMANCE TARGETS

- **Landing Page Load**: < 2 detik (3G connection)
- **Admin Dashboard**: < 3 detik (termasuk API calls)
- **API Response**: < 500ms (p95)
- **APK Size**: < 5MB
- **Offline Support**: Cache landing page assets (future)

---

## 14. FUTURE ENHANCEMENTS

1. **Push Notifications**: Order status updates
2. **Payment Gateway**: Midtrans/GoPay integration
3. **Customer App**: Aplikasi terpisah untuk pelanggan
4. **Multi-branch**: Support beberapa cabang
5. **Analytics Dashboard**: Grafik penjualan, profit trends
6. **Inventory Alerts**: Notifikasi stok menipis via WhatsApp
7. **QR Code**: Untuk order tracking
8. **Loyalty Program**: Poin reward untuk pelanggan

---

## 15. APPENDIX

### 15.1 Data Migration from Google Sheets
1. Export semua sheet ke CSV
2. Import ke Supabase tables menggunakan SQL COPY
3. Verify data integrity
4. Map old IDs ke new UUIDs (jika diperlukan)

### 15.2 GAS Code Reference
- File GAS analysis: `GAS_BACKEND_ANALYSIS.md`
- Original GAS files: `gas/Code.js` (1425 lines)
- Spreadsheet: `https://docs.google.com/spreadsheets/d/1Vz4yrCBv-MvPL7g_qZE0NNqHQxmw5b54VyWr9DdN7iI`

### 15.3 WhatsApp Number
- Format: `6285111619226`
- Link: `https://wa.me/6285111619226`

---

**END OF PRD**
