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
  RefreshCw,
  X
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
  skippedDetails?: Array<{
    row: number;
    sheet: string;
    reason: string;
    data?: any;
  }>;
  logs?: string[];
}

const REQUIRED_HEADERS = [
  'Priority', 'Site', 'No Case', 'NCAL', 'Status', 'Level', 'TS', 'ODP/BTS',
  'Start', 'Start Escalation Vendor', 'End', 'Duration', 'Duration Vendor',
  'Problem', 'Penyebab', 'Action Terakhir', 'Note', 'Klasifikasi Gangguan',
  'Power Before', 'Power After', 'Start Pause', 'End Pause', 'Start Pause 2', 'End Pause 2',
  'Total Duration Pause', 'Total Duration Vendor'
];

interface IncidentUploadProps {
  onUploadComplete?: (logs?: string[], uploadResult?: UploadResult) => void;
}

export const IncidentUpload: React.FC<IncidentUploadProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Function to capture console logs
  const captureLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(message); // Still log to console
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setProgress(0);
    setUploadResult(null);
    setLogs([]); // Clear previous logs

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
      const skippedDetails: Array<{
        row: number;
        sheet: string;
        reason: string;
        data?: any;
      }> = [];

      captureLog(`=== UPLOAD ANALYSIS START ===`);
      captureLog(`🔍 VALIDATION STRATEGY: Using NCAL as primary validation field (not No Case)`);
      captureLog(`📊 Total sheets found: ${workbook.SheetNames.length}`);
      captureLog(`📋 Sheet names: ${workbook.SheetNames.join(', ')}`);
      captureLog(`🎯 GOAL: Upload ALL valid data, skip only truly invalid/empty rows`);
      captureLog(`📝 LOGGING: Detailed logging for all skipped rows with specific reasons`);

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        captureLog(`\n--- Processing Sheet: "${sheetName}" ---`);
        captureLog(`Total rows in sheet: ${jsonData.length}`);

        if (jsonData.length < 2) {
          captureLog(`Sheet "${sheetName}" skipped: less than 2 rows`);
          continue;
        }

        const headers = jsonData[0] as string[];
        captureLog(`Headers found: ${headers.length}`);
        captureLog(`Header names: ${headers.join(', ')}`);
        
        // Validate headers
        const missingHeaders = REQUIRED_HEADERS.filter(h => 
          !headers.some(header => header?.toString().toLowerCase().includes(h.toLowerCase()))
        );

        if (missingHeaders.length > 0) {
          const errorMsg = `Sheet "${sheetName}": Missing headers: ${missingHeaders.join(', ')}`;
          errors.push(errorMsg);
          captureLog(`❌ ERROR: ${errorMsg}`);
          continue;
        }

        captureLog(`✅ All required headers found in sheet "${sheetName}"`);

        // Process rows
        let sheetSuccessCount = 0;
        let sheetSkippedCount = 0;
        let sheetEmptyCount = 0;
        let sheetInvalidCount = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          totalRowsProcessed++;
          
          // Log every 100th row for debugging
          if (totalRowsProcessed % 100 === 0) {
            captureLog(`Processing row ${totalRowsProcessed} of ${jsonData.length - 1} in sheet "${sheetName}"`);
          }
          
          if (!row || row.length === 0) {
            sheetEmptyCount++;
            emptyRowCount++;
            const reason = "Empty row (no data)";
            captureLog(`Row ${i + 1} in "${sheetName}": ${reason}`);
            skippedDetails.push({
              row: i + 1,
              sheet: sheetName,
              reason,
              data: { rowData: row }
            });
            continue;
          }

          // Skip completely empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (!hasData) {
            sheetEmptyCount++;
            emptyRowCount++;
            const reason = "Empty row (all cells empty)";
            captureLog(`Row ${i + 1} in "${sheetName}": ${reason}`);
            skippedDetails.push({
              row: i + 1,
              sheet: sheetName,
              reason,
              data: { rowData: row, hasData }
            });
            continue;
          }

                      try {
              const result = parseRowToIncident(headers, row, i + 1, sheetName);
              if (result && !result.skipped) {
                allRows.push(result);
                successCount++;
                sheetSuccessCount++;
                captureLog(`Row ${i + 1} in "${sheetName}": ✅ Successfully processed - ID: ${result.id}, NCAL: ${result.ncal}, Site: ${result.site}`);
              } else if (result && result.skipped) {
                // Row was skipped with specific reason
                sheetSkippedCount++;
                skippedCount++;
                captureLog(`Row ${i + 1} in "${sheetName}" ⚠️ SKIPPED: ${result.reason}`);
                skippedDetails.push({
                  row: i + 1,
                  sheet: sheetName,
                  reason: result.reason,
                  data: result.rowData
                });
              } else {
                // Row was skipped (null result)
                sheetSkippedCount++;
                skippedCount++;
                const reason = "Row processing returned null (unknown error)";
                captureLog(`Row ${i + 1} in "${sheetName}" ❌ SKIPPED: ${reason}`);
                skippedDetails.push({
                  row: i + 1,
                  sheet: sheetName,
                  reason,
                  data: { rowData: row }
                });
              }
            } catch (error) {
              sheetInvalidCount++;
              invalidRowCount++;
              const errorMsg = `Row ${i + 1} in "${sheetName}": ${error}`;
              errors.push(errorMsg);
              failedCount++;
              skippedDetails.push({
                row: i + 1,
                sheet: sheetName,
                reason: `Error: ${error}`,
                data: { rowData: row, error: error.toString() }
              });
            }
        }

                  captureLog(`Sheet "${sheetName}" results:`);
          captureLog(`  - Total rows in sheet: ${jsonData.length - 1}`);
          captureLog(`  - Success: ${sheetSuccessCount}`);
          captureLog(`  - Skipped: ${sheetSkippedCount}`);
          captureLog(`  - Empty: ${sheetEmptyCount}`);
          captureLog(`  - Invalid: ${sheetInvalidCount}`);
          captureLog(`  - Total processed: ${sheetSuccessCount + sheetSkippedCount + sheetEmptyCount + sheetInvalidCount}`);
          
          // Validate sheet processing
          const sheetTotal = sheetSuccessCount + sheetSkippedCount + sheetEmptyCount + sheetInvalidCount;
          if (sheetTotal !== jsonData.length - 1) {
            captureLog(`⚠️ SHEET INCONSISTENCY: Expected ${jsonData.length - 1}, got ${sheetTotal}`);
          } else {
            captureLog(`✅ Sheet processing consistent`);
          }

          setProgress((workbook.SheetNames.indexOf(sheetName) + 1) / workbook.SheetNames.length * 50);
        }

              captureLog(`\n=== UPLOAD ANALYSIS SUMMARY ===`);
      captureLog(`📊 Total rows processed: ${totalRowsProcessed}`);
      captureLog(`✅ Successfully parsed: ${successCount}`);
      captureLog(`⚠️ Skipped (empty/invalid): ${skippedCount}`);
      captureLog(`📭 Empty rows: ${emptyRowCount}`);
      captureLog(`❌ Invalid rows: ${invalidRowCount}`);
      captureLog(`💥 Failed: ${failedCount}`);
      captureLog(`💾 Total incidents to save: ${allRows.length}`);
      
      // Validate data consistency
      const expectedTotal = successCount + skippedCount + emptyRowCount + invalidRowCount + failedCount;
      if (expectedTotal !== totalRowsProcessed) {
        captureLog(`⚠️ DATA INCONSISTENCY DETECTED!`);
        captureLog(`Expected total: ${expectedTotal}, Actual processed: ${totalRowsProcessed}`);
        captureLog(`Difference: ${Math.abs(expectedTotal - totalRowsProcessed)} rows`);
      }
        
        // Log detailed breakdown of skipped rows
        if (skippedDetails.length > 0) {
          captureLog(`\n📋 DETAILED SKIPPED ROWS BREAKDOWN:`);
          captureLog(`Total skipped rows: ${skippedDetails.length}`);
          
          // Group by reason
          const reasonGroups = skippedDetails.reduce((acc, detail) => {
            if (!acc[detail.reason]) acc[detail.reason] = [];
            acc[detail.reason].push(detail);
            return acc;
          }, {} as Record<string, typeof skippedDetails>);
          
          Object.entries(reasonGroups).forEach(([reason, details]) => {
            captureLog(`\n🔍 "${reason}": ${details.length} rows`);
            details.slice(0, 10).forEach(detail => {
              captureLog(`   Row ${detail.row} (${detail.sheet})`);
            });
            if (details.length > 10) {
              captureLog(`   ... and ${details.length - 10} more rows`);
            }
          });
        }
        
        captureLog(`\n=== UPLOAD ANALYSIS END ===\n`);

      // Save to database
      if (allRows.length > 0) {
        setProgress(60);
        captureLog(`💾 Saving ${allRows.length} incidents to database...`);
        
        try {
          await saveIncidentsChunked(allRows);
          captureLog(`✅ Successfully saved ${allRows.length} incidents to database`);
          
          // Verify data was saved
          const savedCount = await db.incidents.count();
          captureLog(`📊 Total incidents in database after save: ${savedCount}`);
          
          if (savedCount === 0) {
            throw new Error('Data was not saved to database - count is 0');
          }
          
          // Validate saved data matches expected
          if (savedCount !== allRows.length) {
            captureLog(`⚠️ WARNING: Saved count (${savedCount}) doesn't match expected (${allRows.length})`);
            captureLog(`This may indicate duplicate data or database issues.`);
          } else {
            captureLog(`✅ Database validation: Saved count matches expected count`);
          }
          
          setProgress(100);
        } catch (error) {
          captureLog(`❌ ERROR: Error saving to database: ${error}`);
          throw new Error(`Failed to save data to database: ${error}`);
        }
      } else {
        captureLog(`⚠️ WARNING: No valid incidents to save`);
      }

      setUploadResult({
        success: successCount,
        failed: failedCount,
        errors,
        preview: allRows.slice(0, 20),
        totalProcessed: totalRowsProcessed,
        skipped: skippedCount,
        emptyRows: emptyRowCount,
        invalidRows: invalidRowCount,
        skippedDetails,
        logs
      });

      // Log detailed summary
      captureLog(`\n=== FINAL UPLOAD SUMMARY ===`);
      captureLog(`Expected rows: ${totalRowsProcessed}`);
      captureLog(`Successfully uploaded: ${successCount}`);
      captureLog(`Skipped (empty/invalid): ${skippedCount}`);
      captureLog(`Empty rows: ${emptyRowCount}`);
      captureLog(`Invalid rows: ${invalidRowCount}`);
      captureLog(`Failed: ${failedCount}`);
      captureLog(`Total incidents saved: ${allRows.length}`);
      
      // Final data consistency check
      const totalAccounted = successCount + skippedCount + emptyRowCount + invalidRowCount + failedCount;
      captureLog(`\n=== DATA CONSISTENCY VALIDATION ===`);
      captureLog(`Total rows processed: ${totalRowsProcessed}`);
      captureLog(`Total accounted for: ${totalAccounted}`);
      captureLog(`Difference: ${Math.abs(totalRowsProcessed - totalAccounted)}`);
      
      if (totalAccounted !== totalRowsProcessed) {
        captureLog(`❌ DATA INCONSISTENCY: ${Math.abs(totalRowsProcessed - totalAccounted)} rows unaccounted for!`);
        captureLog(`This indicates a bug in the processing logic.`);
      } else {
        captureLog(`✅ DATA CONSISTENCY: All rows properly accounted for!`);
      }
      
      // Upload success validation
      captureLog(`\n=== UPLOAD SUCCESS VALIDATION ===`);
      if (successCount > 0) {
        captureLog(`✅ SUCCESS: ${successCount} valid incidents uploaded successfully!`);
        captureLog(`📊 Upload success rate: ${((successCount / totalRowsProcessed) * 100).toFixed(1)}%`);
      } else {
        captureLog(`❌ FAILURE: No valid incidents were uploaded!`);
        captureLog(`🔍 Check the skipped rows details above for issues.`);
      }
      
      if (successCount < totalRowsProcessed) {
        captureLog(`⚠️  WARNING: Only ${successCount} out of ${totalRowsProcessed} rows were successfully uploaded!`);
        captureLog(`Missing data: ${totalRowsProcessed - successCount} rows`);
        captureLog(`Check the logs above for details on skipped/failed rows.`);
      } else {
        captureLog(`✅ SUCCESS: All ${successCount} rows were successfully uploaded!`);
      }
      captureLog(`=== END SUMMARY ===\n`);

      // Call callback if provided and upload was successful
      // Add delay to ensure logs are visible before closing modal
      if (onUploadComplete && successCount > 0) {
        captureLog(`\n🔄 Calling onUploadComplete callback in 3 seconds to allow log review...`);
        setTimeout(() => {
          captureLog(`✅ Executing onUploadComplete callback now`);
          onUploadComplete(logs, uploadResult);
        }, 3000); // 3 second delay
      } else if (onUploadComplete && successCount === 0) {
        captureLog(`\n⚠️ Upload completed but no data was uploaded. Callback will not be called.`);
        onUploadComplete(logs, uploadResult); // Still send logs even if no data uploaded
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
                {/* Simple Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-600">{uploadResult.success}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Successfully Uploaded</span>
                      </div>
                      {uploadResult.skipped && uploadResult.skipped > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <span className="font-medium text-yellow-600">{uploadResult.skipped}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Skipped</span>
                        </div>
                      )}
                      {uploadResult.failed > 0 && (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-600">{uploadResult.failed}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Failed</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total: {uploadResult.totalProcessed || 0} rows
                    </div>
                  </div>
                  
                  {uploadResult.success < (uploadResult.totalProcessed || 0) && (
                    <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        ⚠️ Only {uploadResult.success} out of {uploadResult.totalProcessed} rows were successfully uploaded. 
                        Click "View Logs" button to see detailed information about skipped/failed rows.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      console.log('🔄 Manual close button clicked - calling onUploadComplete immediately');
                      if (onUploadComplete) {
                        onUploadComplete(logs, uploadResult);
                      }
                    }}
                    variant="default" 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Close & Continue
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
    const reason = "Empty NCAL (primary validation field)";
    console.log(`Row ${rowNum} in "${sheetName}": ${reason}`);
    return { skipped: true, reason, rowData: { ncal: ncalValue } };
  }

  // Normalize NCAL - remove extra spaces and ensure it's a string
  const normalizedNCAL = String(ncalValue).trim();
  if (normalizedNCAL === '') {
    const reason = "NCAL is empty after normalization (primary validation field)";
    console.log(`Row ${rowNum} in "${sheetName}": ${reason}`);
    return { skipped: true, reason, rowData: { ncal: ncalValue, normalizedNCAL } };
  }

  // Validate NCAL value with more flexible normalization
  const validNCAL = ['Blue', 'Yellow', 'Orange', 'Red', 'Black'];
  const ncalStr = normalizedNCAL;
  let finalNCAL = ncalStr;
  
  if (!validNCAL.includes(ncalStr)) {
    // Try to normalize common variations
    const normalized = ncalStr.toLowerCase();
    if (normalized === 'blue' || normalized === 'b' || normalized === 'blu') finalNCAL = 'Blue';
    else if (normalized === 'yellow' || normalized === 'y' || normalized === 'yel') finalNCAL = 'Yellow';
    else if (normalized === 'orange' || normalized === 'o' || normalized === 'ora') finalNCAL = 'Orange';
    else if (normalized === 'red' || normalized === 'r') finalNCAL = 'Red';
    else if (normalized === 'black' || normalized === 'bl' || normalized === 'bla') finalNCAL = 'Black';
    else {
      const reason = `Invalid NCAL value "${ncalValue}" (primary validation field) - Expected: Blue, Yellow, Orange, Red, or Black`;
      console.log(`Row ${rowNum} in "${sheetName}": ${reason}`);
      return { skipped: true, reason, rowData: { ncal: ncalValue, normalizedNCAL } };
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
    const reason = "Missing Start time (required field)";
    console.log(`Row ${rowNum} in "${sheetName}": ${reason}`);
    return { skipped: true, reason, rowData: { startTimeRaw } };
  }
  
  // Validate other critical fields but don't skip if they're missing
  const siteValue = getValue('Site');
  const tsValue = getValue('TS');
  const problemValue = getValue('Problem');
  
  if (!siteValue || String(siteValue).trim() === '') {
    console.warn(`Row ${rowNum} in "${sheetName}": Site is empty - will use default value`);
  }
  
  if (!tsValue || String(tsValue).trim() === '') {
    console.warn(`Row ${rowNum} in "${sheetName}": TS is empty - will use default value`);
  }
  
  if (!problemValue || String(problemValue).trim() === '') {
    console.warn(`Row ${rowNum} in "${sheetName}": Problem is empty - will use default value`);
  }

  const startTime = parseDateSafe(startTimeRaw);
  if (!startTime) {
    const reason = `Invalid Start time format: "${startTimeRaw}"`;
    console.log(`Row ${rowNum} in "${sheetName}": ${reason}`);
    return { skipped: true, reason, rowData: { startTimeRaw } };
  }
  
  console.log(`Row ${rowNum} in "${sheetName}": Successfully parsed Start time "${startTimeRaw}" -> ${startTime}`);
  const id = mkId(noCase, startTime);
  
  // Validate ID generation
  if (!id) {
    const reason = `Failed to generate ID for No Case: "${noCase}"`;
    console.error(`Row ${rowNum} in "${sheetName}": ${reason}`);
    return { skipped: true, reason, rowData: { noCase, startTime } };
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
          if (normalized === 'high' || normalized === 'h' || normalized === 'hi') return 'High';
          if (normalized === 'medium' || normalized === 'med' || normalized === 'm' || normalized === 'mid') return 'Medium';
          if (normalized === 'low' || normalized === 'l' || normalized === 'lo') return 'Low';
        }
      }
      return priorityValue ? String(priorityValue).trim() : null;
    })(),
    site: (() => {
      const siteValue = getValue('Site');
      return siteValue ? String(siteValue).trim() : 'Unknown Site';
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
          // Try to normalize common variations
          const levelStr = String(levelValue).toLowerCase().trim();
          if (levelStr === '1' || levelStr === 'one' || levelStr === 'i') return 1;
          if (levelStr === '2' || levelStr === 'two' || levelStr === 'ii') return 2;
          if (levelStr === '3' || levelStr === 'three' || levelStr === 'iii') return 3;
        }
      }
      return levelValue ? Number(levelValue) : null;
    })(),
    ts: (() => {
      const tsValue = getValue('TS');
      return tsValue ? String(tsValue).trim() : 'Unknown TS';
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
      return problemValue ? String(problemValue).trim() : 'No Problem Description';
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
    const reason = `Invalid incident object created - missing required fields`;
    console.error(`Row ${rowNum} in "${sheetName}": ${reason}`, incident);
    return { skipped: true, reason, rowData: { incident } };
  }

  console.log(`Row ${rowNum} in "${sheetName}": Successfully created incident with ID: ${incident.id}`);
  return incident;
}
