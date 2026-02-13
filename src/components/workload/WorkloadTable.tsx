import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CardHeaderTitle } from "@/components/ui/CardTypography";
import { AgentWorkload, TSWorkload } from "@/utils/workloadUtils";
import PersonIcon from "@mui/icons-material/Person";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

type SortKey = 'name' | 'total' | 'open' | 'closed' | 'avgTime' | 'rate';
type SortOrder = 'asc' | 'desc';

interface AgentWorkloadTableProps {
    data: AgentWorkload[];
    type: 'agent';
}

interface TSWorkloadTableProps {
    data: TSWorkload[];
    type: 'ts';
}

type WorkloadTableProps = AgentWorkloadTableProps | TSWorkloadTableProps;

export function WorkloadTable({ data, type }: WorkloadTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('total');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const sortedData = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            let aVal: number | string = 0;
            let bVal: number | string = 0;

            if (type === 'agent') {
                const aAgent = a as AgentWorkload;
                const bAgent = b as AgentWorkload;

                switch (sortKey) {
                    case 'name': aVal = aAgent.agentName; bVal = bAgent.agentName; break;
                    case 'total': aVal = aAgent.totalTickets; bVal = bAgent.totalTickets; break;
                    case 'open': aVal = aAgent.openTickets; bVal = bAgent.openTickets; break;
                    case 'closed': aVal = aAgent.closedTickets; bVal = bAgent.closedTickets; break;
                    case 'avgTime': aVal = aAgent.avgResolutionTime; bVal = bAgent.avgResolutionTime; break;
                    case 'rate': aVal = aAgent.utilizationRate; bVal = bAgent.utilizationRate; break;
                }
            } else {
                const aTS = a as TSWorkload;
                const bTS = b as TSWorkload;

                switch (sortKey) {
                    case 'name': aVal = aTS.tsName; bVal = bTS.tsName; break;
                    case 'total': aVal = aTS.totalIncidents; bVal = bTS.totalIncidents; break;
                    case 'open': aVal = aTS.openIncidents; bVal = bTS.openIncidents; break;
                    case 'closed': aVal = aTS.closedIncidents; bVal = bTS.closedIncidents; break;
                    case 'avgTime': aVal = aTS.avgHandlingTime; bVal = bTS.avgHandlingTime; break;
                    case 'rate': aVal = aTS.totalIncidents > 0 ? (aTS.closedIncidents / aTS.totalIncidents) * 100 : 0;
                        bVal = bTS.totalIncidents > 0 ? (bTS.closedIncidents / bTS.totalIncidents) * 100 : 0;
                        break;
                }
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return sorted;
    }, [data, sortKey, sortOrder, type]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
        if (sortKey !== columnKey) return null;
        return sortOrder === 'asc' ? (
            <TrendingUpIcon sx={{ fontSize: 16 }} />
        ) : (
            <TrendingDownIcon sx={{ fontSize: 16 }} />
        );
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    return (
        <Card>
            <CardHeader>
                <CardHeaderTitle>
                    <PersonIcon sx={{ fontSize: 20 }} className="inline mr-2" />
                    {type === 'agent' ? 'Agent' : 'Technical Support'} Workload Breakdown
                </CardHeaderTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th
                                    className="text-left p-2 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSort('name')}
                                >
                                    {type === 'agent' ? 'Agent' : 'TS'} Name <SortIcon columnKey="name" />
                                </th>
                                <th
                                    className="text-right p-2 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSort('total')}
                                >
                                    Total <SortIcon columnKey="total" />
                                </th>
                                <th
                                    className="text-right p-2 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSort('open')}
                                >
                                    Open <SortIcon columnKey="open" />
                                </th>
                                <th
                                    className="text-right p-2 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSort('closed')}
                                >
                                    Closed <SortIcon columnKey="closed" />
                                </th>
                                <th
                                    className="text-right p-2 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSort('avgTime')}
                                >
                                    Avg Time <SortIcon columnKey="avgTime" />
                                </th>
                                <th
                                    className="text-right p-2 cursor-pointer hover:bg-muted"
                                    onClick={() => handleSort('rate')}
                                >
                                    {type === 'agent' ? 'Util Rate' : 'Closure Rate'} <SortIcon columnKey="rate" />
                                </th>
                                {type === 'ts' && (
                                    <th className="text-right p-2">Sites</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map((item, idx) => {
                                if (type === 'agent') {
                                    const agent = item as AgentWorkload;
                                    return (
                                        <tr key={idx} className="border-b hover:bg-muted/50">
                                            <td className="p-2 font-medium">{agent.agentName}</td>
                                            <td className="p-2 text-right">{agent.totalTickets}</td>
                                            <td className="p-2 text-right text-orange-600">{agent.openTickets}</td>
                                            <td className="p-2 text-right text-green-600">{agent.closedTickets}</td>
                                            <td className="p-2 text-right">{formatTime(agent.avgResolutionTime)}</td>
                                            <td className="p-2 text-right">{agent.utilizationRate.toFixed(1)}%</td>
                                        </tr>
                                    );
                                } else {
                                    const ts = item as TSWorkload;
                                    const closureRate = ts.totalIncidents > 0 ? (ts.closedIncidents / ts.totalIncidents) * 100 : 0;
                                    return (
                                        <tr key={idx} className="border-b hover:bg-muted/50">
                                            <td className="p-2 font-medium">{ts.tsName}</td>
                                            <td className="p-2 text-right">{ts.totalIncidents}</td>
                                            <td className="p-2 text-right text-orange-600">{ts.openIncidents}</td>
                                            <td className="p-2 text-right text-green-600">{ts.closedIncidents}</td>
                                            <td className="p-2 text-right">{formatTime(ts.avgHandlingTime)}</td>
                                            <td className="p-2 text-right">{closureRate.toFixed(1)}%</td>
                                            <td className="p-2 text-right">{ts.sitesHandled}</td>
                                        </tr>
                                    );
                                }
                            })}
                        </tbody>
                    </table>
                    {sortedData.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No data available
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
