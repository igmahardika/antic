// Auto-generated: types for upload sessions & metadata tagging
export type UploadDataType = 'tickets' | 'incidents' | 'customers';
export type UploadStatus = 'uploading' | 'completed' | 'failed' | 'deleted';

export interface IUploadSession {
  id: string;            // batchId
  fileName: string;
  fileHash: string;
  fileSize: number;
  uploadTimestamp: number;
  recordCount: number;
  successCount: number;
  errorCount: number;
  dataType: UploadDataType;
  status: UploadStatus;
  errorLog?: string[];
}
