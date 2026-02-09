import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'hmrnexa',
  password: '7ynkgnqiiF6phLSRNHli',
  database: 'helpdesk',
};

async function run() {
  console.log('Connecting to DB...');
  try {
      const conn = await mysql.createConnection(dbConfig);
      console.log('Connected.');
      
      // Check existing columns
      const [columns] = await conn.query("SHOW COLUMNS FROM incidents");
      const columnNames = columns.map(c => c.Field);
      console.log('Current columns:', columnNames);

      const neededColumns = [
          'duration_min', 
          'duration_vendor_min', 
          'total_duration_pause_min', 
          'total_duration_vendor_min'
      ];

      for (const col of neededColumns) {
          if (!columnNames.includes(col)) {
              console.log(`Missing column: ${col}. Attempting to fix...`);
              // Try to find if there is a 'duration' column to rename, or just add new
              if (col === 'duration_min' && columnNames.includes('duration')) {
                  await conn.query("ALTER TABLE incidents CHANGE COLUMN duration duration_min DECIMAL(10,2) DEFAULT 0");
                  console.log('Renamed duration -> duration_min');
              } else if (col === 'duration_vendor_min' && columnNames.includes('duration_vendor')) {
                  await conn.query("ALTER TABLE incidents CHANGE COLUMN duration_vendor duration_vendor_min DECIMAL(10,2) DEFAULT 0");
                  console.log('Renamed duration_vendor -> duration_vendor_min');
              } else {
                  await conn.query(`ALTER TABLE incidents ADD COLUMN ${col} DECIMAL(10,2) DEFAULT 0`);
                  console.log(`Added column ${col}`);
              }
          } else {
              console.log(`Column ${col} already exists.`);
          }
      }

      await conn.end();
      console.log('Duration column update complete.');
      process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
}

run();
