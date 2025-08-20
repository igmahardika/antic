import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { importIncidentExcel, ImportResult } from '@/lib/importers/incidentExcel';
import { useToast } from '@/hooks/use-toast';

export const IncidentDataUpload: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await importIncidentExcel(file);
      setUploadResult(result);

      if (result.accepted > 0) {
        toast({
          title: "Upload Berhasil",
          description: `${result.accepted} baris diterima, ${result.rejected} baris ditolak`,
        });
      } else {
        toast({
          title: "Upload Gagal",
          description: "Tidak ada data yang diterima. Periksa format file dan NCAL.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Upload Incident Data
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upload file Excel dengan NCAL sebagai acuan utama. Hanya baris dengan NCAL valid yang akan disimpan.
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload Excel File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isUploading ? (
              <div>
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Uploading...
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Processing file, please wait...
                </div>
              </div>
            ) : isDragActive ? (
              <div>
                <div className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-2">
                  Drop file here
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Release to upload
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Drag & drop Excel file here
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  or click to select file
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
                  <div>• Format: .xlsx, .xls</div>
                  <div>• NCAL harus ada di kolom D</div>
                  <div>• NCAL valid: BLUE, YELLOW, ORANGE, RED, BLACK</div>
                  <div>• Reupload file yang sama tidak akan menambah data (idempotent)</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Upload Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">Accepted</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{uploadResult.accepted}</div>
                <div className="text-sm text-green-700 dark:text-green-300">baris diterima</div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800 dark:text-red-200">Rejected</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{uploadResult.rejected}</div>
                <div className="text-sm text-red-700 dark:text-red-300">baris ditolak</div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">Batch ID</span>
                </div>
                <div className="text-xs font-mono text-blue-600 break-all">{uploadResult.batchId}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">untuk tracking</div>
              </div>
            </div>

            {/* Reasons */}
            {uploadResult.reasons.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Rejection Reasons ({uploadResult.reasons.length})
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {uploadResult.reasons.map((reason, index) => (
                    <div key={index} className="text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded border-l-4 border-orange-200">
                      <span className="text-orange-600 font-medium">#{index + 1}</span>
                      <span className="ml-2 text-gray-700 dark:text-gray-300">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Format File Excel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Struktur Kolom:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><Badge variant="outline">A</Badge> No Case</div>
                <div><Badge variant="outline">B</Badge> Priority</div>
                <div><Badge variant="outline">C</Badge> Site</div>
                <div><Badge variant="outline">D</Badge> <strong>NCAL</strong></div>
                <div><Badge variant="outline">E</Badge> Status</div>
                <div><Badge variant="outline">F</Badge> Level</div>
                <div><Badge variant="outline">G</Badge> TS</div>
                <div><Badge variant="outline">H</Badge> ODP/BTS</div>
                <div><Badge variant="outline">I</Badge> Start Time</div>
                <div><Badge variant="outline">J</Badge> Start Escalation Vendor</div>
                <div><Badge variant="outline">K</Badge> End Time</div>
                <div><Badge variant="outline">L</Badge> Duration</div>
                <div><Badge variant="outline">M</Badge> Duration Vendor</div>
                <div><Badge variant="outline">N</Badge> Problem</div>
                <div><Badge variant="outline">O</Badge> Penyebab</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">NCAL Values (Kolom D):</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">BLUE</Badge>
                <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">YELLOW</Badge>
                <Badge variant="default" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">ORANGE</Badge>
                <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">RED</Badge>
                <Badge variant="default" className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">BLACK</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Juga mendukung: BIRU, KUNING, ORANYE, MERAH, HITAM
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Rules:</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• <strong>NCAL adalah acuan utama</strong> - hanya baris dengan NCAL valid yang disimpan</li>
                <li>• <strong>Idempotent</strong> - reupload file yang sama tidak menambah data</li>
                <li>• <strong>Tanggal toleran</strong> - mendukung berbagai format tanggal</li>
                <li>• <strong>Durasi dalam menit</strong> - angka positif</li>
                <li>• <strong>String trimming</strong> - whitespace otomatis dihapus</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
