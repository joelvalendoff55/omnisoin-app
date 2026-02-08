import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** If true, shows a minimal inline error instead of a card */
  inline?: boolean;
  /** Custom error message to display */
  errorMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary component that catches React rendering errors.
 * Prevents the entire app from crashing and logs errors to console instead of showing popups.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console instead of showing intrusive popups
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.props.inline) {
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{(this.props.errorMessage || 'Données temporairement indisponibles') + ' -- ' + String(this.state.error || 'no error')}</span>
              {this.state.error && <pre style={{fontSize:'10px',marginTop:'8px',whiteSpace:'pre-wrap',maxHeight:'200px',overflow:'auto'}}>{String(this.state.error)}</pre>}
          </div>
        );
      }

      return (
        <div className="p-4 rounded-lg border border-muted bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              {this.props.errorMessage || 'Une erreur est survenue. Veuillez rafraîchir la page.'}
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<Props, 'children'>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
