# AN-TIC Analytics Dashboard

## Overview
AN-TIC adalah aplikasi dashboard analitik modern untuk monitoring performa agent, tiket, dan customer secara profesional. Dirancang dengan UI/UX modern, clean, dan responsif menggunakan React, Tailwind CSS, dan IndexedDB (Dexie) untuk penyimpanan lokal.

---

## Fitur Utama
- **Autentikasi & Manajemen User**: Login multi-browser, admin panel, role & permission, export/import user.
- **Routing & Navigasi**: Sidebar modern, semua menu selalu tampil, routing terstruktur.
- **Dashboard Analitik**: Customer, Ticket, dan Agent Analytics dengan filter waktu canggih.
- **Master Data Agent**: Tabel agent otomatis dari data tiket, dengan metrik profesional:
  - Nama, Tahun Aktif (badge), Jumlah Tiket
  - Masa Aktif Handle (format singkat: `2 thn 10 bln 18 hr`)
  - Rata-rata Durasi, Jumlah Customer Unik
  - Jumlah Tiket Selesai di Hari yang Sama
  - Jumlah Escalation (menggunakan logika escalation konsisten seluruh aplikasi)
- **UI/UX Modern**: Tabel zebra, header biru bold, hover effect, rounded-xl, shadow, padding airy, responsive.
- **Filtering & Aggregasi**: Filter waktu unified, default ke data terbaru, semua komponen downstream ikut filter.
- **Dark Mode**: Dukungan penuh dark mode dengan standar warna konsisten.
- **Virtualized Table**: Tabel besar tervirtualisasi (react-window) untuk performa optimal.
- **Web Worker**: Komputasi berat (KPI agent) di-offload ke Web Worker.
- **Structured Logging**: Backend pakai Pino, log terstruktur siap produksi.
- **CI/CD**: GitHub Actions otomatis lint, test, build.

---

## Highlight Perubahan Terbaru
- Tabel Master Data Agent dirombak total: urutan kolom lebih logis, metrik lebih relevan, tampilan modern dan profesional.
- Format masa aktif handle kini singkat dan mudah dibaca (`2 thn 10 bln 18 hr`).
- Logika escalation kini konsisten dengan halaman analitik lain.
- Semua style tabel mengikuti best practice 2024: airy, clean, responsif, dan mudah dibaca.
- **Keamanan backend**: JWT, helmet, rate-limit, CORS whitelist, env var.
- **Repo hygiene**: .gitignore, Husky, lint-staged, commitlint.
- **Testing**: Vitest, coverage, contoh unit test.
- **Logging**: Pino structured logging di backend.
- **CI/CD**: GitHub Actions lint, test, build otomatis.

---

## Struktur Proyek
- `src/components/` — Komponen utama (Dashboard, Analytics, MasterDataAgent, dsb)
- `src/pages/` — Halaman utama (Login, Admin, NotFound, dsb)
- `src/lib/` — Utilitas dan koneksi IndexedDB
- `src/store/` — State management
- `src/utils/` — Helper dan test
- `antic-backend/` — Backend Express (API, auth, user CRUD, logging)
- `.github/workflows/` — Pipeline CI/CD

---

## Instalasi & Setup
1. **Clone repo:**
   ```bash
   git clone https://github.com/igmahardika/antic.git
   cd antic
   ```
2. **Install dependencies (pakai pnpm):**
   ```bash
   pnpm install
   ```
3. **Setup environment backend:**
   Buat file `antic-backend/.env`:
   ```env
   DB_HOST=localhost
   DB_USER=antic
   DB_PASS=superSecret123
   DB_NAME=antic
   JWT_SECRET=changeMe
   CORS_ORIGIN=http://localhost:5173
   ```
4. **Jalankan backend:**
   ```bash
   pnpm --filter antic-backend run dev
   # atau
   node antic-backend/server.mjs
   ```
5. **Jalankan frontend:**
   ```bash
   pnpm run dev
   ```
6. **Akses aplikasi:**
   Buka [http://localhost:5173](http://localhost:5173)

---

## Pipeline & Testing
- **Lint, test, build otomatis:**
  - Setiap push/PR akan otomatis lint, test, dan build via GitHub Actions.
- **Testing lokal:**
  ```bash
  pnpm test
  # atau
  pnpm run test:watch
  ```
- **Coverage:**
  - Laporan coverage otomatis dihasilkan setiap test.

---

## Kontribusi
- Pull request dan issue sangat diterima.
- Ikuti standar kode, UI/UX, dan penamaan yang sudah ada.
- Pastikan fitur baru responsif, clean, dan konsisten dengan style dashboard.

---

## Lisensi
MIT
