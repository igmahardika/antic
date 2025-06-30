import React, { useMemo } from 'react';
import useDataStore from '@/store/dataStore';
import { processCustomerAnalysis } from '@/lib/dataProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, AlertTriangle, Repeat, ShieldAlert } from 'lucide-react';

const classificationConfig = {
    Normal: { icon: <Users className="h-4 w-4 text-gray-500" />, color: "default" as const },
    Persisten: { icon: <Repeat className="h-4 w-4 text-yellow-500" />, color: "secondary" as const },
    Kronis: { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, color: "destructive" as const },
    Ekstrem: { icon: <ShieldAlert className="h-4 w-4 text-red-600" />, color: "destructive" as const },
};

const CustomerAnalysis = () => {
    const { allTickets } = useDataStore();
    const { customerData, classSummary } = useMemo(() => processCustomerAnalysis(allTickets || []), [allTickets]);

    if (!allTickets || allTickets.length === 0) {
        return <div>Loading data or no data available...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Customer Complaint Analysis</h1>
            
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(classSummary).map(([name, count]) => (
                    <Card key={name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{name}</CardTitle>
                            {classificationConfig[name as keyof typeof classificationConfig].icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{count}</div>
                            <p className="text-xs text-muted-foreground">Total Customers</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Customer Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Customer Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer Name</TableHead>
                                <TableHead>Ticket Count</TableHead>
                                <TableHead>Classification</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customerData.map((customer) => (
                                <TableRow key={customer.customerId}>
                                    <TableCell className="font-medium">{customer.customerName}</TableCell>
                                    <TableCell>{customer.ticketCount}</TableCell>
                                    <TableCell>
                                        <Badge variant={classificationConfig[customer.classification as keyof typeof classificationConfig].color}>
                                            {customer.classification}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default CustomerAnalysis; 