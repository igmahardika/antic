# 🎨 INCIDENT DATA COLUMN COLORING FIX

## 📋 Overview

Dokumen ini menjelaskan perbaikan yang telah dilakukan untuk menambahkan warna merah pada kolom Level, Duration, dan Power After di tabel Incident Data jika tidak sesuai target NCAL, serta menghilangkan "-" agar kolom kosong jika tidak ada data.

## ✅ PERBAIKAN YANG DILAKUKAN

### **1. NCAL Targets - ✅ DITAMBAHKAN**
**File**: `src/pages/IncidentData.tsx`

#### **NCAL Targets:**
```typescript
const NCAL_TARGETS: Record<string, number> = {
  Blue: 360,    // 6:00:00
  Yellow: 300,  // 5:00:00
  Orange: 240,  // 4:00:00
  Red: 180,     // 3:00:00
  Black: 60     // 1:00:00
};
```

**Hasil**: Target duration untuk setiap level NCAL tersedia untuk perhitungan

### **2. Level Column - ✅ DIPERBAIKI**
**File**: `src/pages/IncidentData.tsx`

#### **Logic:**
```typescript
{ key: 'level', label: 'Level', render: (v: any, incident: Incident) => {
  const level = v || '';
  const ncal = incident.ncal;
  const target = NCAL_TARGETS[normalizeNCAL(ncal) as keyof typeof NCAL_TARGETS] || 0;
  const duration = incident.durationMin || 0;
  const isOverTarget = duration > target;
  return <span className={isOverTarget ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{level}</span>;
}}
```

**Hasil**: 
- ✅ **Hijau/Hitam** jika duration ≤ target NCAL
- ❌ **Merah** jika duration > target NCAL

### **3. Duration Column - ✅ DIPERBAIKI**
**File**: `src/pages/IncidentData.tsx`

#### **Logic:**
```typescript
{ key: 'durationMin', label: 'Duration', render: (v: number, incident: Incident) => {
  const duration = v || 0;
  const ncal = incident.ncal;
  const target = NCAL_TARGETS[normalizeNCAL(ncal) as keyof typeof NCAL_TARGETS] || 0;
  const isOverTarget = duration > target;
  return <span className={isOverTarget ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{formatDuration(duration)}</span>;
}}
```

**Hasil**: 
- ✅ **Hijau/Hitam** jika duration ≤ target NCAL
- ❌ **Merah** jika duration > target NCAL

### **4. Power After Column - ✅ DIPERBAIKI**
**File**: `src/pages/IncidentData.tsx`

#### **Logic:**
```typescript
{ key: 'powerAfter', label: 'Power After (dBm)', render: (v: number, incident: Incident) => {
  const powerAfter = v;
  const powerBefore = incident.powerBefore;
  const isPowerWorse = (typeof powerBefore === 'number' && typeof powerAfter === 'number' && 
                       !isNaN(powerBefore) && !isNaN(powerAfter)) ? 
                       (powerAfter - powerBefore) > 1 : false;
  return <span className={isPowerWorse ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{powerAfter || ''}</span>;
}}
```

**Hasil**: 
- ✅ **Hijau/Hitam** jika power difference ≤ 1 dBm (lebih bagus)
- ❌ **Merah** jika power difference > 1 dBm (lebih jelek)

### **5. Empty Data Display - ✅ DIPERBAIKI**
**File**: `src/pages/IncidentData.tsx`

#### **Sebelum:**
```typescript
return '-';
```

#### **Sesudah:**
```typescript
return '';
```

**Hasil**: 
- ✅ **Kolom kosong** jika tidak ada data
- ✅ **Tidak ada "-"** yang mengganggu
- ✅ **Clean display** - tampilan yang bersih

## 📊 LOGIC PERHITUNGAN

### **NCAL Target Duration:**
```typescript
const NCAL_TARGETS: Record<string, number> = {
  Blue: 360,    // 6:00:00
  Yellow: 300,  // 5:00:00
  Orange: 240,  // 4:00:00
  Red: 180,     // 3:00:00
  Black: 60     // 1:00:00
};
```

