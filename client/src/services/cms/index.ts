/**
 * CMS Service Module
 * 
 * Central export point for all CMS-related functionality.
 */

// Types
export type {
  CTAConfig,
  BillboardConfig,
  TrustSignal,
  HeroContent,
  PartnerType,
  FeatureBlock,
  ProcessStep,
  FeatureTile,
  PartnerLogo,
  Metric,
  SocialProofContent,
  PricingCategory,
  FAQ,
  FinalCTAContent,
  AdvertisePageContent,
  CMSResponse,
  CMSError,
} from './types';

// Client
export {
  cmsClient,
  CMSClientFactory,
  type ICMSClient,
  type CMSClientConfig,
} from './cmsClient';

// Default Content
export { defaultContent } from './defaultContent';

// Icon Mapper
export {
  getIconByName,
  hasIcon,
  getAvailableIcons,
  registerIcon,
} from './iconMapper';

// Validation
export {
  validateHeroContent,
  validateFeatureBlocks,
  validateFAQs,
  validatePageContent,
  getValidationSummary,
  assertValidContent,
  type ValidationError,
  type ValidationResult,
} from './contentValidator';

// Hooks (re-export from hooks directory)
export { useAdvertiseCMS, useAdvertiseCMSSection } from '@/hooks/useAdvertiseCMS';
