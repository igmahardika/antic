# 🔄 Development vs Production - Port Configuration

## 📋 **Perbedaan Environment**

### **🛠️ Development Mode**
```bash
# Frontend Development Server
npm run dev                    # Vite dev server
# Berjalan di: http://localhost:5173

# Backend Development Server  
cd antic-backend
npm start                      # Node.js server
# Berjalan di: http://localhost:3001
```

**Karakteristik Development:**
- ✅ **Hot reload** - perubahan code langsung terlihat
- ✅ **Source maps** - debugging mudah
- ✅ **Dev tools** - React DevTools, dll
- ✅ **Port 5173** - Vite development server
- ✅ **Port 3001** - Backend API server

### **🚀 Production Mode**
```bash
# Frontend Production Build
npm run build                  # Build ke folder dist/
# Hasil: Static files di /var/www/antic/dist/

# Backend Production Server
pm2 start server.mjs          # PM2 process manager
# Berjalan di: http://localhost:3001 (internal)
```

**Karakteristik Production:**
- ✅ **Static files** - HTML, CSS, JS yang sudah di-build
- ✅ **Optimized** - minified, compressed
- ✅ **No port 5173** - tidak ada dev server
- ✅ **CloudPanel** - serve static files via domain
- ✅ **Port 3001** - Backend API (internal, di-proxy)

---

## 🌐 **Production Architecture**

```
Internet
    ↓
CloudPanel (Web Server)
    ↓
┌─────────────────┬─────────────────┐
│   Frontend      │   Backend API   │
│   Static Files  │   Node.js       │
│   /dist/        │   Port 3001     │
│   Domain: A     │   Domain: B     │
└─────────────────┴─────────────────┘
```

### **Frontend Flow:**
```
User → https://antic.nexa.net.id → CloudPanel → /var/www/antic/dist/index.html
```

### **Backend API Flow:**
```
Frontend → https://api-antic.nexa.net.id → CloudPanel → Reverse Proxy → localhost:3001
```

---

## 🔧 **CloudPanel Configuration**

### **1. Frontend Site (Static)**
```
Site Type: Static
Domain: antic.nexa.net.id
Document Root: /var/www/antic/dist
PHP Version: None
```

**Files yang disajikan:**
- `/var/www/antic/dist/index.html` - Main HTML
- `/var/www/antic/dist/assets/` - CSS, JS, images
- **Tidak ada port 5173** - static files langsung disajikan

### **2. Backend Site (Reverse Proxy)**
```
Site Type: Reverse Proxy
Domain: api-antic.nexa.net.id
Target: 127.0.0.1:3001
Protocol: HTTP
```

**API endpoints:**
- `https://api-antic.nexa.net.id/health` → `localhost:3001/health`
- `https://api-antic.nexa.net.id/login` → `localhost:3001/login`
- `https://api-antic.nexa.net.id/users` → `localhost:3001/users`

---

## 📊 **Port Usage Summary**

| Environment | Frontend | Backend | Web Server |
|-------------|----------|---------|------------|
| **Development** | 5173 (Vite) | 3001 (Node) | None |
| **Production** | None (Static) | 3001 (PM2) | 80/443 (CloudPanel) |

### **Development Ports:**
- ✅ **5173** - Vite development server (hot reload)
- ✅ **3001** - Backend API server

### **Production Ports:**
- ❌ **5173** - Tidak digunakan (no dev server)
- ✅ **3001** - Backend API (internal, di-proxy CloudPanel)
- ✅ **80/443** - CloudPanel web server (public)

---

## 🔍 **Verification Commands**

### **Development:**
```bash
# Check development servers
curl http://localhost:5173        # Frontend dev server
curl http://localhost:3001/health # Backend API

# Process check
ps aux | grep vite               # Vite dev server
ps aux | grep node               # Node.js backend
```

### **Production:**
```bash
# Check production setup
ls -la /var/www/antic/dist/      # Static build files
curl http://localhost:3001/health # Backend API (internal)
pm2 status                       # PM2 process manager

# No port 5173 in production!
curl http://localhost:5173       # Should fail/timeout
```

---

## 🎯 **Key Points**

1. **Development**: Frontend di port 5173, Backend di port 3001
2. **Production**: Frontend jadi static files, Backend tetap port 3001 (internal)
3. **CloudPanel**: Handle routing domain ke static files & reverse proxy
4. **No Port 5173**: Tidak digunakan di production karena sudah di-build

### **Deploy Script Behavior:**
```bash
# Script melakukan:
npm run build                    # Build frontend → /dist/
pm2 start server.mjs            # Start backend di port 3001
# Tidak start port 5173 - tidak diperlukan!
```

**🎉 Jadi tidak perlu port 5173 di production karena frontend sudah menjadi static files yang disajikan CloudPanel!**