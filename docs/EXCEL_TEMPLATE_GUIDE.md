# 📊 Panduan Template Excel untuk Upload Data Incident

## 📋 Overview

Dokumen ini menjelaskan format Excel yang benar untuk upload data incident dengan semua kolom yang diperlukan, termasuk data pause.

## 🎯 Template Excel yang Benar

### **Kolom yang Harus Ada (Urutan Penting):**

| **No** | **Nama Kolom** | **Format** | **Contoh** | **Keterangan** |
|--------|----------------|------------|------------|----------------|
| 1 | Priority | Text | High, Medium, Low | Prioritas incident |
| 2 | Site | Text | Site A, Site B | Nama lokasi |
| 3 | No Case | Text | C250001 | Nomor case |
| 4 | NCAL | Text | Blue, Yellow, Orange, Red, Black | Kategori NCAL |
| 5 | Status | Text | Done, Open | Status incident |
| 6 | Level | Number | 1, 2, 3 | Level incident |
| 7 | TS | Text | Waneda, Lintas, Fiber | Technical Support |
| 8 | ODP/BTS | Text | ODP-001 | Segmen distribusi |
| 9 | Start | DateTime | 01/01/25 08:00:00 | Waktu mulai |
| 10 | Start Escalation Vendor | DateTime | 01/01/25 08:30:00 | Waktu eskalasi vendor |
| 11 | End | DateTime | 01/01/25 10:00:00 | Waktu selesai |
| 12 | Duration | Time | 02:00:00 | Durasi total |
| 13 | Duration Vendor | Time | 01:30:00 | Durasi vendor |
| 14 | Problem | Text | Kabel putus | Masalah yang terjadi |
| 15 | Penyebab | Text | Kabel terpotong | Penyebab masalah |
| 16 | Action Terakhir | Text | Perbaikan kabel | Action yang dilakukan |
| 17 | Note | Text | Perbaikan selesai | Catatan |
| 18 | Klasifikasi Gangguan | Text | Kabel (Putus) | Klasifikasi |
| 19 | Power Before | Number | -25.5 | Power sebelum (dBm) |
| 20 | Power After | Number | -26.2 | Power setelah (dBm) |
| **21** | **Pause** | **DateTime** | **01/01/25 09:00:00** | **Start pause pertama** |
| **22** | **Restart** | **DateTime** | **01/01/25 09:15:00** | **End pause pertama** |
| **23** | **Pause2** | **DateTime** | **01/01/25 09:30:00** | **Start pause kedua** |
| **24** | **Restart2** | **DateTime** | **01/01/25 09:45:00** | **End pause kedua** |
| **25** | **Total Duration Pause** | **Time** | **00:30:00** | **Total durasi pause** |
| **26** | **Total Duration Vendor** | **Time** | **01:00:00** | **Durasi vendor minus pause** |

## 📅 Format Tanggal dan Waktu

### **Format DateTime:**
```
DD/MM/YY HH:MM:SS
Contoh: 01/01/25 08:00:00
```

### **Format Time:**
```
HH:MM:SS
Contoh: 02:00:00
```

### **Format Date:**
```
DD/MM/YY
Contoh: 01/01/25
```

## 🎯 Kolom Pause yang Penting

### **Kolom 21-26 (Pause Data):**

| **Kolom** | **Nama** | **Deskripsi** | **Format** | **Contoh** |
|-----------|----------|---------------|------------|------------|
| 21 | Pause | Start pause pertama | DD/MM/YY HH:MM:SS | 01/01/25 09:00:00 |
| 22 | Restart | End pause pertama | DD/MM/YY HH:MM:SS | 01/01/25 09:15:00 |
| 23 | Pause2 | Start pause kedua | DD/MM/YY HH:MM:SS | 01/01/25 09:30:00 |
| 24 | Restart2 | End pause kedua | DD/MM/YY HH:MM:SS | 01/01/25 09:45:00 |
| 25 | Total Duration Pause | Total waktu pause | HH:MM:SS | 00:30:00 |
| 26 | Total Duration Vendor | Durasi vendor minus pause | HH:MM:SS | 01:00:00 |

## 📊 Contoh Data Lengkap

### **Row 1 - Incident dengan 2 Pause:**
```
Priority: High
Site: Site A
No Case: C250001
NCAL: Blue
Status: Done
Level: 1
TS: Waneda
ODP/BTS: ODP-001
Start: 01/01/25 08:00:00
Start Escalation Vendor: 01/01/25 08:30:00
End: 01/01/25 10:00:00
Duration: 02:00:00
Duration Vendor: 01:30:00
Problem: Kabel putus
Penyebab: Kabel terpotong
Action Terakhir: Perbaikan kabel
Note: Perbaikan selesai
Klasifikasi Gangguan: Kabel (Putus)
Power Before: -25.5
Power After: -26.2
Pause: 01/01/25 09:00:00
Restart: 01/01/25 09:15:00
Pause2: 01/01/25 09:30:00
Restart2: 01/01/25 09:45:00
Total Duration Pause: 00:30:00
Total Duration Vendor: 01:00:00
```

