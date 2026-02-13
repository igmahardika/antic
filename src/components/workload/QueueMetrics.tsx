import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import { QueueMetrics as QueueMetricsType } from '@/lib/api';
import { Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface QueueMetricsProps {
    metrics: QueueMetricsType;
}

export const QueueMetrics: React.FC<QueueMetricsProps> = ({ metrics }) => {
    const { total_in_queue, avg_wait_time, queue_velocity, aging_breakdown, resolved_last_24h } = metrics;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardHeaderTitle>Queue Metrics</CardHeaderTitle>
                <CardHeaderDescription>Real-time queue analysis</CardHeaderDescription>
            </CardHeader>
            <CardContent>
                {/* Main Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <div className="text-xs text-blue-600 font-medium">In Queue</div>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{total_in_queue}</div>
                        <div className="text-xs text-blue-600 mt-1">tickets waiting</div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <div className="text-xs text-green-600 font-medium">Velocity</div>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{queue_velocity.toFixed(1)}</div>
                        <div className="text-xs text-green-600 mt-1">tickets/hour</div>
                    </div>
                </div>

                {/* Average Wait Time */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Avg Wait Time</span>
                        <span className="text-lg font-bold text-gray-900">{avg_wait_time.toFixed(1)}h</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${avg_wait_time > 4 ? 'bg-red-500' : avg_wait_time > 2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((avg_wait_time / 8) * 100, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Aging Breakdown */}
                <div>
                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Queue Aging
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-gray-600">Fresh (&lt; 4h)</span>
                            </div>
                            <span className="font-semibold text-gray-900">{aging_breakdown.fresh}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <span className="text-gray-600">Aging (4-24h)</span>
                            </div>
                            <span className="font-semibold text-gray-900">{aging_breakdown.aging}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-gray-600">Old (24-48h)</span>
                            </div>
                            <span className="font-semibold text-gray-900">{aging_breakdown.old}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-gray-600">Critical (&gt; 48h)</span>
                            </div>
                            <span className="font-semibold text-gray-900">{aging_breakdown.critical}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="text-center">
                        <div className="text-xs text-gray-500">Resolved Last 24h</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{resolved_last_24h}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
