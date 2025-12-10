/**
 * CMS Client
 * 
 * Abstract CMS client that can be implemented with different providers.
 * Currently uses a local/mock implementation but can be swapped for:
 * - Contentful
 * - Strapi
 * - Sanity
 * - Custom backend API
 */

import { AdvertisePageContent, CMSResponse, CMSError } from './types';
import { defaultContent } from './defaultContent';
import { validatePageContent, getValidationSummary } from './contentValidator';

/**
 * CMS Client Configuration
 */
export interface CMSClientConfig {
  apiUrl?: string;
  apiKey?: string;
  spaceId?: string;
  environment?: string;
  cacheEnabled?: boolean;
  cacheTTL?: number; // in milliseconds
}

/**
 * Abstract CMS Client Interface
 */
export interface ICMSClient {
  getPageContent(): Promise<CMSResponse<AdvertisePageContent>>;
  updatePageContent(content: Partial<AdvertisePageContent>): Promise<CMSResponse<AdvertisePageContent>>;
  clearCache(): void;
}

/**
 * Local/Mock CMS Client
 * 
 * This implementation stores content in localStorage and provides
 * a simple API for content management. In production, this would be
 * replaced with a real CMS client.
 */
class LocalCMSClient implements ICMSClient {
  private config: CMSClientConfig;
  private cacheKey = 'advertise-page-content';
  private cache: CMSResponse<AdvertisePageContent> | null = null;
  private cacheTimestamp: number = 0;

  constructor(config: CMSClientConfig = {}) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes default
      ...config,
    };
  }

  /**
   * Get page content from localStorage or default content
   */
  async getPageContent(): Promise<CMSResponse<AdvertisePageContent>> {
    // Check cache first
    if (this.config.cacheEnabled && this.isCacheValid()) {
      return this.cache!;
    }

    try {
      // Try to load from localStorage
      const stored = localStorage.getItem(this.cacheKey);
      
      if (stored) {
        const parsed = JSON.parse(stored) as CMSResponse<AdvertisePageContent>;
        this.updateCache(parsed);
        return parsed;
      }

      // Return default content if nothing in localStorage
      const response: CMSResponse<AdvertisePageContent> = {
        data: defaultContent,
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      this.updateCache(response);
      return response;
    } catch (error) {
      console.error('Error loading CMS content:', error);
      
      // Return default content on error
      const response: CMSResponse<AdvertisePageContent> = {
        data: defaultContent,
        lastModified: new Date().toISOString(),
        version: '1.0.0',
      };

      return response;
    }
  }

  /**
   * Update page content in localStorage
   */
  async updatePageContent(
    updates: Partial<AdvertisePageContent>
  ): Promise<CMSResponse<AdvertisePageContent>> {
    try {
      // Get current content
      const current = await this.getPageContent();
      
      // Merge updates
      const updated: AdvertisePageContent = {
        ...current.data,
        ...updates,
      };

      // Validate content before saving
      const validationResult = validatePageContent(updated);
      
      if (!validationResult.isValid) {
        const summary = getValidationSummary(validationResult);
        console.error('Content validation failed:', summary);
        throw new Error(`Content validation failed:\n${summary}`);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('Content validation warnings:', validationResult.warnings);
      }

      // Create response
      const response: CMSResponse<AdvertisePageContent> = {
        data: updated,
        lastModified: new Date().toISOString(),
        version: current.version,
      };

      // Save to localStorage
      localStorage.setItem(this.cacheKey, JSON.stringify(response));

      // Update cache
      this.updateCache(response);

      return response;
    } catch (error) {
      console.error('Error updating CMS content:', error);
      throw error;
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = Date.now();
    const elapsed = now - this.cacheTimestamp;
    
    return elapsed < (this.config.cacheTTL || 0);
  }

  /**
   * Update the cache
   */
  private updateCache(response: CMSResponse<AdvertisePageContent>): void {
    this.cache = response;
    this.cacheTimestamp = Date.now();
  }
}

/**
 * Payload CMS Client
 */
class PayloadCMSClient implements ICMSClient {
  private config: CMSClientConfig;
  private cache: CMSResponse<AdvertisePageContent> | null = null;
  private cacheTimestamp: number = 0;

  constructor(config: CMSClientConfig) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 5 * 60 * 1000, // 5 minutes default
      ...config,
    };

    if (!config.apiUrl) {
      throw new Error('Payload CMS requires apiUrl in config');
    }
  }

  async getPageContent(): Promise<CMSResponse<AdvertisePageContent>> {
    // Check cache first
    if (this.config.cacheEnabled && this.isCacheValid()) {
      return this.cache!;
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.apiUrl}/api/advertise-page`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Payload CMS API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const cmsResponse: CMSResponse<AdvertisePageContent> = {
        data: data.doc || data,
        lastModified: data.updatedAt || new Date().toISOString(),
        version: data._version || '1.0.0',
      };

      this.updateCache(cmsResponse);
      return cmsResponse;
    } catch (error) {
      console.error('Error fetching from Payload CMS:', error);
      throw error;
    }
  }

  async updatePageContent(
    updates: Partial<AdvertisePageContent>
  ): Promise<CMSResponse<AdvertisePageContent>> {
    try {
      // Get current content
      const current = await this.getPageContent();
      
      // Merge updates
      const updated: AdvertisePageContent = {
        ...current.data,
        ...updates,
      };

      // Validate content before saving
      const validationResult = validatePageContent(updated);
      
      if (!validationResult.isValid) {
        const summary = getValidationSummary(validationResult);
        throw new Error(`Content validation failed:\n${summary}`);
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.config.apiUrl}/api/advertise-page`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updated),
      });

      if (!response.ok) {
        throw new Error(`Payload CMS API error: ${response.statusText}`);
      }

      const data = await response.json();

      const cmsResponse: CMSResponse<AdvertisePageContent> = {
        data: data.doc || data,
        lastModified: data.updatedAt || new Date().toISOString(),
        version: data._version || current.version,
      };

      this.clearCache();
      return cmsResponse;
    } catch (error) {
      console.error('Error updating Payload CMS:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    
    const now = Date.now();
    const elapsed = now - this.cacheTimestamp;
    
    return elapsed < (this.config.cacheTTL || 0);
  }

  private updateCache(response: CMSResponse<AdvertisePageContent>): void {
    this.cache = response;
    this.cacheTimestamp = Date.now();
  }
}

