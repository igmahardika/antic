# Smoke Test — Audit Fixes

## Halaman
- Dashboard, SummaryDashboard, Ticket/Agent/Incident/Site/TS Analytics, GridView, KanbanBoard

## Langkah Umum
1. Muat dataset kecil & besar; cek waktu render dan tidak ada crash
2. Verifikasi AHT & resolution rate pada dataset contoh
3. Buka dialog: navigasi keyboard (Tab/Shift+Tab), ESC untuk tutup, fokus kembali ke trigger

## Rollback Plan
- Tag pre-release: `pre-audit-2024-12-19`
- Jika regresi kritikal, `git revert -m 1 <merge_commit>` atau `git checkout tags/pre-audit-2024-12-19`
