# 🔄 AN-TIC Analytics Dashboard - Migration Guide

## 📋 Overview

Panduan lengkap untuk migrasi dari IndexedDB ke MySQL pada AN-TIC Analytics Dashboard. Migrasi ini akan memindahkan semua data dari browser storage (IndexedDB) ke database MySQL yang lebih robust dan dapat diakses secara terpusat.

## 🎯 Tujuan Migrasi

1. **Sentralisasi Data**: Memindahkan data dari local storage ke database terpusat
2. **Keamanan**: Implementasi autentikasi dan autorisasi berbasis server
3. **Skalabilitas**: Mendukung multiple users dan concurrent access
4. **Backup & Recovery**: Data tersimpan di database server dengan backup otomatis
5. **Performance**: Query yang lebih efisien untuk data besar

## 🏗️ Arsitektur Baru

### **Sebelum Migrasi:**
```
Frontend (React) → IndexedDB (Browser Storage)
```

### **Setelah Migrasi:**
```
Frontend (React) → REST API → MySQL Database
                           → Redis (Session & Cache)
```

## 📊 Data yang Dimigrasi

### 1. **Users Table**
- **Dari**: IndexedDB `users` store
- **Ke**: MySQL `users` table
- **Fitur Baru**: 
  - Password hashing dengan bcrypt
  - Session management
  - User activity logging
  - Role-based access control

### 2. **Tickets Table**
- **Dari**: IndexedDB `tickets` store  
- **Ke**: MySQL `tickets` table
- **Fitur Baru**:
  - Advanced querying dan filtering
  - Pagination untuk performance
  - Full-text search
  - Data analytics yang lebih cepat

### 3. **Customers Table**
- **Dari**: IndexedDB `customers` store
- **Ke**: MySQL `customers` table
- **Fitur Baru**:
  - Relational data dengan tickets
  - Customer analytics
  - Data integrity constraints

### 4. **Menu Permissions Table**
- **Dari**: IndexedDB `menuPermissions` store
- **Ke**: MySQL `menu_permissions` table
- **Fitur Baru**:
  - Granular permission control
  - Dynamic menu rendering
  - Role-based UI access

## 🚀 Langkah-langkah Migrasi

### **Persiapan (Setup)**

1. **Jalankan Setup Script**:
   ```bash
   ./setup-mysql-complete.sh
   ```

2. **Verifikasi Database Connection**:
   ```bash
   cd antic-backend
   node -e "
   import { createConnection } from 'mysql2/promise';
   const conn = await createConnection({
     host: 'localhost',
     user: 'hmrnexa', 
     password: '7ynkgnqiiF6phLSRNHli',
     database: 'helpdesk'
   });
   console.log('✅ Database connected');
   await conn.end();
   "
   ```

### **Migrasi Database Schema**

1. **Jalankan Migrasi**:
   ```bash
   cd antic-backend
   node run-migrations.js
   ```

2. **Verifikasi Tabel**:
   ```sql
   SHOW TABLES;
   -- Expected tables:
   -- users
   -- tickets  
   -- customers
   -- menu_permissions
   -- user_sessions
   -- user_activity
   ```

### **Start Services**

1. **Backend Server**:
   ```bash
   cd antic-backend
   npm start
   ```
   Server akan berjalan di: `http://localhost:3001`

2. **Frontend Development Server**:
   ```bash
   # Terminal baru
   npm run dev
   ```
   Frontend akan berjalan di: `http://localhost:5173`

### **Login & Migrasi Data**

1. **Login ke Aplikasi**:
   - URL: `http://localhost:5173`
   - Username: `admin`
   - Password: `admin123`

2. **Akses Admin Panel**:
   - Navigate ke "Admin Panel" 
   - Scroll ke bagian "Database Migration"

3. **Jalankan Migrasi Data**:
   - Klik "Start Migration"
   - Monitor progress bar
   - Tunggu hingga selesai

## 🔧 API Endpoints Baru

### **Authentication**
- `POST /login` - User login
- `POST /logout` - User logout

### **User Management**
- `GET /api/users` - Get all users
- `POST /api/users` - Add new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **Menu Permissions**
- `GET /api/menu-permissions` - Get permissions
- `POST /api/menu-permissions` - Update permissions

