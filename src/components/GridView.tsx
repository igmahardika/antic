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
import { FileSpreadsheet, Search, Filter } from 'lucide-react';
import { Badge } from './ui/badge';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const columns = [
  { key: 'customerId', label: 'Customer ID', width: '120px' },
  { key: 'name', label: 'Name', width: '150px' },
  { key: 'category', label: 'Category', width: '120px' },
  { key: 'description', label: 'Description', width: '200px' },
  { key: 'cause', label: 'Cause', width: '180px' },
  { key: 'handling', label: 'Handling', width: '180px' },
  { key: 'openTime', label: 'Open Time', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'closeTime', label: 'Close Time', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'duration', label: 'Duration', width: '120px', render: (_v: any, row: any) => row.duration?.formatted || '' },
  { key: 'closeHandling', label: 'Close Penanganan', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'handlingDuration', label: 'Durasi Penanganan', width: '140px', render: (_v: any, row: any) => row.handlingDuration?.formatted || '' },
  { key: 'handling1', label: 'Penanganan 1', width: '180px' },
  { key: 'closeHandling1', label: 'Close Penanganan 1', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'handlingDuration1', label: 'Durasi Penanganan 1', width: '140px', render: (_v: any, row: any) => row.handlingDuration1?.formatted || '' },
  { key: 'handling2', label: 'Penanganan 2', width: '180px' },
  { key: 'closeHandling2', label: 'Close Penanganan 2', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'handlingDuration2', label: 'Durasi Penanganan 2', width: '140px', render: (_v: any, row: any) => row.handlingDuration2?.formatted || '' },
  { key: 'handling3', label: 'Penanganan 3', width: '180px' },
  { key: 'closeHandling3', label: 'Close Penanganan 3', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'handlingDuration3', label: 'Durasi Penanganan 3', width: '140px', render: (_v: any, row: any) => row.handlingDuration3?.formatted || '' },
  { key: 'handling4', label: 'Penanganan 4', width: '180px' },
  { key: 'closeHandling4', label: 'Close Penanganan 4', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'handlingDuration4', label: 'Durasi Penanganan 4', width: '140px', render: (_v: any, row: any) => row.handlingDuration4?.formatted || '' },
  { key: 'handling5', label: 'Penanganan 5', width: '180px' },
  { key: 'closeHandling5', label: 'Close Penanganan 5', width: '140px', render: (v: any) => v ? formatDateTimeDDMMYYYY(v) : '' },
  { key: 'handlingDuration5', label: 'Durasi Penanganan 5', width: '140px', render: (_v: any, row: any) => row.handlingDuration5?.formatted || '' },
  { key: 'openBy', label: 'Open By', width: '120px' },
  { key: 'cabang', label: 'Cabang', width: '100px' },
  { key: 'status', label: 'Status', width: '100px' },
  { key: 'classification', label: 'Klasifikasi', width: '120px' },
  { key: 'subClassification', label: 'Sub Klasifikasi', width: '140px' },
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
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground mb-2">Ticket Data</h1>
            <p className="text-gray-600 dark:text-gray-400 text-base">Comprehensive view of all ticket information and customer data</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          icon={<ConfirmationNumberIcon className="w-6 h-6 text-white" />}
          title="Total Tickets"
          value={totalTicketsInDb ?? '-'}
          description="Total recorded tickets in database"
          iconBg="bg-blue-600"
        />
        <SummaryCard
          icon={<GroupIcon className="w-6 h-6 text-white" />}
          title="Unique Customers"
          value={allTicketsInDb ? new Set(allTicketsInDb.map(t => t.customerId)).size : 0}
          description="Number of unique customers"
          iconBg="bg-green-600"
        />
        <SummaryCard
          icon={<HowToRegIcon className="w-6 h-6 text-white" />}
          title="Unique Agents"
          value={allTicketsInDb ? new Set(allTicketsInDb.map(t => t.openBy)).size : 0}
          description="Number of unique agents handling tickets"
          iconBg="bg-purple-600"
        />
      </div>

      {/* Search and Filter Controls */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative max-w-md w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Search tickets, customers, descriptions..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Validation:</span>
              </div>
              <select 
                value={validasiFilter} 
                onChange={e => { setValidasiFilter(e.target.value as any); setPage(1); }} 
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <option value="all">All Records</option>
                <option value="valid">Valid Customers</option>
                <option value="invalid">Invalid Customers</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                Ticket Records
              </CardTitle>
              <CardDescription className="mt-1">
                Showing {paged.length} of {filtered.length} tickets
                                 {validasiFilter !== 'all' && (
                   <Badge variant="info" className="ml-2">
                     {validasiFilter === 'valid' ? 'Valid Customers Only' : 'Invalid Customers Only'}
                   </Badge>
                 )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
                <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
                    <tr>
                      {columns.map(col => (
                        <th 
                          key={col.key} 
                          className="px-4 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                          style={{ width: col.width, minWidth: col.width }}
                        >
                          <div className="flex items-center gap-2">
                            <span>{col.label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <FileSpreadsheet className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No tickets found</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {search ? 'Try adjusting your search criteria' : 'No data available'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paged.map((row, i) => {
                        const is2025 = row.openTime && row.openTime.startsWith('2025');
                        const isValid = customerNames.has((row.name || '').trim().toLowerCase());
                        return (
                          <tr key={i} className={
                            i % 2 === 0 
                              ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150' 
                              : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150'
                          }>
                            {columns.map(col => (
                              <td 
                                key={col.key} 
                                className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 align-top border-r border-gray-200 dark:border-gray-600 last:border-r-0"
                                style={{ width: col.width, minWidth: col.width }}
                              >
                                                              <div className="whitespace-pre-line max-w-full overflow-hidden">
                                {col.render ? col.render(row[col.key], row) : (row[col.key] || '')}
                              </div>
                                {is2025 && !isValid && col.key === 'name' && (
                                  <Badge variant="danger" className="mt-1 text-xs">
                                    Invalid Customer
                                  </Badge>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Size:</span>
                <select 
                  value={pageSize} 
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} 
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                >
                  {PAGE_SIZE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} per page</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(1)} 
                  disabled={page === 1} 
                  className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="First page"
                >
                  «
                </button>
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1} 
                  className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Previous page"
                >
                  ‹
                </button>
                
                <div className="flex items-center gap-1">
                  <span className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md">
                    {page}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">of {totalPages}</span>
                </div>
                
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages} 
                  className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Next page"
                >
                  ›
                </button>
                <button 
                  onClick={() => setPage(totalPages)} 
                  disabled={page === totalPages} 
                  className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
};

export default GridView;
