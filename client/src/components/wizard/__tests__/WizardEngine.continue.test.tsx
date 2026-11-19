import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

for (const [file, name] of [
  ['BasicsPhase', 'BasicsPhase'],
  ['AboutPhase', 'AboutPhase'],
  ['LocationPhase', 'LocationPhase'],
  ['EstateProfilePhase', 'EstateProfilePhase'],
  ['AmenitiesPhase', 'AmenitiesPhase'],
  ['OverviewPhase', 'OverviewPhase'],
  ['MediaPhase', 'MediaPhase'],
  ['UnitTypesPhase', 'UnitTypesPhase'],
  ['FinalisationPhase', 'FinalisationPhase'],
]) {
  vi.doMock(`@/components/development-wizard/phases/${file}`, () => ({
    [name]: () => <div>{name} body</div>,
  }));
}

import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';

const store = () => useDevelopmentWizard.getState();

const SALE_STEPS = [
  'configuration',
  'identity_market',
  'location',
  'governance_finances',
  'amenities_features',
  'development_media',
  'unit_types',
  'review_publish',
];

async function renderEngine() {
  const { WizardEngine } = await import('../WizardEngine');
  return render(<WizardEngine />);
}

describe('Continue moves exactly one step', () => {
  beforeEach(() => {
    localStorage.clear();
    store().reset();
    store().ensureResidentialWorkflow('for_sale');
  });

  it('on every step of the sale workflow, one click lands on the next step', async () => {
    await renderEngine();
    expect(store().currentStepId).toBe('configuration');
    for (let i = 0; i < SALE_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
      expect(store().currentStepId).toBe(SALE_STEPS[i + 1]);
    }
    expect(screen.queryByRole('button', { name: /Continue/ })).not.toBeInTheDocument();
  });

  it('does not skip a step that is listed as completed (a resumed draft)', async () => {
    useDevelopmentWizard.setState({
      completedSteps: ['configuration', 'identity_market', 'location', 'amenities_features'] as any,
      currentStepId: 'governance_finances' as any,
    });
    await renderEngine();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(store().currentStepId).toBe('amenities_features');
  });

  it('a repeated or stale next call for a step already left does nothing', () => {
    store().goWorkflowNext('configuration');
    store().goWorkflowNext('configuration');
    expect(store().currentStepId).toBe('identity_market');
  });

  it('a step shows the done tick only when visited and valid; visited-but-invalid shows attention', async () => {
    useDevelopmentWizard.setState({
      completedSteps: ['configuration', 'amenities_features'] as any,
      currentStepId: 'unit_types' as any,
    });
    await renderEngine();
    const item = (name: RegExp) => screen.getByRole('button', { name });
    // Amenities was marked visited but has no highlights: no tick.
    expect(item(/Amenities/).querySelector('[aria-label="Done"]')).toBeNull();
    expect(item(/Amenities/)).toHaveTextContent('Needs attention');
    // Never visited: plain.
    expect(item(/Monthly costs/).querySelector('[aria-label="Done"]')).toBeNull();
    expect(item(/Monthly costs/)).not.toHaveTextContent('Needs attention');
    // Basics visited and valid once the setting is answered.
    act(() => {
      store().saveWorkflowStepData('configuration', { setting: 'standalone' } as any);
      store().setIdentity({ highlights: ['A', 'B', 'C'] } as any);
      store().saveWorkflowStepData('marketing_summary', { keySellingPoints: ['A', 'B', 'C'] } as any);
    });
    await new Promise(r => setTimeout(r, 0));
    expect(item(/Amenities/).querySelector('[aria-label="Done"]')).not.toBeNull();
    expect(item(/Basics/).querySelector('[aria-label="Done"]')).not.toBeNull();
  });
});
