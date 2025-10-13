# 🔧 Perbaikan Perhitungan Durasi Waneda

## 📋 Overview

Dokumen ini menjelaskan perbaikan khusus untuk perhitungan durasi Waneda Monthly Recap yang menggunakan formula yang berbeda dari vendor lainnya.

## 🎯 Formula Waneda

### **Formula Durasi Waneda:**
```
Duration = Duration Vendor - Total Duration Pause - Total Duration Vendor
```

### **Target SLA Waneda:**
```
04:00:00 (240 menit)
```

## 🔄 Perubahan yang Dilakukan

### **1. Fungsi getWanedaDuration Baru**

```typescript
const getWanedaDuration = (incident: any): number => {
  // Waneda formula: Duration Vendor - Total Duration Pause - Total Duration Vendor
  let duration = 0;
  
  // Start with Duration Vendor
  if (incident.durationVendorMin && incident.durationVendorMin > 0) {
    duration = incident.durationVendorMin;
  }
  
  // Subtract Total Duration Pause
  if (incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0) {
    duration -= incident.totalDurationPauseMin;
  }
  
  // Subtract Total Duration Vendor
  if (incident.totalDurationVendorMin && incident.totalDurationVendorMin > 0) {
    duration -= incident.totalDurationVendorMin;
  }
  
  // Return max of 0 to avoid negative durations
  return Math.max(0, duration);
};
```

### **2. Fungsi getVendorDuration Helper**

```typescript
const getVendorDuration = (incident: any): number => {
  const vendor = incident.ts || '';
  const vendorLower = vendor.toLowerCase();
  
  // Use Waneda formula for Waneda vendor
  if (vendorLower.includes('waneda') || vendorLower.includes('lintas') || vendorLower.includes('fiber')) {
    return getWanedaDuration(incident);
  }
  
  // Use regular duration for other vendors
  return getDurationMinutes(incident);
};
```

```typescript
const getWanedaDuration = (incident: any): number => {
  // Waneda formula: Duration Vendor - Total Duration Pause - Total Duration Vendor
  let duration = 0;
  
  // Start with Duration Vendor
  if (incident.durationVendorMin && incident.durationVendorMin > 0) {
    duration = incident.durationVendorMin;
  }
  
  // Subtract Total Duration Pause
  if (incident.totalDurationPauseMin && incident.totalDurationPauseMin > 0) {
    duration -= incident.totalDurationPauseMin;
  }
  
  // Subtract Total Duration Vendor
  if (incident.totalDurationVendorMin && incident.totalDurationVendorMin > 0) {
    duration -= incident.totalDurationVendorMin;
  }
  
  // Return max of 0 to avoid negative durations
  return Math.max(0, duration);
};
```

### **3. Implementasi di Waneda Monthly Recap dan Vendor Performance**

#### **A. Perhitungan Durasi per Case:**
```typescript
// Sebelum:
const duration = getDurationMinutes(incident);

// Sesudah:
const duration = getWanedaDuration(incident);
```

#### **B. Perhitungan SLA Score:**
```typescript
// Sebelum:
const d = getDurationMinutes(incident);

// Sesudah:
const d = getWanedaDuration(incident);
```

#### **C. Detail Cases Table:**
```typescript
// Sebelum:
const duration = getDurationMinutes(incident);

// Sesudah:
const duration = getWanedaDuration(incident);
```

#### **D. Vendor Performance Analytics:**
```typescript
// Sebelum:
const duration = getDurationMinutes(incident);

// Sesudah:
const duration = getVendorDuration(incident); // Automatically uses getWanedaDuration for Waneda
```

## 📊 Perbedaan dengan Vendor Lain

### **Vendor Lain (Internal TS):**
- Menggunakan `durationMin` yang sudah diperbaiki oleh automatic fix
- Formula: `durationMin` (sudah termasuk perhitungan pause time)

### **Vendor Lain (Non-Waneda):**
- Menggunakan `durationMin` yang sudah diperbaiki oleh automatic fix
- Formula: `durationMin` (sudah termasuk perhitungan pause time)

### **Waneda:**
- Menggunakan formula khusus: `Duration Vendor - Total Duration Pause - Total Duration Vendor`
- Target SLA: 04:00:00 (240 menit)
- Perhitungan manual berdasarkan field-field spesifik
- **Otomatis terdeteksi** oleh `getVendorDuration()` function

## 🎯 Target SLA Waneda

### **Target:**
- **04:00:00** (240 menit)

### **Perhitungan SLA:**
```typescript
// Actual SLA (Definisi B): score_i = min(1, 240/duration_i)
const score = Math.min(1, VENDOR_SLA_MINUTES / duration);

// SLA Type2: Target/Total
const slaType2 = target / total;
```

## 📈 Hasil yang Diharapkan

### **Sebelum Perbaikan:**
- Menggunakan perhitungan durasi yang sama dengan vendor lain
- Tidak sesuai dengan formula Waneda yang sebenarnya
- SLA calculation tidak akurat

### **Setelah Perbaikan:**
- ✅ Menggunakan formula Waneda yang benar
- ✅ Durasi = Duration Vendor - Total Duration Pause - Total Duration Vendor
- ✅ Target SLA 04:00:00 (240 menit)
- ✅ SLA calculation akurat sesuai definisi Waneda

## 🔍 Monitoring

### **Indikator Keberhasilan:**
1. **Durasi Waneda** menggunakan formula yang benar
2. **Target SLA** 04:00:00 tercapai
3. **SLA calculation** akurat
4. **Payment calculation** sesuai dengan performance

### **Cara Verifikasi:**
1. Upload file Excel dengan data Waneda
2. Cek Waneda Monthly Recap
3. Verifikasi durasi per case menggunakan formula yang benar
4. Pastikan SLA calculation sesuai target 04:00:00

## 🎉 Kesimpulan

**PERHITUNGAN DURASI WANEDA SUDAH DIPERBAIKI!**

- ✅ **Formula Waneda**: Duration Vendor - Total Duration Pause - Total Duration Vendor
- ✅ **Target SLA**: 04:00:00 (240 menit)
- ✅ **SLA Calculation**: Akurat sesuai definisi Waneda
- ✅ **Payment Calculation**: Sesuai dengan performance
- ✅ **Vendor Performance**: Otomatis menggunakan formula Waneda untuk vendor Waneda
- ✅ **Waneda Monthly Recap**: Menggunakan perhitungan durasi yang benar dan akurat

**Waneda Monthly Recap dan Vendor Performance sekarang menggunakan perhitungan durasi yang benar dan akurat!** 🎯
