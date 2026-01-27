/**
 * Shared Google Maps API loader hook
 *
 * This hook centralizes loading the Google Maps JavaScript API to prevent
 * multiple script tags from being injected, which causes "Element already defined" errors.
 */

import { useState, useEffect, useCallback } from 'react';

// Global state to track loading status across all hook instances
let isLoadingGlobal = false;
let isLoadedGlobal = false;
let loadErrorGlobal: string | null = null;
const loadCallbacks: Array<(success: boolean, error?: string) => void> = [];

declare global {
  interface Window {
    google: any;
    __googleMapsCallback: () => void;
  }
}

interface UseGoogleMapsResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to load the Google Maps API
 * Ensures the API is only loaded once, even if multiple components use this hook.
 */
export function useGoogleMaps(): UseGoogleMapsResult {
  const [isLoaded, setIsLoaded] = useState(isLoadedGlobal);
  const [isLoading, setIsLoading] = useState(isLoadingGlobal);
  const [error, setError] = useState<string | null>(loadErrorGlobal);

  useEffect(() => {
    // If already loaded globally, sync local state
    if (isLoadedGlobal) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // If there was a global error, sync it
    if (loadErrorGlobal) {
      setError(loadErrorGlobal);
      setIsLoading(false);
      return;
    }

    // Check if Google Maps is already available (loaded by another method)
    if (window.google && window.google.maps) {
      isLoadedGlobal = true;
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    // If already loading, just register a callback
    if (isLoadingGlobal) {
      setIsLoading(true);
      const callback = (success: boolean, err?: string) => {
        setIsLoaded(success);
        setIsLoading(false);
        if (err) setError(err);
      };
      loadCallbacks.push(callback);
      return () => {
        const idx = loadCallbacks.indexOf(callback);
        if (idx > -1) loadCallbacks.splice(idx, 1);
      };
    }

    // Start loading
    isLoadingGlobal = true;
    setIsLoading(true);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      const errMsg = 'Google Maps API key is missing. Please configure VITE_GOOGLE_MAPS_API_KEY.';
      loadErrorGlobal = errMsg;
      isLoadingGlobal = false;
      setError(errMsg);
      setIsLoading(false);
      loadCallbacks.forEach(cb => cb(false, errMsg));
      loadCallbacks.length = 0;
      return;
    }

    // Check if script already exists (edge case)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists but maybe not loaded yet, poll for google object
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogle);
          isLoadedGlobal = true;
          isLoadingGlobal = false;
          setIsLoaded(true);
          setIsLoading(false);
          loadCallbacks.forEach(cb => cb(true));
          loadCallbacks.length = 0;
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkGoogle);
        if (!isLoadedGlobal) {
          const errMsg = 'Google Maps API failed to load (timeout).';
          loadErrorGlobal = errMsg;
          isLoadingGlobal = false;
          setError(errMsg);
          setIsLoading(false);
          loadCallbacks.forEach(cb => cb(false, errMsg));
          loadCallbacks.length = 0;
        }
      }, 10000);
      return;
    }

    // Create and inject script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=__googleMapsCallback`;
    script.async = true;
    script.defer = true;

    window.__googleMapsCallback = () => {
      isLoadedGlobal = true;
      isLoadingGlobal = false;
      setIsLoaded(true);
      setIsLoading(false);
      loadCallbacks.forEach(cb => cb(true));
      loadCallbacks.length = 0;
    };

    script.onerror = () => {
      const errMsg =
        'Failed to load Google Maps. Please check your API key and internet connection.';
      loadErrorGlobal = errMsg;
      isLoadingGlobal = false;
      setError(errMsg);
      setIsLoading(false);
      loadCallbacks.forEach(cb => cb(false, errMsg));
      loadCallbacks.length = 0;
    };

    document.head.appendChild(script);
  }, []);

  return { isLoaded, isLoading, error };
}
