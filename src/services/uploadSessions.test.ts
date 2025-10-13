import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db';
import { createUploadSession, deleteByFile, finalizeUploadSession } from './uploadSessions';

// Catatan: Tes ini mensimulasikan lingkungan browser minimal; sesuaikan jika menggunakan jsdom

const mkFile = (name: string, data: string) => new File([new Blob([data])], name);

describe('delete by file', () => {
  beforeAll(async () => {
    // pastikan migrasi ter-load
    await import('../db.migration.v7');
  });

  it('should delete records by session/file', async () => {
    const fake = mkFile('tickets.csv', 'a,b,c');
    const session = await createUploadSession(fake, 'tickets');
    const now = Date.now();

    await (db.tickets as any).bulkPut([
      { id: 't1', uploadTimestamp: now, fileName: fake.name, fileHash: session.fileHash, batchId: session.id, uploadSessionId: session.id },
      { id: 't2', uploadTimestamp: now, fileName: fake.name, fileHash: session.fileHash, batchId: session.id, uploadSessionId: session.id }
    ]);

    await finalizeUploadSession(session.id, { status: 'completed', recordCount: 2, successCount: 2 });
    const res = await deleteByFile('tickets.csv', 'tickets');
    expect(res.deletedCount).toBe(2);
  });
});
