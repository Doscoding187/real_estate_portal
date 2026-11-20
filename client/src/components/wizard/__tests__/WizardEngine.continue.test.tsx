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

  // A resumed draft (?draftId=...) has its workflow and answers but no root transactionType.
  const resumeDraftAt = (stepId: string, done: string[]) =>
    useDevelopmentWizard.setState({
      transactionType: null,
      currentStepId: stepId as any,
      completedSteps: done as any,
    });

  it('Continue on House types (step 7) opens Review & publish and keeps every tick', async () => {
    const done = SALE_STEPS.slice(0, 6);
    resumeDraftAt('unit_types', done);
    await renderEngine();
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(store().currentStepId).toBe('review_publish');
    expect(store().currentStepId).not.toBe('configuration');
    expect(store().workflowId).toBe('residential_sale');
    for (const id of done) expect(store().completedSteps).toContain(id);
    expect(store().completedSteps).toContain('unit_types');
  });

  it('walks a resumed sale draft from step 1 to Review & publish and never lands back on step 1', async () => {
    resumeDraftAt('configuration', []);
    await renderEngine();
    const seen: string[] = [store().currentStepId as string];
    for (let i = 0; i < SALE_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
      seen.push(store().currentStepId as string);
    }
    expect(seen).toEqual(SALE_STEPS);
    expect(store().completedSteps).toHaveLength(SALE_STEPS.length - 1);
    // A resumed draft that is already on Review keeps its place on later calls too.
    store().ensureResidentialWorkflow();
    expect(store().currentStepId).toBe('review_publish');
  });

  it('ensureResidentialWorkflow never restarts a running workflow, and fills in the missing answer', () => {
    useDevelopmentWizard.setState({
      transactionType: null,
      currentStepId: 'unit_types' as any,
      completedSteps: ['configuration', 'location'] as any,
    });
    store().ensureResidentialWorkflow();
    expect(store().currentStepId).toBe('unit_types');
    expect(store().completedSteps).toEqual(['configuration', 'location']);
    expect(store().transactionType).toBe('for_sale');
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
