import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import { ForecastData } from '@/lib/api';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface WorkloadForecastProps {
    forecast: ForecastData[];
    historical: Array<{ date: string; count: number }>;
}

export const WorkloadForecast: React.FC<WorkloadForecastProps> = ({ forecast, historical }) => {
    // Combine historical and forecast data for the chart
    const chartData = [
        ...historical.slice(-7).map((h) => ({
            date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            actual: h.count,
            predicted: null,
            confidence_low: null,
            confidence_high: null,
        })),
        ...forecast.map((f) => ({
            date: new Date(f.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            actual: null,
            predicted: f.predicted_count,
            confidence_low: f.confidence_low,
            confidence_high: f.confidence_high,
        })),
    ];

    // Calculate trend
    const avgHistorical = historical.slice(-7).reduce((sum, h) => sum + h.count, 0) / Math.min(7, historical.length);
    const avgForecast = forecast.reduce((sum, f) => sum + f.predicted_count, 0) / forecast.length;
    const trendPct = ((avgForecast - avgHistorical) / avgHistorical) * 100;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardHeaderTitle>Workload Forecast</CardHeaderTitle>
                <CardHeaderDescription>
                    Predicted ticket volume for next {forecast.length} days
                </CardHeaderDescription>
            </CardHeader>
            <CardContent>
                {/* Trend Indicator */}
                <div className="flex items-center gap-2 mb-4">
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${trendPct > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        <TrendingUp className={`w-4 h-4 ${trendPct < 0 ? 'transform rotate-180' : ''}`} />
                        <span className="text-sm font-semibold">
                            {trendPct > 0 ? '+' : ''}{trendPct.toFixed(1)}%
                        </span>
                    </div>
                    <span className="text-xs text-gray-500">vs. last 7 days average</span>
                </div>

                {/* Chart */}
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '12px'
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />

                        {/* Confidence band */}
                        <Area
                            type="monotone"
                            dataKey="confidence_high"
                            fill="#3b82f6"
                            fillOpacity={0.1}
                            stroke="none"
                        />
                        <Area
                            type="monotone"
                            dataKey="confidence_low"
                            fill="#ffffff"
                            fillOpacity={1}
                            stroke="none"
                        />

                        {/* Actual data */}
                        <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Actual"
                        />

                        {/* Predicted data */}
                        <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 4 }}
                            name="Forecast"
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Summary */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-500">Avg Forecast</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">{avgForecast.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">tickets/day</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-500">7-Day Avg</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">{avgHistorical.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">tickets/day</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