/**
 * Contentful CMS Client (placeholder for future implementation)
 */
class ContentfulCMSClient implements ICMSClient {
  private config: CMSClientConfig;

  constructor(config: CMSClientConfig) {
    this.config = config;
  }

  async getPageContent(): Promise<CMSResponse<AdvertisePageContent>> {
    // TODO: Implement Contentful API integration
    throw new Error('Contentful client not implemented yet');
  }

  async updatePageContent(
    updates: Partial<AdvertisePageContent>
  ): Promise<CMSResponse<AdvertisePageContent>> {
    // TODO: Implement Contentful API integration
    throw new Error('Contentful client not implemented yet');
  }

  clearCache(): void {
    // TODO: Implement cache clearing
  }
}

/**
 * CMS Client Factory
 */
export class CMSClientFactory {
  private static instance: ICMSClient | null = null;

  /**
   * Get or create CMS client instance
   */
  static getClient(
    provider: 'local' | 'contentful' | 'payload' = 'local',
    config?: CMSClientConfig
  ): ICMSClient {
    if (!this.instance) {
      switch (provider) {
        case 'payload':
          this.instance = new PayloadCMSClient(config || {});
          break;
        case 'contentful':
          this.instance = new ContentfulCMSClient(config || {});
          break;
        case 'local':
        default:
          this.instance = new LocalCMSClient(config);
          break;
      }
    }

    return this.instance;
  }

  /**
   * Reset the client instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * Default CMS client instance
 */
export const cmsClient = CMSClientFactory.getClient('local');
