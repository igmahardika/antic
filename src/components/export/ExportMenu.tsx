// src/components/export/ExportMenu.tsx
import { exportTable } from '../../utils/exporters';

export function ExportMenu<T extends object>({ rows, filename }: { rows: T[]; filename: string; }) {
  return (
    <div className="flex gap-2">
      <button onClick={() => exportTable(rows, filename, 'csv')} className="btn">CSV</button>
      <button onClick={() => exportTable(rows, filename, 'xlsx')} className="btn">Excel</button>
      <button onClick={() => exportTable(rows, filename, 'pdf')} className="btn">PDF</button>
    </div>
  );
}
