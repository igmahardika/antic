# 🔐 AN-TIC Analytics Dashboard - Login Credentials

## 📋 Default Login Credentials

### ✅ **Admin User (Default)**
- **Username**: `admin`
- **Password**: `k0s0ng-w43`
- **Role**: Admin
- **Created**: Otomatis saat pertama kali mengakses Admin Panel

---

## 🚀 **Cara Login:**

### 1. **Akses Dashboard**
Buka browser dan akses: `http://localhost:5173`

### 2. **Login dengan Kredensial Default**
```
Username: admin
Password: k0s0ng-w43
```

### 3. **Jika Login Gagal - Setup User Default**

Aplikasi menggunakan **IndexedDB** untuk authentication. User default akan dibuat otomatis saat mengakses Admin Panel pertama kali.

**Langkah-langkah:**
1. Akses `http://localhost:5173`
2. Coba login dengan kredensial di atas
3. Jika gagal, buka browser DevTools (F12)
4. Jalankan script berikut di Console:

```javascript
// Buat user admin default
async function createDefaultUser() {
  // Import database
  const { db } = await import('./src/lib/db.js');
  
  // Hash password function
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Buat user admin
  const hashedPassword = await hashPassword('k0s0ng-w43');
  await db.users.add({
    username: 'admin',
    password: hashedPassword,
    role: 'admin'
  });
  
  console.log('✅ Default admin user created!');
  console.log('Username: admin');
  console.log('Password: k0s0ng-w43');
}

// Jalankan function
createDefaultUser();
```

---

## 👥 **Cara Membuat User Baru**

### **Via Admin Panel:**
1. Login sebagai admin
2. Akses Admin Panel dari sidebar
3. Isi form "Add User":
   - Username: [username baru]
   - Password: [password baru]
   - Role: [pilih role]
4. Klik "Add User"

### **Via Browser Console:**
```javascript
async function addUser(username, password, role = 'user') {
  const { db } = await import('./src/lib/db.js');
  
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  const hashedPassword = await hashPassword(password);
  await db.users.add({
    username: username,
    password: hashedPassword,
    role: role
  });
  
  console.log(`✅ User ${username} created with role ${role}`);
}

// Contoh penggunaan:
addUser('user1', 'password123', 'user');
```

---

## 🔍 **Troubleshooting**

### **Login Gagal - "Username atau password salah"**

**Penyebab:**
- User belum dibuat di IndexedDB
- Password salah
- Database IndexedDB corrupt

**Solusi:**
1. **Reset IndexedDB:**
```javascript
// Buka browser DevTools (F12) → Console
// Jalankan script ini:
indexedDB.deleteDatabase('InsightTicketDatabase');
location.reload();
```

2. **Cek user yang ada:**
```javascript
// Lihat semua user di database
async function checkUsers() {
  const { db } = await import('./src/lib/db.js');
  const users = await db.users.toArray();
  console.log('Users in database:', users);
}
checkUsers();
```

3. **Manual user creation:**
```javascript
// Buat user manual jika diperlukan
async function createUser(username, password, role) {
  const { db } = await import('./src/lib/db.js');
  
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  const hashedPassword = await hashPassword(password);
  await db.users.add({
    username: username,
    password: hashedPassword,
    role: role
  });
  
  console.log(`✅ User ${username} created successfully`);
}

// Buat admin default
createUser('admin', 'k0s0ng-w43', 'admin');
```

---

## 📱 **Quick Access**

### **URLs:**
- **Dashboard**: http://localhost:5173
- **Login**: http://localhost:5173 (redirect otomatis jika belum login)
- **Admin Panel**: http://localhost:5173 (setelah login, pilih dari sidebar)

### **Browser DevTools:**
- **Windows/Linux**: F12 atau Ctrl+Shift+I
- **Mac**: Cmd+Option+I

---

## 🎯 **Summary**

**Default Login:**
```
Username: admin
Password: k0s0ng-w43
```

**Jika login gagal:**
1. Buka DevTools (F12)
2. Jalankan script create default user di Console
3. Refresh halaman dan coba login lagi

**Sistem Authentication:**
- Menggunakan IndexedDB (local storage)
- Password di-hash dengan SHA-256
- Role-based access (admin/user)

---

**🎉 Selamat menggunakan AN-TIC Analytics Dashboard!**