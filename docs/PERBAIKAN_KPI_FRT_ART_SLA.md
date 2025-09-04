# Dokumentasi Perbaikan KPI: FRT, ART, dan SLA

## 📋 **Ringkasan Perubahan**

Dokumentasi ini menjelaskan perbaikan logika perhitungan KPI (Key Performance Indicators) untuk:
- **FRT (First Response Time)** - Waktu Respon Pertama
- **ART (Average Resolution Time)** - Waktu Resolusi Rata-rata  
- **SLA (Service Level Agreement)** - Tingkat Kepatuhan Layanan

## 🎯 **Masalah yang Ditemukan**

### **1. FRT (First Response Time) - LOGIKA SALAH**
**Masalah:** FRT menggunakan `closeHandling` (Close Penanganan) yang berisi total durasi semua penanganan, bukan penanganan pertama.

**Sebelum:**
```typescript
// SALAH: Menggunakan closeHandling (total durasi penanganan)
const frt = (new Date(t.closeHandling).getTime() - new Date(t.openTime).getTime()) / 60000;
```

**Sesudah:**
```typescript
// BENAR: Menggunakan closeHandling1 (penanganan pertama)
const frt = (new Date(t.closeHandling1).getTime() - new Date(t.openTime).getTime()) / 60000;
```

### **2. ART (Average Resolution Time) - LOGIKA SALAH**
**Masalah:** ART menggunakan `closeTime` (Close Time) yang merupakan waktu ticket ditutup, bukan waktu penanganan selesai.

**Sebelum:**
```typescript
// SALAH: Menggunakan closeTime (waktu ticket ditutup)
const art = (new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()) / 60000;
```

**Sesudah:**
```typescript
// BENAR: Menggunakan closeHandling (waktu penanganan selesai)
const art = (new Date(t.closeHandling).getTime() - new Date(t.openTime).getTime()) / 60000;
```

### **3. SLA (Service Level Agreement) - LOGIKA SALAH**
**Masalah:** SLA menggunakan `closeTime` yang tidak konsisten dengan ART calculation.

**Sebelum:**
```typescript
// SALAH: Menggunakan closeTime untuk SLA
const sla = (new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()) / 60000 <= 1440;
```

**Sesudah:**
```typescript
// BENAR: Menggunakan closeHandling untuk SLA (konsisten dengan ART)
const sla = (new Date(t.closeHandling).getTime() - new Date(t.openTime).getTime()) / 60000 <= 1440;
```

## 🔧 **Perubahan Target FRT**

### **Target FRT Diperbarui: 60 menit → 120 menit**

**Alasan:** Target 60 menit terlalu ketat untuk operasional helpdesk. Target 120 menit (2 jam) lebih realistis.

**File yang Diupdate:**
- `src/utils/agentKpi.ts` - Normalisasi FRT target
- `src/components/SummaryDashboard.tsx` - Scoring FRT target
- `src/components/AgentAnalytics.tsx` - Insight FRT target
- `src/pages/AdminRumus.tsx` - Dokumentasi target

## 📁 **File yang Dimodifikasi**

### **1. Frontend Components**

#### **`src/components/AgentAnalytics.tsx`**
```typescript
// FRT Calculation - SEBELUM
const frtValues = agentTickets
  .filter(t => {
    if (!t.openTime || !t.closeHandling) return false; // ❌ SALAH
    // ...
  })

// FRT Calculation - SESUDAH  
const frtValues = agentTickets
  .filter(t => {
    if (!t.openTime || !t.closeHandling1) return false; // ✅ BENAR
    // ...
  })

// ART Calculation - SEBELUM
const artValues = agentTickets
  .filter(t => {
    if (!t.openTime || !t.closeTime) return false; // ❌ SALAH
    // ...
  })

// ART Calculation - SESUDAH
const artValues = agentTickets
  .filter(t => {
    if (!t.openTime || !t.closeHandling) return false; // ✅ BENAR
    // ...
  })

// SLA Calculation - SEBELUM
const slaCompliant = agentTickets.filter(t => {
  if (!t.openTime || !t.closeTime) return false; // ❌ SALAH
  // ...
})

// SLA Calculation - SESUDAH
const slaCompliant = agentTickets.filter(t => {
  if (!t.openTime || !t.closeHandling) return false; // ✅ BENAR
  // ...
})
```

