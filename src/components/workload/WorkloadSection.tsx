import React, { useEffect, useState } from 'react';
import { CapacityGauge, QueueMetrics, WorkloadForecast, ComplexityDistribution } from '@/components/workload';
import { workloadAPI, CapacityMetrics, QueueMetrics as QueueMetricsType, ForecastData, ComplexityAnalysis } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

export const WorkloadSection: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [capacityMetrics, setCapacityMetrics] = useState<CapacityMetrics | null>(null);
    const [queueMetrics, setQueueMetrics] = useState<QueueMetricsType | null>(null);
    const [forecast, setForecast] = useState<{ forecast: ForecastData[]; historical: Array<{ date: string; count: number }> } | null>(null);
    const [complexity, setComplexity] = useState<ComplexityAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadWorkloadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Load all workload metrics in parallel
                const [capacityData, queueData, forecastData, complexityData] = await Promise.all([
                    workloadAPI.getCapacityMetrics(),
                    workloadAPI.getQueueMetrics(),
                    workloadAPI.getForecast(7),
                    workloadAPI.getComplexityAnalysis(),
                ]);

                setCapacityMetrics(capacityData);
                setQueueMetrics(queueData);
                setForecast(forecastData);
                setComplexity(complexityData);
            } catch (err) {
                logger.error('Failed to load workload data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load workload data');
            } finally {
                setLoading(false);
            }
        };

        loadWorkloadData();
    }, []);

    if (loading) {
        return (
            <Card className="mt-6">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading workload metrics...</span>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="mt-6 border-red-200 bg-red-50">
                <CardContent className="py-6">
                    <p className="text-red-600 text-center">⚠️ {error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="mt-8 space-y-6">
            {/* Section Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Workload Analytics</h2>
                <p className="text-sm text-gray-500 mt-1">Team capacity, queue metrics, and workload forecasting</p>
            </div>

            {/* First Row: Capacity & Queue Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {capacityMetrics && <CapacityGauge metrics={capacityMetrics} />}
                {queueMetrics && <QueueMetrics metrics={queueMetrics} />}
            </div>

            {/* Second Row: Forecast & Complexity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {forecast && <WorkloadForecast forecast={forecast.forecast} historical={forecast.historical} />}
                {complexity && <ComplexityDistribution analysis={complexity} />}
            </div>
        </div>
    );
};
