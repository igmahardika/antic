// Script untuk membuat template Excel dengan format yang benar
// Copy paste ke browser console

console.log('📊 CREATING EXCEL TEMPLATE...');

// Fungsi untuk membuat template Excel
function createExcelTemplate() {
  console.log('🔧 Generating Excel template...');
  
  // Template data dengan format yang benar
  const templateData = [
    {
      'Priority': 'High',
      'Site': 'Site A',
      'No Case': 'C250001',
      'NCAL': 'Blue',
      'Status': 'Done',
      'Level': '1',
      'TS': 'Waneda',
      'ODP/BTS': 'ODP-001',
      'Start': '01/01/25 08:00:00',
      'Start Escalation Vendor': '01/01/25 08:30:00',
      'End': '01/01/25 10:00:00',
      'Duration': '02:00:00',
      'Duration Vendor': '01:30:00',
      'Problem': 'Kabel putus',
      'Penyebab': 'Kabel terpotong',
      'Action Terakhir': 'Perbaikan kabel',
      'Note': 'Perbaikan selesai',
      'Klasifikasi Gangguan': 'Kabel (Putus)',
      'Power Before': '-25.5',
      'Power After': '-26.2',
      'Pause': '01/01/25 09:00:00',
      'Restart': '01/01/25 09:15:00',
      'Pause2': '01/01/25 09:30:00',
      'Restart2': '01/01/25 09:45:00',
      'Total Duration Pause': '00:30:00',
      'Total Duration Vendor': '01:00:00'
    },
    {
      'Priority': 'Medium',
      'Site': 'Site B',
      'No Case': 'C250002',
      'NCAL': 'Yellow',
      'Status': 'Done',
      'Level': '2',
      'TS': 'Lintas',
      'ODP/BTS': 'ODP-002',
      'Start': '01/01/25 14:00:00',
      'Start Escalation Vendor': '01/01/25 14:15:00',
      'End': '01/01/25 16:30:00',
      'Duration': '02:30:00',
      'Duration Vendor': '02:15:00',
      'Problem': 'Radio rusak',
      'Penyebab': 'Komponen radio bermasalah',
      'Action Terakhir': 'Ganti radio',
      'Note': 'Radio diganti',
      'Klasifikasi Gangguan': 'Perangkat (Radio Rusak)',
      'Power Before': '-28.1',
      'Power After': '-27.8',
      'Pause': '01/01/25 15:00:00',
      'Restart': '01/01/25 15:30:00',
      'Pause2': '',
      'Restart2': '',
      'Total Duration Pause': '00:30:00',
      'Total Duration Vendor': '01:45:00'
    },
    {
      'Priority': 'Low',
      'Site': 'Site C',
      'No Case': 'C250003',
      'NCAL': 'Orange',
      'Status': 'Done',
      'Level': '3',
      'TS': 'Fiber',
      'ODP/BTS': 'ODP-003',
      'Start': '01/01/25 20:00:00',
      'Start Escalation Vendor': '01/01/25 20:30:00',
      'End': '01/01/25 23:00:00',
      'Duration': '03:00:00',
      'Duration Vendor': '02:30:00',
      'Problem': 'Splicing rusak',
      'Penyebab': 'Splicing tidak rapi',
      'Action Terakhir': 'Resplicing',
      'Note': 'Splicing diperbaiki',
      'Klasifikasi Gangguan': 'Splicing (Rusak)',
      'Power Before': '-30.5',
      'Power After': '-29.2',
      'Pause': '01/01/25 21:00:00',
      'Restart': '01/01/25 21:45:00',
      'Pause2': '01/01/25 22:00:00',
      'Restart2': '01/01/25 22:15:00',
      'Total Duration Pause': '01:00:00',
      'Total Duration Vendor': '01:30:00'
    }
  ];
  
  // Convert to CSV format
  const headers = Object.keys(templateData[0]);
  const csvContent = [
    headers.join(','),
    ...templateData.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'incident_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  console.log('✅ Excel template created and downloaded!');
  console.log('\n📋 TEMPLATE COLUMNS:');
  headers.forEach((header, index) => {
    console.log(`${index + 1}. ${header}`);
  });
  
  console.log('\n📋 SAMPLE DATA:');
  templateData.forEach((row, index) => {
    console.log(`\nRow ${index + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
  
  console.log('\n💡 INSTRUCTIONS:');
  console.log('1. Download template CSV file');
  console.log('2. Open in Excel or Google Sheets');
  console.log('3. Fill in your data following the format');
  console.log('4. Save as Excel (.xlsx) or CSV (.csv)');
  console.log('5. Upload to the application');
  
  console.log('\n🎯 IMPORTANT COLUMNS FOR PAUSE DATA:');
  console.log('- Pause: Start time of first pause (DD/MM/YY HH:MM:SS)');
  console.log('- Restart: End time of first pause (DD/MM/YY HH:MM:SS)');
  console.log('- Pause2: Start time of second pause (DD/MM/YY HH:MM:SS)');
  console.log('- Restart2: End time of second pause (DD/MM/YY HH:MM:SS)');
  console.log('- Total Duration Pause: Total pause time (HH:MM:SS)');
  console.log('- Total Duration Vendor: Vendor duration minus pause (HH:MM:SS)');
  
  return csvContent;
}

// Jalankan pembuatan template
createExcelTemplate();