### **Row 2 - Incident dengan 1 Pause:**
```
Priority: Medium
Site: Site B
No Case: C250002
NCAL: Yellow
Status: Done
Level: 2
TS: Lintas
ODP/BTS: ODP-002
Start: 01/01/25 14:00:00
Start Escalation Vendor: 01/01/25 14:15:00
End: 01/01/25 16:30:00
Duration: 02:30:00
Duration Vendor: 02:15:00
Problem: Radio rusak
Penyebab: Komponen radio bermasalah
Action Terakhir: Ganti radio
Note: Radio diganti
Klasifikasi Gangguan: Perangkat (Radio Rusak)
Power Before: -28.1
Power After: -27.8
Pause: 01/01/25 15:00:00
Restart: 01/01/25 15:30:00
Pause2: 
Restart2: 
Total Duration Pause: 00:30:00
Total Duration Vendor: 01:45:00
```

### **Row 3 - Incident tanpa Pause:**
```
Priority: Low
Site: Site C
No Case: C250003
NCAL: Orange
Status: Done
Level: 3
TS: Fiber
ODP/BTS: ODP-003
Start: 01/01/25 20:00:00
Start Escalation Vendor: 01/01/25 20:30:00
End: 01/01/25 23:00:00
Duration: 03:00:00
Duration Vendor: 02:30:00
Problem: Splicing rusak
Penyebab: Splicing tidak rapi
Action Terakhir: Resplicing
Note: Splicing diperbaiki
Klasifikasi Gangguan: Splicing (Rusak)
Power Before: -30.5
Power After: -29.2
Pause: 
Restart: 
Pause2: 
Restart2: 
Total Duration Pause: 00:00:00
Total Duration Vendor: 02:30:00
```

## 🔧 Cara Menggunakan Template

### **1. Download Template:**
```javascript
// Jalankan script create-excel-template.js di browser console
```

### **2. Buka di Excel/Google Sheets:**
- Buka file CSV yang didownload
- Atau copy paste ke Excel/Google Sheets

### **3. Isi Data:**
- Ikuti format yang ada di template
- Pastikan format tanggal dan waktu benar
- Untuk kolom pause, isi sesuai kebutuhan

### **4. Simpan dan Upload:**
- Simpan sebagai Excel (.xlsx) atau CSV (.csv)
- Upload ke aplikasi

## ⚠️ Hal yang Perlu Diperhatikan

### **Format Tanggal:**
- ✅ Benar: `01/01/25 08:00:00`
- ❌ Salah: `1/1/25 8:0:0` (tanpa leading zero)
- ❌ Salah: `01-01-25 08:00:00` (menggunakan dash)

### **Format Waktu:**
- ✅ Benar: `02:00:00`
- ❌ Salah: `2:0:0` (tanpa leading zero)
- ❌ Salah: `2.0` (format desimal)

### **Kolom Kosong:**
- Untuk kolom yang tidak ada data, biarkan kosong atau isi dengan `-`
- Jangan isi dengan spasi atau karakter lain

### **Kolom Pause:**
- Jika tidak ada pause, biarkan kolom Pause, Restart, Pause2, Restart2 kosong
- Total Duration Pause = 00:00:00 jika tidak ada pause
- Total Duration Vendor = Duration Vendor jika tidak ada pause

## 🎯 Formula Waneda

### **Untuk Vendor Waneda:**
```
Duration = Duration Vendor - Total Duration Pause - Total Duration Vendor
Target SLA: 04:00:00 (240 minutes)
```

### **Contoh Perhitungan:**
```
Duration Vendor: 01:30:00 (90 menit)
Total Duration Pause: 00:30:00 (30 menit)
Total Duration Vendor: 01:00:00 (60 menit)

Duration = 90 - 30 - 60 = 0 menit
```

## ✅ Verifikasi Upload

### **Setelah Upload:**
1. Cek di **Incident Data** apakah kolom pause terisi
2. Cek di **Technical Support Analytics** untuk Waneda calculations
3. Cek di **Incident Analytics** untuk overall duration

### **Jika Ada Masalah:**
1. Cek format tanggal dan waktu
2. Cek nama kolom (harus persis sama)
3. Cek urutan kolom
4. Jalankan script debug jika perlu

## 📝 Kesimpulan

**Template ini sudah disesuaikan dengan mapping kolom yang benar di aplikasi.** 

- ✅ Semua kolom pause akan terbaca dengan benar
- ✅ Format tanggal dan waktu sudah sesuai
- ✅ Formula Waneda akan berfungsi dengan baik
- ✅ Semua halaman analytics akan menampilkan data yang akurat

**Silakan download template dan sesuaikan data Excel Anda dengan format ini!** 📊
