import * as XLSX from 'xlsx';
import { IncidentRecord, NCAL, VALID_NCALS, NCAL_ORDER } from '@/types/incident';
import { db } from '@/lib/db';

// Fungsi untuk menghasilkan SHA1 hash
async function sha1(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Normalisasi NCAL
function normalizeNCAL(ncal: string): NCAL | null {
  if (!ncal) return null;
  
  const normalized = ncal.trim().toUpperCase();
  
  // Mapping untuk normalisasi
  const ncalMap: Record<string, NCAL> = {
    'BIRU': 'BLUE',
    'KUNING': 'YELLOW',
    'ORANYE': 'ORANGE',
    'MERAH': 'RED',
    'HITAM': 'BLACK',
    'BLUE': 'BLUE',
    'YELLOW': 'YELLOW',
    'ORANGE': 'ORANGE',
    'RED': 'RED',
    'BLACK': 'BLACK'
  };
  
  return ncalMap[normalized] || null;
}

// Parsing tanggal toleran
function parseDate(dateStr: any): string | null {
  if (!dateStr) return null;
  
  try {
    // Coba parse sebagai Excel date number
    if (typeof dateStr === 'number') {
      const excelDate = new Date((dateStr - 25569) * 86400 * 1000);
      return excelDate.toISOString();
    }
    
    // Coba parse sebagai string date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString();
  } catch {
    return null;
  }
}

// Parsing durasi dalam menit
function parseDuration(durationStr: any): number | null {
  if (!durationStr) return null;
  
  try {
    const num = parseFloat(durationStr);
    if (isNaN(num) || num < 0) return null;
    return Math.round(num);
  } catch {
    return null;
  }
}

// Parsing angka
function parseNumber(numStr: any): number | null {
  if (!numStr) return null;
  
  try {
    const num = parseFloat(numStr);
    if (isNaN(num)) return null;
    return num;
  } catch {
    return null;
  }
}

// Parsing string dengan trimming
function parseString(str: any): string | null {
  if (!str) return null;
  const trimmed = String(str).trim();
  return trimmed || null;
}

export interface ImportResult {
  accepted: number;
  rejected: number;
  reasons: string[];
  batchId: string;
}

export async function importIncidentExcel(file: File): Promise<ImportResult> {
  const batchId = crypto.randomUUID();
  const reasons: string[] = [];
  let accepted = 0;
  let rejected = 0;
  
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        reasons.push(`Sheet "${sheetName}": Tidak ada data (minimal 2 baris)`);
        continue;
      }
      
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1) as any[][];
      
      // Cari kolom NCAL (kolom D = index 3)
      const ncalIndex = 3; // Kolom D
      if (!headers[ncalIndex] || !headers[ncalIndex].toString().toUpperCase().includes('NCAL')) {
        reasons.push(`Sheet "${sheetName}": Kolom D bukan NCAL`);
        continue;
      }
      
      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const row = dataRows[rowIndex];
        const rowNum = rowIndex + 2; // +2 karena header + 1-based
        
        try {
          // Ambil NCAL dari kolom D
          const ncalValue = row[ncalIndex];
          const normalizedNCAL = normalizeNCAL(ncalValue);
          
          if (!normalizedNCAL) {
            rejected++;
            reasons.push(`Row ${rowNum} (${sheetName}): NCAL tidak valid "${ncalValue}"`);
            continue;
          }
          
          // Generate rowKey untuk idempotensi
          const noCase = parseString(row[0]) || ''; // Kolom A
          const startTime = parseDate(row[8]); // Kolom I (Start Time)
          const rowKeyInput = `${noCase}|${startTime || ''}`;
          const rowKey = await sha1(rowKeyInput);
          
          // Cek apakah sudah ada (idempotensi)
          const existing = await db.incident.get(rowKey);
          if (existing) {
            reasons.push(`Row ${rowNum} (${sheetName}): Duplikat, sudah ada di database`);
            continue;
          }
          
          // Buat incident record
          const incidentRecord: IncidentRecord = {
            rowKey,
            ncal: normalizedNCAL,
            ncalLevel: NCAL_ORDER[normalizedNCAL],
            sheet: sheetName,
            openTime: parseDate(row[8]), // Kolom I - Start Time
            closeTime: parseDate(row[10]), // Kolom K - End Time
            site: parseString(row[2]), // Kolom C - Site
            category: parseString(row[18]), // Kolom S - Klasifikasi Gangguan
            noCase: parseString(row[0]), // Kolom A - No Case
            priority: parseString(row[1]), // Kolom B - Priority
            status: parseString(row[4]), // Kolom E - Status
            level: parseNumber(row[5]), // Kolom F - Level
            ts: parseString(row[6]), // Kolom G - TS
            odpBts: parseString(row[7]), // Kolom H - ODP/BTS
            startEscalationVendor: parseDate(row[9]), // Kolom J - Start Escalation Vendor
            durationMin: parseDuration(row[11]), // Kolom L - Duration
            durationVendorMin: parseDuration(row[12]), // Kolom M - Duration Vendor
            problem: parseString(row[13]), // Kolom N - Problem
            penyebab: parseString(row[14]), // Kolom O - Penyebab
            actionTerakhir: parseString(row[15]), // Kolom P - Action Terakhir
            note: parseString(row[16]), // Kolom Q - Note
            klasifikasiGangguan: parseString(row[18]), // Kolom S - Klasifikasi Gangguan
            powerBefore: parseNumber(row[19]), // Kolom T - Power Before
            powerAfter: parseNumber(row[20]), // Kolom U - Power After
            startPause1: parseDate(row[21]), // Kolom V - Start Pause 1
            endPause1: parseDate(row[22]), // Kolom W - End Pause 1
            startPause2: parseDate(row[23]), // Kolom X - Start Pause 2
            endPause2: parseDate(row[24]), // Kolom Y - End Pause 2
            totalDurationPauseMin: parseDuration(row[25]), // Kolom Z - Total Duration Pause
            totalDurationVendorMin: parseDuration(row[26]), // Kolom AA - Total Duration Vendor
            netDurationMin: null, // Akan dihitung setelah save
            batchId,
            importedAt: new Date().toISOString()
          };
          
          // Hitung net duration
          if (incidentRecord.durationMin && incidentRecord.totalDurationPauseMin) {
            incidentRecord.netDurationMin = Math.max(incidentRecord.durationMin - incidentRecord.totalDurationPauseMin, 0);
          } else if (incidentRecord.durationMin) {
            incidentRecord.netDurationMin = incidentRecord.durationMin;
          }
          
          // Simpan ke database
          await db.incident.add(incidentRecord);
          accepted++;
          
        } catch (error) {
          rejected++;
          reasons.push(`Row ${rowNum} (${sheetName}): Error processing - ${error}`);
        }
      }
    }
    
    // Batasi jumlah reasons untuk performa
    if (reasons.length > 200) {
      reasons.splice(200, reasons.length - 200, `... dan ${reasons.length - 200} alasan lainnya`);
    }
    
  } catch (error) {
    reasons.push(`Error membaca file: ${error}`);
  }
  
  return {
    accepted,
    rejected,
    reasons,
    batchId
  };
}
