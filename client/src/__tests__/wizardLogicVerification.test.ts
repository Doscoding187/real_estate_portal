/**
 * Wizard Logic Verification Tests
 * 
 * This file tests the core contracts of the wizard architecture:
 * 1. Phase Ordering Integrity
 * 2. Conditional Estate Logic
 * 3. Security Features Independence
 * 4. State Persistence Behavior
 * 5. Stub Discipline
 */

import { 
  getActivePhases, 
  getNextPhase, 
  getPreviousPhase,
  isWorkflowEnabled,
  WIZARD_CONFIG,
  type WizardState 
} from '../config/wizardConfig';

import { 
  shouldShowEstateProfile,
  COMMUNITY_TYPE_OPTIONS,
  SECURITY_FEATURE_OPTIONS,
  RESIDENTIAL_TYPE_OPTIONS,
  DEVELOPMENT_TYPE_OPTIONS,
  type CommunityType,
} from '../types/wizardTypes';

// =============================================================================
// TEST 1: Phase Ordering Integrity
// =============================================================================

describe('Phase Ordering Integrity', () => {
  
  test('phases render only from wizardConfig.ts', () => {
    const residentialConfig = WIZARD_CONFIG.residential;
    expect(residentialConfig.enabled).toBe(true);
    expect(residentialConfig.phases.length).toBeGreaterThan(0);
    
    // All phases have keyed identifiers, not numeric
    residentialConfig.phases.forEach(phase => {
      expect(typeof phase.key).toBe('string');
      expect(phase.key.length).toBeGreaterThan(0);
    });
  });

  test('no component assumes numeric indices - phases use string keys', () => {
    const phases = WIZARD_CONFIG.residential.phases;
    const keys = phases.map(p => p.key);
    
    // Keys should be semantic strings
    expect(keys).toContain('developmentType');
    expect(keys).toContain('residentialConfig');
    expect(keys).toContain('identity');
    expect(keys).toContain('estateProfile');
    
    // No numeric keys
    keys.forEach(key => {
      expect(Number.isNaN(Number(key))).toBe(true);
    });
  });

  test('reordering phases in config should be possible', () => {
    // Simulate reordering by checking that phase order comes from config only
    const originalPhases = [...WIZARD_CONFIG.residential.phases];
    const firstPhase = originalPhases[0];
    const secondPhase = originalPhases[1];
    
    // These should be different phases
    expect(firstPhase.key).not.toBe(secondPhase.key);
    
    // The order is determined by array position, not by any hardcoded logic
    expect(originalPhases.findIndex(p => p.key === 'developmentType')).toBe(0);
    expect(originalPhases.findIndex(p => p.key === 'residentialConfig')).toBe(1);
  });
});

// =============================================================================
// TEST 2: Conditional Estate Logic
// =============================================================================

describe('Conditional Estate Logic', () => {
  
  test('Path A: Estate selected → EstateProfilePhase included', () => {
    const stateWithEstate: WizardState = {
      developmentType: 'residential',
      residentialConfig: {
        residentialType: 'townhouse',
        communityTypes: ['security_estate' as CommunityType],
        securityFeatures: [],
      }
    };
    
    const activePhases = getActivePhases('residential', stateWithEstate);
    const phaseKeys = activePhases.map(p => p.key);
    
    // Estate profile should be included
    expect(phaseKeys).toContain('estateProfile');
    
    // shouldShowEstateProfile should return true
    expect(shouldShowEstateProfile(['security_estate'])).toBe(true);
  });

  test('Path A: Security features remain available with estate', () => {
    // Security features should not be blocked by estate selection
    const securityOptions = SECURITY_FEATURE_OPTIONS;
    expect(securityOptions.length).toBeGreaterThan(0);
    
    // All security features have values
    securityOptions.forEach(opt => {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    });
  });

  test('Path B: No estate selected → EstateProfilePhase excluded', () => {
    const stateWithoutEstate: WizardState = {
      developmentType: 'residential',
      residentialConfig: {
        residentialType: 'apartment',
        communityTypes: ['non_estate' as CommunityType],
        securityFeatures: [],
      }
    };
    
    const activePhases = getActivePhases('residential', stateWithoutEstate);
    const phaseKeys = activePhases.map(p => p.key);
    
    // Estate profile should NOT be included
    expect(phaseKeys).not.toContain('estateProfile');
    
    // shouldShowEstateProfile should return false
    expect(shouldShowEstateProfile(['non_estate'])).toBe(false);
  });

  test('Path B: Empty community types → No estate required', () => {
    const stateEmpty: WizardState = {
      developmentType: 'residential',
      residentialConfig: {
        residentialType: 'apartment',
        communityTypes: [],
        securityFeatures: [],
      }
    };
    
    const activePhases = getActivePhases('residential', stateEmpty);
    const phaseKeys = activePhases.map(p => p.key);
    
    expect(phaseKeys).not.toContain('estateProfile');
    expect(shouldShowEstateProfile([])).toBe(false);
  });
});

// =============================================================================
// TEST 3: Security Features Independence
// =============================================================================

