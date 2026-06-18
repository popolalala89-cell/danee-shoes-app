# ROADMAP — Refactor Sistem Pencatatan & Profit Sharing

> **Versi:** 1.0 | **Dibuat:** 18 Juni 2026
> **Oleh:** Pa Popo & AI Agent
> **Status:** 🚀 Aktif — Implementasi Bertahap

---

## 🎯 Tujuan Akhir

Sistem pencatatan dan profit sharing yang:

1. **Akurat** — HPP, harga, qty terstruktur, bukan tebakan dari string
2. **Auditable** — Tiap rupiah bisa dilacak dari laporan → akun → transaksi → item
3. **Stabil** — Data historis disimpan (snapshot per bulan), tidak berubah tiap dihitung ulang
4. **Konfigurabel** — Base salary, persentase peran, target operasional dari database

---

## 📋 Ringkasan Perubahan

| Aspek | Sekarang | Nanti |
|-------|----------|-------|
| **Input pesanan** | String bebas (`"Deep Clean (2x)..."`) | Pilih service dari dropdown (qty diinput) |
| **Penyimpanan item** | Di `orders.layanan` (TEXT) | Di `order_items` (tabel relasi) |
| **HPP** | Keyword match dari string | JOIN ke `settings_profit` via `service_id` |
| **Qty** | Tebakan `harga / harga_satuan` | Diinput user di form |
| **Perhitungan profit** | Dihitung ulang tiap render | Disimpan sebagai snapshot per bulan |
| **Base salary** | Hardcode `50k, 50k, 50k,...` di JS | Config di `settings_profit` |
| **Audit** | Cek "balance?" doang | Per-order, per-item, per-role breakdown |

---

## 🗺️ Fase Implementasi

### ✅ FASE 0 — YANG SUDAH JADI (Sekarang)

| # | Item | Status |
|---|------|--------|
| 0.1 | Engine profit sharing (dari GAS) | ✅ Berfungsi |
| 0.2 | Summary bar: Gross, HPP, Komisi, Nett, Target | ✅ |
| 0.3 | Distribusi dompet (8 role) | ✅ |
| 0.4 | Histori 3 bulan + pertumbuhan | ✅ |
| 0.5 | Sistem audit dasar (balance checker) | ✅ |
| 0.6 | Komisi referral breakdown | ✅ |

---

### 🔵 FASE 1 — INPUT PESANAN TERSTRUKTUR

> **Goal:** Ganti `orders.layanan` (TEXT) → `order_items` (tabel).  
> HPP jadi pasti, qty diinput user, diskon per-item proper.

#### 1.1 — Database Migration: Tabel `order_items`

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES menu_jasa(id),   -- NULL kalo produk store
  store_id UUID REFERENCES menu_store(id),     -- NULL kalo jasa
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('jasa', 'produk')),
  nama_item VARCHAR(200) NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  harga_satuan INTEGER NOT NULL,
  diskon_per_item INTEGER DEFAULT 0,
  subtotal INTEGER NOT NULL,  -- (harga_satuan - diskon) * qty
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### 1.2 — Migration: Simpan Data Lama

Backfill data dari `orders.layanan` (parsing exist) ke `order_items`.

#### 1.3 — Ubah Form Orders.tsx

- **Cart system → pilih service dropdown** dari `menu_jasa` / `menu_store`
- User input qty langsung (bukan tebakan)
- `layanan` field di `orders` diisi otomatis dari gabungan items (backward compat)
- `harga` di `orders` tetap = subtotal + diskon - global_discount

#### 1.4 — Update Profit Engine

- Prioritas: baca dari `order_items`
- Fallback: parsing `orders.layanan` seperti sekarang (buat order lama)
- HPP pasti dari `service_id` → JOIN settings_profit

---

### 🟢 FASE 2 — KONFIGURASI DARI DATABASE

> **Goal:** Semua angka konfigurasi dari DB, bukan hardcode.

#### 2.1 — Tambah Field ke `settings_profit`

| Field | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `base_salary` | INTEGER | 0 | Base fee per role |
| `target_komponen` | TEXT[] | | Array deskripsi komponen target |

#### 2.2 — Update Engine

- Base salary dibaca dari `settings_profit.base_salary` tiap peran
- Hapus hardcode `50k, 50k, 50k, 50k, target-200k`

#### 2.3 — Update UI Settings

- Form edit settings_profit bisa atur base salary

---

### 🟡 FASE 3 — SNAPSHOT BULANAN

> **Goal:** Simpan hasil perhitungan profit tiap bulan.  
> Data ga berubah meskipun order lama diedit.

#### 3.1 — Database Migration: Tabel `profit_snapshots`

