import { useEffect, useState } from 'react';
import { listUploadHistory, deleteByFile, createUploadSessionForExistingData, cleanupEmptySessions } from '../services/uploadSessions';
import type { UploadDataType, IUploadSession } from '../types.upload';

type Props = {
  dataType: UploadDataType;
  onClose: () => void;
  onDeleted?: (info: { fileName: string; deletedCount: number }) => void;
};

export default function DeleteByFileDialog({ dataType, onClose, onDeleted }: Props) {
  const [history, setHistory] = useState<IUploadSession[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Clean up empty sessions first
        await cleanupEmptySessions(dataType);
        
        let sessions = await listUploadHistory(dataType);
        console.log('Upload history for', dataType, ':', sessions);
        
        // If no sessions found but data exists, create a legacy session
        if (sessions.length === 0) {
          console.log('No upload sessions found, checking for existing data...');
          try {
            const legacySession = await createUploadSessionForExistingData(dataType, 'legacy-data');
            console.log('Created legacy session:', legacySession);
            sessions = [legacySession];
          } catch (error) {
            console.error('Failed to create legacy session:', error);
          }
        }
        
        setHistory(sessions);
      } catch (error) {
        console.error('Error loading upload history:', error);
        setHistory([]);
      }
    };
    loadHistory();
  }, [dataType]);

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true); setErr(null);
    try {
      const { deletedCount, session } = await deleteByFile(selected, dataType);
      
      // Clean up empty sessions and refresh the history list after successful deletion
      await cleanupEmptySessions(dataType);
      const updatedHistory = await listUploadHistory(dataType);
      setHistory(updatedHistory);
      
      // Reset selection
      setSelected('');
      
      onDeleted?.({ fileName: session.fileName, deletedCount });
      
      // Only close if no more files available, otherwise keep dialog open
      if (updatedHistory.length === 0) {
        onClose();
      }
    } catch (e: any) {
      setErr(e.message || 'Gagal menghapus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Hapus Data Berdasarkan File</h3>
        <label className="block text-sm mb-2">Pilih file dari riwayat upload ({dataType})</label>
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— pilih file —</option>
          {history.length === 0 ? (
            <option value="" disabled>Tidak ada file upload untuk {dataType}</option>
          ) : (
            history.map(s => (
              <option key={s.id} value={s.fileName}>
                {s.fileName} · {new Date(s.uploadTimestamp).toLocaleString()} · {s.recordCount} rec
              </option>
            ))
          )}
        </select>
        {history.length === 0 && (
          <p className="text-sm text-gray-500 mb-3">
            Belum ada file yang diupload untuk {dataType}. Upload file terlebih dahulu untuk menggunakan fitur ini.
          </p>
        )}
        {history.length > 0 && history[0].fileName === 'legacy-data' && (
          <p className="text-sm text-blue-600 mb-3">
            Data yang sudah ada sebelumnya akan dihapus sebagai "legacy-data". Upload file baru untuk tracking yang lebih baik.
          </p>
        )}
        {history.length > 0 && (
          <p className="text-sm text-gray-600 mb-3">
            {history.length} file tersedia untuk dihapus. Pilih file dan klik "Hapus Data".
          </p>
        )}
        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 rounded-lg border" onClick={onClose} disabled={loading}>Batal</button>
          <button
            className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
            onClick={handleDelete}
            disabled={!selected || loading}
          >
            {loading ? 'Menghapus…' : 'Hapus Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
