# LOGIKA PERHITUNGAN DURASI OTOMATIS

## 🎯 **OVERVIEW**

Sistem sekarang menghitung durasi secara otomatis berdasarkan waktu start dan end yang ada di Excel, tanpa bergantung pada kolom durasi yang sudah dihapus dari file Excel.

## 📊 **LOGIKA PERHITUNGAN DURASI**

### **1. Duration (Start → End)**
```typescript
// Formula: End Time - Start Time
if (startTime && endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  // Validasi: 0-1440 menit (maksimal 24 jam)
  if (diffMinutes >= 0 && diffMinutes <= 1440) {
    return Math.round(diffMinutes * 100) / 100;
  }
}
return 0; // Jika tidak bisa dihitung
```

### **2. Duration Vendor (Start Escalation Vendor → End)**
```typescript
// Formula: End Time - Start Escalation Vendor Time
if (startEscalationVendor && endTime) {
  const start = new Date(startEscalationVendor);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  // Validasi: 0-1440 menit (maksimal 24 jam)
  if (diffMinutes >= 0 && diffMinutes <= 1440) {
    return Math.round(diffMinutes * 100) / 100;
  }
}
return 0; // Jika tidak bisa dihitung
```

### **3. Total Duration Pause (Pause 1 + Pause 2)**
```typescript
// Formula: (End Pause 1 - Start Pause 1) + (End Pause 2 - Start Pause 2)
let totalPauseMinutes = 0;

// Pause 1
if (startPause1 && endPause1) {
  const pause1Minutes = (endPause1.getTime() - startPause1.getTime()) / (1000 * 60);
  if (pause1Minutes >= 0 && pause1Minutes <= 1440) {
    totalPauseMinutes += pause1Minutes;
  }
}

// Pause 2
if (startPause2 && endPause2) {
  const pause2Minutes = (endPause2.getTime() - startPause2.getTime()) / (1000 * 60);
  if (pause2Minutes >= 0 && pause2Minutes <= 1440) {
    totalPauseMinutes += pause2Minutes;
  }
}

return Math.round(totalPauseMinutes * 100) / 100;
```

### **4. Total Duration Vendor (Duration Vendor - Total Duration Pause)**
```typescript
// Formula: Duration Vendor - Total Duration Pause
if (durationVendorMin > 0) {
  const totalDurationVendor = Math.max(durationVendorMin - totalDurationPauseMin, 0);
  return Math.round(totalDurationVendor * 100) / 100;
}
return 0;
```

### **5. Net Duration (Duration - Total Duration Pause)**
```typescript
// Formula: Duration - Total Duration Pause
if (durationMin > 0) {
  const netDuration = Math.max(durationMin - totalDurationPauseMin, 0);
  return Math.round(netDuration * 100) / 100;
}
return 0;
```

## 🔧 **IMPLEMENTASI DI KODE**

### **File: `src/components/IncidentUpload.tsx`**

#### **1. Duration Calculation**
```typescript
durationMin: (() => {
  const endTime = parseDateSafe(getValue('End'));
  
  // Hitung Duration: Start sampai End
  if (startTime && endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        if (diffMinutes >= 0 && diffMinutes <= 1440) {
          return Math.round(diffMinutes * 100) / 100;
        }
      }
    } catch (error) {
      // Handle error
    }
  }
  
  return 0; // Return 0 jika tidak bisa dihitung
})(),
```

#### **2. Duration Vendor Calculation**
```typescript
durationVendorMin: (() => {
  const startEscalationVendor = parseDateSafe(getValue('Start Escalation Vendor'));
  const endTime = parseDateSafe(getValue('End'));
  
  // Hitung Duration Vendor: Start Escalation Vendor sampai End
  if (startEscalationVendor && endTime) {
    try {
      const start = new Date(startEscalationVendor);
      const end = new Date(endTime);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        if (diffMinutes >= 0 && diffMinutes <= 1440) {
          return Math.round(diffMinutes * 100) / 100;
        }
      }
    } catch (error) {
      // Handle error
    }
  }
  
  return 0; // Return 0 jika tidak bisa dihitung
})(),
```

