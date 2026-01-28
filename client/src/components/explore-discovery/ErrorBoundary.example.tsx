/**
 * ErrorBoundary Component Examples
 *
 * Demonstrates various usage patterns for the ExploreErrorBoundary component
 */

import { useState } from 'react';
import { ExploreErrorBoundary, NetworkError, InlineError } from './ErrorBoundary';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { useQuery } from '@tanstack/react-query';

/**
 * Example 1: Basic Error Boundary Usage
 */
export function BasicErrorBoundaryExample() {
  return (
    <ExploreErrorBoundary>
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Protected Content</h2>
        <p>This content is protected by an error boundary.</p>
      </div>
    </ExploreErrorBoundary>
  );
}

/**
 * Example 2: Component That Throws Error
 */
function ComponentThatThrows() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('This is a test error!');
  }

  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold mb-4">Error Trigger Demo</h3>
      <p className="text-gray-600 mb-4">
        Click the button below to trigger an error and see the error boundary in action.
      </p>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Trigger Error
      </button>
    </ModernCard>
  );
}

export function ErrorBoundaryWithThrowingComponent() {
  return (
    <ExploreErrorBoundary>
      <ComponentThatThrows />
    </ExploreErrorBoundary>
  );
}

/**
 * Example 3: Error Boundary with Custom Error Handler
 */
export function ErrorBoundaryWithLogging() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console (in production, send to error tracking service)
    console.error('Error caught by boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // In production, you might send to Sentry, LogRocket, etc.
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  };

  return (
    <ExploreErrorBoundary onError={handleError}>
      <ComponentThatThrows />
    </ExploreErrorBoundary>
  );
}

/**
 * Example 4: Standalone NetworkError Component
 */
export function StandaloneNetworkErrorExample() {
  const [error, setError] = useState<Error | null>(new Error('Failed to fetch data from server'));

  const handleRetry = () => {
    console.log('Retrying...');
    setError(null);
    // Simulate retry
    setTimeout(() => {
      setError(new Error('Still failing...'));
    }, 1000);
  };

  if (error) {
    return <NetworkError error={error} onRetry={handleRetry} isNetworkError={true} />;
  }

  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold">Content Loaded Successfully</h3>
      <p className="text-gray-600 mt-2">No errors to display.</p>
    </ModernCard>
  );
}

/**
 * Example 5: InlineError Component
 */
export function InlineErrorExample() {
  const [hasError, setHasError] = useState(true);

  return (
    <div className="space-y-4 p-8">
      <h2 className="text-2xl font-bold">Inline Error Demo</h2>

      {hasError && (
        <InlineError
          message="Failed to load user preferences. Using default settings."
          onRetry={() => {
            console.log('Retrying...');
            setHasError(false);
          }}
        />
      )}

      <ModernCard className="p-6">
        <h3 className="text-lg font-semibold">Main Content</h3>
        <p className="text-gray-600 mt-2">
          The inline error appears above this content without disrupting the layout.
        </p>
      </ModernCard>
    </div>
  );
}

/**
 * Example 6: React Query Integration
 */
function QueryComponent() {
  const { data, error, refetch, isLoading } = useQuery({
    queryKey: ['example-data'],
    queryFn: async () => {
      // Simulate API call that fails
      throw new Error('API request failed');
    },
    retry: false,
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return (
      <InlineError
        message={error instanceof Error ? error.message : 'Failed to load data'}
        onRetry={refetch}
      />
    );
  }

  return (
    <ModernCard className="p-6">
      <h3 className="text-lg font-semibold">Data Loaded</h3>
      <pre className="mt-2 text-sm">{JSON.stringify(data, null, 2)}</pre>
    </ModernCard>
  );
}

export function ReactQueryErrorExample() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">React Query Error Handling</h2>
      <QueryComponent />
    </div>
  );
}

/**
 * Example 7: Multiple Error Boundaries
 */
export function NestedErrorBoundariesExample() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Nested Error Boundaries</h2>

      <ExploreErrorBoundary>
        <ModernCard className="p-6">
          <h3 className="text-lg font-semibold mb-2">Section 1</h3>
          <p className="text-gray-600">This section has its own error boundary.</p>
        </ModernCard>
      </ExploreErrorBoundary>

      <ExploreErrorBoundary>
        <ModernCard className="p-6">
          <h3 className="text-lg font-semibold mb-2">Section 2</h3>
          <ComponentThatThrows />
        </ModernCard>
      </ExploreErrorBoundary>

      <ExploreErrorBoundary>
        <ModernCard className="p-6">
          <h3 className="text-lg font-semibold mb-2">Section 3</h3>
          <p className="text-gray-600">This section remains unaffected by errors in Section 2.</p>
        </ModernCard>
      </ExploreErrorBoundary>
    </div>
  );
}

/**
 * Example 8: Custom Fallback UI
 */
export function CustomFallbackExample() {
  const customFallback = (
    <ModernCard className="p-8 text-center">
      <h3 className="text-xl font-bold mb-2">Oops! Custom Error UI</h3>
      <p className="text-gray-600 mb-4">
        This is a custom fallback component instead of the default error UI.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
      >
        Reload Page
      </button>
    </ModernCard>
  );

  return (
    <ExploreErrorBoundary fallback={customFallback}>
      <ComponentThatThrows />
    </ExploreErrorBoundary>
  );
}

/**
 * Example 9: Network vs General Error Detection
 */
export function ErrorTypeDetectionExample() {
  const [errorType, setErrorType] = useState<'network' | 'general'>('network');

  const error =
    errorType === 'network'
      ? new Error('Failed to fetch data from server')
      : new Error('Invalid data format received');

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Error Type Detection</h2>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setErrorType('network')}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          Show Network Error
        </button>
        <button
          onClick={() => setErrorType('general')}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Show General Error
        </button>
      </div>

      <NetworkError
        error={error}
        onRetry={() => console.log('Retry clicked')}
        isNetworkError={errorType === 'network'}
      />
    </div>
  );
}

/**
 * Demo Page Component
 */
export function ErrorBoundaryDemoPage() {
  const [activeExample, setActiveExample] = useState<string>('basic');

  const examples = {
    basic: { title: 'Basic Usage', component: <BasicErrorBoundaryExample /> },
    throwing: { title: 'Error Trigger', component: <ErrorBoundaryWithThrowingComponent /> },
    logging: { title: 'With Logging', component: <ErrorBoundaryWithLogging /> },
    network: { title: 'Network Error', component: <StandaloneNetworkErrorExample /> },
    inline: { title: 'Inline Error', component: <InlineErrorExample /> },
    query: { title: 'React Query', component: <ReactQueryErrorExample /> },
    nested: { title: 'Nested Boundaries', component: <NestedErrorBoundariesExample /> },
    custom: { title: 'Custom Fallback', component: <CustomFallbackExample /> },
    detection: { title: 'Error Detection', component: <ErrorTypeDetectionExample /> },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">ErrorBoundary Examples</h1>

        {/* Example Selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(examples).map(([key, { title }]) => (
            <button
              key={key}
              onClick={() => setActiveExample(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeExample === key
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {title}
            </button>
          ))}
        </div>

        {/* Active Example */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {examples[activeExample as keyof typeof examples].component}
        </div>
      </div>
    </div>
  );
}
