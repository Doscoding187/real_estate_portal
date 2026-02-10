import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  const wasOfflineRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowReconnected(false);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (wasOfflineRef.current) {
      setShowReconnected(true);

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        setShowReconnected(false);
        timerRef.current = null;
      }, 3000);
    }
  }, [isOnline]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isOffline = !isOnline;

  if (!isOffline && !showReconnected) return null;

  if (isOffline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-label="You are offline"
        className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-3 shadow-lg z-50"
      >
        <div className="container mx-auto flex items-center gap-3">
          <WifiOff className="w-5 h-5" aria-hidden="true" />
          <div>
            <p className="font-semibold">You're offline</p>
            <p className="text-sm">Showing cached content</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="Back online"
      className="fixed top-0 left-0 right-0 bg-green-500 text-white px-4 py-3 shadow-lg z-50"
    >
      <div className="container mx-auto flex items-center gap-3">
        <Wifi className="w-5 h-5" aria-hidden="true" />
        <div>
          <p className="font-semibold">Back online</p>
          <p className="text-sm">Content updated</p>
        </div>
      </div>
    </div>
  );
}
