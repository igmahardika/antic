import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CardHeaderTitle } from '@/components/ui/CardTypography';
import { CapacityMetrics } from '@/lib/api';
import { TrendingUp, Users, AlertTriangle } from 'lucide-react';

interface CapacityGaugeProps {
    metrics: CapacityMetrics;
}

export const CapacityGauge: React.FC<CapacityGaugeProps> = ({ metrics }) => {
    const { utilization_pct, status, current_tickets, total_max_concurrent, remaining_capacity } = metrics;

    // Determine color based on status
    const getStatusColor = () => {
        switch (status) {
            case 'healthy':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'near_capacity':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'overloaded':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'healthy':
                return <TrendingUp className="w-5 h-5" />;
            case 'near_capacity':
                return <AlertTriangle className="w-5 h-5" />;
            case 'overloaded':
                return <AlertTriangle className="w-5 h-5" />;
            default:
                return <Users className="w-5 h-5" />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'healthy':
                return 'Healthy';
            case 'near_capacity':
                return 'Near Capacity';
            case 'overloaded':
                return 'Overloaded';
            default:
                return 'Unknown';
        }
    };

    // Calculate circle progress
    const normalizedUtilization = Math.min(utilization_pct, 100);
    const circumference = 2 * Math.PI * 70; // radius = 70
    const strokeDashoffset = circumference - (normalizedUtilization / 100) * circumference;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardHeaderTitle>Team Capacity</CardHeaderTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                {/* Circular Gauge */}
                <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                        {/* Background circle */}
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="80"
                            cy="80"
                            r="70"
                            fill="none"
                            stroke={status === 'healthy' ? '#10b981' : status === 'near_capacity' ? '#f59e0b' : '#ef4444'}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-gray-900">
                            {utilization_pct.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Utilization</div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={`mt-4 px-4 py-2 rounded-lg border flex items-center gap-2 ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="font-semibold text-sm">{getStatusText()}</span>
                </div>

                {/* Metrics */}
                <div className="w-full mt-6 grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{current_tickets}</div>
                        <div className="text-xs text-gray-500 mt-1">Current Tickets</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{remaining_capacity}</div>
                        <div className="text-xs text-gray-500 mt-1">Remaining Capacity</div>
                    </div>
                </div>

                <div className="w-full mt-2 text-center">
                    <div className="text-xs text-gray-500">
                        Max Capacity: <span className="font-semibold text-gray-700">{total_max_concurrent}</span> tickets
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
