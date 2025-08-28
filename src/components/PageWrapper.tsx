import React from 'react';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <div 
    className="max-w-screen-4xl w-full mx-auto px-4 md:px-8 lg:px-16 py-6 transition-all duration-300 !max-w-screen-4xl !w-full !mx-auto"
    style={{
      maxWidth: '1792px',
      width: '100%',
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingLeft: '1rem',
      paddingRight: '1rem',
      paddingTop: '1.5rem',
      paddingBottom: '1.5rem'
    }}
  >
    {children}
  </div>
);

export default PageWrapper; 