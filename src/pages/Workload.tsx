import { useState } from "react";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/ui/PageHeader";
import { TabsContent } from "@/components/ui/tabs";
import { WorkloadTabs, WorkloadFilters } from "@/components/workload/WorkloadFilters";
import { WorkloadSummary } from "@/components/workload/WorkloadSummary";
import { WorkloadTable } from "@/components/workload/WorkloadTable";
import { useTicketWorkload, useIncidentWorkload } from "@/hooks/useWorkloadData";
import { TimeFilter } from "@/utils/workloadUtils";
import { useQuery } from "@tanstack/react-query";

export default function Workload() {
    const currentYear = new Date().getFullYear();
    const [timeFilter, setTimeFilter] = useState<TimeFilter>({
        type: 'year',
        year: currentYear,
    });

    // Fetch available years for filter
    const { data: ticketYears = [] } = useQuery({
        queryKey: ['ticket-years'],
        queryFn: async () => {
            const api = await import("@/lib/api");
            const result = await api.ticketAPI.getTicketYears();
            return result.years || [];
        },
    });

    // Fetch workload data
    const {
        data: ticketWorkload = [],
        isLoading: loadingTickets,
    } = useTicketWorkload(timeFilter);

    const {
        data: incidentWorkload = [],
        isLoading: loadingIncidents,
    } = useIncidentWorkload(timeFilter);

    // Calculate summary metrics
    const ticketSummary = {
        total: ticketWorkload.reduce((sum, a) => sum + a.totalTickets, 0),
        open: ticketWorkload.reduce((sum, a) => sum + a.openTickets, 0),
        closed: ticketWorkload.reduce((sum, a) => sum + a.closedTickets, 0),
        avgResolutionTime:
            ticketWorkload.length > 0
                ? ticketWorkload.reduce((sum, a) => sum + a.avgResolutionTime, 0) / ticketWorkload.length
                : 0,
    };

    const incidentSummary = {
        total: incidentWorkload.reduce((sum, ts) => sum + ts.totalIncidents, 0),
        open: incidentWorkload.reduce((sum, ts) => sum + ts.openIncidents, 0),
        closed: incidentWorkload.reduce((sum, ts) => sum + ts.closedIncidents, 0),
        avgHandlingTime:
            incidentWorkload.length > 0
                ? incidentWorkload.reduce((sum, ts) => sum + ts.avgHandlingTime, 0) / incidentWorkload.length
                : 0,
    };

    return (
        <PageWrapper>
            <PageHeader title="Workload Analytics" />

            <div className="space-y-6">
                {/* Filters */}
                <WorkloadFilters
                    timeFilter={timeFilter}
                    onTimeFilterChange={setTimeFilter}
                    availableYears={ticketYears}
                />

                {/* Tabs */}
                <WorkloadTabs onTabChange={() => { }}>
                    {/* Ticket Workload Tab */}
                    <TabsContent value="tickets" className="space-y-6">
                        {loadingTickets ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                            </div>
                        ) : (
                            <>
                                <WorkloadSummary
                                    totalItems={ticketSummary.total}
                                    openItems={ticketSummary.open}
                                    closedItems={ticketSummary.closed}
                                    avgMetric={ticketSummary.avgResolutionTime}
                                    avgMetricLabel="Avg Resolution Time (min)"
                                    itemType="Tickets"
                                />
                                <WorkloadTable data={ticketWorkload} type="agent" />
                            </>
                        )}
                    </TabsContent>

                    {/* Incident Workload Tab */}
                    <TabsContent value="incidents" className="space-y-6">
                        {loadingIncidents ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                            </div>
                        ) : (
                            <>
                                <WorkloadSummary
                                    totalItems={incidentSummary.total}
                                    openItems={incidentSummary.open}
                                    closedItems={incidentSummary.closed}
                                    avgMetric={incidentSummary.avgHandlingTime}
                                    avgMetricLabel="Avg Handling Time (min)"
                                    itemType="Incidents"
                                />
                                <WorkloadTable data={incidentWorkload} type="ts" />
                            </>
                        )}
                    </TabsContent>
                </WorkloadTabs>
            </div>
        </PageWrapper>
    );
}
