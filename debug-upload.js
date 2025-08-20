// Debug script untuk memverifikasi upload incident data
// Jalankan dengan: node debug-upload.js

const { openDB } = require('idb');

async function debugUpload() {
  console.log('🔍 Memulai debug upload incident data...\n');

  try {
    // Buka database IndexedDB
    const db = await openDB('InsightTicketDatabase', 5);
    
    // Cek struktur database
    console.log('📊 Database Info:');
    console.log('- Database name:', db.name);
    console.log('- Database version:', db.version);
    console.log('- Object stores:', db.objectStoreNames);
    
    // Cek data incidents
    const allIncidents = await db.getAll('incidents');
    console.log(`\n📋 Incident Data:`);
    console.log(`- Total incidents: ${allIncidents.length}`);
    
    if (allIncidents.length > 0) {
      console.log('- Sample incident:', allIncidents[0]);
      console.log('- NCAL values:', [...new Set(allIncidents.map(i => i.ncal))]);
    } else {
      console.log('- No incidents found in database');
    }
    
    // Cek data tickets untuk perbandingan
    const allTickets = await db.getAll('tickets');
    console.log(`\n📋 Ticket Data:`);
    console.log(`- Total tickets: ${allTickets.length}`);
    
    // Cek data customers
    const allCustomers = await db.getAll('customers');
    console.log(`\n📋 Customer Data:`);
    console.log(`- Total customers: ${allCustomers.length}`);
    
    // Test database operations
    console.log(`\n🧪 Testing database operations:`);
    
    // Test count operation
    const incidentCount = await db.count('incidents');
    console.log(`- Incident count: ${incidentCount}`);
    
    // Test add operation
    const testIncident = {
      id: 'TEST-' + Date.now(),
      noCase: 'TEST-CASE-001',
      ncal: 'Blue',
      site: 'Test Site',
      startTime: new Date().toISOString(),
      status: 'Open',
      priority: 'High',
      level: 1,
      problem: 'Test problem',
      batchId: 'test-batch',
      importedAt: new Date().toISOString()
    };
    
    console.log('- Adding test incident...');
    await db.add('incidents', testIncident);
    console.log('- Test incident added successfully');
    
    // Verify test incident was added
    const newCount = await db.count('incidents');
    console.log(`- New incident count: ${newCount}`);
    
    // Clean up test data
    console.log('- Removing test incident...');
    await db.delete('incidents', testIncident.id);
    console.log('- Test incident removed');
    
    const finalCount = await db.count('incidents');
    console.log(`- Final incident count: ${finalCount}`);
    
    console.log('\n✅ Database operations test completed successfully');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Jalankan debug
debugUpload();