#### **3. Total Duration Pause Calculation**
```typescript
totalDurationPauseMin: (() => {
  const startPause1 = parseDateSafe(getValue('Pause'));
  const endPause1 = parseDateSafe(getValue('Restart'));
  const startPause2 = parseDateSafe(getValue('Pause2'));
  const endPause2 = parseDateSafe(getValue('Restart2'));
  
  let totalPauseMinutes = 0;
  
  // Pause 1
  if (startPause1 && endPause1) {
    const pause1Minutes = (endPause1.getTime() - startPause1.getTime()) / (1000 * 60);
    if (pause1Minutes >= 0 && pause1Minutes <= 1440) {
      totalPauseMinutes += pause1Minutes;
    }
  }
  
  // Pause 2
  if (startPause2 && endPause2) {
    const pause2Minutes = (endPause2.getTime() - startPause2.getTime()) / (1000 * 60);
    if (pause2Minutes >= 0 && pause2Minutes <= 1440) {
      totalPauseMinutes += pause2Minutes;
    }
  }
  
  return Math.round(totalPauseMinutes * 100) / 100;
})(),
```

#### **4. Final Calculations**
```typescript
// Calculate Total Duration Vendor: Duration Vendor - Total Duration Pause
if (incident.durationVendorMin > 0) {
  const totalDurationVendor = Math.max(incident.durationVendorMin - incident.totalDurationPauseMin, 0);
  incident.totalDurationVendorMin = Math.round(totalDurationVendor * 100) / 100;
}

// Calculate Net Duration: Duration - Total Duration Pause
if (incident.durationMin > 0) {
  const netDuration = Math.max(incident.durationMin - incident.totalDurationPauseMin, 0);
  incident.netDurationMin = Math.round(netDuration * 100) / 100;
}
```

## 📋 **KOLOM EXCEL YANG DIPERLUKAN**

### **Kolom Waktu (Required):**
- **Start**: Waktu mulai gangguan
- **End**: Waktu selesai gangguan
- **Start Escalation Vendor**: Waktu eskalasi ke vendor (opsional)

### **Kolom Pause (Optional):**
- **Pause**: Waktu mulai pause 1
- **Restart**: Waktu selesai pause 1
- **Pause2**: Waktu mulai pause 2
- **Restart2**: Waktu selesai pause 2

### **Kolom Durasi (TIDAK DIPERLUKAN):**
- ~~Duration~~ (dihitung otomatis)
- ~~Duration Vendor~~ (dihitung otomatis)
- ~~Total Duration Pause~~ (dihitung otomatis)
- ~~Total Duration Vendor~~ (dihitung otomatis)

## ✅ **VALIDASI DAN ERROR HANDLING**

### **1. Validasi Durasi**
- Durasi harus >= 0 dan <= 1440 menit (24 jam)
- Jika tidak valid, durasi diset ke 0

### **2. Error Handling**
- Jika start/end time tidak valid, durasi = 0
- Jika ada error parsing, durasi = 0
- Log error untuk debugging

### **3. Logging**
- Success log untuk setiap perhitungan durasi
- Error log untuk durasi yang tidak valid
- Info log untuk durasi yang tidak bisa dihitung

## 🎯 **HASIL YANG DIHARAPKAN**

### **Setelah Upload:**
1. ✅ **Duration**: Dihitung dari Start → End
2. ✅ **Duration Vendor**: Dihitung dari Start Escalation Vendor → End
3. ✅ **Total Duration Pause**: Dihitung dari Pause 1 + Pause 2
4. ✅ **Total Duration Vendor**: Duration Vendor - Total Duration Pause
5. ✅ **Net Duration**: Duration - Total Duration Pause

### **Format Output:**
- Semua durasi dalam format menit (decimal)
- Dihitung dengan presisi 2 desimal
- Validasi range 0-1440 menit
- Fallback ke 0 jika tidak valid

## 🚀 **KEUNTUNGAN SISTEM BARU**

1. **Akurasi**: Durasi dihitung berdasarkan waktu sebenarnya
2. **Konsistensi**: Tidak bergantung pada data Excel yang mungkin salah
3. **Otomatis**: Tidak perlu input manual durasi
4. **Validasi**: Range checking dan error handling
5. **Transparansi**: Log detail untuk setiap perhitungan

**Sistem sekarang akan menghitung durasi secara otomatis dan akurat berdasarkan waktu start/end yang ada di Excel!** 🎯

