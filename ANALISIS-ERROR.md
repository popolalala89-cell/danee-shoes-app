# Analisis Error & Bug — Danee Shoes Care App

## Metodologi
Code review bottom-up: types → utils → client → api → services → components → pages → routing.
Build tool: `tsc -b --noEmit` + `vite build` (sudah lolos setelah fix TS6133).

---

## 🔴 CRITICAL BUG

### 1. profit-service.ts line 727 — Regex Escape Error (HPP Salah Hitung)

**File:** `src/lib/services/profit-service.ts`
**Line 727:**
```ts
const noBrackets = cleanStr.replace(/[.*?]/g, '').trim();
```

**Bug:** Regex `[.*?]` adalah character class yang cocok dengan karakter literal `.`, `*`, atau `?` — **BUKAN** menghapus konten kurung siku `[...]`. 

**Akibat:** Pada audit detail (old order parse path), konten kurung siku TIDAK dihapus, menyebabkan nama item tetap mengandung label promo (e.g., `"Cuci Premium [Diskon 20%]"`). Ini mengakibatkan:
- Keyword HPP matching gagal karena nama masih mengandung `[Diskon 20%]`
- HPP item = 0 (tidak ketemu keyword match)
- Profit dihitung terlalu besar

**Seharusnya (sama seperti line 350 di path utama):**
```ts
const noBrackets = cleanStr.replace(/\[.*?\]/g, '').trim();
```

---

### 2. Referral.tsx — Kode Referral Tidak Tersimpan

**File:** `src/pages/Referral.tsx`
**Lines 63-76 (create) dan 64-69 (update):**

**Bug:** Form mengumpulkan `form.kode` dari user (emptyForm baris 6: `kode: ''`) dan user bisa input kode, namun:
- `createReferral()` dipanggil **tanpa** field `kode`
- `updateReferral()` dipanggil **tanpa** field `kode` dan **tanpa** field `link`

**Akibat:** User memasukkan kode referral dan link di form, tapi data tersebut tidak pernah dikirim ke Supabase. Jika ada DB default/trigger yang generate kode otomatis, kode yang diinput user tetap terbuang.

**Fix:** Tambahkan `kode` dan `link` ke payload create/update.

---

### 3. Referral.tsx — `handleDelete` Hard Delete Bukan Soft Delete

**File:** `src/pages/Referral.tsx`
**Line 99:** Konfirmasi berkata "Nonaktifkan referral" (soft delete) tapi memanggil `deleteReferral()` (hard delete).

**Akibat:** Referral benar-benar terhapus dari DB, bukan dinonaktifkan. Data historis hilang.

---

## 🟡 HIGH SEVERITY

### 4. Code Duplication — Profit Engine ~150 baris duplikat

**File:** `src/lib/services/profit-service.ts`

Dua fungsi hampir identik:
1. Logika HPP parsing internal di `hitungProfitSharing()` (~lines 240-441)
2. Fungsi export `getLaporanAuditDetail()` (~lines 701-857)

Keduanya melakukan:
- Parse layanan text → cari item
- HPP matching via keyword
- Referral commission calculation
- Gross/HPP accumulation

