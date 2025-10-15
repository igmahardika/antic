import { useState, useEffect, useCallback } from 'react';
import { AgentPhoto, getAgentPhotoPath, checkPhotoExists, createPhotoFromFile } from '@/utils/photoUtils';

/**
 * Hook for managing agent photos
 * Integrates with existing photo system and provides real-time updates
 */
export const useAgentPhotos = (allAgents: string[]) => {
  const [photos, setPhotos] = useState<AgentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load existing photos from public folder
  const loadPhotos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const photoPromises = allAgents.map(async (agentName) => {
        const photoPath = getAgentPhotoPath(agentName);
        const exists = await checkPhotoExists(agentName);
        
        if (exists) {
          return {
            id: `photo-${agentName.replace(/\s+/g, '-').toLowerCase()}`,
            agentName,
            fileName: `${agentName}.png`,
            filePath: photoPath,
            fileSize: 0, // Will be updated when file is loaded
            uploadDate: new Date(), // Will be updated with actual file date
            lastModified: new Date(),
            isActive: true
          } as AgentPhoto;
        }
        
        return null;
      });
      
      const photoResults = await Promise.all(photoPromises);
      const validPhotos = photoResults.filter((photo): photo is AgentPhoto => photo !== null);
      
      setPhotos(validPhotos);
    } catch (err) {
      setError('Gagal memuat foto agent');
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  }, [allAgents]);

  // Upload new photos
  const uploadPhotos = useCallback(async (files: File[]) => {
    try {
      setError(null);
      
      const newPhotos: AgentPhoto[] = [];
      
      for (const file of files) {
        // Extract agent name from filename (remove extension)
        const agentName = file.name.replace(/\.[^/.]+$/, "");
        const photo = createPhotoFromFile(file, agentName);
        newPhotos.push(photo);
      }
      
      // Add to existing photos (replace if exists)
      setPhotos(prev => {
        const updated = [...prev];
        
        newPhotos.forEach(newPhoto => {
          const existingIndex = updated.findIndex(p => p.agentName === newPhoto.agentName);
          if (existingIndex >= 0) {
            updated[existingIndex] = newPhoto;
          } else {
            updated.push(newPhoto);
          }
        });
        
        return updated;
      });
      
      // In real implementation, upload files to server here
      console.log('Uploading photos:', newPhotos);
      
    } catch (err) {
      setError('Gagal mengupload foto');
      console.error('Error uploading photos:', err);
    }
  }, []);

  // Delete photo
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      
      // In real implementation, delete from server here
      console.log('Deleting photo:', photoId);
    } catch (err) {
      setError('Gagal menghapus foto');
      console.error('Error deleting photo:', err);
    }
  }, []);

  // Replace photo
  const replacePhoto = useCallback(async (photoId: string, file: File) => {
    try {
      const agentName = file.name.replace(/\.[^/.]+$/, "");
      const newPhoto = createPhotoFromFile(file, agentName);
      
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId ? newPhoto : photo
      ));
      
      // In real implementation, replace file on server here
      console.log('Replacing photo:', photoId, newPhoto);
    } catch (err) {
      setError('Gagal mengganti foto');
      console.error('Error replacing photo:', err);
    }
  }, []);

  // Get photo for specific agent
  const getPhotoForAgent = useCallback((agentName: string): AgentPhoto | null => {
    return photos.find(photo => photo.agentName === agentName) || null;
  }, [photos]);

  // Check if agent has photo
  const hasPhoto = useCallback((agentName: string): boolean => {
    return photos.some(photo => photo.agentName === agentName && photo.isActive);
  }, [photos]);

  // Get photo statistics
  const getPhotoStats = useCallback(() => {
    const totalPhotos = photos.length;
    const activePhotos = photos.filter(photo => photo.isActive).length;
    const outdatedPhotos = photos.filter(photo => {
      const daysSinceUpload = Math.floor(
        (Date.now() - photo.uploadDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpload > 30;
    }).length;
    const missingPhotos = allAgents.length - totalPhotos;
    
    return { totalPhotos, activePhotos, outdatedPhotos, missingPhotos };
  }, [photos, allAgents.length]);

  // Load photos on mount
  useEffect(() => {
    if (allAgents.length > 0) {
      loadPhotos();
    }
  }, [allAgents, loadPhotos]);

  return {
    photos,
    loading,
    error,
    uploadPhotos,
    deletePhoto,
    replacePhoto,
    getPhotoForAgent,
    hasPhoto,
    getPhotoStats,
    refreshPhotos: loadPhotos
  };
};