## 🎯 **OVERVIEW**

Sistem sekarang menghitung durasi secara otomatis berdasarkan waktu start dan end yang ada di Excel, tanpa bergantung pada kolom durasi yang sudah dihapus dari file Excel.

## 📊 **LOGIKA PERHITUNGAN DURASI**

### **1. Duration (Start → End)**
```typescript
// Formula: End Time - Start Time
if (startTime && endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  // Validasi: 0-1440 menit (maksimal 24 jam)
  if (diffMinutes >= 0 && diffMinutes <= 1440) {
    return Math.round(diffMinutes * 100) / 100;
  }
}
return 0; // Jika tidak bisa dihitung
```

### **2. Duration Vendor (Start Escalation Vendor → End)**
```typescript
// Formula: End Time - Start Escalation Vendor Time
if (startEscalationVendor && endTime) {
  const start = new Date(startEscalationVendor);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  
  // Validasi: 0-1440 menit (maksimal 24 jam)
  if (diffMinutes >= 0 && diffMinutes <= 1440) {
    return Math.round(diffMinutes * 100) / 100;
  }
}
return 0; // Jika tidak bisa dihitung
```

### **3. Total Duration Pause (Pause 1 + Pause 2)**
```typescript
// Formula: (End Pause 1 - Start Pause 1) + (End Pause 2 - Start Pause 2)
let totalPauseMinutes = 0;

// Pause 1
if (startPause1 && endPause1) {
  const pause1Minutes = (endPause1.getTime() - startPause1.getTime()) / (1000 * 60);
  if (pause1Minutes >= 0 && pause1Minutes <= 1440) {
    totalPauseMinutes += pause1Minutes;
  }
}

// Pause 2
if (startPause2 && endPause2) {
  const pause2Minutes = (endPause2.getTime() - startPause2.getTime()) / (1000 * 60);
  if (pause2Minutes >= 0 && pause2Minutes <= 1440) {
    totalPauseMinutes += pause2Minutes;
  }
}

return Math.round(totalPauseMinutes * 100) / 100;
```

### **4. Total Duration Vendor (Duration Vendor - Total Duration Pause)**
```typescript
// Formula: Duration Vendor - Total Duration Pause
if (durationVendorMin > 0) {
  const totalDurationVendor = Math.max(durationVendorMin - totalDurationPauseMin, 0);
  return Math.round(totalDurationVendor * 100) / 100;
}
return 0;
```

### **5. Net Duration (Duration - Total Duration Pause)**
```typescript
// Formula: Duration - Total Duration Pause
if (durationMin > 0) {
  const netDuration = Math.max(durationMin - totalDurationPauseMin, 0);
  return Math.round(netDuration * 100) / 100;
}
return 0;
```

## 🔧 **IMPLEMENTASI DI KODE**

### **File: `src/components/IncidentUpload.tsx`**

#### **1. Duration Calculation**
```typescript
durationMin: (() => {
  const endTime = parseDateSafe(getValue('End'));
  
  // Hitung Duration: Start sampai End
  if (startTime && endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        if (diffMinutes >= 0 && diffMinutes <= 1440) {
          return Math.round(diffMinutes * 100) / 100;
        }
      }
    } catch (error) {
      // Handle error
    }
  }
  
  return 0; // Return 0 jika tidak bisa dihitung
})(),
```

#### **2. Duration Vendor Calculation**
```typescript
durationVendorMin: (() => {
  const startEscalationVendor = parseDateSafe(getValue('Start Escalation Vendor'));
  const endTime = parseDateSafe(getValue('End'));
  
  // Hitung Duration Vendor: Start Escalation Vendor sampai End
  if (startEscalationVendor && endTime) {
    try {
      const start = new Date(startEscalationVendor);
      const end = new Date(endTime);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        if (diffMinutes >= 0 && diffMinutes <= 1440) {
          return Math.round(diffMinutes * 100) / 100;
        }
      }
    } catch (error) {
      // Handle error
    }
  }
  
  return 0; // Return 0 jika tidak bisa dihitung
})(),
```

