import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardHeaderTitle } from "@/components/ui/CardTypography";
import { TimeFilter as TimeFilterType } from "@/utils/workloadUtils";

interface WorkloadTabsProps {
    onTabChange: (tab: 'tickets' | 'incidents') => void;
    children: React.ReactNode;
}

export function WorkloadTabs({ onTabChange, children }: WorkloadTabsProps) {
    return (
        <Tabs defaultValue="tickets" onValueChange={(v) => onTabChange(v as 'tickets' | 'incidents')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="tickets">Ticket Workload</TabsTrigger>
                <TabsTrigger value="incidents">Incident Workload</TabsTrigger>
            </TabsList>
            {children}
        </Tabs>
    );
}

interface WorkloadFiltersProps {
    timeFilter: TimeFilterType;
    onTimeFilterChange: (filter: TimeFilterType) => void;
    availableYears: number[];
}

export function WorkloadFilters({
    timeFilter,
    onTimeFilterChange,
    availableYears,
}: WorkloadFiltersProps) {
    const [startMonth, setStartMonth] = useState(timeFilter.startMonth || 1);
    const [endMonth, setEndMonth] = useState(timeFilter.endMonth || 12);
    const [selectedYear, setSelectedYear] = useState<number | 'all'>(
        timeFilter.year || new Date().getFullYear()
    );
    const [filterType, setFilterType] = useState<'month-range' | 'year' | 'all-years'>(
        timeFilter.type || 'year'
    );

    const handleApply = () => {
        if (filterType === 'all-years') {
            onTimeFilterChange({ type: 'all-years' });
        } else if (filterType === 'year') {
            onTimeFilterChange({ type: 'year', year: selectedYear });
        } else {
            onTimeFilterChange({
                type: 'month-range',
                startMonth,
                endMonth,
                year: selectedYear,
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardHeaderTitle>Time Filters</CardHeaderTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Filter Type Selector */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">Filter Type</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="year">Year</option>
                            <option value="month-range">Month Range</option>
                            <option value="all-years">All Years</option>
                        </select>
                    </div>

                    {/* Year Selector */}
                    {filterType !== 'all-years' && (
                        <div>
                            <label className="text-sm font-medium mb-2 block">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="w-full p-2 border rounded"
                            >
                                <option value="all">All Years</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Month Range Selectors */}
                    {filterType === 'month-range' && (
                        <>
                            <div>
                                <label className="text-sm font-medium mb-2 block">From Month</label>
                                <select
                                    value={startMonth}
                                    onChange={(e) => setStartMonth(Number(e.target.value))}
                                    className="w-full p-2 border rounded"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">To Month</label>
                                <select
                                    value={endMonth}
                                    onChange={(e) => setEndMonth(Number(e.target.value))}
                                    className="w-full p-2 border rounded"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={handleApply}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Apply Filters
                </button>
            </CardContent>
        </Card >
    );
}
