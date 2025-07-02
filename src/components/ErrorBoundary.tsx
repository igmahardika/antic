import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Bisa log ke service monitoring di sini
    // console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Terjadi kesalahan pada halaman ini.</h1>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 