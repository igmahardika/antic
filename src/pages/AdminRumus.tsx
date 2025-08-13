import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function AdminRumus() {
  return (
    <div className="max-w-full w-full py-10 px-2 sm:px-6 space-y-10">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100 text-left">Dokumentasi Rumus & Perhitungan Analytics</h1>
      <p className="mb-8 text-base text-gray-700 dark:text-gray-300 text-left">Halaman ini berisi dokumentasi lengkap semua rumus, bobot, dan logika perhitungan yang digunakan di seluruh fitur dashboard analytics. Setiap bagian dikelompokkan berdasarkan fitur/halaman utama dengan penjelasan detail implementasi, contoh perhitungan, dan metodologi yang digunakan.</p>

      {/* Table of Contents */}
      <Card className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Daftar Isi</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Analytics Features</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Agent Analytics</li>
                <li>• Ticket Analytics</li>
                <li>• Customer Analytics / Kanban Board</li>
                <li>• Summary Dashboard</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Technical Sections</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Data Processing & Validation</li>
                <li>• Advanced Analytics Features</li>
                <li>• Statistical Methods</li>
                <li>• Performance Optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Analytics */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Agent Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Fitur Agent Analytics menampilkan performa agent berdasarkan skor gabungan dari beberapa KPI utama. Sistem menggunakan dua metodologi scoring yang berbeda untuk memberikan evaluasi komprehensif: <strong>Primary Scoring System</strong> (digunakan di interface utama) dan <strong>Alternative Scoring System</strong> (digunakan di agentStore dan beberapa kalkulasi backend).
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 Primary Scoring System (Interface Utama)</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">Digunakan di AgentAnalytics.tsx untuk ranking dan display utama</p>
            </div>
            
            <div>
              <div className="font-semibold mb-1 text-base">1. Bobot KPI Utama</div>
              <ul className="list-disc pl-6 mb-2">
                <li><strong>FCR (First Contact Resolution): 30%</strong> - Resolusi di kontak pertama</li>
                <li><strong>SLA (Service Level Agreement): 25%</strong> - Ketepatan waktu respon</li>
                <li><strong>FRT (First Response Time): 15%</strong> - Kecepatan respon pertama</li>
                <li><strong>ART (Average Resolution Time): 15%</strong> - Kecepatan penyelesaian</li>
                <li><strong>Backlog: 5%</strong> - Jumlah tiket tertunda</li>
                <li><strong>Ticket Volume: 10%</strong> - Jumlah tiket yang ditangani</li>
              </ul>
              <div className="mb-2"><strong>Rumus Skor Akhir:</strong></div>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Score = FCR*0.3 + SLA*0.25 + FRT*0.15 + ART*0.15 + Backlog*0.05 + Ticket*0.10`}</pre>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">⚖️ Alternative Scoring System (Backend Store)</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">Digunakan di agentStore.ts dan beberapa kalkulasi backend</p>
              <div className="mt-3">
                <div className="font-medium mb-1">Bobot Alternatif:</div>
                <ul className="list-disc pl-6 text-sm">
                  <li>FRT: 25%, ART: 20%, FCR: 20%, SLA: 15%, Volume: 10%, Backlog: 10%</li>
                </ul>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">2. Metodologi Normalisasi KPI</div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2">📈 KPI Positif (Semakin tinggi semakin baik)</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Berlaku untuk:</strong> FCR, SLA, Ticket Volume</div>
                  <div><strong>Rumus:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Skor = min((Aktual / Target) × 100, 120)</code></div>
                  <div><strong>Contoh FCR:</strong> Target 75%, Aktual 70% → Skor = min((70/75)×100, 120) = 93.3</div>
                  <div><strong>Cap Maximum:</strong> 120 untuk menghindari outlier yang ekstrem</div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-red-800 dark:text-red-200 mb-2">📉 KPI Negatif (Semakin rendah semakin baik)</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Berlaku untuk:</strong> FRT, ART</div>
                  <div><strong>Rumus:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Skor = min((Target / Aktual) × 100, 120)</code></div>
                  <div><strong>Contoh FRT:</strong> Target 15 menit, Aktual 3000 menit → Skor = min((15/3000)×100, 120) = 0.5</div>
                  <div><strong>Handling Zero:</strong> Jika aktual = 0, skor = 0 (bukan infinity)</div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h5 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🔧 Normalisasi Khusus</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Backlog Scoring:</strong></div>
                                        <ul className="list-disc pl-6 mt-1">
                        <li>Backlog = 0 → Skor = 100</li>
                        <li>Backlog ≤ 10 → Skor = max(100 - backlog × 5, 0)</li>
                        <li>Backlog &gt; 10 → Skor = 0</li>
                      </ul>
                  <div className="mt-2"><strong>Ticket Volume Scoring:</strong></div>
                  <ul className="list-disc pl-6 mt-1">
                    <li>Skor = min((Ticket Agent / Max Ticket Semua Agent) × 100, 120)</li>
                    <li>Mendorong produktivitas tanpa memberikan penalty berlebihan</li>
              </ul>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">3. Detail Perhitungan Masing-masing KPI</div>
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-green-600 dark:text-green-400 mb-2">🎯 FCR (First Contact Resolution)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Persentase tiket yang diselesaikan dalam satu kontak tanpa eskalasi</div>
                      <div><strong>Target:</strong> 75%</div>
                      <div><strong>Indikator:</strong> Tiket tanpa field Penanganan2</div>
                    </div>
                <div>
                      <div><strong>Rumus:</strong> <code>FCR = (Tiket tanpa follow-up / Total tiket) × 100%</code></div>
                      <div><strong>Scoring:</strong> <code>min((FCR / 75) × 100, 120)</code></div>
                      <div><strong>Contoh:</strong> FCR 70% → Skor = 93.3</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">⏱️ SLA (Service Level Agreement)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Persentase tiket yang diselesaikan dalam batas waktu 24 jam</div>
                      <div><strong>Target:</strong> 85%</div>
                      <div><strong>Batas Waktu:</strong> ≤ 1440 menit (24 jam)</div>
                </div>
                <div>
                      <div><strong>Rumus:</strong> <code>SLA = (Tiket ≤ 24 jam / Total tiket) × 100%</code></div>
                      <div><strong>Scoring:</strong> <code>min((SLA / 85) × 100, 120)</code></div>
                      <div><strong>Contoh:</strong> SLA 69.8% → Skor = 82.1</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🚀 FRT (First Response Time)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Rata-rata waktu dari buka tiket hingga respon pertama</div>
                      <div><strong>Target:</strong> 15 menit</div>
                      <div><strong>Pengukuran:</strong> ClosePenanganan - WaktuOpen</div>
                </div>
                <div>
                  <div><strong>Rumus:</strong> <code>FRT = Σ(waktu respon) / Jumlah tiket</code></div>
                  <div><strong>Target baru:</strong> 60 menit (1 jam)</div>
                  <div><strong>Scoring:</strong> <code>min((60 / FRT) × 100, 120)</code></div>
                      <div><strong>Contoh:</strong> FRT 3000 menit → Skor = 2.0</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">🔧 ART (Average Resolution Time)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Rata-rata waktu dari buka tiket hingga selesai</div>
                  <div><strong>Target baru:</strong> 1440 menit (24 jam)</div>
                      <div><strong>Pengukuran:</strong> WaktuCloseTicket - WaktuOpen</div>
                </div>
                <div>
                      <div><strong>Rumus:</strong> <code>ART = Σ(waktu penyelesaian) / Jumlah tiket</code></div>
                  <div><strong>Scoring:</strong> <code>min((1440 / ART) × 100, 120)</code></div>
                      <div><strong>Contoh:</strong> ART 4440 menit → Skor = 32.4</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-red-600 dark:text-red-400 mb-2">📋 Backlog Management</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Tiket yang masih terbuka atau tertunda</div>
                      <div><strong>Kriteria:</strong> Status "OPEN TICKET", closeTime kosong, atau close di bulan berikutnya</div>
                      <div><strong>Tujuan:</strong> Mendorong penyelesaian tepat waktu</div>
                </div>
                <div>
                      <div><strong>Rumus Scoring:</strong></div>
                      <ul className="list-disc pl-4 mt-1">
                        <li>Backlog = 0 → Skor = 100</li>
                        <li>Backlog ≤ 10 → Skor = max(100 - backlog × 5, 0)</li>
                        <li>Backlog &gt; 10 → Skor = 0</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">📊 Ticket Volume (Produktivitas)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Jumlah tiket yang ditangani relatif terhadap agent paling produktif</div>
                      <div><strong>Filosofi:</strong> Mendorong produktivitas tanpa over-penalize</div>
                      <div><strong>Normalisasi:</strong> Berbasis performa maksimal tim</div>
                </div>
                <div>
                      <div><strong>Rumus:</strong> <code>Volume Score = (Tiket Agent / Max Tiket Tim) × 100</code></div>
                      <div><strong>Cap:</strong> Maksimal 120 untuk fairness</div>
                      <div><strong>Contoh:</strong> 814/814 tiket → Skor = 100</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">4. Sistem Ranking & Grade</div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-semibold mb-2">📊 Ranking Logic</h5>
                    <ul className="text-sm space-y-1">
                      <li>• Urutkan berdasarkan skor akhir (tertinggi ke terendah)</li>
                      <li>• Tampilkan posisi numerik (Rank #1, #2, dst)</li>
                      <li>• Highlight top 3 performers dengan badge khusus</li>
                      <li>• Automatic tie-breaking berdasarkan volume tiket</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2">🎖️ Grade Classification</h5>
                    <ul className="text-sm space-y-1">
                      <li>• <strong>Grade A:</strong> Skor ≥ 75 (Excellent)</li>
                      <li>• <strong>Grade B:</strong> Skor 60-74 (Good)</li>
                      <li>• <strong>Grade C:</strong> Skor 45-59 (Fair)</li>
                      <li>• <strong>Grade D:</strong> Skor &lt; 45 (Needs Improvement)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">5. Monthly Performance & Trend Analysis</div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                <h5 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2">📈 Agent Monthly Chart</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Metodologi:</strong> Tracking performa bulanan dengan bobot khusus</div>
                  <div><strong>Bobot Monthly:</strong> w1=0.3 (FCR), w2=0.25 (SLA), w3=0.003 (ART), w4=0.1 (Backlog)</div>
                  <div><strong>Normalisasi ART:</strong> ART_norm = (ART / 1440) × 100 (24 jam sebagai base)</div>
                  <div><strong>Score Formula:</strong> <code>Score = w1×FCR + w2×SLA - w3×ART_norm - w4×backlog</code></div>
                  <div><strong>Range:</strong> 0-100, capped untuk konsistensi</div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">6. Automated Insights & Intelligence</div>
              <div className="space-y-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <h6 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">🧠 Smart Insights</h6>
                  <ul className="text-sm space-y-1">
                                          <li>• Auto-detect agents dengan FRT &gt; 15 menit</li>
                      <li>• Identifikasi agents dengan SLA &lt; 85%</li>
                    <li>• Highlight improvement trends dan degradasi performa</li>
                    <li>• Rekomendasi action items berdasarkan weakest KPI</li>
                  </ul>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <h6 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">🏆 Recognition System</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Top Overall Agent:</strong> Highest composite score</li>
                    <li>• <strong>Fastest Responder:</strong> Lowest FRT</li>
                    <li>• <strong>Fastest Resolution:</strong> Lowest ART</li>
                    <li>• <strong>Best SLA Performer:</strong> Highest SLA %</li>
                    <li>• <strong>Most Reliable:</strong> Highest FCR + zero backlog</li>
                    <li>• <strong>Most Improved:</strong> Biggest score delta increase</li>
                    <li>• <strong>Most Engaged:</strong> Highest ticket volume</li>
              </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="font-semibold mb-3 text-base">Breakdown Fitur & Komponen Teknis</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h6 className="font-medium">🎯 Core Features</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Agent Leaderboard dengan live ranking</li>
                  <li>• KPI Breakdown Cards dengan progress bars</li>
                  <li>• Monthly trend chart dengan drill-down</li>
                  <li>• Agent detail modal dengan complete metrics</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h6 className="font-medium">⚡ Advanced Features</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Real-time performance monitoring</li>
                  <li>• Automated insight generation</li>
                  <li>• Performance badges & recognition</li>
                  <li>• Export capabilities (PDF/CSV)</li>
            </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Analytics */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Ticket Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Fitur Ticket Analytics menganalisis statistik tiket, tren, dan kategori komplain untuk monitoring performa layanan dan workload operasional. Sistem ini menggunakan berbagai metode statistik dan analisis multidimensional untuk memberikan insight yang actionable.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Perubahan Definisi (2025-08)</h4>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li><strong>Active Clients per Month:</strong> Denominator memakai total baris upload per bulan (<code>customerMonthRowCount</code>), bukan jumlah nama unik.</li>
                <li><strong>Active per Type/Category:</strong> Denominator memakai agregat baris upload per bulan per tipe/kategori (<code>customerMonthRowCountByType</code>/<code>...ByCategory</code>).</li>
                <li><strong>Unique Complaining Clients:</strong> Nama dinormalisasi (trim/lowercase), harus aktif di bulan tersebut (<code>customerMonthMap</code> berisi bulan terkait), exclude klasifikasi <em>Di Luar Layanan</em>, <em>Gangguan Diluar Layanan</em>, dan <em>Request</em>.</li>
                <li><strong>Total (Union):</strong> Baris “Total” di tabel unique adalah <em>union</em> lintas tipe/kategori per bulan (bukan penjumlahan) agar tidak double count.</li>
                <li><strong>Rasio:</strong> Numerator = unique sesuai definisi; Denominator = agregat baris upload sesuai konteks (total/tipe/kategori).</li>
              </ul>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">📊 Overview Statistik Utama</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>Total Tickets, Closed, Open</div>
                <div>Average Duration & Resolution Rate</div>
                <div>SLA, FRT, ART Metrics</div>
                <div>Backlog, Overdue, Escalated</div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">1. Core KPI Calculations</div>
              
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">⏱️ SLA (Service Level Agreement)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Persentase tiket yang diselesaikan dalam batas waktu SLA (≤ 24 jam)</div>
                      <div><strong>Batas Waktu:</strong> 1440 menit (24 jam)</div>
                      <div><strong>Tujuan:</strong> Monitoring ketepatan waktu layanan</div>
                    </div>
                    <div>
                      <div><strong>Rumus:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`SLA = (Tiket ≤ 24 jam / Total tiket) × 100%`}</pre>
                      <div className="mt-2"><strong>Implementasi:</strong> Hitung durasi dari openTime hingga closeTime</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🚀 FRT (First Response Time)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Rata-rata waktu dari buka tiket hingga respon pertama</div>
                      <div><strong>Unit:</strong> Menit</div>
                      <div><strong>Data Source:</strong> closeHandling - openTime</div>
                    </div>
                    <div>
                      <div><strong>Rumus:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`FRT = Σ(waktu respon pertama) / Jumlah tiket valid`}</pre>
                      <div className="mt-2"><strong>Validasi:</strong> Hanya tiket dengan closeHandling yang valid</div>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">🔧 ART (Average Resolution Time)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Rata-rata waktu dari buka hingga close tiket</div>
                      <div><strong>Unit:</strong> Jam (duration.rawHours)</div>
                      <div><strong>Data Source:</strong> closeTime - openTime</div>
                    </div>
                    <div>
                      <div><strong>Rumus:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`ART = Σ(total durasi penyelesaian) / Jumlah tiket closed`}</pre>
                      <div className="mt-2"><strong>Format:</strong> Menggunakan formatDurationDHM() untuk display</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-3 text-base">2. Advanced Metrics & Status Classification</div>
              
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-red-600 dark:text-red-400 mb-2">📋 Backlog & Open Tickets</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Open Tickets:</strong> Tiket yang masih aktif/belum selesai</div>
                      <div><strong>Kriteria:</strong> Status bukan "closed" DAN (closeTime kosong ATAU closeTime di bulan berikutnya)</div>
                      <div><strong>Perhitungan:</strong> totalTickets - closedTickets</div>
                    </div>
                    <div>
                      <div><strong>Backlog Logic:</strong></div>
                      <ul className="list-disc pl-4 mt-1">
                        <li>Status = "OPEN TICKET"</li>
                        <li>closeTime kosong/null</li>
                                                  <li>closeTime &gt; akhir bulan periode filter</li>
              </ul>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">⏰ Overdue Tickets</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Tiket yang melebihi batas waktu SLA (&gt; 24 jam)</div>
                      <div><strong>Threshold:</strong> rawHours &gt; 24</div>
                      <div><strong>Impact:</strong> Indikator kegagalan SLA</div>
            </div>
            <div>
                      <div><strong>Rumus:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`Overdue = COUNT(tickets WHERE duration.rawHours > 24)`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">🔄 Escalated Tickets</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Tiket yang memerlukan multiple handling steps</div>
                      <div><strong>Indikator:</strong> Ada closeHandling2, closeHandling3, closeHandling4, atau closeHandling5 yang tidak kosong</div>
                      <div><strong>Impact:</strong> Menunjukkan kompleksitas masalah</div>
            </div>
            <div>
                      <div><strong>Detection Logic:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`Escalated = tickets.filter(t => 
  [t.closeHandling2, t.closeHandling3, 
   t.closeHandling4, t.closeHandling5]
  .some(h => h && h.trim() !== ''))`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">3. Statistical Analysis & Insights</div>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <h5 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">📈 Shift Analysis</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Shift Classification:</strong></div>
                  <ul className="list-disc pl-6">
                    <li>Pagi: 06:00 - 14:00</li>
                    <li>Sore: 14:00 - 22:00</li>
                    <li>Malam: 22:00 - 06:00</li>
              </ul>
                  <div><strong>Metrics per Shift:</strong> Average duration, Median, Count, Formatted duration (HH:MM:SS)</div>
                  <div><strong>Chart Data:</strong> Comparative performance visualization dengan insights shift tersibuk</div>
                </div>
              </div>

              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4 mt-4">
                <h5 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2">🏷️ Category Analysis</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Category Breakdown:</strong> Analisis per kategori komplain dengan metrics lengkap</div>
                  <div><strong>Metrics:</strong> Count, Average duration, Median, Range (min-max)</div>
                  <div><strong>Insight Generation:</strong> Identifikasi kategori dengan handling time terlama</div>
                  <div><strong>Top Complaints Table:</strong> Ranking berdasarkan Impact Score = count × avgDuration</div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">4. Automated Intelligence & Pattern Recognition</div>
              
              <div className="space-y-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <h6 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🧠 Keyword Analysis</h6>
                  <ul className="text-sm space-y-1">
                    <li>• Ekstraksi top 15 keywords dari deskripsi tiket</li>
                    <li>• Text processing untuk mengidentifikasi pola masalah</li>
                    <li>• Frequency analysis untuk trend detection</li>
              </ul>
            </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <h6 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">📅 Monthly Trend Analysis</h6>
                  <ul className="text-sm space-y-1">
                    <li>• Aggregasi data per bulan untuk trend analysis</li>
                    <li>• Identifikasi bulan tersibuk berdasarkan volume dan complexity</li>
                    <li>• Seasonal pattern recognition</li>
                    <li>• Forecasting capability untuk capacity planning</li>
              </ul>
            </div>

                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-3">
                  <h6 className="font-semibold text-rose-800 dark:text-rose-200 mb-1">🎯 Performance Insights</h6>
                  <ul className="text-sm space-y-1">
                    <li>• Resolution rate calculation dan benchmark</li>
                    <li>• SLA compliance monitoring dengan alert thresholds</li>
                    <li>• Bottleneck identification dalam workflow</li>
                    <li>• Recommendation engine untuk process improvement</li>
              </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="font-semibold mb-3 text-base">Breakdown Fitur & Komponen Teknis</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h6 className="font-medium text-blue-600 dark:text-blue-400">📊 Core Analytics</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Statistik Cards: Total, Closed, Open, Duration</li>
                  <li>• KPI Monitoring: SLA, FRT, ART dengan thresholds</li>
                  <li>• Status Tracking: Backlog, Overdue, Escalated</li>
                  <li>• Resolution Rate Calculator dengan benchmarks</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h6 className="font-medium text-green-600 dark:text-green-400">🎯 Advanced Features</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Shift Analysis dengan trend comparison</li>
                  <li>• Category Impact Scoring dengan ranking</li>
                  <li>• Monthly Pattern Recognition</li>
                  <li>• Automated Insight Generation</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h6 className="font-medium text-purple-600 dark:text-purple-400">📈 Visualizations</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Interactive Charts untuk trend analysis</li>
                  <li>• Pie Charts untuk category distribution</li>
                  <li>• Bar Charts untuk shift comparison</li>
                  <li>• Timeline views untuk monthly patterns</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h6 className="font-medium text-orange-600 dark:text-orange-400">🔧 Data Operations</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Real-time filtering dengan date ranges</li>
                  <li>• Export capabilities (PDF/CSV/Excel)</li>
                  <li>• Data validation dan quality checks</li>
                  <li>• Performance optimization untuk large datasets</li>
            </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Analytics / Kanban Board */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Customer Analytics / Kanban Board</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Fitur Customer Analytics / Kanban Board mengimplementasikan sistem klasifikasi risiko pelanggan berdasarkan pola komplain dan analisis statistik. Sistem ini menggunakan metodologi distribusi normal untuk segmentasi pelanggan dan menghasilkan insight actionable untuk customer relationship management.
            </p>
            
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
              <h4 className="font-semibold text-teal-800 dark:text-teal-200 mb-2">🎯 Customer Risk Classification Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium text-green-600">Normal</div>
                  <div>Low Risk</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-yellow-600">Persisten</div>
                  <div>Medium Risk</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-orange-600">Kronis</div>
                  <div>High Risk</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-red-600">Ekstrem</div>
                  <div>Critical Risk</div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">1. Statistical Classification Methodology</div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📊 Distribution Analysis</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Data Preparation:</strong></div>
                  <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`// Agregasi tiket per customer
const customerTicketCounts = {};
gridData.forEach(ticket => {
  const customer = ticket.name || ticket.customerId || 'Unknown';
  customerTicketCounts[customer] = (customerTicketCounts[customer] || 0) + 1;
});`}</pre>
                  
                  <div className="mt-3"><strong>Statistical Calculation:</strong></div>
                  <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const countsArr = Object.values(customerTicketCounts);
const mean = countsArr.reduce((a,b) => a+b, 0) / countsArr.length;
const variance = countsArr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / countsArr.length;
const stddev = Math.sqrt(variance);`}</pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-green-600 dark:text-green-400 mb-2">🟢 Normal Customers</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Kriteria:</strong> Ticket count ≤ mean</div>
                      <div><strong>Karakteristik:</strong> Pelanggan dengan pola komplain normal</div>
                      <div><strong>Risk Level:</strong> Low - Maintenance required</div>
                    </div>
                    <div>
                      <div><strong>Rumus Klasifikasi:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`if (ticketCount <= mean) {
  classification = 'Normal';
  riskLevel = 'Low';
}`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">🟡 Persisten Customers</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                                              <div><strong>Kriteria:</strong> mean &lt; count ≤ mean + 1σ</div>
                      <div><strong>Karakteristik:</strong> Pelanggan dengan komplain berulang</div>
                      <div><strong>Risk Level:</strong> Medium - Attention needed</div>
                    </div>
                    <div>
                      <div><strong>Rumus Klasifikasi:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`if (ticketCount <= mean + stddev) {
  classification = 'Persisten';
  riskLevel = 'Medium';
}`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🟠 Kronis Customers</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Kriteria:</strong> mean+1σ &lt; count ≤ mean+2σ</div>
                      <div><strong>Karakteristik:</strong> Pelanggan dengan masalah sistemik</div>
                      <div><strong>Risk Level:</strong> High - Immediate action</div>
                    </div>
                    <div>
                      <div><strong>Rumus Klasifikasi:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`if (ticketCount <= mean + 2*stddev) {
  classification = 'Kronis';
  riskLevel = 'High';
}`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-red-600 dark:text-red-400 mb-2">🔴 Ekstrem Customers</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Kriteria:</strong> count &gt; mean + 2σ</div>
                      <div><strong>Karakteristik:</strong> Outlier customers dengan masalah severe</div>
                      <div><strong>Risk Level:</strong> Critical - Executive escalation</div>
                    </div>
                    <div>
                      <div><strong>Rumus Klasifikasi:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`if (ticketCount > mean + 2*stddev) {
  classification = 'Ekstrem';
  riskLevel = 'Critical';
}`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-3 text-base">2. Complaint Analysis & Pattern Recognition</div>
              
              <div className="space-y-4">
                <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4">
                  <h5 className="font-semibold text-violet-800 dark:text-violet-200 mb-2">🔍 Multi-Dimensional Analysis</h5>
                  <div className="text-sm space-y-2">
                    <div><strong>Category Analysis:</strong> Agregasi tiket berdasarkan kategori utama komplain</div>
                    <div><strong>Sub-Category Breakdown:</strong> Drilling down ke level masalah spesifik</div>
                    <div><strong>Keyword Extraction:</strong> NLP-based analysis untuk pattern identification</div>
                    <div><strong>Temporal Analysis:</strong> Trend komplain sepanjang waktu</div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">📊 Impact Scoring Algorithm</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Formula:</strong> Impact Score = Count × Average Duration</div>
                      <div><strong>Logic:</strong> Mengkombinasikan frequency dan complexity</div>
                      <div><strong>Purpose:</strong> Prioritization berdasarkan business impact</div>
                    </div>
                    <div>
                      <div><strong>Implementation:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const impactScore = data.tickets.length * avgDuration;
const categoryRanking = categories
  .sort((a, b) => b.impactScore - a.impactScore);`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">3. Intelligent Insights & Recommendation Engine</div>
              
              <div className="space-y-3">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <h6 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">🎯 Insight Generation</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Root Cause Analysis:</strong> Identifikasi masalah fundamental berdasarkan pattern</li>
                    <li>• <strong>Customer Journey Mapping:</strong> Tracking touchpoint yang problematic</li>
                    <li>• <strong>Predictive Risk Scoring:</strong> Early warning system untuk customer churn</li>
                    <li>• <strong>Service Quality Assessment:</strong> Gap analysis antara expectation vs delivery</li>
                  </ul>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <h6 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">💡 Automated Recommendations</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Proactive Education:</strong> Customer training untuk mengurangi repeat issues</li>
                    <li>• <strong>Process Optimization:</strong> SOP improvement berdasarkan failure patterns</li>
                    <li>• <strong>Resource Allocation:</strong> Staffing recommendation untuk high-risk segments</li>
                    <li>• <strong>Technology Solutions:</strong> Automation opportunities untuk common issues</li>
              </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <h6 className="font-semibold text-red-800 dark:text-red-200 mb-1">🚨 Escalation Triggers</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Customer Risk Level:</strong> Auto-escalate Kronis & Ekstrem customers</li>
                    <li>• <strong>Complaint Velocity:</strong> Alert pada sudden spike in complaints</li>
                    <li>• <strong>Resolution Time:</strong> Flag customers dengan extended resolution times</li>
                    <li>• <strong>Satisfaction Threshold:</strong> Proactive intervention untuk declining satisfaction</li>
              </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">4. Kanban Board Implementation & Workflow</div>
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">📋 Board Logic & Card Management</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Column Organization:</strong></div>
                    <ul className="list-disc pl-4 mt-1">
                      <li>Normal → Green column (Low priority)</li>
                      <li>Persisten → Yellow column (Medium priority)</li>
                      <li>Kronis → Orange column (High priority)</li>
                      <li>Ekstrem → Red column (Critical priority)</li>
                    </ul>
                  </div>
                  <div>
                    <div><strong>Card Information:</strong></div>
                    <ul className="list-disc pl-4 mt-1">
                      <li>Customer Name & ID</li>
                      <li>Ticket Count & Classification</li>
                      <li>Recent Complaint Categories</li>
                      <li>Risk Score & Priority Level</li>
                      <li>Last Contact Date & Next Action</li>
              </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="font-semibold mb-3 text-base">Breakdown Fitur & Komponen Teknis</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h6 className="font-medium text-teal-600 dark:text-teal-400">🎯 Customer Classification</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Kanban Board dengan 4 risk-based columns</li>
                  <li>• Customer cards dengan classification badges</li>
                  <li>• Statistical distribution visualization</li>
                  <li>• Real-time risk score calculation</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h6 className="font-medium text-violet-600 dark:text-violet-400">🔍 Complaint Analysis</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Multi-dimensional category breakdown</li>
                  <li>• Impact scoring dengan business priority</li>
                  <li>• Keyword extraction & pattern recognition</li>
                  <li>• Temporal trend analysis</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h6 className="font-medium text-emerald-600 dark:text-emerald-400">💡 Intelligence Engine</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Automated insight generation</li>
                  <li>• Recommendation algorithms</li>
                  <li>• Root cause analysis</li>
                  <li>• Predictive risk modeling</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h6 className="font-medium text-amber-600 dark:text-amber-400">🚨 Action Management</h6>
                <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
                  <li>• Escalation trigger system</li>
                  <li>• Priority-based workflow routing</li>
                  <li>• Customer detail modal dengan history</li>
                  <li>• Action plan generator</li>
            </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Dashboard */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Summary Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Summary Dashboard mengintegrasikan semua analytics modules untuk memberikan executive overview yang komprehensif. Sistem ini menggunakan algoritma ranking multifaktor dan recognition system yang canggih untuk mengidentifikasi top performers dalam berbagai kategori.
            </p>
            
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">🏆 Performance Recognition System</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Algoritma pintar untuk mengidentifikasi dan merayakan excellence dalam berbagai dimensi performa</p>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">1. Top Agent Rankings & Calculation Logic</div>
              
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">🥇 Top Overall Agent</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan composite score tertinggi dari semua KPI</div>
                      <div><strong>Basis:</strong> Primary scoring system (FCR 30%, SLA 25%, dst)</div>
                                              <div><strong>Selection:</strong> agentWithScore.reduce((a, b) =&gt; (b.score &gt; a.score ? b : a))</div>
                    </div>
                    <div>
                      <div><strong>Calculation Method:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const topOverall = sortedAgents[0]; // Highest score
const displayScore = Math.round(topOverall.score);
const recognition = "Highest overall performance";`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">⚡ Fastest Responder</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan First Response Time (FRT) terendah</div>
                      <div><strong>Unit:</strong> Menit, display dengan formatDurationDHM()</div>
                      <div><strong>Criteria:</strong> Minimum FRT dari semua agents</div>
                    </div>
                    <div>
                      <div><strong>Selection Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const fastestResponder = dataSource.reduce(
  (min, agent) => agent.frt < min.frt ? agent : min,
  dataSource[0]
);`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-green-600 dark:text-green-400 mb-2">🚀 Fastest Resolution</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan Average Resolution Time (ART) terendah</div>
                      <div><strong>Measurement:</strong> Total waktu dari open hingga close ticket</div>
                      <div><strong>Display:</strong> Formatted duration (HH:MM:SS)</div>
                    </div>
                    <div>
                      <div><strong>Selection Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const fastestResolution = dataSource.reduce(
  (min, agent) => agent.art < min.art ? agent : min,
  dataSource[0]
);`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">📈 Best SLA Performer</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan percentage SLA compliance tertinggi</div>
                      <div><strong>Threshold:</strong> Target 85%, display actual percentage</div>
                      <div><strong>Calculation:</strong> (Tiket ≤24 jam / Total tiket) × 100%</div>
                    </div>
                    <div>
                      <div><strong>Selection Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const bestSLA = dataSource.reduce(
  (max, agent) => agent.sla > max.sla ? agent : max,
  dataSource[0]
);`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">🎯 Most Reliable</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan FCR tertinggi DAN backlog = 0</div>
                      <div><strong>Dual Criteria:</strong> Excellence in first-contact resolution + zero backlog</div>
                      <div><strong>Philosophy:</strong> Reliability = Quality + Consistency</div>
                    </div>
                    <div>
                      <div><strong>Selection Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const reliableCandidates = dataSource.filter(a => a.backlog === 0);
const mostReliable = reliableCandidates.reduce(
  (max, agent) => agent.fcr > max.fcr ? agent : max,
  reliableCandidates[0]
);`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mb-2">📊 Most Improved Agent</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan delta score increase terbesar</div>
                      <div><strong>Calculation:</strong> Current score - Previous period score</div>
                      <div><strong>Time Period:</strong> Month-over-month comparison</div>
                    </div>
                    <div>
                      <div><strong>Trend Analysis:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const agentWithDelta = agentWithScore.map(a => {
  const trend = getAgentScoreTrend(a.agent);
  const delta = trend.length > 1 ? 
    trend[trend.length-1] - trend[trend.length-2] : 0;
  return { ...a, delta };
});`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-2">💼 Most Engaged</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Definisi:</strong> Agent dengan volume tiket tertinggi</div>
                      <div><strong>Metric:</strong> Total jumlah tiket yang ditangani</div>
                      <div><strong>Philosophy:</strong> Engagement = Productivity + Dedication</div>
                    </div>
                    <div>
                      <div><strong>Selection Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const mostEngaged = agentWithScore.reduce(
  (max, agent) => agent.vol > max.vol ? agent : max,
  agentWithScore[0]
);`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">2. Summary Cards & Executive Metrics</div>
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">📋 Summary Statistics</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Total Active Agents:</strong> agents.length</div>
                    <div><strong>Average Response Time:</strong> Weighted average dari semua agents</div>
                    <div><strong>Top Performer Name:</strong> Nama agent dengan skor tertinggi</div>
                  </div>
                  <div>
                    <div><strong>Busiest Agent:</strong> Agent dengan volume tiket terbanyak</div>
                    <div><strong>Most Efficient:</strong> Best ART performer</div>
                    <div><strong>Highest Resolution:</strong> Best overall resolution metrics</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">3. Data Integration & Cross-Module Analytics</div>
              
              <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                <h5 className="font-semibold text-cyan-800 dark:text-cyan-200 mb-2">🔗 Module Integration</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Agent Analytics:</strong> Source untuk performance scores dan rankings</div>
                  <div><strong>Ticket Analytics:</strong> Aggregate statistics untuk context</div>
                  <div><strong>Customer Analytics:</strong> Risk distribution dan satisfaction insights</div>
                  <div><strong>Real-time Updates:</strong> Live data refresh untuk accurate rankings</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Processing & Validation */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Data Processing & Validation</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Sistem data processing mengimplementasikan multiple layers validasi, cleaning, dan transformation untuk memastikan kualitas data dan akurasi analytics. Proses ini melibatkan real-time validation, error handling, dan data quality monitoring.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🔄 Data Pipeline Overview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-medium">Ingestion</div>
                  <div>Excel/CSV Upload</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Validation</div>
                  <div>Schema & Rules</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Processing</div>
                  <div>Transform & Clean</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Storage</div>
                  <div>IndexedDB</div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">1. Data Validation Rules & Schema</div>
              
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Required Field Validation</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Critical Fields:</strong></div>
                      <ul className="list-disc pl-4 mt-1">
                        <li>openTime - Timestamp buka tiket</li>
                        <li>openBy - Agent yang menangani</li>
                        <li>customerId/name - Identifikasi customer</li>
                        <li>category - Kategori masalah</li>
                      </ul>
                    </div>
                    <div>
                      <div><strong>Validation Logic:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const isValidTicket = (ticket) => {
  return ticket.openTime && 
         ticket.openBy && 
         (ticket.customerId || ticket.name) &&
         ticket.category;
};`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">📅 Date/Time Processing</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Date Validation:</strong> Parsing multiple formats</div>
                      <div><strong>Timezone Handling:</strong> Normalisasi ke local timezone</div>
                      <div><strong>Range Checks:</strong> Logical date boundaries</div>
                    </div>
                    <div>
                      <div><strong>Processing Function:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const parseDate = (dateValue) => {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format');
  }
  return date;
};`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">🔢 Numeric Data Validation</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Duration Calculations:</strong> Automatic dari date fields</div>
                      <div><strong>Range Validation:</strong> Logical boundaries (0-999999 menit)</div>
                      <div><strong>Type Coercion:</strong> String to number conversion</div>
                    </div>
                    <div>
                      <div><strong>Duration Processing:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const calculateDuration = (open, close) => {
  if (!open || !close) return null;
  const diffMs = close.getTime() - open.getTime();
  return {
    rawHours: diffMs / (1000 * 60 * 60),
    rawMinutes: diffMs / (1000 * 60)
  };
};`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-orange-600 dark:text-orange-400 mb-2">🧹 Data Cleaning & Normalization</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>String Cleaning:</strong> Trim whitespace, normalize case</div>
                      <div><strong>Category Mapping:</strong> Standardisasi nama kategori</div>
                      <div><strong>Agent Name Consistency:</strong> Unifikasi format nama</div>
                    </div>
                    <div>
                      <div><strong>Cleaning Pipeline:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const cleanTicket = (ticket) => ({
  ...ticket,
  openBy: ticket.openBy?.trim(),
  category: normalizeCategory(ticket.category),
  name: ticket.name?.trim()?.toLowerCase()
});`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">2. Filter Implementation & Time Period Logic</div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">📊 Smart Filtering System</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Time Period Filtering:</strong></div>
                    <ul className="list-disc pl-4 mt-1">
                      <li>Month/Year range selection</li>
                      <li>Automatic boundary calculation</li>
                      <li>Timezone-aware comparisons</li>
                      <li>Edge case handling (month boundaries)</li>
                    </ul>
                  </div>
                  <div>
                    <div><strong>Filter Implementation:</strong></div>
                    <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const filteredTickets = allTickets.filter(ticket => {
  if (!cutoffStart || !cutoffEnd) return true;
  const ticketDate = new Date(ticket.openTime);
  return ticketDate >= cutoffStart && 
         ticketDate <= cutoffEnd;
});`}</pre>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">3. Error Handling & Recovery Mechanisms</div>
              
              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <h6 className="font-semibold text-red-800 dark:text-red-200 mb-1">🚨 Error Categories</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Schema Violations:</strong> Missing required fields, invalid data types</li>
                    <li>• <strong>Business Logic Errors:</strong> Illogical date sequences, negative durations</li>
                    <li>• <strong>Reference Integrity:</strong> Invalid agent names, unknown categories</li>
                    <li>• <strong>Performance Issues:</strong> Large dataset handling, memory constraints</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <h6 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">🔧 Recovery Strategies</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Graceful Degradation:</strong> Skip invalid records dengan logging</li>
                    <li>• <strong>Default Value Injection:</strong> Smart defaults untuk missing data</li>
                    <li>• <strong>Progressive Loading:</strong> Batch processing untuk large files</li>
                    <li>• <strong>User Feedback:</strong> Clear error messages dengan suggested fixes</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">4. Data Quality Monitoring & Metrics</div>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <h5 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">📈 Quality Indicators</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Completeness Rate:</strong> Percentage records dengan semua required fields</div>
                  <div><strong>Validity Rate:</strong> Percentage records yang pass semua validation rules</div>
                  <div><strong>Consistency Score:</strong> Uniformity dalam format dan conventions</div>
                  <div><strong>Timeliness Metric:</strong> Freshness dan currency dari data</div>
                  <div><strong>Accuracy Assessment:</strong> Cross-validation dengan business rules</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Analytics Features */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Advanced Analytics Features</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Advanced Analytics Features mengimplementasikan cutting-edge algorithms untuk predictive analytics, trend forecasting, dan machine learning-based insights. Sistem ini menggunakan statistical models dan AI techniques untuk memberikan actionable intelligence.
            </p>
            
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">🤖 AI-Powered Analytics</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">Machine learning algorithms untuk pattern recognition, forecasting, dan automated decision support</p>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">1. Trend Analysis & Pattern Recognition</div>
              
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">📈 Time Series Analysis</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Seasonal Decomposition:</strong> Identifikasi pola musiman dan trend</div>
                      <div><strong>Moving Averages:</strong> Smoothing untuk noise reduction</div>
                      <div><strong>Cyclical Patterns:</strong> Weekly, monthly, quarterly cycles</div>
                    </div>
                    <div>
                      <div><strong>Trend Detection Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const detectTrend = (timeSeries) => {
  const ma7 = movingAverage(timeSeries, 7);
  const ma30 = movingAverage(timeSeries, 30);
  return {
    shortTerm: ma7[ma7.length-1] - ma7[ma7.length-7],
    longTerm: ma30[ma30.length-1] - ma30[ma30.length-30]
  };
};`}</pre>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="font-semibold text-cyan-600 dark:text-cyan-400 mb-2">🔍 Anomaly Detection</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div><strong>Statistical Outliers:</strong> Z-score dan IQR methods</div>
                      <div><strong>Behavioral Anomalies:</strong> Deviasi dari historical patterns</div>
                      <div><strong>Performance Spikes:</strong> Sudden changes dalam KPIs</div>
                    </div>
                    <div>
                      <div><strong>Anomaly Algorithm:</strong></div>
                      <pre className="bg-zinc-900 text-white rounded p-2 text-xs mt-1">{`const detectAnomalies = (data) => {
  const mean = data.reduce((a,b) => a+b) / data.length;
  const stdDev = Math.sqrt(data.reduce((sq, n) => 
    sq + Math.pow(n - mean, 2)) / data.length);
  return data.filter(x => Math.abs(x - mean) > 2 * stdDev);
};`}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">2. Predictive Modeling & Forecasting</div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🔮 Forecasting Models</h5>
                <div className="text-sm space-y-2">
                  <div><strong>Ticket Volume Forecasting:</strong> Prediksi load untuk capacity planning</div>
                  <div><strong>Performance Projection:</strong> Agent performance trends</div>
                  <div><strong>Seasonal Adjustment:</strong> Holiday dan peak period compensation</div>
                  <div><strong>Confidence Intervals:</strong> Uncertainty quantification dalam predictions</div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">3. Automated Insight Generation</div>
              
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <h6 className="font-semibold text-green-800 dark:text-green-200 mb-1">🧠 Natural Language Insights</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Performance Narratives:</strong> Human-readable performance summaries</li>
                    <li>• <strong>Comparative Analysis:</strong> Period-over-period comparisons</li>
                    <li>• <strong>Root Cause Identification:</strong> Automated problem diagnosis</li>
                    <li>• <strong>Action Recommendations:</strong> Data-driven improvement suggestions</li>
                  </ul>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <h6 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">⚡ Real-time Intelligence</h6>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Live Monitoring:</strong> Continuous performance tracking</li>
                    <li>• <strong>Alert Generation:</strong> Proactive notification system</li>
                    <li>• <strong>Dynamic Thresholds:</strong> Adaptive alerting berdasarkan historical data</li>
                    <li>• <strong>Contextual Recommendations:</strong> Situational guidance untuk managers</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold mb-3 text-base">4. Performance Optimization & Scalability</div>
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h5 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">⚙️ Technical Architecture</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div><strong>Data Processing:</strong></div>
                    <ul className="list-disc pl-4 mt-1">
                      <li>Client-side processing dengan Web Workers</li>
                      <li>Incremental computation untuk large datasets</li>
                      <li>Memory-efficient algorithms</li>
                      <li>Progressive loading dan virtualization</li>
                    </ul>
                  </div>
          <div>
                    <div><strong>Caching Strategy:</strong></div>
                    <ul className="list-disc pl-4 mt-1">
                      <li>IndexedDB untuk persistent storage</li>
                      <li>In-memory caching untuk frequently accessed data</li>
                      <li>Intelligent cache invalidation</li>
                      <li>Background data refresh</li>
            </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 