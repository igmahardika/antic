# 🚀 AN-TIC Analytics Dashboard - Deploy Guide

## 📋 **Deploy Script Overview**

Script `deploy-antic.sh` untuk deploy otomatis AN-TIC Analytics Dashboard ke production server.

---

## 🔧 **Configuration**

### **Domains**
```bash
DOMAIN="antic.nexa.net.id"            # Frontend React SPA
API_DOMAIN="api-antic.nexa.net.id"    # Backend REST API
```

### **Database (MySQL)**
```bash
DB_NAME="helpdesk"
DB_USER="hmrnexa"
DB_PASS="7ynkgnqiiF6phLSRNHli"
```

### **Redis Cache**
```bash
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

### **Application**
```bash
APP_DIR="/var/www/antic"              # Project root
PORT="3001"                          # Backend API port
NODE_VERSION="20"                    # Node.js LTS
```

---

## 🎯 **What the Script Does**

### **1. System Dependencies**
- ✅ Install Node.js 20 LTS
- ✅ Install PM2 process manager
- ✅ Install MySQL server
- ✅ Install Redis server
- ✅ Install build tools

### **2. Database Setup**
- ✅ Create MySQL database `helpdesk`
- ✅ Create user `hmrnexa` with permissions
- ✅ Run database migrations
- ✅ Insert default users with bcrypt passwords

### **3. Application Setup**
- ✅ Clone/update git repository
- ✅ Generate secure `.env` file for backend
- ✅ Install backend dependencies (production)
- ✅ Install frontend dependencies
- ✅ Build React frontend for production

### **4. Process Management**
- ✅ Start backend API with PM2
- ✅ Configure PM2 auto-restart on boot
- ✅ Setup system services

### **5. Deployment Verification**
- ✅ Test backend API health endpoint
- ✅ Verify frontend build files
- ✅ Check PM2 process status

---

## 🚀 **How to Deploy**

### **Step 1: Prepare Server**
```bash
# Login as root
ssh root@your-server.com

# Download deploy script
wget https://raw.githubusercontent.com/your-repo/antic/main/deploy-antic.sh
chmod +x deploy-antic.sh
```

### **Step 2: Configure Script**
Edit domains and credentials in script:
```bash
nano deploy-antic.sh

# Update these lines:
DOMAIN="your-frontend-domain.com"
API_DOMAIN="your-api-domain.com"
DB_PASS="your-secure-password"
```

### **Step 3: Run Deploy**
```bash
./deploy-antic.sh
```

### **Step 4: CloudPanel Setup (if using)**
1. **Create Static Site (Frontend)**:
   - Domain: `antic.nexa.net.id`
   - Root: `/var/www/antic/dist`
   - Type: Static/React

2. **Create Reverse Proxy Site (Backend)**:
   - Domain: `api-antic.nexa.net.id`
   - Target: `127.0.0.1:3001`
   - Type: Reverse Proxy

---

## 📊 **Project Structure**

```
/var/www/antic/
├── dist/                    # Built frontend (React SPA)
├── src/                     # Frontend source code
├── antic-backend/
│   ├── server.mjs          # Main API server
│   ├── .env                # Backend environment variables
│   ├── migrations/         # Database migrations
│   └── config/             # Configuration files
├── package.json            # Frontend dependencies
└── deploy-antic.sh         # This deploy script
```

---

## 🔐 **Security Features**

### **Generated Secrets**
- ✅ **JWT_SECRET**: 32-byte random hex
- ✅ **SESSION_SECRET**: Base64 random string
- ✅ **Auto-generated** on each deploy

### **Database Security**
- ✅ **bcrypt** password hashing (10 rounds)
- ✅ **Dedicated MySQL user** with limited permissions
- ✅ **UTF8MB4** character set for full Unicode support

### **API Security**
- ✅ **CORS** configured for specific domain
- ✅ **Rate limiting** (100 requests per 15 minutes)
- ✅ **JWT** token authentication
- ✅ **Redis** session management

---

## 📈 **Monitoring & Maintenance**

### **Process Management**
```bash
# Check API status
pm2 status

# View API logs
pm2 logs antic-api -f

# Restart API
pm2 restart antic-api

# Stop API
pm2 stop antic-api
```

### **Database Management**
```bash
# Connect to MySQL
mysql -u hmrnexa -p helpdesk

# Check users table
SELECT id, username, role FROM users;

# View database size
SELECT 
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'helpdesk';
```

### **Redis Management**
```bash
# Check Redis status
systemctl status redis-server

# Connect to Redis CLI
redis-cli

# View Redis memory usage
redis-cli info memory

# Clear all Redis cache (if needed)
redis-cli flushall
```

### **Log Files**
```bash
# PM2 logs
tail -f ~/.pm2/logs/antic-api-out.log
tail -f ~/.pm2/logs/antic-api-error.log

# System logs
journalctl -u pm2-root -f
```

---

## 🔄 **Update Deployment**

### **Update Code**
```bash
cd /var/www/antic
git pull origin main
npm run build
pm2 restart antic-api
```

### **Update Dependencies**
```bash
# Backend
cd /var/www/antic/antic-backend
npm update

# Frontend
cd /var/www/antic
npm update --legacy-peer-deps
npm run build
```

### **Database Migration**
```bash
cd /var/www/antic/antic-backend
npm run migrate
```

---

## 🎯 **Default Login Credentials**

After deployment, use these credentials:

| Username | Password | Role |
|----------|----------|------|
| **admin** | admin123 | super admin |
| manager | manager123 | admin |
| operator | operator123 | user |

**⚠️ Change default passwords after first login!**

---

## 🐛 **Troubleshooting**

### **API Not Starting**
```bash
# Check logs
pm2 logs antic-api

# Check environment
cd /var/www/antic/antic-backend
cat .env

# Test database connection
mysql -u hmrnexa -p helpdesk -e "SELECT 1;"
```

### **Frontend Not Loading**
```bash
# Check build files
ls -la /var/www/antic/dist/

# Rebuild frontend
cd /var/www/antic
npm run build
```

### **Database Connection Issues**
```bash
# Check MySQL service
systemctl status mysql

# Test connection
mysql -u hmrnexa -p helpdesk

# Check user permissions
mysql -u root -e "SHOW GRANTS FOR 'hmrnexa'@'localhost';"
```

### **Redis Connection Issues**
```bash
# Check Redis service
systemctl status redis-server

# Test connection
redis-cli ping

# Restart Redis
systemctl restart redis-server
```

---

## 📞 **Support**

For issues with deployment:
1. Check logs: `pm2 logs antic-api -f`
2. Verify environment: `cat /var/www/antic/antic-backend/.env`
3. Test services: `systemctl status mysql redis-server`
4. Check permissions: `ls -la /var/www/antic/`

**🎉 Happy deploying! Your AN-TIC Analytics Dashboard will be ready for production use.**