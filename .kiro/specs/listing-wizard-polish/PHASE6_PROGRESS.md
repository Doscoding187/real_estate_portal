# Phase 6 Progress: Error Recovery & Feedback

## Status: Core Infrastructure Complete (40%)

## Completed Tasks

### ✅ Task 6: Create error recovery system
Created a comprehensive error recovery system with:
- Error type definitions (network, validation, server, upload, session, unknown)
- AppError interface for structured error handling
- Error parsing function to categorize errors
- Recovery strategy system with retry logic
- Exponential backoff retry mechanism
- Error logging for debugging
- User-friendly error messages
- Recoverable vs non-recoverable error classification

**File:** `client/src/lib/errors/ErrorRecoveryStrategy.ts`

**Features:**
- **Error Types**: Network, validation, server, upload, session, unknown
- **Error Parsing**: Automatically categorizes errors from various sources
- **Recovery Strategies**: Defines how to handle each error type
- **Retry Logic**: Exponential backoff with jitter
- **Error Logging**: Console logging in dev, ready for production tracking
- **Context Support**: Additional error context for debugging

### ✅ Task 6.1: Create ErrorAlert component
Created a beautiful error alert component with:
- Error type-specific icons (WiFi, Server, Alert, etc.)
- User-friendly error messages
- Retry button for recoverable errors
- Dismiss button to close alerts
- Auto-dismiss option
- Smooth animations (fade in/out, scale)
- Multiple variants (default, destructive)
- ErrorAlertList for displaying multiple errors

**File:** `client/src/components/ui/ErrorAlert.tsx`

## Remaining Tasks

### ⏳ Task 6.2: Add network error handling
Need to:
- Detect network failures during API calls
- Show "Connection lost" message with draft saved confirmation
- Implement automatic retry with exponential backoff
- Integrate into wizard API calls

### ⏳ Task 6.3: Add server validation error handling
Need to:
- Parse server validation errors from API responses
- Map errors to specific form fields
- Highlight affected steps in progress indicator
- Show field-specific error messages

### ⏳ Task 6.4: Add session expiry handling
Need to:
- Detect 401 Unauthorized responses
- Show "Session expired" dialog
- Save draft before redirecting to login
- Restore draft after re-authentication

### ⏳ Task 6.5: Add upload error handling
Need to:
- Show retry button next to failed uploads
- Display specific error messages (file too large, invalid type, etc.)
- Allow removing failed uploads
- Integrate with UploadProgressBar component

## Components Created

### 1. ErrorRecoveryStrategy System

```typescript
interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error | unknown;
  isRecoverable: boolean;
  field?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

interface ErrorRecoveryStrategy {
  type: ErrorType;
  message: string;
  retryable: boolean;
  recoveryAction?: () => void | Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
}
```

**Functions:**
- `parseError()`: Converts any error to AppError format
- `getRecoveryStrategy()`: Returns strategy for error type
- `retryWithBackoff()`: Retries with exponential backoff
- `logError()`: Logs errors for debugging
- `isRecoverableError()`: Checks if error can be recovered
- `getUserFriendlyMessage()`: Gets user-friendly message

**Error Types:**
- **Network**: Connection failures, fetch errors
- **Validation**: 400/422 status codes, form validation
- **Server**: 500+ status codes, server errors
- **Upload**: File upload failures
- **Session**: 401 status code, expired sessions
- **Unknown**: Unclassified errors

**Retry Strategies:**
- Network: 3 retries, 2s base delay
- Server: 2 retries, 5s base delay
- Upload: 2 retries, 1s base delay
- Validation: No retry
- Session: No retry

### 2. ErrorAlert Component

```typescript
interface ErrorAlertProps {
  type: ErrorType;
  title?: string;
  message: string;
  retryable?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  show?: boolean;
  autoDismiss?: number;
}
```

**Features:**
- **Type-Specific Icons**: Different icons for each error type
- **Variants**: Default and destructive styles
- **Actions**: Retry and dismiss buttons
- **Animations**: Smooth fade in/out with scale
- **Auto-Dismiss**: Optional automatic dismissal
- **Responsive**: Works on all screen sizes

