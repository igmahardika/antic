# 🚀 AN-TIC Analytics Dashboard - Setup Guide Lengkap

Panduan lengkap untuk setup dan konfigurasi AN-TIC Analytics Dashboard dengan Redis caching dan MySQL database.

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Redis Setup](#redis-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## 🛠️ Prerequisites

### Sistem Requirements
- **OS**: Linux, macOS, atau Windows
- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **Redis**: >= 6.0 (opsional)
- **RAM**: Minimum 2GB
- **Storage**: Minimum 1GB free space

### Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS dengan Homebrew
brew install node

# Windows - Download dari nodejs.org
```

### Install MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation

# macOS dengan Homebrew
brew install mysql
brew services start mysql

# Windows - Download dari mysql.com
```

### Install Redis (Opsional)
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# macOS dengan Homebrew
brew install redis
brew services start redis

# Windows - Download dari redis.io atau gunakan WSL
```

## 🗄️ Database Setup

### 1. Buat Database
```bash
# Login ke MySQL
mysql -u root -p

# Buat database
CREATE DATABASE antic_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Buat user khusus (opsional tapi recommended)
CREATE USER 'antic_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON antic_db.* TO 'antic_user'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

### 2. Test Koneksi Database
```bash
mysql -u antic_user -p antic_db
# Masukkan password yang sudah dibuat
```

## 🔴 Redis Setup

### 1. Konfigurasi Redis
```bash
# Edit konfigurasi Redis (opsional)
sudo nano /etc/redis/redis.conf

# Uncomment dan set password (recommended untuk production)
# requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

### 2. Test Koneksi Redis
```bash
# Test tanpa password
redis-cli ping

# Test dengan password
redis-cli -a your_redis_password ping

# Response yang diharapkan: PONG
```

## 🖥️ Backend Setup

### 1. Navigasi ke Folder Backend
```bash
cd antic-backend
```

### 2. Install Dependencies
```bash
# Menggunakan npm
npm install

# Atau menggunakan pnpm (lebih cepat)
npm install -g pnpm
pnpm install
```

### 3. Konfigurasi Environment
```bash
# Salin file environment example
cp env.example .env

# Edit konfigurasi
nano .env
```

Isi file `.env`:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=antic_user
DB_PASS=strong_password_here
DB_NAME=antic_db
DB_PORT=3306

# Redis Configuration (opsional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters
SESSION_MAX_AGE=86400000

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### 4. Jalankan Database Migration
```bash
# Jalankan migrasi untuk membuat tabel dan data default
npm run migrate

# Output yang diharapkan:
# ✅ Connected to MySQL database: antic_db
# ✅ Migrations table ready
# ⚡ Executing migration: 001_create_users_table.sql
# ✅ Migration executed: 001_create_users_table.sql
# 🌱 Seeding default users...
# ✅ Default users seeded successfully
# 🎉 All migrations completed successfully!
```

### 5. Verifikasi Database
```bash
# Cek status migrasi
npm run migrate:status

# Login ke MySQL dan cek data
mysql -u antic_user -p antic_db
SELECT * FROM users;
```

### 6. Start Backend Server
```bash
# Start server
npm start

# Output yang diharapkan:
# 🔗 Redis connecting...
# ✅ Redis connected and ready
# 🚀 AN-TIC Backend API running on http://localhost:3001
# 📊 Health check: http://localhost:3001/health
# 🔧 Environment: development
```

### 7. Test Backend API
```bash
# Test health check
curl http://localhost:3001/health

# Test login dengan user default
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

## 🌐 Frontend Setup

### 1. Navigasi ke Root Project
```bash
cd ..  # Kembali ke root project
```

### 2. Install Dependencies
```bash
# Menggunakan npm
npm install

# Atau menggunakan pnpm
pnpm install
```

### 3. Update Frontend untuk Gunakan API Baru
Buat file konfigurasi API:

```bash
# Edit src/lib/config.ts (buat jika belum ada)
nano src/lib/config.ts
```

Isi dengan:
```typescript
export const API_CONFIG = {
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  retries: 3
};
```

### 4. Start Frontend Server
```bash
# Development mode
npm run dev

# Output yang diharapkan:
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

## 🧪 Testing

### 1. Test Backend Endpoints

#### Health Check
```bash
curl http://localhost:3001/health
```

#### Register User Baru
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "role": "user"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

#### Get Users (dengan token dari login)
```bash
# Ganti YOUR_JWT_TOKEN dengan token dari response login
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test Frontend Integration

1. Buka browser ke `http://localhost:5173`
2. Login dengan salah satu user default:
   - Username: `admin`, Password: `admin123`
   - Username: `manager`, Password: `manager123`
   - Username: `operator`, Password: `operator123`
3. Cek apakah dashboard terbuka dengan benar
4. Test fitur-fitur yang ada

### 3. Test Redis Caching

```bash
# Login ke Redis CLI
redis-cli -a your_redis_password

# Cek keys yang tersimpan
KEYS *

# Cek session data
KEYS session:*

# Cek user cache
KEYS user:*

# Exit Redis CLI
EXIT
```

## 🚀 Production Deployment

### 1. Environment Variables untuk Production
```env
NODE_ENV=production
PORT=3001
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASS=your-production-db-password
DB_NAME=antic_db
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=your-super-secure-production-jwt-secret
SESSION_SECRET=your-super-secure-production-session-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### 2. Build Frontend untuk Production
```bash
# Build frontend
npm run build

# Output akan ada di folder dist/
```

### 3. Deploy dengan PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start backend dengan PM2
cd antic-backend
pm2 start server.mjs --name "antic-backend" --env production

# Start frontend (jika menggunakan serve)
cd ..
npm install -g serve
pm2 start "serve -s dist -l 5173" --name "antic-frontend"

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Setup Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/antic
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/your/project/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi:
```bash
sudo ln -s /etc/nginx/sites-available/antic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 Troubleshooting

### Database Issues

#### Error: "Access denied for user"
```bash
# Reset MySQL password
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

#### Error: "Database connection failed"
```bash
# Cek status MySQL
sudo systemctl status mysql

# Start MySQL jika tidak berjalan
sudo systemctl start mysql

# Cek port MySQL
sudo netstat -tlnp | grep :3306
```

### Redis Issues

#### Error: "Redis connection failed"
```bash
# Cek status Redis
sudo systemctl status redis-server

# Start Redis jika tidak berjalan
sudo systemctl start redis-server

# Test koneksi
redis-cli ping
```

#### Redis Authentication Error
```bash
# Cek password di konfigurasi
sudo grep "requirepass" /etc/redis/redis.conf

# Test dengan password
redis-cli -a your_password ping
```

### Backend Issues

#### Error: "Port 3001 is already in use"
```bash
# Cari proses yang menggunakan port 3001
sudo lsof -i :3001

# Kill proses
sudo kill -9 PID_NUMBER

# Atau gunakan port lain
PORT=3002 npm start
```

#### Error: "JWT secret not provided"
```bash
# Pastikan JWT_SECRET ada di .env
echo "JWT_SECRET=your-super-secret-key-here" >> .env
```

### Frontend Issues

#### Error: "Network Error" saat login
1. Pastikan backend berjalan di port 3001
2. Cek CORS configuration di backend
3. Cek network tab di browser developer tools

#### Error: "Failed to fetch"
1. Cek apakah API_CONFIG.baseURL benar
2. Pastikan tidak ada typo di endpoint URL
3. Cek browser console untuk error details

### Migration Issues

#### Error: "Migration failed"
```bash
# Reset database (HATI-HATI: akan menghapus semua data!)
mysql -u root -p
DROP DATABASE antic_db;
CREATE DATABASE antic_db;
EXIT;

# Jalankan ulang migrasi
npm run migrate
```

## 📞 Support

Jika mengalami masalah yang tidak tercakup di troubleshooting:

1. Cek log error di console
2. Cek log PM2: `pm2 logs`
3. Cek log MySQL: `sudo tail -f /var/log/mysql/error.log`
4. Cek log Redis: `sudo tail -f /var/log/redis/redis-server.log`

## 🎉 Selamat!

Jika semua langkah berhasil, Anda sekarang memiliki:

✅ MySQL database dengan user management
✅ Redis caching untuk performa optimal  
✅ Backend API dengan JWT authentication
✅ Frontend dengan modern caching system
✅ Rate limiting dan security features
✅ Production-ready deployment setup

Dashboard AN-TIC Analytics Anda siap digunakan! 🚀