import { cn } from '@/lib/utils';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle size={48} className="text-destructive mb-6 flex-shrink-0" />

            <h1 className="text-xl font-semibold mb-2">Something went wrong.</h1>
            <p className="text-center text-muted-foreground mb-8">
              We couldn&apos;t load this page. Please try reloading, or return to the homepage to
              continue browsing.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
                  'bg-primary text-primary-foreground',
                  'hover:opacity-90 cursor-pointer',
                )}
              >
                <RotateCcw size={16} />
                Reload Page
              </button>
              <button
                onClick={() => window.location.assign('/')}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2 rounded-lg',
                  'bg-muted text-foreground border',
                  'hover:bg-accent cursor-pointer',
                )}
              >
                <Home size={16} />
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
