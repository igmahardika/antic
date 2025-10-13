import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const withBoundary = (Comp: React.ComponentType<any>) => (props: any) => (
  <ErrorBoundary>
    <Comp {...props} />
  </ErrorBoundary>
);
