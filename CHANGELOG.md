# CHANGELOG

## [2025 Stack Upgrade] - 2024-07-14

### Major
- Upgrade seluruh dependency ke versi stabil/patch terbaru (React 19, Tailwind 4, TanStack Query 5, Zustand 5, Vitest 3, ESLint 9, MySQL2 3.14, Express 5.1, dsb)
- Migrasi frontend ke React 19 (codemod) dan Tailwind 4 (config baru)
- Hapus semua lucide-react, gunakan MUI icons sesuai standar
- Perbaiki tailwind.config.ts ke format v4
- Perbaiki tsconfig.json: moduleResolution bundler, isolatedModules, verbatimModuleSyntax

### Backend
- Refactor backend: gunakan dotenv untuk kredensial, pool mysql2/promise, bcrypt (ganti bcryptjs), hapus body-parser
- Semua kredensial DB diambil dari .env, tidak ada hard-coded
- Endpoint /health untuk health check

### Lain-lain
- Linting dan autofix seluruh kode (ESLint, Prettier)
- Unit test (vitest) hijau, environment test node
- Dev server (Vite) dan backend Express berjalan normal
- Dependabot clean, siap produksi 2025

---

**Catatan:**
- Semua breaking change sudah diatasi, seluruh fitur utama dan komputasi berjalan normal.
- Silakan cek README.md untuk instruksi setup baru. 