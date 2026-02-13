import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const withBoundary = (Comp: React.ComponentType<any>) => (props: any) => (
  <ErrorBoundary>
    <Suspense fallback={null}>
      <Comp {...props} />
    </Suspense>
  </ErrorBoundary>
);