```sql
CREATE TABLE profit_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode VARCHAR(7) NOT NULL UNIQUE,  -- '2026-06'
  omset_gross INTEGER NOT NULL,
  alokasi_hpp INTEGER NOT NULL,
  total_komisi INTEGER NOT NULL,
  omset_nett INTEGER NOT NULL,
  target INTEGER NOT NULL,
  dompet JSONB NOT NULL,       -- snapshot distribusi
  komisi_breakdown JSONB,      -- snapshot referral
  order_count INTEGER NOT NULL DEFAULT 0,
  status_calculation VARCHAR(20) DEFAULT 'final',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2 — Generate Snapshot

- Tombol "Generate Laporan Bulan Ini" di ProfitSharing.tsx
- Simpan hasil engine ke `profit_snapshots`
- Kalau sudah ada, tampilkan peringatan "Laporan sudah digenerate. Reset?"

#### 3.3 — Baca dari Snapshot

- Default baca dari `profit_snapshots`
- Fallback ke kalkulasi live kalo belum ada snapshot
- Histori baca dari snapshot

---

### 🟠 FASE 4 — AUDIT DETAIL PER-ORDER

> **Goal:** Audit breakdown per order — tau item mana yang bermasalah.

#### 4.1 — Audit Data Struktur

```typescript
interface OrderAudit {
  orderId: string;
  items: Array<{
    nama: string;
    qty: number;
    hargaAsli: number;
    hargaDiNota: number;
    hppDiAssign: number;
    statusHPP: 'match' | 'fallback' | 'not-found';
    statusHarga: 'match' | 'fallback' | 'not-found';
  }>;
  gross: number;
  hppTotal: number;
  nett: number;
}
```

#### 4.2 — UI Audit Table

- Tab/panel "Audit Per-Order" di ProfitSharing.tsx
- Tabel dengan status hijau/kuning/merah per item
- Filter: show only items with issues

#### 4.3 — Auto-Flag

- Baris audit summary di dashboard profit:
  - ✅ `N item clean`
  - ⚠️ `N item dengan HPP fallback`
  - ❌ `N item tanpa HPP`
  - ❌ `N item tanpa harga lookup`

---

### 🔴 FASE 5 — LAPORAN KEUANGAN LENGKAP

> **Goal:** Laporan standar: Laba Rugi, Buku Besar, Distribusi.

#### 5.1 — Laba Rugi (P&L)

```
PENDAPATAN (Revenue)
  - Jasa Cleaning          Rp X
  - Jasa Repair            Rp Y
  - Produk Store           Rp Z
  ─────────────────────
  TOTAL PENDAPATAN         Rp X+Y+Z

BIAYA (Costs)
  - HPP Cleaning           Rp A
  - HPP Repair             Rp B
  - Komisi Referral        Rp C
  ─────────────────────
  TOTAL BIAYA              Rp A+B+C

LABA BERSIH                Rp (X+Y+Z) - (A+B+C)

DISTRIBUSI LABA
  - Owner                  Rp ...
  - Spesialis Cuci         Rp ...
  - Spesialis Repair       Rp ...
  - Admin                  Rp ...
  - Engineer Web           Rp ...
  - Kas Danee              Rp ...
  - Zakat                  Rp ...
  - Investor               Rp ...
  ─────────────────────
  TOTAL DISTRIBUSI         Rp LABA BERSIH ✅
```

#### 5.2 — Export Laporan

- Export ke PDF / CSV
- Bisa dikirim via WA

---

## 📊 Timeline Prioritas

```
Seminggu 1    │ FASE 1 ── Migration DB + Form Orders + Engine update
Seminggu 2    │ FASE 2 ── Config DB + Base salary
Seminggu 3    │ FASE 3 ── Snapshot bulanan
Seminggu 4    │ FASE 4+5 ── Audit detail + Laporan keuangan
```

---

## ⚠️ Resiko & Mitigasi

| Resiko | Mitigasi |
|--------|----------|
| **Data existing ilang** | Migration backfill + fallback parsing di engine. Order lama tetap terbaca. |
| **Form terlalu complex** | Fase 1.3 dibagi sub-fase: dropdown dulu, baru qty field |
| **Snapshot out of sync** | Ada tombol "Regenerate" + cache buster |
| **Performa drop** | Index di order_items.order_id, snapshot baca cepat |

---

## ✅ Kriteria Selesai

- [ ] Input pesanan pake dropdown service (bukan string bebas)
- [ ] HPP akurat dari service_id
- [ ] Qty diinput user, bukan tebakan engine
- [ ] Base salary dari database
- [ ] Snapshot profit per bulan tersimpan
- [ ] Audit per-order: tiap item keliatan status HPP + hargaLookup
- [ ] Laporan Laba Rugi standar
- [ ] Histori stabil (ga berubah walau order lama diedit)

---

## 📝 Catatan

- Orders lama tetap pake `orders.layanan` (TEXT) — engine fallback
- Semua migration SQL dibuat idempotent (IF NOT EXISTS / DROP IF EXISTS)
- Setiap FASE di-commit terpisah, biar gampang rollback
- Test via `npm run dev` sebelum commit
