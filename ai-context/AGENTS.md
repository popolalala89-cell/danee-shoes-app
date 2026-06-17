# AGENTS.md — Wajib Dibaca oleh Setiap AI Agent

> **Versi:** 1.0 | **Terakhir diupdate:** 16 Juni 2026
>
> **PERHATIAN:** Kamu adalah AI agent yang bekerja di project **Danee Shoes Care**.
> BACA SELURUH file ini SEBELUM menulis atau mengubah kode apa pun.
> File ini adalah **kontrak kerja** antara human (Pa Popo) dan AI agent (kamu).

---

## 🚨 ATURAN PERTAMA & TERPENTING

### 1. JANGAN MULAI CODING SEBELUM BACA DOKUMENTASI

Setiap kali kamu menerima tugas, baca dokumen berikut **dengan urutan ini:**
1. `ai-context/CURRENT_STATE.md` — kondisi project saat ini
2. `ai-context/PROJECT_MEMORY.md` — sejarah & konteks historis
3. `ai-context/ERROR_HISTORY.md` — error yang pernah terjadi (cegah repetisi)
4. `ai-context/LESSONS_LEARNED.md` — pelajaran dari error & keputusan
5. `ai-context/TASK_BOARD.md` — apa yang sedang dikerjakan
6. `ai-context/DECISIONS.md` — keputusan teknis yang sudah dibuat

### 2. JANGAN UBAH ARSITEKTUR TANPA PERSETUJUAN

- Jangan tambah dependency npm baru tanpa tanya dulu
- Jangan ubah database schema tanpa migration SQL + update docs
- Setiap keputusan teknis HARUS dicatat di `ai-context/DECISIONS.md`

### 3. JANGAN HAPUS KODE EXISTING

- Project ini sudah berjalan. Kode yang ada sudah bekerja.
- Kalau mau refactor, pastikan behavior tidak berubah.
- Kalau mau hapus, pastikan tidak ada yang pakai.

### 4. WAJIB CATAT ERROR DI ERROR_HISTORY.md

Setiap kali terjadi error/bug, kamu WAJIB mencatatnya di `ai-context/ERROR_HISTORY.md` dengan format:
- Tanggal
- Gejala error
- Langkah reproduksi
- Root cause
- File terdampak
- Solusi yang diterapkan
- Status (✅ Fixed / 🚧 In Progress / ⬜ Known)

### 5. JANGAN MODIFIKASI APPSCRIPT

Backend GAS sudah dikembalikan ke aslinya. Jangan ubah file di `gas/` atau push ke GAS.
Semua backend baru menggunakan **Supabase**.

---

## 📋 Alur Kerja Agent

