// Debug script untuk memeriksa data incidents
import Dexie from 'dexie';

class DebugDB extends Dexie {
  incidents;
  
  constructor() {
    super('InsightTicketDatabase');
    this.version(5).stores({
      incidents: 'id, startTime, status, priority, site, klasifikasiGangguan, level, ncal, noCase'
    });
  }
}

async function debugIncidents() {
  const db = new DebugDB();
  
  try {
    console.log('🔍 Checking incidents data...');
    
    const count = await db.incidents.count();
    console.log(`📊 Total incidents in database: ${count}`);
    
    if (count > 0) {
      const sampleIncidents = await db.incidents.limit(5).toArray();
      console.log('\n📋 Sample incidents:');
      sampleIncidents.forEach((incident, index) => {
        console.log(`\n--- Incident ${index + 1} ---`);
        console.log('ID:', incident.id);
        console.log('No Case:', incident.noCase);
        console.log('Site:', incident.site);
        console.log('NCAL:', incident.ncal);
        console.log('Status:', incident.status);
        console.log('Priority:', incident.priority);
        console.log('Level:', incident.level);
        console.log('Start Time:', incident.startTime);
        console.log('Duration (min):', incident.durationMin);
        console.log('Klasifikasi:', incident.klasifikasiGangguan);
      });
      
      // Check NCAL distribution
      const ncalCounts = {};
      const allIncidents = await db.incidents.toArray();
      allIncidents.forEach(inc => {
        const ncal = inc.ncal || 'Unknown';
        ncalCounts[ncal] = (ncalCounts[ncal] || 0) + 1;
      });
      
      console.log('\n🎯 NCAL Distribution:');
      Object.entries(ncalCounts).forEach(([ncal, count]) => {
        console.log(`${ncal}: ${count}`);
      });
      
      // Check status distribution
      const statusCounts = {};
      allIncidents.forEach(inc => {
        const status = inc.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('\n📈 Status Distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`${status}: ${count}`);
      });
      
    } else {
      console.log('❌ No incidents found in database');
      console.log('💡 Please upload some incident data first');
    }
    
  } catch (error) {
    console.error('❌ Error accessing database:', error);
  } finally {
    await db.close();
  }
}

debugIncidents();
