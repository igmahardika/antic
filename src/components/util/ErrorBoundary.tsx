// src/components/util/ErrorBoundary.tsx
import React from 'react';

type State = { hasError: boolean; error?: any };
export class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) return this.props.fallback ?? <div role="alert">Terjadi kesalahan.</div>;
    return this.props.children;
  }
}
