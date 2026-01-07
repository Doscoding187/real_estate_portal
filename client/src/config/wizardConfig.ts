/**
 * Wizard Configuration System
 * 
 * Phase ordering and visibility is driven entirely by this configuration.
 * Phases are keyed (not numerically indexed) for extensibility.
 */

import type { 
  WizardPhase, 
  DevelopmentType, 
  CommunityType 
} from '@/types/wizardTypes';
import { shouldShowEstateProfile } from '@/types/wizardTypes';

// =============================================================================
// PHASE CONFIGURATION
// =============================================================================

export interface PhaseConfig {
  key: WizardPhase;
  label: string;
  description?: string;
  isConditional: boolean;
  condition?: (state: WizardState) => boolean;
}

// Minimal state interface for condition evaluation
export interface WizardState {
  developmentType: DevelopmentType;
  residentialConfig: {
    residentialType: string | null;
    communityTypes: CommunityType[];
    securityFeatures: string[];
  };
}

// =============================================================================
// WORKFLOW CONFIGURATIONS
// =============================================================================

export interface WorkflowConfig {
  enabled: boolean;
  label: string;
  description: string;
  phases: PhaseConfig[];
}

export const WIZARD_CONFIG: Record<DevelopmentType, WorkflowConfig> = {
  // ============================================================
  // RESIDENTIAL WORKFLOW (Implemented)
  // ============================================================
  residential: {
    enabled: true,
    label: 'Residential Development',
    description: 'Apartments, townhouses, estates, retirement villages',
    phases: [
      {
        key: 'developmentType',
        label: 'Development Type',
        description: 'Select the category of your development',
        isConditional: false,
      },
      {
        key: 'residentialConfig',
        label: 'Configuration',
        description: 'Define residential type, community, and security',
        isConditional: false,
      },
      {
        key: 'identity',
        label: 'Identity',
        description: 'Development name, developer, and status',
        isConditional: false,
      },
      {
        key: 'location',
        label: 'Location',
        description: 'Address, map pin, and local context',
        isConditional: false,
      },
      {
        key: 'estateProfile',
        label: 'Development Profile',
        description: 'HOA, levies, and development-level amenities',
        isConditional: true,
        condition: (state) => shouldShowEstateProfile(state.residentialConfig.communityTypes),
      },
      {
        key: 'amenities',
        label: 'Amenities',
        description: 'Shared development amenities and features',
        isConditional: false,
      },
      {
        key: 'media',
        label: 'Media',
        description: 'Photos, videos, floor plans, and brochures',
        isConditional: false,
      },
      {
        key: 'units',
        label: 'Unit Types',
        description: 'Define unit templates and inventory',
        isConditional: false,
      },
      {
        key: 'pricing',
        label: 'Pricing',
        description: 'Base prices, premiums, and availability',
        isConditional: false,
      },
      {
        key: 'publish',
        label: 'Publish',
        description: 'Review, validate, and publish',
        isConditional: false,
      },
    ],
  },

  // ============================================================
  // MIXED-USE WORKFLOW (Uses residential phases)
  // ============================================================
  mixed_use: {
    enabled: true,
    label: 'Mixed-Use Development',
    description: 'Residential & commercial in one development',
    phases: [
      {
        key: 'developmentType',
        label: 'Development Type',
        isConditional: false,
      },
      {
        key: 'residentialConfig',
        label: 'Configuration',
        description: 'Define unit types and community settings',
        isConditional: false,
      },
      {
        key: 'identity',
        label: 'Identity',
        isConditional: false,
      },
      {
        key: 'estateProfile',
        label: 'Development Profile',
        isConditional: true,
        condition: (state) => shouldShowEstateProfile(state.residentialConfig.communityTypes),
      },
      {
        key: 'amenities',
        label: 'Amenities',
        isConditional: false,
      },
      {
        key: 'media',
        label: 'Media',
        isConditional: false,
      },
      {
        key: 'units',
        label: 'Unit Types',
        isConditional: false,
      },
      {
        key: 'publish',
        label: 'Publish',
        isConditional: false,
      },
    ],
  },

  // ============================================================
  // LAND WORKFLOW (Enabled)
  // ============================================================
  land: {
    enabled: true,
    label: 'Land Development',
    description: 'Serviced plots, vacant land, plot + build',
    phases: [
      {
        key: 'developmentType',
        label: 'Development Type',
        isConditional: false,
      },
      {
        key: 'residentialConfig', // Re-used for land config routing
        label: 'Land Configuration',
        description: 'Land type and infrastructure',
        isConditional: false,
      },
      {
        key: 'identity',
        label: 'Identity',
        isConditional: false,
      },
      {
        key: 'amenities',
        label: 'Amenities',
        description: 'Land features and nearby amenities',
        isConditional: false,
      },
      {
        key: 'media',
        label: 'Media',
        isConditional: false,
      },
      {
        key: 'units',
        label: 'Plots',
        description: 'Define available plots',
        isConditional: false,
      },
      {
        key: 'publish',
        label: 'Publish',
        isConditional: false,
      },
    ],
  },

  // ============================================================
  // COMMERCIAL WORKFLOW (Enabled)
  // ============================================================
  commercial: {
    enabled: true,
    label: 'Commercial Development',
    description: 'Offices, retail, industrial',
    phases: [
      {
        key: 'developmentType',
        label: 'Development Type',
        isConditional: false,
      },
      {
        key: 'residentialConfig', // Re-used for commercial config routing
        label: 'Commercial Configuration',
        description: 'Commercial type and features',
        isConditional: false,
      },
      {
        key: 'identity',
        label: 'Identity',
        isConditional: false,
      },
      {
        key: 'amenities',
        label: 'Amenities',
        description: 'Building features and services',
        isConditional: false,
      },
      {
        key: 'media',
        label: 'Media',
        isConditional: false,
      },
      {
        key: 'units',
        label: 'Commercial Units',
        description: 'Define lettable units',
        isConditional: false,
      },
      {
        key: 'publish',
        label: 'Publish',
        isConditional: false,
      },
    ],
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the active phases for a given development type and state.
 * Filters out conditional phases that don't meet their conditions.
 */
export const getActivePhases = (
  type: DevelopmentType, 
  state: WizardState
): PhaseConfig[] => {
  const config = WIZARD_CONFIG[type];
  
  if (!config.enabled) {
    return [];
  }
  
  return config.phases.filter(phase => 
    !phase.isConditional || (phase.condition && phase.condition(state))
  );
};

/**
 * Get the index of a phase within the active phases.
 * Returns -1 if not found.
 */
export const getPhaseIndex = (
  phaseKey: WizardPhase,
  type: DevelopmentType,
  state: WizardState
): number => {
  const activePhases = getActivePhases(type, state);
  return activePhases.findIndex(p => p.key === phaseKey);
};

/**
 * Get the next phase after the current one.
 * Returns null if current is the last phase.
 */
export const getNextPhase = (
  currentPhase: WizardPhase,
  type: DevelopmentType,
  state: WizardState
): WizardPhase | null => {
  const activePhases = getActivePhases(type, state);
  const currentIndex = activePhases.findIndex(p => p.key === currentPhase);
  
  if (currentIndex === -1 || currentIndex >= activePhases.length - 1) {
    return null;
  }
  
  return activePhases[currentIndex + 1].key;
};

/**
 * Get the previous phase before the current one.
 * Returns null if current is the first phase.
 */
export const getPreviousPhase = (
  currentPhase: WizardPhase,
  type: DevelopmentType,
  state: WizardState
): WizardPhase | null => {
  const activePhases = getActivePhases(type, state);
  const currentIndex = activePhases.findIndex(p => p.key === currentPhase);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return activePhases[currentIndex - 1].key;
};

/**
 * Check if a workflow is enabled.
 */
export const isWorkflowEnabled = (type: DevelopmentType): boolean => {
  return WIZARD_CONFIG[type]?.enabled ?? false;
};
