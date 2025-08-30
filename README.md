# 🚀 ANTIC - Helpdesk Management System

Sistem manajemen helpdesk modern dengan analitik canggih dan antarmuka yang responsif.

## 📋 Overview

ANTIC adalah aplikasi manajemen tiket dan analitik modern untuk monitoring performa agent, tiket, dan customer secara profesional. Dirancang dengan UI/UX modern, clean, dan responsif menggunakan React, TypeScript, Tailwind CSS, dan IndexedDB (Dexie) untuk penyimpanan lokal.

## ✨ Fitur Utama

### 🔐 Autentikasi & Manajemen User
- Login multi-browser dengan persistensi data
- Admin panel dengan role & permission
- Export/import user data
- Cross-browser data persistence

### 📊 Dashboard Analitik
- **Incident Data**: Manajemen data insiden dengan filtering dan pagination
- **Incident Analytics**: Analitik insiden dengan chart dan visualisasi
- **Technical Support Analytics**: Analitik khusus vendor dengan durasi calculation
- **Site Analytics**: Analitik performa site dan monitoring

### 🎨 UI/UX Modern
- Sidebar navigation dengan shadcn-ui
- Dark mode support dengan smooth transitions
- Responsive design untuk semua device
- Modern table design dengan zebra stripes
- Progress bars dan visual indicators

### 🔧 Technical Features
- TypeScript untuk type safety
- In-memory analytics processing
- Centralized utility functions
- Real-time data updates
- Cross-browser compatibility

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm atau pnpm

### Installation
```bash
# Clone repository
git clone https://github.com/igmahardika/antic.git
cd antic

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access Application
Buka [http://localhost:3001](http://localhost:3001) di browser

## 📁 Project Structure

```
antic/
├── src/               # Source code
│   ├── components/    # React components
│   ├── pages/         # Page components
│   ├── utils/         # Utility functions
│   ├── lib/           # Database & configurations
│   ├── store/         # State management
│   ├── hooks/         # Custom hooks
│   └── types/         # TypeScript types
├── docs/              # Documentation & debug files
│   ├── debug/         # Debug scripts
│   ├── ADR/           # Architecture Decision Records
│   ├── API/           # API documentation
│   └── *.md           # Documentation files
├── scripts/           # Deployment & maintenance scripts
│   ├── deploy/        # Deployment scripts
│   ├── setup/         # Setup scripts
│   ├── start/         # Start scripts
│   ├── test/          # Test scripts
│   ├── security/      # Security scripts
│   └── database/      # Database scripts
├── data/              # Test data files
├── reports/           # Audit reports & analytics
├── public/            # Static assets
├── dist/              # Build output
└── package.json       # Dependencies & scripts
```

## 📚 Documentation

Semua dokumentasi dan file debug telah diorganisir dalam folder `docs/`:

- **📄 Documentation**: Semua file `.md` dengan analisis dan panduan
- **🐛 Debug Scripts**: File JavaScript untuk debugging dan testing
- **📖 README**: Panduan lengkap penggunaan dan maintenance

Lihat [docs/README.md](docs/README.md) untuk informasi detail.

## 🔧 Scripts

Script untuk deployment, setup, dan maintenance diorganisir dalam folder `scripts/`:

- **🚀 Deploy**: Script deployment ke berbagai environment
- **⚙️ Setup**: Script setup dan konfigurasi
- **▶️ Start**: Script menjalankan aplikasi
- **🧪 Test**: Script testing dan validasi
- **🔒 Security**: Script keamanan dan maintenance
- **🗄️ Database**: Script database management

Lihat [scripts/README.md](scripts/README.md) untuk informasi detail.

## 📊 Data & Reports

- **📊 Data**: File Excel untuk testing di folder `data/`
- **📈 Reports**: Laporan audit dan analytics di folder `reports/`

Lihat [data/README.md](data/README.md) dan [reports/README.md](reports/README.md) untuk informasi detail.

## 🔄 Recent Updates

### v2.2.0 - Analytics Enhancement & Cross-Browser Persistence
- ✅ Cross-browser persistence dengan in-memory processing
- ✅ Centralized utils untuk shared calculation logic
- ✅ TS Analytics fix untuk vendor duration calculation
- ✅ Visual alerts dengan color coding
- ✅ NCAL Duration Trends chart
- ✅ Real-time analytics tanpa IndexedDB dependency

### v2.1.0 - Major System Overhaul & Optimization
- ✅ UI/UX enhancements dengan shadcn-ui
- ✅ Performance optimization
- ✅ TypeScript fixes
- ✅ Dark mode improvements

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Code Style
- TypeScript untuk type safety
- ESLint untuk code quality
- Prettier untuk formatting
- Conventional commits

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

Untuk pertanyaan atau dukungan, silakan buat issue di GitHub repository.

---

**ANTIC** - Advanced Network Ticket Incident Control
