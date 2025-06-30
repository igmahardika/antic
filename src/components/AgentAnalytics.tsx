import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useDataStore from '@/store/dataStore';
import useAgentStore from '@/store/agentStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Line } from 'react-chartjs-2';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const getRankBadge = (score: number): JSX.Element => {
    if (score > 90) return <Badge className="bg-green-500 text-white">S</Badge>;
    if (score > 80) return <Badge className="bg-blue-500 text-white">A</Badge>;
    if (score > 70) return <Badge className="bg-yellow-500 text-white">B</Badge>;
    if (score > 60) return <Badge className="bg-orange-500 text-white">C</Badge>;
    return <Badge className="bg-red-500 text-white">D</Badge>;
};

const MiniChart = ({ data, color }: { data: number[], color: string }) => (
    <div style={{ width: '100px', height: '30px' }}>
        <Sparklines data={data} margin={5}>
            <SparklinesLine color={color} style={{ fill: "none", strokeWidth: 2 }} />
        </Sparklines>
    </div>
);


const AgentAnalytics = () => {
    const { pathname } = useLocation();
    const { getFilteredTickets } = useDataStore();
    const { agentKpis, calculateKpis } = useAgentStore();
    
    const filteredTickets = getFilteredTickets(pathname);

    useEffect(() => {
        if (filteredTickets) {
            calculateKpis(filteredTickets);
        }
    }, [filteredTickets, calculateKpis]);

    if (!agentKpis || agentKpis.length === 0) {
        return <p>Tidak ada data agen untuk ditampilkan pada periode ini.</p>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Agent Performance Analytics</h1>
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Agent KPI Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Agent</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>FRT (min)</TableHead>
                                <TableHead>FRT Trend</TableHead>
                                <TableHead>ART (min)</TableHead>
                                <TableHead>ART Trend</TableHead>
                                <TableHead>FCR (%)</TableHead>
                                <TableHead>SLA (%)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agentKpis.map((kpi, index) => (
                                <TableRow key={kpi.agent}>
                                    <TableCell>{getRankBadge(kpi.metric.score)}</TableCell>
                                    <TableCell className="font-medium">{kpi.agent}</TableCell>
                                    <TableCell>{kpi.metric.score.toFixed(2)}</TableCell>
                                    <TableCell>{kpi.metric.vol}</TableCell>
                                    <TableCell>{kpi.metric.frt.toFixed(2)}</TableCell>
                                    <TableCell><MiniChart data={kpi.trends.frt} color="#3b82f6" /></TableCell>
                                    <TableCell>{kpi.metric.art.toFixed(2)}</TableCell>
                                    <TableCell><MiniChart data={kpi.trends.art} color="#84cc16" /></TableCell>
                                    <TableCell>{kpi.metric.fcr.toFixed(2)}</TableCell>
                                    <TableCell>{kpi.metric.sla.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default AgentAnalytics;
