import React, { useMemo, useState } from 'react';
import useDataStore from '@/store/dataStore';
import { processCustomerAnalysis } from '@/lib/dataProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, AlertTriangle, Repeat, ShieldAlert } from 'lucide-react';

const classificationConfig = {
    Normal: { icon: <Users className="h-4 w-4 text-gray-500" />, color: "default" as const, description: "1 complaint" },
    Persisten: { icon: <Repeat className="h-4 w-4 text-yellow-500" />, color: "secondary" as const, description: "2-3 complaints" },
    Kronis: { icon: <AlertTriangle className="h-4 w-4 text-orange-500" />, color: "destructive" as const, description: "4-5 complaints" },
    Ekstrem: { icon: <ShieldAlert className="h-4 w-4 text-red-600" />, color: "destructive" as const, description: ">5 complaints" },
};

const CustomerAnalysis = () => {
    const { allTickets } = useDataStore();
    const { customerData, classSummary } = useMemo(() => processCustomerAnalysis(allTickets || []), [allTickets]);

    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    const filteredCustomers = useMemo(() => {
        return customerData.filter(c => 
            c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customerData, searchTerm]);

    const paginatedCustomers = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredCustomers.slice(start, start + rowsPerPage);
    }, [filteredCustomers, page, rowsPerPage]);

    const pageCount = Math.ceil(filteredCustomers.length / rowsPerPage);

    if (!allTickets || allTickets.length === 0) {
        return <div>Loading data or no data available...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Customer Complaint Analysis</h1>
            
            <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(classSummary).map(([name, count]) => (
                    <Card key={name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{name}</CardTitle>
                            {classificationConfig[name as keyof typeof classificationConfig].icon}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{count}</div>
                            <p className="text-xs text-muted-foreground">
                                {classificationConfig[name as keyof typeof classificationConfig].description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Leaderboard</CardTitle>
                     <div className="mt-4">
                        <Input 
                            placeholder="Search by customer name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead className="text-center">Ticket Count</TableHead>
                                    <TableHead>Classification</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedCustomers.map((customer) => (
                                    <TableRow key={customer.customerId} className="hover:bg-muted/50 cursor-pointer">
                                        <TableCell className="font-medium">{customer.customerName}</TableCell>
                                        <TableCell className="text-center">{customer.ticketCount}</TableCell>
                                        <TableCell>
                                            <Badge variant={classificationConfig[customer.classification as keyof typeof classificationConfig].color}>
                                                {customer.classification}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                            disabled={page >= pageCount - 1}
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CustomerAnalysis;