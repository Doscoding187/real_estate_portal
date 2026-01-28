/**
 * useAdvertiseCMS Hook
 *
 * React hook for accessing and managing CMS content for the Advertise With Us page.
 * Provides loading states, error handling, and content updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { cmsClient } from '@/services/cms/cmsClient';
import { AdvertisePageContent, CMSError } from '@/services/cms/types';

export interface UseAdvertiseCMSResult {
  content: AdvertisePageContent | null;
  isLoading: boolean;
  error: CMSError | null;
  refetch: () => Promise<void>;
  updateContent: (updates: Partial<AdvertisePageContent>) => Promise<void>;
  lastModified: string | null;
}

/**
 * Hook for accessing CMS content
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { content, isLoading, error } = useAdvertiseCMS();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return <div>{content.hero.headline}</div>;
 * }
 * ```
 */
export function useAdvertiseCMS(): UseAdvertiseCMSResult {
  const [content, setContent] = useState<AdvertisePageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CMSError | null>(null);
  const [lastModified, setLastModified] = useState<string | null>(null);

  /**
   * Fetch content from CMS
   */
  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await cmsClient.getPageContent();

      setContent(response.data);
      setLastModified(response.lastModified);
    } catch (err) {
      const cmsError: CMSError = {
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Failed to fetch content',
        details: err,
      };
      setError(cmsError);
      console.error('CMS fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update content in CMS
   */
  const updateContent = useCallback(async (updates: Partial<AdvertisePageContent>) => {
    try {
      setError(null);

      const response = await cmsClient.updatePageContent(updates);

      setContent(response.data);
      setLastModified(response.lastModified);
    } catch (err) {
      const cmsError: CMSError = {
        code: 'UPDATE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to update content',
        details: err,
      };
      setError(cmsError);
      console.error('CMS update error:', err);
      throw err; // Re-throw so caller can handle
    }
  }, []);

  /**
   * Refetch content (useful for manual refresh)
   */
  const refetch = useCallback(async () => {
    await fetchContent();
  }, [fetchContent]);

  // Fetch content on mount
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  return {
    content,
    isLoading,
    error,
    refetch,
    updateContent,
    lastModified,
  };
}

/**
 * Hook for accessing specific section content
 *
 * @example
 * ```tsx
 * function HeroComponent() {
 *   const { content, isLoading } = useAdvertiseCMSSection('hero');
 *
 *   if (isLoading || !content) return <div>Loading...</div>;
 *
 *   return <h1>{content.headline}</h1>;
 * }
 * ```
 */
export function useAdvertiseCMSSection<K extends keyof AdvertisePageContent>(
  section: K,
): {
  content: AdvertisePageContent[K] | null;
  isLoading: boolean;
  error: CMSError | null;
} {
  const { content, isLoading, error } = useAdvertiseCMS();

  return {
    content: content ? content[section] : null,
    isLoading,
    error,
  };
}
