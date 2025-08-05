# 🔧 AN-TIC Analytics Dashboard - Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. 🐛 Frontend Issues

#### Error: Qt platform plugin issues
```bash
qt.qpa.xcb: could not connect to display
This application failed to start because no Qt platform plugin could be initialized
```

**Solution:**
```bash
export QT_QPA_PLATFORM=offscreen
export DISPLAY=:99
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm run dev
```

#### Error: npm install dependency conflicts
```bash
npm error ERESOLVE could not resolve
peer dependency conflicts
```

**Solution:**
```bash
# Remove corrupted files
rm -rf node_modules package-lock.json

# Install with legacy peer deps
npm install --legacy-peer-deps
```

#### Error: Cannot find package 'lovable-tagger'
```bash
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'lovable-tagger'
```

**Solution:**
File `vite.config.ts` sudah diperbaiki. Jika masih error:
```bash
# Check vite.config.ts doesn't import lovable-tagger
grep -n "lovable-tagger" vite.config.ts

# Should return no results
```

#### Error: React version conflicts
**Solution:** Dependencies sudah disesuaikan ke React 18.3.1 untuk kompatibilitas.

---

### 2. 🖥️ Backend Issues

#### Error: Database connection failed
```bash
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:**
```bash
# Check MySQL service
sudo systemctl status mysql

# Start MySQL if not running
sudo systemctl start mysql

# Test connection
mysql -u root -p
```

#### Error: Redis connection failed
```bash
Redis connection error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check Redis service
sudo systemctl status redis-server

# Start Redis if not running
sudo systemctl start redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

**Note:** Backend akan otomatis fallback ke memory cache jika Redis tidak tersedia.

#### Error: Port 3001 already in use
```bash
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**
```bash
# Find process using port 3001
sudo lsof -i :3001

# Kill process
sudo kill -9 PID_NUMBER

# Or use different port
PORT=3002 npm start
```

---

### 3. 🌐 Network & Access Issues

#### Cannot access from browser
**Symptoms:** Connection refused atau timeout

**Solution:**
```bash
# Check if servers are running
netstat -tlnp | grep :5173  # Frontend
netstat -tlnp | grep :3001  # Backend

# Check firewall (if applicable)
sudo ufw status
sudo ufw allow 5173
sudo ufw allow 3001
```

#### CORS errors in browser console
```bash
Access to fetch at 'http://localhost:3001' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:** Backend sudah dikonfigurasi dengan CORS yang benar. Pastikan backend berjalan.

---

### 4. 🗄️ Database Migration Issues

#### Error: Database does not exist
```bash
Error: Unknown database 'antic_db'
```

**Solution:**
```bash
# Create database manually
mysql -u root -p
CREATE DATABASE antic_db;
EXIT;

# Run migration
cd antic-backend
npm run migrate
```

#### Error: Migration fails
```bash
Migration failed: Table 'users' already exists
```

**Solution:**
```bash
# Check migration status
npm run migrate:status

# If needed, rollback and retry
npm run migrate:rollback
npm run migrate
```

---

### 5. 📦 Installation Issues

#### Error: npm install fails with permission errors
```bash
Error: EACCES: permission denied
```

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use npx instead
npx npm install
```

#### Error: Node.js version incompatible
```bash
engine node: wanted: >=18.0.0
```

**Solution:**
```bash
# Check Node version
node --version

# Update Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### 6. 🚀 Quick Fixes

#### Complete Reset (Nuclear Option)
```bash
# Stop all processes
pkill -f "node.*vite"
pkill -f "node.*server"

# Clean everything
rm -rf node_modules package-lock.json
cd antic-backend
rm -rf node_modules package-lock.json
cd ..

# Fresh install
npm install --legacy-peer-deps
cd antic-backend
npm install
cd ..

# Start fresh
./start-frontend-only.sh
```

#### Check System Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top

# If low on resources, consider:
# - Closing other applications
# - Using production build instead of dev
```

---

### 7. 🔍 Debugging Tips

#### Enable Verbose Logging
```bash
# Frontend with debug info
DEBUG=vite:* npm run dev

# Backend with debug info
DEBUG=* npm start
```

#### Check Application Logs
```bash
# Frontend logs are in terminal
# Backend logs are in terminal

# For production, use PM2 logs:
pm2 logs antic-frontend
pm2 logs antic-backend
```

#### Browser Developer Tools
1. Open browser Developer Tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed requests
4. Check Application tab for localStorage/sessionStorage issues

---

### 8. 📞 Getting Help

#### Before Reporting Issues:
1. ✅ Check this troubleshooting guide
2. ✅ Verify system requirements (Node.js ≥18, MySQL ≥8, Redis ≥6)
3. ✅ Try the "Complete Reset" solution above
4. ✅ Check browser console for specific error messages

#### System Information to Include:
```bash
# System info
uname -a
node --version
npm --version
mysql --version
redis-cli --version

# Process status
ps aux | grep node
netstat -tlnp | grep -E ":(3001|5173)"
```

---

### 9. 🎯 Performance Optimization

#### If Application is Slow:
```bash
# Check memory usage
free -h

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Use production build for better performance
npm run build
npx serve -s dist -l 5173
```

#### Database Performance:
```bash
# Check MySQL performance
mysql -u root -p -e "SHOW PROCESSLIST;"

# Optimize MySQL (if needed)
mysql -u root -p -e "OPTIMIZE TABLE users;"
```

---

## ✅ Verification Commands

### Quick Health Check:
```bash
# Frontend
curl -s http://localhost:5173 | head -5

# Backend (when implemented)
curl -s http://localhost:3001/health

# Database
mysql -u root -p -e "SELECT 1;"

# Redis (if available)
redis-cli ping
```

### Success Indicators:
- ✅ Frontend: HTML content returned from port 5173
- ✅ Backend: JSON response from /health endpoint
- ✅ Database: "1" returned from SELECT query
- ✅ Redis: "PONG" returned from ping

---

**💡 Pro Tip:** Keep this guide handy and always check the most recent error message in your terminal for specific debugging information!