#### **`src/components/SummaryDashboard.tsx`**
```typescript
// FRT Calculation - SEBELUM
if (t.openTime && t.closeHandling) { // ❌ SALAH
  const b = new Date(t.closeHandling);
  // ...
}

// FRT Calculation - SESUDAH
if (t.openTime && t.closeHandling1) { // ✅ BENAR
  const b = new Date(t.closeHandling1);
  // ...
}

// ART Calculation - SEBELUM
if (t.openTime && t.closeTime) { // ❌ SALAH
  const b = new Date(t.closeTime);
  // ...
}

// ART Calculation - SESUDAH
if (t.openTime && t.closeHandling) { // ✅ BENAR
  const b = new Date(t.closeHandling);
  // ...
}

// SLA Calculation - SEBELUM
const slaClosed = (filteredTickets || []).filter((t: any) => {
  if (!t.openTime || !t.closeTime) return false; // ❌ SALAH
  // ...
})

// SLA Calculation - SESUDAH
const slaClosed = (filteredTickets || []).filter((t: any) => {
  if (!t.openTime || !t.closeHandling) return false; // ✅ BENAR
  // ...
})
```

#### **`src/components/AgentAnalyticsContext.tsx`**
```typescript
// FRT Calculation - SEBELUM
const closePen = ticket.closeHandling ? new Date(ticket.closeHandling) : null; // ❌ SALAH

// FRT Calculation - SESUDAH
const closePen = ticket.closeHandling1 ? new Date(ticket.closeHandling1) : null; // ✅ BENAR

// ART Calculation - SEBELUM
let art = 0;
if (open instanceof Date && close instanceof Date && ...) { // ❌ SALAH
  art = (close.getTime() - open.getTime()) / 60000;
}

// ART Calculation - SESUDAH
let art = 0;
const closeHandling = ticket.closeHandling ? new Date(ticket.closeHandling) : null; // ✅ BENAR
if (open instanceof Date && closeHandling instanceof Date && ...) {
  art = (closeHandling.getTime() - open.getTime()) / 60000;
}
```

### **2. Utils & Logic**

#### **`src/utils/agentKpi.ts`**
```typescript
// Interface Ticket - SEBELUM
export interface Ticket {
  ticket_id: string;
  WaktuOpen: Date | string;
  WaktuCloseTicket?: Date | string;
  ClosePenanganan?: Date | string;
  closeHandling1?: Date | string; // ❌ TIDAK ADA closeHandling
  // ...
}

// Interface Ticket - SESUDAH
export interface Ticket {
  ticket_id: string;
  WaktuOpen: Date | string;
  WaktuCloseTicket?: Date | string;
  ClosePenanganan?: Date | string;
  closeHandling?: Date | string; // ✅ DITAMBAHKAN
  closeHandling1?: Date | string;
  // ...
}

// FRT Calculation - SEBELUM
if (closePen && open && closePen.getTime() >= open.getTime()) { // ❌ SALAH
  frtSum += (closePen.getTime() - open.getTime()) / 60000;
  frtCount++;
}

// FRT Calculation - SESUDAH
const closePen1 = t.closeHandling1 ? (t.closeHandling1 instanceof Date ? t.closeHandling1 : new Date(t.closeHandling1)) : undefined; // ✅ BENAR
if (closePen1 && open && closePen1.getTime() >= open.getTime()) {
  frtSum += (closePen1.getTime() - open.getTime()) / 60000;
  frtCount++;
}

// ART Calculation - SEBELUM
if (close && open && close.getTime() >= open.getTime()) { // ❌ SALAH
  artSum += (close.getTime() - open.getTime()) / 60000;
  artCount++;
}

// ART Calculation - SESUDAH
const closeHandling = t.closeHandling ? (t.closeHandling instanceof Date ? t.closeHandling : new Date(t.closeHandling)) : undefined; // ✅ BENAR
if (closeHandling && open && closeHandling.getTime() >= open.getTime()) {
  artSum += (closeHandling.getTime() - open.getTime()) / 60000;
  artCount++;
}

// SLA Calculation - SEBELUM
if (close && open && (close.getTime() - open.getTime()) / 60000 <= 1440) slaCount++; // ❌ SALAH

// SLA Calculation - SESUDAH
if (closeHandling && open && closeHandling.getTime() >= open.getTime() && (closeHandling.getTime() - open.getTime()) / 60000 <= 1440) slaCount++; // ✅ BENAR
```

