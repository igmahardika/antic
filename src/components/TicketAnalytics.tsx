import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useDataStore from '@/store/dataStore';
import { processTicketAnalytics } from '@/lib/dataProcessing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Doughnut } from 'react-chartjs-2';
import WordCloud from 'react-d3-cloud';

const doughnutOptions = {
    responsive: true,
    plugins: {
        legend: { position: 'right' as const, labels: { boxWidth: 12, padding: 15 } },
    },
};

const TicketAnalytics = () => {
    const { pathname } = useLocation();
    const { getFilteredTickets } = useDataStore();
    const filteredTickets = getFilteredTickets(pathname);
    const analyticsData = useMemo(() => processTicketAnalytics(filteredTickets), [filteredTickets]);

    if (!analyticsData) return <div>Pilih rentang waktu untuk menampilkan analitik tiket.</div>;

    const { stats, topComplaintsTable, complaintsData, classificationData, keywordAnalysis } = analyticsData;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Ticket Analysis</h1>
            
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="shadow-sm hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        </CardHeader>
                        <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Category Hotspot Table */}
                <Card className="md:col-span-2 shadow-lg">
                    <CardHeader>
                        <CardTitle>Category Hotspot</CardTitle>
                        <CardDescription>Top 10 impactful categories based on volume and duration.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Tickets</TableHead>
                                    <TableHead>Avg Duration</TableHead>
                                    <TableHead>Top Sub-Category</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topComplaintsTable.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{item.category}</TableCell>
                                        <TableCell>{item.count}</TableCell>
                                        <TableCell>{item.avgDurationFormatted}</TableCell>
                                        <TableCell><Badge variant="secondary">{item.topSubCategory}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Complaint Categories Chart */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Complaint Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Doughnut data={complaintsData} options={doughnutOptions} />
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid md:grid-cols-5 gap-6">
                 {/* Classification & Keyword Analysis */}
                <Card className="md:col-span-2 shadow-lg">
                    <CardHeader><CardTitle>Classification Analysis</CardTitle></CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {Object.entries(classificationData).map(([name, data]) => (
                                <AccordionItem key={name} value={name}>
                                    <AccordionTrigger className="font-semibold">{name}</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Total Tickets: <strong>{data.count}</strong></p>
                                        {/* Trendline would go here */}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 shadow-lg">
                    <CardHeader>
                        <CardTitle>Keyword Cloud</CardTitle>
                        <CardDescription>{keywordAnalysis.conclusion}</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full">
                        <WordCloud
                            data={keywordAnalysis.keywords.map(([text, value]) => ({ text, value }))}
                            width={500}
                            height={250}
                            font="sans-serif"
                            fontWeight="bold"
                            fontSize={(word) => Math.log2(word.value) * 5 + 10}
                            spiral="rectangular"
                            padding={2}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TicketAnalytics; 