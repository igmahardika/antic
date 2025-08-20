export type Incident = {
  id: string;            // sha1(noCase|startTimeIso)
  noCase: string;
  priority?: string | null;
  site?: string | null;
  ncal?: string | null;
  status?: string | null;
  level?: number | null;
  ts?: string | null;
  odpBts?: string | null;

  // waktu disimpan ISO (utc) utk konsistensi
  startTime?: string | null;
  startEscalationVendor?: string | null;
  endTime?: string | null;

  // durasi dalam menit (INT) untuk agregasi cepat
  durationMin?: number;               // dari "Duration"
  durationVendorMin?: number;         // dari "Duration Vendor"

  problem?: string | null;
  penyebab?: string | null;
  actionTerakhir?: string | null;
  note?: string | null;
  klasifikasiGangguan?: string | null;

  powerBefore?: number | null;
  powerAfter?: number | null;

  startPause1?: string | null;
  endPause1?: string | null;
  startPause2?: string | null;
  endPause2?: string | null;

  totalDurationPauseMin?: number;     // dari "Total Duration Pause"
  totalDurationVendorMin?: number;    // dari "Total Duration Vendor"

  // turunan (bisa dihitung on the fly jg)
  netDurationMin?: number;            // = max(durationMin - totalDurationPauseMin, 0)

  // metadata impor
  batchId?: string;                   // UUID untuk sekali impor
  importedAt?: string;                // ISO
};

export type IncidentStats = {
  total: number;
  open: number;
  mttrMin: number; // rata2
  avgVendorMin: number;
  pauseRatio: number;
  byPriority: Record<string, number>;
  byKlas: Record<string, number>;
  bySite: Record<string, number>;
  byLevel: Record<string, number>;
};

export type IncidentFilter = {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  priority?: string;
  level?: number;
  site?: string;
  ncal?: string;
  klasifikasiGangguan?: string;
  search?: string;
  page?: number;
  limit?: number;
};

// Tipe data & normalisasi
export type NCAL = 'BLUE' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';

export type IncidentRecord = {
  rowKey: string;           // sha1(noCase|startTimeIso) untuk idempotensi
  ncal: NCAL;              // NCAL valid (BLUE/YELLOW/ORANGE/RED/BLACK)
  sheet: string;           // nama sheet Excel
  openTime?: string | null; // ISO atau null
  closeTime?: string | null; // ISO atau null
  site?: string | null;
  category?: string | null;
  ncalLevel: number;       // 1=BLUE, 2=YELLOW, 3=ORANGE, 4=RED, 5=BLACK
  noCase?: string | null;
  priority?: string | null;
  status?: string | null;
  level?: number | null;
  ts?: string | null;
  odpBts?: string | null;
  startEscalationVendor?: string | null;
  durationMin?: number | null;
  durationVendorMin?: number | null;
  problem?: string | null;
  penyebab?: string | null;
  actionTerakhir?: string | null;
  note?: string | null;
  klasifikasiGangguan?: string | null;
  powerBefore?: number | null;
  powerAfter?: number | null;
  startPause1?: string | null;
  endPause1?: string | null;
  startPause2?: string | null;
  endPause2?: string | null;
  totalDurationPauseMin?: number | null;
  totalDurationVendorMin?: number | null;
  netDurationMin?: number | null;
  batchId?: string;
  importedAt?: string;
};

// Konstanta NCAL
export const NCAL_ORDER: Record<NCAL, number> = {
  'BLUE': 1,
  'YELLOW': 2,
  'ORANGE': 3,
  'RED': 4,
  'BLACK': 5
};

export const VALID_NCALS: NCAL[] = ['BLUE', 'YELLOW', 'ORANGE', 'RED', 'BLACK'];
