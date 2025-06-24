
import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  // Sample analytics data
  const stats = [
    { title: 'Total Tiket', value: '1,234', icon: '📊', change: '+12%' },
    { title: 'Durasi Rata-rata', value: '2.3h', icon: '⏱️', change: '-5%' },
    { title: 'Tiket Tertutup', value: '1,156', icon: '✅', change: '+8%' },
    { title: 'Komplain Terbanyak', value: 'Technical', icon: '⚠️', change: '+15%' },
  ];

  // Data komplain terbanyak
  const complaintsData = {
    labels: ['Technical', 'Billing', 'Support', 'Authentication', 'Performance'],
    datasets: [
      {
        label: 'Jumlah Komplain',
        data: [120, 89, 67, 45, 32],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(139, 92, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Data durasi agent
  const agentDurationData = {
    labels: ['Agent Smith', 'Agent Johnson', 'Agent Brown', 'Agent Wilson', 'Agent Davis'],
    datasets: [
      {
        label: 'Durasi Rata-rata (jam)',
        data: [2.5, 1.8, 3.2, 2.1, 2.8],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Data statistik bulanan
  const monthlyStatsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Tiket Masuk',
        data: [65, 59, 80, 81, 56, 85],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
      },
      {
        label: 'Tiket Selesai',
        data: [60, 55, 75, 78, 52, 82],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Ringkasan statistik dan analisis performa tiket
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change} dari bulan lalu
                </p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Komplain Terbanyak */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Komplain Terbanyak
          </h3>
          <Bar
            data={complaintsData}
            options={chartOptions}
            aria-label="Chart showing most frequent complaints"
          />
        </div>

        {/* Durasi Agent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Durasi Rata-rata per Agent
          </h3>
          <Bar
            data={agentDurationData}
            options={chartOptions}
            aria-label="Chart showing average duration by agent"
          />
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Statistik Bulanan
        </h3>
        <Line
          data={monthlyStatsData}
          options={lineChartOptions}
          aria-label="Chart showing monthly ticket statistics"
        />
      </div>

      {/* Detail Summary Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ringkasan Detail
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Tiket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Durasi Rata-rata
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { category: 'Technical', total: 120, avgDuration: '2.5h', status: 'High' },
                { category: 'Billing', total: 89, avgDuration: '1.8h', status: 'Medium' },
                { category: 'Support', total: 67, avgDuration: '3.2h', status: 'Medium' },
                { category: 'Authentication', total: 45, avgDuration: '1.5h', status: 'Low' },
              ].map((row, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {row.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {row.avgDuration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      row.status === 'High' ? 'bg-red-100 text-red-800' :
                      row.status === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
