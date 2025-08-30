import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Incident } from '@/types/incident';
import { mkId, parseDateSafe, saveIncidentsChunked, generateBatchId } from '@/utils/incidentUtils';
import { fixAllMissingEndTime } from '@/utils/durationFixUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import TableChartIcon from '@mui/icons-material/TableChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import DescriptionIcon from '@mui/icons-material/Description';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  preview: Incident[];
  uploadLog: UploadLogEntry[];
  totalRowsProcessed: number;
  totalRowsInFile: number;
  skippedRows: number;
}

interface UploadLogEntry {
  type: 'success' | 'error' | 'skipped' | 'info';
  row: number;
  sheet: string;
  message: string;
  noCase?: string;
  details?: any;
}

const REQUIRED_HEADERS = [
  'Priority', 'Site', 'No Case', 'NCAL', 'Status', 'Level', 'TS', 'ODP/BTS',
  'Start', 'Start Escalation Vendor', 'End', 'Duration', 'Duration Vendor',
  'Problem', 'Penyebab', 'Action Terakhir', 'Note', 'Klasifikasi Gangguan',
  'Power Before', 'Power After', 'Pause', 'Restart', 'Pause2', 'Restart2',
  'Total Duration Pause', 'Total Duration Vendor'
];

export const IncidentUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [showDetailedLog, setShowDetailedLog] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setProgress(0);
    setUploadResult(null);

    try {
      const file = acceptedFiles[0];
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      
      const allRows: Incident[] = [];
      const errors: string[] = [];
      const uploadLog: UploadLogEntry[] = [];
      let successCount = 0;
      let failedCount = 0;
      let totalRowsInFile = 0;
      let totalRowsProcessed = 0;
      let skippedRows = 0;

      // Log upload start
      uploadLog.push({
        type: 'info',
        row: 0,
        sheet: 'SYSTEM',
        message: `Upload started for file: ${file.name}`,
        details: {
          fileSize: file.size,
          fileType: file.type,
          sheets: workbook.SheetNames
        }
      });

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          uploadLog.push({
            type: 'info',
            row: 0,
            sheet: sheetName,
            message: `Sheet "${sheetName}" skipped: Empty or insufficient data (${jsonData.length} rows)`
          });
          continue;
        }

        const headers = jsonData[0] as string[];
        const sheetRowCount = jsonData.length - 1; // Exclude header row
        totalRowsInFile += sheetRowCount;
        
        uploadLog.push({
          type: 'info',
          row: 0,
          sheet: sheetName,
          message: `Processing sheet "${sheetName}" with ${sheetRowCount} data rows`,
          details: {
            headers: headers,
            rowCount: sheetRowCount
          }
        });
        
        // Debug: Log all headers to help identify pause column mapping
        uploadLog.push({
          type: 'info',
          row: 0,
          sheet: sheetName,
          message: `All headers found: ${headers.join(', ')}`,
          details: {
            pauseRelatedHeaders: headers.filter(h => 
              h?.toString().toLowerCase().includes('pause') || 
              h?.toString().toLowerCase().includes('restart')
            )
          }
        });
        
        // Validate headers with flexible matching
        const missingHeaders = [];
        const headerMapping = {
          'Priority': ['priority'],
          'Site': ['site'],
          'No Case': ['no case', 'nocase', 'case'],
          'NCAL': ['ncal'],
          'Status': ['status'],
          'Level': ['level'],
          'TS': ['ts', 'technical support', 'vendor'],
          'ODP/BTS': ['odp', 'bts', 'odp/bts'],
          'Start': ['start'],
          'Start Escalation Vendor': ['start escalation vendor', 'escalation vendor'],
          'End': ['end'],
          'Duration': ['duration'],
          'Duration Vendor': ['duration vendor'],
          'Problem': ['problem'],
          'Penyebab': ['penyebab', 'cause'],
          'Action Terakhir': ['action terakhir', 'action', 'last action'],
          'Note': ['note'],
          'Klasifikasi Gangguan': ['klasifikasi gangguan', 'klasifikasi'],
          'Power Before': ['power before', 'powerbefore'],
          'Power After': ['power after', 'powerafter'],
          'Pause': ['pause', 'start pause'],
          'Restart': ['restart', 'end pause'],
          'Pause2': ['pause2', 'pause 2', 'start pause 2'],
          'Restart2': ['restart2', 'restart 2', 'end pause 2'],
          'Total Duration Pause': ['total duration pause', 'total pause'],
          'Total Duration Vendor': ['total duration vendor', 'total vendor']
        };

        for (const requiredHeader of REQUIRED_HEADERS) {
          const possibleNames = headerMapping[requiredHeader] || [requiredHeader.toLowerCase()];
          const found = headers.some(header => 
            possibleNames.some(name => 
              header?.toString().toLowerCase().includes(name)
            )
          );
          if (!found) {
            missingHeaders.push(requiredHeader);
          }
        }

        if (missingHeaders.length > 0) {
          const errorMsg = `Sheet "${sheetName}": Missing headers: ${missingHeaders.join(', ')}`;
          errors.push(errorMsg);
          uploadLog.push({
            type: 'error',
            row: 0,
            sheet: sheetName,
            message: errorMsg,
            details: {
              missingHeaders,
              availableHeaders: headers,
              headerMapping: headerMapping
            }
          });
          continue;
        }

        // Process rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          totalRowsProcessed++;
          
          if (!row || row.length === 0) {
            uploadLog.push({
              type: 'skipped',
              row: i + 1,
              sheet: sheetName,
              message: 'Empty row - no data found'
            });
            skippedRows++;
            continue;
          }

          // Skip completely empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasData) {
            uploadLog.push({
              type: 'skipped',
              row: i + 1,
              sheet: sheetName,
              message: 'Row contains no meaningful data (all cells empty or null)'
            });
            skippedRows++;
            continue;
          }

          try {
            const incident = parseRowToIncident(headers, row, i + 1, sheetName, uploadLog);
            if (incident) {
              allRows.push(incident);
              successCount++;
              uploadLog.push({
                type: 'success',
                row: i + 1,
                sheet: sheetName,
                message: `Successfully processed incident`,
                noCase: incident.noCase,
                details: {
                  site: incident.site,
                  priority: incident.priority,
                  status: incident.status,
                  ncal: incident.ncal
                }
              });
            } else {
              uploadLog.push({
                type: 'skipped',
                row: i + 1,
                sheet: sheetName,
                message: 'Row skipped: Missing required data (No Case or Start time)',
                details: {
                  noCase: row[headers.findIndex(h => h?.toString().toLowerCase().includes('no case'))],
                  startTime: row[headers.findIndex(h => h?.toString().toLowerCase().includes('start'))]
                }
              });
              skippedRows++;
            }
          } catch (error) {
            const errorMsg = `Row ${i + 1} in "${sheetName}": ${error}`;
            errors.push(errorMsg);
            failedCount++;
            uploadLog.push({
              type: 'error',
              row: i + 1,
              sheet: sheetName,
              message: errorMsg,
              details: {
                rowData: row,
                headers: headers
              }
            });
          }
        }

        setProgress((workbook.SheetNames.indexOf(sheetName) + 1) / workbook.SheetNames.length * 50);
      }

      // Fix missing endTime and duration issues automatically
      if (allRows.length > 0) {
        setProgress(60);
        uploadLog.push({
          type: 'info',
          row: 0,
          sheet: 'DURATION_FIX',
          message: `Fixing missing endTime and duration issues...`
        });
        
        // Fix missing endTime first
        const { fixedIncidents: incidentsWithEndTime, fixedCount: endTimeFixed } = fixAllMissingEndTime(allRows);
        
        if (endTimeFixed > 0) {
          uploadLog.push({
            type: 'success',
            row: 0,
            sheet: 'DURATION_FIX',
            message: `Fixed ${endTimeFixed} incidents with missing endTime`
          });
        }
        
        // Recalculate all durations automatically based on start/end times
        const finalIncidents = incidentsWithEndTime.map(incident => {
          const updatedIncident = { ...incident };
          
          // Helper function untuk menghitung durasi
          const calculateDuration = (startTime: string | null, endTime: string | null): number => {
            if (!startTime || !endTime) return 0;
            try {
              const start = new Date(startTime);
              const end = new Date(endTime);
              if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
              const diffMs = end.getTime() - start.getTime();
              const diffMinutes = diffMs / (1000 * 60);
              return Math.max(0, diffMinutes);
            } catch (error) {
              return 0;
            }
          };

          // 1. Recalculate Duration (Start → End)
          if (incident.startTime && incident.endTime) {
            const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
            if (calculatedDuration > 0 && calculatedDuration <= 1440) {
              updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
            } else {
              updatedIncident.durationMin = 0;
            }
          } else {
            updatedIncident.durationMin = 0;
          }

          // 2. Recalculate Duration Vendor (Start Escalation Vendor → End)
          if (incident.startEscalationVendor && incident.endTime) {
            const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
            if (calculatedVendorDuration > 0 && calculatedVendorDuration <= 1440) {
              updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
            } else {
              updatedIncident.durationVendorMin = 0;
            }
          } else {
            updatedIncident.durationVendorMin = 0;
          }

          // 3. Recalculate Total Duration Pause (Pause 1 + Pause 2)
          let totalPauseMinutes = 0;
          if (incident.startPause1 && incident.endPause1) {
            const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
            if (pause1Duration > 0 && pause1Duration <= 1440) {
              totalPauseMinutes += pause1Duration;
            }
          }
          if (incident.startPause2 && incident.endPause2) {
            const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
            if (pause2Duration > 0 && pause2Duration <= 1440) {
              totalPauseMinutes += pause2Duration;
            }
          }
          updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;

          // 4. Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
          const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
          updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;



          return updatedIncident;
        });
        
        const durationFixed = finalIncidents.filter(inc => inc.durationMin > 0).length;
        
        if (durationFixed > 0) {
          uploadLog.push({
            type: 'success',
            row: 0,
            sheet: 'DURATION_FIX',
            message: `Fixed ${durationFixed} incidents with incorrect duration based on Excel data`
          });
          
          // Log automatic recalculation
          uploadLog.push({
            type: 'info',
            row: 0,
            sheet: 'DURATION_FIX',
            message: `All durations recalculated automatically based on start/end times`
          });
        }
        
        setProgress(80);
        uploadLog.push({
          type: 'info',
          row: 0,
          sheet: 'DATABASE',
          message: `Saving ${finalIncidents.length} incidents to database...`
        });
        
        await saveIncidentsChunked(finalIncidents);
        
        uploadLog.push({
          type: 'success',
          row: 0,
          sheet: 'DATABASE',
          message: `Successfully saved ${finalIncidents.length} incidents to database with automatic duration fixes`
        });
        
        setProgress(100);
      }

      // Final summary log
      uploadLog.push({
        type: 'info',
        row: 0,
        sheet: 'SUMMARY',
        message: `Upload completed. Summary: ${successCount} success, ${failedCount} failed, ${skippedRows} skipped out of ${totalRowsInFile} total rows in file`,
        details: {
          successCount,
          failedCount,
          skippedRows,
          totalRowsInFile,
          totalRowsProcessed
        }
      });

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
        preview: allRows.slice(0, 20),
        uploadLog,
        totalRowsProcessed,
        totalRowsInFile,
        skippedRows
      });

    } catch (error) {
      const errorMsg = `Upload failed: ${error}`;
      setUploadResult({
        success: 0,
        failed: 1,
        errors: [errorMsg],
        preview: [],
        uploadLog: [{
          type: 'error',
          row: 0,
          sheet: 'SYSTEM',
          message: errorMsg
        }],
        totalRowsProcessed: 0,
        totalRowsInFile: 0,
        skippedRows: 0
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const downloadTemplate = () => {
    const templateData = [
      REQUIRED_HEADERS,
      // Add example row with comments
      ['High', 'Site A', 'INC-001', 'Red', 'Open', '1', 'TS1', 'ODP001', 
       '2024-01-01 08:00:00', '2024-01-01 08:30:00', '2024-01-01 10:00:00', '2:00:00', '1:30:00',
       'Network Issue', 'Hardware Failure', 'Replaced Equipment', 'Resolved', 'Hardware',
       '-25.5', '-20.1', '2024-01-01 08:45:00', '2024-01-01 09:00:00', '', '',
       '0:15:00', '1:30:00']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'incident_template.xlsx');
  };

  const exportUploadLog = () => {
    if (!uploadResult?.uploadLog) return;
    
    const logData = uploadResult.uploadLog.map(entry => ({
      Timestamp: new Date().toISOString(),
      Type: entry.type.toUpperCase(),
      Sheet: entry.sheet,
      Row: entry.row,
      NoCase: entry.noCase || '',
      Message: entry.message,
      Details: entry.details ? JSON.stringify(entry.details) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(logData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Upload Log');
    XLSX.writeFile(wb, `incident_upload_log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Function to fix existing data in database
  const fixExistingData = async () => {
    try {
      setIsUploading(true);
      setProgress(0);
      
      // Import database functions
      const { db } = await import('@/lib/db');
      
      // Get all existing incidents
      const allIncidents = await db.incidents.toArray();
      
      if (allIncidents.length === 0) {
        setUploadResult({
          success: 0,
          failed: 0,
          errors: ['No incidents found in database'],
          preview: [],
          uploadLog: [{
            type: 'info',
            row: 0,
            sheet: 'FIX_EXISTING',
            message: 'No incidents found in database to fix'
          }],
          totalRowsProcessed: 0,
          totalRowsInFile: 0,
          skippedRows: 0
        });
        return;
      }
      
      setProgress(20);
      
      // Fix missing endTime
      const { fixedIncidents: incidentsWithEndTime, fixedCount: endTimeFixed } = fixAllMissingEndTime(allIncidents);
      
      setProgress(40);
      
      // Recalculate all durations automatically
      const finalIncidents = incidentsWithEndTime.map(incident => {
        const updatedIncident = { ...incident };
        
        // Helper function untuk menghitung durasi
        const calculateDuration = (startTime: string | null, endTime: string | null): number => {
          if (!startTime || !endTime) return 0;
          try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
            const diffMs = end.getTime() - start.getTime();
            const diffMinutes = diffMs / (1000 * 60);
            return Math.max(0, diffMinutes);
          } catch (error) {
            return 0;
          }
        };

        // 1. Recalculate Duration (Start → End)
        if (incident.startTime && incident.endTime) {
          const calculatedDuration = calculateDuration(incident.startTime, incident.endTime);
          if (calculatedDuration > 0 && calculatedDuration <= 1440) {
            updatedIncident.durationMin = Math.round(calculatedDuration * 100) / 100;
          } else {
            updatedIncident.durationMin = 0;
          }
        } else {
          updatedIncident.durationMin = 0;
        }

        // 2. Recalculate Duration Vendor (Start Escalation Vendor → End)
        if (incident.startEscalationVendor && incident.endTime) {
          const calculatedVendorDuration = calculateDuration(incident.startEscalationVendor, incident.endTime);
          if (calculatedVendorDuration > 0 && calculatedVendorDuration <= 1440) {
            updatedIncident.durationVendorMin = Math.round(calculatedVendorDuration * 100) / 100;
          } else {
            updatedIncident.durationVendorMin = 0;
          }
        } else {
          updatedIncident.durationVendorMin = 0;
        }

        // 3. Recalculate Total Duration Pause (Pause 1 + Pause 2)
        let totalPauseMinutes = 0;
        if (incident.startPause1 && incident.endPause1) {
          const pause1Duration = calculateDuration(incident.startPause1, incident.endPause1);
          if (pause1Duration > 0 && pause1Duration <= 1440) {
            totalPauseMinutes += pause1Duration;
          }
        }
        if (incident.startPause2 && incident.endPause2) {
          const pause2Duration = calculateDuration(incident.startPause2, incident.endPause2);
          if (pause2Duration > 0 && pause2Duration <= 1440) {
            totalPauseMinutes += pause2Duration;
          }
        }
        updatedIncident.totalDurationPauseMin = Math.round(totalPauseMinutes * 100) / 100;

        // 4. Recalculate Total Duration Vendor (Duration Vendor - Total Duration Pause)
        const totalVendorDuration = Math.max(updatedIncident.durationVendorMin - updatedIncident.totalDurationPauseMin, 0);
        updatedIncident.totalDurationVendorMin = Math.round(totalVendorDuration * 100) / 100;



        return updatedIncident;
      });
      
      const durationFixed = finalIncidents.filter(inc => inc.durationMin > 0).length;
      
      setProgress(60);
      
      // Update database with fixed incidents
      let updateCount = 0;
      for (const incident of finalIncidents) {
        await db.incidents.update(incident.id, incident);
        updateCount++;
      }
      
      setProgress(100);
      
      // Create result log
      const uploadLog: UploadLogEntry[] = [
        {
          type: 'info',
          row: 0,
          sheet: 'FIX_EXISTING',
          message: `Started fixing ${allIncidents.length} existing incidents`
        }
      ];
      
      if (endTimeFixed > 0) {
        uploadLog.push({
          type: 'success',
          row: 0,
          sheet: 'FIX_EXISTING',
          message: `Fixed ${endTimeFixed} incidents with missing endTime`
        });
      }
      
      if (durationFixed > 0) {
        uploadLog.push({
          type: 'success',
          row: 0,
          sheet: 'FIX_EXISTING',
          message: `Fixed ${durationFixed} incidents with incorrect duration`
        });
        
        // Log automatic recalculation
        uploadLog.push({
          type: 'info',
          row: 0,
          sheet: 'FIX_EXISTING',
          message: `All durations recalculated automatically based on start/end times`
        });
        

      }
      
      uploadLog.push({
        type: 'success',
        row: 0,
        sheet: 'FIX_EXISTING',
        message: `Successfully updated ${updateCount} incidents in database`
      });
      
      setUploadResult({
        success: updateCount,
        failed: 0,
        errors: [],
        preview: finalIncidents.slice(0, 20),
        uploadLog,
        totalRowsProcessed: allIncidents.length,
        totalRowsInFile: allIncidents.length,
        skippedRows: 0
      });
      
    } catch (error) {
      const errorMsg = `Fix existing data failed: ${error}`;
      setUploadResult({
        success: 0,
        failed: 1,
        errors: [errorMsg],
        preview: [],
        uploadLog: [{
          type: 'error',
          row: 0,
          sheet: 'FIX_EXISTING',
          message: errorMsg
        }],
        totalRowsProcessed: 0,
        totalRowsInFile: 0,
        skippedRows: 0
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getLogEntryIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error': return <CancelIcon className="w-4 h-4 text-red-500" />;
      case 'skipped': return <WarningAmberIcon className="w-4 h-4 text-yellow-500" />;
      case 'info': return <InfoIcon className="w-4 h-4 text-blue-500" />;
              default: return <DescriptionIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getLogEntryColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800';
      case 'error': return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800';
      case 'skipped': return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info': return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800';
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
                            <TableChartIcon className="w-5 h-5" />
            Upload Incident Data
          </CardTitle>
          <CardDescription>
            Upload Excel file with incident data. The file should contain all required columns.
            <br />
            <span className="text-xs text-gray-500 mt-1 block">
              Note: Level field accepts values 1-500 based on handling duration, not just 1-10.
            </span>
            <br />
            <span className="text-xs text-green-600 mt-1 block font-medium">
              ✅ Automatic Duration Fix: Missing endTime and incorrect durations will be automatically corrected based on Excel data.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : ' hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <input {...getInputProps()} />
              <CloudUploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {isDragActive ? (
                <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                  Drop the Excel file here...
                </p>
              ) : (
                <div>
                  <p className="text-lg font-medium text-card-foreground">
                    Drag & drop an Excel file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Supports .xlsx and .xls files
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button onClick={downloadTemplate} variant="outline" size="sm">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button 
                  onClick={fixExistingData} 
                  variant="outline" 
                  size="sm"
                  disabled={isUploading}
                  className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                >
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Fix Existing Data
                </Button>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {uploadResult && (
              <div className="space-y-4">
                {/* Summary Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg ring-1 ring-green-200 dark:ring-green-800">
                    <div className="text-lg font-bold text-green-600">{uploadResult.success}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Success</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ring-1 ring-red-200 dark:ring-red-800">
                    <div className="text-lg font-bold text-red-600">{uploadResult.failed}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg ring-1 ring-yellow-200 dark:ring-yellow-800">
                    <div className="text-lg font-bold text-yellow-600">{uploadResult.skippedRows}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ring-1 ring-blue-200 dark:ring-blue-800">
                    <div className="text-lg font-bold text-blue-600">{uploadResult.totalRowsInFile}</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">Total in File</div>
                  </div>
                </div>

                {/* Data Discrepancy Alert */}
                {uploadResult.success !== uploadResult.totalRowsInFile && (
                  <Alert>
                    <WarningAmberIcon className="w-4 h-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Data Discrepancy Detected:</p>
                        <div className="text-sm space-y-1">
                          <p>• Total rows in file: <strong>{uploadResult.totalRowsInFile}</strong></p>
                          <p>• Successfully uploaded: <strong>{uploadResult.success}</strong></p>
                          <p>• Failed to upload: <strong>{uploadResult.failed}</strong></p>
                          <p>• Skipped rows: <strong>{uploadResult.skippedRows}</strong></p>
                          <p className="text-red-600 font-medium">
                            Missing: <strong>{uploadResult.totalRowsInFile - uploadResult.success - uploadResult.skippedRows}</strong> rows
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          Check the detailed log below to see which rows were skipped or failed and why.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowDetailedLog(!showDetailedLog)} 
                    variant="outline" 
                    size="sm"
                  >
                    <DescriptionIcon className="w-4 h-4 mr-2" />
                    {showDetailedLog ? 'Hide' : 'Show'} Detailed Log
                  </Button>
                  <Button 
                    onClick={exportUploadLog} 
                    variant="outline" 
                    size="sm"
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Export Log
                  </Button>
                </div>

                {/* Detailed Upload Log */}
                {showDetailedLog && uploadResult.uploadLog && (
                  <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Detailed Upload Log:</h4>
                    {uploadResult.uploadLog.map((entry, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${getLogEntryColor(entry.type)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getLogEntryIcon(entry.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{entry.sheet}</span>
                              {entry.row > 0 && (
                                <span className="text-gray-500">Row {entry.row}</span>
                              )}
                              {entry.noCase && (
                                <span className="text-blue-600 font-mono">#{entry.noCase}</span>
                              )}
                            </div>
                            <p className="text-sm mt-1">{entry.message}</p>
                            {entry.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-500 cursor-pointer">
                                  Show details
                                </summary>
                                <pre className="text-xs bg-card text-card-foreground  p-2 rounded mt-1 overflow-x-auto">
                                  {JSON.stringify(entry.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadResult.errors.length > 0 && (
                  <Alert>
                    <WarningAmberIcon className="w-4 h-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Errors encountered:</p>
                        <ul className="text-sm space-y-1">
                          {uploadResult.errors.slice(0, 10).map((error, index) => (
                            <li key={index} className="text-red-600 dark:text-red-400">
                              {error}
                            </li>
                          ))}
                          {uploadResult.errors.length > 10 && (
                            <li className="text-gray-500">
                              ... and {uploadResult.errors.length - 10} more errors
                            </li>
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {uploadResult.preview.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Preview (first 20 rows):</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">No Case</th>
                            <th className="px-3 py-2 text-left">Site</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Priority</th>
                            <th className="px-3 py-2 text-left">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.preview.map((incident, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">{incident.noCase}</td>
                              <td className="px-3 py-2">{incident.site}</td>
                              <td className="px-3 py-2">{incident.status}</td>
                              <td className="px-3 py-2">{incident.priority}</td>
                              <td className="px-3 py-2">
                                {incident.durationMin ? `${Math.floor(incident.durationMin / 60)}:${String(incident.durationMin % 60).padStart(2, '0')}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function parseRowToIncident(headers: string[], row: any[], rowNum: number, sheetName: string, uploadLog?: UploadLogEntry[]): Incident | null {
  const getValue = (headerName: string) => {
    // Flexible column name matching
    const columnMapping = {
      'Priority': ['priority'],
      'Site': ['site'],
      'No Case': ['no case', 'nocase', 'case'],
      'NCAL': ['ncal'],
      'Status': ['status'],
      'Level': ['level'],
      'TS': ['ts', 'technical support', 'vendor'],
      'ODP/BTS': ['odp', 'bts', 'odp/bts'],
      'Start': ['start'],
      'Start Escalation Vendor': ['start escalation vendor', 'escalation vendor'],
      'End': ['end'],
      'Problem': ['problem'],
      'Penyebab': ['penyebab', 'cause'],
      'Action Terakhir': ['action terakhir', 'action', 'last action'],
      'Note': ['note'],
      'Klasifikasi Gangguan': ['klasifikasi gangguan', 'klasifikasi'],
      'Power Before': ['power before', 'powerbefore'],
      'Power After': ['power after', 'powerafter'],
      'Pause': ['pause', 'start pause'],
      'Restart': ['restart', 'end pause'],
      'Pause2': ['pause2', 'pause 2', 'start pause 2'],
      'Restart2': ['restart2', 'restart 2', 'end pause 2']
    };

    const possibleNames = columnMapping[headerName] || [headerName.toLowerCase()];
    const index = headers.findIndex(h => 
      possibleNames.some(name => 
        h?.toString().toLowerCase().includes(name)
      )
    );
    return index >= 0 ? row[index] : null;
  };

  const noCase = getValue('No Case');
  if (!noCase || String(noCase).trim() === '') {
    if (uploadLog) {
      uploadLog.push({
        type: 'skipped',
        row: rowNum,
        sheet: sheetName,
        message: 'Missing or empty No Case field',
        details: {
          noCase: noCase,
          rowData: row.slice(0, 5) // First 5 columns for debugging
        }
      });
    }
    return null; // Skip empty rows instead of throwing error
  }

  // Additional validation for required fields
  const startTimeRaw = getValue('Start');
  if (!startTimeRaw || String(startTimeRaw).trim() === '') {
    if (uploadLog) {
      uploadLog.push({
        type: 'skipped',
        row: rowNum,
        sheet: sheetName,
        message: 'Missing Start time field',
        noCase: String(noCase),
        details: {
          startTime: startTimeRaw,
          rowData: row.slice(0, 5)
        }
      });
    }
    return null;
  }

  const startTime = parseDateSafe(startTimeRaw);
  if (!startTime) {
    if (uploadLog) {
      uploadLog.push({
        type: 'error',
        row: rowNum,
        sheet: sheetName,
        message: 'Invalid Start time format',
        noCase: String(noCase),
        details: {
          startTimeRaw,
          expectedFormat: 'YYYY-MM-DD HH:mm:ss or similar'
        }
      });
    }
    return null;
  }

  const id = mkId(noCase, startTime);

  const incident: Incident = {
    id,
    noCase: String(noCase),
    priority: (() => {
      const priorityValue = getValue('Priority');
      if (priorityValue) {
        const validPriorities = ['High', 'Medium', 'Low'];
        const priorityStr = String(priorityValue).trim();
        if (validPriorities.includes(priorityStr)) {
          return priorityStr;
        } else {
          if (uploadLog) {
            uploadLog.push({
              type: 'error',
              row: rowNum,
              sheet: sheetName,
              message: `Invalid Priority value "${priorityValue}". Expected: High, Medium, Low`,
              noCase: String(noCase)
            });
          }
        }
      }
      return priorityValue || null;
    })(),
    site: getValue('Site') || null,
    ncal: (() => {
      const ncalValue = getValue('NCAL');
      if (ncalValue) {
        const validNCAL = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];
        const ncalStr = String(ncalValue).trim();
        if (validNCAL.includes(ncalStr)) {
          return ncalStr;
        } else {
          if (uploadLog) {
            uploadLog.push({
              type: 'error',
              row: rowNum,
              sheet: sheetName,
              message: `Invalid NCAL value "${ncalValue}". Expected: Blue, Yellow, Orange, Red, Black`,
              noCase: String(noCase)
            });
          }
        }
      }
      return ncalValue || null;
    })(),
    status: getValue('Status') || null,
    level: (() => {
      const levelValue = getValue('Level');
      if (levelValue) {
        const levelNum = Number(levelValue);
        if (Number.isInteger(levelNum) && levelNum >= 1 && levelNum <= 500) {
          return levelNum;
        } else {
          if (uploadLog) {
            uploadLog.push({
              type: 'error',
              row: rowNum,
              sheet: sheetName,
              message: `Invalid Level value "${levelValue}". Expected: 1-500 (based on handling duration)`,
              noCase: String(noCase)
            });
          }
        }
      }
      return levelValue ? Number(levelValue) : null;
    })(),
    ts: getValue('TS') || null,
    odpBts: getValue('ODP/BTS') || null,
    startTime,
    startEscalationVendor: parseDateSafe(getValue('Start Escalation Vendor')),
    endTime: parseDateSafe(getValue('End')),
    durationMin: 0, // Akan dihitung otomatis setelah upload
    durationVendorMin: 0, // Akan dihitung otomatis setelah upload
    problem: getValue('Problem') || null,
    penyebab: getValue('Penyebab') || null,
    actionTerakhir: getValue('Action Terakhir') || null,
    note: getValue('Note') || null,
    klasifikasiGangguan: getValue('Klasifikasi Gangguan') || null,
    powerBefore: (() => {
      const powerValue = getValue('Power Before');
      if (powerValue) {
        const powerNum = Number(powerValue);
        if (Number.isFinite(powerNum)) {
          // dBm values typically range from -70 to +10
          if (powerNum >= -70 && powerNum <= 10) {
            return powerNum;
          } else {
            if (uploadLog) {
              uploadLog.push({
                type: 'error',
                row: rowNum,
                sheet: sheetName,
                message: `Power Before value "${powerValue}" dBm is outside typical range (-70 to +10)`,
                noCase: String(noCase)
              });
            }
          }
        } else {
          if (uploadLog) {
            uploadLog.push({
              type: 'error',
              row: rowNum,
              sheet: sheetName,
              message: `Invalid Power Before value "${powerValue}". Expected numeric value in dBm`,
              noCase: String(noCase)
            });
          }
        }
      }
      return powerValue ? Number(powerValue) : null;
    })(),
    powerAfter: (() => {
      const powerValue = getValue('Power After');
      if (powerValue) {
        const powerNum = Number(powerValue);
        if (Number.isFinite(powerNum)) {
          // dBm values typically range from -70 to +10
          if (powerNum >= -70 && powerNum <= 10) {
            return powerNum;
          } else {
            if (uploadLog) {
              uploadLog.push({
                type: 'error',
                row: rowNum,
                sheet: sheetName,
                message: `Power After value "${powerValue}" dBm is outside typical range (-70 to +10)`,
                noCase: String(noCase)
              });
            }
          }
        } else {
          if (uploadLog) {
            uploadLog.push({
              type: 'error',
              row: rowNum,
              sheet: sheetName,
              message: `Invalid Power After value "${powerValue}". Expected numeric value in dBm`,
              noCase: String(noCase)
            });
          }
        }
      }
      return powerValue ? Number(powerValue) : null;
    })(),
    startPause1: (() => {
      const value = getValue('Pause');
      if (uploadLog && value) {
        uploadLog.push({
          type: 'info',
          row: rowNum,
          sheet: sheetName,
          message: `Found Pause data: "${value}"`,
          noCase: String(noCase)
        });
      }
      return parseDateSafe(value);
    })(),
    endPause1: (() => {
      const value = getValue('Restart');
      if (uploadLog && value) {
        uploadLog.push({
          type: 'info',
          row: rowNum,
          sheet: sheetName,
          message: `Found Restart data: "${value}"`,
          noCase: String(noCase)
        });
      } else if (uploadLog) {
        uploadLog.push({
          type: 'info',
          row: rowNum,
          sheet: sheetName,
          message: `No Restart data found (expected if Pause exists)`,
          noCase: String(noCase)
        });
      }
      return parseDateSafe(value);
    })(),
    startPause2: (() => {
      const value = getValue('Pause2');
      if (uploadLog && value) {
        uploadLog.push({
          type: 'info',
          row: rowNum,
          sheet: sheetName,
          message: `Found Pause2 data: "${value}"`,
          noCase: String(noCase)
        });
      }
      return parseDateSafe(value);
    })(),
    endPause2: (() => {
      const value = getValue('Restart2');
      if (uploadLog && value) {
        uploadLog.push({
          type: 'info',
          row: rowNum,
          sheet: sheetName,
          message: `Found Restart2 data: "${value}"`,
          noCase: String(noCase)
        });
      }
      return parseDateSafe(value);
    })(),
    totalDurationPauseMin: 0, // Akan dihitung otomatis setelah upload
    totalDurationVendorMin: 0, // Akan dihitung otomatis setelah upload

    batchId: generateBatchId(),
    importedAt: new Date().toISOString()
  };

  // Semua durasi akan dihitung otomatis setelah upload

  return incident;
}
