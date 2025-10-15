import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Upload, 
  Grid3X3, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import PhotoUpload from './PhotoUpload';
import PhotoGrid from './PhotoGrid';
import { useAgentPhotos } from '@/hooks/useAgentPhotos';

interface PhotoManagementProps {
  allAgents: string[];
}

const PhotoManagement: React.FC<PhotoManagementProps> = ({ allAgents }) => {
  const [uploading, setUploading] = useState(false);
  
  const {
    photos,
    loading,
    error,
    uploadPhotos,
    deletePhoto,
    replacePhoto,
    refreshPhotos
  } = useAgentPhotos(allAgents);

  const handleUpload = async (files: File[]) => {
    try {
      setUploading(true);
      await uploadPhotos(files);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto(photoId);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleReplace = async (photoId: string, file: File) => {
    try {
      await replacePhoto(photoId, file);
    } catch (err) {
      console.error('Replace error:', err);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Photo Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kelola foto agent dan pastikan semua agent memiliki foto
          </p>
        </div>
        <Button
          onClick={refreshPhotos}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>


      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Photos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload onUpload={handleUpload} uploading={uploading} />
        </CardContent>
      </Card>

      {/* Photo Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Grid3X3 className="w-5 h-5" />
            <span>All Photos</span>
            <Badge variant="secondary">{photos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGrid
            photos={photos}
            onDelete={handleDelete}
            onReplace={handleReplace}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default PhotoManagement;
