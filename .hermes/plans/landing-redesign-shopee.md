# Landing Page Redesign — Shopee Style

## Tujuan
Ubah landing page dari tampilan "web biasa" (hero + section + footer) menjadi **mobile app style ala Shopee** — white background, card-based, vertikal scroll dengan elemen yang familiar di e-commerce apps.

## Prinsip
✅ Semua konten yang sekarang ADA tetap dipertahankan — tidak ada yang dihapus
✅ Hanya tata letak dan gaya visual yang disesuaikan
✅ Fokus pada mobile-first (HP), desktop menyesuaikan
✅ Grid 2 kolom untuk layanan & produk (kaya Shopee)
✅ Warna putih dominan dengan aksen biru brand

---

## Struktur Baru (dari atas ke bawah)

### 1. 🔝 Top App Bar (Shopee-style)
**Ganti navbar hitam/biru menjadi top bar putih ala Shopee.**
```
┌──────────────────────────────┐
│  👟 Danee Shoes    🔔  🛒   │
│  ┌──────────────────────┐    │
│  │ 🔍 Cari layanan...   │    │
│  └──────────────────────┘    │
└──────────────────────────────┘
```
- Background putih, ikon brand kiri
- Search bar di bawahnya (full-width, rounded)
- Ikon notifikasi + keranjang (kanan) — keranjang link ke WA
- Sticky di atas

### 2. 🏷️ Banner Promo (Carousel)
**Ganti hero gradient dengan banner promo slide.**
- Background putih dengan card promo
- Slide gambar promo (bisa di-scroll horizontal)
- Dot indicator di bawah
- Konten hero (tagline, subtitle, CTA) dipindah ke card-carousel ini
- Tombol "Order via WA" + "Cek Status" tetap ada di dalam banner
- Lokasi tetap tampil (Purwakarta)

### 3. 📋 Kategori Layanan (Grid 2×4)
**Ganti section "Menu Jasa" jadi grid ikon kategori ala Shopee.**
```
┌──────┐┌──────┐┌──────┐┌──────┐
│ 👟   ││ 🔧  ││ ✨   ││ 🧴  │
│ Cuci ││Repar.││Express││Produk│
└──────┘└──────┘└──────┘└──────┘
```
- Lingkaran/icon bulat + label
- Dari data `activeServices` (kategori unik)
- Tap → scroll ke detail layanan di bawah

### 4. ⚡ Promo / Flash Sale (horizontal scroll)
**Card promo berisi diskon atau paket hemat, timer countdown.**
- Hanya tampil jika ada diskon dari `kontenList`
- Horizontal scroll card
- Setiap card: gambar promo + deskripsi + tombol "Order"

### 5. 🧹 Daftar Layanan Lengkap (Grid 2 Kolom)
**Semua `activeServices` ditampilkan sebagai kartu 2 kolom.**
```
┌──────────┐ ┌──────────┐
│ 👟 Cuci  │ │ 🔧 Repar.│
│ Sepatu   │ │ Sepatu   │
│ Rp25.000 │ │ Rp40.000 │
│ [Order]  │ │ [Order]  │
└──────────┘ └──────────┘
```
- Setiap kartu: icon besar, nama, badge kategori (Cleaning/Repair), harga, deskripsi (clamp 2 baris), tombol Order
- Coming Soon: overlay "Segera Hadir", opacity 0.5
- Tap Order → Delivery Modal (sama seperti sekarang)

### 6. 🛍️ Produk Store (Grid 2 Kolom)
**Section `storeList` — sama seperti sekarang tapi 2 kolom dengan foto.**
- Foto produk (aspect ratio 1:1)
- Nama produk, harga, stok badge
- Tombol "Beli via WA"
- Stok habis: overlay "Stok Habis"

### 7. 🔍 Tracking Order
**Section tracking — desain dirapikan, card style ala Shopee.**
- Input cari + tombol "Cek" dibungkus card putih
- Hasil tracking: card putih dengan kode + status badge + detail
- Sama persis fungsionalitasnya

### 8. 📖 Konten + Testimoni
**Section edukasi & testimoni — grid 2 kolom dengan foto.**
- Edukasi: card dengan gambar + judul
- Testimoni: card dengan foto profil + nama
- Instagram & YouTube link dipindah ke sini (bukan di footer)

### 9. 📄 Footer Minimal
**Footer versi ringkas.**
- Brand name + tagline
- Social icons (Instagram, YouTube, WhatsApp, Maps)
- Admin login link
- Copyright

---

## Elemen yang TETAP SAMA

| Fitur | Status |
|---|---|
| `activeServices` dari database | ✅ Konten sama, tampilan grid 2 kolom |
| `storeList` dari database | ✅ Konten sama, tampilan grid 2 kolom |
| `kontenList` (edukasi + testimoni) | ✅ Konten sama |
| `trackOrder` + hasil tracking | ✅ Fungsi sama, desain dirapikan |
| Nomor WA dari settings | ✅ Tetap |
| Delivery modal (antar/jemput) | ✅ Sama persis |
| Coming Soon badge | ✅ Tetap |
| Stok Habis badge | ✅ Tetap |
| Order via WhatsApp flow | ✅ Sama persis |

## Elemen yang BERUBAH

| Lama | Baru |
|---|---|
| Navbar biru dengan hamburger | Top bar putih dengan search + notif + cart |
| Hero gradient biru gelap | Banner promo card putih bisa slide |
| Section title + grid 1 kolom | Kategori grid 2 baris + grid layanan 2 kolom |
| Footer panjang | Footer minimal |

## Data Flow
- Semua data tetap dari Supabase via service yang sama
- Tidak perlu ubah backend/service
- Hanya komponen JSX + CSS yang diubah
- Inline styles di Landing.tsx diganti CSS classes biar rapi

---

## Langkah Implementasi
1. Buat CSS classes baru untuk Shopee-style components (top-bar, kategori grid, promo banner, product card 2-col)
2. Tulis ulang JSX Landing.tsx dengan struktur baru
3. Hapus inline `<style>` block (pindah ke index.css atau file CSS terpisah)
4. Test di HP via dev server
5. Build & commit

## Catatan
- Warna dominan: putih (#fff) + biru brand (#034BB9) + abu (#f1f5f9)
- Font tetap Poppins
- Ikon pake Material Symbols (sudah ada)
- Animasi transisi halus (0.2s ease)
