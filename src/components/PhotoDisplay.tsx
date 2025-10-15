import React, { useState } from 'react';
import { getAgentPhotoPath, getAgentInitials } from '@/utils/photoUtils';

interface PhotoDisplayProps {
  agentName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showFallback?: boolean;
  onError?: () => void;
  onLoad?: () => void;
}

const PhotoDisplay: React.FC<PhotoDisplayProps> = ({
  agentName,
  className = '',
  size = 'md',
  showFallback = true,
  onError,
  onLoad
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    onLoad?.();
  };

  const photoPath = getAgentPhotoPath(agentName);
  const initials = getAgentInitials(agentName);

  if (imageError || !showFallback) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ${className}`}>
        <span className={textSizeClasses[size]}>
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative ${className}`}>
      <img
        src={photoPath}
        alt={agentName}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
      
      {/* Loading state */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Fallback avatar */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg`}>
            <span className={textSizeClasses[size]}>
              {initials}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoDisplay;
