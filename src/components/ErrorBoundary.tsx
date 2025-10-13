import { Component, ReactNode } from 'react';

type State = { hasError: boolean; error?: Error };
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: unknown) {
    // TODO: kirim ke Sentry / logger backend
    // console.error('ErrorBoundary', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold">Terjadi kesalahan.</h2>
          <p className="text-sm opacity-70">Silakan muat ulang atau hubungi admin.</p>
        </div>
      );
    }
    return this.props.children;
  }
}