import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 * 
 * Listens to browser online/offline events and provides current connection status.
 * Useful for showing offline indicators and enabling offline-first features.
 * 
 * @returns {boolean} isOnline - Current online status
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useOnlineStatus();
 *   
 *   return (
 *     <div>
 *       {!isOnline && <OfflineBanner />}
 *       <Content />
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
