# 🔐 AN-TIC Analytics Dashboard - MySQL Authentication

## 📋 **Perubahan dari IndexedDB ke MySQL**

✅ **Status**: Aplikasi sekarang menggunakan **MySQL database** dengan **REST API authentication**

---

## 🗄️ **Database Configuration**

### **MySQL Credentials:**
```
Host: localhost
Username: hmrnexa
Password: 7ynkgnqiiF6phLSRNHli
Database: helpdesk
Port: 3306
```

### **API Endpoints:**
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Login**: POST http://localhost:3001/login
- **Logout**: POST http://localhost:3001/logout

---

## 🔑 **Default Login Credentials**

### **Available Users:**

| Username | Password | Role |
|----------|----------|------|
| **admin** | admin123 | super admin |
| **manager** | manager123 | admin |
| **operator** | operator123 | user |
| **user1** | user123 | user |
| **user2** | user456 | user |
| **analyst** | analyst123 | admin |

### **Recommended for Testing:**
```
Username: admin
Password: admin123
Role: super admin
```

---

## 🚀 **How to Login**

### **1. Start Both Servers:**
```bash
# Terminal 1: Start Backend API
cd antic-backend
npm start

# Terminal 2: Start Frontend
cd ..
npm run dev
```

### **2. Access Application:**
- **Frontend URL**: http://localhost:5173
- **Backend API**: http://localhost:3001

### **3. Login Process:**
1. Go to http://localhost:5173
2. Use any credentials from the table above
3. System will authenticate via MySQL API
4. JWT token will be stored for session management

---

## 🔧 **Technical Details**

### **Authentication Flow:**
1. **Frontend** sends username/password to **Backend API**
2. **Backend** validates against **MySQL database**
3. **Backend** returns **JWT token** + user info
4. **Frontend** stores token in localStorage
5. **All subsequent requests** use JWT token

### **Session Management:**
- **JWT Token**: Stored in `localStorage.auth_token`
- **User Data**: Stored in `localStorage.user`
- **Session ID**: Stored in `localStorage.session_id`
- **Redis**: Used for server-side session storage

### **Security Features:**
- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Authentication**: Secure token-based auth
- **Session Expiry**: 24 hours default
- **Rate Limiting**: 100 requests per 15 minutes
- **CORS Protection**: Only localhost:5173 allowed

---

## 🛠️ **Database Schema**

### **Users Table:**
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

### **Check Database:**
```bash
mysql -u hmrnexa -p7ynkgnqiiF6phLSRNHli -h localhost helpdesk
SELECT id, username, role FROM users;
```

---

## 🧪 **Testing API**

### **Test Login:**
```bash
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Expected Response:**
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

### **Test Protected Endpoint:**
```bash
# Use token from login response
curl -X GET http://localhost:3001/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Test Health Check:**
```bash
curl http://localhost:3001/health
```

---

## 🔄 **Migration Summary**

### **What Changed:**
❌ **Removed**: IndexedDB (Dexie) authentication
✅ **Added**: MySQL database with REST API
✅ **Added**: JWT token authentication
✅ **Added**: Redis session management
✅ **Added**: Rate limiting and security features

### **Files Modified:**
- `src/pages/Login.tsx` - API-based authentication
- `src/components/ui/navigation-menu.tsx` - API logout
- `src/App.tsx` - Token-based auth check
- `src/lib/config.ts` - API configuration
- `antic-backend/.env` - Database credentials
- `antic-backend/server.mjs` - Full API server

### **Database Setup:**
- ✅ MySQL connection configured
- ✅ Users table created
- ✅ Default users inserted
- ✅ Password hashing implemented
- ✅ API endpoints working

---

## 🎯 **Quick Start**

### **For Development:**
```bash
# 1. Start backend
cd antic-backend && npm start

# 2. Start frontend (new terminal)
cd .. && npm run dev

# 3. Login with:
# Username: admin
# Password: admin123

# 4. Access: http://localhost:5173
```

### **For Production:**
```bash
# Update API_CONFIG.baseURL in src/lib/config.ts
# Point to your production API URL
```

---

## 🎉 **Success!**

✅ **IndexedDB completely removed**
✅ **MySQL authentication working**
✅ **JWT tokens implemented**
✅ **Redis caching active**
✅ **Full API backend ready**

**Your AN-TIC Analytics Dashboard now uses enterprise-grade MySQL authentication! 🚀**