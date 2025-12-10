/**
 * CMS Content Types
 * 
 * Type definitions for all CMS-managed content on the Advertise With Us page.
 * These types align with the requirements and design document.
 */

import { LucideIcon } from 'lucide-react';

/**
 * CTA (Call-to-Action) Configuration
 */
export interface CTAConfig {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

/**
 * Billboard Banner Configuration
 */
export interface BillboardConfig {
  imageUrl: string;
  alt: string;
  developmentName: string;
  tagline: string;
  ctaLabel?: string;
  href: string;
}

/**
 * Trust Signal (logos or text)
 */
export interface TrustSignal {
  type: 'logo' | 'text';
  content: string;
  imageUrl?: string;
}

/**
 * Hero Section Content
 */
export interface HeroContent {
  headline: string;
  subheadline: string;
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
  billboard: BillboardConfig;
  trustSignals: TrustSignal[];
}

/**
 * Partner Type Card
 */
export interface PartnerType {
  id: string;
  iconName: string; // Icon name for dynamic loading
  title: string;
  benefit: string;
  href: string;
  order: number;
}

/**
 * Feature Block (Value Proposition)
 */
export interface FeatureBlock {
  id: string;
  iconName: string;
  headline: string;
  description: string;
  order: number;
}

/**
 * Process Step (How It Works)
 */
export interface ProcessStep {
  id: string;
  stepNumber: number;
  iconName: string;
  title: string;
  description: string;
}

/**
 * Feature Tile (Features Grid)
 */
export interface FeatureTile {
  id: string;
  iconName: string;
  title: string;
  description: string;
  order: number;
}

/**
 * Partner Logo
 */
export interface PartnerLogo {
  id: string;
  name: string;
  imageUrl: string;
  alt: string;
  order: number;
}

/**
 * Metric (Social Proof)
 */
export interface Metric {
  id: string;
  value: string | number;
  label: string;
  iconName?: string;
  order: number;
}

/**
 * Social Proof Content
 */
export interface SocialProofContent {
  logos: PartnerLogo[];
  metrics: Metric[];
}

/**
 * Pricing Category Card
 */
export interface PricingCategory {
  id: string;
  category: string;
  description: string;
  href: string;
  order: number;
}

/**
 * FAQ Item
 */
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
}

/**
 * Final CTA Section Content
 */
export interface FinalCTAContent {
  headline: string;
  subtext: string;
  primaryCTA: CTAConfig;
  secondaryCTA: CTAConfig;
}

/**
 * Complete Page Content Model
 * 
 * This represents all CMS-managed content for the Advertise With Us page.
 */
export interface AdvertisePageContent {
  hero: HeroContent;
  partnerTypes: PartnerType[];
  valueProposition: FeatureBlock[];
  howItWorks: ProcessStep[];
  features: FeatureTile[];
  socialProof: SocialProofContent;
  pricingPreview: PricingCategory[];
  finalCTA: FinalCTAContent;
  faqs: FAQ[];
}

/**
 * CMS API Response wrapper
 */
export interface CMSResponse<T> {
  data: T;
  lastModified: string;
  version: string;
}

/**
 * CMS Error
 */
export interface CMSError {
  code: string;
  message: string;
  details?: unknown;
}
