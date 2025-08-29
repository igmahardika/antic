// Script untuk membuat file Excel sample dengan data incident
// Jalankan: node create-test-excel.js

import XLSX from 'xlsx';
import fs from 'fs';

// Data sample untuk testing
const sampleData = [
  {
    'Priority': 'High',
    'Site': 'Jakarta Central',
    'No Case': 'INC-2024-001',
    'NCAL': 'Red',
    'Status': 'Done',
    'Level': 1,
    'TS': 'TS001',
    'ODP/BTS': 'ODP-001',
    'Start': '2024-01-15 08:30:00',
    'Start Escalation Vendor': '2024-01-15 09:00:00',
    'End': '2024-01-15 12:30:00',
    'Duration': '04:00:00',
    'Duration Vendor': '03:30:00',
    'Problem': 'Fiber Cut',
    'Penyebab': 'Construction Damage',
    'Action Terakhir': 'Fiber Splicing',
    'Note': 'Emergency repair completed',
    'Klasifikasi Gangguan': 'Fiber',
    'Power Before': -25.5,
    'Power After': -20.1,
    'Start Pause': '2024-01-15 10:00:00',
    'End Pause': '2024-01-15 10:30:00',
    'Start Pause 2': '',
    'End Pause 2': '',
    'Total Duration Pause': '00:30:00',
    'Total Duration Vendor': '03:30:00'
  },
  {
    'Priority': 'Medium',
    'Site': 'Bandung West',
    'No Case': 'INC-2024-002',
    'NCAL': 'Yellow',
    'Status': 'Done',
    'Level': 2,
    'TS': 'TS002',
    'ODP/BTS': 'ODP-002',
    'Start': '2024-01-16 14:00:00',
    'Start Escalation Vendor': '2024-01-16 14:15:00',
    'End': '2024-01-16 16:00:00',
    'Duration': '02:00:00',
    'Duration Vendor': '01:45:00',
    'Problem': 'Equipment Failure',
    'Penyebab': 'Hardware Malfunction',
    'Action Terakhir': 'Equipment Replacement',
    'Note': 'Standard maintenance procedure',
    'Klasifikasi Gangguan': 'Equipment',
    'Power Before': -30.2,
    'Power After': -28.5,
    'Start Pause': '',
    'End Pause': '',
    'Start Pause 2': '',
    'End Pause 2': '',
    'Total Duration Pause': '00:00:00',
    'Total Duration Vendor': '01:45:00'
  },
  {
    'Priority': 'Low',
    'Site': 'Surabaya East',
    'No Case': 'INC-2024-003',
    'NCAL': 'Blue',
    'Status': 'Done',
    'Level': 3,
    'TS': 'TS003',
    'ODP/BTS': 'ODP-003',
    'Start': '2024-01-17 09:00:00',
    'Start Escalation Vendor': '2024-01-17 09:30:00',
    'End': '2024-01-17 10:30:00',
    'Duration': '01:30:00',
    'Duration Vendor': '01:00:00',
    'Problem': 'Configuration Issue',
    'Penyebab': 'Software Bug',
    'Action Terakhir': 'Configuration Update',
    'Note': 'Minor configuration adjustment',
    'Klasifikasi Gangguan': 'Software',
    'Power Before': -22.1,
    'Power After': -21.8,
    'Start Pause': '',
    'End Pause': '',
    'Start Pause 2': '',
    'End Pause 2': '',
    'Total Duration Pause': '00:00:00',
    'Total Duration Vendor': '01:00:00'
  },
  {
    'Priority': 'High',
    'Site': 'Medan North',
    'No Case': 'INC-2024-004',
    'NCAL': 'Orange',
    'Status': 'Done',
    'Level': 1,
    'TS': 'TS004',
    'ODP/BTS': 'ODP-004',
    'Start': '2024-01-18 11:00:00',
    'Start Escalation Vendor': '2024-01-18 11:15:00',
    'End': '2024-01-18 14:00:00',
    'Duration': '03:00:00',
    'Duration Vendor': '02:45:00',
    'Problem': 'Power Outage',
    'Penyebab': 'Electrical Fault',
    'Action Terakhir': 'Power Restoration',
    'Note': 'Backup power activated',
    'Klasifikasi Gangguan': 'Power',
    'Power Before': -35.0,
    'Power After': -25.0,
    'Start Pause': '2024-01-18 12:00:00',
    'End Pause': '2024-01-18 12:30:00',
    'Start Pause 2': '',
    'End Pause 2': '',
    'Total Duration Pause': '00:30:00',
    'Total Duration Vendor': '02:45:00'
  },
  {
    'Priority': 'Medium',
    'Site': 'Makassar South',
    'No Case': 'INC-2024-005',
    'NCAL': 'Black',
    'Status': 'Done',
    'Level': 1,
    'TS': 'TS005',
    'ODP/BTS': 'ODP-005',
    'Start': '2024-01-19 16:00:00',
    'Start Escalation Vendor': '2024-01-19 16:05:00',
    'End': '2024-01-19 17:30:00',
    'Duration': '01:30:00',
    'Duration Vendor': '01:25:00',
    'Problem': 'Critical System Failure',
    'Penyebab': 'System Overload',
    'Action Terakhir': 'System Restart',
    'Note': 'Critical incident resolved quickly',
    'Klasifikasi Gangguan': 'System',
    'Power Before': -40.0,
    'Power After': -30.0,
    'Start Pause': '',
    'End Pause': '',
    'Start Pause 2': '',
    'End Pause 2': '',
    'Total Duration Pause': '00:00:00',
    'Total Duration Vendor': '01:25:00'
  }
];

