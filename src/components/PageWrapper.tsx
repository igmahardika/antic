import React from 'react';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-screen-3xl w-full mx-auto px-4 md:px-8 lg:px-16 py-6 transition-all duration-300">
    {children}
  </div>
);

export default PageWrapper; 