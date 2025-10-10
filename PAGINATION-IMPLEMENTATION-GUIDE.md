# 🛠️ Pagination Implementation Guide

**For:** Antic-1 Helpdesk Management System  
**Date:** October 10, 2025  
**Purpose:** Step-by-step guide to implement pagination on pages that need it

---

## 🎯 Quick Start

This guide provides ready-to-use code for implementing pagination on each page identified in the audit. Simply copy the relevant section and adapt it to your page.

---

## 📋 Table of Contents

1. [Critical: CustomerData.tsx](#1-critical-customerdatatsx)
2. [High Priority: SiteAnalytics.tsx](#2-high-priority-siteanalyticstsx)
3. [High Priority: TSAnalytics.tsx](#3-high-priority-tsanalyticstsx)
4. [Medium Priority: Enhance KanbanBoard.tsx](#4-medium-priority-enhance-kanbanboardtsx)
5. [Medium Priority: Upload Preview](#5-medium-priority-upload-preview)
6. [Reusable Hook: usePagination](#6-reusable-hook-usepagination)
7. [Reusable Component: PaginationControls](#7-reusable-component-paginationcontrols)

---

## 1. 🔴 CRITICAL: CustomerData.tsx

**Priority:** URGENT (Week 1)  
**File:** `src/pages/CustomerData.tsx`  
**Issue:** Displays ALL customers without pagination (1000+ items)

### Step-by-Step Implementation:

#### Step 1: Add State Variables (After line 19)
```typescript
// Add these state variables after existing useState declarations
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(50);
```

#### Step 2: Calculate Pagination (Before rendering table)
```typescript
// Add this useMemo hook after your existing jenisKlienList useMemo (around line 28)
const paginatedCustomers = React.useMemo(() => {
  if (!bulanDipilih || !dataPerBulan[bulanDipilih]) return { data: [], total: 0, totalPages: 0 };
  
  // Filter data
  const filtered = dataPerBulan[bulanDipilih]
    .filter(row => jenisKlienFilter === 'ALL' || row['Jenis Klien'] === jenisKlienFilter);
  
  // Calculate pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paged = filtered.slice(startIdx, endIdx);
  
  return { data: paged, total, totalPages };
}, [dataPerBulan, bulanDipilih, jenisKlienFilter, page, pageSize]);

// Reset to page 1 when filters change
React.useEffect(() => {
  setPage(1);
}, [bulanDipilih, jenisKlienFilter]);
```

#### Step 3: Update Table Body (Replace lines 337-351)
```typescript
// REPLACE THIS:
{bulanDipilih && dataPerBulan[bulanDipilih] && dataPerBulan[bulanDipilih].length > 0 ? (
  dataPerBulan[bulanDipilih]
    .filter(row => jenisKlienFilter === 'ALL' || row['Jenis Klien'] === jenisKlienFilter)
    .map((row, i) => (
      <TableRow key={i}>
        {CUSTOMER_HEADERS.map(h => (
          <TableCell key={h}>{row[h]}</TableCell>
        ))}
      </TableRow>
    ))
) : (
  <TableRow>
    <TableCell colSpan={CUSTOMER_HEADERS.length} className="text-center py-8 text-gray-400">Belum ada data</TableCell>
  </TableRow>
)}

// WITH THIS:
{paginatedCustomers.data.length > 0 ? (
  paginatedCustomers.data.map((row, i) => (
    <TableRow key={i}>
      {CUSTOMER_HEADERS.map(h => (
        <TableCell key={h}>{row[h]}</TableCell>
      ))}
    </TableRow>
  ))
) : (
  <TableRow>
    <TableCell colSpan={CUSTOMER_HEADERS.length} className="text-center py-8 text-gray-400">
      Belum ada data
    </TableCell>
  </TableRow>
)}
```

#### Step 4: Add Pagination Controls (After table, before closing tag)
```typescript
// Add this AFTER the table closing </table> tag (around line 354)
{/* Pagination Controls */}
{paginatedCustomers.total > pageSize && (
  <div className="py-5 px-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    {/* Page Size Selector */}
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Size:</span>
      <select 
        value={pageSize} 
        onChange={(e) => { 
          setPageSize(Number(e.target.value));
          setPage(1);
        }}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={200}>200</option>
      </select>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Showing {Math.min((page - 1) * pageSize + 1, paginatedCustomers.total)} to {Math.min(page * pageSize, paginatedCustomers.total)} of {paginatedCustomers.total}
      </span>
    </div>
    
    {/* Navigation Controls */}
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => setPage(1)} 
        disabled={page === 1}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="First page"
      >
        ««
      </button>
      <button 
        onClick={() => setPage(p => Math.max(1, p - 1))} 
        disabled={page === 1}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Previous page"
      >
        ‹
      </button>
      <span className="w-10 h-10 bg-blue-600 text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full">
        {page}
      </span>
      <button 
        onClick={() => setPage(p => Math.min(paginatedCustomers.totalPages, p + 1))} 
        disabled={page >= paginatedCustomers.totalPages}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Next page"
      >
        ›
      </button>
      <button 
        onClick={() => setPage(paginatedCustomers.totalPages)}
        disabled={page >= paginatedCustomers.totalPages}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Last page"
      >
        »»
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {page} of {paginatedCustomers.totalPages}
      </span>
    </div>
  </div>
)}
```

#### Step 5: Update Summary Card (Optional)
```typescript
// Update the first SummaryCard (around line 242) to show paginated info
<SummaryCard
  icon={<TableChartIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
  title={`Total Customer Bulan ${bulanDipilih}`}
  value={paginatedCustomers.total}  // Changed from dataPerBulan[bulanDipilih]?.length
  description={`Jumlah customer pada bulan ${bulanDipilih}`}
  iconBg="bg-blue-700"
  className="w-full"
/>
```

### Testing Checklist:
- [ ] Page loads with default page size (50)
- [ ] First page button disabled on page 1
- [ ] Last page button disabled on last page
- [ ] Page size change resets to page 1
- [ ] Filter change resets to page 1
- [ ] "Showing X to Y of Z" displays correctly
- [ ] Page indicator shows correct page number
- [ ] Performance is fast (<500ms)

---

## 2. 🟠 HIGH PRIORITY: SiteAnalytics.tsx

**Priority:** HIGH (Week 2)  
**File:** `src/pages/SiteAnalytics.tsx`  
**Issue:** Displays all sites without pagination (100+ sites)

### Implementation:

#### Step 1: Add State (around line 100)
```typescript
// Add after existing state declarations
const [sitesPage, setSitesPage] = useState(1);
const [sitesPageSize, setSitesPageSize] = useState(20);
```

#### Step 2: Find the site risk cards section and add pagination
```typescript
// Find where site risk cards are mapped (look for .map() rendering site cards)
// Add this before the .map():

const paginatedSites = useMemo(() => {
  // Assuming siteRiskData or similar contains the sites
  const sites = siteRiskData || []; // Replace with actual site data variable
  const total = sites.length;
  const totalPages = Math.max(1, Math.ceil(total / sitesPageSize));
  const startIdx = (sitesPage - 1) * sitesPageSize;
  const paged = sites.slice(startIdx, startIdx + sitesPageSize);
  
  return { sites: paged, total, totalPages };
}, [siteRiskData, sitesPage, sitesPageSize]); // Adjust dependencies
```

#### Step 3: Update rendering to use paginatedSites
```typescript
// REPLACE this pattern:
{siteRiskData.map((site, index) => (
  // ... site card JSX
))}

// WITH this:
{paginatedSites.sites.map((site, index) => (
  // ... site card JSX (same as before)
))}
```

#### Step 4: Add Pagination Controls
```typescript
{/* Add after site cards section */}
{paginatedSites.total > sitesPageSize && (
  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
    {/* Page Size */}
    <div className="flex items-center gap-2">
      <span className="text-sm">Sites per page:</span>
      <select
        value={sitesPageSize}
        onChange={(e) => {
          setSitesPageSize(Number(e.target.value));
          setSitesPage(1);
        }}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
    </div>
    
    {/* Navigation */}
    <div className="flex items-center space-x-2">
      <button onClick={() => setSitesPage(1)} disabled={sitesPage === 1}>««</button>
      <button onClick={() => setSitesPage(p => p - 1)} disabled={sitesPage === 1}>‹</button>
      <span className="px-3 py-1 bg-blue-600 text-white rounded">{sitesPage}</span>
      <button onClick={() => setSitesPage(p => p + 1)} disabled={sitesPage >= paginatedSites.totalPages}>›</button>
      <button onClick={() => setSitesPage(paginatedSites.totalPages)} disabled={sitesPage >= paginatedSites.totalPages}>»»</button>
      <span className="text-sm">Page {sitesPage} of {paginatedSites.totalPages}</span>
    </div>
  </div>
)}
```

---

## 3. 🟠 HIGH PRIORITY: TSAnalytics.tsx

**Priority:** HIGH (Week 2)  
**File:** `src/pages/TSAnalytics.tsx`  
**Issue:** Large tables without pagination (500+ rows)

### Implementation:

This file has multiple tables. Let's add pagination to the main TS Performance table.

#### Step 1: Add State
```typescript
// Add near other state declarations
const [tsTablePage, setTsTablePage] = useState(1);
const [tsTablePageSize, setTsTablePageSize] = useState(50);
```

#### Step 2: Find the TS Performance table data preparation
```typescript
// Look for where TS performance data is prepared (likely around line 500-700)
// Add pagination logic:

const paginatedTSPerformance = useMemo(() => {
  // Replace 'tsPerformanceData' with actual variable name
  const data = tsPerformanceData || [];
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / tsTablePageSize));
  const startIdx = (tsTablePage - 1) * tsTablePageSize;
  const paged = data.slice(startIdx, startIdx + tsTablePageSize);
  
  return { data: paged, total, totalPages };
}, [tsPerformanceData, tsTablePage, tsTablePageSize]);
```

#### Step 3: Update table to use paginated data
```typescript
// REPLACE:
{tsPerformanceData.map((ts, index) => (
  <tr key={index}>
    {/* ... cells */}
  </tr>
))}

// WITH:
{paginatedTSPerformance.data.map((ts, index) => (
  <tr key={index}>
    {/* ... cells (same as before) */}
  </tr>
))}
```

#### Step 4: Add Pagination Controls after table
```typescript
{/* Add after </table> */}
{paginatedTSPerformance.total > tsTablePageSize && (
  <div className="py-4 px-4 flex sm:flex-row items-center justify-between gap-4 border-t">
    <div className="flex items-center gap-2">
      <span className="text-sm">Rows:</span>
      <select
        value={tsTablePageSize}
        onChange={(e) => {
          setTsTablePageSize(Number(e.target.value));
          setTsTablePage(1);
        }}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
    <div className="flex items-center space-x-2">
      <button onClick={() => setTsTablePage(1)} disabled={tsTablePage === 1}>««</button>
      <button onClick={() => setTsTablePage(p => p - 1)} disabled={tsTablePage === 1}>‹</button>
      <span className="px-3 py-1 bg-blue-600 text-white rounded">{tsTablePage}</span>
      <button onClick={() => setTsTablePage(p => p + 1)} disabled={tsTablePage >= paginatedTSPerformance.totalPages}>›</button>
      <button onClick={() => setTsTablePage(paginatedTSPerformance.totalPages)} disabled={tsTablePage >= paginatedTSPerformance.totalPages}>»»</button>
      <span className="text-sm">Page {tsTablePage} of {paginatedTSPerformance.totalPages}</span>
    </div>
  </div>
)}
```

**Note:** Repeat this pattern for other large tables in TSAnalytics.tsx (site-level breakdown, monthly breakdown).

---

## 4. 🟡 MEDIUM PRIORITY: Enhance KanbanBoard.tsx

**Priority:** MEDIUM (Week 3)  
**File:** `src/components/KanbanBoard.tsx`  
**Issue:** Basic pagination without page size selector

### Enhancement:

#### Step 1: Update State (around line 42)
```typescript
// REPLACE:
const [page, setPage] = useState(1);
const pageSize = 20;

// WITH:
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20); // Now configurable!
```

#### Step 2: Replace Pagination Controls (lines 1572-1590)
```typescript
// REPLACE the existing simple pagination WITH this enhanced version:
{totalPages > 1 && (
  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 mb-4 px-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
    {/* Page size selector - NEW! */}
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
      <select
        value={pageSize}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(1); // Reset to page 1 when changing size
        }}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        ({filteredCustomers.length} total)
      </span>
    </div>

    {/* Navigation controls - ENHANCED! */}
    <div className="flex items-center gap-3">
      {/* First page button - NEW! */}
      <button
        onClick={() => setPage(1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        title="First page"
      >
        ««
      </button>
      
      {/* Previous button - EXISTING */}
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
      >
        &laquo; Previous
      </button>
      
      {/* Page indicator - EXISTING */}
      <span className="text-gray-600 dark:text-gray-400 font-medium px-3 py-2">
        Page {page} of {totalPages}
      </span>
      
      {/* Next button - EXISTING */}
      <button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
      >
        Next &raquo;
      </button>
      
      {/* Last page button - NEW! */}
      <button
        onClick={() => setPage(totalPages)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        title="Last page"
      >
        »»
      </button>
    </div>
  </div>
)}
```

---

## 5. 🟡 MEDIUM PRIORITY: Upload Preview

**Priority:** MEDIUM (Week 3)  
**File:** `src/pages/incident_upload_fixed.jsx`  
**Issue:** Preview hard-coded to 20 rows

### Implementation:

#### Step 1: Add State in IncidentUpload component (around line 250)
```typescript
const [previewPage, setPreviewPage] = useState(1);
const [previewPageSize, setPreviewPageSize] = useState(20);
```

#### Step 2: Update upload result to include all rows (around line 470)
```typescript
// REPLACE:
preview: allRows.slice(0, 20),

// WITH:
preview: allRows, // Include all rows, paginate in UI
```

#### Step 3: Add pagination to preview rendering (around line 616)
```typescript
// Add before the preview table:
const paginatedPreview = useMemo(() => {
  if (!uploadResult?.preview) return { data: [], total: 0, totalPages: 0 };
  
  const total = uploadResult.preview.length;
  const totalPages = Math.max(1, Math.ceil(total / previewPageSize));
  const startIdx = (previewPage - 1) * previewPageSize;
  const paged = uploadResult.preview.slice(startIdx, startIdx + previewPageSize);
  
  return { data: paged, total, totalPages };
}, [uploadResult?.preview, previewPage, previewPageSize]);

// REPLACE the preview section:
{uploadResult.preview.length > 0 && (
  <div>
    <h4 className="font-medium mb-2">Preview (first 20 rows):</h4>  {/* UPDATE THIS TEXT */}
    ...
  </div>
)}

// WITH:
{uploadResult.preview.length > 0 && (
  <div>
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-medium">
        Preview: Showing {Math.min((previewPage - 1) * previewPageSize + 1, paginatedPreview.total)} to {Math.min(previewPage * previewPageSize, paginatedPreview.total)} of {paginatedPreview.total} rows
      </h4>
      <select
        value={previewPageSize}
        onChange={(e) => {
          setPreviewPageSize(Number(e.target.value));
          setPreviewPage(1);
        }}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
    </div>
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        {/* ... existing table header ... */}
        <tbody>
          {paginatedPreview.data.map((inc, i) => {
            // ... existing row rendering ...
          })}
        </tbody>
      </table>
    </div>
    
    {/* Add pagination controls */}
    {paginatedPreview.totalPages > 1 && (
      <div className="mt-4 flex items-center justify-center space-x-2">
        <button onClick={() => setPreviewPage(1)} disabled={previewPage === 1}>««</button>
        <button onClick={() => setPreviewPage(p => p - 1)} disabled={previewPage === 1}>‹</button>
        <span className="px-3 py-1 bg-blue-600 text-white rounded">{previewPage}</span>
        <button onClick={() => setPreviewPage(p => p + 1)} disabled={previewPage >= paginatedPreview.totalPages}>›</button>
        <button onClick={() => setPreviewPage(paginatedPreview.totalPages)} disabled={previewPage >= paginatedPreview.totalPages}>»»</button>
        <span className="text-sm">of {paginatedPreview.totalPages}</span>
      </div>
    )}
  </div>
)}
```

---

## 6. 🔧 Reusable Hook: usePagination

Create a new file: `src/hooks/usePagination.ts`

```typescript
import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationProps<T> {
  items: T[];
  initialPageSize?: number;
}

export interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedItems: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function usePagination<T>({
  items,
  initialPageSize = 50
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedItems = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return items.slice(startIdx, endIdx);
  }, [items, page, pageSize]);

  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page when changing page size
  }, []);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    canGoNext: page < totalPages,
    canGoPrev: page > 1
  };
}
```

### Usage Example:
```typescript
import { usePagination } from '@/hooks/usePagination';

function MyComponent() {
  const [data, setData] = useState([/* ... */]);
  
  const pagination = usePagination({
    items: data,
    initialPageSize: 50
  });

  return (
    <div>
      {/* Render paginated items */}
      {pagination.paginatedItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      
      {/* Pagination controls */}
      <PaginationControls {...pagination} />
    </div>
  );
}
```

---

## 7. 🔧 Reusable Component: PaginationControls

Create a new file: `src/components/ui/PaginationControls.tsx`

```typescript
import React from 'react';

export interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  firstPage: () => void;
  prevPage: () => void;
  nextPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  pageSizeOptions?: number[];
  showInfo?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  pageSize,
  totalPages,
  totalItems,
  firstPage,
  prevPage,
  nextPage,
  lastPage,
  setPageSize,
  canGoNext,
  canGoPrev,
  pageSizeOptions = [10, 25, 50, 100],
  showInfo = true
}) => {
  const startItem = Math.min((page - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
      {/* Page Size Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Page Size:
        </span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        {showInfo && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startItem} to {endItem} of {totalItems}
          </span>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={firstPage}
          disabled={!canGoPrev}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="First page"
          aria-label="Go to first page"
        >
          ««
        </button>
        <button
          onClick={prevPage}
          disabled={!canGoPrev}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Previous page"
          aria-label="Go to previous page"
        >
          ‹
        </button>
        <span className="w-10 h-10 bg-blue-600 text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full">
          {page}
        </span>
        <button
          onClick={nextPage}
          disabled={!canGoNext}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Next page"
          aria-label="Go to next page"
        >
          ›
        </button>
        <button
          onClick={lastPage}
          disabled={!canGoNext}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Last page"
          aria-label="Go to last page"
        >
          »»
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
          Page {page} of {totalPages}
        </span>
      </div>
    </div>
  );
};
```

### Usage with usePagination Hook:
```typescript
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

function MyComponent() {
  const [data, setData] = useState([/* ... */]);
  
  const pagination = usePagination({
    items: data,
    initialPageSize: 50
  });

  return (
    <div>
      {/* Your content */}
      <table>
        {/* ... */}
        <tbody>
          {pagination.paginatedItems.map(item => (
            <tr key={item.id}>
              {/* ... */}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination - Single line! */}
      <PaginationControls {...pagination} />
    </div>
  );
}
```

---

## 🧪 Testing Guide

### Unit Tests (Optional but Recommended)

Create test file: `src/hooks/__tests__/usePagination.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('should paginate data correctly', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockData, initialPageSize: 10 })
    );

    expect(result.current.totalPages).toBe(10);
    expect(result.current.paginatedItems.length).toBe(10);
    expect(result.current.page).toBe(1);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockData, initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
  });

  it('should reset page when changing page size', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockData, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToPage(5);
      result.current.setPageSize(20);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(5);
  });
});
```

### Manual Testing Checklist

For each page you implement pagination on:

```
Page: _________________

Functionality:
[ ] First page button works
[ ] Previous page button works
[ ] Next page button works
[ ] Last page button works
[ ] Page size selector works
[ ] Changing page size resets to page 1
[ ] Filter changes reset to page 1
[ ] Page indicator is accurate
[ ] Item count is accurate
[ ] Buttons disable correctly

Edge Cases:
[ ] Works with 0 items
[ ] Works with 1 item
[ ] Works with exactly pageSize items
[ ] Works with pageSize + 1 items
[ ] Works with 1000+ items

Performance:
[ ] Page load < 500ms
[ ] No lag on page change
[ ] No memory leaks

UI/UX:
[ ] Responsive on mobile
[ ] Works in dark mode
[ ] Keyboard navigation works
[ ] Screen reader friendly
[ ] Consistent styling
```

---

## 📝 Commit Message Templates

### For Critical Fix (CustomerData)
```
fix(CustomerData): Add pagination for customer table

- Add page state management with 50 items per page
- Implement full pagination controls (First/Prev/Next/Last)
- Add page size selector (25, 50, 100, 200)
- Reset to page 1 on filter changes
- Improve performance for 1000+ customers

Fixes #XXX
```

### For Enhancement (KanbanBoard)
```
feat(KanbanBoard): Enhance pagination controls

- Add configurable page size selector
- Add First/Last page buttons
- Improve UI consistency with other paginated pages
- Add keyboard navigation support

Part of pagination standardization initiative
```

### For New Hook/Component
```
feat: Add reusable pagination hook and component

- Create usePagination hook for state management
- Create PaginationControls component for UI
- Add TypeScript types and interfaces
- Include comprehensive documentation
- Add unit tests

This enables consistent pagination across all pages
```

---

## 🔗 Additional Resources

- **Full Audit Report:** [PAGINATION-AUDIT-REPORT.md](./PAGINATION-AUDIT-REPORT.md)
- **Quick Summary:** [PAGINATION-AUDIT-SUMMARY.md](./PAGINATION-AUDIT-SUMMARY.md)
- **Visual Status:** [PAGINATION-VISUAL-STATUS.md](./PAGINATION-VISUAL-STATUS.md)
- **Reference Implementation:** `src/components/GridView.tsx`
- **Utility Functions:** `src/utils/incidentUtils.ts`

---

## 💡 Tips and Best Practices

1. **Always Reset to Page 1** when filters change
2. **Use useMemo** for pagination calculations to avoid unnecessary recalculations
3. **Disable buttons** appropriately (first/prev on page 1, next/last on last page)
4. **Show item counts** to help users understand what they're viewing
5. **Provide multiple page sizes** to accommodate different use cases
6. **Test with edge cases** (0 items, 1 item, exact page size, etc.)
7. **Keep styling consistent** with existing pages
8. **Add keyboard navigation** for accessibility
9. **Optimize performance** - pagination should be fast (<500ms)
10. **Document your changes** in code comments

---

**Last Updated:** October 10, 2025  
**Maintained by:** Development Team



**For:** Antic-1 Helpdesk Management System  
**Date:** October 10, 2025  
**Purpose:** Step-by-step guide to implement pagination on pages that need it

---

## 🎯 Quick Start

This guide provides ready-to-use code for implementing pagination on each page identified in the audit. Simply copy the relevant section and adapt it to your page.

---

## 📋 Table of Contents

1. [Critical: CustomerData.tsx](#1-critical-customerdatatsx)
2. [High Priority: SiteAnalytics.tsx](#2-high-priority-siteanalyticstsx)
3. [High Priority: TSAnalytics.tsx](#3-high-priority-tsanalyticstsx)
4. [Medium Priority: Enhance KanbanBoard.tsx](#4-medium-priority-enhance-kanbanboardtsx)
5. [Medium Priority: Upload Preview](#5-medium-priority-upload-preview)
6. [Reusable Hook: usePagination](#6-reusable-hook-usepagination)
7. [Reusable Component: PaginationControls](#7-reusable-component-paginationcontrols)

---

## 1. 🔴 CRITICAL: CustomerData.tsx

**Priority:** URGENT (Week 1)  
**File:** `src/pages/CustomerData.tsx`  
**Issue:** Displays ALL customers without pagination (1000+ items)

### Step-by-Step Implementation:

#### Step 1: Add State Variables (After line 19)
```typescript
// Add these state variables after existing useState declarations
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(50);
```

#### Step 2: Calculate Pagination (Before rendering table)
```typescript
// Add this useMemo hook after your existing jenisKlienList useMemo (around line 28)
const paginatedCustomers = React.useMemo(() => {
  if (!bulanDipilih || !dataPerBulan[bulanDipilih]) return { data: [], total: 0, totalPages: 0 };
  
  // Filter data
  const filtered = dataPerBulan[bulanDipilih]
    .filter(row => jenisKlienFilter === 'ALL' || row['Jenis Klien'] === jenisKlienFilter);
  
  // Calculate pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paged = filtered.slice(startIdx, endIdx);
  
  return { data: paged, total, totalPages };
}, [dataPerBulan, bulanDipilih, jenisKlienFilter, page, pageSize]);

// Reset to page 1 when filters change
React.useEffect(() => {
  setPage(1);
}, [bulanDipilih, jenisKlienFilter]);
```

#### Step 3: Update Table Body (Replace lines 337-351)
```typescript
// REPLACE THIS:
{bulanDipilih && dataPerBulan[bulanDipilih] && dataPerBulan[bulanDipilih].length > 0 ? (
  dataPerBulan[bulanDipilih]
    .filter(row => jenisKlienFilter === 'ALL' || row['Jenis Klien'] === jenisKlienFilter)
    .map((row, i) => (
      <TableRow key={i}>
        {CUSTOMER_HEADERS.map(h => (
          <TableCell key={h}>{row[h]}</TableCell>
        ))}
      </TableRow>
    ))
) : (
  <TableRow>
    <TableCell colSpan={CUSTOMER_HEADERS.length} className="text-center py-8 text-gray-400">Belum ada data</TableCell>
  </TableRow>
)}

// WITH THIS:
{paginatedCustomers.data.length > 0 ? (
  paginatedCustomers.data.map((row, i) => (
    <TableRow key={i}>
      {CUSTOMER_HEADERS.map(h => (
        <TableCell key={h}>{row[h]}</TableCell>
      ))}
    </TableRow>
  ))
) : (
  <TableRow>
    <TableCell colSpan={CUSTOMER_HEADERS.length} className="text-center py-8 text-gray-400">
      Belum ada data
    </TableCell>
  </TableRow>
)}
```

#### Step 4: Add Pagination Controls (After table, before closing tag)
```typescript
// Add this AFTER the table closing </table> tag (around line 354)
{/* Pagination Controls */}
{paginatedCustomers.total > pageSize && (
  <div className="py-5 px-5 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    {/* Page Size Selector */}
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Size:</span>
      <select 
        value={pageSize} 
        onChange={(e) => { 
          setPageSize(Number(e.target.value));
          setPage(1);
        }}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={200}>200</option>
      </select>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Showing {Math.min((page - 1) * pageSize + 1, paginatedCustomers.total)} to {Math.min(page * pageSize, paginatedCustomers.total)} of {paginatedCustomers.total}
      </span>
    </div>
    
    {/* Navigation Controls */}
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => setPage(1)} 
        disabled={page === 1}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="First page"
      >
        ««
      </button>
      <button 
        onClick={() => setPage(p => Math.max(1, p - 1))} 
        disabled={page === 1}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Previous page"
      >
        ‹
      </button>
      <span className="w-10 h-10 bg-blue-600 text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full">
        {page}
      </span>
      <button 
        onClick={() => setPage(p => Math.min(paginatedCustomers.totalPages, p + 1))} 
        disabled={page >= paginatedCustomers.totalPages}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Next page"
      >
        ›
      </button>
      <button 
        onClick={() => setPage(paginatedCustomers.totalPages)}
        disabled={page >= paginatedCustomers.totalPages}
        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Last page"
      >
        »»
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {page} of {paginatedCustomers.totalPages}
      </span>
    </div>
  </div>
)}
```

#### Step 5: Update Summary Card (Optional)
```typescript
// Update the first SummaryCard (around line 242) to show paginated info
<SummaryCard
  icon={<TableChartIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.10))' }} />}
  title={`Total Customer Bulan ${bulanDipilih}`}
  value={paginatedCustomers.total}  // Changed from dataPerBulan[bulanDipilih]?.length
  description={`Jumlah customer pada bulan ${bulanDipilih}`}
  iconBg="bg-blue-700"
  className="w-full"
/>
```

### Testing Checklist:
- [ ] Page loads with default page size (50)
- [ ] First page button disabled on page 1
- [ ] Last page button disabled on last page
- [ ] Page size change resets to page 1
- [ ] Filter change resets to page 1
- [ ] "Showing X to Y of Z" displays correctly
- [ ] Page indicator shows correct page number
- [ ] Performance is fast (<500ms)

---

## 2. 🟠 HIGH PRIORITY: SiteAnalytics.tsx

**Priority:** HIGH (Week 2)  
**File:** `src/pages/SiteAnalytics.tsx`  
**Issue:** Displays all sites without pagination (100+ sites)

### Implementation:

#### Step 1: Add State (around line 100)
```typescript
// Add after existing state declarations
const [sitesPage, setSitesPage] = useState(1);
const [sitesPageSize, setSitesPageSize] = useState(20);
```

#### Step 2: Find the site risk cards section and add pagination
```typescript
// Find where site risk cards are mapped (look for .map() rendering site cards)
// Add this before the .map():

const paginatedSites = useMemo(() => {
  // Assuming siteRiskData or similar contains the sites
  const sites = siteRiskData || []; // Replace with actual site data variable
  const total = sites.length;
  const totalPages = Math.max(1, Math.ceil(total / sitesPageSize));
  const startIdx = (sitesPage - 1) * sitesPageSize;
  const paged = sites.slice(startIdx, startIdx + sitesPageSize);
  
  return { sites: paged, total, totalPages };
}, [siteRiskData, sitesPage, sitesPageSize]); // Adjust dependencies
```

#### Step 3: Update rendering to use paginatedSites
```typescript
// REPLACE this pattern:
{siteRiskData.map((site, index) => (
  // ... site card JSX
))}

// WITH this:
{paginatedSites.sites.map((site, index) => (
  // ... site card JSX (same as before)
))}
```

#### Step 4: Add Pagination Controls
```typescript
{/* Add after site cards section */}
{paginatedSites.total > sitesPageSize && (
  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
    {/* Page Size */}
    <div className="flex items-center gap-2">
      <span className="text-sm">Sites per page:</span>
      <select
        value={sitesPageSize}
        onChange={(e) => {
          setSitesPageSize(Number(e.target.value));
          setSitesPage(1);
        }}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
    </div>
    
    {/* Navigation */}
    <div className="flex items-center space-x-2">
      <button onClick={() => setSitesPage(1)} disabled={sitesPage === 1}>««</button>
      <button onClick={() => setSitesPage(p => p - 1)} disabled={sitesPage === 1}>‹</button>
      <span className="px-3 py-1 bg-blue-600 text-white rounded">{sitesPage}</span>
      <button onClick={() => setSitesPage(p => p + 1)} disabled={sitesPage >= paginatedSites.totalPages}>›</button>
      <button onClick={() => setSitesPage(paginatedSites.totalPages)} disabled={sitesPage >= paginatedSites.totalPages}>»»</button>
      <span className="text-sm">Page {sitesPage} of {paginatedSites.totalPages}</span>
    </div>
  </div>
)}
```

---

## 3. 🟠 HIGH PRIORITY: TSAnalytics.tsx

**Priority:** HIGH (Week 2)  
**File:** `src/pages/TSAnalytics.tsx`  
**Issue:** Large tables without pagination (500+ rows)

### Implementation:

This file has multiple tables. Let's add pagination to the main TS Performance table.

#### Step 1: Add State
```typescript
// Add near other state declarations
const [tsTablePage, setTsTablePage] = useState(1);
const [tsTablePageSize, setTsTablePageSize] = useState(50);
```

#### Step 2: Find the TS Performance table data preparation
```typescript
// Look for where TS performance data is prepared (likely around line 500-700)
// Add pagination logic:

const paginatedTSPerformance = useMemo(() => {
  // Replace 'tsPerformanceData' with actual variable name
  const data = tsPerformanceData || [];
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / tsTablePageSize));
  const startIdx = (tsTablePage - 1) * tsTablePageSize;
  const paged = data.slice(startIdx, startIdx + tsTablePageSize);
  
  return { data: paged, total, totalPages };
}, [tsPerformanceData, tsTablePage, tsTablePageSize]);
```

#### Step 3: Update table to use paginated data
```typescript
// REPLACE:
{tsPerformanceData.map((ts, index) => (
  <tr key={index}>
    {/* ... cells */}
  </tr>
))}

// WITH:
{paginatedTSPerformance.data.map((ts, index) => (
  <tr key={index}>
    {/* ... cells (same as before) */}
  </tr>
))}
```

#### Step 4: Add Pagination Controls after table
```typescript
{/* Add after </table> */}
{paginatedTSPerformance.total > tsTablePageSize && (
  <div className="py-4 px-4 flex sm:flex-row items-center justify-between gap-4 border-t">
    <div className="flex items-center gap-2">
      <span className="text-sm">Rows:</span>
      <select
        value={tsTablePageSize}
        onChange={(e) => {
          setTsTablePageSize(Number(e.target.value));
          setTsTablePage(1);
        }}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
    <div className="flex items-center space-x-2">
      <button onClick={() => setTsTablePage(1)} disabled={tsTablePage === 1}>««</button>
      <button onClick={() => setTsTablePage(p => p - 1)} disabled={tsTablePage === 1}>‹</button>
      <span className="px-3 py-1 bg-blue-600 text-white rounded">{tsTablePage}</span>
      <button onClick={() => setTsTablePage(p => p + 1)} disabled={tsTablePage >= paginatedTSPerformance.totalPages}>›</button>
      <button onClick={() => setTsTablePage(paginatedTSPerformance.totalPages)} disabled={tsTablePage >= paginatedTSPerformance.totalPages}>»»</button>
      <span className="text-sm">Page {tsTablePage} of {paginatedTSPerformance.totalPages}</span>
    </div>
  </div>
)}
```

**Note:** Repeat this pattern for other large tables in TSAnalytics.tsx (site-level breakdown, monthly breakdown).

---

## 4. 🟡 MEDIUM PRIORITY: Enhance KanbanBoard.tsx

**Priority:** MEDIUM (Week 3)  
**File:** `src/components/KanbanBoard.tsx`  
**Issue:** Basic pagination without page size selector

### Enhancement:

#### Step 1: Update State (around line 42)
```typescript
// REPLACE:
const [page, setPage] = useState(1);
const pageSize = 20;

// WITH:
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20); // Now configurable!
```

#### Step 2: Replace Pagination Controls (lines 1572-1590)
```typescript
// REPLACE the existing simple pagination WITH this enhanced version:
{totalPages > 1 && (
  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 mb-4 px-4 py-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
    {/* Page size selector - NEW! */}
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
      <select
        value={pageSize}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(1); // Reset to page 1 when changing size
        }}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        ({filteredCustomers.length} total)
      </span>
    </div>

    {/* Navigation controls - ENHANCED! */}
    <div className="flex items-center gap-3">
      {/* First page button - NEW! */}
      <button
        onClick={() => setPage(1)}
        disabled={page === 1}
        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        title="First page"
      >
        ««
      </button>
      
      {/* Previous button - EXISTING */}
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page === 1}
        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
      >
        &laquo; Previous
      </button>
      
      {/* Page indicator - EXISTING */}
      <span className="text-gray-600 dark:text-gray-400 font-medium px-3 py-2">
        Page {page} of {totalPages}
      </span>
      
      {/* Next button - EXISTING */}
      <button
        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
      >
        Next &raquo;
      </button>
      
      {/* Last page button - NEW! */}
      <button
        onClick={() => setPage(totalPages)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        title="Last page"
      >
        »»
      </button>
    </div>
  </div>
)}
```

---

## 5. 🟡 MEDIUM PRIORITY: Upload Preview

**Priority:** MEDIUM (Week 3)  
**File:** `src/pages/incident_upload_fixed.jsx`  
**Issue:** Preview hard-coded to 20 rows

### Implementation:

#### Step 1: Add State in IncidentUpload component (around line 250)
```typescript
const [previewPage, setPreviewPage] = useState(1);
const [previewPageSize, setPreviewPageSize] = useState(20);
```

#### Step 2: Update upload result to include all rows (around line 470)
```typescript
// REPLACE:
preview: allRows.slice(0, 20),

// WITH:
preview: allRows, // Include all rows, paginate in UI
```

#### Step 3: Add pagination to preview rendering (around line 616)
```typescript
// Add before the preview table:
const paginatedPreview = useMemo(() => {
  if (!uploadResult?.preview) return { data: [], total: 0, totalPages: 0 };
  
  const total = uploadResult.preview.length;
  const totalPages = Math.max(1, Math.ceil(total / previewPageSize));
  const startIdx = (previewPage - 1) * previewPageSize;
  const paged = uploadResult.preview.slice(startIdx, startIdx + previewPageSize);
  
  return { data: paged, total, totalPages };
}, [uploadResult?.preview, previewPage, previewPageSize]);

// REPLACE the preview section:
{uploadResult.preview.length > 0 && (
  <div>
    <h4 className="font-medium mb-2">Preview (first 20 rows):</h4>  {/* UPDATE THIS TEXT */}
    ...
  </div>
)}

// WITH:
{uploadResult.preview.length > 0 && (
  <div>
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-medium">
        Preview: Showing {Math.min((previewPage - 1) * previewPageSize + 1, paginatedPreview.total)} to {Math.min(previewPage * previewPageSize, paginatedPreview.total)} of {paginatedPreview.total} rows
      </h4>
      <select
        value={previewPageSize}
        onChange={(e) => {
          setPreviewPageSize(Number(e.target.value));
          setPreviewPage(1);
        }}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
      </select>
    </div>
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        {/* ... existing table header ... */}
        <tbody>
          {paginatedPreview.data.map((inc, i) => {
            // ... existing row rendering ...
          })}
        </tbody>
      </table>
    </div>
    
    {/* Add pagination controls */}
    {paginatedPreview.totalPages > 1 && (
      <div className="mt-4 flex items-center justify-center space-x-2">
        <button onClick={() => setPreviewPage(1)} disabled={previewPage === 1}>««</button>
        <button onClick={() => setPreviewPage(p => p - 1)} disabled={previewPage === 1}>‹</button>
        <span className="px-3 py-1 bg-blue-600 text-white rounded">{previewPage}</span>
        <button onClick={() => setPreviewPage(p => p + 1)} disabled={previewPage >= paginatedPreview.totalPages}>›</button>
        <button onClick={() => setPreviewPage(paginatedPreview.totalPages)} disabled={previewPage >= paginatedPreview.totalPages}>»»</button>
        <span className="text-sm">of {paginatedPreview.totalPages}</span>
      </div>
    )}
  </div>
)}
```

---

## 6. 🔧 Reusable Hook: usePagination

Create a new file: `src/hooks/usePagination.ts`

```typescript
import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationProps<T> {
  items: T[];
  initialPageSize?: number;
}

export interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedItems: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export function usePagination<T>({
  items,
  initialPageSize = 50
}: UsePaginationProps<T>): UsePaginationReturn<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedItems = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return items.slice(startIdx, endIdx);
  }, [items, page, pageSize]);

  const goToPage = useCallback((newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page when changing page size
  }, []);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    setPageSize,
    canGoNext: page < totalPages,
    canGoPrev: page > 1
  };
}
```

### Usage Example:
```typescript
import { usePagination } from '@/hooks/usePagination';

function MyComponent() {
  const [data, setData] = useState([/* ... */]);
  
  const pagination = usePagination({
    items: data,
    initialPageSize: 50
  });

  return (
    <div>
      {/* Render paginated items */}
      {pagination.paginatedItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
      
      {/* Pagination controls */}
      <PaginationControls {...pagination} />
    </div>
  );
}
```

---

## 7. 🔧 Reusable Component: PaginationControls

Create a new file: `src/components/ui/PaginationControls.tsx`

```typescript
import React from 'react';

export interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  firstPage: () => void;
  prevPage: () => void;
  nextPage: () => void;
  lastPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  pageSizeOptions?: number[];
  showInfo?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  pageSize,
  totalPages,
  totalItems,
  firstPage,
  prevPage,
  nextPage,
  lastPage,
  setPageSize,
  canGoNext,
  canGoPrev,
  pageSizeOptions = [10, 25, 50, 100],
  showInfo = true
}) => {
  const startItem = Math.min((page - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="py-5 px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-200 dark:border-gray-700">
      {/* Page Size Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Page Size:
        </span>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        {showInfo && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startItem} to {endItem} of {totalItems}
          </span>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={firstPage}
          disabled={!canGoPrev}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="First page"
          aria-label="Go to first page"
        >
          ««
        </button>
        <button
          onClick={prevPage}
          disabled={!canGoPrev}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Previous page"
          aria-label="Go to previous page"
        >
          ‹
        </button>
        <span className="w-10 h-10 bg-blue-600 text-white p-2 inline-flex items-center justify-center text-sm font-medium rounded-full">
          {page}
        </span>
        <button
          onClick={nextPage}
          disabled={!canGoNext}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Next page"
          aria-label="Go to next page"
        >
          ›
        </button>
        <button
          onClick={lastPage}
          disabled={!canGoNext}
          className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Last page"
          aria-label="Go to last page"
        >
          »»
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
          Page {page} of {totalPages}
        </span>
      </div>
    </div>
  );
};
```

### Usage with usePagination Hook:
```typescript
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/PaginationControls';

function MyComponent() {
  const [data, setData] = useState([/* ... */]);
  
  const pagination = usePagination({
    items: data,
    initialPageSize: 50
  });

  return (
    <div>
      {/* Your content */}
      <table>
        {/* ... */}
        <tbody>
          {pagination.paginatedItems.map(item => (
            <tr key={item.id}>
              {/* ... */}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination - Single line! */}
      <PaginationControls {...pagination} />
    </div>
  );
}
```

---

## 🧪 Testing Guide

### Unit Tests (Optional but Recommended)

Create test file: `src/hooks/__tests__/usePagination.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));

  it('should paginate data correctly', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockData, initialPageSize: 10 })
    );

    expect(result.current.totalPages).toBe(10);
    expect(result.current.paginatedItems.length).toBe(10);
    expect(result.current.page).toBe(1);
  });

  it('should navigate to next page', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockData, initialPageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
  });

  it('should reset page when changing page size', () => {
    const { result } = renderHook(() =>
      usePagination({ items: mockData, initialPageSize: 10 })
    );

    act(() => {
      result.current.goToPage(5);
      result.current.setPageSize(20);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(5);
  });
});
```

### Manual Testing Checklist

For each page you implement pagination on:

```
Page: _________________

Functionality:
[ ] First page button works
[ ] Previous page button works
[ ] Next page button works
[ ] Last page button works
[ ] Page size selector works
[ ] Changing page size resets to page 1
[ ] Filter changes reset to page 1
[ ] Page indicator is accurate
[ ] Item count is accurate
[ ] Buttons disable correctly

Edge Cases:
[ ] Works with 0 items
[ ] Works with 1 item
[ ] Works with exactly pageSize items
[ ] Works with pageSize + 1 items
[ ] Works with 1000+ items

Performance:
[ ] Page load < 500ms
[ ] No lag on page change
[ ] No memory leaks

UI/UX:
[ ] Responsive on mobile
[ ] Works in dark mode
[ ] Keyboard navigation works
[ ] Screen reader friendly
[ ] Consistent styling
```

---

## 📝 Commit Message Templates

### For Critical Fix (CustomerData)
```
fix(CustomerData): Add pagination for customer table

- Add page state management with 50 items per page
- Implement full pagination controls (First/Prev/Next/Last)
- Add page size selector (25, 50, 100, 200)
- Reset to page 1 on filter changes
- Improve performance for 1000+ customers

Fixes #XXX
```

### For Enhancement (KanbanBoard)
```
feat(KanbanBoard): Enhance pagination controls

- Add configurable page size selector
- Add First/Last page buttons
- Improve UI consistency with other paginated pages
- Add keyboard navigation support

Part of pagination standardization initiative
```

### For New Hook/Component
```
feat: Add reusable pagination hook and component

- Create usePagination hook for state management
- Create PaginationControls component for UI
- Add TypeScript types and interfaces
- Include comprehensive documentation
- Add unit tests

This enables consistent pagination across all pages
```

---

## 🔗 Additional Resources

- **Full Audit Report:** [PAGINATION-AUDIT-REPORT.md](./PAGINATION-AUDIT-REPORT.md)
- **Quick Summary:** [PAGINATION-AUDIT-SUMMARY.md](./PAGINATION-AUDIT-SUMMARY.md)
- **Visual Status:** [PAGINATION-VISUAL-STATUS.md](./PAGINATION-VISUAL-STATUS.md)
- **Reference Implementation:** `src/components/GridView.tsx`
- **Utility Functions:** `src/utils/incidentUtils.ts`

---

## 💡 Tips and Best Practices

1. **Always Reset to Page 1** when filters change
2. **Use useMemo** for pagination calculations to avoid unnecessary recalculations
3. **Disable buttons** appropriately (first/prev on page 1, next/last on last page)
4. **Show item counts** to help users understand what they're viewing
5. **Provide multiple page sizes** to accommodate different use cases
6. **Test with edge cases** (0 items, 1 item, exact page size, etc.)
7. **Keep styling consistent** with existing pages
8. **Add keyboard navigation** for accessibility
9. **Optimize performance** - pagination should be fast (<500ms)
10. **Document your changes** in code comments

---

**Last Updated:** October 10, 2025  
**Maintained by:** Development Team




