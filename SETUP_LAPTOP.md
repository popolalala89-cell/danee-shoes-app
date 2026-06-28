# Setup Hermes + Danee Shoes App di Laptop (WSL)

> Tutorial lengkap — tinggal copas perintah di WSL (Ubuntu) laptop.

## Prasyarat

- Laptop sudah terinstall **Hermes Agent** (jalan di WSL Ubuntu)
- **GitHub** udah login (`gh auth status` atau `git config --global user.name`)
- Repo: `github.com/popolalala89-cell/danee-shoes-app`

---

## 1. Clone Repo

```bash
cd ~
git clone https://github.com/popolalala89-cell/danee-shoes-app.git
cd ~/danee-shoes-app
```

---

## 2. Install Node.js + npm

Cek dulu:

```bash
node --version && npm --version
```

Kalau belum ada:

```bash
sudo apt update
sudo apt install nodejs npm -y
# atau pake nvm kalo mau versi lebih baru
```

---

## 3. Install Dependencies Project

```bash
cd ~/danee-shoes-app
npm install
```

---

## 4. Buat File `.env`

Buat file `.env` di `~/danee-shoes-app/`:

```bash
nano .env
```

Isinya:

```
VITE_SUPABASE_URL=https://faqueaejsbkmpurjmubv.supabase.co
VITE_SUPABASE_ANON_KEY=<isi dari .env di HP>
```

> **Ambil anon key dari HP:**
> ```bash
> cat ~/danee-shoes-app/.env | grep VITE_SUPABASE_ANON_KEY
> ```
> Copy outputnya, paste ke `.env` di laptop.

---

## 5. Sync Skill Hermes

Agar Hermes di laptop tahu cara kerja project Danee Shoes, copy skill dari HP atau install ulang.

**Cara A — Copy langsung dari HP (via SSH/scp atau USB):**

Di laptop (WSL):

```bash
mkdir -p ~/.hermes/skills/software-development
```

Terus copy folder `danee-shoes-care/` dari `~/.hermes/skills/software-development/` di HP ke folder yang sama di laptop.

**Cara B — Install manual (copy dari project ai-context):**

Skill Danee Shoes sebenarnya isinya panduan project — Hermes bakal bisa bantu meski tanpa skill, asal ada file `ai-context/` dan `AGENTS.md` di project. Cukup jalanin Hermes dari folder project:

```bash
cd ~/danee-shoes-app
hermes
```

Nanti Hermes bisa baca `ai-context/AGENTS.md` sendiri.

**Cara C — Pull dari repo (skill disimpan di repo):**

```bash
# Jalanin hermes dari folder project, skill akan terload otomatis
cd ~/danee-shoes-app
hermes -s danee-shoes-care
```

---

## 6. Test — Jalanin Dev Server

```bash
cd ~/danee-shoes-app
npx vite --host 0.0.0.0 --port 5173
```

Buka `http://localhost:5173` di browser laptop.

---

## 7. Test — Build

```bash
cd ~/danee-shoes-app
npm run build
```

Kalau build sukses, semua siap.

---

## 8. Cara Pake Hermes Buat Coding

**Di WSL laptop, jalanin:**
```bash
cd ~/danee-shoes-app
hermes -s danee-shoes-care
```

Nanti Hermes bakal:
- Paham struktur project Danee Shoes
- Bisa baca/edit file di `src/`
- Bisa jalanin `npm run build` buat cek
- Bisa commit & push ke GitHub

---

## Sync HP ↔ Laptop

Karena project di GitHub, workflow-nya:

| HP (Termux) | Laptop (WSL) |
|-------------|--------------|
| `git add -A && git commit -m "..." && git push` | `git pull` |
| `git pull` | `git add -A && git commit -m "..." && git push` |

**Jangan kerja di dua tempat tanpa pull dulu** — bisa conflict.

---

## Ringkasan Perintah Penting

```bash
# Dev server
cd ~/danee-shoes-app && npx vite --host 0.0.0.0 --port 5173

# Build
cd ~/danee-shoes-app && npm run build

# Hermes
cd ~/danee-shoes-app && hermes -s danee-shoes-care

# Git push
cd ~/danee-shoes-app && git add -A && git commit -m "feat: ..." && git push

# Git pull
cd ~/danee-shoes-app && git pull
```
