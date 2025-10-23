// src/utils/exporters.ts
export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export async function exportTable<T extends object>(rows: T[], filename: string, fmt: ExportFormat) {
  if (!Array.isArray(rows)) throw new Error('rows must be an array');
  if (fmt === 'csv') return exportCSV(rows, filename);
  if (fmt === 'xlsx') return (await import('./exporters/xlsx')).exportXLSX(rows, filename);
  if (fmt === 'pdf') return (await import('./exporters/pdf')).exportPDF(rows, filename);
  throw new Error('Unsupported format');
}

function exportCSV<T extends object>(rows: T[], filename: string) {
  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => safeCSV((r as any)[h])).join(','))
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : filename + '.csv');
}

function safeCSV(v: any) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