### **Level & Duration Coloring Logic:**
```typescript
const target = NCAL_TARGETS[normalizeNCAL(ncal) as keyof typeof NCAL_TARGETS] || 0;
const duration = incident.durationMin || 0;
const isOverTarget = duration > target;
```

### **Power Coloring Logic:**
```typescript
const isPowerWorse = (typeof powerBefore === 'number' && typeof powerAfter === 'number' && 
                     !isNaN(powerBefore) && !isNaN(powerAfter)) ? 
                     (powerAfter - powerBefore) > 1 : false;
```

## 🎯 CONTOH TAMPILAN

### **Case 1: Target Tercapai (Hijau/Hitam)**
```
NCAL: Blue (Target: 6:00:00)
Level: 2
Duration: 05:30:00    ← Hijau (≤ 6:00:00)
Power After: -25.5 dBm ← Hijau (≤ 1 dBm difference)
```

### **Case 2: Target Tidak Tercapai (Merah)**
```
NCAL: Red (Target: 3:00:00)
Level: 4              ← Merah (duration > 3:00:00)
Duration: 04:30:00    ← Merah (> 3:00:00)
Power After: -23.0 dBm ← Merah (> 1 dBm difference)
```

## 🔧 IMPLEMENTASI TEKNIS

### **1. Column Definition Update:**
```typescript
const columns: Array<{
  key: keyof Incident;
  label: string;
  render?: (value: any, incident: Incident) => React.ReactNode;
}> = [
  // ... other columns
  { key: 'level', label: 'Level', render: (v: any, incident: Incident) => {
    // Level coloring logic
  }},
  { key: 'durationMin', label: 'Duration', render: (v: number, incident: Incident) => {
    // Duration coloring logic
  }},
  { key: 'powerAfter', label: 'Power After (dBm)', render: (v: number, incident: Incident) => {
    // Power coloring logic
  }},
  // ... other columns
];
```

### **2. Render Function Call Update:**
```typescript
{columns.map(col => (
  <td key={col.key} className="px-5 py-3 whitespace-pre-line text-sm text-card-foreground align-top">
    {col.render ? col.render(incident[col.key as keyof Incident], incident) : incident[col.key as keyof Incident] || ''}
  </td>
))}
```

### **3. Format Functions Update:**
```typescript
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('id-ID');
};

const formatDuration = (minutes: number | null | undefined) => {
  if (!minutes || minutes === 0) return '';
  // ... duration formatting logic
};
```

## 📝 CARA MENGGUNAKAN

### **1. Navigate ke Incident Data**
- Buka halaman Incident Data
- Tabel akan menampilkan data dengan warna sesuai target

### **2. Interpretasi Warna**
- **Hijau/Hitam**: Target tercapai
- **Merah**: Target tidak tercapai, perlu perhatian

### **3. Verify Data**
- Kolom yang tidak ada data akan kosong (tidak ada "-")
- Warna merah menunjukkan performa di bawah target

## 🎉 KESIMPULAN

**PERBAIKAN WARNA KOLOM INCIDENT DATA SELESAI!**

- ✅ **Level**: Merah jika duration > target NCAL
- ✅ **Duration**: Merah jika > target NCAL
- ✅ **Power After**: Merah jika > 1 dBm difference (lebih jelek)
- ✅ **Empty Data**: Kolom kosong tanpa "-"

**Sekarang kolom-kolom di Incident Data akan menampilkan warna yang informatif!** 🚀

### **💡 Manfaat:**
1. **Visual Alert**: Mudah mengidentifikasi kasus yang tidak sesuai target NCAL
2. **Quick Assessment**: Cepat melihat performa berdasarkan level NCAL
3. **Professional Display**: Tampilan yang informatif dan mudah dibaca
4. **Target Monitoring**: Monitoring target SLA yang efektif per level NCAL
5. **Clean Display**: Tampilan yang bersih tanpa "-" yang mengganggu
