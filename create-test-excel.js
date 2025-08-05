// Script untuk membuat file Excel test kecil
// Jalankan dengan: node create-test-excel.js

import ExcelJS from 'exceljs';

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Data');

  // Headers yang sesuai dengan aplikasi
  const headers = [
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

  // Add headers
  worksheet.addRow(headers);

  // Test data dengan berbagai format tanggal
  const testRows = [
    // Row 1 - Format string DD/MM/YYYY HH:MM:SS
    [
      "CUST001", "John Doe", "Technical", "Network Issue", "Router Problem", "Restart Router",
      "01/01/2024 10:30:00", "01/01/2024 12:00:00", "1.5", "01/01/2024 11:45:00", "1.25",
      "Hardware", "Network", "Closed", "Jakarta",
      "Check Router", "01/01/2024 11:00:00", "0.5",
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", "",
      "Agent1"
    ],
    // Row 2 - Format Excel numeric date
    [
      "CUST002", "Jane Smith", "Software", "App Crash", "Memory Leak", "Update App",
      44927.4375, 44927.5, "1.5", 44927.49, "1.25", // Excel numeric dates
      "Software", "Application", "Closed", "Bandung",
      "Diagnose", 44927.46, "0.5",
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", "",
      "Agent2"
    ],
    // Row 3 - Format YYYY-MM-DD
    [
      "CUST003", "Bob Wilson", "Hardware", "Printer Issue", "Paper Jam", "Clear Jam",
      "2024-01-03 14:15:00", "2024-01-03 15:30:00", "1.25", "2024-01-03 15:00:00", "0.75",
      "Hardware", "Printer", "Open", "Surabaya",
      "Check Printer", "2024-01-03 14:30:00", "0.25",
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", "",
      "Agent3"
    ],
    // Row 4 - Format MM/DD/YYYY (US format)
    [
      "CUST004", "Alice Brown", "Network", "Slow Internet", "Bandwidth", "Upgrade Plan",
      "01/04/2024 09:00:00", "01/04/2024 10:30:00", "1.5", "01/04/2024 10:15:00", "1.25",
      "Network", "Internet", "Closed", "Medan",
      "Speed Test", "01/04/2024 09:30:00", "0.5",
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", "",
      "Agent1"
    ],
    // Row 5 - Format tanpa waktu
    [
      "CUST005", "Charlie Davis", "System", "Login Error", "Password", "Reset Password",
      "05/01/2024", "05/01/2024", "0.5", "05/01/2024", "0.25",
      "System", "Authentication", "Closed", "Makassar",
      "Reset", "05/01/2024", "0.25",
      "", "", "",
      "", "", "",
      "", "", "",
      "", "", "",
      "Agent2"
    ]
  ];

  // Add test rows
  testRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Auto-width columns
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Save file
  await workbook.xlsx.writeFile('test-data-5-rows.xlsx');
  console.log('✅ Test Excel file created: test-data-5-rows.xlsx');
  console.log('📊 Contains 5 test rows with different date formats:');
  console.log('   - Row 1: DD/MM/YYYY HH:MM:SS (string)');
  console.log('   - Row 2: Excel numeric dates');
  console.log('   - Row 3: YYYY-MM-DD HH:MM:SS');
  console.log('   - Row 4: MM/DD/YYYY HH:MM:SS (US format)');
  console.log('   - Row 5: DD/MM/YYYY (no time)');
}

createTestExcel().catch(console.error);