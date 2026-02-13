import React, { memo } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const withBoundary = (Comp: React.ComponentType<any>) => {
  const WrappedComponent = (props: any) => (
    <ErrorBoundary>
      <Comp {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withBoundary(${Comp.displayName || Comp.name || 'Component'})`;

  return memo(WrappedComponent);
};
