import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const SummaryDashboard = ({ ticketAnalyticsData }: any) => {
  // Prepare monthly data
  const monthlyStatsData = ticketAnalyticsData?.monthlyStatsData;

  // Extract all years from monthlyStatsData.labels
  const allYears: string[] = useMemo(() => {
    if (!monthlyStatsData || !monthlyStatsData.labels) return [];
    const years = new Set<string>();
    monthlyStatsData.labels.forEach(label => {
      const year = label.split(' ').pop();
      if (year) years.add(year);
    });
    return Array.from(years).sort();
  }, [monthlyStatsData]);

  // State for selected year (default: last year in data)
  const [selectedYear, setSelectedYear] = useState(() => {
    if (allYears.length > 0) return allYears[allYears.length - 1];
    return '';
  });

  // Update selectedYear if allYears changes
  React.useEffect(() => {
    if (allYears.length > 0 && !allYears.includes(selectedYear)) {
      setSelectedYear(allYears[allYears.length - 1]);
    }
  }, [allYears, selectedYear]);

  // Filter monthly data for selected year
  const filteredMonthlyStatsData = useMemo(() => {
    if (!monthlyStatsData || !monthlyStatsData.labels || !selectedYear) return null;
    // Find indices for selected year
    const indices = monthlyStatsData.labels
      .map((label, idx) => (label.endsWith(selectedYear) ? idx : -1))
      .filter(idx => idx !== -1);
    if (indices.length === 0) return null;
    return {
      labels: indices.map(idx => monthlyStatsData.labels[idx].replace(' ' + selectedYear, '')),
      datasets: monthlyStatsData.datasets.map(ds => ({
        ...ds,
        data: indices.map(idx => ds.data[idx]),
        fill: true,
        backgroundColor: ds.backgroundColor,
        borderColor: ds.borderColor,
        label: ds.label,
      })),
    };
  }, [monthlyStatsData, selectedYear]);

  // Prepare yearly data by aggregating monthlyStatsData
  const yearlyStatsData = useMemo(() => {
    if (!monthlyStatsData || !monthlyStatsData.labels || !monthlyStatsData.datasets) return null;
    // Extract year from each label (format: 'Month YYYY')
    const yearMap = {};
    monthlyStatsData.labels.forEach((label, idx) => {
      const year = label.split(' ').pop();
      if (!yearMap[year]) yearMap[year] = [];
      yearMap[year].push(idx);
    });
    const years = Object.keys(yearMap).sort();
    const datasets = monthlyStatsData.datasets.map(ds => ({
      ...ds,
      data: years.map(year => yearMap[year].reduce((sum, idx) => sum + (ds.data[idx] || 0), 0)),
      backgroundColor: ds.backgroundColor,
      borderColor: ds.borderColor,
      label: ds.label,
    }));
    return {
      labels: years,
      datasets,
    };
  }, [monthlyStatsData]);

  // Get latest value for badge display
  const latestMonthlyValue = useMemo(() => {
    if (!filteredMonthlyStatsData || !filteredMonthlyStatsData.datasets || filteredMonthlyStatsData.datasets.length === 0) return null;
    const ds = filteredMonthlyStatsData.datasets[0];
    const lastIdx = ds.data.length - 1;
    return typeof ds.data[lastIdx] === 'number' ? ds.data[lastIdx] : null;
  }, [filteredMonthlyStatsData]);
  const latestYearlyValue = useMemo(() => {
    if (!yearlyStatsData || !yearlyStatsData.datasets || yearlyStatsData.datasets.length === 0) return null;
    const ds = yearlyStatsData.datasets[0];
    const lastIdx = ds.data.length - 1;
    return typeof ds.data[lastIdx] === 'number' ? ds.data[lastIdx] : null;
  }, [yearlyStatsData]);

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Summary Trendlines</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Monthly Trendline by Year */}
        <Card className="bg-white/90 dark:bg-zinc-900/80 shadow-lg rounded-xl border p-2">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-1">
            <div className="flex flex-col gap-1">
              <CardTitle className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">Tickets per Month</CardTitle>
              {latestMonthlyValue !== null && (
                <Badge className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-semibold shadow-md">Latest: {latestMonthlyValue}</Badge>
              )}
            </div>
            <div className="mt-2 md:mt-0">
              <select
                className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedYear as string}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {allYears.map(year => (
                  <option key={year as string} value={year as string}>{year as string}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="pl-2">
            {filteredMonthlyStatsData && filteredMonthlyStatsData.labels && filteredMonthlyStatsData.labels.length > 0 ? (
              <Line
                data={{
                  ...filteredMonthlyStatsData,
                  datasets: filteredMonthlyStatsData.datasets.map((ds, i) => ({
                    ...ds,
                    fill: true,
                    backgroundColor: i === 0 ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.10)',
                    borderColor: i === 0 ? '#6366F1' : '#22C55E',
                    pointBackgroundColor: i === 0 ? '#6366F1' : '#22C55E',
                    pointRadius: 0,
                    borderWidth: 3,
                    tension: 0.5,
                    pointHoverRadius: 0,
                    pointBorderWidth: 2,
                  })),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        font: { size: 15, family: 'Inter, sans-serif', weight: 'bold' },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#6366F1',
                        padding: 18,
                        boxWidth: 16,
                        boxHeight: 16,
                        borderRadius: 8,
                      },
                    },
                    tooltip: {
                      backgroundColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#1e293b' : '#fff',
                      titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                      bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                      borderColor: '#6366F1',
                      borderWidth: 1,
                      padding: 14,
                      displayColors: true,
                      cornerRadius: 10,
                      caretSize: 8,
                      titleFont: { weight: 'bold', size: 15, family: 'Inter, sans-serif' },
                      bodyFont: { size: 14, family: 'Inter, sans-serif' },
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
                      },
                    },
                    datalabels: {
                      display: true,
                      align: 'top',
                      anchor: 'end',
                      font: { weight: 'bold', family: 'Poppins, Arial, sans-serif' },
                      color: '#6366F1',
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderRadius: 4,
                      padding: 4,
                      formatter: Math.round,
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: '#F3F4F6' },
                      ticks: { color: '#6B7280', font: { size: 13, family: 'Inter, sans-serif' } },
                    },
                    y: {
                      grid: { color: '#F3F4F6' },
                      ticks: { color: '#6B7280', font: { size: 13, family: 'Inter, sans-serif' } },
                      beginAtZero: true,
                    },
                  },
                  animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                  },
                }}
                height={260}
                aria-label="Tickets per Month Trendline"
              />
            ) : (
              <div className="text-center text-gray-400 py-12">No data for this chart</div>
            )}
          </CardContent>
        </Card>
        {/* Yearly Trendline */}
        <Card className="bg-white/90 dark:bg-zinc-900/80 shadow-lg rounded-xl border p-2">
          <CardHeader className="flex flex-col gap-1 pb-1">
            <CardTitle className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">Tickets per Year</CardTitle>
            {latestYearlyValue !== null && (
              <Badge className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-semibold shadow-md">Latest: {latestYearlyValue}</Badge>
            )}
          </CardHeader>
          <CardContent className="pl-2">
            {yearlyStatsData && yearlyStatsData.labels && yearlyStatsData.labels.length > 0 ? (
              <Line
                data={{
                  ...yearlyStatsData,
                  datasets: yearlyStatsData.datasets.map((ds, i) => ({
                    ...ds,
                    fill: true,
                    backgroundColor: i === 0 ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.10)',
                    borderColor: i === 0 ? '#6366F1' : '#22C55E',
                    pointBackgroundColor: i === 0 ? '#6366F1' : '#22C55E',
                    pointRadius: 0,
                    borderWidth: 3,
                    tension: 0.45,
                    pointHoverRadius: 0,
                    pointBorderWidth: 2,
                    shadowOffsetX: 2,
                    shadowOffsetY: 2,
                    shadowBlur: 8,
                    shadowColor: 'rgba(99,102,241,0.15)',
                  })),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        font: { size: 13, family: 'Inter, sans-serif' },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        color: '#6366F1',
                        padding: 18,
                        boxWidth: 16,
                        boxHeight: 16,
                        borderRadius: 8,
                      },
                    },
                    tooltip: {
                      backgroundColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#1e293b' : '#fff',
                      titleColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#fff' : '#1e293b',
                      bodyColor: (ctx) => ctx.chart.canvas.classList.contains('dark') ? '#e5e7eb' : '#334155',
                      borderColor: '#6366F1',
                      borderWidth: 1,
                      padding: 14,
                      displayColors: true,
                      cornerRadius: 10,
                      caretSize: 8,
                      titleFont: { weight: 'bold', size: 15, family: 'Inter, sans-serif' },
                      bodyFont: { size: 14, family: 'Inter, sans-serif' },
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
                      },
                    },
                    datalabels: {
                      display: true,
                      align: 'top',
                      anchor: 'end',
                      font: { weight: 'bold', family: 'Poppins, Arial, sans-serif' },
                      color: '#6366F1',
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      borderRadius: 4,
                      padding: 4,
                      formatter: Math.round,
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: '#F3F4F6' },
                      ticks: { color: '#6B7280', font: { size: 13, family: 'Inter, sans-serif' } },
                    },
                    y: {
                      grid: { color: '#F3F4F6' },
                      ticks: { color: '#6B7280', font: { size: 13, family: 'Inter, sans-serif' } },
                      beginAtZero: true,
                    },
                  },
                  animation: {
                    duration: 900,
                    easing: 'easeInOutQuart',
                  },
                }}
                height={260}
              />
            ) : (
              <div className="text-center text-gray-400 py-12">No data for this chart</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default SummaryDashboard; 