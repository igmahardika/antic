
import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

interface TicketData {
  customerId: string;
  name: string;
  category: string;
  description: string;
  openTime: string;
  closeTime: string;
  duration: number;
  openBy: string;
}

const GridView = () => {
  const [rowData, setRowData] = useState<TicketData[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);

  // Sample data - in real app this would come from API
  useEffect(() => {
    const sampleData: TicketData[] = [
      {
        customerId: 'CUST001',
        name: 'John Doe',
        category: 'Technical',
        description: 'Login issue with mobile app',
        openTime: '2024-06-24 09:00',
        closeTime: '2024-06-24 11:30',
        duration: 2.5,
        openBy: 'Agent Smith'
      },
      {
        customerId: 'CUST002',
        name: 'Jane Smith',
        category: 'Billing',
        description: 'Payment not processed',
        openTime: '2024-06-24 10:15',
        closeTime: '2024-06-24 12:00',
        duration: 1.75,
        openBy: 'Agent Johnson'
      },
      {
        customerId: 'CUST003',
        name: 'Bob Wilson',
        category: 'Support',
        description: 'Feature request for dashboard',
        openTime: '2024-06-24 14:00',
        closeTime: '2024-06-24 16:30',
        duration: 2.5,
        openBy: 'Agent Brown'
      }
    ];
    setRowData(sampleData);
  }, []);

  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: 'customerId', 
      headerName: 'Customer ID', 
      width: 120,
      pinned: 'left'
    },
    { 
      field: 'name', 
      headerName: 'Name', 
      width: 150,
      filter: true
    },
    { 
      field: 'category', 
      headerName: 'Category', 
      width: 120,
      filter: true
    },
    { 
      field: 'description', 
      headerName: 'Description', 
      flex: 1,
      filter: true
    },
    { 
      field: 'openTime', 
      headerName: 'Open Time', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'closeTime', 
      headerName: 'Close Time', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'duration', 
      headerName: 'Duration (hrs)', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => `${params.value}h`
    },
    { 
      field: 'openBy', 
      headerName: 'Open By', 
      width: 140,
      filter: true
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    filter: true,
  }), []);

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    
    // Load column state from localStorage
    const savedColumnState = localStorage.getItem('ag-grid-column-state');
    if (savedColumnState) {
      params.columnApi?.applyColumnState({
        state: JSON.parse(savedColumnState),
        applyOrder: true,
      });
    }
  };

  const onColumnMoved = () => {
    if (gridApi) {
      const columnState = gridApi.getColumnState();
      localStorage.setItem('ag-grid-column-state', JSON.stringify(columnState));
    }
  };

  const onQuickFilterChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (gridApi) {
      gridApi.setQuickFilter(event.target.value);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Ticket Grid View
        </h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Quick filter..."
            onChange={onQuickFilterChanged}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div className="ag-theme-quartz dark:ag-theme-quartz-dark" style={{ height: '70vh' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={20}
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          enableRangeSelection={true}
          rowSelection="multiple"
        />
      </div>
    </div>
  );
};

export default GridView;
