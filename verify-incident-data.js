// Script untuk memverifikasi data incident di database
// Jalankan dengan: node verify-incident-data.js

const { openDB } = require('idb');

async function verifyIncidentData() {
  console.log('🔍 Memulai verifikasi data incident...\n');

  try {
    // Buka database IndexedDB
    const db = await openDB('InsightTicketDatabase', 5);
    
    // Ambil semua data incident
    const allIncidents = await db.getAll('incidents');
    console.log(`📊 Total incidents di database: ${allIncidents.length}\n`);

    // Analisis NCAL distribution
    const ncalDistribution = {};
    const invalidNCAL = [];
    const emptyFields = {
      noCase: 0,
      site: 0,
      startTime: 0,
      status: 0,
      priority: 0,
      level: 0
    };

    allIncidents.forEach((incident, index) => {
      // NCAL distribution
      const ncal = incident.ncal || 'NULL';
      ncalDistribution[ncal] = (ncalDistribution[ncal] || 0) + 1;

      // Check invalid NCAL
      const validNCAL = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];
      if (ncal !== 'NULL' && !validNCAL.includes(ncal)) {
        invalidNCAL.push({
          index: index + 1,
          id: incident.id,
          noCase: incident.noCase,
          ncal: ncal
        });
      }

      // Check empty fields
      if (!incident.noCase || incident.noCase.trim() === '') emptyFields.noCase++;
      if (!incident.site || incident.site.trim() === '') emptyFields.site++;
      if (!incident.startTime) emptyFields.startTime++;
      if (!incident.status || incident.status.trim() === '') emptyFields.status++;
      if (!incident.priority || incident.priority.trim() === '') emptyFields.priority++;
      if (!incident.level) emptyFields.level++;
    });

    // Tampilkan hasil analisis
    console.log('📈 Distribusi NCAL:');
    Object.entries(ncalDistribution).forEach(([ncal, count]) => {
      const percentage = ((count / allIncidents.length) * 100).toFixed(1);
      console.log(`  ${ncal}: ${count} (${percentage}%)`);
    });

    console.log('\n🔍 Analisis Field Kosong:');
    Object.entries(emptyFields).forEach(([field, count]) => {
      const percentage = ((count / allIncidents.length) * 100).toFixed(1);
      console.log(`  ${field}: ${count} (${percentage}%)`);
    });

    if (invalidNCAL.length > 0) {
      console.log('\n⚠️  NCAL Invalid:');
      invalidNCAL.slice(0, 10).forEach(item => {
        console.log(`  Row ${item.index}: ${item.noCase} - NCAL: "${item.ncal}"`);
      });
      if (invalidNCAL.length > 10) {
        console.log(`  ... dan ${invalidNCAL.length - 10} lagi`);
      }
    }

    // Analisis batch ID untuk melihat upload patterns
    const batchIds = {};
    allIncidents.forEach(incident => {
      const batchId = incident.batchId || 'NO_BATCH';
      batchIds[batchId] = (batchIds[batchId] || 0) + 1;
    });

    console.log('\n📦 Analisis Batch Upload:');
    Object.entries(batchIds).forEach(([batchId, count]) => {
      console.log(`  ${batchId}: ${count} incidents`);
    });

    // Sample data untuk debugging
    console.log('\n📋 Sample Data (5 pertama):');
    allIncidents.slice(0, 5).forEach((incident, index) => {
      console.log(`\n  Incident ${index + 1}:`);
      console.log(`    ID: ${incident.id}`);
      console.log(`    No Case: ${incident.noCase}`);
      console.log(`    NCAL: ${incident.ncal}`);
      console.log(`    Site: ${incident.site}`);
      console.log(`    Start Time: ${incident.startTime}`);
      console.log(`    Status: ${incident.status}`);
      console.log(`    Priority: ${incident.priority}`);
      console.log(`    Level: ${incident.level}`);
      console.log(`    Batch ID: ${incident.batchId}`);
    });

    // Rekomendasi
    console.log('\n💡 Rekomendasi:');
    if (allIncidents.length < 1247) {
      console.log(`  ❌ Data tidak lengkap: ${allIncidents.length} dari 1247 yang diupload`);
      console.log('  🔧 Periksa log upload untuk melihat baris yang di-skip');
    } else {
      console.log('  ✅ Data lengkap sesuai dengan yang diupload');
    }

    if (Object.values(emptyFields).some(count => count > 0)) {
      console.log('  ⚠️  Ada field yang kosong, periksa validasi upload');
    }

    if (invalidNCAL.length > 0) {
      console.log('  ⚠️  Ada NCAL yang tidak valid, periksa data source');
    }

  } catch (error) {
    console.error('❌ Error saat verifikasi:', error);
  }
}

// Jalankan verifikasi
verifyIncidentData();
