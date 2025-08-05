# 🐛 Debugging Guide - Ticket Analytics Issues

## 🔍 **Masalah yang Dilaporkan**

1. **Open Tickets Card** masih menampilkan **0** (tidak terupdate)
2. **Area Chart** menampilkan data **Closed** dan **Incoming** yang **sama**

---

## 🛠️ **Debug Steps**

### **Step 1: Cek Data di Browser Console**

1. **Buka** http://localhost:5173/ticket/ticket-analytics
2. **Login** dengan: `admin` / `admin123`
3. **Buka Developer Tools** (F12)
4. **Lihat Console** untuk debug logs yang sudah ditambahkan:
   - `[DEBUG] Sample tickets`
   - `[DEBUG] Open tickets analysis`
   - `[DEBUG] Monthly Stats`

### **Step 2: Manual Debug di Console**

Copy-paste script ini di browser console:

```javascript
// Debug Ticket Data
console.log('🔍 Manual Debug - Ticket Analytics');

// Cek apakah ada data di context
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  console.log('React detected');
}

// Akses IndexedDB secara langsung
const request = indexedDB.open('TicketDB', 1);
request.onsuccess = function(event) {
  const db = event.target.result;
  const transaction = db.transaction(['tickets'], 'readonly');
  const objectStore = transaction.objectStore('tickets');
  const getAllRequest = objectStore.getAll();
  
  getAllRequest.onsuccess = function(event) {
    const tickets = event.target.result;
    console.log('📊 Total Tickets in IndexedDB:', tickets.length);
    
    if (tickets.length > 0) {
      // Status analysis
      const statusCount = {};
      tickets.forEach(t => {
        const status = (t.status || 'undefined').toLowerCase();
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      console.log('📈 Status Distribution:', statusCount);
      console.log('🎫 Sample Tickets:', tickets.slice(0, 5).map(t => ({
        status: t.status,
        openTime: t.openTime,
        closeTime: t.closeTime
      })));
    }
  };
};
```

---

## 🔧 **Perbaikan yang Sudah Dilakukan**

### **File: `src/components/TicketAnalyticsContext.tsx`**

#### **1. Enhanced Open Tickets Logic:**
```typescript
// Menambahkan variasi status yang lebih lengkap
if (status === 'open ticket' || status === 'open') return true;
if (status === 'closed' || status === 'close ticket' || status === 'close') return false;
```

#### **2. Added Debug Logging:**
```typescript
// Debug: Log sample tickets
console.log('[DEBUG] Sample tickets:', gridData.slice(0, 5));

// Debug: Log open tickets analysis
console.log('[DEBUG] Open tickets analysis:', {
  totalTickets: gridData.length,
  openTicketsCount: openTicketsArray.length
});

// Debug: Log monthlyStats
console.log('[DEBUG] Monthly Stats:', monthlyStats);
```

#### **3. Simplified Monthly Stats:**
```typescript
// Hanya menghitung incoming dan open
monthlyStats[monthYear] = { incoming: 0, open: 0 };

// Closed dihitung sebagai: incoming - open
data: sortedMonthlyKeys.map(key => {
  const incoming = monthlyStats[key].incoming;
  const open = monthlyStats[key].open;
  return incoming - open; // Closed = Incoming - Open
})
```

---

## 🎯 **Expected Results**

### **Setelah Perbaikan:**

#### **Open Tickets Card:**
- Harus menampilkan **> 0** jika ada tiket dengan:
  - Status: `open`, `open ticket`
  - Atau `closeTime` kosong
  - Atau `closeTime` di bulan berikutnya

#### **Area Chart:**
- **Incoming (Biru)**: Total tiket per bulan
- **Closed (Pink)**: Incoming - Open per bulan
- **Closed harus ≤ Incoming** (tidak boleh sama)

#### **Console Logs:**
```
[DEBUG] Sample tickets: [{status: "...", openTime: "...", closeTime: "..."}]
[DEBUG] Open tickets analysis: {totalTickets: X, openTicketsCount: Y}
[DEBUG] Monthly Stats: {"2025-06": {incoming: X, open: Y}}
```

---

## 🚨 **Troubleshooting**

### **Jika Open Tickets masih 0:**
1. **Cek Console Logs** - apakah ada data tickets?
2. **Cek Status Values** - mungkin format status berbeda
3. **Cek Date Parsing** - apakah openTime/closeTime valid?

### **Jika Chart Data masih sama:**
1. **Refresh halaman** (Ctrl+F5)
2. **Cek Monthly Stats** di console
3. **Verify formula**: Closed = Incoming - Open

### **Jika tidak ada data sama sekali:**
1. **Upload file ticket** via halaman Upload
2. **Cek IndexedDB** di DevTools > Application > Storage
3. **Verify filter** - mungkin filter waktu terlalu ketat

---

## 📝 **Next Steps**

1. **Test** dengan script debug di browser
2. **Check console logs** untuk melihat data aktual
3. **Report findings** - status apa yang sebenarnya ada di data
4. **Adjust logic** berdasarkan format data yang sebenarnya

**🔍 Jalankan debug steps di atas untuk mengidentifikasi root cause masalah!**