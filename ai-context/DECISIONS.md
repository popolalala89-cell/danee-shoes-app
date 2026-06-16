# DECISIONS.md — Keputusan Teknis

> **Versi:** 1.0 | **Terakhir diupdate:** 16 Juni 2026

## DEC-001: Migrasi dari GAS ke Supabase
- **Tanggal:** 16 Juni 2026
- **Keputusan:** Pindah backend dari Google Apps Script + Google Sheets ke Supabase (PostgreSQL + Auth + Storage)
- **Alasan:** CORS issues, performance, auth, scalability
- **Dampak:** Frontend React harus refactor total dari callGAS ke Supabase client
- **Status:** ✅ Active

## DEC-002: UI/UX Mobile-First Material Design
- **Tanggal:** 16 Juni 2026
- **Keputusan:** Gunakan custom CSS design system (bukan Tailwind/MUI)
- **Alasan:** Control penuh atas tampilan, bundle size lebih kecil, sudah ada implementasi parsial
- **Dampak:** Semua halaman admin akan di-redesign dengan komponen reusable
- **Status:** ✅ Active

## DEC-003: Jangan Sentuh GAS Lagi
- **Tanggal:** 16 Juni 2026
- **Keputusan:** GAS backend sudah dikembalikan ke aslinya. Tidak boleh ada perubahan di `gas/` atau push clasp.
- **Alasan:** User ingin backend baru di Supabase. GAS hanya sebagai referensi.
- **Status:** ✅ Active
