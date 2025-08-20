import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Incident } from '@/types/incident';
import { mkId, toMinutes, parseDateSafe, saveIncidentsChunked, generateBatchId } from '@/utils/incidentUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload as UploadIcon, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download
} from 'lucide-react';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  preview: Incident[];
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
      let successCount = 0;
      let failedCount = 0;

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) continue; // Skip empty sheets

        const headers = jsonData[0] as string[];
        
        // Validate headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => 
          !headers.some(header => header?.toString().toLowerCase().includes(h.toLowerCase()))
        );

        if (missingHeaders.length > 0) {
          errors.push(`Sheet "${sheetName}": Missing headers: ${missingHeaders.join(', ')}`);
          continue;
        }

        // Process rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;

          // Skip completely empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasData) continue;

          try {
            const incident = parseRowToIncident(headers, row, i + 1, sheetName);
            if (incident) {
              allRows.push(incident);
              successCount++;
            } else {
              // Row was skipped (empty No Case) - don't count as failed
              console.log(`Row ${i + 1} in "${sheetName}" skipped: empty No Case`);
            }
          } catch (error) {
            errors.push(`Row ${i + 1} in "${sheetName}": ${error}`);
            failedCount++;
          }
        }

        setProgress((workbook.SheetNames.indexOf(sheetName) + 1) / workbook.SheetNames.length * 50);
      }

      // Save to database
      if (allRows.length > 0) {
        setProgress(60);
        await saveIncidentsChunked(allRows);
        setProgress(100);
      }

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
        preview: allRows.slice(0, 20)
      });

    } catch (error) {
      setUploadResult({
        success: 0,
        failed: 1,
        errors: [`Upload failed: ${error}`],
        preview: []
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
    const templateData = [REQUIRED_HEADERS];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'incident_template.xlsx');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Incident Data
          </CardTitle>
          <CardDescription>
            Upload Excel file with incident data. The file should contain all required columns.
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
              <UploadIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
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
                <Download className="w-4 h-4 mr-2" />
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
                <div className="flex gap-4">
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {uploadResult.success} Success
                  </Badge>
                  {uploadResult.failed > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {uploadResult.failed} Failed
                    </Badge>
                  )}
                </div>

                {uploadResult.errors.length > 0 && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
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

function parseRowToIncident(headers: string[], row: any[], rowNum: number, sheetName: string): Incident | null {
  const getValue = (headerName: string) => {
    const index = headers.findIndex(h => 
      h?.toString().toLowerCase().includes(headerName.toLowerCase())
    );
    return index >= 0 ? row[index] : null;
  };

  const noCase = getValue('No Case');
  if (!noCase || String(noCase).trim() === '') {
    return null; // Skip empty rows instead of throwing error
  }

  // Additional validation for required fields
  const startTimeRaw = getValue('Start');
  if (!startTimeRaw || String(startTimeRaw).trim() === '') {
    console.log(`Row ${rowNum} in "${sheetName}" skipped: missing Start time`);
    return null;
  }

  const startTime = parseDateSafe(startTimeRaw);
  if (!startTime) {
    console.log(`Row ${rowNum} in "${sheetName}" skipped: invalid Start time format`);
    return null;
  }
  console.log(`Row ${rowNum} in "${sheetName}": Successfully parsed Start time "${startTimeRaw}" -> ${startTime}`);
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
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid Priority value "${priorityValue}". Expected: High, Medium, Low`);
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
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid NCAL value "${ncalValue}". Expected: Blue, Yellow, Orange, Red, Black`);
        }
      }
      return ncalValue || null;
    })(),
    status: getValue('Status') || null,
    level: (() => {
      const levelValue = getValue('Level');
      if (levelValue) {
        const levelNum = Number(levelValue);
        if (Number.isInteger(levelNum) && levelNum >= 1 && levelNum <= 10) {
          return levelNum;
        } else {
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid Level value "${levelValue}". Expected: 1-10`);
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
        console.warn(`Row ${rowNum} in "${sheetName}": Duration not parsed correctly. Raw value: "${duration}"`);
      }
      return minutes;
    })(),
    durationVendorMin: (() => {
      const duration = getValue('Duration Vendor');
      const minutes = toMinutes(duration);
      if (duration && minutes === 0) {
        console.warn(`Row ${rowNum} in "${sheetName}": Duration Vendor not parsed correctly. Raw value: "${duration}"`);
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
            console.warn(`Row ${rowNum} in "${sheetName}": Power Before value "${powerValue}" dBm is outside typical range (-70 to +10)`);
          }
        } else {
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid Power Before value "${powerValue}". Expected numeric value in dBm`);
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
            console.warn(`Row ${rowNum} in "${sheetName}": Power After value "${powerValue}" dBm is outside typical range (-70 to +10)`);
          }
        } else {
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid Power After value "${powerValue}". Expected numeric value in dBm`);
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
        console.warn(`Row ${rowNum} in "${sheetName}": Total Duration Pause not parsed correctly. Raw value: "${duration}"`);
      }
      return minutes;
    })(),
    totalDurationVendorMin: (() => {
      const duration = getValue('Total Duration Vendor');
      const minutes = toMinutes(duration);
      if (duration && minutes === 0) {
        console.warn(`Row ${rowNum} in "${sheetName}": Total Duration Vendor not parsed correctly. Raw value: "${duration}"`);
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
