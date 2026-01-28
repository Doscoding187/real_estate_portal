/**
 * useWizardNavigation Hook (Simplified)
 *
 * Provides conditional logic helpers for the Development Wizard.
 *
 * IMPORTANT: This is now a READ-ONLY helper, not a navigation authority.
 * The DevelopmentWizard.tsx handles all phase transitions directly using numeric phases.
 *
 * This hook only provides computed flags like shouldShowEstateProfile.
 */

import { useMemo } from 'react';
import { useDevelopmentWizard } from './useDevelopmentWizard';

export function useWizardNavigation() {
  const { developmentType, developmentData, residentialConfig, estateProfile } =
    useDevelopmentWizard();

  /**
   * Determines if Phase 6 (Development Profile / Estate Profile) should be shown
   *
   * Rules:
   * - Never show for land developments
   * - Never show for commercial developments
   * - For residential: show only if it's an estate/complex (not a phase extension)
   */
  const shouldShowEstateProfile = useMemo(() => {
    // Skip for land and commercial
    if (developmentType === 'land' || developmentType === 'commercial') {
      return false;
    }

    // For residential: check if it's an estate/complex
    // If nature is 'phase' or 'extension', skip estate profile
    if (developmentData?.nature === 'phase' || developmentData?.nature === 'extension') {
      return false;
    }

    // Default: show for new residential estates/complexes
    return true;
  }, [developmentType, developmentData?.nature]);

  return {
    // Conditional flags
    shouldShowEstateProfile,

    // Raw store access (for backward compatibility)
    store: useDevelopmentWizard(),
  };
}
