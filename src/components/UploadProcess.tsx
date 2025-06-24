
import React, { useState, useCallback } from 'react';
import { DocumentArrowUpIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/use-toast';

const UploadProcess = () => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch('/api/tickets/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Upload berhasil!",
          description: "File Excel telah diproses dan data tiket telah diimpor.",
        });
        setUploadedFile(null);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload gagal",
        description: "Terjadi kesalahan saat mengupload file. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Hero Section */}
      <div className="text-center py-12">
        <TableCellsIcon className="mx-auto h-24 w-24 text-gray-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Excel File</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Drag and drop your Excel file or click to browse
        </p>
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
                File selected: {uploadedFile.name}
              </p>
              <button
                onClick={handleUpload}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Upload File
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Drop your Excel file here, or{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer font-medium">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500">
                Supports .xlsx and .xls files
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expected Format Preview */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Expected Excel Format
        </h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Column Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { name: 'Customer ID', desc: 'Unique identifier for customer' },
                { name: 'Name', desc: 'Customer name' },
                { name: 'Category', desc: 'Ticket category (Technical, Billing, etc.)' },
                { name: 'Description', desc: 'Ticket description' },
                { name: 'Open Time', desc: 'When ticket was opened (YYYY-MM-DD HH:mm)' },
                { name: 'Close Time', desc: 'When ticket was closed (YYYY-MM-DD HH:mm)' },
                { name: 'Duration', desc: 'Duration in hours' },
                { name: 'Open By', desc: 'Agent who opened the ticket' },
              ].map((row, index) => (
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
  );
};

export default UploadProcess;
