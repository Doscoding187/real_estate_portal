# ErrorBoundary Component

A specialized error boundary for the Explore feature with modern styling, clear error messaging, and retry functionality.

## Features

- ✅ **React Error Boundary**: Catches JavaScript errors in child components
- ✅ **Network Error Detection**: Automatically detects network-related errors
- ✅ **Modern UI**: Uses ModernCard and design tokens for consistent styling
- ✅ **Retry Functionality**: Allows users to retry failed operations
- ✅ **Development Mode**: Shows detailed error information in development
- ✅ **Accessibility**: Proper ARIA labels and keyboard navigation
- ✅ **Animations**: Smooth entrance animations with Framer Motion

## Components

### ExploreErrorBoundary

Main error boundary component that wraps Explore feature components.

```tsx
import { ExploreErrorBoundary } from '@/components/explore-discovery/ErrorBoundary';

function ExploreFeature() {
  return (
    <ExploreErrorBoundary
      onError={(error, errorInfo) => {
        // Optional: Log to error tracking service
        console.error('Error caught:', error, errorInfo);
      }}
    >
      <YourExploreComponent />
    </ExploreErrorBoundary>
  );
}
```

### NetworkError

Standalone component for displaying network errors with retry functionality.

```tsx
import { NetworkError } from '@/components/explore-discovery/ErrorBoundary';

function MyComponent() {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <NetworkError
        error={error}
        onRetry={() => {
          setError(null);
          // Retry logic
        }}
        isNetworkError={true}
      />
    );
  }

  return <YourContent />;
}
```

### InlineError

Compact error display for inline use within components.

```tsx
import { InlineError } from '@/components/explore-discovery/ErrorBoundary';

function MyComponent() {
  const { error, retry } = useSomeQuery();

  return (
    <div>
      {error && (
        <InlineError
          message="Failed to load data"
          onRetry={retry}
        />
      )}
      <YourContent />
    </div>
  );
}
```

## Props

### ExploreErrorBoundary Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Child components to wrap |
| `fallback` | `ReactNode` | `undefined` | Custom fallback UI |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | `undefined` | Error callback |

### NetworkError Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `error` | `Error` | Required | Error object to display |
| `onRetry` | `() => void` | Required | Retry callback function |
| `isNetworkError` | `boolean` | `true` | Whether error is network-related |
| `className` | `string` | `undefined` | Additional CSS classes |

### InlineError Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | Required | Error message to display |
| `onRetry` | `() => void` | `undefined` | Optional retry callback |
| `className` | `string` | `undefined` | Additional CSS classes |

## Error Types

The component automatically detects error types:

### Network Errors
- Shows WiFi icon
- "Connection Error" title
- Suggests checking internet connection

### General Errors
- Shows server crash icon
- "Something Went Wrong" title
- Generic error message

## Usage Examples

### Basic Usage

```tsx
import { ExploreErrorBoundary } from '@/components/explore-discovery/ErrorBoundary';

function ExploreHome() {
  return (
    <ExploreErrorBoundary>
      <DiscoveryCardFeed />
      <ExploreVideoFeed />
    </ExploreErrorBoundary>
  );
}
```

### With Custom Error Handling

```tsx
import { ExploreErrorBoundary } from '@/components/explore-discovery/ErrorBoundary';
import * as Sentry from '@sentry/react';

function ExploreFeature() {
  return (
    <ExploreErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error tracking service
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }}
    >
      <YourComponent />
    </ExploreErrorBoundary>
  );
}
```

### With Custom Fallback

```tsx
import { ExploreErrorBoundary } from '@/components/explore-discovery/ErrorBoundary';

function ExploreFeature() {
  return (
    <ExploreErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <h2>Custom Error UI</h2>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      }
    >
      <YourComponent />
    </ExploreErrorBoundary>
  );
}
```

### Inline Error in Query

```tsx
import { InlineError } from '@/components/explore-discovery/ErrorBoundary';
import { useQuery } from '@tanstack/react-query';

function PropertyList() {
  const { data, error, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  return (
    <div>
      {error && (
        <InlineError
          message="Failed to load properties"
          onRetry={refetch}
        />
      )}
      {data && <PropertyCards properties={data} />}
    </div>
  );
}
```

## Styling

The component uses:
- **Design Tokens**: From `@/lib/design-tokens`
- **ModernCard**: For consistent card styling
- **Tailwind CSS**: For utility classes
- **Framer Motion**: For smooth animations

### Color Scheme

- Network errors: Orange accent (`text-orange-500`)
- General errors: Red accent (`text-red-500`)
- Retry button: Indigo gradient (`from-indigo-500 to-indigo-600`)

## Accessibility

- ✅ Proper ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus management with visible focus rings
- ✅ Screen reader friendly error messages
- ✅ Semantic HTML structure

## Development Mode

In development, the component shows:
- Full error message
- Stack trace
- Expandable details section

In production:
- User-friendly error messages only
- No technical details exposed

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ExploreErrorBoundary, NetworkError } from './ErrorBoundary';

describe('ExploreErrorBoundary', () => {
  it('catches errors and displays error UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(
      <ExploreErrorBoundary>
        <ThrowError />
      </ExploreErrorBoundary>
    );

    expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    const error = new Error('Test error');

    render(<NetworkError error={error} onRetry={onRetry} />);

    fireEvent.click(screen.getByText(/Try Again/i));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

## Integration with React Query

```tsx
import { ExploreErrorBoundary } from '@/components/explore-discovery/ErrorBoundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

function ExploreFeature() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ExploreErrorBoundary
          onError={(error) => {
            console.error('Query error:', error);
          }}
        >
          <YourQueryComponent />
        </ExploreErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

## Best Practices

1. **Wrap at appropriate levels**: Place error boundaries at logical component boundaries
2. **Provide retry logic**: Always implement meaningful retry functionality
3. **Log errors**: Use `onError` callback to log to error tracking services
4. **Test error states**: Ensure error boundaries work correctly in tests
5. **Use inline errors for queries**: Use `InlineError` for React Query errors
6. **Combine with QueryErrorResetBoundary**: For better React Query integration

## Requirements Validation

✅ **Requirement 7.1**: Error handling with retry functionality
- Implements error boundary with retry button
- Clear error messaging
- Modern styling with icons
- Network error detection
- Graceful error recovery

## Related Components

- `ModernCard`: Base card component
- `design-tokens`: Design system tokens
- `EmptyState`: For no-results scenarios
- `OfflineIndicator`: For offline detection

## Future Enhancements

- [ ] Error categorization (network, auth, server, client)
- [ ] Automatic retry with exponential backoff
- [ ] Error analytics integration
- [ ] Customizable error icons per error type
- [ ] Toast notifications for non-critical errors