**Visual Design:**
- Network: WiFi off icon
- Server: Server icon
- Validation: Alert triangle icon
- Upload: Alert circle icon
- Session: Alert circle icon
- Destructive variant for critical errors

### 3. ErrorAlertList Component

```typescript
interface ErrorAlertListProps {
  errors: Array<{
    id: string;
    type: ErrorType;
    title?: string;
    message: string;
    retryable?: boolean;
  }>;
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
}
```

**Features:**
- Displays multiple errors in a stack
- Individual retry/dismiss for each error
- Stacked layout with spacing
- Handles empty state gracefully

## Technical Implementation

### Error Parsing
```typescript
// Automatically categorizes errors
const appError = parseError(error, { type: 'upload', fileName: 'image.jpg' });
// Returns: { type: 'upload', message: '...', isRecoverable: true }
```

### Retry with Backoff
```typescript
// Retries with exponential backoff
await retryWithBackoff(
  () => uploadFile(file),
  3, // max retries
  1000 // base delay (1s, 2s, 4s)
);
```

### Error Alert Usage
```typescript
<ErrorAlert
  type="network"
  message="Connection lost. Your draft has been saved."
  retryable={true}
  onRetry={handleRetry}
  onDismiss={handleDismiss}
/>
```

### Error Alert List Usage
```typescript
<ErrorAlertList
  errors={[
    { id: '1', type: 'network', message: 'Connection lost', retryable: true },
    { id: '2', type: 'upload', message: 'File too large', retryable: false },
  ]}
  onRetry={(id) => retryError(id)}
  onDismiss={(id) => dismissError(id)}
/>
```

## Integration Points

### Where to Integrate:

1. **API Calls**: Wrap tRPC mutations with error handling
2. **File Uploads**: Show upload errors with retry
3. **Form Submission**: Handle validation and server errors
4. **Network Requests**: Detect and handle connection issues
5. **Session Management**: Handle expired sessions

### Example Integration:
```typescript
try {
  await createListingMutation.mutateAsync(data);
} catch (error) {
  const appError = parseError(error);
  const strategy = getRecoveryStrategy(appError);
  
  if (strategy.retryable) {
    // Show error with retry button
    setError({ ...appError, strategy });
  } else {
    // Show error with dismiss only
    setError({ ...appError, strategy });
  }
  
  logError(appError);
}
```

## Requirements Validated

✅ **Requirement 6.1**: Error recovery system with retry logic
✅ **Requirement 6.2**: ErrorAlert component with retry/dismiss
⏳ **Requirement 6.3**: Network error handling (pending integration)
⏳ **Requirement 6.4**: Server validation error handling (pending integration)
⏳ **Requirement 6.5**: Session expiry handling (pending integration)
⏳ **Requirement 6.6**: Upload error handling (pending integration)

## Code Quality

- **TypeScript**: Fully typed with comprehensive interfaces
- **Reusability**: Components work anywhere in the app
- **Maintainability**: Clean, well-documented code
- **Extensibility**: Easy to add new error types
- **Performance**: Optimized with AnimatePresence
- **Accessibility**: ARIA labels, keyboard support
- **Testing Ready**: Pure functions, testable components

## Files Created

### Created:
- `client/src/lib/errors/ErrorRecoveryStrategy.ts` (250 lines)
- `client/src/components/ui/ErrorAlert.tsx` (220 lines)

## Next Steps

1. **Task 6.2**: Integrate network error handling
   - Wrap API calls with error handling
   - Show connection lost messages
   - Implement automatic retry

2. **Task 6.3**: Integrate server validation errors
   - Parse validation errors from API
   - Map to form fields
   - Highlight affected steps

3. **Task 6.4**: Integrate session expiry handling
   - Detect 401 responses
   - Save draft before redirect
   - Restore after login

4. **Task 6.5**: Integrate upload error handling
   - Update UploadProgressBar
   - Show retry buttons
   - Handle specific upload errors

## Notes

- Core error infrastructure is production-ready
- Error recovery system is fully extensible
- Components follow existing design system
- Ready for integration into wizards
- Exponential backoff prevents server overload
- Error logging ready for production monitoring
- User-friendly messages throughout
- No breaking changes to existing code