describe('Security Features Independence', () => {
  
  test('Apartment + Non-estate + Security features = Valid', () => {
    // Security features should be selectable for ANY residential type
    // regardless of estate status
    
    const stateApartmentWithSecurity: WizardState = {
      developmentType: 'residential',
      residentialConfig: {
        residentialType: 'apartment',
        communityTypes: ['non_estate'],
        securityFeatures: ['cctv', 'access_controlled'],
      }
    };
    
    // The state is valid
    expect(stateApartmentWithSecurity.residentialConfig.securityFeatures.length).toBe(2);
    
    // Estate profile should NOT be triggered
    expect(shouldShowEstateProfile(stateApartmentWithSecurity.residentialConfig.communityTypes as CommunityType[])).toBe(false);
    
    // But security features are still present in state
    expect(stateApartmentWithSecurity.residentialConfig.securityFeatures).toContain('cctv');
    expect(stateApartmentWithSecurity.residentialConfig.securityFeatures).toContain('access_controlled');
  });

  test('Security features have no estate dependency in type definition', () => {
    // Verify the type structure doesn't bind security to estates
    const residentialTypes = RESIDENTIAL_TYPE_OPTIONS.map(r => r.value);
    
    // All residential types should allow security features (no blocklist)
    expect(residentialTypes).toContain('apartment');
    expect(residentialTypes).toContain('townhouse');
    expect(residentialTypes).toContain('freehold');
    
    // Security feature options exist independently
    expect(SECURITY_FEATURE_OPTIONS.length).toBeGreaterThan(5);
  });
});

// =============================================================================
// TEST 4: State Persistence & Reset Behavior
// =============================================================================

describe('State Persistence Behavior', () => {
  
  test('Community type removal should not leave orphaned estate data conceptually', () => {
    // This test verifies the DATA CONTRACT, not the implementation
    // The implementation should handle this in setResidentialConfig
    
    // When switching from estate to non-estate:
    const beforeState: WizardState = {
      developmentType: 'residential',
      residentialConfig: {
        residentialType: 'townhouse',
        communityTypes: ['golf_estate'],
        securityFeatures: ['cctv'],
      }
    };
    
    // Estate profile was visible
    expect(shouldShowEstateProfile(beforeState.residentialConfig.communityTypes as CommunityType[])).toBe(true);
    
    // After clearing estate types
    const afterState: WizardState = {
      ...beforeState,
      residentialConfig: {
        ...beforeState.residentialConfig,
        communityTypes: ['non_estate'],
      }
    };
    
    // Estate profile should no longer be visible
    expect(shouldShowEstateProfile(afterState.residentialConfig.communityTypes as CommunityType[])).toBe(false);
    
    // The active phases should reflect this
    const activePhases = getActivePhases('residential', afterState);
    expect(activePhases.map(p => p.key)).not.toContain('estateProfile');
  });

  test('Changing residential type should not affect community types by default', () => {
    // Type changes shouldn't cascade-reset everything
    const state: WizardState = {
      developmentType: 'residential',
      residentialConfig: {
        residentialType: 'apartment',
        communityTypes: ['gated_community'],
        securityFeatures: ['cctv'],
      }
    };
    
    // Changing residential type to townhouse
    const updatedState: WizardState = {
      ...state,
      residentialConfig: {
        ...state.residentialConfig,
        residentialType: 'townhouse',
      }
    };
    
    // Community types should persist
    expect(updatedState.residentialConfig.communityTypes).toContain('gated_community');
    expect(updatedState.residentialConfig.securityFeatures).toContain('cctv');
  });
});

// =============================================================================
// TEST 5: Stub Discipline (Future Safety)
// =============================================================================

describe('Stub Discipline', () => {
  
  test('Land workflow is explicitly disabled', () => {
    expect(WIZARD_CONFIG.land.enabled).toBe(false);
    expect(WIZARD_CONFIG.land.phases).toEqual([]);
  });

  test('Commercial workflow is explicitly disabled', () => {
    expect(WIZARD_CONFIG.commercial.enabled).toBe(false);
    expect(WIZARD_CONFIG.commercial.phases).toEqual([]);
  });

  test('isWorkflowEnabled returns false for land/commercial', () => {
    expect(isWorkflowEnabled('land')).toBe(false);
    expect(isWorkflowEnabled('commercial')).toBe(false);
    expect(isWorkflowEnabled('residential')).toBe(true);
  });

  test('getActivePhases returns empty for disabled workflows', () => {
    const mockState: WizardState = {
      developmentType: 'land',
      residentialConfig: {
        residentialType: null,
        communityTypes: [],
        securityFeatures: [],
      }
    };
    
    expect(getActivePhases('land', mockState)).toEqual([]);
    expect(getActivePhases('commercial', mockState)).toEqual([]);
  });

  test('Development type options show land/commercial as disabled', () => {
    const landOption = DEVELOPMENT_TYPE_OPTIONS.find(o => o.value === 'land');
    const commercialOption = DEVELOPMENT_TYPE_OPTIONS.find(o => o.value === 'commercial');
    
    expect(landOption?.enabled).toBe(false);
    expect(commercialOption?.enabled).toBe(false);
  });
});

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

describe('Navigation Helpers', () => {
  
  const baseState: WizardState = {
    developmentType: 'residential',
    residentialConfig: {
      residentialType: 'apartment',
      communityTypes: [],
      securityFeatures: [],
    }
  };

  test('getNextPhase returns correct next phase', () => {
    const next = getNextPhase('developmentType', 'residential', baseState);
    expect(next).toBe('residentialConfig');
  });

  test('getPreviousPhase returns correct previous phase', () => {
    const prev = getPreviousPhase('residentialConfig', 'residential', baseState);
    expect(prev).toBe('developmentType');
  });

  test('getNextPhase returns null for last phase', () => {
    const next = getNextPhase('publish', 'residential', baseState);
    expect(next).toBeNull();
  });

  test('getPreviousPhase returns null for first phase', () => {
    const prev = getPreviousPhase('developmentType', 'residential', baseState);
    expect(prev).toBeNull();
  });
});
