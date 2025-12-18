/**
 * useWizardNavigation Hook
 * 
 * Provides keyed navigation for the Development Wizard.
 * Uses wizardConfig to determine active phases and handle conditional skipping.
 */

import { useMemo, useCallback } from 'react';
import { useDevelopmentWizard } from './useDevelopmentWizard';
import { 
  getActivePhases, 
  getNextPhase, 
  getPreviousPhase,
  getPhaseIndex,
  type WizardState 
} from '@/config/wizardConfig';
import type { WizardPhase } from '@/types/wizardTypes';

// Map numeric phases to keyed phases (for migration)
const PHASE_KEY_MAP: Record<number, WizardPhase> = {
  1: 'developmentType',
  2: 'residentialConfig',
  3: 'identity',
  4: 'estateProfile',
  5: 'amenities',
  6: 'media',
  7: 'units',
  8: 'publish',
};

const PHASE_NUMBER_MAP: Record<WizardPhase, number> = {
  developmentType: 1,
  residentialConfig: 2,
  identity: 3,
  location: 3, // Maps to identity for now
  estateProfile: 4,
  amenities: 5,
  media: 6,
  units: 7,
  pricing: 7, // Maps to units for now
  publish: 8,
};

export function useWizardNavigation() {
  const store = useDevelopmentWizard();
  
  // Build wizard state for config evaluation
  const wizardState: WizardState = useMemo(() => ({
    developmentType: store.developmentType,
    residentialConfig: store.residentialConfig,
  }), [store.developmentType, store.residentialConfig]);

  // Get active phases based on current state
  const activePhases = useMemo(() => 
    getActivePhases(store.developmentType, wizardState),
    [store.developmentType, wizardState]
  );

  // Current phase key
  const currentPhaseKey = useMemo(() => 
    PHASE_KEY_MAP[store.currentPhase] || 'developmentType',
    [store.currentPhase]
  );

  // Current phase index within active phases
  const currentPhaseIndex = useMemo(() => 
    activePhases.findIndex(p => p.key === currentPhaseKey),
    [activePhases, currentPhaseKey]
  );

  // Check if current phase is active (should be shown)
  const isCurrentPhaseActive = useMemo(() => 
    activePhases.some(p => p.key === currentPhaseKey),
    [activePhases, currentPhaseKey]
  );

  // Navigate to next active phase
  const goToNextPhase = useCallback(() => {
    const nextKey = getNextPhase(currentPhaseKey, store.developmentType, wizardState);
    if (nextKey) {
      const nextNumber = PHASE_NUMBER_MAP[nextKey];
      store.setPhase(nextNumber);
    }
  }, [currentPhaseKey, store, wizardState]);

  // Navigate to previous active phase
  const goToPreviousPhase = useCallback(() => {
    const prevKey = getPreviousPhase(currentPhaseKey, store.developmentType, wizardState);
    if (prevKey) {
      const prevNumber = PHASE_NUMBER_MAP[prevKey];
      store.setPhase(prevNumber);
    }
  }, [currentPhaseKey, store, wizardState]);

  // Navigate to specific phase by key
  const goToPhase = useCallback((phaseKey: WizardPhase) => {
    // Check if phase is active
    if (!activePhases.some(p => p.key === phaseKey)) {
      console.warn(`Phase "${phaseKey}" is not active in current configuration`);
      return false;
    }
    
    const phaseNumber = PHASE_NUMBER_MAP[phaseKey];
    store.setPhase(phaseNumber);
    return true;
  }, [activePhases, store]);

  // Check if can go to next phase
  const canGoNext = useMemo(() => {
    return getNextPhase(currentPhaseKey, store.developmentType, wizardState) !== null;
  }, [currentPhaseKey, store.developmentType, wizardState]);

  // Check if can go to previous phase
  const canGoPrevious = useMemo(() => {
    return getPreviousPhase(currentPhaseKey, store.developmentType, wizardState) !== null;
  }, [currentPhaseKey, store.developmentType, wizardState]);

  // Get phase labels for progress indicator
  const phaseLabels = useMemo(() => 
    activePhases.map(p => p.label),
    [activePhases]
  );

  // Check if estate profile should be shown
  const shouldShowEstateProfile = useMemo(() => 
    activePhases.some(p => p.key === 'estateProfile'),
    [activePhases]
  );

  return {
    // Current state
    currentPhaseKey,
    currentPhaseIndex,
    currentPhaseNumber: store.currentPhase,
    isCurrentPhaseActive,
    
    // Navigation
    goToNextPhase,
    goToPreviousPhase,
    goToPhase,
    canGoNext,
    canGoPrevious,
    
    // Phase info
    activePhases,
    phaseLabels,
    totalPhases: activePhases.length,
    
    // Conditional flags
    shouldShowEstateProfile,
    
    // Raw store access
    store,
  };
}

// Export the phase maps for use in components
export { PHASE_KEY_MAP, PHASE_NUMBER_MAP };
