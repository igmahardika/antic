import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Incident } from '@/types/incident';
import { mkId, toMinutes, parseDateSafe, saveIncidentsChunked, generateBatchId } from '@/utils/incidentUtils';
import { db } from '@/lib/db';
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
  Download,
  RefreshCw
} from 'lucide-react';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  preview: Incident[];
  totalProcessed?: number;
  skipped?: number;
  emptyRows?: number;
  invalidRows?: number;
}

const REQUIRED_HEADERS = [
  'Priority', 'Site', 'No Case', 'NCAL', 'Status', 'Level', 'TS', 'ODP/BTS',
  'Start', 'Start Escalation Vendor', 'End', 'Duration', 'Duration Vendor',
  'Problem', 'Penyebab', 'Action Terakhir', 'Note', 'Klasifikasi Gangguan',
  'Power Before', 'Power After', 'Start Pause', 'End Pause', 'Start Pause 2', 'End Pause 2',
  'Total Duration Pause', 'Total Duration Vendor'
];

interface IncidentUploadProps {
  onUploadComplete?: () => void;
}

export const IncidentUpload: React.FC<IncidentUploadProps> = ({ onUploadComplete }) => {
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
      let skippedCount = 0;
      let emptyRowCount = 0;
      let invalidRowCount = 0;
      let totalRowsProcessed = 0;

      console.log(`=== UPLOAD ANALYSIS START ===`);
      console.log(`🔍 VALIDATION STRATEGY: Using NCAL as primary validation field (not No Case)`);
      console.log(`📊 Total sheets found: ${workbook.SheetNames.length}`);
      console.log(`📋 Sheet names: ${workbook.SheetNames.join(', ')}`);

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`\n--- Processing Sheet: "${sheetName}" ---`);
        console.log(`Total rows in sheet: ${jsonData.length}`);

        if (jsonData.length < 2) {
          console.log(`Sheet "${sheetName}" skipped: less than 2 rows`);
          continue;
        }

        const headers = jsonData[0] as string[];
        console.log(`Headers found: ${headers.length}`);
        console.log(`Header names: ${headers.join(', ')}`);
        
        // Validate headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => 
          !headers.some(header => header?.toString().toLowerCase().includes(h.toLowerCase()))
        );

        if (missingHeaders.length > 0) {
          const errorMsg = `Sheet "${sheetName}": Missing headers: ${missingHeaders.join(', ')}`;
          errors.push(errorMsg);
          console.error(errorMsg);
          continue;
        }

        console.log(`All required headers found in sheet "${sheetName}"`);

        // Process rows
        let sheetSuccessCount = 0;
        let sheetSkippedCount = 0;
        let sheetEmptyCount = 0;
        let sheetInvalidCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          totalRowsProcessed++;
          const row = jsonData[i] as any[];
          
          if (!row || row.length === 0) {
            sheetEmptyCount++;
            emptyRowCount++;
            console.log(`Row ${i + 1} in "${sheetName}": Empty row (no data)`);
            continue;
          }

          // Skip completely empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasData) {
            sheetEmptyCount++;
            emptyRowCount++;
            console.log(`Row ${i + 1} in "${sheetName}": Empty row (all cells empty)`);
            continue;
          }

                      try {
              const incident = parseRowToIncident(headers, row, i + 1, sheetName);
              if (incident) {
                allRows.push(incident);
                successCount++;
                sheetSuccessCount++;
              } else {
                // Row was skipped (empty NCAL or invalid data)
                sheetSkippedCount++;
                skippedCount++;
                console.log(`Row ${i + 1} in "${sheetName}" skipped: empty NCAL or invalid data`);
              }
            } catch (error) {
              sheetInvalidCount++;
              invalidRowCount++;
              errors.push(`Row ${i + 1} in "${sheetName}": ${error}`);
              failedCount++;
            }
        }

                  console.log(`Sheet "${sheetName}" results:`);
          console.log(`  - Success: ${sheetSuccessCount}`);
          console.log(`  - Skipped: ${sheetSkippedCount}`);
          console.log(`  - Empty: ${sheetEmptyCount}`);
          console.log(`  - Invalid: ${sheetInvalidCount}`);

          setProgress((workbook.SheetNames.indexOf(sheetName) + 1) / workbook.SheetNames.length * 50);
        }

        console.log(`\n=== UPLOAD ANALYSIS SUMMARY ===`);
        console.log(`Total rows processed: ${totalRowsProcessed}`);
        console.log(`Successfully parsed: ${successCount}`);
        console.log(`Skipped (empty/invalid): ${skippedCount}`);
        console.log(`Empty rows: ${emptyRowCount}`);
        console.log(`Invalid rows: ${invalidRowCount}`);
        console.log(`Failed: ${failedCount}`);
        console.log(`Total incidents to save: ${allRows.length}`);
        console.log(`=== UPLOAD ANALYSIS END ===\n`);

      // Save to database
      if (allRows.length > 0) {
        setProgress(60);
        console.log(`Saving ${allRows.length} incidents to database...`);
        
        try {
          await saveIncidentsChunked(allRows);
          console.log(`Successfully saved ${allRows.length} incidents to database`);
          
          // Verify data was saved
          const savedCount = await db.incidents.count();
          console.log(`Total incidents in database after save: ${savedCount}`);
          
          if (savedCount === 0) {
            throw new Error('Data was not saved to database - count is 0');
          }
          
          setProgress(100);
        } catch (error) {
          console.error('Error saving to database:', error);
          throw new Error(`Failed to save data to database: ${error}`);
        }
      } else {
        console.warn('No valid incidents to save');
      }

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
        preview: allRows.slice(0, 20),
        totalProcessed: totalRowsProcessed,
        skipped: skippedCount,
        emptyRows: emptyRowCount,
        invalidRows: invalidRowCount
      });

      // Log detailed summary
      console.log(`\n=== FINAL UPLOAD SUMMARY ===`);
      console.log(`Expected rows: ${totalRowsProcessed}`);
      console.log(`Successfully uploaded: ${successCount}`);
      console.log(`Skipped (empty/invalid): ${skippedCount}`);
      console.log(`Empty rows: ${emptyRowCount}`);
      console.log(`Invalid rows: ${invalidRowCount}`);
      console.log(`Failed: ${failedCount}`);
      console.log(`Total incidents saved: ${allRows.length}`);
      
      if (successCount < totalRowsProcessed) {
        console.warn(`⚠️  WARNING: Only ${successCount} out of ${totalRowsProcessed} rows were successfully uploaded!`);
        console.warn(`Missing data: ${totalRowsProcessed - successCount} rows`);
        console.warn(`Check the logs above for details on skipped/failed rows.`);
      } else {
        console.log(`✅ SUCCESS: All ${successCount} rows were successfully uploaded!`);
      }
      console.log(`=== END SUMMARY ===\n`);

      // Call callback if provided and upload was successful
      if (onUploadComplete && successCount > 0) {
        onUploadComplete();
      }

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
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    {uploadResult.preview.length} Preview
                  </Badge>
                  {uploadResult.skipped && uploadResult.skipped > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {uploadResult.skipped} Skipped
                    </Badge>
                  )}
                  {uploadResult.emptyRows && uploadResult.emptyRows > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <X className="w-4 h-4" />
                      {uploadResult.emptyRows} Empty
                    </Badge>
                  )}
                </div>

                {/* Detailed Summary */}
                {uploadResult.totalProcessed && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Upload Summary:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total Processed:</span>
                        <span className="ml-2 font-medium">{uploadResult.totalProcessed}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Successfully Uploaded:</span>
                        <span className="ml-2 font-medium text-green-600">{uploadResult.success}</span>
                      </div>
                      {uploadResult.skipped && uploadResult.skipped > 0 && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Skipped:</span>
                          <span className="ml-2 font-medium text-yellow-600">{uploadResult.skipped}</span>
                        </div>
                      )}
                      {uploadResult.emptyRows && uploadResult.emptyRows > 0 && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Empty Rows:</span>
                          <span className="ml-2 font-medium text-gray-600">{uploadResult.emptyRows}</span>
                        </div>
                      )}
                    </div>
                    {uploadResult.success < uploadResult.totalProcessed && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                          ⚠️ Only {uploadResult.success} out of {uploadResult.totalProcessed} rows were successfully uploaded. 
                          Check the console for detailed information about skipped/failed rows.
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                
                {/* Data Verification */}
                <div className="flex gap-2">
                  <Button 
                    onClick={async () => {
                      try {
                        const totalCount = await db.incidents.count();
                        const sampleData = await db.incidents.limit(5).toArray();
                        console.log('Database verification:', { totalCount, sampleData });
                        alert(`Database contains ${totalCount} incidents. Check console for details.`);
                      } catch (error) {
                        console.error('Error verifying database:', error);
                        alert('Error verifying database. Check console for details.');
                      }
                    }}
                    variant="outline" 
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verify Database
                  </Button>
                </div>
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

  // Use NCAL as primary validation instead of No Case
  const ncalValue = getValue('NCAL');
  if (!ncalValue || String(ncalValue).trim() === '') {
    console.log(`Row ${rowNum} in "${sheetName}" skipped: empty NCAL (primary validation field)`);
    return null; // Skip empty rows instead of throwing error
  }

  // Normalize NCAL - remove extra spaces and ensure it's a string
  const normalizedNCAL = String(ncalValue).trim();
  if (normalizedNCAL === '') {
    console.log(`Row ${rowNum} in "${sheetName}" skipped: NCAL is empty after normalization (primary validation field)`);
    return null;
  }

  // Validate NCAL value
  const validNCAL = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];
  const ncalStr = normalizedNCAL;
  let finalNCAL = ncalStr;
  
  if (!validNCAL.includes(ncalStr)) {
    // Try to normalize common variations
    const normalized = ncalStr.toLowerCase();
    if (normalized === 'blue' || normalized === 'b') finalNCAL = 'Blue';
    else if (normalized === 'yellow' || normalized === 'y') finalNCAL = 'Yellow';
    else if (normalized === 'orange' || normalized === 'o') finalNCAL = 'Orange';
    else if (normalized === 'red' || normalized === 'r') finalNCAL = 'Red';
    else if (normalized === 'black' || normalized === 'bl') finalNCAL = 'Black';
    else {
          console.log(`Row ${rowNum} in "${sheetName}" skipped: invalid NCAL value "${ncalValue}" (primary validation field)`);
    return null;
    }
  }

  const noCase = getValue('No Case');
  // Normalize No Case - remove extra spaces and ensure it's a string
  const normalizedNoCase = noCase ? String(noCase).trim() : `NCAL_${finalNCAL}_${rowNum}`;
  
  // Log if No Case was auto-generated
  if (!noCase || String(noCase).trim() === '') {
    console.log(`Row ${rowNum} in "${sheetName}": Auto-generated No Case "${normalizedNoCase}" for NCAL "${finalNCAL}"`);
  }

  // Additional validation for required fields
  const startTimeRaw = getValue('Start');
  if (!startTimeRaw || String(startTimeRaw).trim() === '') {
    console.log(`Row ${rowNum} in "${sheetName}" skipped: missing Start time`);
    return null;
  }

  const startTime = parseDateSafe(startTimeRaw);
  if (!startTime) {
    console.log(`Row ${rowNum} in "${sheetName}" skipped: invalid Start time format: "${startTimeRaw}"`);
    return null;
  }
  
  console.log(`Row ${rowNum} in "${sheetName}": Successfully parsed Start time "${startTimeRaw}" -> ${startTime}`);
  const id = mkId(noCase, startTime);
  
  // Validate ID generation
  if (!id) {
    console.error(`Row ${rowNum} in "${sheetName}": Failed to generate ID for No Case: "${noCase}"`);
    return null;
  }

  const incident: Incident = {
    id,
    noCase: normalizedNoCase,
    ncal: finalNCAL,
    priority: (() => {
      const priorityValue = getValue('Priority');
      if (priorityValue) {
        const validPriorities = ['High', 'Medium', 'Low'];
        const priorityStr = String(priorityValue).trim();
        if (validPriorities.includes(priorityStr)) {
          return priorityStr;
        } else {
          console.warn(`Row ${rowNum} in "${sheetName}": Invalid Priority value "${priorityValue}". Expected: High, Medium, Low`);
          // Try to normalize common variations
          const normalized = priorityStr.toLowerCase();
          if (normalized === 'high' || normalized === 'h') return 'High';
          if (normalized === 'medium' || normalized === 'med' || normalized === 'm') return 'Medium';
          if (normalized === 'low' || normalized === 'l') return 'Low';
        }
      }
      return priorityValue ? String(priorityValue).trim() : null;
    })(),
    site: (() => {
      const siteValue = getValue('Site');
      return siteValue ? String(siteValue).trim() : null;
    })(),
    // NCAL is already processed above
    status: (() => {
      const statusValue = getValue('Status');
      return statusValue ? String(statusValue).trim() : null;
    })(),
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
    ts: (() => {
      const tsValue = getValue('TS');
      return tsValue ? String(tsValue).trim() : null;
    })(),
    odpBts: (() => {
      const odpValue = getValue('ODP/BTS');
      return odpValue ? String(odpValue).trim() : null;
    })(),
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
    problem: (() => {
      const problemValue = getValue('Problem');
      return problemValue ? String(problemValue).trim() : null;
    })(),
    penyebab: (() => {
      const penyebabValue = getValue('Penyebab');
      return penyebabValue ? String(penyebabValue).trim() : null;
    })(),
    actionTerakhir: (() => {
      const actionValue = getValue('Action Terakhir');
      return actionValue ? String(actionValue).trim() : null;
    })(),
    note: (() => {
      const noteValue = getValue('Note');
      return noteValue ? String(noteValue).trim() : null;
    })(),
    klasifikasiGangguan: (() => {
      const klasValue = getValue('Klasifikasi Gangguan');
      return klasValue ? String(klasValue).trim() : null;
    })(),
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

  // Final validation before returning
  if (!incident.id || !incident.noCase || !incident.startTime) {
    console.error(`Row ${rowNum} in "${sheetName}": Invalid incident object created`, incident);
    return null;
  }

  console.log(`Row ${rowNum} in "${sheetName}": Successfully created incident with ID: ${incident.id}`);
  return incident;
}
