import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import EscalationTable from '@/components/escalation/EscalationTable';
import { useEscalationStore } from '@/store/escalationStore';
import PageWrapper from '@/components/PageWrapper';
import PageHeader from '@/components/ui/PageHeader';
import { CardHeaderTitle, CardHeaderDescription } from '@/components/ui/CardTypography';
import SummaryCard from '@/components/ui/SummaryCard';

export default function EscalationDataPage() {
  const { load, rows } = useEscalationStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const activeEscalations = rows.filter(row => row.status === 'active');
  const closedEscalations = rows.filter(row => row.status === 'closed');
  const totalEscalations = rows.length;

  // Calculate statistics
  const activeCount = activeEscalations.length;
  const closedCount = closedEscalations.length;
  const resolutionRate = totalEscalations > 0 ? Math.round((closedCount / totalEscalations) * 100) : 0;


  // Group by escalation code
  const codeStats = closedEscalations.reduce((acc, escalation) => {
    acc[escalation.code] = (acc[escalation.code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await load();
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting escalation data...');
  };

  return (
    <PageWrapper>
      <div className="space-y-6 lg:space-y-8">
        <PageHeader 
          title="Escalation Data" 
          description="Daftar eskalasi yang sudah ditutup dan statistik lengkap"
        />

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading}
              variant="outline" 
              className="px-2 py-1 text-xs h-7"
            >
              <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={handleExport} 
              variant="outline" 
              className="px-2 py-1 text-xs h-7"
            >
              <Download className="w-2.5 h-2.5 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Escalations"
            value={totalEscalations}
            description="All escalations"
            icon={<AlertTriangle className="h-4 w-4" />}
            iconBg="bg-blue-500"
          />
          <SummaryCard
            title="Active Escalations"
            value={activeCount}
            description="Currently active"
            icon={<Clock className="h-4 w-4" />}
            iconBg="bg-yellow-500"
          />
          <SummaryCard
            title="Closed Escalations"
            value={closedCount}
            description="Successfully resolved"
            icon={<CheckCircle className="h-4 w-4" />}
            iconBg="bg-green-500"
          />
          <SummaryCard
            title="Resolution Rate"
            value={`${resolutionRate}%`}
            description="Success rate"
            icon={<TrendingUp className="h-4 w-4" />}
            iconBg="bg-purple-500"
          />
        </div>


        {/* Escalation Code Statistics */}
        {Object.keys(codeStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardHeaderTitle>Closed Escalations by Code</CardHeaderTitle>
              <CardHeaderDescription>
                Distribution of resolved escalations by code
              </CardHeaderDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Row */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Total Resolved</h3>
                      <p className="text-sm text-gray-600">All escalation codes combined</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{closedCount}</div>
                    <div className="text-sm text-gray-500">escalations</div>
                  </div>
                </div>

                {/* Code Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(codeStats)
                    .sort(([,a], [,b]) => b - a) // Sort by count descending
                    .map(([code, count]) => {
                      const percentage = Math.round((count / closedCount) * 100);
                      const getCodeColor = (code: string) => {
                        const colors: { [key: string]: string } = {
                          'CODE-OS': 'bg-red-500',
                          'CODE-AS': 'bg-orange-500',
                          'CODE-BS': 'bg-yellow-500',
                          'CODE-DCS': 'bg-blue-500',
                          'CODE-EOS': 'bg-purple-500',
                          'CODE-IPC': 'bg-green-500',
                        };
                        return colors[code] || 'bg-gray-500';
                      };

                      return (
                        <div key={code} className="group relative overflow-hidden bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 hover:border-gray-300">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getCodeColor(code)}`}></div>
                                <span className="font-medium text-gray-900 text-sm">{code}</span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {percentage}%
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-gray-900">{count}</span>
                                <span className="text-sm text-gray-500">resolved</span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${getCodeColor(code)} transition-all duration-300`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Hover Effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
                        </div>
                      );
                    })}
                </div>

                {/* Additional Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {Object.keys(codeStats).length} different escalation codes have been resolved
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Data Table */}
        <Card>
          <CardHeader>
            <CardHeaderTitle>Closed Escalations</CardHeaderTitle>
            <CardHeaderDescription>
              Daftar eskalasi yang sudah ditutup ({closedEscalations.length} items)
            </CardHeaderDescription>
          </CardHeader>
          <CardContent>
            <EscalationTable mode="closed" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
