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
