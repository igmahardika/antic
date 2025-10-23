// src/utils/exporters/xlsx.ts
export async function exportXLSX<T extends object>(rows: T[], filename: string) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const { downloadBlob } = await import('../exporters');
  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
}
