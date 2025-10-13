// Auto-generated: file fingerprint utilities
export const generateBatchId = () =>
  `batch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
