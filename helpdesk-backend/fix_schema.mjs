import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'hmrnexa',
  password: '7ynkgnqiiF6phLSRNHli',
  database: 'helpdesk',
};

async function run() {
  console.log('Connecting to DB...', dbConfig.host, dbConfig.user);
  try {
      const conn = await mysql.createConnection(dbConfig);
      console.log('Connected.');
      
      const alterSetup = [
        "ALTER TABLE incidents ADD COLUMN batch_id VARCHAR(255)",
        "ALTER TABLE incidents ADD COLUMN file_name VARCHAR(255)",
        "ALTER TABLE incidents ADD COLUMN file_hash VARCHAR(64)",
        "ALTER TABLE incidents ADD COLUMN upload_session_id VARCHAR(255)"
      ];

      for (const sql of alterSetup) {
        try {
            await conn.query(sql);
            console.log(`Executed: ${sql}`);
        } catch (e) {
             if (e.code === 'ER_DUP_FIELDNAME') {
                 console.log(`Skipped (already exists): ${sql}`);
             } else {
                 console.error(`Failed: ${sql}`, e.message);
             }
        }
      }
      await conn.end();
      console.log('Schema update complete.');
      process.exit(0);
  } catch (err) {
    console.error('Fatal Error:', err);
    process.exit(1);
  }
}

run();
