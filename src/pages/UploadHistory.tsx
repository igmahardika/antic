import React, { useEffect, useState } from 'react';
import { listUploadHistory, deleteByFile } from '../services/uploadSessions';
import type { IUploadSession, UploadDataType } from '../types.upload';

export default function UploadHistory() {
  const [dataType, setDataType] = useState<UploadDataType | ''>('');
  const [sessions, setSessions] = useState<IUploadSession[]>([]);

  const load = async () => setSessions(await listUploadHistory(dataType || undefined));
  useEffect(() => { load(); }, [dataType]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Upload History</h2>
      <div className="flex items-center gap-2 mb-4">
        <select className="border rounded p-2" value={dataType} onChange={e => setDataType(e.target.value as any)}>
          <option value="">All</option>
          <option value="tickets">Tickets</option>
          <option value="incidents">Incidents</option>
          <option value="customers">Customers</option>
        </select>
        <button className="border rounded px-3 py-2" onClick={load}>Refresh</button>
      </div>
      <div className="grid gap-3">
        {sessions.map(s => (
          <div key={s.id} className="rounded-xl border p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{s.fileName}</div>
              <div className="text-sm opacity-70">
                {s.dataType} • {new Date(s.uploadTimestamp).toLocaleString()} • {s.status} • {s.successCount}/{s.recordCount}
              </div>
            </div>
            <button
              className="px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
              disabled={s.status === 'deleted'}
              onClick={async () => {
                const { deletedCount } = await deleteByFile(s.fileName, s.dataType);
                alert(`Terhapus ${deletedCount} record dari ${s.fileName}`);
                load();
              }}
            >
              Delete by File
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
