import { useState, useEffect, useCallback } from 'react';
import { AgentPhoto, getAgentPhotoPath, checkPhotoExists, createPhotoFromFile, uploadPhotoFile, deletePhotoFile } from '@/utils/photoUtils';

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
      setLoading(true);
      
      const newPhotos: AgentPhoto[] = [];
      
      for (const file of files) {
        // Extract agent name from filename (remove extension)
        const agentName = file.name.replace(/\.[^/.]+$/, "");
        
        try {
          // Upload file to server
          const filePath = await uploadPhotoFile(file, agentName);
          
          // Create photo object with actual file path
          const photo = createPhotoFromFile(file, agentName);
          photo.filePath = filePath;
          newPhotos.push(photo);
          
        } catch (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          setError(`Gagal mengupload ${file.name}: ${uploadError.message}`);
          continue;
        }
      }
      
      if (newPhotos.length > 0) {
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
      }
      
    } catch (err) {
      setError('Gagal mengupload foto');
      console.error('Error uploading photos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete photo
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      const photoToDelete = photos.find(p => p.id === photoId);
      if (!photoToDelete) {
        throw new Error('Photo not found');
      }
      
      // Delete from server
      await deletePhotoFile(photoToDelete.agentName);
      
      // Remove from state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      
    } catch (err) {
      setError('Gagal menghapus foto');
      console.error('Error deleting photo:', err);
    }
  }, [photos]);

  // Replace photo
  const replacePhoto = useCallback(async (photoId: string, file: File) => {
    try {
      setLoading(true);
      const agentName = file.name.replace(/\.[^/.]+$/, "");
      
      // Upload new file to server
      const filePath = await uploadPhotoFile(file, agentName);
      
      // Create new photo object
      const newPhoto = createPhotoFromFile(file, agentName);
      newPhoto.filePath = filePath;
      
      // Update state
      setPhotos(prev => prev.map(photo => 
        photo.id === photoId ? newPhoto : photo
      ));
      
    } catch (err) {
      setError('Gagal mengganti foto');
      console.error('Error replacing photo:', err);
    } finally {
      setLoading(false);
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
