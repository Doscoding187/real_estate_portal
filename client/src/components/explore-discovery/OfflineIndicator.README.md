# OfflineIndicator Component

## Overview

The `OfflineIndicator` component provides visual feedback about the user's network connection status. It displays a banner when the user goes offline and shows a reconnection message when they come back online.

## Features

- **Auto-detection**: Automatically detects online/offline status using the `useOnlineStatus` hook
- **Smooth animations**: Slide-in/out animations using Framer Motion
- **Cached content message**: Informs users that cached content is available when offline
- **Reconnection feedback**: Shows a success message when connection is restored
- **Auto-dismiss**: Reconnection message automatically dismisses after 3 seconds
- **Accessibility**: Proper ARIA labels and live regions for screen readers

## Usage

### Basic Usage

```tsx
import { OfflineIndicator } from '@/components/explore-discovery/OfflineIndicator';

function App() {
  return (
    <div>
      <OfflineIndicator />
      <YourContent />
    </div>
  );
}
```

### Integration with Explore Pages

```tsx
import { OfflineIndicator } from '@/components/explore-discovery/OfflineIndicator';

function ExploreHome() {
  return (
    <div className="min-h-screen">
      <OfflineIndicator />
      <Navbar />
      <MainContent />
    </div>
  );
}
```

## Component Behavior

### Offline State
- Shows amber banner at the top of the screen
- Displays "You're offline. Showing cached content."
- Icon: WifiOff
- ARIA role: alert (assertive)

### Reconnection State
- Shows green banner at the top of the screen
- Displays "Back online! Content updated."
- Icon: Wifi
- Auto-dismisses after 3 seconds
- ARIA role: alert (polite)

## Styling

The component uses Tailwind CSS classes and is positioned fixed at the top of the viewport:

- **Offline banner**: `bg-amber-500 text-white`
- **Reconnection banner**: `bg-green-500 text-white`
- **Z-index**: `z-50` (ensures it appears above other content)

## Accessibility

- Uses `role="alert"` for screen reader announcements
- Offline message uses `aria-live="assertive"` for immediate announcement
- Reconnection message uses `aria-live="polite"` for non-intrusive announcement
- Semantic HTML with proper heading hierarchy

## Animation Details

- **Entry**: Slides down from top with fade-in (300ms)
- **Exit**: Slides up with fade-out (300ms)
- **Easing**: `easeOut` for smooth motion

## Integration with React Query

The component works seamlessly with React Query's offline capabilities:

```tsx
// React Query automatically uses cached data when offline
const { data, isLoading } = useQuery({
  queryKey: ['explore', 'feed'],
  queryFn: fetchExploreFeed,
  // React Query will serve cached data when offline
});
```

## Testing

### Manual Testing
1. Open DevTools Network tab
2. Set throttling to "Offline"
3. Verify offline banner appears
4. Set throttling back to "Online"
5. Verify reconnection message appears and dismisses after 3s

### Unit Testing
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

test('shows offline banner when offline', () => {
  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  });

  render(<OfflineIndicator />);
  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
});
```

## Requirements Validation

✅ **Requirement 7.3**: Shows offline indicator when user is offline
✅ **Requirement 7.5**: Provides reconnection detection and feedback
✅ **Requirement 9.1**: Uses smooth animations for state transitions
✅ **Requirement 5.2**: Includes proper ARIA labels for accessibility

## Related Components

- `useOnlineStatus` - Hook for detecting online/offline status
- `ErrorBoundary` - Handles network errors
- `EmptyState` - Shows when no cached content is available

## Browser Support

Works in all modern browsers that support:
- `navigator.onLine` API
- `online` and `offline` events
- Framer Motion animations

## Performance

- Minimal re-renders (only on online/offline state changes)
- Lightweight component (~2KB gzipped)
- No impact on page load performance
