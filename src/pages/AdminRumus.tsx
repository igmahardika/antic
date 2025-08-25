import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import StorageIcon from '@mui/icons-material/Storage';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  icon, 
  children, 
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow">
      <CardHeader 
        className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
            <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
                {icon}
            <CardTitle className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
                {title}
              </CardTitle>
          </div>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </div>
          </CardHeader>
      {isExpanded && (
          <CardContent className="p-6 pt-0">
            {children}
        </CardContent>
      )}
      </Card>
  );
};

export default function AdminRumus() {
  return (
    <div className="max-w-full w-full py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100">
          Helpdesk Management System
        </h1>
        <h2 className="text-lg md:text-xl font-bold text-gray-700 dark:text-gray-300">
          Dokumentasi Teknis & Arsitektur Sistem
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-4xl mx-auto">
          Dokumentasi komprehensif untuk semua komponen sistem, algoritma analitik, 
          metodologi pemrosesan data, dan implementasi teknis untuk pengembangan dan pemeliharaan sistem.
        </p>
            </div>
            
      {/* Table of Contents */}
      <CollapsibleSection 
        title="Table of Contents" 
        icon={<DescriptionIcon className="text-blue-600" />}
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <DashboardIcon className="text-green-600" />
              Core Analytics
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Summary Dashboard</li>
              <li>• Agent Analytics</li>
              <li>• Ticket Analytics</li>
              <li>• Customer Analytics</li>
              </ul>
            </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AnalyticsIcon className="text-purple-600" />
              Specialized Analytics
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Incident Analytics</li>
              <li>• Technical Support Analytics</li>
              <li>• Site Analytics</li>
                </ul>
              </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <StorageIcon className="text-orange-600" />
              Data Management
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Master Data</li>
              <li>• Agent Data</li>
              <li>• Customer Data</li>
              <li>• Upload Data</li>
                </ul>
              </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <SettingsIcon className="text-red-600" />
              System Administration
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Admin Panel</li>
              <li>• Formulas & Calculations</li>
              <li>• System Architecture</li>
              </ul>
                </div>
              </div>
      </CollapsibleSection>

            {/* Summary Dashboard */}
      <CollapsibleSection 
        title="Summary Dashboard" 
        icon={<DashboardIcon className="text-green-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Ringkasan Umum</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Summary Dashboard adalah halaman utama yang menampilkan ringkasan komprehensif dari semua 
              Key Performance Indicators (KPI) dan metrik sistem secara real-time. Berfungsi sebagai 
              titik masuk utama untuk memantau kesehatan dan performa keseluruhan sistem.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data</h5>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">1.</span>
                    <div>
                      <strong>Data Collection:</strong> Mengambil data dari IndexedDB (Dexie.js) 
                      untuk incidents, agents, dan customers
                </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">2.</span>
                <div>
                      <strong>Real-time Aggregation:</strong> Menghitung KPI utama secara real-time 
                      menggunakan useMemo hooks untuk optimasi performa
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">3.</span>
                    <div>
                      <strong>Visualization:</strong> Menampilkan data dalam bentuk cards, charts, 
                      dan metrics dengan Recharts library
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">4.</span>
                    <div>
                      <strong>Auto-refresh:</strong> Data diperbarui otomatis setiap 30 detik 
                      menggunakan polling mechanism
                    </div>
                    </div>
                    </div>
                  </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Komponen Utama</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>KPI Cards:</strong> Metrik real-time untuk tickets, agents, dan customers</li>
                  <li>• <strong>Trend Charts:</strong> Grafik performa bulanan dan trend analisis</li>
                  <li>• <strong>Status Overview:</strong> Ringkasan status sistem dan alerts</li>
                  <li>• <strong>Quick Navigation:</strong> Link cepat ke halaman analitik detail</li>
                  <li>• <strong>Performance Metrics:</strong> MTTR, SLA compliance, dan resolution rates</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Fitur Teknis</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Live Updates:</strong> Data diperbarui otomatis via Dexie.js live queries</li>
                  <li>• <strong>Responsive Design:</strong> Tampilan optimal di semua perangkat dengan Tailwind CSS</li>
                  <li>• <strong>Theme Support:</strong> Dukungan tema gelap dan terang</li>
                  <li>• <strong>Performance:</strong> Optimasi rendering dengan React.memo dan useMemo</li>
                  <li>• <strong>Error Handling:</strong> Graceful error handling dengan fallback UI</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Perhitungan</h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div><strong>Total Tickets:</strong> COUNT(incidents) dengan filter periode waktu</div>
                  <div><strong>Active Tickets:</strong> COUNT(incidents WHERE status != 'Closed')</div>
                  <div><strong>Resolution Rate:</strong> (Closed tickets / Total tickets) × 100</div>
                  <div><strong>Average MTTR:</strong> AVG(duration) untuk tickets yang sudah resolved</div>
                  <div><strong>SLA Compliance:</strong> (Tickets within SLA / Total tickets) × 100</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

          {/* Agent Analytics */}
      <CollapsibleSection 
        title="Agent Analytics" 
        icon={<PeopleIcon className="text-blue-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Sistem Penilaian Performa Agent</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Agent Analytics mengimplementasikan sistem scoring yang canggih untuk mengevaluasi 
              performa agent berdasarkan multiple KPI dengan perhitungan berbobot dan algoritma normalisasi.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data Agent</h5>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">1.</span>
                    <div>
                      <strong>Data Collection:</strong> Mengumpulkan data incidents per agent dari IndexedDB
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">2.</span>
                    <div>
                      <strong>KPI Calculation:</strong> Menghitung FCR, SLA, FRT, ART, Backlog, dan Volume per agent
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">3.</span>
                    <div>
                      <strong>Normalization:</strong> Menormalisasi setiap KPI menggunakan target values
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">4.</span>
                    <div>
                      <strong>Weighted Scoring:</strong> Menghitung skor akhir dengan bobot yang telah ditentukan
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">5.</span>
                    <div>
                      <strong>Ranking & Visualization:</strong> Mengurutkan agent berdasarkan skor dan menampilkan dalam charts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Scoring Utama</h5>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div><strong>FCR (First Contact Resolution):</strong> 30% - Resolusi di kontak pertama</div>
                    <div><strong>SLA (Service Level Agreement):</strong> 25% - Ketepatan waktu respon</div>
                    <div><strong>FRT (First Response Time):</strong> 15% - Kecepatan respon pertama</div>
                    <div><strong>ART (Average Resolution Time):</strong> 15% - Kecepatan penyelesaian</div>
                    <div><strong>Backlog:</strong> 5% - Jumlah tiket tertunda</div>
                    <div><strong>Ticket Volume:</strong> 10% - Jumlah tiket yang ditangani</div>
                  </div>
                  <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                    Skor = FCR×0.3 + SLA×0.25 + FRT×0.15 + ART×0.15 + Backlog×0.05 + Volume×0.10
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Metode Normalisasi</h5>
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="font-semibold text-green-800 dark:text-green-200 mb-2">KPI Positif (Semakin tinggi semakin baik)</div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                      Berlaku untuk: FCR, SLA, Ticket Volume<br/>
                      Skor = min((Aktual / Target) × 100, 120)
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="font-semibold text-red-800 dark:text-red-200 mb-2">KPI Negatif (Semakin rendah semakin baik)</div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      Berlaku untuk: FRT, ART, Backlog<br/>
                      Skor = max(120 - (Aktual / Target) × 100, 0)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Perhitungan Detail KPI</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">FCR (First Contact Resolution)</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Rumus:</strong> (Tickets resolved in first contact / Total tickets) × 100<br/>
                    <strong>Target:</strong> 85%<br/>
                    <strong>Normalisasi:</strong> min((FCR_actual / 85) × 100, 120)
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">SLA (Service Level Agreement)</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Rumus:</strong> (Tickets within SLA / Total tickets) × 100<br/>
                    <strong>Target:</strong> 95%<br/>
                    <strong>Normalisasi:</strong> min((SLA_actual / 95) × 100, 120)
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">FRT (First Response Time)</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Rumus:</strong> Average time to first response in minutes<br/>
                    <strong>Target:</strong> 15 menit<br/>
                    <strong>Normalisasi:</strong> max(120 - (FRT_actual / 15) × 100, 0)
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">ART (Average Resolution Time)</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Rumus:</strong> Average time to resolution in minutes<br/>
                    <strong>Target:</strong> 120 menit<br/>
                    <strong>Normalisasi:</strong> max(120 - (ART_actual / 120) × 100, 0)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Fitur Lanjutan</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Analisis Trend</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Tracking performa bulan-over-bulan dengan indikator trend dan prediksi
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Kategorisasi Performa</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                         Kategorisasi otomatis: Top Performers (skor &gt; 90), Average (70-90), Needs Improvement (&lt; 70)
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Analisis Komparatif</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Perbandingan peer dan benchmarking terhadap rata-rata tim
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Ticket Analytics */}
      <CollapsibleSection 
        title="Ticket Analytics" 
        icon={<ConfirmationNumberIcon className="text-purple-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Analitik Performa Tiket</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Analitik komprehensif untuk manajemen siklus hidup tiket, efisiensi resolusi, 
              dan metrik kepuasan pelanggan dengan filtering lanjutan dan analisis trend.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data Tiket</h5>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">1.</span>
                    <div>
                      <strong>Data Filtering:</strong> Filter data incidents berdasarkan periode waktu, status, priority, dan NCAL
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">2.</span>
                    <div>
                      <strong>Aggregation:</strong> Mengelompokkan data berdasarkan kategori (bulan, priority, status, NCAL)
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">3.</span>
                    <div>
                      <strong>Calculation:</strong> Menghitung metrik seperti volume, durasi, MTTR, dan SLA compliance
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">4.</span>
                    <div>
                      <strong>Visualization:</strong> Menampilkan data dalam berbagai chart types (line, bar, pie, area)
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-purple-800 dark:text-purple-200">5.</span>
                    <div>
                      <strong>Real-time Updates:</strong> Data diperbarui otomatis saat ada perubahan di database
                    </div>
                    </div>
                    </div>
                  </div>
                </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Metrik Utama</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Volume Trends:</strong> Trend volume tiket per bulan/priode</li>
                  <li>• <strong>Resolution Time:</strong> Analisis waktu penyelesaian (MTTR)</li>
                  <li>• <strong>Priority Distribution:</strong> Distribusi berdasarkan priority level</li>
                  <li>• <strong>Status Tracking:</strong> Tracking transisi status tiket</li>
                  <li>• <strong>Satisfaction Scores:</strong> Skor kepuasan pelanggan</li>
                  <li>• <strong>Escalation Patterns:</strong> Pola eskalasi dan routing</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Fitur Analitik</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Real-time Visualization:</strong> Visualisasi data real-time</li>
                  <li>• <strong>Multi-dimensional Filtering:</strong> Filter multi-dimensi</li>
                  <li>• <strong>Predictive Analysis:</strong> Analisis prediktif trend</li>
                  <li>• <strong>Performance Benchmarking:</strong> Benchmarking performa</li>
                  <li>• <strong>Automated Reporting:</strong> Laporan otomatis</li>
                  <li>• <strong>Export Capabilities:</strong> Kemampuan ekspor data</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Perhitungan</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Volume Analysis</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Monthly Volume:</strong> COUNT(incidents) GROUP BY month<br/>
                    <strong>Growth Rate:</strong> ((Current - Previous) / Previous) × 100<br/>
                    <strong>Trend Analysis:</strong> Linear regression untuk prediksi
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Duration Analysis</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>MTTR:</strong> AVG(endTime - startTime) dalam menit<br/>
                    <strong>Net Duration:</strong> MTTR - Total pause time<br/>
                    <strong>Efficiency:</strong> (Net Duration / Total Duration) × 100
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">SLA Compliance</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Compliance Rate:</strong> (Tickets within SLA / Total tickets) × 100<br/>
                    <strong>SLA Targets:</strong> Priority 1: 1 jam, Priority 2: 4 jam, Priority 3: 8 jam<br/>
                    <strong>Breach Analysis:</strong> Analisis penyebab SLA breach
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">NCAL Analysis</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Distribution:</strong> COUNT per NCAL level (Blue, Yellow, Orange, Red, Black)<br/>
                    <strong>Impact Score:</strong> Weighted average berdasarkan NCAL severity<br/>
                    <strong>Trend:</strong> Perubahan distribusi NCAL over time
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Pemrosesan Data</h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div><strong>Sumber Data:</strong> Database incidents, Customer records, Agent performance data</div>
                  <div><strong>Pemrosesan:</strong> Real-time aggregation dengan Dexie.js live queries</div>
                  <div><strong>Visualisasi:</strong> Recharts library dengan custom tooltips dan legends</div>
                  <div><strong>Performa:</strong> Dioptimasi dengan React.memo dan useMemo hooks</div>
                  <div><strong>Format Durasi:</strong> HH:MM:SS untuk display duration dengan formatDurationHMS function</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

          {/* Customer Analytics */}
      <CollapsibleSection 
        title="Customer Analytics" 
        icon={<BusinessIcon className="text-indigo-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Analitik Pengalaman Customer</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Analitik customer lanjutan dengan visualisasi Kanban board, pemetaan customer journey, 
              dan analisis metrik kepuasan untuk manajemen pengalaman customer yang komprehensif.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data Customer</h5>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">1.</span>
                    <div>
                      <strong>Customer Data Collection:</strong> Mengumpulkan data customer dan interaction history
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">2.</span>
                    <div>
                      <strong>Journey Mapping:</strong> Memetakan customer journey dari first contact hingga resolution
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">3.</span>
                    <div>
                      <strong>Satisfaction Analysis:</strong> Menganalisis metrik kepuasan dan feedback
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">4.</span>
                    <div>
                      <strong>Kanban Visualization:</strong> Menampilkan workflow dalam format Kanban board
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">5.</span>
                    <div>
                      <strong>Performance Metrics:</strong> Menghitung dan menampilkan metrik performa customer
                    </div>
                    </div>
                  </div>
                </div>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Fitur Kanban Board</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Drag-and-drop:</strong> Manajemen tiket dengan drag-and-drop</li>
                  <li>• <strong>Real-time Updates:</strong> Update status real-time</li>
                  <li>• <strong>Workflow Visualization:</strong> Visualisasi workflow yang jelas</li>
                  <li>• <strong>Team Collaboration:</strong> Tools kolaborasi tim</li>
                  <li>• <strong>Progress Tracking:</strong> Tracking progress tiket</li>
                  <li>• <strong>Performance Metrics:</strong> Metrik performa real-time</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Metrik Customer</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Satisfaction Scores:</strong> Skor kepuasan customer</li>
                  <li>• <strong>Response Time:</strong> Analisis waktu respon</li>
                  <li>• <strong>Resolution Quality:</strong> Metrik kualitas resolusi</li>
                  <li>• <strong>Retention Rates:</strong> Tingkat retensi customer</li>
                  <li>• <strong>SLA Compliance:</strong> Kepatuhan service level</li>
                  <li>• <strong>Feedback Analysis:</strong> Analisis feedback customer</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Perhitungan</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Customer Satisfaction</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>CSAT Score:</strong> (Satisfied customers / Total customers) × 100<br/>
                    <strong>NPS Calculation:</strong> Promoters - Detractors<br/>
                    <strong>Sentiment Analysis:</strong> Text analysis dari feedback
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Customer Journey</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Touchpoint Analysis:</strong> Analisis setiap touchpoint customer<br/>
                    <strong>Journey Duration:</strong> Total waktu dari first contact hingga resolution<br/>
                    <strong>Bottleneck Identification:</strong> Identifikasi bottleneck dalam journey
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Retention Metrics</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Retention Rate:</strong> (Retained customers / Total customers) × 100<br/>
                    <strong>Churn Analysis:</strong> Analisis customer yang churn<br/>
                    <strong>Lifetime Value:</strong> Perhitungan customer lifetime value
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Service Quality</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>First Contact Resolution:</strong> Resolusi di kontak pertama<br/>
                    <strong>Resolution Time:</strong> Waktu rata-rata penyelesaian<br/>
                    <strong>Quality Score:</strong> Skor kualitas layanan berdasarkan multiple factors
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Implementasi Teknis</h5>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div><strong>Frontend:</strong> React dengan TypeScript, Tailwind CSS untuk styling</div>
                  <div><strong>State Management:</strong> React hooks dengan custom contexts</div>
                  <div><strong>Database:</strong> IndexedDB via Dexie.js untuk offline capability</div>
                  <div><strong>Real-time Updates:</strong> Live queries dengan automatic UI updates</div>
                  <div><strong>Drag & Drop:</strong> React DnD untuk Kanban board functionality</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>
              
          {/* Incident Analytics */}
      <CollapsibleSection 
        title="Incident Analytics" 
        icon={<AnalyticsIcon className="text-red-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Analitik Manajemen Insiden</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Analitik insiden komprehensif dengan analisis NCAL (Network Criticality Assessment Level), 
              identifikasi root cause, dan penilaian dampak performa jaringan.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data Insiden</h5>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-800 dark:text-red-200">1.</span>
                    <div>
                      <strong>Data Collection:</strong> Mengumpulkan data insiden dari IndexedDB dengan filter periode waktu
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-800 dark:text-red-200">2.</span>
                    <div>
                      <strong>NCAL Classification:</strong> Mengklasifikasikan insiden berdasarkan NCAL level (Blue, Yellow, Orange, Red, Black)
            </div>
                    </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-800 dark:text-red-200">3.</span>
                    <div>
                      <strong>Impact Analysis:</strong> Menganalisis dampak berdasarkan durasi, site affected, dan customer impact
                  </div>
                </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-800 dark:text-red-200">4.</span>
                    <div>
                      <strong>Pattern Recognition:</strong> Mengidentifikasi pola root cause dan trend insiden
                </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-red-800 dark:text-red-200">5.</span>
            <div>
                      <strong>Visualization:</strong> Menampilkan analisis dalam berbagai chart dan dashboard
                    </div>
            </div>
            </div>
                </div>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Analisis NCAL</h5>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <strong>Blue:</strong> Dampak rendah, maintenance rutin
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Insiden dengan dampak minimal, tidak mempengaruhi layanan customer
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                      <strong>Yellow:</strong> Dampak minor, prosedur standar
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Insiden dengan dampak terbatas, dapat ditangani dengan prosedur normal
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <strong>Orange:</strong> Dampak sedang, monitoring enhanced
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Insiden dengan dampak signifikan, memerlukan monitoring intensif
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <strong>Red:</strong> Dampak tinggi, perhatian segera
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Insiden kritis yang mempengaruhi layanan customer secara signifikan
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-black rounded"></div>
                      <strong>Black:</strong> Dampak kritis, respons darurat
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Insiden sangat kritis yang memerlukan respons darurat dan eskalasi
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Metrik Utama</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Incident Frequency:</strong> Frekuensi insiden per NCAL level</li>
                  <li>• <strong>MTTR by NCAL:</strong> Mean time to resolution per level kritis</li>
                  <li>• <strong>Root Cause Patterns:</strong> Pola analisis root cause</li>
                  <li>• <strong>Impact Assessment:</strong> Skor penilaian dampak</li>
                  <li>• <strong>Prevention Effectiveness:</strong> Efektivitas pencegahan</li>
                  <li>• <strong>Cost Analysis:</strong> Analisis biaya per insiden</li>
                </ul>
                    </div>
                    </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Perhitungan</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">NCAL Distribution</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Calculation:</strong> COUNT(incidents) GROUP BY ncal_level<br/>
                    <strong>Percentage:</strong> (Count per level / Total incidents) × 100<br/>
                    <strong>Trend:</strong> Month-over-month comparison
                  </p>
                  </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Impact Score</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Weighted Score:</strong> Blue(1) + Yellow(2) + Orange(3) + Red(4) + Black(5)<br/>
                    <strong>Average Impact:</strong> Total weighted score / Total incidents<br/>
                    <strong>Risk Level:</strong> Based on impact score thresholds
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">MTTR Analysis</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>By NCAL:</strong> AVG(duration) GROUP BY ncal_level<br/>
                    <strong>Efficiency:</strong> (Target MTTR / Actual MTTR) × 100<br/>
                    <strong>Improvement:</strong> Month-over-month MTTR reduction
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Prevention Metrics</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Repeat Incidents:</strong> COUNT incidents with same root cause<br/>
                    <strong>Prevention Rate:</strong> (Prevented incidents / Total potential) × 100<br/>
                    <strong>Learning Effectiveness:</strong> Reduction in repeat incidents
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Fitur Lanjutan</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Analitik Prediktif</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Model machine learning untuk prediksi dan pencegahan insiden berdasarkan pola historis
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Laporan Otomatis</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Laporan terjadwal dengan template yang dapat disesuaikan dan pengiriman otomatis
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Integrasi Sistem</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Integrasi API dengan sistem monitoring dan ticketing eksternal
                  </p>
                </div>
              </div>
            </div>
                    </div>
                    </div>
      </CollapsibleSection>

            {/* Technical Support Analytics */}
      <CollapsibleSection 
        title="Technical Support Analytics" 
        icon={<SettingsIcon className="text-orange-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Analitik Performa Technical Support</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Analitik khusus untuk tim technical support dengan skill-based routing, 
              efektivitas knowledge base, dan metrik resolusi teknis.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data Technical Support</h5>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-800 dark:text-orange-200">1.</span>
                    <div>
                      <strong>Skill Assessment:</strong> Menilai skill dan kompetensi technical support agent
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-800 dark:text-orange-200">2.</span>
                    <div>
                      <strong>Ticket Routing:</strong> Routing tiket berdasarkan skill dan complexity
                </div>
              </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-800 dark:text-orange-200">3.</span>
                    <div>
                      <strong>Knowledge Base Analysis:</strong> Menganalisis penggunaan dan efektivitas knowledge base
            </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-800 dark:text-orange-200">4.</span>
                  <div>
                      <strong>Resolution Tracking:</strong> Tracking resolusi teknis dan quality metrics
                  </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-orange-800 dark:text-orange-200">5.</span>
                  <div>
                      <strong>Performance Analytics:</strong> Menganalisis performa dan improvement areas
                    </div>
                  </div>
                  </div>
                </div>
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Metrik Support</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Technical Resolution Rates:</strong> Tingkat resolusi teknis</li>
                  <li>• <strong>Knowledge Base Utilization:</strong> Pemanfaatan knowledge base</li>
                  <li>• <strong>Escalation Patterns:</strong> Pola eskalasi tiket</li>
                  <li>• <strong>Skill-based Performance:</strong> Performa berdasarkan skill</li>
                  <li>• <strong>Training Effectiveness:</strong> Efektivitas training</li>
                  <li>• <strong>Tool Proficiency:</strong> Kemahiran penggunaan tools</li>
                </ul>
                    </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Quality Assurance</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Solution Accuracy:</strong> Tracking akurasi solusi</li>
                  <li>• <strong>Customer Feedback:</strong> Analisis feedback customer</li>
                  <li>• <strong>Resolution Quality:</strong> Skor kualitas resolusi</li>
                  <li>• <strong>Follow-up Effectiveness:</strong> Efektivitas follow-up</li>
                  <li>• <strong>Knowledge Sharing:</strong> Metrik berbagi pengetahuan</li>
                  <li>• <strong>Continuous Improvement:</strong> Tracking improvement berkelanjutan</li>
                </ul>
                    </div>
                  </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Perhitungan</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Skill-based Routing</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Skill Score:</strong> Weighted average dari technical skills<br/>
                    <strong>Complexity Matching:</strong> Matching ticket complexity dengan agent skill<br/>
                    <strong>Load Balancing:</strong> Distribusi workload berdasarkan availability
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Knowledge Base Metrics</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Utilization Rate:</strong> (KB usage / Total tickets) × 100<br/>
                    <strong>Effectiveness Score:</strong> Success rate dari KB solutions<br/>
                    <strong>Update Frequency:</strong> Frequency of KB content updates
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Quality Metrics</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Accuracy Score:</strong> (Correct solutions / Total solutions) × 100<br/>
                    <strong>Customer Satisfaction:</strong> CSAT scores untuk technical support<br/>
                    <strong>Resolution Time:</strong> Average time untuk technical resolution
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Training Impact</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Skill Improvement:</strong> Pre vs post training skill assessment<br/>
                    <strong>Performance Uplift:</strong> Performance improvement setelah training<br/>
                    <strong>Knowledge Retention:</strong> Long-term knowledge retention rate
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

            {/* Site Analytics */}
      <CollapsibleSection 
        title="Site Analytics" 
        icon={<BusinessIcon className="text-green-600" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-base mb-3">Analitik Performa Site</h4>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Analitik khusus site dengan pemetaan performa geografis, 
              monitoring kesehatan infrastruktur, dan analisis insiden regional.
            </p>
          </div>

          <div className="space-y-6">
                    <div>
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Data Site</h5>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-green-800 dark:text-green-200">1.</span>
                    <div>
                      <strong>Site Data Collection:</strong> Mengumpulkan data performa dan insiden per site
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-green-800 dark:text-green-200">2.</span>
                    <div>
                      <strong>Geographic Mapping:</strong> Memetakan data berdasarkan lokasi geografis
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-green-800 dark:text-green-200">3.</span>
                    <div>
                      <strong>Infrastructure Analysis:</strong> Menganalisis kesehatan infrastruktur per site
                </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-green-800 dark:text-green-200">4.</span>
                    <div>
                      <strong>Regional Pattern Recognition:</strong> Mengidentifikasi pola insiden regional
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-green-800 dark:text-green-200">5.</span>
                    <div>
                      <strong>Performance Benchmarking:</strong> Benchmarking performa antar site
                    </div>
                  </div>
                    </div>
                  </div>
                </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Metrik Site</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Site Availability:</strong> Tingkat ketersediaan site</li>
                  <li>• <strong>Performance Benchmarks:</strong> Benchmark performa site</li>
                  <li>• <strong>Infrastructure Health:</strong> Skor kesehatan infrastruktur</li>
                  <li>• <strong>Regional Incidents:</strong> Pola insiden regional</li>
                  <li>• <strong>Maintenance Effectiveness:</strong> Efektivitas maintenance</li>
                  <li>• <strong>Capacity Utilization:</strong> Pemanfaatan kapasitas</li>
                </ul>
                    </div>

              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 dark:text-gray-100">Analisis Geografis</h5>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <strong>Regional Performance:</strong> Perbandingan performa regional</li>
                  <li>• <strong>Geographic Clustering:</strong> Clustering insiden geografis</li>
                  <li>• <strong>Weather Impact:</strong> Analisis dampak cuaca</li>
                  <li>• <strong>Resource Allocation:</strong> Optimasi alokasi sumber daya</li>
                  <li>• <strong>Network Topology:</strong> Analisis topologi jaringan</li>
                  <li>• <strong>Disaster Recovery:</strong> Metrik disaster recovery</li>
                </ul>
                    </div>
                  </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Perhitungan</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Site Availability</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Uptime Calculation:</strong> (Total uptime / Total time) × 100<br/>
                    <strong>MTBF:</strong> Mean Time Between Failures<br/>
                    <strong>MTTR:</strong> Mean Time To Repair per site
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Infrastructure Health</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Health Score:</strong> Weighted average dari multiple factors<br/>
                    <strong>Risk Assessment:</strong> Evaluasi risiko berdasarkan historical data<br/>
                    <strong>Predictive Maintenance:</strong> Prediksi kebutuhan maintenance
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Regional Analysis</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Incident Density:</strong> Incidents per area per time period<br/>
                    <strong>Weather Correlation:</strong> Correlation dengan data cuaca<br/>
                    <strong>Geographic Patterns:</strong> Identifikasi pola geografis
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Performance Benchmarking</h6>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Site Comparison:</strong> Perbandingan antar site<br/>
                    <strong>Industry Standards:</strong> Benchmark terhadap standar industri<br/>
                    <strong>Improvement Tracking:</strong> Tracking improvement per site
                  </p>
                </div>
              </div>
            </div>
                </div>
                    </div>
      </CollapsibleSection>

      {/* Data Management */}
      <CollapsibleSection 
        title="Data Management" 
        icon={<StorageIcon className="text-gray-600" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Master Data</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Centralized data management for system configuration, 
                reference data, and organizational structure.
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• System configuration</li>
                <li>• Reference data</li>
                <li>• Organizational structure</li>
                <li>• Data validation rules</li>
              </ul>
                </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Agent Data</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive agent profile management with performance history, 
                skills tracking, and training records.
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Agent profiles</li>
                <li>• Performance history</li>
                <li>• Skills assessment</li>
                <li>• Training records</li>
                      </ul>
                    </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Customer Data</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customer relationship management with interaction history, 
                preferences, and service level agreements.
              </p>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Customer profiles</li>
                <li>• Interaction history</li>
                <li>• Service agreements</li>
                <li>• Communication preferences</li>
                </ul>
                  </div>
                </div>

                    <div className="space-y-4">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100">Upload Data</h5>
            <div className="space-y-6">
                    <div>
                <h6 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Flow Pemrosesan Upload Data</h6>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">1.</span>
                      <div>
                        <strong>File Validation:</strong> Validasi format file (Excel .xlsx/.xls, CSV) dan ukuran
                    </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">2.</span>
                    <div>
                        <strong>Header Validation:</strong> Memvalidasi header kolom sesuai dengan schema yang dibutuhkan
                    </div>
                  </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">3.</span>
                      <div>
                        <strong>Data Parsing:</strong> Parsing data dari Excel/CSV ke format JSON dengan validasi tipe data
                </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">4.</span>
                    <div>
                        <strong>Data Transformation:</strong> Transformasi data ke format Incident dengan validasi business rules
                  </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">5.</span>
                  <div>
                        <strong>Database Storage:</strong> Menyimpan data ke IndexedDB dengan chunking untuk file besar
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-orange-800 dark:text-orange-200">6.</span>
                      <div>
                        <strong>Result Reporting:</strong> Menampilkan laporan hasil upload dengan detail success/error
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Format Data yang Didukung</h6>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• <strong>Excel:</strong> .xlsx, .xls dengan multiple sheets</li>
                    <li>• <strong>CSV:</strong> Comma-separated values</li>
                    <li>• <strong>Encoding:</strong> UTF-8, ISO-8859-1</li>
                    <li>• <strong>Max Size:</strong> 50MB per file</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h6 className="font-semibold mb-2">Validasi Data</h6>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• <strong>Schema Validation:</strong> Validasi struktur kolom</li>
                    <li>• <strong>Data Type:</strong> Validasi tipe data per kolom</li>
                    <li>• <strong>Business Rules:</strong> Validasi aturan bisnis</li>
                    <li>• <strong>Duplicate Check:</strong> Pengecekan data duplikat</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h6 className="font-semibold text-gray-900 dark:text-gray-100">Algoritma Pemrosesan</h6>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h6 className="font-semibold mb-2">Data Parsing</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Excel Processing:</strong> Menggunakan XLSX library untuk parsing<br/>
                      <strong>CSV Processing:</strong> Papa Parse untuk CSV files<br/>
                      <strong>Error Handling:</strong> Graceful handling untuk corrupted files<br/>
                      <strong>Progress Tracking:</strong> Real-time progress untuk file besar
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h6 className="font-semibold mb-2">Data Transformation</h6>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Date Parsing:</strong> parseDateSafe untuk berbagai format tanggal<br/>
                      <strong>Duration Conversion:</strong> toMinutes untuk konversi durasi<br/>
                      <strong>ID Generation:</strong> mkId untuk generate unique ID<br/>
                      <strong>Batch Processing:</strong> Chunking untuk optimasi memory
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="text-sm space-y-2">
                  <div><strong>Supported Formats:</strong> Excel (.xlsx, .xls), CSV dengan encoding UTF-8</div>
                  <div><strong>Data Validation:</strong> Validasi schema otomatis dan error reporting detail</div>
                  <div><strong>Batch Processing:</strong> Handling file besar dengan progress tracking</div>
                  <div><strong>Error Handling:</strong> Error logging komprehensif dan recovery mechanism</div>
                  <div><strong>Performance:</strong> Optimasi memory dengan chunking dan streaming</div>
                </div>
              </div>
                </div>
              </div>
            </div>
      </CollapsibleSection>

      {/* System Administration */}
      <CollapsibleSection 
        title="System Administration" 
        icon={<AdminPanelSettingsIcon className="text-red-600" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Admin Panel Features</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• User management and permissions</li>
                <li>• System configuration</li>
                <li>• Data backup and restore</li>
                <li>• Audit logging</li>
                <li>• Performance monitoring</li>
                <li>• Security settings</li>
                  </ul>
                </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Formulas & Calculations</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• KPI calculation algorithms</li>
                <li>• Performance scoring formulas</li>
                <li>• Trend analysis methods</li>
                <li>• Statistical computations</li>
                <li>• Custom metric definitions</li>
                <li>• Weight adjustment tools</li>
                    </ul>
                  </div>
                </div>
            
          <div className="space-y-4">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100">System Architecture</h5>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm space-y-2">
                <div><strong>Frontend:</strong> React 18 with TypeScript, Vite build system</div>
                <div><strong>Styling:</strong> Tailwind CSS with custom design system</div>
                <div><strong>Database:</strong> IndexedDB via Dexie.js for offline-first architecture</div>
                <div><strong>State Management:</strong> React Context API with custom hooks</div>
                <div><strong>Charts:</strong> Recharts library with custom components</div>
                <div><strong>Icons:</strong> Material-UI Icons for consistency</div>
              </div>
            </div>
                </div>
              </div>
      </CollapsibleSection>

      {/* Technical Specifications */}
      <CollapsibleSection 
        title="Technical Specifications" 
        icon={<LightbulbIcon className="text-yellow-600" />}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Performance Optimization</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• React.memo for component optimization</li>
                <li>• useMemo and useCallback hooks</li>
                <li>• Virtual scrolling for large datasets</li>
                <li>• Lazy loading of components</li>
                <li>• Efficient re-rendering strategies</li>
                <li>• Memory leak prevention</li>
              </ul>
              </div>

            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100">Data Processing</h5>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Real-time data aggregation</li>
                <li>• Efficient filtering algorithms</li>
                <li>• Caching strategies</li>
                <li>• Background processing</li>
                <li>• Data validation pipelines</li>
                <li>• Error recovery mechanisms</li>
              </ul>
                </div>
              </div>

          <div className="space-y-4">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100">Development Guidelines</h5>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm space-y-2">
                <div><strong>Code Style:</strong> ESLint + Prettier configuration</div>
                <div><strong>Type Safety:</strong> Strict TypeScript configuration</div>
                <div><strong>Testing:</strong> Jest + React Testing Library</div>
                <div><strong>Documentation:</strong> JSDoc comments and README files</div>
                <div><strong>Version Control:</strong> Git with conventional commits</div>
                <div><strong>Deployment:</strong> Vercel/Netlify ready configuration</div>
              </div>
                </div>
              </div>
            </div>
      </CollapsibleSection>
    </div>
  );
} 