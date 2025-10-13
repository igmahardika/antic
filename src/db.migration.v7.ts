// Auto-generated: Dexie migration v7 (uploadSessions + batchId indexes)
// Catatan: Pastikan modul ini diimport sedini mungkin (mis. di src/main.tsx)
import { db } from './lib/db';

// Definisikan versi baru & stores tambahan
// Tidak mengubah definisi versi lama—Dexie menggabungkan urutan version() saat inisialisasi
(db as any).version(7).stores({
  tickets: 'id, uploadTimestamp, batchId, fileHash, fileName',
  incidents: 'id, uploadTimestamp, batchId, fileHash, fileName',
  customers: 'id, uploadTimestamp, batchId, fileHash, fileName',
  uploadSessions: 'id, fileName, fileHash, uploadTimestamp, dataType, status'
}).upgrade(async (tx: any) => {
  // Migrasi ringan untuk memastikan field baru ada (boleh null)
  await tx.table('tickets').toCollection().modify((t: any) => {
    t.batchId ??= null; t.fileName ??= null; t.fileHash ??= null; t.uploadTimestamp ??= t.uploadTimestamp ?? Date.now();
  });
  await tx.table('incidents').toCollection().modify((r: any) => {
    r.batchId ??= null; r.fileName ??= null; r.fileHash ??= null; r.uploadTimestamp ??= r.uploadTimestamp ?? null;
  });
  await tx.table('customers').toCollection().modify((r: any) => {
    r.batchId ??= null; r.fileName ??= null; r.fileHash ??= null; r.uploadTimestamp ??= r.uploadTimestamp ?? null;
  });
});

export {}; // modul tanpa ekspor
