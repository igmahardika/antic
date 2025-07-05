import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend as RechartsLegend, Tooltip as RechartsTooltip } from 'recharts';

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

  // Helper: convert chart.js-like data to recharts format
  function toRechartsData(labels: string[], datasets: any[]) {
    // Assume 2 datasets: [incoming, closed]
    return labels.map((label, i) => ({
      label,
      incoming: datasets[0]?.data[i] ?? 0,
      closed: datasets[1]?.data[i] ?? 0,
    }));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Monthly Area Chart */}
      <Card className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl border p-2">
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
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={toRechartsData(filteredMonthlyStatsData.labels, filteredMonthlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncoming)" name="Incoming Tickets" strokeWidth={3} />
                <Area type="monotone" dataKey="closed" stroke="#22C55E" fill="url(#colorClosed)" name="Closed Tickets" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No data for this chart</div>
          )}
        </CardContent>
      </Card>
      {/* Yearly Area Chart */}
      <Card className="bg-white dark:bg-zinc-900 shadow-lg rounded-xl border p-2">
        <CardHeader className="flex flex-col gap-1 pb-1">
          <CardTitle className="font-extrabold text-xl text-zinc-900 dark:text-zinc-100">Tickets per Year</CardTitle>
          {latestYearlyValue !== null && (
            <Badge className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full w-fit font-semibold shadow-md">Latest: {latestYearlyValue}</Badge>
          )}
        </CardHeader>
        <CardContent className="pl-2">
          {yearlyStatsData && yearlyStatsData.labels && yearlyStatsData.labels.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={toRechartsData(yearlyStatsData.labels, yearlyStatsData.datasets)} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncomingY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorClosedY" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <RechartsLegend />
                <Area type="monotone" dataKey="incoming" stroke="#6366F1" fill="url(#colorIncomingY)" name="Incoming Tickets" strokeWidth={3} />
                <Area type="monotone" dataKey="closed" stroke="#22C55E" fill="url(#colorClosedY)" name="Closed Tickets" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-12">No data for this chart</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryDashboard; 