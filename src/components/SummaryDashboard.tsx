import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useDataStore from '@/store/dataStore';
import { processSummaryData } from '@/lib/dataProcessing';
import FilterWaktu from './FilterWaktu';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ChartDataLabels);

const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: '#fff',
            titleColor: '#1e293b',
            bodyColor: '#334155',
            padding: 12,
            cornerRadius: 8,
        },
        datalabels: {
            display: true,
            align: 'top',
            anchor: 'end',
            font: { weight: 'bold' },
            color: '#6366F1',
            formatter: Math.round,
        },
    },
    scales: {
        x: { ticks: { color: '#6B7280' } },
        y: { ticks: { color: '#6B7280' }, beginAtZero: true },
    },
    tension: 0.4,
};

const SummaryDashboard = () => {
    const { pathname } = useLocation();
    const { isLoading, allTickets, getFilteredTickets, filters, setFilter } = useDataStore();
    const filteredTickets = getFilteredTickets(pathname);
    const analyticsData = useMemo(() => processSummaryData(filteredTickets), [filteredTickets]);
    const allYearsInData = useMemo(() => {
        if (!allTickets) return [];
        const yearSet = new Set<string>();
        allTickets.forEach(t => {
            if (t.openTime) yearSet.add(String(new Date(t.openTime).getFullYear()));
        });
        return Array.from(yearSet).sort((a,b) => Number(b) - Number(a));
    }, [allTickets]);

    if (isLoading) return <div>Loading Summary...</div>;
    if (!analyticsData) return <p>No data for the selected period.</p>;

    const { monthlyStatsData, yearlyStatsData } = analyticsData;
    
    const getLatestValue = (data: any) => {
        if (!data || !data.datasets || data.datasets.length === 0) return null;
        const lastIdx = data.datasets[0].data.length - 1;
        return data.datasets[0].data[lastIdx];
    }
    const latestMonthlyValue = getLatestValue(monthlyStatsData);
    const latestYearlyValue = getLatestValue(yearlyStatsData);
    
    const formatChartData = (data: any) => {
        if (!data) return data;
        return {
            ...data,
            datasets: data.datasets.map((ds: any, i: number) => ({
                ...ds,
                fill: true,
                backgroundColor: i === 0 ? 'rgba(99,102,241,0.1)' : 'rgba(34,197,94,0.1)',
                borderColor: i === 0 ? '#6366F1' : '#22C55E',
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: i === 0 ? '#6366F1' : '#22C55E',
            })),
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Summary Dashboard</h1>
            <FilterWaktu
                filters={filters[pathname] || { startMonth: null, endMonth: null, year: null }}
                setFilters={(newFilters) => setFilter(pathname, newFilters)}
                allYearsInData={allYearsInData}
                onRefresh={() => { }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-white/90 dark:bg-zinc-900/80 shadow-lg rounded-xl border p-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="font-extrabold text-xl">Tickets per Month</CardTitle>
                        {latestMonthlyValue !== null && (
                            <Badge className="bg-blue-600 text-white shadow-md">Latest: {latestMonthlyValue}</Badge>
                        )}
                    </CardHeader>
                    <CardContent className="pl-2">
                        {monthlyStatsData && monthlyStatsData.labels.length > 0 ? (
                            <Line data={formatChartData(monthlyStatsData)} options={chartOptions} height={260} />
                        ) : (
                            <div className="text-center text-gray-400 py-12">No monthly data available.</div>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-white/90 dark:bg-zinc-900/80 shadow-lg rounded-xl border p-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="font-extrabold text-xl">Tickets per Year</CardTitle>
                        {latestYearlyValue !== null && (
                            <Badge className="bg-green-600 text-white shadow-md">Latest: {latestYearlyValue}</Badge>
                        )}
                    </CardHeader>
                    <CardContent className="pl-2">
                        {yearlyStatsData && yearlyStatsData.labels.length > 0 ? (
                            <Line data={formatChartData(yearlyStatsData)} options={chartOptions} height={260} />
                        ) : (
                            <div className="text-center text-gray-400 py-12">No yearly data available.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SummaryDashboard;