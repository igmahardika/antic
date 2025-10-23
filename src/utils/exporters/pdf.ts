// src/utils/exporters/pdf.ts
export async function exportPDF<T extends object>(rows: T[], filename: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const headers = Object.keys(rows[0] ?? {});
  let y = 10;
  doc.setFontSize(10);
  doc.text(headers.join(' | '), 10, y); y += 8;
  rows.forEach((r) => {
    const line = headers.map((h) => String((r as any)[h] ?? '')).join(' | ');
    doc.text(line, 10, y); y += 6; if (y > 280) { doc.addPage(); y = 10; }
  });
  doc.save(filename.endsWith('.pdf') ? filename : filename + '.pdf');
}
