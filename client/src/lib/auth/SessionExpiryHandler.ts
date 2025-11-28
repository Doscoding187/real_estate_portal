/**
 * Utility for handling session expiry with draft restoration
 */

export interface SessionExpiryOptions {
  onSessionExpired?: () => void;
  onDraftSaved?: () => void;
  redirectUrl?: string;
  returnUrl?: string;
}

/**
 * Handle session expiry by saving current location and redirecting to login
 */
export function handleSessionExpiry(options: SessionExpiryOptions = {}) {
  const {
    onSessionExpired,
    onDraftSaved,
    redirectUrl = '/login',
    returnUrl = window.location.pathname + window.location.search,
  } = options;

  // Save the return URL to localStorage so we can redirect back after login
  try {
    localStorage.setItem('auth_return_url', returnUrl);
    localStorage.setItem('auth_session_expired', 'true');
    localStorage.setItem('auth_session_expired_at', new Date().toISOString());
  } catch (error) {
    console.error('Failed to save return URL:', error);
  }

  // Call callbacks
  onSessionExpired?.();
  onDraftSaved?.();

  // Redirect to login after a short delay to allow draft save to complete
  setTimeout(() => {
    window.location.href = `${redirectUrl}?expired=true&return=${encodeURIComponent(returnUrl)}`;
  }, 500);
}

/**
 * Check if user was redirected due to session expiry
 */
export function wasSessionExpired(): boolean {
  try {
    return localStorage.getItem('auth_session_expired') === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Get the return URL after successful authentication
 */
export function getReturnUrl(): string | null {
  try {
    return localStorage.getItem('auth_return_url');
  } catch (error) {
    return null;
  }
}

/**
 * Clear session expiry flags after successful restoration
 */
export function clearSessionExpiryFlags() {
  try {
    localStorage.removeItem('auth_return_url');
    localStorage.removeItem('auth_session_expired');
    localStorage.removeItem('auth_session_expired_at');
  } catch (error) {
    console.error('Failed to clear session expiry flags:', error);
  }
}

/**
 * Check if session expiry was recent (within last 30 minutes)
 */
export function wasSessionExpiryRecent(): boolean {
  try {
    const expiredAt = localStorage.getItem('auth_session_expired_at');
    if (!expiredAt) return false;

    const expiredTime = new Date(expiredAt).getTime();
    const now = new Date().getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    return now - expiredTime < thirtyMinutes;
  } catch (error) {
    return false;
  }
}

/**
 * Hook to handle session restoration after login
 */
export function useSessionRestoration() {
  const checkAndRestore = () => {
    if (wasSessionExpired() && wasSessionExpiryRecent()) {
      const returnUrl = getReturnUrl();
      
      if (returnUrl) {
        // Clear flags before redirecting
        clearSessionExpiryFlags();
        
        // Redirect back to the original page
        // The wizard will automatically load the draft from localStorage
        window.location.href = returnUrl;
        return true;
      }
    }
    
    return false;
  };

  return { checkAndRestore };
}
