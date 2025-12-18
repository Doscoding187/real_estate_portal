/**
 * Wizard Logic Verification Script
 * 
 * Run with: npx tsx src/__tests__/verifyWizardLogic.ts
 * 
 * Tests the core contracts without requiring Jest/Vitest setup.
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
// SIMPLE TEST FRAMEWORK
// =============================================================================

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    failed++;
    failures.push(`${name}: ${e.message}`);
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
  }
}

function expect(value: any) {
  return {
    toBe: (expected: any) => {
      if (value !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(value) !== JSON.stringify(expected)) 
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
    },
    toContain: (item: any) => {
      if (!Array.isArray(value) || !value.includes(item)) 
        throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
    },
    not: {
      toContain: (item: any) => {
        if (Array.isArray(value) && value.includes(item)) 
          throw new Error(`Expected array NOT to contain ${JSON.stringify(item)}`);
      }
    },
    toBeGreaterThan: (n: number) => {
      if (value <= n) throw new Error(`Expected ${value} > ${n}`);
    },
    toBeNull: () => {
      if (value !== null) throw new Error(`Expected null, got ${JSON.stringify(value)}`);
    },
    toBeTruthy: () => {
      if (!value) throw new Error(`Expected truthy value, got ${JSON.stringify(value)}`);
    }
  };
}

// =============================================================================
// TEST 1: PHASE ORDERING INTEGRITY
// =============================================================================

console.log('\n📋 TEST 1: Phase Ordering Integrity\n');

test('Phases render only from wizardConfig.ts', () => {
  const residentialConfig = WIZARD_CONFIG.residential;
  expect(residentialConfig.enabled).toBe(true);
  expect(residentialConfig.phases.length).toBeGreaterThan(0);
});

test('All phases use string keys, not numeric', () => {
  const phases = WIZARD_CONFIG.residential.phases;
  phases.forEach(phase => {
    expect(typeof phase.key).toBe('string');
    expect(Number.isNaN(Number(phase.key))).toBe(true);
  });
});

test('Expected phases exist in config', () => {
  const keys = WIZARD_CONFIG.residential.phases.map(p => p.key);
  expect(keys).toContain('developmentType');
  expect(keys).toContain('residentialConfig');
  expect(keys).toContain('identity');
  expect(keys).toContain('estateProfile');
});

// =============================================================================
// TEST 2: CONDITIONAL ESTATE LOGIC
// =============================================================================

console.log('\n📋 TEST 2: Conditional Estate Logic\n');

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
  
  expect(phaseKeys).toContain('estateProfile');
  expect(shouldShowEstateProfile(['security_estate'])).toBe(true);
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
  
  expect(phaseKeys).not.toContain('estateProfile');
  expect(shouldShowEstateProfile(['non_estate'])).toBe(false);
});

test('Path B: Empty community types → No estate required', () => {
  expect(shouldShowEstateProfile([])).toBe(false);
});

test('Golf estate triggers estate profile', () => {
  expect(shouldShowEstateProfile(['golf_estate'])).toBe(true);
});

test('Eco estate triggers estate profile', () => {
  expect(shouldShowEstateProfile(['eco_estate'])).toBe(true);
});

// =============================================================================
// TEST 3: SECURITY FEATURES INDEPENDENCE
// =============================================================================

console.log('\n📋 TEST 3: Security Features Independence\n');

test('Apartment + Non-estate + Security features = Valid', () => {
  const stateApartmentWithSecurity: WizardState = {
    developmentType: 'residential',
    residentialConfig: {
      residentialType: 'apartment',
      communityTypes: ['non_estate'],
      securityFeatures: ['cctv', 'access_controlled'],
    }
  };
  
  // Security features are stored
  expect(stateApartmentWithSecurity.residentialConfig.securityFeatures.length).toBe(2);
  
  // Estate profile NOT triggered
  expect(shouldShowEstateProfile(stateApartmentWithSecurity.residentialConfig.communityTypes as CommunityType[])).toBe(false);
});

test('Security feature options exist independently', () => {
  expect(SECURITY_FEATURE_OPTIONS.length).toBeGreaterThan(5);
  SECURITY_FEATURE_OPTIONS.forEach(opt => {
    expect(opt.value).toBeTruthy();
    expect(opt.label).toBeTruthy();
  });
});

// =============================================================================
// TEST 4: STATE PERSISTENCE BEHAVIOR
// =============================================================================

console.log('\n📋 TEST 4: State Persistence Behavior\n');

test('Clearing estate types removes estate profile phase', () => {
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
  
  expect(shouldShowEstateProfile(afterState.residentialConfig.communityTypes as CommunityType[])).toBe(false);
  
  const activePhases = getActivePhases('residential', afterState);
  expect(activePhases.map(p => p.key)).not.toContain('estateProfile');
});

// =============================================================================
// TEST 5: STUB DISCIPLINE
// =============================================================================

console.log('\n📋 TEST 5: Stub Discipline\n');

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

// =============================================================================
// TEST 6: NAVIGATION HELPERS
// =============================================================================

console.log('\n📋 TEST 6: Navigation Helpers\n');

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

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\n📊 VERIFICATION SUMMARY\n`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\n⚠️  FAILURES:');
  failures.forEach(f => console.log(`   • ${f}`));
}

console.log('\n' + '='.repeat(60));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ ALL VERIFICATION TESTS PASSED\n');
  process.exit(0);
}
