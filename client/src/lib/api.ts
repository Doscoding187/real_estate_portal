/**
 * Get the base URL for API calls
 * Uses VITE_API_URL environment variable or falls back to current origin
 */
export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: use VITE_API_URL environment variable or fallback to current origin
    return import.meta.env.VITE_API_URL || window.location.origin;
  }
  // Server-side rendering fallback
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

/**
 * Get the full API URL for a given endpoint
 */
export const getApiUrl = (endpoint: string) => {
  const baseUrl = getApiBaseUrl();
  // Remove leading slash from endpoint to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/api/${cleanEndpoint}`;
};