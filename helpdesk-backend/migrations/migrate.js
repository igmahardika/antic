#!/usr/bin/env node
/**
 * Database Migration Script for AN-TIC Analytics Dashboard
 *
 * Usage:
 *   node migrations/migrate.js           → jalankan semua migration & seeding
 *   node migrations/migrate.js --status  → tampilkan status
 *   node migrations/migrate.js --rollback→ rollback 1 migration terakhir (manual)
 */

import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, readdirSync } from 'fs';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);      // …/migrations

/* ---------------------------------------------------------------------- */
/* 1. KONFIGURASI DB                                                      */
/* ---------------------------------------------------------------------- */
const dbConfig = {
  host:     process.env.DB_HOST || 'localhost',
 /* ↓ fallback baru sesuai kredensial Anda */
  user:     process.env.DB_USER || 'hmrnexa',
  password: process.env.DB_PASS || '7ynkgnqiiF6phLSRNHli',
  database: process.env.DB_NAME || 'helpdesk',
  port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  multipleStatements: true,                 // ← kunci multi-statement
  namedPlaceholders : true,                 // opsional, enak untuk query kompleks
};

/* ---------------------------------------------------------------------- */
/* 2. DATA USER DEFAULT                                                   */
/* ---------------------------------------------------------------------- */
const defaultUsers = [
  { username: 'admin',    password: 'admin123',    role: 'super admin' },
  { username: 'manager',  password: 'manager123',  role: 'admin'       },
  { username: 'operator', password: 'operator123', role: 'user'        },
  { username: 'user1',    password: 'user123',     role: 'user'        },
  { username: 'user2',    password: 'user456',     role: 'user'        },
  { username: 'analyst',  password: 'analyst123',  role: 'admin'       },
];

/* ---------------------------------------------------------------------- */
/* 3. KELAS MIGRATOR                                                      */
/* ---------------------------------------------------------------------- */
class DatabaseMigrator {
  /* .................................... */
  constructor() { this.connection = null; }

  /* .................................... */
  async connect() {
    try {
      /* -- 3a. koneksi tanpa DB dulu utk CREATE DATABASE jika belum ada -- */
      const temp = await createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        port: dbConfig.port,
      });
      await temp.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await temp.end();

      /* -- 3b. konek ke DB target dgn opsi multi-statements -- */
      this.connection = await createConnection(dbConfig);
      console.log(`✅ Connected to MySQL database: ${dbConfig.database}`);
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    }
  }

  /* .................................... */
  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Database connection closed');
    }
  }

  /* .................................... */
  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_filename (filename)
      )
    `;
    await this.connection.execute(sql);     // tunggal, pakai execute OK
    console.log('✅ Migrations table ready');
  }

  /* .................................... */
  async getExecutedMigrations() {
    const [rows] = await this.connection.execute(
      'SELECT filename FROM migrations ORDER BY id'
    );
    return rows.map(r => r.filename);
  }

  /* .................................... */
  async executeMigration(filename, sql) {
    try {
      /* -- GUNAKAN .query() supaya multi-statement bekerja -- */
      await this.connection.query(sql);

      /* -- catat keberhasilan -- */
      await this.connection.execute(
        'INSERT INTO migrations (filename) VALUES (?)', [filename],
      );
      console.log(`✅ Migration executed: ${filename}`);
    } catch (err) {
      console.error(`❌ Migration failed: ${filename}\n   → ${err.message}`);
      throw err;
    }
  }

  /* .................................... */
  async hashPasswords() {
    const out = [];
    for (const u of defaultUsers) {
      out.push({ ...u, password: await bcrypt.hash(u.password, 10) });
    }
    return out;
  }

  /* .................................... */
  async seedUsers() {
    const [[{ count }]] = await this.connection.execute(
      'SELECT COUNT(*) AS count FROM users'
    );
    if (count > 0) {
      console.log('ℹ️  Users already exist – skipping seed');
      return;
    }

    console.log('🌱 Seeding default users…');
    const users = await this.hashPasswords();
    for (const u of users) {
      await this.connection.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [u.username, u.password, u.role],
      );
      console.log(`   ➕ ${u.username} (${u.role})`);
    }
    console.log('✅ Default users seeded');
  }

  /* .................................... */
  async runMigrations() {
    console.log('🚀 Starting database migrations…');
    await this.connect();
    await this.createMigrationsTable();

    const done   = await this.getExecutedMigrations();
    const files  = readdirSync(__dirname)
      .filter(f => /^\d+_.+\.sql$/.test(f))       // hanya file migration
      .sort();                                    // urutkan by prefix nomor

    if (files.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }

    for (const f of files) {
      if (done.includes(f)) {
        console.log(`⏭️  Skipping already executed: ${f}`);
        continue;
      }
      const sql = readFileSync(join(__dirname, f), 'utf8');
      console.log(`⚡ Executing migration: ${f}`);
      await this.executeMigration(f, sql);
    }

    await this.seedUsers();
    console.log('🎉 All migrations completed successfully!');
  }

  /* .................................... */
  async rollback() {
    console.log('🔄 Rolling back last migration…');
    await this.connect();

    const [rows] = await this.connection.execute(
      'SELECT id, filename FROM migrations ORDER BY id DESC LIMIT 1'
    );
    if (rows.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      return;
    }

    const { id, filename } = rows[0];
    console.warn(`⚠️  Manual rollback required for: ${filename}`);
    await this.connection.execute('DELETE FROM migrations WHERE id = ?', [id]);
    console.log('✅ Rollback metadata deleted (tables unchanged)');
  }

  /* .................................... */
  async showStatus() {
    console.log('📊 Migration status');
    await this.connect();

    const [migrations] = await this.connection.execute(
      'SELECT filename, executed_at FROM migrations ORDER BY id'
    );
    if (migrations.length === 0) {
      console.log('   – No migrations executed yet –');
    } else {
      migrations.forEach(m => {
        console.log(`   ✅ ${m.filename}  (${m.executed_at})`);
      });
    }

    const [[{ count }]] = await this.connection.execute(
      'SELECT COUNT(*) AS count FROM users'
    );
    console.log(`   👥 Total users: ${count}`);
  }
}

/* ---------------------------------------------------------------------- */
/* 4. CLI HANDLER                                                         */
/* ---------------------------------------------------------------------- */
async function main() {
  const migrator = new DatabaseMigrator();
  try {
    const args = process.argv.slice(2);
    if (args.includes('--rollback')) {
      await migrator.rollback();
    } else if (args.includes('--status')) {
      await migrator.showStatus();
    } else {
      await migrator.runMigrations();
    }
  } catch (err) {
    console.error('💥 Migration process failed:', err.message);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default DatabaseMigrator;
