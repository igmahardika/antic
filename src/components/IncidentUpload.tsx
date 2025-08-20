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

interface IncidentUploadProps {
  onUploadSuccess?: () => void;
}

const REQUIRED_HEADERS = [
  'Priority', 'Site', 'No Case', 'NCAL', 'Status', 'Level', 'TS', 'ODP/BTS',
  'Start', 'Start Escalation Vendor', 'End', 'Duration', 'Duration Vendor',
  'Problem', 'Penyebab', 'Action Terakhir', 'Note', 'Klasifikasi Gangguan',
  'Power Before', 'Power After', 'Start Pause', 'End Pause', 'Start Pause 2', 'End Pause 2',
  'Total Duration Pause', 'Total Duration Vendor'
];

export const IncidentUpload: React.FC<IncidentUploadProps> = ({ onUploadSuccess }) => {
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
      console.log('📁 File uploaded:', file.name, 'Size:', file.size);
      
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      console.log('📊 Workbook sheets:', workbook.SheetNames);
      
      const allRows: Incident[] = [];
      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        console.log(`📋 Processing sheet: "${sheetName}"`);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          console.log(`⚠️ Sheet "${sheetName}" skipped: less than 2 rows`);
          continue;
        }

        const headers = jsonData[0] as string[];
        console.log(`📋 Headers in "${sheetName}":`, headers);
        
        // More flexible header validation - only check for essential headers
        const ESSENTIAL_HEADERS = ['NCAL']; // Only NCAL is truly required now
        const missingEssentialHeaders = ESSENTIAL_HEADERS.filter(h => 
          !headers.some(header => header?.toString().toLowerCase().includes(h.toLowerCase()))
        );

        if (missingEssentialHeaders.length > 0) {
          const errorMsg = `Sheet "${sheetName}": Missing essential headers: ${missingEssentialHeaders.join(', ')}`;
          errors.push(errorMsg);
          console.error(errorMsg);
          continue;
        }

        // Log which optional headers are found
        const foundHeaders = REQUIRED_HEADERS.filter(h => 
          headers.some(header => header?.toString().toLowerCase().includes(h.toLowerCase()))
        );
        console.log(`✅ Found headers in "${sheetName}":`, foundHeaders);

        // Process rows
        console.log(`📊 Processing ${jsonData.length - 1} rows in "${sheetName}"`);
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) {
            console.log(`Row ${i + 1} in "${sheetName}" skipped: empty row`);
            continue;
          }

          // Skip completely empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasData) {
            console.log(`Row ${i + 1} in "${sheetName}" skipped: completely empty row`);
            continue;
          }

          try {
            const incident = parseRowToIncident(headers, row, i + 1, sheetName);
            if (incident) {
              allRows.push(incident);
              successCount++;
              console.log(`✅ Row ${i + 1} in "${sheetName}" processed successfully: ${incident.noCase} (NCAL: ${incident.ncal})`);
            } else {
              // Row was skipped (empty NCAL) - don't count as failed
              console.log(`⏭️ Row ${i + 1} in "${sheetName}" skipped: invalid NCAL or empty required fields`);
            }
          } catch (error) {
            const errorMsg = `Row ${i + 1} in "${sheetName}": ${error}`;
            errors.push(errorMsg);
            failedCount++;
            console.error(`❌ ${errorMsg}`);
          }
        }

        setProgress((workbook.SheetNames.indexOf(sheetName) + 1) / workbook.SheetNames.length * 50);
      }

      console.log(`📊 Processing complete: ${allRows.length} incidents ready to save`);

      // Save to database
      if (allRows.length > 0) {
        setProgress(60);
        console.log('💾 Saving incidents to database...');
        await saveIncidentsChunked(allRows);
        console.log('✅ Incidents saved successfully');
        setProgress(100);
      } else {
        console.warn('⚠️ No incidents to save');
      }

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
        preview: allRows.slice(0, 20)
      });

      // Call success callback if provided
      if (onUploadSuccess && successCount > 0) {
        onUploadSuccess();
      }

    } catch (error) {
      console.error('❌ Upload failed with error:', error);
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
    // Create a simpler template with only essential headers
    const templateHeaders = [
      'NCAL', 'No Case', 'Site', 'Start', 'Status', 'Priority', 'Level',
      'Problem', 'Penyebab', 'Action Terakhir', 'Note', 'Klasifikasi Gangguan'
    ];
    
    const templateData = [templateHeaders];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'incident_template_simple.xlsx');
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
                    <Badge variant="danger" className="flex items-center gap-1">
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

  // Debug: Log the row data for first few rows
  if (rowNum <= 5) {
    console.log(`🔍 Row ${rowNum} data:`, row);
    console.log(`🔍 Row ${rowNum} headers:`, headers);
  }

  // VALIDASI UTAMA: NCAL harus ada dan valid
  const ncalValue = getValue('NCAL');
  if (rowNum <= 5) {
    console.log(`🔍 Row ${rowNum} NCAL value:`, ncalValue, `(Type: ${typeof ncalValue})`);
  }
  
  if (!ncalValue || String(ncalValue).trim() === '') {
    console.log(`⏭️ Row ${rowNum} in "${sheetName}" skipped: NCAL is empty`);
    return null;
  }

  const validNCAL = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];
  const ncalStr = String(ncalValue).trim();
  if (!validNCAL.includes(ncalStr)) {
    console.log(`⏭️ Row ${rowNum} in "${sheetName}" skipped: Invalid NCAL value "${ncalValue}". Expected: Blue, Yellow, Orange, Red, Black`);
    return null;
  }

  // Jika NCAL valid, lanjutkan dengan data yang ada
  const noCase = getValue('No Case') || `AUTO-${Date.now()}-${rowNum}`; // Generate auto ID jika kosong
  const startTimeRaw = getValue('Start');
  
  if (rowNum <= 5) {
    console.log(`🔍 Row ${rowNum} No Case:`, noCase);
    console.log(`🔍 Row ${rowNum} Start Time Raw:`, startTimeRaw);
  }
  
  // Jika Start Time kosong, gunakan waktu import sebagai fallback
  let startTime: string;
  if (!startTimeRaw || String(startTimeRaw).trim() === '') {
    console.log(`📝 Row ${rowNum} in "${sheetName}": Start time is empty, using import time as fallback`);
    startTime = new Date().toISOString();
  } else {
    const parsedStartTime = parseDateSafe(startTimeRaw);
    if (!parsedStartTime) {
      console.log(`📝 Row ${rowNum} in "${sheetName}": Invalid Start time format, using import time as fallback`);
      startTime = new Date().toISOString();
    } else {
      startTime = parsedStartTime;
    }
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
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid Priority value "${priorityValue}". Expected: High, Medium, Low`);
        }
      }
      return priorityValue || null;
    })(),
    site: getValue('Site') || null,
    ncal: ncalStr, // Sudah divalidasi di atas
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

  if (rowNum <= 5) {
    console.log(`✅ Row ${rowNum} incident created:`, {
      id: incident.id,
      noCase: incident.noCase,
      ncal: incident.ncal,
      site: incident.site,
      startTime: incident.startTime
    });
  }

  return incident;
}
