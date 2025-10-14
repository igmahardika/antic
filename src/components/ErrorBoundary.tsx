import React from 'react';

export class ErrorBoundary extends React.Component<React.PropsWithChildren, {hasError:boolean}> {
  constructor(props:any){super(props);this.state={hasError:false};}
  static getDerivedStateFromError(){return {hasError:true};}
  componentDidCatch(error:unknown, info:unknown){console.error('ErrorBoundary', error, info);}
  render(){return this.state.hasError ? <div role="alert">Something went wrong.</div> : this.props.children;}
}