#### **`src/store/agentStore.ts`**
```typescript
// Mapping ClosePenanganan - SEBELUM
const ClosePenanganan =
  ticket['CLOSE PENANGANAN'] ||
  ticket.closeHandling ||
  ticket['CLOSE PENANGANAN 1'] ||
  ticket.closeHandling1; // ❌ PRIORITAS SALAH

// Mapping ClosePenanganan - SESUDAH
const ClosePenanganan =
  ticket['CLOSE PENANGANAN 1'] ||
  ticket.closeHandling1; // ✅ PRIORITAS BENAR

// Mapping closeHandling - SEBELUM
const mapped = {
  ...ticket,
  WaktuOpen,
  WaktuCloseTicket,
  ClosePenanganan,
  closeHandling1: ticket['CLOSE PENANGANAN 1'] || ticket.closeHandling1, // ❌ TIDAK ADA closeHandling
  // ...
};

// Mapping closeHandling - SESUDAH
const mapped = {
  ...ticket,
  WaktuOpen,
  WaktuCloseTicket,
  ClosePenanganan,
  closeHandling: ticket['CLOSE PENANGANAN'] || ticket.closeHandling, // ✅ DITAMBAHKAN
  closeHandling1: ticket['CLOSE PENANGANAN 1'] || ticket.closeHandling1,
  // ...
};
```

### **3. Test Files**

#### **`src/utils/agentKpi.test.ts`**
```typescript
// Test Data - SEBELUM
{ ticket_id: '1', WaktuOpen: '2024-01-01T08:00:00Z', WaktuCloseTicket: '2024-01-01T09:00:00Z', ClosePenanganan: '2024-01-01T08:10:00Z', closeHandling1: '2024-01-01T08:10:00Z', OpenBy: 'Alice' }, // ❌ TIDAK ADA closeHandling

// Test Data - SESUDAH
{ ticket_id: '1', WaktuOpen: '2024-01-01T08:00:00Z', WaktuCloseTicket: '2024-01-01T09:00:00Z', ClosePenanganan: '2024-01-01T09:00:00Z', closeHandling: '2024-01-01T09:00:00Z', closeHandling1: '2024-01-01T08:10:00Z', OpenBy: 'Alice' }, // ✅ DITAMBAHKAN closeHandling
```

## 📊 **Mapping Kolom Excel ke Database**

### **Struktur Kolom Excel:**
| **Kolom Excel** | **Field Database** | **Kegunaan** |
|-----------------|-------------------|--------------|
| **Start** | `openTime` | Waktu ticket dibuka |
| **Start Escalation Vendor** | `startEscalationVendor` | Waktu escalasi ke vendor |
| **End** | `closeTime` | Waktu ticket ditutup |
| **Start Pause** | `startPause` | Waktu pause dimulai |
| **End Pause** | `endPause` | Waktu pause berakhir |
| **Start Pause 2** | `startPause2` | Waktu pause 2 dimulai |
| **End Pause 2** | `endPause2` | Waktu pause 2 berakhir |
| **Close Penanganan** | `closeHandling` | **Waktu penanganan selesai (ART)** |
| **Close Penanganan 1** | `closeHandling1` | **Waktu penanganan pertama selesai (FRT)** |
| **Close Penanganan 2** | `closeHandling2` | Waktu penanganan kedua selesai |

