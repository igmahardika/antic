/**
 * Photo Management Utilities
 * Handles photo path resolution, validation, and integration with analytics
 */

export interface AgentPhoto {
  id: string;
  agentName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadDate: Date;
  lastModified: Date;
  isActive: boolean;
}

/**
 * Get photo path for agent - checks multiple sources
 */
export const getAgentPhotoPath = (agentName: string): string => {
  if (!agentName) return '/agent-photos/placeholder.png';
  
  // Normalize agent name for file lookup
  const normalizedName = normalizeAgentName(agentName);
  
  // Check if photo exists in public folder
  return `/agent-photos/${normalizedName}.png`;
};

/**
 * Normalize agent name for consistent file naming
 */
export const normalizeAgentName = (agentName: string): string => {
  if (!agentName) return '';
  
  // Handle special cases
  if (agentName.includes("Difa")) {
    return "Difa' Fathir Aditya";
  }
  
  // Remove special characters and normalize
  return agentName
    .trim()
    .replace(/[^\w\s'-]/g, '') // Remove special chars except spaces, hyphens, apostrophes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
};

/**
 * Check if photo exists for agent
 */
export const checkPhotoExists = async (agentName: string): Promise<boolean> => {
  try {
    const photoPath = getAgentPhotoPath(agentName);
    const response = await fetch(photoPath, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Get agent initials for fallback avatar
 */
export const getAgentInitials = (agentName: string): string => {
  if (!agentName) return "?";
  
  const names = agentName.split(" ");
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return agentName[0]?.toUpperCase() || "?";
};

/**
 * Validate photo file
 */
export const validatePhotoFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File ${file.name} bukan format gambar yang didukung (PNG, JPG, JPEG)`
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File ${file.name} terlalu besar (maksimal 5MB)`
    };
  }
  
  return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get photo status for management
 */
export const getPhotoStatus = (photo: AgentPhoto): 'active' | 'outdated' | 'inactive' => {
  if (!photo.isActive) return 'inactive';
  
  const daysSinceUpload = Math.floor(
    (Date.now() - photo.uploadDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceUpload > 30) return 'outdated';
  return 'active';
};

/**
 * Create photo object from file
 */
export const createPhotoFromFile = (file: File, agentName: string): AgentPhoto => {
  const normalizedName = normalizeAgentName(agentName);
  
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentName: normalizedName,
    fileName: file.name,
    filePath: `/agent-photos/${normalizedName}.png`,
    fileSize: file.size,
    uploadDate: new Date(),
    lastModified: new Date(),
    isActive: true
  };
};

/**
 * Photo status colors for UI
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': 
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'outdated': 
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    case 'inactive': 
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    default: 
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  }
};

/**
 * Photo status icons for UI
 */
export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'active': return '✓';
    case 'outdated': return '⚠';
    case 'inactive': return '✗';
    default: return '?';
  }
};
