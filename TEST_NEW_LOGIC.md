# 🎯 Test New Logic - CloseTime Analysis

## 🔍 **Masalah yang Ditemukan**

Dari debug sebelumnya:
- ✅ **Semua tiket** memiliki status `"Closed"`
- ✅ **Semua tiket** memiliki `closeTime`
- ❌ **Tidak ada tiket** dengan status "Open"

## 🔧 **Logic Baru**

Karena semua tiket statusnya "Closed", kita fokus pada **closeTime analysis**:

1. **closeTime kosong** = Open (tapi sepertinya tidak ada)
2. **closeTime di masa depan** = Open  
3. **closeTime di bulan berikutnya** = Open
4. **closeTime > 30 hari dari openTime** = Open

---

## 🧪 **Script Test Logic Baru**

Copy-paste ke **browser console**:

```javascript
// Test logic baru untuk mendeteksi open tickets
console.log('🧪 Testing New Open Tickets Logic...');

const request = indexedDB.open('InsightTicketDatabase');
request.onsuccess = function(event) {
  const db = event.target.result;
  const transaction = db.transaction(['tickets'], 'readonly');
  const objectStore = transaction.objectStore('tickets');
  const getAllRequest = objectStore.getAll();
  
  getAllRequest.onsuccess = function(event) {
    const tickets = event.target.result;
    
    // Filter Juni 2025
    const juneTickets = tickets.filter(t => {
      const d = new Date(t.openTime);
      return d.getFullYear() === 2025 && d.getMonth() === 5;
    });
    
    console.log('📅 June 2025 Total:', juneTickets.length);
    
    // Test logic baru
    const now = new Date();
    console.log('🕐 Current Time:', now.toISOString());
    
    let openByNoCloseTime = 0;
    let openByFutureTime = 0;
    let openByNextMonth = 0;
    let openBy30Days = 0;
    let totalOpen = 0;
    
    const openTickets = juneTickets.filter(t => {
      let isOpen = false;
      let reason = '';
      
      // Test 1: No closeTime
      if (!t.closeTime) {
        openByNoCloseTime++;
        isOpen = true;
        reason = 'No closeTime';
      }
      // Test 2: Future closeTime
      else {
        const openDate = new Date(t.openTime);
        const closeDate = new Date(t.closeTime);
        
        if (closeDate > now) {
          openByFutureTime++;
          isOpen = true;
          reason = 'Future closeTime';
        }
        // Test 3: Next month
        else {
          const openMonth = openDate.getMonth();
          const openYear = openDate.getFullYear();
          const closeMonth = closeDate.getMonth();
          const closeYear = closeDate.getFullYear();
          
          if (closeYear > openYear || (closeYear === openYear && closeMonth > openMonth)) {
            openByNextMonth++;
            isOpen = true;
            reason = 'Next month closeTime';
          }
          // Test 4: More than 30 days
          else {
            const daysDiff = (closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff > 30) {
              openBy30Days++;
              isOpen = true;
              reason = 'More than 30 days';
            }
          }
        }
      }
      
      if (isOpen) {
        totalOpen++;
        // Log first 5 open tickets
        if (totalOpen <= 5) {
          console.log(`🔓 Open Ticket ${totalOpen}:`, {
            openTime: t.openTime,
            closeTime: t.closeTime,
            reason: reason,
            daysDiff: t.closeTime ? Math.round((new Date(t.closeTime) - new Date(t.openTime)) / (1000 * 60 * 60 * 24)) : 'N/A'
          });
        }
      }
      
      return isOpen;
    });
    
    console.log('📊 Open Tickets Breakdown:');
    console.log('🔓 By No CloseTime:', openByNoCloseTime);
    console.log('🔓 By Future CloseTime:', openByFutureTime);
    console.log('🔓 By Next Month CloseTime:', openByNextMonth);
    console.log('🔓 By 30+ Days Diff:', openBy30Days);
    console.log('🔓 TOTAL OPEN:', totalOpen);
    console.log('🔒 TOTAL CLOSED:', juneTickets.length - totalOpen);
    
    // Sample analysis
    console.log('📋 Sample CloseTime Analysis:');
    juneTickets.slice(0, 5).forEach((t, i) => {
      const openDate = new Date(t.openTime);
      const closeDate = new Date(t.closeTime);
      const daysDiff = Math.round((closeDate - openDate) / (1000 * 60 * 60 * 24));
      const isFuture = closeDate > now;
      
      console.log(`Ticket ${i+1}:`, {
        openTime: t.openTime,
        closeTime: t.closeTime,
        daysDiff: daysDiff,
        isFuture: isFuture,
        wouldBeOpen: isFuture || daysDiff > 30
      });
    });
  };
};
```

---

## 🎯 **Expected Results**

Script ini akan menunjukkan:
- ✅ Berapa tiket yang dianggap open berdasarkan setiap kriteria
- ✅ Sample open tickets dengan alasan mengapa dianggap open
- ✅ Analysis closeTime vs openTime untuk sample tickets

**Kemungkinan hasil:**
```
📅 June 2025 Total: 647
📊 Open Tickets Breakdown:
🔓 By No CloseTime: 0
🔓 By Future CloseTime: 150  // Ini yang mungkin ada
🔓 By Next Month CloseTime: 50
🔓 By 30+ Days Diff: 100
🔓 TOTAL OPEN: 300
🔒 TOTAL CLOSED: 347
```

---

## 📋 **Instructions**

1. **Copy script di atas**
2. **Paste ke browser console**
3. **Lihat hasil breakdown**
4. **Report total open tickets** yang ditemukan

**🚀 Silakan jalankan dan beri tahu berapa total open tickets yang ditemukan!**