// Auto-generated: upload sessions service
import { db } from '../lib/db';
import type { IUploadSession, UploadDataType } from '../types.upload';
import { generateBatchId, generateFileHash } from '../utils/fileFingerprint';

export const createUploadSession = async (file: File, dataType: UploadDataType) => {
  const fileHash = await generateFileHash(file);
  const id = generateBatchId();
  const session: IUploadSession = {
    id,
    fileName: file.name,
    fileHash,
    fileSize: file.size,
    uploadTimestamp: Date.now(),
    recordCount: 0,
    successCount: 0,
    errorCount: 0,
    dataType,
    status: 'uploading'
  };
  await (db as any).uploadSessions.add(session as any);
  return session;
};

export const finalizeUploadSession = async (sessionId: string, updates: Partial<IUploadSession>) => {
  await (db as any).uploadSessions.update(sessionId, { ...updates } as any);
};

export const deleteByFile = async (fileName: string, dataType: UploadDataType) => {
  const session = await (db as any).uploadSessions
    .where('fileName').equals(fileName)
    .and((s: IUploadSession) => s.dataType === dataType)
    .first();

  if (!session) throw new Error('File tidak ditemukan di riwayat upload');

  let deletedCount = 0;
  if (dataType === 'tickets') {
    deletedCount = await (db.tickets as any).where('batchId').equals(session.id).delete();
  } else if (dataType === 'incidents') {
    deletedCount = await (db.incidents as any).where('batchId').equals(session.id).delete();
  } else {
    deletedCount = await (db.customers as any).where('batchId').equals(session.id).delete();
  }

  // Delete the upload session from database
  await (db as any).uploadSessions.delete(session.id);
  return { session, deletedCount };
};

export const listUploadHistory = async (dataType?: UploadDataType) => {
  const coll = ((db as any).uploadSessions as any).orderBy('uploadTimestamp').reverse();
  return dataType ? (await coll.filter((s: IUploadSession) => s.dataType === dataType).toArray())
                  : (await coll.toArray());
};

// Helper function to create upload session for existing data
export const createUploadSessionForExistingData = async (dataType: UploadDataType, fileName: string = 'legacy-data') => {
  const id = generateBatchId();
  const session: IUploadSession = {
    id,
    fileName,
    fileHash: 'legacy-' + Date.now(),
    fileSize: 0,
    uploadTimestamp: Date.now(),
    recordCount: 0,
    successCount: 0,
    errorCount: 0,
    dataType,
    status: 'completed'
  };
  
  // Count existing records
  let recordCount = 0;
  if (dataType === 'tickets') {
    recordCount = await db.tickets.count();
  } else if (dataType === 'incidents') {
    recordCount = await db.incidents.count();
  } else if (dataType === 'customers') {
    recordCount = await db.customers.count();
  }
  
  session.recordCount = recordCount;
  session.successCount = recordCount;
  
  await (db as any).uploadSessions.add(session as any);
  return session;
};
