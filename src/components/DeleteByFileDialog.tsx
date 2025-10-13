import React, { useEffect, useState } from 'react';
import { listUploadHistory, deleteByFile } from '../services/uploadSessions';
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
    listUploadHistory(dataType).then(setHistory);
  }, [dataType]);

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true); setErr(null);
    try {
      const { deletedCount, session } = await deleteByFile(selected, dataType);
      onDeleted?.({ fileName: session.fileName, deletedCount });
      onClose();
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
          {history.map(s => (
            <option key={s.id} value={s.fileName}>
              {s.fileName} · {new Date(s.uploadTimestamp).toLocaleString()} · {s.recordCount} rec
            </option>
          ))}
        </select>
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
