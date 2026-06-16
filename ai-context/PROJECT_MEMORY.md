# PROJECT_MEMORY.md — Sejarah Project

> **Versi:** 1.0 | **Terakhir diupdate:** 16 Juni 2026

## Timeline Singkat
- **v1.0** — Aplikasi dibangun dengan Google Apps Script + Google Sheets
- **v1.1** — Frontend React + TypeScript + Capacitor ditambahkan
- **v1.2** — Login, CRUD, dashboard di-frontend dengan GAS backend
- **v1.x** — Berbagai iterasi fixing CORS, response wrapping, null safety
- **v2.0** — **Keputusan: migrasi penuh dari GAS ke Supabase.** GAS dikembalikan ke asli.

## Mengapa Migrasi?
1. GAS tidak bisa handle CORS dengan baik
2. Google Sheets sebagai database lambat dan tidak reliable
3. Tidak ada proper auth (hanya SHA-256 hash)
4. Tidak ada relasi data
5. Tidak bisa scaling
6. Supabase memberikan PostgreSQL + Auth + Storage + REST API out of the box
