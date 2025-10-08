'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Alert className="bg-red-500/20 border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
                    <p className="text-sm">
                      An unexpected error occurred. Please try refreshing the page.
                    </p>
                  </div>
                  
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-red-300 hover:text-red-200">
                        Error Details
                      </summary>
                      <pre className="mt-2 p-2 bg-black/20 rounded text-red-300 overflow-auto">
                        {this.state.error.message}
                        {this.state.error.stack && `\n\n${this.state.error.stack}`}
                      </pre>
                    </details>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={this.resetError}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      Refresh Page
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
  };
}
