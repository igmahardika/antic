import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Trash2, 
  Edit3, 
  Image as ImageIcon, 
  User, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface AgentPhoto {
  id: string;
  agentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadDate: Date;
  lastModified: Date;
  isActive: boolean;
}

interface PhotoGridProps {
  photos: AgentPhoto[];
  onDelete: (photoId: string) => void;
  onReplace: (photoId: string, file: File) => void;
  loading?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ 
  photos, 
  onDelete, 
  onReplace, 
  loading = false 
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplaceFile(file);
    }
  };

  const handleReplace = () => {
    if (selectedPhoto && replaceFile) {
      onReplace(selectedPhoto, replaceFile);
      setSelectedPhoto(null);
      setReplaceFile(null);
    }
  };

  const getPhotoStatus = (photo: AgentPhoto) => {
    if (!photo.isActive) return 'inactive';
    const now = new Date();
    const daysSinceUpload = Math.floor((now.getTime() - photo.uploadDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpload > 30) return 'outdated';
    return 'active';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'outdated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'outdated': return <AlertCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <Alert>
        <ImageIcon className="h-4 w-4" />
        <AlertDescription>
          Belum ada foto agent yang diupload. Gunakan form upload di atas untuk menambahkan foto agent.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos.map((photo) => {
          const status = getPhotoStatus(photo);
          const isSelected = selectedPhoto === photo.id;
          
          return (
            <Card 
              key={photo.id} 
              className={`relative group transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <CardContent className="p-4">
                {/* Photo Preview */}
                <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={photo.filePath}
                    alt={photo.agentName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Failed to load image:', photo.filePath, 'for agent:', photo.agentName);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', photo.filePath);
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge className={`text-xs ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                    </Badge>
                  </div>
                </div>

                {/* Photo Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {photo.agentName}
                  </h4>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>{formatFileSize(photo.fileSize)}</p>
                    <p>Upload: {formatDate(photo.uploadDate)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(photo.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedPhoto(photo.id)}
                      className="bg-white hover:bg-gray-50"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Replace Modal */}
      {selectedPhoto && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Replace Photo
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pilih file baru
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              
              {replaceFile && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {replaceFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(replaceFile.size)}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPhoto(null);
                    setReplaceFile(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleReplace}
                  disabled={!replaceFile}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Replace
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PhotoGrid;
