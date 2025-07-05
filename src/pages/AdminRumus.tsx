import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function AdminRumus() {
  return (
    <div className="max-w-full w-full py-10 px-2 sm:px-6 space-y-10">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100 text-left">Dokumentasi Rumus & Perhitungan Analytics</h1>
      <p className="mb-8 text-base text-gray-700 dark:text-gray-300 text-left">Halaman ini berisi dokumentasi lengkap semua rumus, bobot, dan logika perhitungan yang digunakan di seluruh fitur dashboard analytics. Setiap bagian dikelompokkan berdasarkan fitur/halaman utama.</p>

      {/* Agent Analytics */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Agent Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 text-left">
            <p>
              Fitur Agent Analytics menampilkan performa agent berdasarkan skor gabungan dari beberapa KPI utama. Semua perhitungan dan rumus yang digunakan dijelaskan di bawah ini.
            </p>
            <div>
              <div className="font-semibold mb-1 text-base">1. Scoring Agent (Skor Akhir Agent)</div>
              <ul className="list-disc pl-6 mb-2">
                <li>FCR (First Contact Resolution): 30%</li>
                <li>SLA (Service Level Agreement): 25%</li>
                <li>FRT (First Response Time): 15%</li>
                <li>ART (Average Resolution Time): 15%</li>
                <li>Backlog: 5%</li>
                <li>Ticket (Volume): 10%</li>
              </ul>
              <div className="mb-2">Rumus Skor Akhir:</div>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Score = FCR*0.3 + SLA*0.25 + FRT*0.15 + ART*0.15 + Backlog*0.05 + Ticket*0.10`}</pre>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">2. Normalisasi Nilai KPI</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>KPI Positif</b> (semakin tinggi semakin baik, misal FCR, SLA, Ticket):<br/>
                  <code>Skor = min((Aktual / Target) * 100, 120)</code>
                </li>
                <li><b>KPI Negatif</b> (semakin rendah semakin baik, misal FRT, ART):<br/>
                  <code>Skor = min((Target / Aktual) * 100, 120)</code>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">3. Perhitungan Satu Persatu KPI</div>
              <div className="space-y-4">
                <div>
                  <div className="font-semibold">a. FCR (First Contact Resolution)</div>
                  <ul className="list-disc pl-6 mb-1">
                    <li>Definisi: Persentase tiket yang selesai di kontak pertama (tidak ada follow-up).</li>
                    <li>Target: 75%</li>
                    <li>Rumus: <code>Skor FCR = min((FCR Aktual / 75) * 100, 120)</code></li>
                    <li>Contoh: Jika FCR aktual 70%, Skor = min((70/75)*100, 120) = 93.3</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold">b. SLA (Service Level Agreement)</div>
                  <ul className="list-disc pl-6 mb-1">
                    <li>Definisi: Persentase tiket yang direspon sesuai target waktu (≤ 15 menit).</li>
                    <li>Target: 85%</li>
                    <li>Rumus: <code>Skor SLA = min((SLA Aktual / 85) * 100, 120)</code></li>
                    <li>Contoh: Jika SLA aktual 69.8%, Skor = min((69.8/85)*100, 120) = 82.1</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold">c. FRT (First Response Time)</div>
                  <ul className="list-disc pl-6 mb-1">
                    <li>Definisi: Rata-rata waktu respon pertama (menit, semakin rendah semakin baik).</li>
                    <li>Target: 15 menit</li>
                    <li>Rumus: <code>Skor FRT = min((15 / FRT Aktual) * 100, 120)</code></li>
                    <li>Contoh: Jika FRT aktual 3000 menit, Skor = min((15/3000)*100, 120) = 0.5</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold">d. ART (Average Resolution Time)</div>
                  <ul className="list-disc pl-6 mb-1">
                    <li>Definisi: Rata-rata waktu penyelesaian tiket (menit, semakin rendah semakin baik).</li>
                    <li>Target: 30 menit</li>
                    <li>Rumus: <code>Skor ART = min((30 / ART Aktual) * 100, 120)</code></li>
                    <li>Contoh: Jika ART aktual 4440 menit, Skor = min((30/4440)*100, 120) = 0.7</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold">e. Backlog</div>
                  <ul className="list-disc pl-6 mb-1">
                    <li>Definisi: Jumlah tiket yang belum selesai.</li>
                    <li>Rumus:
                      <ul className="list-disc pl-6">
                        <li>Jika backlog = 0 → skor 100</li>
                        <li>Jika backlog ≤ 10 → skor = 100 - (backlog × 5)</li>
                        <li>Jika backlog &gt; 10 → skor 0</li>
                      </ul>
                    </li>
                    <li>Contoh: backlog = 0, skor = 100; backlog = 5, skor = 75; backlog = 12, skor = 0</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold">f. Ticket (Volume)</div>
                  <ul className="list-disc pl-6 mb-1">
                    <li>Definisi: Jumlah tiket yang ditangani agent dibanding agent lain.</li>
                    <li>Rumus: <code>Skor Ticket = min((Ticket Agent / Max Ticket Semua Agent) × 100, 120)</code></li>
                    <li>Contoh: agent menangani 814 tiket, agent dengan tiket terbanyak juga 814, Skor = min((814/814)*100, 120) = 100</li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">4. Ranking</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Agent diurutkan berdasarkan skor akhir tertinggi ke terendah.</li>
              </ul>
            </div>
          </div>
          <div className="mt-8">
            <div className="font-semibold mb-1 text-base">Breakdown Fitur & Komponen</div>
            <ul className="list-disc pl-6 mb-2">
              <li><b>Scoring & Ranking:</b> Leaderboard, card agent, badge ranking</li>
              <li><b>KPI Breakdown:</b> KPI grid, trend chart, statistik per agent</li>
              <li><b>Insight & Detail:</b> Insight box, modal detail agent, rekomendasi</li>
              <li><b>Progress & Highlight:</b> Progress bar, badge Most Improved, Fastest Responder, dsb</li>
            </ul>
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
              Fitur Ticket Analytics menganalisis statistik tiket, tren, dan kategori komplain untuk monitoring performa layanan dan workload operasional. Berikut dokumentasi lengkap semua rumus, logika, dan insight yang digunakan.
            </p>
            <div>
              <div className="font-semibold mb-1 text-base">1. SLA (Service Level Agreement)</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Definisi:</b> Persentase tiket yang direspon sesuai target waktu (≤ 15 menit).</li>
                <li><b>Rumus:</b></li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`SLA = (Jumlah tiket dengan response time ≤ 15 menit) / (Total tiket) × 100%`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin tinggi SLA, semakin baik performa respon tim.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">2. FRT (First Response Time)</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Definisi:</b> Rata-rata waktu respon pertama (dalam menit) untuk semua tiket.</li>
                <li><b>Rumus:</b></li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`FRT = (Total waktu respon pertama semua tiket) / (Jumlah tiket)`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin rendah FRT, semakin cepat tim merespon tiket.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">3. ART (Average Resolution Time)</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Definisi:</b> Rata-rata waktu penyelesaian tiket (dalam menit).</li>
                <li><b>Rumus:</b></li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`ART = (Total waktu penyelesaian semua tiket) / (Jumlah tiket)`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin rendah ART, semakin cepat tiket diselesaikan.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">4. Backlog</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Definisi:</b> Jumlah tiket yang belum selesai (status open).</li>
                <li><b>Rumus:</b></li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Backlog = Jumlah tiket dengan status open`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin kecil backlog, semakin baik pengelolaan tiket.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">5. Overdue</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Definisi:</b> Jumlah tiket yang melebihi batas waktu penyelesaian (&gt; 24 jam).</li>
                <li><b>Rumus:</b></li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Overdue = Jumlah tiket dengan durasi > 24 jam`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin kecil overdue, semakin baik SLA dan penyelesaian.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">6. Escalated</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Definisi:</b> Jumlah tiket yang mengalami eskalasi (ditangani lebih dari 1 agent/penanganan).</li>
                <li><b>Rumus:</b></li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Escalated = Jumlah tiket dengan lebih dari 1 penanganan`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin kecil angka eskalasi, semakin efektif penyelesaian di level pertama.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">7. Total Tickets, Closed, Open</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Total Tickets:</b> Jumlah seluruh tiket pada periode terpilih.</li>
                <li><b>Closed:</b> Jumlah tiket yang sudah selesai.</li>
                <li><b>Open:</b> Jumlah tiket yang masih terbuka.</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">8. Automated Insights</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Analisis otomatis untuk menemukan bulan tersibuk, kategori dominan, dan pola tren berdasarkan data agregat tiket.</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">Catatan Bobot</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Ticket Analytics tidak menggunakan bobot gabungan seperti Agent Analytics, namun setiap metrik di atas dapat digunakan sebagai indikator performa utama dan dapat diolah lebih lanjut untuk scoring atau dashboard summary.</li>
              </ul>
            </div>
          </div>
          <div className="mt-8">
            <div className="font-semibold mb-1 text-base">Breakdown Fitur & Komponen</div>
            <ul className="list-disc pl-6 mb-2">
              <li><b>Statistik Tiket:</b> Total Tickets, Closed, Open</li>
              <li><b>KPI & Monitoring:</b> SLA, FRT, ART, Backlog, Overdue, Escalated (card, badge, progress bar, trend chart)</li>
              <li><b>Automated Insights:</b> Box insight otomatis, highlight bulan tersibuk, kategori dominan</li>
              <li><b>Visualisasi & Export:</b> Grafik distribusi tiket, Export PDF/CSV</li>
            </ul>
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
              Fitur Customer Analytics / Kanban Board mengelompokkan pelanggan berdasarkan jumlah tiket dan analisis komplain, serta memberikan insight dan rekomendasi otomatis untuk perbaikan layanan. Berikut dokumentasi lengkap semua rumus, logika, dan insight yang digunakan.
            </p>
            <div>
              <div className="font-semibold mb-1 text-base">1. Klasifikasi Pelanggan</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Pelanggan dikelompokkan berdasarkan jumlah tiket yang dibuat dalam periode tertentu, menggunakan statistik distribusi (mean dan standar deviasi):</li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Normal:    jumlah tiket ≤ mean
Persisten: jumlah tiket ≤ mean + 1 stddev
Kronis:    jumlah tiket ≤ mean + 2 stddev
Ekstrem:   jumlah tiket > mean + 2 stddev`}</pre>
              <div className="mb-2"><b>Interpretasi:</b> Semakin tinggi kategori, semakin sering pelanggan mengalami masalah/komplain.</div>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">2. Analisis Komplain</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Analisis berdasarkan kategori, sub-kategori, dan kata kunci pada deskripsi tiket.</li>
                <li>Menghitung jumlah tiket per kategori/sub-kategori.</li>
                <li>Mencari kata kunci dominan pada deskripsi tiket.</li>
                <li>Mengidentifikasi pola masalah yang sering muncul.</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">3. Insight & Rekomendasi Otomatis</div>
              <ul className="list-disc pl-6 mb-2">
                <li><b>Insight:</b> Masalah paling sering muncul, penyebab utama, solusi yang paling sering berhasil.</li>
                <li><b>Rekomendasi:</b> Edukasi pelanggan, perbaikan SOP, deteksi dini untuk kategori masalah tertentu.</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">4. Contoh Rumus & Proses</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Menentukan kategori pelanggan:</li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Jika tiket_pelanggan ≤ mean: Kategori = Normal
Jika tiket_pelanggan ≤ mean + 1 stddev: Kategori = Persisten
Jika tiket_pelanggan ≤ mean + 2 stddev: Kategori = Kronis
Jika tiket_pelanggan > mean + 2 stddev: Kategori = Ekstrem`}</pre>
              <ul className="list-disc pl-6 mb-2">
                <li>Menemukan kategori dominan:</li>
              </ul>
              <pre className="bg-zinc-900 text-white rounded-lg p-4 text-xs overflow-x-auto mb-2">{`Kategori dominan = kategori dengan jumlah tiket terbanyak`}</pre>
            </div>
            <div>
              <div className="font-semibold mb-1 text-base">Catatan</div>
              <ul className="list-disc pl-6 mb-2">
                <li>Tidak ada bobot numerik seperti di Agent Analytics, namun setiap kategori dan insight digunakan untuk segmentasi pelanggan, prioritas penanganan, dan rekomendasi perbaikan layanan.</li>
              </ul>
            </div>
          </div>
          <div className="mt-8">
            <div className="font-semibold mb-1 text-base">Breakdown Fitur & Komponen</div>
            <ul className="list-disc pl-6 mb-2">
              <li><b>Klasifikasi Pelanggan:</b> Kanban Board, card pelanggan, badge kategori</li>
              <li><b>Analisis Komplain:</b> Statistik kategori, chart, word cloud, keyword analysis</li>
              <li><b>Insight & Rekomendasi:</b> Box insight otomatis, rekomendasi tindakan</li>
              <li><b>Detail Pelanggan:</b> Modal/detail view, riwayat tiket, tren komplain</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Summary Dashboard */}
      <Card className="w-full bg-white dark:bg-zinc-900 rounded-xl border shadow p-0">
        <CardHeader className="p-8 pb-2">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 text-left">Summary Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-2 space-y-6">
          <p className="text-base text-gray-700 dark:text-gray-300 text-left">Fitur ini menampilkan ringkasan performa agent dan layanan, seperti Top Agent, Fastest Responder, Best SLA, Most Reliable, dsb, berdasarkan hasil scoring dan statistik dari fitur lain.</p>
          <div>
            <ul className="list-disc pl-6 mb-2 text-gray-700 dark:text-gray-200 text-base">
              <li><b>Top Overall Agent:</b> Agent dengan skor tertinggi.</li>
              <li><b>Fastest Responder:</b> Agent dengan FRT terendah.</li>
              <li><b>Fastest Resolution:</b> Agent dengan ART terendah.</li>
              <li><b>Best SLA Performer:</b> Agent dengan SLA tertinggi.</li>
              <li><b>Most Reliable:</b> Agent dengan FCR tertinggi dan backlog 0.</li>
              <li><b>Most Improved Agent:</b> Agent dengan kenaikan skor terbesar.</li>
              <li><b>Most Engaged:</b> Agent dengan jumlah tiket terbanyak.</li>
            </ul>
          </div>
          <div className="text-base text-gray-700 dark:text-gray-300 text-left">Semua perhitungan diambil dari hasil scoring dan statistik di fitur Agent Analytics & Ticket Analytics.</div>
        </CardContent>
      </Card>
    </div>
  );
} 