### Sebelum Mengerjakan Tugas
1. Baca 6 file wajib (lihat aturan #1 di atas)
2. Baca file yang akan diubah (pakai `read_file`)
3. Cek `ERROR_HISTORY.md` — apakah error serupa pernah terjadi?
4. Cek `LESSONS_LEARNED.md` — apakah ada pelajaran relevan?
5. Konfirmasi pemahaman ke user jika ambigu

### Saat Mengerjakan Tugas
1. Tulis kode sesuai aturan di file terkait
2. Jangan break fitur yang sudah ada
3. Jika menemui error, catat di `ERROR_HISTORY.md`
4. Jika solusi butuh perubahan besar, catat alasan di `DECISIONS.md` dulu

### Setelah Mengerjakan Tugas
1. Update `CURRENT_STATE.md`
2. Update `TASK_BOARD.md` (mark selesai)
3. Update `ERROR_HISTORY.md` jika ada error yang difix
4. Update `LESSONS_LEARNED.md` jika ada pelajaran baru
5. Catat keputusan di `DECISIONS.md` jika ada keputusan baru
6. Commit dengan format: `feat:` / `fix:` / `docs:` / `refactor:`

---

## 🚪 COMPLETION GATE

> **ATURAN MUTLAK:** Setiap task BELUM dianggap selesai sampai dokumentasi wajib diperbarui.
> AI agent DILARANG menyatakan task selesai sebelum Completion Gate terpenuhi.

### Sebelum Menyatakan Task Selesai, AI Agent Wajib:
1. **Menjelaskan file yang diubah** — sebutkan path, alasan perubahan, dan dampaknya.
2. **Memperbarui `ai-context/CURRENT_STATE.md`** — update versi, status fitur, ringkasan perubahan.
3. **Memperbarui `ai-context/TASK_BOARD.md`** — mark task yang selesai (✅ done).
4. **Memperbarui `CHANGELOG.md`** — catat perubahan dengan format: versi, tanggal, jenis, deskripsi.
5. **Memperbarui `ai-context/DECISIONS.md`** — jika ada keputusan teknis baru.
6. **Memperbarui `ai-context/ERROR_HISTORY.md`** — jika task berkaitan dengan bug/error.
7. **Memperbarui `ai-context/LESSONS_LEARNED.md`** — jika ada pelajaran penting.

### Checklist Wajib di Akhir Setiap Task
```
## ✅ Completion Gate Checklist

- [ ] Kode sudah diubah / commit sudah dipush
- [ ] CURRENT_STATE.md sudah diperbarui
- [ ] TASK_BOARD.md sudah diperbarui
- [ ] CHANGELOG.md sudah diperbarui
- [ ] DECISIONS.md diperbarui (jika ada keputusan teknis baru)
- [ ] ERROR_HISTORY.md diperbarui (jika task berkaitan dengan bug/error)
- [ ] LESSONS_LEARNED.md diperbarui (jika ada pelajaran penting)
```

### Konsekuensi Pelanggaran
- Task yang dinyatakan selesai tanpa Completion Gate = **TIDAK SAH.**
- AI agent WAJIB mengulang dari langkah dokumentasi yang terlewat.

---

## 🧠 Konteks Project

### Apa ini?
**Danee Shoes Care** — aplikasi manajemen bisnis cuci sepatu & reparasi di Purwakarta.
Fitur: Landing page publik + Admin panel (11 menu) untuk mengelola order, inventory, cashflow, profit sharing.

### Tech Stack
- **React 19 + TypeScript** → Frontend framework
- **Vite** → Build tool
- **Capacitor 8** → Bungkus web app jadi APK Android
- **Supabase** → Backend (PostgreSQL + Auth + Storage)
- **GitHub Actions** → CI/CD build APK

### Kondisi Saat Ini
- **Versi:** 2.0 (migrasi dari GAS ke Supabase)
- **Frontend:** React + TypeScript dengan Material Design
- **Backend LAMA:** Google Apps Script (gas/Code.js) — SUDAH DIKEMBALIKAN KE ASLI
- **Backend BARU:** Supabase (dalam proses pembuatan)

### Aturan Khusus
1. **JANGAN** ubah file di `gas/` — itu GAS original yang sudah dikembalikan
2. **JANGAN** push ke GAS (clasp) — backend baru pakai Supabase
3. Semua API call baru via Supabase client, bukan GAS URL
4. UI harus seperti aplikasi Android profesional (Material Design)

---

## 🔗 File Reference Cepat

| Butuh tahu... | Baca... |
|---------------|---------|
| PRD lengkap | `PRD.md` |
| Database schema | `supabase/seed.sql` |
| Aturan bisnis detail | `GAS_BACKEND_ANALYSIS.md` |
| **Error history** | `ai-context/ERROR_HISTORY.md` |
| **Pelajaran** | `ai-context/LESSONS_LEARNED.md` |
| Sejarah project | `ai-context/PROJECT_MEMORY.md` |
| Keputusan teknis | `ai-context/DECISIONS.md` |
| Kondisi saat ini | `ai-context/CURRENT_STATE.md` |
| Board task | `ai-context/TASK_BOARD.md` |

---

## ⚠️ Hal-Hal yang Sering Salah

1. **JANGAN edit folder `android/`** — itu generated oleh `npx cap sync android`
2. **JANGAN commit ke `.env`** — sudah di `.gitignore`
3. **JANGAN** push ke GAS (clasp) — backend sudah pindah ke Supabase
4. **Content-Type text/plain** bukan lagi diperlukan — pakai Supabase client langsung
5. **Response wrapping** (`{success, data}`) bukan lagi diperlukan — Supabase API sudah consistent
6. **Verifikasi escaping** setelah pakai `patch()` tool — bisa double-escape backslash

---

## 📞 Kontak

- **Human:** Pa Popo
- **Repo:** `github.com/popolalala89-cell/danee-shoes-app`
- **CI/CD:** GitHub Actions (push master → APK)
- **Supabase:** Project baru (URL akan ditentukan)