// Tambahkan lebih banyak data untuk testing yang lebih komprehensif
for (let i = 6; i <= 50; i++) {
  const priorities = ['High', 'Medium', 'Low'];
  const sites = ['Jakarta Central', 'Bandung West', 'Surabaya East', 'Medan North', 'Makassar South', 'Semarang Central', 'Palembang South', 'Manado North'];
  const ncals = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];
  const statuses = ['Done', 'In Progress', 'Open'];
  const problems = ['Fiber Cut', 'Equipment Failure', 'Configuration Issue', 'Power Outage', 'System Failure', 'Network Congestion', 'Hardware Malfunction', 'Software Bug'];
  const causes = ['Construction Damage', 'Hardware Malfunction', 'Software Bug', 'Electrical Fault', 'System Overload', 'Human Error', 'Natural Disaster', 'Vandalism'];
  const classifications = ['Fiber', 'Equipment', 'Software', 'Power', 'System', 'Network', 'Hardware', 'Configuration'];
  
  const randomDate = new Date(2024, 0, 15 + Math.floor(Math.random() * 30)); // Random date in January 2024
  const startHour = 8 + Math.floor(Math.random() * 12); // 8 AM to 8 PM
  const duration = 30 + Math.floor(Math.random() * 180); // 30 minutes to 3 hours
  
  const startTime = new Date(randomDate);
  startTime.setHours(startHour, Math.floor(Math.random() * 60), 0);
  
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);
  
  const priority = priorities[Math.floor(Math.random() * priorities.length)];
  const ncal = ncals[Math.floor(Math.random() * ncals.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  sampleData.push({
    'Priority': priority,
    'Site': sites[Math.floor(Math.random() * sites.length)],
    'No Case': `INC-2024-${String(i).padStart(3, '0')}`,
    'NCAL': ncal,
    'Status': status,
    'Level': Math.floor(Math.random() * 3) + 1,
    'TS': `TS${String(i).padStart(3, '0')}`,
    'ODP/BTS': `ODP-${String(i).padStart(3, '0')}`,
    'Start': startTime.toISOString().replace('T', ' ').substring(0, 19),
    'Start Escalation Vendor': new Date(startTime.getTime() + 15 * 60000).toISOString().replace('T', ' ').substring(0, 19),
    'End': endTime.toISOString().replace('T', ' ').substring(0, 19),
    'Duration': `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}:00`,
    'Duration Vendor': `${Math.floor((duration - 15) / 60)}:${String((duration - 15) % 60).padStart(2, '0')}:00`,
    'Problem': problems[Math.floor(Math.random() * problems.length)],
    'Penyebab': causes[Math.floor(Math.random() * causes.length)],
    'Action Terakhir': 'Standard Resolution',
    'Note': 'Automated test data',
    'Klasifikasi Gangguan': classifications[Math.floor(Math.random() * classifications.length)],
    'Power Before': -30 + Math.random() * 10,
    'Power After': -25 + Math.random() * 10,
    'Start Pause': '',
    'End Pause': '',
    'Start Pause 2': '',
    'End Pause 2': '',
    'Total Duration Pause': '00:00:00',
    'Total Duration Vendor': `${Math.floor((duration - 15) / 60)}:${String((duration - 15) % 60).padStart(2, '0')}:00`
  });
}

// Buat workbook dan worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
const columnWidths = [
  { wch: 10 }, // Priority
  { wch: 15 }, // Site
  { wch: 12 }, // No Case
  { wch: 8 },  // NCAL
  { wch: 10 }, // Status
  { wch: 6 },  // Level
  { wch: 8 },  // TS
  { wch: 10 }, // ODP/BTS
  { wch: 20 }, // Start
  { wch: 20 }, // Start Escalation Vendor
  { wch: 20 }, // End
  { wch: 12 }, // Duration
  { wch: 15 }, // Duration Vendor
  { wch: 20 }, // Problem
  { wch: 20 }, // Penyebab
  { wch: 20 }, // Action Terakhir
  { wch: 25 }, // Note
  { wch: 20 }, // Klasifikasi Gangguan
  { wch: 12 }, // Power Before
  { wch: 12 }, // Power After
  { wch: 20 }, // Start Pause
  { wch: 20 }, // End Pause
  { wch: 20 }, // Start Pause 2
  { wch: 20 }, // End Pause 2
  { wch: 18 }, // Total Duration Pause
  { wch: 20 }  // Total Duration Vendor
];

worksheet['!cols'] = columnWidths;

// Tambahkan worksheet ke workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Incidents');

// Tulis file
const filename = 'test-incident-data.xlsx';
XLSX.writeFile(workbook, filename);

console.log(`✅ File Excel sample berhasil dibuat: ${filename}`);
console.log(`📊 Total data: ${sampleData.length} incidents`);
console.log(`📋 Kolom yang tersedia: ${Object.keys(sampleData[0]).join(', ')}`);
console.log(`\n💡 Cara menggunakan:`);
console.log(`1. Upload file ${filename} ke halaman Incident Data`);
console.log(`2. Setelah upload berhasil, kunjungi halaman Incident Analytics`);
console.log(`3. Semua chart dan perhitungan akan menampilkan data`);