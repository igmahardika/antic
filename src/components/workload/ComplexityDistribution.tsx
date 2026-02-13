import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import { ComplexityAnalysis } from '@/lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';

interface ComplexityDistributionProps {
    analysis: ComplexityAnalysis;
}

export const ComplexityDistribution: React.FC<ComplexityDistributionProps> = ({ analysis }) => {
    const { avg_complexity, distribution, total_analyzed } = analysis;

    // Prepare data for pie chart
    const chartData = [
        { name: 'Simple', value: distribution.simple, color: '#10b981' },
        { name: 'Medium', value: distribution.medium, color: '#f59e0b' },
        { name: 'Complex', value: distribution.complex, color: '#ef4444' },
    ];

    // Calculate percentages
    const getPercentage = (value: number) => {
        if (total_analyzed === 0) return 0;
        return ((value / total_analyzed) * 100).toFixed(1);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardHeaderTitle>Complexity Distribution</CardHeaderTitle>
                <CardHeaderDescription>Ticket complexity breakdown</CardHeaderDescription>
            </CardHeader>
            <CardContent>
                {/* Average Complexity Score */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Average Complexity</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900">{avg_complexity.toFixed(2)}</div>
                    <div className="text-xs text-blue-600 mt-1">
                        {avg_complexity < 1.5 ? 'Low complexity' : avg_complexity < 2.5 ? 'Moderate complexity' : 'High complexity'}
                    </div>
                </div>

                {/* Pie Chart */}
                {total_analyzed > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-gray-400">
                        <p className="text-sm">No complexity data available</p>
                    </div>
                )}

                {/* Distribution Details */}
                <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium text-green-900">Simple</span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-green-900">{distribution.simple}</div>
                            <div className="text-xs text-green-600">{getPercentage(distribution.simple)}%</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <span className="text-sm font-medium text-yellow-900">Medium</span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-yellow-900">{distribution.medium}</div>
                            <div className="text-xs text-yellow-600">{getPercentage(distribution.medium)}%</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm font-medium text-red-900">Complex</span>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-red-900">{distribution.complex}</div>
                            <div className="text-xs text-red-600">{getPercentage(distribution.complex)}%</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                    <div className="text-xs text-gray-500">Total Analyzed</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{total_analyzed}</div>
                </div>
            </CardContent>
        </Card>
    );
};
