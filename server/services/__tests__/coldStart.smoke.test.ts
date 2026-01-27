/**
 * Cold Start Infrastructure - Smoke Tests
 *
 * These tests verify that the cold start services
 * (LaunchService, ContentQuotaService, FoundingPartnerService, OnboardingService)
 * are properly instantiated and have their core methods available.
 *
 * This is a checkpoint test to ensure all cold start infrastructure is working
 * before proceeding to quality scoring and monetization features.
 *
 * Task 13: Checkpoint - Ensure cold start tests pass
 */

import { describe, it, expect } from 'vitest';
import { launchService } from '../launchService';
import { contentQuotaService } from '../contentQuotaService';
import { foundingPartnerService } from '../foundingPartnerService';
import { onboardingService } from '../onboardingService';

describe('Cold Start Infrastructure - Smoke Tests', () => {
  describe('Launch Service', () => {
    it('should be properly instantiated', () => {
      expect(launchService).toBeDefined();
    });

    it('should have getCurrentPhase method', () => {
      expect(launchService.getCurrentPhase).toBeDefined();
      expect(typeof launchService.getCurrentPhase).toBe('function');
    });

    it('should have getPhaseConfiguration method', () => {
      expect(launchService.getPhaseConfiguration).toBeDefined();
      expect(typeof launchService.getPhaseConfiguration).toBe('function');
    });

    it('should have checkLaunchReadiness method', () => {
      expect(launchService.checkLaunchReadiness).toBeDefined();
      expect(typeof launchService.checkLaunchReadiness).toBe('function');
    });

    it('should have getContentQuotas method', () => {
      expect(launchService.getContentQuotas).toBeDefined();
      expect(typeof launchService.getContentQuotas).toBe('function');
    });

    it('should have getLaunchMetrics method', () => {
      expect(launchService.getLaunchMetrics).toBeDefined();
      expect(typeof launchService.getLaunchMetrics).toBe('function');
    });

    it('should have transitionPhase method', () => {
      expect(launchService.transitionPhase).toBeDefined();
      expect(typeof launchService.transitionPhase).toBe('function');
    });

    it('should have triggerRecoveryMode method', () => {
      expect(launchService.triggerRecoveryMode).toBeDefined();
      expect(typeof launchService.triggerRecoveryMode).toBe('function');
    });

    it('should have updateContentQuota method', () => {
      expect(launchService.updateContentQuota).toBeDefined();
      expect(typeof launchService.updateContentQuota).toBe('function');
    });

    it('should have incrementContentQuota method', () => {
      expect(launchService.incrementContentQuota).toBeDefined();
      expect(typeof launchService.incrementContentQuota).toBe('function');
    });

    it('should have recordLaunchMetrics method', () => {
      expect(launchService.recordLaunchMetrics).toBeDefined();
      expect(typeof launchService.recordLaunchMetrics).toBe('function');
    });

    it('should have checkMetricsAndRecover method', () => {
      expect(launchService.checkMetricsAndRecover).toBeDefined();
      expect(typeof launchService.checkMetricsAndRecover).toBe('function');
    });
  });

  describe('Content Quota Service', () => {
    it('should be properly instantiated', () => {
      expect(contentQuotaService).toBeDefined();
    });

    it('should have getQuotaProgress method', () => {
      expect(contentQuotaService.getQuotaProgress).toBeDefined();
      expect(typeof contentQuotaService.getQuotaProgress).toBe('function');
    });

    it('should have getInventoryReport method', () => {
      expect(contentQuotaService.getInventoryReport).toBeDefined();
      expect(typeof contentQuotaService.getInventoryReport).toBe('function');
    });

    it('should have trackContentCreation method', () => {
      expect(contentQuotaService.trackContentCreation).toBeDefined();
      expect(typeof contentQuotaService.trackContentCreation).toBe('function');
    });

    it('should have syncQuotasFromContent method', () => {
      expect(contentQuotaService.syncQuotasFromContent).toBeDefined();
      expect(typeof contentQuotaService.syncQuotasFromContent).toBe('function');
    });

    it('should have getQuotaStatus method', () => {
      expect(contentQuotaService.getQuotaStatus).toBeDefined();
      expect(typeof contentQuotaService.getQuotaStatus).toBe('function');
    });

    it('should have isQuotaMet method', () => {
      expect(contentQuotaService.isQuotaMet).toBeDefined();
      expect(typeof contentQuotaService.isQuotaMet).toBe('function');
    });

    it('should have getUnmetQuotas method', () => {
      expect(contentQuotaService.getUnmetQuotas).toBeDefined();
      expect(typeof contentQuotaService.getUnmetQuotas).toBe('function');
    });

    it('should have getQuotaCategory method', () => {
      expect(contentQuotaService.getQuotaCategory).toBeDefined();
      expect(typeof contentQuotaService.getQuotaCategory).toBe('function');
    });

    it('should have addContentTypeMapping method', () => {
      expect(contentQuotaService.addContentTypeMapping).toBeDefined();
      expect(typeof contentQuotaService.addContentTypeMapping).toBe('function');
    });

    it('should have getContentTypeMappings method', () => {
      expect(contentQuotaService.getContentTypeMappings).toBeDefined();
      expect(typeof contentQuotaService.getContentTypeMappings).toBe('function');
    });
  });

  describe('Founding Partner Service', () => {
    it('should be properly instantiated', () => {
      expect(foundingPartnerService).toBeDefined();
    });

    it('should have enrollFoundingPartner method', () => {
      expect(foundingPartnerService.enrollFoundingPartner).toBeDefined();
      expect(typeof foundingPartnerService.enrollFoundingPartner).toBe('function');
    });

    it('should have checkEnrollmentOpen method', () => {
      expect(foundingPartnerService.checkEnrollmentOpen).toBeDefined();
      expect(typeof foundingPartnerService.checkEnrollmentOpen).toBe('function');
    });

    it('should have getFoundingPartnerStatus method', () => {
      expect(foundingPartnerService.getFoundingPartnerStatus).toBeDefined();
      expect(typeof foundingPartnerService.getFoundingPartnerStatus).toBe('function');
    });

    it('should have isFoundingPartner method', () => {
      expect(foundingPartnerService.isFoundingPartner).toBeDefined();
      expect(typeof foundingPartnerService.isFoundingPartner).toBe('function');
    });

    it('should have getFoundingPartnerBenefits method', () => {
      expect(foundingPartnerService.getFoundingPartnerBenefits).toBeDefined();
      expect(typeof foundingPartnerService.getFoundingPartnerBenefits).toBe('function');
    });

    it('should have areBenefitsActive method', () => {
      expect(foundingPartnerService.areBenefitsActive).toBeDefined();
      expect(typeof foundingPartnerService.areBenefitsActive).toBe('function');
    });

    it('should have checkContentCommitment method', () => {
      expect(foundingPartnerService.checkContentCommitment).toBeDefined();
      expect(typeof foundingPartnerService.checkContentCommitment).toBe('function');
    });

    it('should have trackPreLaunchContent method', () => {
      expect(foundingPartnerService.trackPreLaunchContent).toBeDefined();
      expect(typeof foundingPartnerService.trackPreLaunchContent).toBe('function');
    });

    it('should have trackWeeklyContent method', () => {
      expect(foundingPartnerService.trackWeeklyContent).toBeDefined();
      expect(typeof foundingPartnerService.trackWeeklyContent).toBe('function');
    });

    it('should have issueWarning method', () => {
      expect(foundingPartnerService.issueWarning).toBeDefined();
      expect(typeof foundingPartnerService.issueWarning).toBe('function');
    });

    it('should have revokeFoundingStatus method', () => {
      expect(foundingPartnerService.revokeFoundingStatus).toBeDefined();
      expect(typeof foundingPartnerService.revokeFoundingStatus).toBe('function');
    });

    it('should have getActiveFoundingPartners method', () => {
      expect(foundingPartnerService.getActiveFoundingPartners).toBeDefined();
      expect(typeof foundingPartnerService.getActiveFoundingPartners).toBe('function');
    });

    it('should have getFoundingPartnersCount method', () => {
      expect(foundingPartnerService.getFoundingPartnersCount).toBeDefined();
      expect(typeof foundingPartnerService.getFoundingPartnersCount).toBe('function');
    });

    it('should have checkAllCommitments method', () => {
      expect(foundingPartnerService.checkAllCommitments).toBeDefined();
      expect(typeof foundingPartnerService.checkAllCommitments).toBe('function');
    });

    it('should have getCurrentWeekIndex method', () => {
      expect(foundingPartnerService.getCurrentWeekIndex).toBeDefined();
      expect(typeof foundingPartnerService.getCurrentWeekIndex).toBe('function');
    });

    it('should have getCommitmentRequirements method', () => {
      expect(foundingPartnerService.getCommitmentRequirements).toBeDefined();
      expect(typeof foundingPartnerService.getCommitmentRequirements).toBe('function');
    });
  });

  describe('Onboarding Service', () => {
    it('should be properly instantiated', () => {
      expect(onboardingService).toBeDefined();
    });

    it('should have getOnboardingState method', () => {
      expect(onboardingService.getOnboardingState).toBeDefined();
      expect(typeof onboardingService.getOnboardingState).toBe('function');
    });

    it('should have showWelcomeOverlay method', () => {
      expect(onboardingService.showWelcomeOverlay).toBeDefined();
      expect(typeof onboardingService.showWelcomeOverlay).toBe('function');
    });

    it('should have dismissWelcomeOverlay method', () => {
      expect(onboardingService.dismissWelcomeOverlay).toBeDefined();
      expect(typeof onboardingService.dismissWelcomeOverlay).toBe('function');
    });

    it('should have getSuggestedTopicsForUser method', () => {
      expect(onboardingService.getSuggestedTopicsForUser).toBeDefined();
      expect(typeof onboardingService.getSuggestedTopicsForUser).toBe('function');
    });

    it('should have showTooltip method', () => {
      expect(onboardingService.showTooltip).toBeDefined();
      expect(typeof onboardingService.showTooltip).toBe('function');
    });

    it('should have dismissTooltip method', () => {
      expect(onboardingService.dismissTooltip).toBeDefined();
      expect(typeof onboardingService.dismissTooltip).toBe('function');
    });

    it('should have checkFeatureUnlock method', () => {
      expect(onboardingService.checkFeatureUnlock).toBeDefined();
      expect(typeof onboardingService.checkFeatureUnlock).toBe('function');
    });

    it('should have unlockFeature method', () => {
      expect(onboardingService.unlockFeature).toBeDefined();
      expect(typeof onboardingService.unlockFeature).toBe('function');
    });

    it('should have trackOnboardingEvent method', () => {
      expect(onboardingService.trackOnboardingEvent).toBeDefined();
      expect(typeof onboardingService.trackOnboardingEvent).toBe('function');
    });

    it('should have shouldShowWelcomeOverlay method', () => {
      expect(onboardingService.shouldShowWelcomeOverlay).toBeDefined();
      expect(typeof onboardingService.shouldShowWelcomeOverlay).toBe('function');
    });

    it('should have shouldShowTooltip method', () => {
      expect(onboardingService.shouldShowTooltip).toBeDefined();
      expect(typeof onboardingService.shouldShowTooltip).toBe('function');
    });

    it('should have getTooltipConfig method', () => {
      expect(onboardingService.getTooltipConfig).toBeDefined();
      expect(typeof onboardingService.getTooltipConfig).toBe('function');
    });

    it('should have resetOnboardingState method', () => {
      expect(onboardingService.resetOnboardingState).toBeDefined();
      expect(typeof onboardingService.resetOnboardingState).toBe('function');
    });
  });

  describe('Service Integration', () => {
    it('should have all cold start services available for integration', () => {
      expect(launchService).toBeDefined();
      expect(contentQuotaService).toBeDefined();
      expect(foundingPartnerService).toBeDefined();
      expect(onboardingService).toBeDefined();
    });
  });
});
