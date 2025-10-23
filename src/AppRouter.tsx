// src/AppRouter.tsx
import React from 'react';
import { useRoutes } from 'react-router-dom';
import { createRoutes } from './routes/manifest';
import { PageSkeleton } from './components/ui/Loading';

export default function AppRouter() {
  const element = useRoutes(createRoutes());
  return (
    <React.Suspense fallback={<PageSkeleton />}> {element} </React.Suspense>
  );
}
