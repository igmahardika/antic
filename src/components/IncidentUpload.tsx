import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Incident } from '@/types/incident';
import { mkId, toMinutes, parseDateSafe, saveIncidentsChunked, generateBatchId } from '@/utils/incidentUtils';
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
  'Power Before', 'Power After', 'Start Pause', 'End Pause', 'Start Pause 2', 'End Pause 2',
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
        
        // Validate headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => 
          !headers.some(header => header?.toString().toLowerCase().includes(h.toLowerCase()))
        );

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
              availableHeaders: headers
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

      // Save to database
      if (allRows.length > 0) {
        setProgress(60);
        uploadLog.push({
          type: 'info',
          row: 0,
          sheet: 'DATABASE',
          message: `Saving ${allRows.length} incidents to database...`
        });
        
        await saveIncidentsChunked(allRows);
        
        uploadLog.push({
          type: 'success',
          row: 0,
          sheet: 'DATABASE',
          message: `Successfully saved ${allRows.length} incidents to database`
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

  const getLogEntryIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'error': return <CancelIcon className="w-4 h-4 text-red-500" />;
      case 'skipped': return <WarningAmberIcon className="w-4 h-4 text-yellow-500" />;
      case 'info': return <InfoIcon className="w-4 h-4 text-blue-500" />;
      default: return <DescriptionIcon className="w-4 h-4 text-gray-500" />;
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
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
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Drag & drop an Excel file here, or click to select
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Supports .xlsx and .xls files
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                                             <DownloadIcon className="w-4 h-4 mr-2" />
               Download Template
              </Button>
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
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Success</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="text-2xl font-bold text-yellow-600">{uploadResult.skippedRows}</div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-600">{uploadResult.totalRowsInFile}</div>
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
                                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
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
    const index = headers.findIndex(h => 
      h?.toString().toLowerCase().includes(headerName.toLowerCase())
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
    durationMin: (() => {
      const duration = getValue('Duration');
      const minutes = toMinutes(duration);
      if (duration && minutes === 0) {
        if (uploadLog) {
          uploadLog.push({
            type: 'error',
            row: rowNum,
            sheet: sheetName,
            message: `Duration not parsed correctly. Raw value: "${duration}"`,
            noCase: String(noCase)
          });
        }
      }
      return minutes;
    })(),
    durationVendorMin: (() => {
      const duration = getValue('Duration Vendor');
      const minutes = toMinutes(duration);
      if (duration && minutes === 0) {
        if (uploadLog) {
          uploadLog.push({
            type: 'error',
            row: rowNum,
            sheet: sheetName,
            message: `Duration Vendor not parsed correctly. Raw value: "${duration}"`,
            noCase: String(noCase)
          });
        }
      }
      return minutes;
    })(),
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
    startPause1: parseDateSafe(getValue('Start Pause')),
    endPause1: parseDateSafe(getValue('End Pause')),
    startPause2: parseDateSafe(getValue('Start Pause 2')),
    endPause2: parseDateSafe(getValue('End Pause 2')),
    totalDurationPauseMin: (() => {
      const duration = getValue('Total Duration Pause');
      const minutes = toMinutes(duration);
      if (duration && minutes === 0) {
        if (uploadLog) {
          uploadLog.push({
            type: 'error',
            row: rowNum,
            sheet: sheetName,
            message: `Total Duration Pause not parsed correctly. Raw value: "${duration}"`,
            noCase: String(noCase)
          });
        }
      }
      return minutes;
    })(),
    totalDurationVendorMin: (() => {
      const duration = getValue('Total Duration Vendor');
      const minutes = toMinutes(duration);
      if (duration && minutes === 0) {
        if (uploadLog) {
          uploadLog.push({
            type: 'error',
            row: rowNum,
            sheet: sheetName,
            message: `Total Duration Vendor not parsed correctly. Raw value: "${duration}"`,
            noCase: String(noCase)
          });
        }
      }
      return minutes;
    })(),
    netDurationMin: Math.max(
      toMinutes(getValue('Duration')) - toMinutes(getValue('Total Duration Pause')), 
      0
    ),
    batchId: generateBatchId(),
    importedAt: new Date().toISOString()
  };

  return incident;
}
