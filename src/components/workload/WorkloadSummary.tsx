import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardHeaderTitle } from "@/components/ui/CardTypography";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BarChartIcon from "@mui/icons-material/BarChart";

interface WorkloadSummaryProps {
    totalItems: number;
    openItems: number;
    closedItems: number;
    avgMetric: number;
    avgMetricLabel: string;
    itemType: 'Tickets' | 'Incidents';
}

export function WorkloadSummary({
    totalItems,
    openItems,
    closedItems,
    avgMetric,
    avgMetricLabel,
    itemType,
}: WorkloadSummaryProps) {
    const closureRate = totalItems > 0 ? ((closedItems / totalItems) * 100).toFixed(1) : '0.0';

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardHeaderTitle className="text-sm font-medium">Total {itemType}</CardHeaderTitle>
                    <AssignmentIcon sx={{ fontSize: 20 }} className="text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardHeaderTitle className="text-sm font-medium">Open</CardHeaderTitle>
                    <TrendingUpIcon sx={{ fontSize: 20 }} className="text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{openItems.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Currently active</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardHeaderTitle className="text-sm font-medium">Closed</CardHeaderTitle>
                    <CheckCircleIcon sx={{ fontSize: 20 }} className="text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{closedItems.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{closureRate}% closure rate</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardHeaderTitle className="text-sm font-medium">{avgMetricLabel}</CardHeaderTitle>
                    <BarChartIcon sx={{ fontSize: 20 }} className="text-purple-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{avgMetric.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">Average</p>
                </CardContent>
            </Card>
        </div>
    );
}
