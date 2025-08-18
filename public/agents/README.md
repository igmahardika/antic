# Agent Photos Directory

## Cara Menambahkan Foto Agent

### 1. Format File
- **Format**: PNG dengan background transparan
- **Ukuran**: Disarankan 400x400 pixels atau lebih besar
- **Nama File**: Sesuai dengan nama agent (spasi diganti dengan underscore)

### 2. Penamaan File
Contoh penamaan file berdasarkan nama agent:

| Nama Agent | Nama File |
|------------|-----------|
| Priyo Ardi Nugroho | `Priyo_Ardi_Nugroho.png` |
| John Doe | `John_Doe.png` |
| Maria Garcia | `Maria_Garcia.png` |

### 3. Struktur Folder
```
public/
└── agents/
    ├── README.md
    ├── Priyo_Ardi_Nugroho.png
    ├── John_Doe.png
    └── Maria_Garcia.png
```

### 4. Fallback
Jika foto tidak ditemukan, sistem akan menampilkan:
- Avatar dengan inisial agent
- Background biru dengan inisial putih

### 5. Tips
- Pastikan foto memiliki background transparan
- Gunakan foto profesional dengan pencahayaan yang baik
- Konsisten dalam ukuran dan aspek ratio
- Simpan dalam format PNG untuk kualitas terbaik

### 6. Contoh Kode
```javascript
// Path foto akan otomatis dibuat berdasarkan nama agent
const agentPhotoPath = `/agents/${agentName.replace(/\s+/g, '_')}.png`;
```

### 7. Validasi
- File harus ada di folder `public/agents/`
- Nama file harus sesuai dengan nama agent
- Format harus PNG dengan background transparan