#### **3. Total Duration Pause Calculation**
```typescript
totalDurationPauseMin: (() => {
  const startPause1 = parseDateSafe(getValue('Pause'));
  const endPause1 = parseDateSafe(getValue('Restart'));
  const startPause2 = parseDateSafe(getValue('Pause2'));
  const endPause2 = parseDateSafe(getValue('Restart2'));
  
  let totalPauseMinutes = 0;
  
  // Pause 1
  if (startPause1 && endPause1) {
    const pause1Minutes = (endPause1.getTime() - startPause1.getTime()) / (1000 * 60);
    if (pause1Minutes >= 0 && pause1Minutes <= 1440) {
      totalPauseMinutes += pause1Minutes;
    }
  }
  
  // Pause 2
  if (startPause2 && endPause2) {
    const pause2Minutes = (endPause2.getTime() - startPause2.getTime()) / (1000 * 60);
    if (pause2Minutes >= 0 && pause2Minutes <= 1440) {
      totalPauseMinutes += pause2Minutes;
    }
  }
  
  return Math.round(totalPauseMinutes * 100) / 100;
})(),
```

#### **4. Final Calculations**
```typescript
// Calculate Total Duration Vendor: Duration Vendor - Total Duration Pause
if (incident.durationVendorMin > 0) {
  const totalDurationVendor = Math.max(incident.durationVendorMin - incident.totalDurationPauseMin, 0);
  incident.totalDurationVendorMin = Math.round(totalDurationVendor * 100) / 100;
}

// Calculate Net Duration: Duration - Total Duration Pause
if (incident.durationMin > 0) {
  const netDuration = Math.max(incident.durationMin - incident.totalDurationPauseMin, 0);
  incident.netDurationMin = Math.round(netDuration * 100) / 100;
}
```

## 📋 **KOLOM EXCEL YANG DIPERLUKAN**

### **Kolom Waktu (Required):**
- **Start**: Waktu mulai gangguan
- **End**: Waktu selesai gangguan
- **Start Escalation Vendor**: Waktu eskalasi ke vendor (opsional)

### **Kolom Pause (Optional):**
- **Pause**: Waktu mulai pause 1
- **Restart**: Waktu selesai pause 1
- **Pause2**: Waktu mulai pause 2
- **Restart2**: Waktu selesai pause 2

### **Kolom Durasi (TIDAK DIPERLUKAN):**
- ~~Duration~~ (dihitung otomatis)
- ~~Duration Vendor~~ (dihitung otomatis)
- ~~Total Duration Pause~~ (dihitung otomatis)
- ~~Total Duration Vendor~~ (dihitung otomatis)

## ✅ **VALIDASI DAN ERROR HANDLING**

### **1. Validasi Durasi**
- Durasi harus >= 0 dan <= 1440 menit (24 jam)
- Jika tidak valid, durasi diset ke 0

### **2. Error Handling**
- Jika start/end time tidak valid, durasi = 0
- Jika ada error parsing, durasi = 0
- Log error untuk debugging

### **3. Logging**
- Success log untuk setiap perhitungan durasi
- Error log untuk durasi yang tidak valid
- Info log untuk durasi yang tidak bisa dihitung

## 🎯 **HASIL YANG DIHARAPKAN**

### **Setelah Upload:**
1. ✅ **Duration**: Dihitung dari Start → End
2. ✅ **Duration Vendor**: Dihitung dari Start Escalation Vendor → End
3. ✅ **Total Duration Pause**: Dihitung dari Pause 1 + Pause 2
4. ✅ **Total Duration Vendor**: Duration Vendor - Total Duration Pause
5. ✅ **Net Duration**: Duration - Total Duration Pause

### **Format Output:**
- Semua durasi dalam format menit (decimal)
- Dihitung dengan presisi 2 desimal
- Validasi range 0-1440 menit
- Fallback ke 0 jika tidak valid

## 🚀 **KEUNTUNGAN SISTEM BARU**

1. **Akurasi**: Durasi dihitung berdasarkan waktu sebenarnya
2. **Konsistensi**: Tidak bergantung pada data Excel yang mungkin salah
3. **Otomatis**: Tidak perlu input manual durasi
4. **Validasi**: Range checking dan error handling
5. **Transparansi**: Log detail untuk setiap perhitungan

**Sistem sekarang akan menghitung durasi secara otomatis dan akurat berdasarkan waktu start/end yang ada di Excel!** 🎯
