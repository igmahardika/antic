import { useMemo, useState } from 'react';
import { ITicket } from '@/lib/db';
import { db } from '@/lib/db';
import { formatDateTimeDDMMYYYY } from '@/lib/utils';
import { useAnalytics } from './AnalyticsContext';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import SummaryCard from './ui/SummaryCard';
import { useLiveQuery } from 'dexie-react-hooks';
import PageWrapper from './PageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet } from 'lucide-react';

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
  { key: 'closeHandling', label: 'Close Penanganan', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'handlingDuration', label: 'Durasi Penanganan', render: (v, row) => row.handlingDuration?.formatted || '-' },
  { key: 'handling1', label: 'Penanganan 1' },
  { key: 'closeHandling1', label: 'Close Penanganan 1', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'handlingDuration1', label: 'Durasi Penanganan 1', render: (v, row) => row.handlingDuration1?.formatted || '-' },
  { key: 'handling2', label: 'Penanganan 2' },
  { key: 'closeHandling2', label: 'Close Penanganan 2', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'handlingDuration2', label: 'Durasi Penanganan 2', render: (v, row) => row.handlingDuration2?.formatted || '-' },
  { key: 'handling3', label: 'Penanganan 3' },
  { key: 'closeHandling3', label: 'Close Penanganan 3', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'handlingDuration3', label: 'Durasi Penanganan 3', render: (v, row) => row.handlingDuration3?.formatted || '-' },
  { key: 'handling4', label: 'Penanganan 4' },
  { key: 'closeHandling4', label: 'Close Penanganan 4', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'handlingDuration4', label: 'Durasi Penanganan 4', render: (v, row) => row.handlingDuration4?.formatted || '-' },
  { key: 'handling5', label: 'Penanganan 5' },
  { key: 'closeHandling5', label: 'Close Penanganan 5', render: v => formatDateTimeDDMMYYYY(v) },
  { key: 'handlingDuration5', label: 'Durasi Penanganan 5', render: (v, row) => row.handlingDuration5?.formatted || '-' },
  { key: 'openBy', label: 'Open By' },
  { key: 'cabang', label: 'Cabang' },
  { key: 'status', label: 'Status' },
  { key: 'classification', label: 'Klasifikasi' },
  { key: 'subClassification', label: 'Sub Klasifikasi' },
];

const GridView = ({ data: propsData }: { data?: ITicket[] }) => {
  const { gridData } = useAnalytics();
  const data = propsData || gridData;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [validasiFilter, setValidasiFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  // Ambil semua customer dari IndexedDB
  const allCustomers = useLiveQuery(() => db.customers.toArray(), []);
  const customerNames = useMemo(() => new Set((allCustomers || []).map(c => (c.nama || '').trim().toLowerCase())), [allCustomers]);

  // Ambil jumlah total tiket di database (tanpa filter apapun)
  const totalTicketsInDb = useLiveQuery(() => db.tickets.count(), []);
  // Ambil seluruh tiket di database (tanpa filter apapun)
  const allTicketsInDb = useLiveQuery(() => db.tickets.toArray(), []);

  // Filter validasi customer
  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (search) {
    const s = search.toLowerCase();
      result = result.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return val && String(val).toLowerCase().includes(s);
      })
    );
    }
    // Filter hanya untuk tiket tahun 2025
    if (validasiFilter !== 'all' && customerNames.size > 0) {
      result = result.filter(row => {
        const is2025 = row.openTime && row.openTime.startsWith('2025');
        if (!is2025) return true; // selain 2025, tampilkan semua
        const isValid = customerNames.has((row.name || '').trim().toLowerCase());
        return validasiFilter === 'valid' ? isValid : !isValid;
      });
    }
    return result;
  }, [data, search, validasiFilter, customerNames]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  return (
    <PageWrapper>
      <div className="space-y-6">


        {/* Summary Cards - Enhanced UI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <SummaryCard
            icon={<ConfirmationNumberIcon className="w-5 h-5 text-white" />}
            title="TOTAL TICKETS"
            value={totalTicketsInDb ?? '-'}
            description="Total recorded tickets (no filter applied)"
            iconBg="bg-blue-700"
          />
          <SummaryCard
            icon={<GroupIcon className="w-5 h-5 text-white" />}
            title="UNIQUE CUSTOMERS"
            value={allTicketsInDb ? new Set(allTicketsInDb.map(t => t.customerId)).size : 0}
            description="Number of unique customers (no filter applied)"
            iconBg="bg-green-600"
          />
          <SummaryCard
            icon={<HowToRegIcon className="w-5 h-5 text-white" />}
            title="UNIQUE AGENTS"
            value={allTicketsInDb ? new Set(allTicketsInDb.map(t => t.openBy)).size : 0}
            description="Number of unique agents handling tickets (no filter applied)"
            iconBg="bg-purple-700"
          />
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  className="form-input ps-10 px-3 py-2  rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white w-full text-sm"
                  placeholder="Quick search..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Validasi Customer:</span>
                <select value={validasiFilter} onChange={e => { setValidasiFilter(e.target.value as any); setPage(1); }} className="border rounded px-2 py-1 text-sm">
                  <option value="all">Semua</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Tidak Valid</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Ticket Data
            </CardTitle>
            <CardDescription>
              Showing {paged.length} of {filtered.length} tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
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
                      paged.map((row, i) => {
                        const is2025 = row.openTime && row.openTime.startsWith('2025');
                        const isValid = customerNames.has((row.name || '').trim().toLowerCase());
                        return (
                          <tr key={i} className={
                            (i % 2 === 0 ? 'bg-card text-card-foreground ' : 'bg-gray-50 dark:bg-gray-800') +
                            (is2025 && !isValid ? ' bg-red-50 dark:bg-red-900/30' : '')
                          }>
                            {columns.map(col => (
                              <td key={col.key} className="px-5 py-3 whitespace-pre-line text-sm text-card-foreground align-top">
                                {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {paged.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tickets found matching your criteria
                </div>
              )}

              {/* Pagination */}
              <div className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Page Size:</span>
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1 text-sm">
                    {PAGE_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setPage(1)} 
                    disabled={page === 1} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    «
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    ‹
                  </button>
                  <span className="w-10 h-10 bg-blue-600 text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full dark:bg-blue-500">
                    {page}
                  </span>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    ›
                  </button>
                  <button 
                    onClick={() => setPage(totalPages)} 
                    disabled={page === totalPages} 
                    className="text-gray-400 hover:text-blue-600 p-2 inline-flex items-center gap-2 font-medium rounded-md disabled:opacity-50 dark:text-gray-500 dark:hover:text-blue-400"
                  >
                    »
                  </button>
                  <span className="text-sm">{`Page ${page} of ${totalPages}`}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
};

export default GridView;
