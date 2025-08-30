# 🔧 Scripts

Folder ini berisi semua script untuk deployment, setup, dan maintenance project ANTIC.

## 📁 Struktur Folder

### 🚀 Deploy (`deploy/`)
Script untuk deployment aplikasi:
- `deploy-antic.sh` - Deploy ke environment ANTIC
- `deploy-production.sh` - Deploy ke production

### ⚙️ Setup (`setup/`)
Script untuk setup dan konfigurasi:
- `setup-default-user.js` - Setup user default
- `setup.sh` - Setup utama project
- `setup-mysql-complete.sh` - Setup MySQL database

### ▶️ Start (`start/`)
Script untuk menjalankan aplikasi:
- `start-frontend-only.sh` - Jalankan frontend saja
- `start-with-mysql.sh` - Jalankan dengan MySQL

### 🧪 Test (`test/`)
Script untuk testing:
- `test-api.sh` - Test API endpoints
- `test-ticket-analytics.sh` - Test ticket analytics

### 🔒 Security (`security/`)
Script untuk keamanan:
- `fix-vulnerabilities.sh` - Perbaiki vulnerabilities
- `security-update.sh` - Update keamanan

### 🗄️ Database (`database/`)
Script untuk database:
- `mysql-troubleshoot.sh` - Troubleshoot MySQL

## 📖 Cara Penggunaan

### 🚀 Deployment
```bash
# Deploy ke ANTIC
./scripts/deploy/deploy-antic.sh

# Deploy ke production
./scripts/deploy/deploy-production.sh
```

### ⚙️ Setup
```bash
# Setup utama
./scripts/setup/setup.sh

# Setup user default
node scripts/setup/setup-default-user.js

# Setup MySQL
./scripts/setup/setup-mysql-complete.sh
```

### ▶️ Start Application
```bash
# Frontend only
./scripts/start/start-frontend-only.sh

# With MySQL
./scripts/start/start-with-mysql.sh
```

### 🧪 Testing
```bash
# Test API
./scripts/test/test-api.sh

# Test analytics
./scripts/test/test-ticket-analytics.sh
```

### 🔒 Security
```bash
# Fix vulnerabilities
./scripts/security/fix-vulnerabilities.sh

# Security update
./scripts/security/security-update.sh
```

### 🗄️ Database
```bash
# MySQL troubleshoot
./scripts/database/mysql-troubleshoot.sh
```

## 🔄 Maintenance

### 📝 Menambah Script Baru
1. Buat script di folder yang sesuai
2. Berikan permission execute: `chmod +x script-name.sh`
3. Update README ini dengan dokumentasi

### 🛠️ Best Practices
- Gunakan shebang yang sesuai (`#!/bin/bash`, `#!/usr/bin/env node`)
- Tambahkan error handling
- Dokumentasikan parameter dan output
- Test script sebelum commit

## 📅 Versi Terakhir
- **Update:** 31 Agustus 2024
- **Status:** Organized and documented
