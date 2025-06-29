import React, { useMemo, useState } from 'react';
import { ITicket } from '@/lib/db';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const columns = [
  { key: 'customerId', label: 'Customer ID' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'description', label: 'Description' },
  { key: 'cause', label: 'Cause' },
  { key: 'handling', label: 'Handling' },
  { key: 'openTime', label: 'Open Time', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'closeTime', label: 'Close Time', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'duration', label: 'Duration', render: (v, row) => row.duration?.formatted || '-' },
  { key: 'openBy', label: 'Agent' },
];

const GridView = ({ data }: { data?: ITicket[] }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val && String(val).toLowerCase().includes(s);
      })
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  return (
    <div className="overflow-x-auto space-y-8">
      <div className="min-w-full inline-block align-middle">
        <div className="border rounded-lg p-6 divide-y divide-gray-200 dark:border-gray-700 dark:divide-gray-700">
          {/* Search bar */}
          <div className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Ticket Data Details</div>
            <div className="relative max-w-xs w-full">
          <input
            type="text"
                className="form-input ps-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full text-sm"
                placeholder="Quick search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
            </div>
          </div>
          {/* Table */}
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paged.length === 0 ? (
                  <tr><td colSpan={columns.length} className="text-center py-8 text-gray-400">No data found</td></tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                      {columns.map(col => (
                        <td key={col.key} className="px-5 py-3 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200 align-top">
                          {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">Page Size:</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1 text-sm">
                {PAGE_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setPage(1)} disabled={page === 1} className="text-gray-400 hover:text-primary p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-gray-400 hover:text-primary p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50">‹</button>
              <span className="w-10 h-10 bg-primary text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full">{page}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-gray-400 hover:text-primary p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="text-gray-400 hover:text-primary p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50">»</button>
              <span className="text-sm">{`Page ${page} of ${totalPages}`}</span>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
};

export default GridView;