### **Tickets**
- `GET /api/tickets` - Get tickets (with pagination & filters)
- `POST /api/tickets` - Add single ticket
- `POST /api/tickets/bulk` - Bulk insert tickets

### **Customers**
- `GET /api/customers` - Get customers (with pagination & filters)
- `POST /api/customers` - Add single customer
- `POST /api/customers/bulk` - Bulk insert customers

## 🔐 Keamanan

### **Authentication Flow**
1. User login dengan username/password
2. Server validasi credentials dari MySQL
3. Server generate JWT token + session ID
4. Token disimpan di localStorage
5. Semua API calls menggunakan Bearer token

### **Session Management**
- JWT token dengan expiry 24 jam
- Session data disimpan di Redis
- Auto-logout saat token expired
- Rate limiting per IP address

### **Password Security**
- Bcrypt hashing dengan salt rounds 10
- Password tidak pernah disimpan dalam plain text
- Password validation di frontend dan backend

## 📈 Performance Improvements

### **Database Indexing**
```sql
-- Tickets table indexes
INDEX idx_open_time (open_time)
INDEX idx_name (name) 
INDEX idx_cabang (cabang)
INDEX idx_status (status)
INDEX idx_category (category)

-- Customers table indexes  
INDEX idx_nama (nama)
INDEX idx_jenis_klien (jenis_klien)
```

### **Pagination**
- Default 100 records per page
- Configurable limit parameter
- Total count untuk pagination UI

### **Caching**
- Redis untuk session storage
- API response caching (future enhancement)
- Query result caching (future enhancement)

## 🚨 Troubleshooting

### **Database Connection Issues**
```bash
# Test MySQL connection
mysql -h localhost -u hmrnexa -p7ynkgnqiiF6phLSRNHli helpdesk -e "SELECT 1;"
```

### **Migration Errors**
```bash
# Check migration logs
cd antic-backend
node run-migrations.js

# Verify table structure
mysql -h localhost -u hmrnexa -p7ynkgnqiiF6phLSRNHli helpdesk -e "DESCRIBE users;"
```

### **API Connection Issues**
```bash
# Test API health
curl http://localhost:3001/health

# Check backend logs
cd antic-backend
npm start
```

### **Frontend Issues**
```bash
# Clear browser storage
# Open DevTools → Application → Storage → Clear storage

# Restart frontend
npm run dev
```

## 📝 Post-Migration Checklist

- [ ] Database tables created successfully
- [ ] Default users can login
- [ ] Admin panel accessible
- [ ] Data migration completed without errors
- [ ] New user creation works
- [ ] Menu permissions functional
- [ ] API endpoints responding correctly
- [ ] Frontend connects to MySQL API
- [ ] Session management working
- [ ] Authentication flow complete

## 🔄 Rollback Plan

Jika terjadi masalah serius, data asli masih tersimpan di IndexedDB sebagai backup:

1. **Revert ke IndexedDB**:
   - Restore file `src/lib/db.ts` original
   - Restore `src/pages/AdminPanel.tsx` original
   - Restart frontend: `npm run dev`

2. **Export Data dari IndexedDB**:
   ```javascript
   // Browser console
   const request = indexedDB.open('InsightTicketDatabase');
   request.onsuccess = function(event) {
     const db = event.target.result;
     // Export logic here
   };
   ```

## 🎉 Benefits Setelah Migrasi

1. **Multi-user Support**: Multiple users dapat akses bersamaan
2. **Data Persistence**: Data tidak hilang saat clear browser
3. **Better Security**: Authentication dan authorization
4. **Scalability**: Dapat handle data dalam jumlah besar
5. **Backup**: Data tersimpan di database server
6. **Analytics**: Query yang lebih powerful untuk reporting
7. **API Access**: Data dapat diakses dari aplikasi lain

## 📞 Support

Jika mengalami masalah selama migrasi:

1. Check console logs di browser dan server
2. Verifikasi database connection
3. Pastikan semua services running
4. Check network connectivity
5. Verify credentials dan permissions

---

**🚀 Selamat! Aplikasi AN-TIC Analytics Dashboard Anda sekarang menggunakan MySQL database dengan fitur-fitur enterprise yang lebih robust.**