/**
 * Payload CMS Provider
 * 
 * Integrates with Payload CMS for content management
 * https://payloadcms.com/
 */

import type { CMSClient, AdvertisePageContent } from '../types';

interface PayloadConfig {
  apiUrl: string;
  apiKey?: string;
}

export class PayloadCMSProvider implements CMSClient {
  private apiUrl: string;
  private apiKey?: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor(config: PayloadConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
  }

  async getContent(): Promise<AdvertisePageContent> {
    const cacheKey = 'advertise-page-content';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Fetch from Payload CMS collection
      // Adjust the endpoint based on your Payload collection name
      const response = await fetch(`${this.apiUrl}/api/advertise-page`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Payload CMS API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform Payload response to our content structure
      const content = this.transformPayloadData(data);

      // Cache the result
      this.cache.set(cacheKey, {
        data: content,
        timestamp: Date.now(),
      });

      return content;
    } catch (error) {
      console.error('Error fetching from Payload CMS:', error);
      throw error;
    }
  }

  async updateContent(content: AdvertisePageContent): Promise<void> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Transform our content structure to Payload format
      const payloadData = this.transformToPayloadData(content);

      const response = await fetch(`${this.apiUrl}/api/advertise-page`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payloadData),
      });

      if (!response.ok) {
        throw new Error(`Payload CMS API error: ${response.statusText}`);
      }

      // Clear cache after update
      this.cache.clear();
    } catch (error) {
      console.error('Error updating Payload CMS:', error);
      throw error;
    }
  }

  /**
   * Transform Payload CMS response to our content structure
   */
  private transformPayloadData(payloadData: any): AdvertisePageContent {
    // Adjust this based on your Payload collection structure
    return {
      hero: payloadData.hero || {},
      partnerTypes: payloadData.partnerTypes || [],
      features: payloadData.features || [],
      howItWorks: payloadData.howItWorks || {},
      featuresGrid: payloadData.featuresGrid || [],
      metrics: payloadData.metrics || [],
      partnerLogos: payloadData.partnerLogos || [],
      pricingCategories: payloadData.pricingCategories || [],
      finalCTA: payloadData.finalCTA || {},
      faqs: payloadData.faqs || [],
    };
  }

  /**
   * Transform our content structure to Payload CMS format
   */
  private transformToPayloadData(content: AdvertisePageContent): any {
    // Adjust this based on your Payload collection structure
    return {
      hero: content.hero,
      partnerTypes: content.partnerTypes,
      features: content.features,
      howItWorks: content.howItWorks,
      featuresGrid: content.featuresGrid,
      metrics: content.metrics,
      partnerLogos: content.partnerLogos,
      pricingCategories: content.pricingCategories,
      finalCTA: content.finalCTA,
      faqs: content.faqs,
    };
  }

  /**
   * Clear the cache manually if needed
   */
  clearCache(): void {
    this.cache.clear();
  }
}
