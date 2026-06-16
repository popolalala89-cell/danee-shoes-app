# LESSONS_LEARNED.md — Pelajaran Penting

> **Versi:** 1.0 | **Terakhir diupdate:** 16 Juni 2026

## LL-001: GAS + CORS = Masalah Besar
- **Sumber:** Pengembangan v1.x
- **Pelajaran:** Google Apps Script tidak bisa handle OPTIONS preflight dengan baik. Solusi `Content-Type: text/plain` adalah workaround, bukan fix sejati.
- **Dampak:** Memutuskan migrasi ke Supabase yang proper HTTP handling.
- **Aturan Baru:** Jangan gunakan GAS untuk REST API yang perlu diakses dari mobile app.

## LL-002: Response Wrapping Pattern
- **Sumber:** Pengembangan v1.x (getDashboardSummary, getProfitSharingData, getThemeSettings)
- **Pelajaran:** GAS functions return data dengan format inconsistent. Frontend perlu `{success, data}` wrapper.
- **Dampak:** Banyak bug null safety karena frontend expect `res.data` tapi GAS return langsung.
- **Aturan Baru:** Supabase API sudah consistent — tidak perlu wrapping manual.
