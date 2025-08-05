#!/usr/bin/env node

/**
 * Database Migration Runner
 * This script runs all SQL migration files in the migrations directory
 */

import { createConnection } from 'mysql2/promise';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'hmrnexa',
  password: process.env.DB_PASS || '7ynkgnqiiF6phLSRNHli',
  database: process.env.DB_NAME || 'helpdesk',
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: true
};

console.log('🚀 Starting database migration...');
console.log(`📊 Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);

async function runMigrations() {
  let connection;
  
  try {
    // Connect to database
    connection = await createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Get migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql') && !file.includes('.save') && !file.includes('migrate.js'))
      .sort(); // Run migrations in order
    
    console.log(`📁 Found ${sqlFiles.length} migration files`);
    
    for (const file of sqlFiles) {
      console.log(`🔄 Running migration: ${file}`);
      
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      // Execute each statement separately
      for (const statement of statements) {
        if (statement.trim()) {
          await connection.execute(statement);
        }
      }
      
      console.log(`✅ Completed: ${file}`);
    }
    
    console.log('🎉 All migrations completed successfully!');
    
    // Verify tables were created
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables in database:');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`   - ${tableName}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migrations
runMigrations().catch(console.error);