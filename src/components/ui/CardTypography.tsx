import React from 'react';

type TypographyProps = {
  children: React.ReactNode;
  className?: string;
};

export const CardHeaderTitle: React.FC<TypographyProps> = ({ children, className }) => {
  return (
    <div className={`text-lg md:text-xl font-semibold leading-tight text-card-foreground ${className || ''}`}>
      {children}
    </div>
  );
};

export const CardHeaderDescription: React.FC<TypographyProps> = ({ children, className }) => {
  return (
    <div className={`text-sm text-muted-foreground leading-relaxed ${className || ''}`}>
      {children}
    </div>
  );
};

export const CardContentText: React.FC<TypographyProps> = ({ children, className }) => {
  return (
    <div className={`text-sm md:text-base text-card-foreground leading-normal ${className || ''}`}>
      {children}
    </div>
  );
};


