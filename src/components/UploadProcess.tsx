import React, { useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { db, ITicket } from '@/lib/db';
import { formatDurationDHM } from '@/lib/utils';
import SummaryCard from './ui/SummaryCard';
import { FileUp, XCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StorageIcon from '@mui/icons-material/Storage';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type UploadProcessProps = {
  onUploadComplete: () => void;
};

interface IErrorLog {
  row: number;
  reason: string;
}

interface IUploadSummary {
  totalRows: number;
  successCount: number;
  errorCount: number;
  zeroDurationCount: number;
}

// Define expected headers for validation and template generation
const EXPECTED_HEADERS = [
  "Customer ID", "Nama", "Kategori", "Deskripsi", "Penyebab", "Penanganan",
  "Waktu Open", "Waktu Close Tiket", "Durasi", "Close Penanganan", "Durasi Penanganan",
  "Klasifikasi", "Sub Klasifikasi", "Status", "Cabang",
  "Penanganan 1", "Close Penanganan 1", "Durasi Penanganan 1",
  "Penanganan 2", "Close Penanganan 2", "Durasi Penanganan 2",
  "Penanganan 3", "Close Penanganan 3", "Durasi Penanganan 3",
  "Penanganan 4", "Close Penanganan 4", "Durasi Penanganan 4",
  "Penanganan 5", "Close Penanganan 5", "Durasi Penanganan 5",
  "Open By"
];

const UploadProcess = ({ onUploadComplete }: UploadProcessProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [uploadSummary, setUploadSummary] = useState<IUploadSummary | null>(null);
  const [errorLog, setErrorLog] = useState<IErrorLog[]>([]);
  const [useBackendParser, setUseBackendParser] = useState(true);

  // Ambil jumlah tiket di database (GridView)
  const ticketsInDb = useLiveQuery(() => db.tickets.count(), []);

  useEffect(() => {
    try {
      const storedSummary = localStorage.getItem('uploadSummary');
      if (storedSummary) setUploadSummary(JSON.parse(storedSummary));
      
      const storedErrorLog = localStorage.getItem('uploadErrorLog');
      if (storedErrorLog) setErrorLog(JSON.parse(storedErrorLog));
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      localStorage.removeItem('uploadSummary');
      localStorage.removeItem('uploadErrorLog');
    }
  }, []);

  useEffect(() => {
    if (uploadSummary) {
      localStorage.setItem('uploadSummary', JSON.stringify(uploadSummary));
    } else {
      localStorage.removeItem('uploadSummary');
    }
  }, [uploadSummary]);

  useEffect(() => {
    if (errorLog && errorLog.length > 0) {
      localStorage.setItem('uploadErrorLog', JSON.stringify(errorLog));
    } else {
      localStorage.removeItem('uploadErrorLog');
    }
  }, [errorLog]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
        
        // Header validation
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] as string);
        const fileHeaders = [];
        for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
            const cell = worksheet[XLSX.utils.encode_cell({c: C, r: headerRange.s.r})];
            const hdr = cell && cell.t ? XLSX.utils.format_cell(cell) : `COLUMN_${C+1}`;
            fileHeaders.push(hdr);
        }

        const missingHeaders = EXPECTED_HEADERS.filter(h => !fileHeaders.includes(h));
        if(missingHeaders.length > 0) {
            console.error("Header Tidak Sesuai", { missingHeaders });
            setIsProcessing(false);
            return;
        }

        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        const { tickets: processedTickets, errorRows } = processAndAnalyzeData(json);
        
        if (processedTickets.length > 0) {
            await db.tickets.bulkPut(processedTickets);
        }

        const successCount = processedTickets.length;
        const errorCount = errorRows.length;
        const totalRowsInFile = json.length;
        const zeroDurationCount = processedTickets.filter(t => (t.duration?.rawHours === 0 || t.handlingDuration?.rawHours === 0)).length;

        const summary: IUploadSummary = { totalRows: totalRowsInFile, successCount, errorCount, zeroDurationCount };
        setUploadSummary(summary);
        setErrorLog(errorRows);

        if (errorCount > 0) {
            console.warn(`Terdapat ${errorCount} Kegagalan`, { errorRows });
        }
        if (zeroDurationCount > 0) {
             console.warn(`${zeroDurationCount} tiket memiliki durasi 0 jam. Periksa kembali kolom waktu di file Excel.`);
        }

        onUploadComplete();

    } catch (error) {
      console.error("Error processing file:", error);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const handleReset = async () => {
    try {
      await db.tickets.clear();
      setUploadSummary(null);
      setErrorLog([]);
      console.info("Cache & Database Dihapus");
      onUploadComplete();
    } catch (error) {
      console.error("Error clearing database:", error);
    }
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{}], { header: EXPECTED_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Data Tiket");
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, 'Template_Upload_Tiket.xlsx');

    console.info("Template Diunduh");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-zinc-800/50 border border-blue-200 dark:border-zinc-700">
              <div className="flex items-center space-x-3">
                  <StorageIcon className="h-6 w-6 text-blue-500" />
                  <Label htmlFor="backend-parser" className="font-semibold text-blue-800 dark:text-blue-300 text-base">Automatic Parser</Label>
              </div>
              <input type="checkbox" id="backend-parser" checked={useBackendParser} onChange={e => setUseBackendParser(e.target.checked)} />
          </div>
          <FileDropZone 
            onFileUpload={handleFileUpload} 
            isProcessing={isProcessing}
            progress={progress}
          />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6">
            <Button onClick={handleDownloadTemplate} variant="outline" className="w-full sm:w-auto text-base">
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={handleReset} variant="destructive" className="w-full sm:w-auto text-base">
              <DeleteIcon className="h-4 w-4 mr-2" />
              Reset Database
            </Button>
          </div>
        </div>
        {uploadSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-8">
            <SummaryCard
              icon={<CloudUploadIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
              title="Total Uploaded"
              value={uploadSummary.totalRows}
              description="Total rows in file"
              iconBg="bg-blue-700"
            />
            <SummaryCard
              icon={<CheckCircleIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
              title="Success"
              value={uploadSummary.successCount}
              description="Valid tickets uploaded"
              iconBg="bg-green-600"
            />
            <SummaryCard
              icon={<CloseIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
              title="Failed"
              value={uploadSummary.errorCount}
              description="Failed rows"
              iconBg="bg-red-600"
            />
            <SummaryCard
              icon={<TableChartIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
              title="Tickets in GridView"
              value={ticketsInDb ?? '-'}
              description="Tickets currently in database (GridView)"
              iconBg="bg-purple-700"
            />
          </div>
        ) : (
          <Card className="w-full max-w-6xl mx-auto shadow-md border border-gray-200 dark:border-zinc-700 bg-gradient-to-br from-white/70 to-blue-50/70 dark:from-zinc-900/70 dark:to-blue-900/70 p-10 mb-8 backdrop-blur-sm flex items-center justify-center min-h-[180px]">
            <CardHeader>
              <CardTitle className="text-gray-700 dark:text-gray-300 text-lg font-bold">No Data Uploaded</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mt-4 text-base text-gray-500 break-words whitespace-normal text-center">
                Upload a file to see the processing summary here.
              </p>
            </CardContent>
          </Card>
        )}
        {/* Jika jumlah successCount dan ticketsInDb berbeda, tampilkan warning */}
        {uploadSummary && ticketsInDb !== undefined && uploadSummary.successCount !== ticketsInDb && (
          <div className="p-4 mb-4 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">
            <b>Warning:</b> Jumlah tiket yang berhasil di-upload ({uploadSummary.successCount}) berbeda dengan jumlah tiket di GridView ({ticketsInDb}).
            <br />Pastikan database sudah di-reset sebelum upload baru, atau cek apakah ada filter aktif di GridView.
          </div>
        )}
        <ErrorLogTable errors={errorLog} />
      </div>
    </div>
  );
};

const FileDropZone = ({ onFileUpload, isProcessing, progress }: { onFileUpload: (file: File) => void, isProcessing: boolean, progress: number }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };
  return (
    <div 
      onDragEnter={(e) => { e.preventDefault(); setIsDragActive(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragActive(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-zinc-800' : 'border-gray-300 dark:border-zinc-700 hover:border-blue-400'}`}
    >
      {isProcessing ? (
        <>
          <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin" style={{borderTopColor: '#3b82f6'}}></div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Processing File...</h3>
          <progress value={progress} max="100" className="w-full max-w-xs mt-4" />
        </>
      ) : (
        <>
          <CloudUploadIcon className="w-10 h-10 text-gray-400" />
          <p className="mt-4 text-md text-gray-600 dark:text-gray-400">
            Drop file here, or{' '}
            <label htmlFor="file-upload" className="font-semibold text-blue-600 hover:text-blue-500 cursor-pointer">
              select file
            </label>
          </p>
          <input id="file-upload" type="file" className="sr-only" onChange={onFileSelect} accept=".xlsx, .xls" />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Supports .xlsx and .xls</p>
        </>
      )}
    </div>
  );
};

const ErrorLogTable = ({ errors }: { errors: IErrorLog[] }) => {
  const groupedErrors = errors.reduce((acc, error) => {
    const key = error.reason.replace(/: ".+"$/, '');
    if (!acc[key]) acc[key] = [];
    acc[key].push(error);
    return acc;
  }, {} as Record<string, IErrorLog[]>);

  return (
    <Card className="w-full max-w-6xl mx-auto shadow-md border border-gray-200 dark:border-zinc-700 bg-gradient-to-br from-white/70 to-blue-50/70 dark:from-zinc-900/70 dark:to-blue-900/70 p-10 mb-8 min-h-[180px] backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 text-left">Failure Log Details</CardTitle>
        <CardDescription className="text-base text-zinc-500 dark:text-zinc-400 text-left">Grouped by error type.</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 text-sm text-gray-700 dark:text-gray-200">
        <Accordion type="multiple" className="w-full">
          {Object.entries(groupedErrors).map(([reason, errs], index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex justify-between w-full pr-4 items-center">
                  <span className="font-semibold text-sm break-words whitespace-normal text-left">{reason}</span>
                  <span><Badge variant="destructive" className="flex-shrink-0 text-xs px-2 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200 border border-rose-200 dark:border-rose-800">{errs.length} rows</Badge></span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="max-h-48 overflow-y-auto pr-4 border-t pt-2 mt-2">
                  <table>
                    <thead>
                      <tr>
                        <th className="w-[100px] text-left text-xs font-semibold">Row #</th>
                        <th className="text-left text-xs font-semibold">Full Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errs.map((err) => (
                        <tr key={err.row}>
                          <td className="font-medium text-left text-xs">{err.row}</td>
                          <td className="text-xs text-left break-words whitespace-normal">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

function parseExcelDate(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;

  // 1. Handle Excel's numeric date format (most reliable)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const d = new Date(Date.UTC(date.y, date.m - 1, date.d, date.H, date.M, date.S));
      if (d.getUTCFullYear() === date.y && d.getUTCMonth() === date.m - 1 && d.getUTCDate() === date.d) {
        return d.toISOString();
      }
    }
  }

  // 2. Strictly handle only DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    // Regex: DD/MM/YYYY or DD/MM/YYYY HH:MM:SS
    const parts = trimmedValue.match(/^([0-3]?\d)\/([01]?\d)\/(\d{4})(?:\s+([0-2]?\d):([0-5]?\d):([0-5]?\d))?$/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      const year = parseInt(parts[3], 10);
      const hours = parseInt(parts[4] || '0', 10);
      const minutes = parseInt(parts[5] || '0', 10);
      const seconds = parseInt(parts[6] || '0', 10);
      if (year > 1000 && month > 0 && month <= 12 && day > 0 && day <= 31) {
        const customDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
        if (!isNaN(customDate.getTime()) && customDate.getUTCMonth() === month - 1) {
          return customDate.toISOString();
        }
      }
    }
  }
  // Tolak semua format lain
  return undefined;
}

  const calculateDuration = (start?: string, end?: string): number => {
      if (!start || !end) return 0;
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
      return Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  };
  
const processAndAnalyzeData = (rawData: any[]): { tickets: ITicket[], errorRows: IErrorLog[] } => {
    const tickets: ITicket[] = [];
    const errorRows: IErrorLog[] = [];
    const uploadTimestamp = Date.now();
  
    rawData.forEach((row, index) => {
      if (Object.keys(row).length === 0) {
        return; 
      }
      const customerId = row['Customer ID'];
      const openTimeValue = row['Waktu Open'];
      const openBy = row['Open By'];
      
      if (!customerId || !openTimeValue || !openBy) {
        errorRows.push({ row: index + 2, reason: `Data wajib (Customer ID, Waktu Open, atau Open By) kosong.` });
        return;
      }
      
      const openTime = parseExcelDate(openTimeValue);
      if (!openTime) {
        errorRows.push({ row: index + 2, reason: `Format Waktu Open tidak valid: "${openTimeValue}"`});
        return;
      }
  
      const closeTime = parseExcelDate(row['Waktu Close Tiket']);
      const closeHandling = parseExcelDate(row['Close Penanganan']);
      const closeHandling1 = parseExcelDate(row['Close Penanganan 1']);
      const closeHandling2 = parseExcelDate(row['Close Penanganan 2']);
      const closeHandling3 = parseExcelDate(row['Close Penanganan 3']);
      const closeHandling4 = parseExcelDate(row['Close Penanganan 4']);
      const closeHandling5 = parseExcelDate(row['Close Penanganan 5']);
      
      const durationHours = calculateDuration(openTime, closeTime);
      const handlingDurationHours = calculateDuration(openTime, closeHandling);
      const handlingDuration1Hours = calculateDuration(openTime, closeHandling1);
      const handlingDuration2Hours = calculateDuration(closeHandling1, closeHandling2);
      const handlingDuration3Hours = calculateDuration(closeHandling2, closeHandling3);
      const handlingDuration4Hours = calculateDuration(closeHandling3, closeHandling4);
      const handlingDuration5Hours = calculateDuration(closeHandling4, closeHandling5);

      const statusRaw = row['Status'];
      let status = 'Open';
      if (statusRaw && String(statusRaw).trim()) {
        const normalized = String(statusRaw).trim().toLowerCase();
        status = normalized === 'close ticket' ? 'Closed' : String(statusRaw).trim();
      }

      const ticket: ITicket = {
        id: crypto.randomUUID(),
        customerId: String(customerId),
        name: row['Nama'] || 'N/A',
        category: row['Kategori'] || 'Uncategorized',
        description: row['Deskripsi'] || '',
        cause: row['Penyebab'] || '',
        handling: row['Penanganan'] || '',
        openTime: openTime,
        closeTime: closeTime,
        duration: { rawHours: durationHours, formatted: formatDurationDHM(durationHours) },
        closeHandling: closeHandling,
        handlingDuration: { rawHours: handlingDurationHours, formatted: formatDurationDHM(handlingDurationHours) },
        classification: row['Klasifikasi'],
        subClassification: row['Sub Klasifikasi'],
        status: status,
        cabang: row['Cabang'],
        handling1: row['Penanganan 1'],
        closeHandling1: closeHandling1,
        handlingDuration1: { rawHours: handlingDuration1Hours, formatted: formatDurationDHM(handlingDuration1Hours) },
        handling2: row['Penanganan 2'],
        closeHandling2: closeHandling2,
        handlingDuration2: { rawHours: handlingDuration2Hours, formatted: formatDurationDHM(handlingDuration2Hours) },
        handling3: row['Penanganan 3'],
        closeHandling3: closeHandling3,
        handlingDuration3: { rawHours: handlingDuration3Hours, formatted: formatDurationDHM(handlingDuration3Hours) },
        handling4: row['Penanganan 4'],
        closeHandling4: closeHandling4,
        handlingDuration4: { rawHours: handlingDuration4Hours, formatted: formatDurationDHM(handlingDuration4Hours) },
        handling5: row['Penanganan 5'],
        closeHandling5: closeHandling5,
        handlingDuration5: { rawHours: handlingDuration5Hours, formatted: formatDurationDHM(handlingDuration5Hours) },
        openBy: String(openBy),
        uploadTimestamp: uploadTimestamp,
      };
      tickets.push(ticket);
    });
  
    return { tickets, errorRows };
};

export default UploadProcess;
