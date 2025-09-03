// Simple health endpoint patch
const fs = require('fs');

const serverPath = '/home/nexa-api-hms/htdocs/api.hms.nexa.net.id/server.mjs';

console.log('🔧 Applying simple health patch...');

let content = fs.readFileSync(serverPath, 'utf8');

// Find and replace the health check function
const healthRegex = /app\.get\(['"`]\/health['"`][\s\S]*?\}\);/m;

const newHealthCheck = `app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'HMS Backend Running',
    timestamp: new Date().toISOString()
  });
});`;

if (healthRegex.test(content)) {
  content = content.replace(healthRegex, newHealthCheck);
  fs.writeFileSync(serverPath, content);
  console.log('✅ Health endpoint patched successfully');
} else {
  console.log('ℹ️ Health endpoint pattern not found, no changes made');
}

console.log('🔄 Ready to restart backend');

