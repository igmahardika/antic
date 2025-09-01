import React from 'react';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div 
    className="w-full mx-auto px-4 md:px-8 lg:px-16 py-6 transition-all duration-300"
    style={{
      maxWidth: '95vw'
    }}
  >
    {children}
  </div>
);

export default PageWrapper; 