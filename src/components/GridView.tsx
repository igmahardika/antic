import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

interface TicketData {
  customerId: string;
  name: string;
  category: string;
  description: string;
  cause: string;
  handling: string;
  openTime: string;
  closeTime: string;
  duration: number;
  closeHandling: string;
  handlingDuration: number;
  classification: string;
  subClassification: string;
  status: string;
  handling1: string;
  closeHandling1: string;
  handlingDuration1: number;
  handling2: string;
  closeHandling2: string;
  handlingDuration2: number;
  handling3: string;
  closeHandling3: string;
  handlingDuration3: number;
  handling4: string;
  closeHandling4: string;
  handlingDuration4: number;
  handling5: string;
  closeHandling5: string;
  handlingDuration5: number;
  openBy: string;
}

const GridView = () => {
  const [rowData, setRowData] = useState<TicketData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Sample data dengan struktur lengkap
  useEffect(() => {
    const sampleData: TicketData[] = [
      {
        customerId: 'CUST001',
        name: 'John Doe',
        category: 'Technical',
        description: 'Login issue with mobile app',
        cause: 'Server timeout',
        handling: 'Restart server service',
        openTime: '2024-06-24 09:00',
        closeTime: '2024-06-24 11:30',
        duration: 2.5,
        closeHandling: '2024-06-24 10:15',
        handlingDuration: 1.25,
        classification: 'Technical Issue',
        subClassification: 'Authentication',
        status: 'Closed',
        handling1: 'Initial diagnosis',
        closeHandling1: '2024-06-24 09:30',
        handlingDuration1: 0.5,
        handling2: 'Server restart',
        closeHandling2: '2024-06-24 10:15',
        handlingDuration2: 0.75,
        handling3: '',
        closeHandling3: '',
        handlingDuration3: 0,
        handling4: '',
        closeHandling4: '',
        handlingDuration4: 0,
        handling5: '',
        closeHandling5: '',
        handlingDuration5: 0,
        openBy: 'Agent Smith'
      },
      {
        customerId: 'CUST002',
        name: 'Jane Smith',
        category: 'Billing',
        description: 'Payment not processed',
        cause: 'Payment gateway error',
        handling: 'Manual payment processing',
        openTime: '2024-06-24 10:15',
        closeTime: '2024-06-24 12:00',
        duration: 1.75,
        closeHandling: '2024-06-24 11:45',
        handlingDuration: 1.5,
        classification: 'Billing Issue',
        subClassification: 'Payment Processing',
        status: 'Closed',
        handling1: 'Check payment logs',
        closeHandling1: '2024-06-24 10:45',
        handlingDuration1: 0.5,
        handling2: 'Process manual payment',
        closeHandling2: '2024-06-24 11:45',
        handlingDuration2: 1.0,
        handling3: '',
        closeHandling3: '',
        handlingDuration3: 0,
        handling4: '',
        closeHandling4: '',
        handlingDuration4: 0,
        handling5: '',
        closeHandling5: '',
        handlingDuration5: 0,
        openBy: 'Agent Johnson'
      }
    ];
    setRowData(sampleData);
  }, []);

  const columnDefs: ColDef[] = useMemo(() => [
    { 
      field: 'customerId', 
      headerName: 'Customer ID', 
      width: 120,
      pinned: 'left',
      filter: true
    },
    { 
      field: 'name', 
      headerName: 'Nama', 
      width: 150,
      filter: true
    },
    { 
      field: 'category', 
      headerName: 'Kategori', 
      width: 120,
      filter: true
    },
    { 
      field: 'description', 
      headerName: 'Deskripsi', 
      width: 200,
      filter: true
    },
    { 
      field: 'cause', 
      headerName: 'Penyebab', 
      width: 150,
      filter: true
    },
    { 
      field: 'handling', 
      headerName: 'Penanganan', 
      width: 180,
      filter: true
    },
    { 
      field: 'openTime', 
      headerName: 'Waktu Open', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'closeTime', 
      headerName: 'Waktu Close Tiket', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'duration', 
      headerName: 'Durasi', 
      width: 100,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => `${params.value}h`
    },
    { 
      field: 'closeHandling', 
      headerName: 'Close Penanganan', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'handlingDuration', 
      headerName: 'Durasi Penanganan', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => `${params.value}h`
    },
    { 
      field: 'classification', 
      headerName: 'Klasifikasi', 
      width: 150,
      filter: true
    },
    { 
      field: 'subClassification', 
      headerName: 'Sub Klasifikasi', 
      width: 150,
      filter: true
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 100,
      filter: true,
      cellRenderer: (params: any) => {
        const status = params.value;
        const className = status === 'Closed' ? 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs' : 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs';
        return `<span class="${className}">${status}</span>`;
      }
    },
    { 
      field: 'handling1', 
      headerName: 'Penanganan 1', 
      width: 150,
      filter: true
    },
    { 
      field: 'closeHandling1', 
      headerName: 'Close Penanganan 1', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'handlingDuration1', 
      headerName: 'Durasi Penanganan 1', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => params.value ? `${params.value}h` : ''
    },
    { 
      field: 'handling2', 
      headerName: 'Penanganan 2', 
      width: 150,
      filter: true
    },
    { 
      field: 'closeHandling2', 
      headerName: 'Close Penanganan 2', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'handlingDuration2', 
      headerName: 'Durasi Penanganan 2', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => params.value ? `${params.value}h` : ''
    },
    { 
      field: 'handling3', 
      headerName: 'Penanganan 3', 
      width: 150,
      filter: true
    },
    { 
      field: 'closeHandling3', 
      headerName: 'Close Penanganan 3', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'handlingDuration3', 
      headerName: 'Durasi Penanganan 3', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => params.value ? `${params.value}h` : ''
    },
    { 
      field: 'handling4', 
      headerName: 'Penanganan 4', 
      width: 150,
      filter: true
    },
    { 
      field: 'closeHandling4', 
      headerName: 'Close Penanganan 4', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'handlingDuration4', 
      headerName: 'Durasi Penanganan 4', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => params.value ? `${params.value}h` : ''
    },
    { 
      field: 'handling5', 
      headerName: 'Penanganan 5', 
      width: 150,
      filter: true
    },
    { 
      field: 'closeHandling5', 
      headerName: 'Close Penanganan 5', 
      width: 150,
      filter: 'agDateColumnFilter'
    },
    { 
      field: 'handlingDuration5', 
      headerName: 'Durasi Penanganan 5', 
      width: 130,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => params.value ? `${params.value}h` : ''
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
    if (savedColumnState && params.api) {
      params.api.applyColumnState({
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
      gridApi.setGridOption('quickFilterText', event.target.value);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Detail Data Tiket
        </h2>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Cari data tiket..."
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
