import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
import PageWrapper from '../components/PageWrapper';
import SummaryCard from '../components/ui/SummaryCard';
import TableChartIcon from '@mui/icons-material/TableChart';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { db } from '../lib/db';

const CUSTOMER_HEADERS = ["Nama", "Jenis Klien", "Layanan", "Kategori"];

const CustomerData: React.FC = () => {
  const [dataPerBulan, setDataPerBulan] = useState<{ [bulan: string]: any[] }>({});
  const [bulanList, setBulanList] = useState<string[]>([]);
  const [bulanDipilih, setBulanDipilih] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [jenisKlienFilter, setJenisKlienFilter] = useState<string>('ALL');
  const [fileName, setFileName] = useState<string>("");
  // Ambil list jenis klien unik dari dataPerBulan
  const jenisKlienList = React.useMemo(() => {
    if (!bulanDipilih || !dataPerBulan[bulanDipilih]) return [];
    const setJK = new Set<string>();
    dataPerBulan[bulanDipilih].forEach(row => {
      if (row['Jenis Klien']) setJK.add(row['Jenis Klien']);
    });
    return Array.from(setJK);
  }, [dataPerBulan, bulanDipilih]);

  // Saat komponen mount, baca ulang data customer dari IndexedDB jika ada
  useEffect(() => {
    (async () => {
      const customers = await db.customers.toArray();
      if (customers && customers.length > 0) {
        // Group by bulan (ambil dari id: format "bulan-idx-nama")
        const dataPerBulan: { [bulan: string]: any[] } = {};
        customers.forEach(c => {
          const bulan = (c.id || '').split('-')[0];
          if (!dataPerBulan[bulan]) dataPerBulan[bulan] = [];
          dataPerBulan[bulan].push({
            Nama: c.nama,
            'Jenis Klien': c.jenisKlien,
            Layanan: c.layanan,
            Kategori: c.kategori
          });
        });
        const bulanList = Object.keys(dataPerBulan);
        setDataPerBulan(dataPerBulan);
        setBulanList(bulanList);
        setBulanDipilih(bulanList[0] || '');
      }
    })();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const data = evt.target?.result;
        if (!data) return;
        
        // Check file type and process accordingly
        const fileExtension = file.name.toLowerCase().split('.').pop();
        
        if (fileExtension === 'csv') {
          // Parse CSV file with Papa Parse
          Papa.parse(data as string, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
            const dataBulan: { [bulan: string]: any[] } = {};
            let valid = true;
            
            // For CSV, we treat the entire file as one sheet
            const json: any[] = results.data as any[];
            
            // Ambil hanya kolom yang diinginkan
            const filtered = json.map(row => {
              const obj: any = {};
              for (const h of CUSTOMER_HEADERS) obj[h] = row[h] || '';
              return obj;
            });
            
            // Validasi header untuk CSV
            const headers = Object.keys(json[0] || {});
            const missing = CUSTOMER_HEADERS.filter(h => !headers.includes(h));
            if (missing.length > 0) {
              setError(`File header tidak sesuai. Kolom wajib: ${CUSTOMER_HEADERS.join(', ')}`);
              setDataPerBulan({});
              setBulanList([]);
              setBulanDipilih('');
              return;
            }
            
            // For CSV, use filename as sheet name
            const sheetName = file.name.replace(/\.[^/.]+$/, "") || 'Data';
            dataBulan[sheetName] = filtered;
            
            setError(null);
            setDataPerBulan(dataBulan);
            setBulanList([sheetName]);
            setBulanDipilih(sheetName);
            
            // SIMPAN KE INDEXEDDB
            const allCustomers: any[] = [];
            [sheetName].forEach(bulan => {
              dataBulan[bulan].forEach((row: any, idx: number) => {
                allCustomers.push({
                  id: `${bulan}-${idx}-${row['Nama']}`,
                  nama: row['Nama'],
                  jenisKlien: row['Jenis Klien'],
                  layanan: row['Layanan'],
                  kategori: row['Kategori']
                });
              });
            });
            await db.customers.clear();
            if (allCustomers.length > 0) {
              await db.customers.bulkAdd(allCustomers);
            }
            alert('Data customer berhasil disimpan ke IndexedDB.');
          },
          error: (error) => {
            console.error('Papa Parse error:', error);
            setError('Failed to parse CSV file. Please check file format.');
          }
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file with ExcelJS (secure alternative)
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(data as ArrayBuffer);
          
          const dataBulan: { [bulan: string]: any[] } = {};
          let valid = true;
          
          // Process each worksheet
          for (const worksheet of workbook.worksheets) {
            const sheetName = worksheet.name;
            const json: any[] = [];
            
            // Convert worksheet to JSON
            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber === 1) return; // Skip header row
              
              const rowData: any = {};
              row.eachCell((cell, colNumber) => {
                const header = CUSTOMER_HEADERS[colNumber - 1];
                if (header) {
                  rowData[header] = cell.value?.toString() || '';
                }
              });
              
              if (Object.values(rowData).some(val => val !== '')) {
                json.push(rowData);
              }
            });
            
            // Validasi header
            const headers = CUSTOMER_HEADERS;
            const missing = CUSTOMER_HEADERS.filter(h => !headers.includes(h));
            if (missing.length > 0) {
              setError(`Sheet '${sheetName}' header tidak sesuai. Kolom wajib: ${CUSTOMER_HEADERS.join(', ')}`);
              setDataPerBulan({});
              setBulanList([]);
              setBulanDipilih('');
              valid = false;
              break;
            }
            
            dataBulan[sheetName] = json;
          }
          
          if (valid) {
            setError(null);
            setDataPerBulan(dataBulan);
            setBulanList(Object.keys(dataBulan));
            setBulanDipilih(Object.keys(dataBulan)[0] || '');
            
            // SIMPAN KE INDEXEDDB
            const allCustomers: any[] = [];
            Object.keys(dataBulan).forEach(bulan => {
              dataBulan[bulan].forEach((row: any, idx: number) => {
                allCustomers.push({
                  id: `${bulan}-${idx}-${row['Nama']}`,
                  nama: row['Nama'],
                  jenisKlien: row['Jenis Klien'],
                  layanan: row['Layanan'],
                  kategori: row['Kategori']
                });
              });
            });
            await db.customers.clear();
            if (allCustomers.length > 0) {
              await db.customers.bulkAdd(allCustomers);
            }
            alert('Data customer berhasil disimpan ke IndexedDB.');
          }
        } catch (error) {
          console.error('Excel parsing error:', error);
          setError('Failed to parse Excel file. Please check file format.');
        }
      } else {
        setError('File format tidak didukung. Gunakan file CSV atau Excel (.xlsx, .xls)');
      }
    };
    reader.readAsArrayBuffer(file); // Read as ArrayBuffer for both CSV and Excel
    } else {
      setFileName("");
    }
  };

  // Tambahkan handler clear cache dan clear data
  const handleClearCache = async () => {
    if (window.confirm('Yakin ingin menghapus cache customer di IndexedDB?')) {
      await db.customers.clear();
      alert('Cache customer di IndexedDB berhasil dihapus.');
    }
  };
  const handleClearData = () => {
    if (window.confirm('Yakin ingin menghapus seluruh data customer yang di-upload?')) {
      setDataPerBulan({});
      setBulanList([]);
      setBulanDipilih('');
      setError(null);
    }
  };

  // Urutan bulan Indonesia
  const MONTH_ORDER_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-gray-900 dark:text-gray-100">Data Customer</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-2xl">Upload file Excel berisi data customer per bulan (setiap sheet = 1 bulan, header: Nama, Jenis Klien, Layanan, Kategori). Pilih bulan untuk melihat daftar customer.</p>
      </div>
      {/* Summary Cards - Full Width, Modern Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full">
        <SummaryCard
          icon={<TableChartIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
          title={`Total Customer Bulan ${bulanDipilih}`}
          value={dataPerBulan[bulanDipilih]?.length || 0}
          description={`Jumlah customer pada bulan ${bulanDipilih}`}
          iconBg="bg-blue-700"
          className="w-full"
        />
        {bulanList.length > 1 && (
          <SummaryCard
            icon={<TableChartIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
            title="Total Customer Semua Bulan"
            value={bulanList.reduce((acc, b) => acc + (dataPerBulan[b]?.length || 0), 0)}
            description="Jumlah customer dari seluruh bulan di file ini"
            iconBg="bg-green-600"
            className="w-full"
          />
        )}
      </div>
      {/* Filter & Upload Card - Full Width, Modern Layout */}
      <Card className="w-full mb-8 shadow-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[80px] rounded-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center w-full">
            {/* File Upload */}
            <div className="flex flex-col w-full">
              <label className="block text-xs font-semibold mb-1">Choose File</label>
              <div className="relative w-full">
                <input
                  id="customer-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <label htmlFor="customer-upload" className="flex items-center border border-gray-200 rounded-lg bg-gray-50 px-3 py-2 h-10 cursor-pointer text-xs font-normal w-full transition focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400">
                  <span className="text-blue-600 font-semibold mr-2">Choose File</span>
                  <span className="truncate text-gray-500">{fileName || 'No file chosen'}</span>
                </label>
              </div>
              {error && <div className="text-red-500 mt-2 text-xs">{error}</div>}
            </div>
            {/* Dropdown Bulan */}
            <div className="flex flex-col w-full">
              <label className="block text-xs font-semibold mb-1">Bulan</label>
              {bulanList.length > 0 && (
                <select
                  value={bulanDipilih}
                  onChange={e => setBulanDipilih(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full text-xs h-10 bg-gray-50 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                >
                  {bulanList.slice().sort((a, b) => MONTH_ORDER_ID.indexOf(a) - MONTH_ORDER_ID.indexOf(b)).map(bulan => (
                    <option key={bulan} value={bulan}>{bulan}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Dropdown Jenis Klien */}
            <div className="flex flex-col w-full">
              <label className="block text-xs font-semibold mb-1">Jenis Klien</label>
              {jenisKlienList.length > 0 && (
                <select
                  value={jenisKlienFilter}
                  onChange={e => setJenisKlienFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full text-xs h-10 bg-gray-50 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                >
                  <option value="ALL">Semua Jenis Klien</option>
                  {jenisKlienList.map(jk => (
                    <option key={jk} value={jk}>{jk}</option>
                  ))}
                </select>
              )}
            </div>
            {/* Tombol Action */}
            <div className="flex flex-col w-full items-end justify-center">
              <button
                onClick={() => { handleClearCache(); handleClearData(); }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition"
                type="button"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              {CUSTOMER_HEADERS.map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bulanDipilih && dataPerBulan[bulanDipilih] && dataPerBulan[bulanDipilih].length > 0 ? (
              dataPerBulan[bulanDipilih]
                .filter(row => jenisKlienFilter === 'ALL' || row['Jenis Klien'] === jenisKlienFilter)
                .map((row, i) => (
                  <TableRow key={i}>
                    {CUSTOMER_HEADERS.map(h => (
                      <TableCell key={h}>{row[h]}</TableCell>
                    ))}
                  </TableRow>
                ))
            ) : (
              <TableRow>
                <TableCell colSpan={CUSTOMER_HEADERS.length} className="text-center py-8 text-gray-400">Belum ada data</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
  );
};

export default CustomerData; 