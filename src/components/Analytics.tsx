
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
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  // Enhanced stats with modern icons
  const stats = [
    { 
      title: 'Total Tiket', 
      value: '1,234', 
      icon: CheckCircle, 
      change: '+12%', 
      trend: 'up',
      description: 'dari bulan lalu'
    },
    { 
      title: 'Durasi Rata-rata', 
      value: '2.3h', 
      icon: Clock, 
      change: '-5%', 
      trend: 'down',
      description: 'waktu penyelesaian'
    },
    { 
      title: 'Tiket Tertutup', 
      value: '1,156', 
      icon: CheckCircle, 
      change: '+8%', 
      trend: 'up',
      description: 'tingkat penyelesaian'
    },
    { 
      title: 'Agent Aktif', 
      value: '12', 
      icon: Users, 
      change: '+2', 
      trend: 'up',
      description: 'sedang bertugas'
    },
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
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const agentDurationData = {
    labels: ['Agent Smith', 'Agent Johnson', 'Agent Brown', 'Agent Wilson', 'Agent Davis'],
    datasets: [
      {
        label: 'Durasi Rata-rata (jam)',
        data: [2.5, 1.8, 3.2, 2.1, 2.8],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const monthlyStatsData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Tiket Masuk',
        data: [65, 59, 80, 81, 56, 85],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
      {
        label: 'Tiket Selesai',
        data: [60, 55, 75, 78, 52, 82],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Dashboard Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
          Ringkasan statistik dan analisis performa tiket customer service dalam satu tampilan yang komprehensif
        </p>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <div className="flex items-center space-x-1">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500">{stat.description}</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Komplain Terbanyak */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Komplain Terbanyak</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={complaintsData} options={chartOptions} />
          </CardContent>
        </Card>

        {/* Durasi Agent */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-500" />
              <span>Performa Agent</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={agentDurationData} options={chartOptions} />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Statistics */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span>Trend Bulanan</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Line data={monthlyStatsData} options={chartOptions} />
        </CardContent>
      </Card>

      {/* Enhanced Summary Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Ringkasan Detail Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Kategori</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Total Tiket</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Durasi Rata-rata</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Prioritas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { category: 'Technical', total: 120, avgDuration: '2.5h', priority: 'High', color: 'red' },
                  { category: 'Billing', total: 89, avgDuration: '1.8h', priority: 'Medium', color: 'yellow' },
                  { category: 'Support', total: 67, avgDuration: '3.2h', priority: 'Medium', color: 'yellow' },
                  { category: 'Authentication', total: 45, avgDuration: '1.5h', priority: 'Low', color: 'green' },
                ].map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                      {row.category}
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                      {row.total}
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300">
                      {row.avgDuration}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        row.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        row.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {row.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
