import React, { useState, useCallback } from 'react';
import { DocumentArrowUpIcon, TableCellsIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { db, ITicket } from '@/lib/db';
import { formatDurationDHM } from '@/lib/utils';

type UploadProcessProps = {
  onUploadComplete: () => void;
};

const UploadProcess = ({ onUploadComplete }: UploadProcessProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const [parseSummary, setParseSummary] = useState<{ valid: number, skipped: number, zeroDuration: number, totalRows?: number } | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    
    if (excelFile) {
      setUploadedFile(excelFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    
    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      // --- DATA TRANSFORMATION ---
      const { tickets: processedTickets, skippedRowCount } = processAndAnalyzeData(json);

      // --- SAVE TO DATABASE ---
      await db.tickets.bulkPut(processedTickets);
      
      toast({
        title: "Upload Berhasil!",
        description: `${processedTickets.length} tiket telah ditambahkan ke database.`,
      });

      if (skippedRowCount > 0) {
        toast({
          title: "Peringatan Kualitas Data",
          description: `${skippedRowCount} baris data dilewati karena tidak memiliki ID pelanggan, waktu buka, atau nama agen.`,
          variant: "default",
          duration: 9000,
        });
      }

      // Hitung tiket dengan durasi 0
      const zeroDuration = processedTickets.filter(t => (t.duration?.rawHours === 0 || t.handlingDuration?.rawHours === 0)).length;
      setParseSummary({ valid: processedTickets.length, skipped: skippedRowCount, zeroDuration, totalRows: processedTickets.length + skippedRowCount });

      setUploadedFile(null);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Upload gagal",
        description: "Terjadi kesalahan saat memproses file. Pastikan formatnya benar.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearDatabase = async () => {
    try {
      await db.tickets.clear();
      toast({
        title: "Database Dibersihkan",
        description: "Semua data tiket lokal telah dihapus. Silakan unggah ulang file Anda.",
      });
      // Optionally, trigger a refresh of the views
      onUploadComplete();
      setParseSummary(null); // Reset summary saat reset cache
    } catch (error) {
      console.error("Error clearing database:", error);
      toast({
        title: "Gagal Membersihkan",
        description: "Terjadi kesalahan saat mencoba menghapus data.",
        variant: "destructive",
      });
    }
  };

  // Helper function to safely parse Excel dates (which can be numbers or strings)
  function parseExcelDate(value: string | number | undefined): string | undefined {
    if (!value) return undefined;
    
    // If it's a number (Excel's date format)
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        // Construct a Date object, being mindful of timezone offset
        const d = new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S);
        // Adjust for timezone to get correct ISO string
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString();
      }
    }
    
    // If it's a string, try to parse it
    if (typeof value === 'string') {
        // Handle "dd/mm/yyyy hh:mm" format specifically
        const dateTimeParts = value.split(' ');
        const dateParts = dateTimeParts[0].split('/');
        const timeParts = dateTimeParts[1]?.split(':') || ['00', '00'];
        
        if (dateParts.length === 3 && timeParts.length >= 2) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
          const year = parseInt(dateParts[2], 10);
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hours) && !isNaN(minutes)) {
            const d = new Date(year, month, day, hours, minutes);
            if (!isNaN(d.getTime())) {
              return d.toISOString();
            }
          }
        }

        // Fallback for other string formats
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }
    
    return undefined; // Return undefined if parsing fails
  }

  // Helper to calculate duration in hours between two ISO date strings
  const calculateDuration = (start?: string, end?: string): number => {
      if (!start || !end) return 0;
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
      return Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  };
  
  const processAndAnalyzeData = (rawData: any[]): { tickets: ITicket[], skippedRowCount: number } => {
    const tickets: ITicket[] = [];
    const uploadTimestamp = Date.now();
    let skippedRowCount = 0;

    // Create a flexible map to find column names, ignoring case and spacing
    const getColumn = (row: any, potentialNames: string[]) => {
      for (const key in row) {
        const normalizedKey = key.trim().toLowerCase();
        for (const name of potentialNames) {
          if (normalizedKey === name.toLowerCase()) {
            return row[key];
          }
        }
      }
      return undefined;
    };
  
    for (const row of rawData) {
      // --- Enhanced Validation ---
      // Agent name is now a required field for a ticket to be valid.
      const customerId = getColumn(row, ['Customer ID', 'CustomerID', 'ID Pelanggan', 'ID']);
      const openTime = parseExcelDate(getColumn(row, ['Waktu Open', 'Open Time', 'Tanggal Open', 'Tanggal']));
      const agentName = 
        getColumn(row, ['Open By', 'Agent', 'Openby', 'Nama Agent', 'PIC', 'Dikerjakan oleh', 'Petugas', 'Teknisi']) ||
        getColumn(row, ['Close By', 'Closedby', 'Ditutup oleh']) ||
        getColumn(row, ['Handled By', 'Ditangani oleh']);
      
      // Validasi lebih toleran: cukup ada customerId, openTime, agentName
      if (!customerId || !openTime || !agentName) {
        skippedRowCount++;
        continue; // Skip the row if essential data (ID, Time, or Agent) is missing
      }
  
      const closeTime = parseExcelDate(getColumn(row, [
        'Waktu Close Ticket', 'Waktu Close Tiket', 'Close Time', 'Tanggal Close', 'Waktu Close', 'Close', 'Tutup', 'Selesai'
      ]));
      const closeHandling = parseExcelDate(getColumn(row, [
        'Close Penanganan', 'Close Handling', 'Waktu Close Penanganan', 'Selesai Penanganan', 'Tutup Penanganan'
      ]));
      const closeHandling1 = parseExcelDate(getColumn(row, [
        'Close Penanganan 1', 'Close Handling 1', 'Waktu Close Penanganan 1', 'Selesai Penanganan 1', 'Tutup Penanganan 1'
      ]));
      const closeHandling2 = parseExcelDate(getColumn(row, [
        'Close Penanganan 2', 'Close Handling 2', 'Waktu Close Penanganan 2', 'Selesai Penanganan 2', 'Tutup Penanganan 2'
      ]));
      const closeHandling3 = parseExcelDate(getColumn(row, [
        'Close Penanganan 3', 'Close Handling 3', 'Waktu Close Penanganan 3', 'Selesai Penanganan 3', 'Tutup Penanganan 3'
      ]));
      const closeHandling4 = parseExcelDate(getColumn(row, [
        'Close Penanganan 4', 'Close Handling 4', 'Waktu Close Penanganan 4', 'Selesai Penanganan 4', 'Tutup Penanganan 4'
      ]));
      const closeHandling5 = parseExcelDate(getColumn(row, [
        'Close Penanganan 5', 'Close Handling 5', 'Waktu Close Penanganan 5', 'Selesai Penanganan 5', 'Tutup Penanganan 5'
      ]));
      
      const durationHours = calculateDuration(openTime, closeTime);
      const handlingDurationHours = calculateDuration(openTime, closeHandling);
      const handlingDuration1Hours = calculateDuration(openTime, closeHandling1);
      const handlingDuration2Hours = calculateDuration(openTime, closeHandling2);
      const handlingDuration3Hours = calculateDuration(openTime, closeHandling3);
      const handlingDuration4Hours = calculateDuration(openTime, closeHandling4);
      const handlingDuration5Hours = calculateDuration(openTime, closeHandling5);

      const statusRaw = getColumn(row, ['Status']);
      let status = 'Open';
      if (statusRaw && String(statusRaw).trim()) {
        const normalized = String(statusRaw).trim().toLowerCase();
        if (normalized === 'close ticket') {
          status = 'Closed';
        } else {
          status = String(statusRaw).trim();
        }
      }

      const ticket: ITicket = {
        id: crypto.randomUUID(), // Generate a unique ID for each ticket
        customerId: String(customerId),
        name: getColumn(row, ['Nama']) || 'N/A',
        category: getColumn(row, ['Kategori']) || 'Uncategorized',
        description: getColumn(row, ['Deskripsi']) || '',
        cause: getColumn(row, ['Penyebab']) || '',
        handling: getColumn(row, ['Penanganan']) || '',
        openTime: openTime,
        closeTime: closeTime,
        duration: { rawHours: durationHours, formatted: formatDurationDHM(durationHours) },
        closeHandling: closeHandling,
        handlingDuration: { rawHours: handlingDurationHours, formatted: formatDurationDHM(handlingDurationHours) },
        classification: getColumn(row, ['Klasifikasi']),
        subClassification: getColumn(row, ['Sub Klasifikasi']),
        status: status,
        handling1: getColumn(row, ['Penanganan 1']),
        closeHandling1: closeHandling1,
        handlingDuration1: { rawHours: handlingDuration1Hours, formatted: formatDurationDHM(handlingDuration1Hours) },
        handling2: getColumn(row, ['Penanganan 2']),
        closeHandling2: closeHandling2,
        handlingDuration2: { rawHours: handlingDuration2Hours, formatted: formatDurationDHM(handlingDuration2Hours) },
        handling3: getColumn(row, ['Penanganan 3']),
        closeHandling3: closeHandling3,
        handlingDuration3: { rawHours: handlingDuration3Hours, formatted: formatDurationDHM(handlingDuration3Hours) },
        handling4: getColumn(row, ['Penanganan 4']),
        closeHandling4: closeHandling4,
        handlingDuration4: { rawHours: handlingDuration4Hours, formatted: formatDurationDHM(handlingDuration4Hours) },
        handling5: getColumn(row, ['Penanganan 5']),
        closeHandling5: closeHandling5,
        handlingDuration5: { rawHours: handlingDuration5Hours, formatted: formatDurationDHM(handlingDuration5Hours) },
        openBy: agentName,
        uploadTimestamp: uploadTimestamp,
      };
      tickets.push(ticket);
    }
    // Debug: log hasil parsing
    console.log('Parsed tickets:', tickets.slice(0, 3));
    return { tickets, skippedRowCount };
  };

  const expectedColumns = [
    { name: 'Customer ID', desc: 'ID unik pelanggan' },
    { name: 'Nama', desc: 'Nama pelanggan' },
    { name: 'Kategori', desc: 'Kategori tiket (Technical, Billing, etc.)' },
    { name: 'Deskripsi', desc: 'Deskripsi detail tiket' },
    { name: 'Penyebab', desc: 'Penyebab masalah' },
    { name: 'Penanganan', desc: 'Cara penanganan utama' },
    { name: 'Waktu Open', desc: 'Waktu buka tiket (YYYY-MM-DD HH:mm)' },
    { name: 'Waktu Close Tiket', desc: 'Waktu tutup tiket (YYYY-MM-DD HH:mm)' },
    { name: 'Durasi', desc: 'Durasi total dalam jam (otomatis dihitung)' },
    { name: 'Close Penanganan', desc: 'Waktu selesai penanganan' },
    { name: 'Durasi Penanganan', desc: 'Durasi penanganan dalam jam' },
    { name: 'Klasifikasi', desc: 'Klasifikasi utama masalah' },
    { name: 'Sub Klasifikasi', desc: 'Sub klasifikasi masalah' },
    { name: 'Status', desc: 'Status tiket (Open/Closed/In Progress)' },
    { name: 'Penanganan 1', desc: 'Langkah penanganan pertama' },
    { name: 'Close Penanganan 1', desc: 'Waktu selesai penanganan 1' },
    { name: 'Durasi Penanganan 1', desc: 'Durasi penanganan 1 dalam jam' },
    { name: 'Penanganan 2', desc: 'Langkah penanganan kedua' },
    { name: 'Close Penanganan 2', desc: 'Waktu selesai penanganan 2' },
    { name: 'Durasi Penanganan 2', desc: 'Durasi penanganan 2 dalam jam' },
    { name: 'Penanganan 3', desc: 'Langkah penanganan ketiga' },
    { name: 'Close Penanganan 3', desc: 'Waktu selesai penanganan 3' },
    { name: 'Durasi Penanganan 3', desc: 'Durasi penanganan 3 dalam jam' },
    { name: 'Penanganan 4', desc: 'Langkah penanganan keempat' },
    { name: 'Close Penanganan 4', desc: 'Waktu selesai penanganan 4' },
    { name: 'Durasi Penanganan 4', desc: 'Durasi penanganan 4 dalam jam' },
    { name: 'Penanganan 5', desc: 'Langkah penanganan kelima' },
    { name: 'Close Penanganan 5', desc: 'Waktu selesai penanganan 5' },
    { name: 'Durasi Penanganan 5', desc: 'Durasi penanganan 5 dalam jam' },
    { name: 'Open By', desc: 'Agent yang membuka tiket' },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Hero Section */}
      <div className="text-center py-12">
        <TableCellsIcon className="mx-auto h-24 w-24 text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Excel File</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Upload file Excel untuk analisis otomatis data tiket
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🔄 <strong>Backend Parser Otomatis:</strong> Sistem akan otomatis mengekstrak data, menghitung durasi, dan membuat summary analisis
          </p>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div className="w-full px-[10px]">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          {uploadedFile ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                File terpilih: {uploadedFile.name}
              </p>
              <button
                onClick={handleUpload}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isProcessing ? 'Memproses...' : 'Upload & Proses File'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Drop file Excel di sini, atau{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium">
                  pilih file
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500">
                Mendukung file .xlsx dan .xls
              </p>
            </div>
          )}
        </div>
        <div className="mt-4 text-center">
            <button
                onClick={handleClearDatabase}
                className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
                <TrashIcon className="h-4 w-4" />
                Hapus Cache & Reset Database
            </button>
        </div>
      </div>

      {/* Summary Parsing */}
      {parseSummary && (
        <div className="mt-6 max-w-xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="font-semibold mb-2">Summary Parsing Data</div>
            <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
              <li>📄 <b>{parseSummary.totalRows}</b> jumlah baris di file</li>
              <li>✅ <b>{parseSummary.valid}</b> tiket valid berhasil diupload</li>
              <li>❌ <b>{parseSummary.skipped}</b> baris gagal diupload (data wajib kosong)</li>
              <li>⏱️ <b>{parseSummary.zeroDuration}</b> tiket memiliki durasi 0 jam</li>
            </ul>
            {parseSummary.zeroDuration > 0 && (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200 text-xs">
                Beberapa tiket memiliki durasi 0 jam. Mohon cek kembali kolom waktu di file Excel Anda agar analisis durasi akurat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expected Format Preview */}
      <div className="w-full px-[10px]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Format Excel yang Diharapkan
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nama Kolom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Deskripsi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {expectedColumns.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Processing Info */}
      <div className="w-full px-[10px]">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">
            📊 Fitur Analisis Otomatis
          </h4>
          <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
            <li>• Ekstraksi otomatis semua data dari Excel</li>
            <li>• Perhitungan durasi tiket dan penanganan secara otomatis</li>
            <li>• Analisis komplain terbanyak berdasarkan kategori</li>
            <li>• Statistik performa agent dan durasi penanganan</li>
            <li>• Summary bulanan dan trend analysis</li>
            <li>• Dashboard real-time setelah upload selesai</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadProcess;
