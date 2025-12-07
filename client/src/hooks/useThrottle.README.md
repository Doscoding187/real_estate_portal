# useThrottle and useDebounce Hooks

## Overview

These hooks provide throttling and debouncing functionality for React components, essential for optimizing performance when dealing with frequent updates like map panning, search inputs, or scroll events.

## useThrottle

Throttling ensures that a function is called at most once in a specified time period. It's useful for rate-limiting frequent events.

### Usage

```typescript
import { useThrottle } from '@/hooks/useThrottle';

function MapComponent() {
  const [mapBounds, setMapBounds] = useState(null);
  
  // Throttle map bounds updates to 250ms
  const throttledBounds = useThrottle(mapBounds, 250);
  
  // Use throttledBounds for API calls
  const { data } = useQuery(['properties', throttledBounds], ...);
}
```

### Parameters

- `value: T` - The value to throttle
- `delay: number` - Delay in milliseconds (default: 250ms)

### Returns

- `T` - The throttled value

### When to Use

- Map panning events
- Window resize events
- Scroll position tracking
- Any high-frequency event that needs rate limiting

## useDebounce

Debouncing delays the execution until after a specified time has elapsed since the last invocation. It's useful for waiting until a user has finished an action.

### Usage

```typescript
import { useDebounce } from '@/hooks/useDebounce';

function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce search term updates to 300ms
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // API call only fires after user stops typing for 300ms
  const { data } = useQuery(['search', debouncedSearchTerm], ...);
}
```

### Parameters

- `value: T` - The value to debounce
- `delay: number` - Delay in milliseconds (default: 300ms)

### Returns

- `T` - The debounced value

### When to Use

- Search input fields
- Form validation
- Auto-save functionality
- Any action that should wait for user to finish

## Throttle vs Debounce

### Throttle
- Executes at regular intervals during continuous events
- Example: Map updates every 250ms while panning
- Use when you want periodic updates during an ongoing action

### Debounce
- Executes only after the event has stopped for the specified delay
- Example: Search API call 300ms after user stops typing
- Use when you want to wait for the action to complete

## Type Safety

Both hooks use TypeScript generics to maintain type safety:

```typescript
// Automatically infers type
const throttledNumber = useThrottle(42, 250); // number
const debouncedString = useDebounce('hello', 300); // string

// Works with complex types
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const throttledBounds = useThrottle<MapBounds>(bounds, 250);
```

## Performance Considerations

- Both hooks use `useEffect` for cleanup, preventing memory leaks
- Throttle tracks the last execution time for accurate rate limiting
- Debounce cancels pending timeouts when value changes
- Default delays (250ms throttle, 300ms debounce) are optimized for UX

## Requirements

Validates: Requirements 3.4 - Map/feed synchronization with throttled and debounced updates
