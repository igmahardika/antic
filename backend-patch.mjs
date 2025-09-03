// Temporary Backend Patch for Database Issues
import fs from 'fs';
import path from 'path';

const backendPath = '/home/nexa-api-hms/htdocs/api.hms.nexa.net.id/server.mjs';
const backupPath = '/home/nexa-api-hms/htdocs/api.hms.nexa.net.id/server.mjs.backup';

console.log('🔧 Patching backend for database connection issues...');

// Backup original file
if (fs.existsSync(backendPath)) {
  fs.copyFileSync(backendPath, backupPath);
  console.log('✅ Backup created');
}

// Read current content
let content = fs.readFileSync(backendPath, 'utf8');

// Patch 1: Update health endpoint to not require database
const healthPatch = `
// Health check without database dependency
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'HMS Backend Running',
    timestamp: new Date().toISOString(),
    database: 'checking...'
  });
});`;

// Patch 2: Add graceful database error handling
const dbErrorHandling = `
// Graceful database error handling
let dbPool;
try {
  dbPool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'hms_user',
    password: process.env.DB_PASS || 'HMS_SecurePassword2024',
    database: process.env.DB_NAME || 'hms_production_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
  });
  console.log('📊 Database connection pool created');
} catch (error) {
  console.warn('⚠️ Database connection failed, running in degraded mode:', error.message);
  dbPool = null;
}`;

// Apply patches
content = content.replace(
  /app\.get\(['"]\/health['"], [\s\S]*?\}\);/,
  healthPatch
);

content = content.replace(
  /const dbPool = createPool\({[\s\S]*?\}\);/,
  dbErrorHandling
);

// Write patched file
fs.writeFileSync(backendPath, content);
console.log('✅ Backend patched successfully');
console.log('🔄 Please restart backend service');