**Akibat:** ~600 lines file jadi 1466 lines. Maintenance nightmare — bug di satu fungsi (seperti #1 di atas) tidak otomatis ter-fix di fungsi lainnya. Jika ada perubahan business logic HPP, harus diedit 2 tempat.

---

### 5. Orders.tsx — Subtotal Struk Menampilkan Harga Setelah Diskon

**File:** `src/pages/Orders.tsx`
**Lines 1184-1248**

**Bug Konseptual:** `parseLayananItems()` mengekstrak `hargaSatuan` dari string layanan yang sudah mengandung harga setelah diskon per-item. Kemudian:
- `subtotal` (line 1186) = jumlah harga setelah diskon per-item
- `diskonNominal` (line 1187) = diskon global dari `diskon_info`
- Keduanya ditampilkan sebagai baris terpisah di struk

**Akibat:** Pelanggan melihat subtotal yang sebenarnya sudah termasuk diskon per-item, lalu ada potongan global lagi — ini membingungkan. Total akhir (`cetakStruk.harga`) sudah benar karena dihitung server-side, tapi display subtotalnya tidak informatif.

---

### 6. dashboard-service.ts line 78 — Typecast Sembarangan

**File:** `src/lib/services/dashboard-service.ts`
**Line 78:**
```ts
...(statusCounts as any),
```

**Bug:** `statusCounts` di-spread ke `DashboardSummary` yang tidak memiliki field untuk status counts. TypeScript `as any` bypasses type checking.

**Akibat:** Jika ada field dari `statusCounts` yang bentrok dengan properti `DashboardSummary` (misal field `total`), akan overwrite nilai yang benar. Juga, data mentah (raw Supabase) bisa bocor ke interface yang sudah didefinisikan dengan ketat.

---

### 7. Penjualan.tsx — Tidak Validasi/Mengurangi Stok

**File:** `src/pages/Penjualan.tsx`
**Lines 57-64**

**Bug:** `createSale()` mencatat penjualan tapi tidak:
- Memvalidasi stok tersedia (`product.stok >= qty`)
- Mengurangi stok setelah penjualan

**Akibat:** Stok produk tidak pernah berkurang saat ada penjualan. Inventory tidak akurat.

---

### 8. Settings.tsx — Terlalu Besar (969 lines)

**File:** `src/pages/Settings.tsx`
**Lines:** 969

**Issue:** Satu komponen menangani: User Management, PIN Settings, QRIS Settings, Basic Settings.
- Semua state dan logic tercampur
- `togglePermission` dibuat ulang di setiap render
- Sulit di-test dan di-maintain

**Saran:** Pecah jadi komponen terpisah: `UserManager.tsx`, `PinSettings.tsx`, `QrisSettings.tsx`.

---

## 🟢 MEDIUM / LOW SEVERITY

### 9. order-service.ts — Kode Order Duplikasi Potensial

**File:** `src/lib/services/order-service.ts`

**Issue:** Komentar DB bilang "Auto-generates kode via DB trigger" tapi code manual generate kode via `Date.now()` + `Math.random()`. Kalau ada 2 order di ms yang sama, bisa duplicate.

**Saran:** Hapus kode manual generation dan andalkan DB trigger, atau gunakan UUID/cuid2 yang proper.

---

### 10. auth.tsx — Cleanup Promise Ungraceful

**File:** `src/lib/auth.tsx`
**Line 94:**
```ts
cleanup.then(fn => fn?.());
```

**Issue:** `cleanup` adalah Promise yang mungkin resolve dengan `undefined`. Optional chaining `fn?.()` menangani itu, tapi pattern ini rentan jika `fn` bukan function.

---

### 11. Ringkasan.tsx — `formatCurrency` dari IDR Region Hardcode

**File:** `src/lib/utils.ts`
**Lines 1-8**

**Issue:** `formatCurrency` hardcode locale `id-ID` dan currency `IDR`. Meskipun OK untuk bisnis Indonesia, fungsi tidak bisa di-reuse untuk keperluan lain. Nilai pecahan desimal di-set ke 0 (`minimumFractionDigits: 0, maximumFractionDigits: 0`), yang bisa menyebabkan pembulatan tidak terlihat di UI.

---

### 12. Landing.tsx — Banner HTML dari Edukasi Konten

**File:** `src/pages/Landing.tsx`

**Issue:** `bannerItems` berasal dari `edukasiList` (line 216-218). Jika konten edukasi mengandung HTML (yang mungkin terjadi karena rich text editor di admin panel), konten ini di-render langsung tanpa sanitasi di carousel. Potensi XSS jika konten tidak dibersihkan.

---

### 13. konten-service.ts — Campur Aduk Export

**File:** `src/lib/services/konten-service.ts`

**Issue:** File ini mengekspor fungsi untuk:
- Konten web CRUD (`getAll`, `createKonten`, dll)
- Diskon event CRUD (`getAllDiskon`, `createDiskon`, dll)
- Referral CRUD (`getAllReferral`, `createReferral`, dll)

Semua bisnis logic tercampur dalam satu file. Sebaiknya dipisah: `content-service.ts`, `discount-service.ts`, `referral-service.ts`.

---

### 14. ProfitSharing.tsx — Format Lapangan Input

**File:** `src/pages/ProfitSharing.tsx`
**Lines 148-161**

**Issue:** `penCapaian = data.omsetNett / (data.target || 1) * 100` — jika target = 0, dibagi 1 (safety division by zero). Tapi ini menampilkan persentase yang tidak berarti.

---

### 15. CSS/UI Inconsistency

- **Orders.tsx** menggunakan `setError` manual state → alert box, bukan `Snackbar` system yang sudah ada
- Beberapa halaman (Ringkasan, Settings) juga pakai alert box sendiri → tidak konsisten
- **AdminLayout.tsx** → `getPageTitle()` function defined inside component body (not memoized)
- Beberapa page menggunakan inline styles, beberapa pakai CSS classes → inconsistent

---

## ✅ Summary

| Severity | Count | Key Issues |
|----------|-------|-----------|
| 🔴 Critical | 3 | Regex escape (HPP salah), Referral kode hilang, Referral hard delete |
| 🟡 High | 4 | Code duplication, Struk subtotal ambigu, Dashboard typecast, Stok tidak terdecrement |
| 🟢 Medium | 5 | Kode order duplikasi, auth cleanup, konten-service campur aduk, dll |
| Info | 2 | Build SUCCESS, CSS inconsistency |

## Status Build
✅ `tsc -b --noEmit` — Clean (after removing unused `total` on line 1188)
✅ `vite build` — Success (109 modules, 499ms, bundle ~707 KB)

⚠️ **Prioritas Fix:** Bug #1 (regex escape di profit-service) adalah yang paling critical karena langsung mempengaruhi perhitungan laba.
