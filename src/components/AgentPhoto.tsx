import React, { useState, useEffect } from 'react';

interface AgentPhotoProps {
  agentName: string;
  className?: string;
}

const AgentPhoto: React.FC<AgentPhotoProps> = ({ agentName, className = "" }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Generate photo paths
  const photoPaths = [
    `/agents/${agentName.replace(/\s+/g, '_')}.png`,
    `/agents/${agentName.replace(/\s+/g, '_')}.jpg`,
    `/agents/${agentName.replace(/\s+/g, '_')}.jpeg`,
    `/agents/${agentName.toLowerCase().replace(/\s+/g, '_')}.png`,
  ];

  // Reset state when agent name changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setCurrentPhotoIndex(0);
  }, [agentName]);

  const handleImageLoad = () => {
    console.log(`✅ Photo loaded successfully: ${photoPaths[currentPhotoIndex]}`);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.log(`❌ Photo failed to load: ${photoPaths[currentPhotoIndex]}`);
    if (currentPhotoIndex < photoPaths.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else {
      setImageError(true);
      setImageLoaded(false);
    }
  };

  // Generate initials for fallback
  const initials = agentName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      {!imageError ? (
        <img 
          src={photoPaths[currentPhotoIndex]} 
          alt={`${agentName}`}
          className="w-full h-full object-cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-4xl font-bold">
          {initials}
        </div>
      )}
    </div>
  );
};

export default AgentPhoto;
