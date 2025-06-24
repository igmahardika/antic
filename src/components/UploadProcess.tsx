
import React, { useState, useCallback } from 'react';
import { DocumentArrowUpIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/use-toast';

const UploadProcess = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    
    if (excelFile) {
      setUploadedFile(excelFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      // Simulasi proses upload dengan delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Upload berhasil!",
        description: "File Excel telah diproses. Backend parser otomatis telah mengekstrak data dan menghitung durasi serta summary.",
      });
      setUploadedFile(null);
    } catch (error) {
      toast({
        title: "Upload gagal",
        description: "Terjadi kesalahan saat mengupload file. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const expectedColumns = [
    { name: 'Customer ID', desc: 'ID unik pelanggan' },
    { name: 'Nama', desc: 'Nama pelanggan' },
    { name: 'Kategori', desc: 'Kategori tiket (Technical, Billing, etc.)' },
    { name: 'Deskripsi', desc: 'Deskripsi detail tiket' },
    { name: 'Penyebab', desc: 'Penyebab masalah' },
    { name: 'Penanganan', desc: 'Cara penanganan utama' },
    { name: 'Waktu Open', desc: 'Waktu buka tiket (YYYY-MM-DD HH:mm)' },
    { name: 'Waktu Close Tiket', desc: 'Waktu tutup tiket (YYYY-MM-DD HH:mm)' },
    { name: 'Durasi', desc: 'Durasi total dalam jam (otomatis dihitung)' },
    { name: 'Close Penanganan', desc: 'Waktu selesai penanganan' },
    { name: 'Durasi Penanganan', desc: 'Durasi penanganan dalam jam' },
    { name: 'Klasifikasi', desc: 'Klasifikasi utama masalah' },
    { name: 'Sub Klasifikasi', desc: 'Sub klasifikasi masalah' },
    { name: 'Status', desc: 'Status tiket (Open/Closed/In Progress)' },
    { name: 'Penanganan 1', desc: 'Langkah penanganan pertama' },
    { name: 'Close Penanganan 1', desc: 'Waktu selesai penanganan 1' },
    { name: 'Durasi Penanganan 1', desc: 'Durasi penanganan 1 dalam jam' },
    { name: 'Penanganan 2', desc: 'Langkah penanganan kedua' },
    { name: 'Close Penanganan 2', desc: 'Waktu selesai penanganan 2' },
    { name: 'Durasi Penanganan 2', desc: 'Durasi penanganan 2 dalam jam' },
    { name: 'Penanganan 3', desc: 'Langkah penanganan ketiga' },
    { name: 'Close Penanganan 3', desc: 'Waktu selesai penanganan 3' },
    { name: 'Durasi Penanganan 3', desc: 'Durasi penanganan 3 dalam jam' },
    { name: 'Penanganan 4', desc: 'Langkah penanganan keempat' },
    { name: 'Close Penanganan 4', desc: 'Waktu selesai penanganan 4' },
    { name: 'Durasi Penanganan 4', desc: 'Durasi penanganan 4 dalam jam' },
    { name: 'Penanganan 5', desc: 'Langkah penanganan kelima' },
    { name: 'Close Penanganan 5', desc: 'Waktu selesai penanganan 5' },
    { name: 'Durasi Penanganan 5', desc: 'Durasi penanganan 5 dalam jam' },
    { name: 'Open By', desc: 'Agent yang membuka tiket' },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Hero Section */}
      <div className="text-center py-12">
        <TableCellsIcon className="mx-auto h-24 w-24 text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Excel File</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Upload file Excel untuk analisis otomatis data tiket
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            🔄 <strong>Backend Parser Otomatis:</strong> Sistem akan otomatis mengekstrak data, menghitung durasi, dan membuat summary analisis
          </p>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div className="max-w-2xl mx-auto">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          
          {uploadedFile ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                File terpilih: {uploadedFile.name}
              </p>
              <button
                onClick={handleUpload}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isProcessing ? 'Memproses...' : 'Upload & Proses File'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Drop file Excel di sini, atau{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium">
                  pilih file
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500">
                Mendukung file .xlsx dan .xls
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expected Format Preview */}
      <div className="max-w-6xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Format Excel yang Diharapkan
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nama Kolom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Deskripsi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {expectedColumns.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {row.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Processing Info */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">
            📊 Fitur Analisis Otomatis
          </h4>
          <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
            <li>• Ekstraksi otomatis semua data dari Excel</li>
            <li>• Perhitungan durasi tiket dan penanganan secara otomatis</li>
            <li>• Analisis komplain terbanyak berdasarkan kategori</li>
            <li>• Statistik performa agent dan durasi penanganan</li>
            <li>• Summary bulanan dan trend analysis</li>
            <li>• Dashboard real-time setelah upload selesai</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadProcess;
