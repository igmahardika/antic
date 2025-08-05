# AN-TIC Backend API

Backend API untuk AN-TIC Analytics Dashboard dengan implementasi Redis caching dan MySQL database.

## 🚀 Fitur Utama

### ✅ Authentication & Session Management
- **JWT Token Authentication** dengan Redis session storage
- **Role-based Access Control** (Super Admin, Admin, User)
- **Session Management** dengan Redis untuk skalabilitas
- **Rate Limiting** untuk mencegah abuse
- **User Activity Tracking** untuk audit trail

### ✅ Database & Caching
- **MySQL Database** dengan connection pooling
- **Redis Caching** untuk performa optimal
- **Fallback Memory Cache** jika Redis tidak tersedia
- **Database Migration System** dengan rollback support

### ✅ Security Features
- **Password Hashing** menggunakan bcrypt
- **CORS Protection** dengan konfigurasi whitelist
- **Input Validation** dan sanitization
- **Session Timeout** management
- **Graceful Shutdown** handling

## 📋 Prerequisites

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0 (opsional, akan fallback ke memory cache)
- npm atau pnpm

## 🛠️ Installation

### 1. Clone dan Install Dependencies

```bash
cd antic-backend
npm install
# atau
pnpm install
```

### 2. Environment Configuration

Salin file environment example:

```bash
cp env.example .env
```

Edit file `.env` sesuai konfigurasi Anda:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=antic_db
DB_PORT=3306

# Redis Configuration (opsional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here
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

### 3. Database Setup

Jalankan migrasi database:

```bash
# Jalankan migrasi
npm run migrate

# Cek status migrasi
npm run migrate:status

# Rollback migrasi terakhir (jika diperlukan)
npm run migrate:rollback
```

### 4. Start Server

```bash
# Development mode
npm start

# Atau dengan nodemon untuk auto-reload
npx nodemon server.mjs
```

Server akan berjalan di `http://localhost:3001`

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('super admin', 'admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL
);
```

### Default Users
Migrasi akan membuat user default:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | super admin |
| manager | manager123 | admin |
| operator | operator123 | user |
| user1 | user123 | user |
| user2 | user456 | user |
| analyst | analyst123 | admin |

## 🔌 API Endpoints

### Authentication
- `POST /register` - Register user baru
- `POST /login` - Login user
- `POST /logout` - Logout user (memerlukan token)

### User Management
- `GET /users` - Ambil semua user (admin only)
- `GET /profile` - Ambil profil user saat ini
- `GET /users/:userId/activity` - Ambil aktivitas user

### System
- `GET /health` - Health check
- `GET /cache/stats` - Cache statistics (super admin only)

## 📡 API Usage Examples

### Login
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super admin"
  },
  "sessionId": "sess_1234567890_abcdef"
}
```

### Get Users (dengan token)
```bash
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Register User Baru
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"username": "newuser", "password": "password123", "role": "user"}'
```

## 🎯 Redis Caching Strategy

### Cache Keys Pattern
- `session:{sessionId}` - User sessions
- `user:{userId}` - User profiles
- `users:{username}` - User data by username
- `users:all` - All users list
- `rate_limit:{ip}` - Rate limiting counters
- `user:{userId}:activity` - User activity logs

### Cache TTL (Time To Live)
- **Sessions**: 24 hours
- **User profiles**: 1 hour
- **Users list**: 10 minutes
- **User activities**: 1 minute
- **Rate limits**: 15 minutes

## 🔧 Configuration

### Rate Limiting
Default: 100 requests per 15 minutes per IP
```env
RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX=100        # Maximum requests
```

### Session Management
```env
SESSION_SECRET=your-secret-key
SESSION_MAX_AGE=86400000  # 24 hours in milliseconds
```

### CORS Configuration
```env
CORS_ORIGIN=http://localhost:5173  # Frontend URL
```

## 🐛 Troubleshooting

### Redis Connection Issues
Jika Redis tidak tersedia, server akan otomatis fallback ke memory cache:
```
⚠️  Redis connection failed, falling back to memory cache
```

### Database Connection Issues
Pastikan MySQL service berjalan dan kredensial benar:
```bash
# Cek MySQL service
sudo systemctl status mysql

# Test koneksi
mysql -u root -p -h localhost
```

### Migration Issues
```bash
# Reset migrasi (hati-hati, akan menghapus data!)
DROP DATABASE antic_db;
CREATE DATABASE antic_db;
npm run migrate
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "redis": "connected",
  "version": "1.0.0"
}
```

### Cache Statistics (Super Admin Only)
```bash
curl -X GET http://localhost:3001/cache/stats \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=3001
DB_HOST=your-db-host
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=your-production-jwt-secret
SESSION_SECRET=your-production-session-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

### PM2 Process Manager
```bash
npm install -g pm2

# Start dengan PM2
pm2 start server.mjs --name "antic-backend"

# Monitor
pm2 monit

# Logs
pm2 logs antic-backend
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
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

## 📝 Development

### Adding New Endpoints
1. Tambahkan route di `server.mjs`
2. Implementasi authentication middleware jika diperlukan
3. Tambahkan caching strategy
4. Update dokumentasi API

### Database Migrations
```bash
# Buat migrasi baru
touch migrations/002_add_new_table.sql

# Implementasi SQL
echo "CREATE TABLE new_table (...)" > migrations/002_add_new_table.sql

# Jalankan migrasi
npm run migrate
```

## 🤝 Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## 📄 License

MIT License - see LICENSE file for details