### **Formula KPI yang Benar:**

#### **FRT (First Response Time)**
```
FRT = ClosePenanganan1 - WaktuOpen (dalam menit)
Target: ≤ 120 menit (2 jam)
```

#### **ART (Average Resolution Time)**
```
ART = ClosePenanganan - WaktuOpen (dalam menit)
Target: ≤ 1440 menit (24 jam)
```

#### **SLA (Service Level Agreement)**
```
SLA = (ART ≤ 1440 menit) ? 100% : 0%
Target: ≥ 85% compliance
```

## 🎯 **Validasi yang Ditambahkan**

### **1. Time Range Validation**
```typescript
// Validasi bahwa closeHandling >= openTime
if (closeHandling && open && closeHandling.getTime() >= open.getTime()) {
  // Proses perhitungan
}
```

### **2. Positive Duration Validation**
```typescript
// Validasi bahwa durasi > 0
const diffMin = (closeHandling.getTime() - open.getTime()) / 60000;
return diffMin > 0 && diffMin <= 1440; // SLA target
```

### **3. Data Sanitization**
```typescript
// Sanitasi data untuk memastikan tanggal valid
if (t.closeHandling && isNaN(new Date(t.closeHandling).getTime())) return false;
if (t.closeHandling1 && isNaN(new Date(t.closeHandling1).getTime())) return false;
```

## 📈 **Dampak Perubahan**

### **1. Akurasi KPI**
- ✅ **FRT** sekarang menghitung waktu respon pertama yang benar
- ✅ **ART** sekarang menghitung waktu resolusi yang benar
- ✅ **SLA** sekarang konsisten dengan ART calculation

### **2. Konsistensi Data**
- ✅ Semua komponen menggunakan formula yang sama
- ✅ Mapping kolom Excel ke database konsisten
- ✅ Validasi data lebih ketat

### **3. Target yang Realistis**
- ✅ Target FRT: 60 menit → 120 menit (lebih realistis)
- ✅ Target ART: 1440 menit (24 jam) - tetap sama
- ✅ Target SLA: ≥ 85% compliance - tetap sama

## 🔍 **Testing & Validation**

### **1. Unit Tests**
- ✅ Test data diupdate dengan mapping yang benar
- ✅ Sanitization function ditest dengan data invalid
- ✅ KPI calculation ditest dengan berbagai skenario

### **2. Integration Tests**
- ✅ Frontend components menggunakan formula yang konsisten
- ✅ Backend API mengembalikan data yang benar
- ✅ Database mapping konsisten di semua layer

## 📝 **Rekomendasi untuk Masa Depan**

### **1. Monitoring**
- Monitor performa KPI setelah perubahan
- Bandingkan dengan data historis untuk validasi
- Lakukan A/B testing jika diperlukan

### **2. Dokumentasi**
- Update dokumentasi user manual
- Training tim tentang formula KPI yang baru
- Dokumentasi troubleshooting untuk masalah data

### **3. Maintenance**
- Regular audit formula KPI
- Validasi data input dari Excel
- Monitoring data quality

## 🚀 **Deployment Notes**

### **1. Database Migration**
- Tidak ada perubahan schema database
- Hanya perubahan logika aplikasi
- Data existing tetap kompatibel

### **2. Backward Compatibility**
- Data lama tetap bisa diproses
- Formula baru akan menghasilkan hasil yang berbeda
- Perlu komunikasi ke stakeholders tentang perubahan

### **3. Rollback Plan**
- Simpan backup kode lama
- Siapkan rollback script jika diperlukan
- Monitor performa setelah deployment

---

**Dokumentasi ini dibuat pada:** `$(date)`  
**Versi:** 1.0  
**Status:** ✅ Completed  
**Reviewer:** Development Team
