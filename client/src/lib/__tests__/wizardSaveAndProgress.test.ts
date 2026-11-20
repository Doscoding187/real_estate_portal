import { describe, expect, it } from 'vitest';
import { describeSaveStatus, hasMeaningfulDraft } from '../wizardSaveStatus';
import { computeWizardProgress } from '../wizardProgress';

describe('describeSaveStatus', () => {
  const now = new Date('2026-11-19T10:00:00Z');

  it('never says Saved before a write has succeeded', () => {
    const status = describeSaveStatus({ isSaving: false, hasError: false, lastSavedAt: null, now });
    expect(status.kind).toBe('idle');
    expect(status.text).toBe('Not saved yet');
    expect(status.text).not.toMatch(/^Saved/);
  });

  it('shows saving while a write is in flight, even if an older save exists', () => {
    const status = describeSaveStatus({
      isSaving: true,
      hasError: false,
      lastSavedAt: new Date('2026-11-19T09:59:00Z'),
      now,
    });
    expect(status).toEqual({ kind: 'saving', text: 'Saving…' });
  });

  it('reports a failed save with a retry prompt, not Saved', () => {
    const status = describeSaveStatus({
      isSaving: false,
      hasError: true,
      lastSavedAt: new Date('2026-11-19T09:59:30Z'),
      now,
    });
    expect(status.kind).toBe('error');
    expect(status.text).toContain('retry');
  });

  it('reports saved time honestly', () => {
    const base = { isSaving: false, hasError: false };
    expect(
      describeSaveStatus({ ...base, lastSavedAt: new Date('2026-11-19T09:59:55Z'), now }).text,
    ).toBe('Saved just now');
    expect(
      describeSaveStatus({ ...base, lastSavedAt: new Date('2026-11-19T09:55:00Z'), now }).text,
    ).toBe('Saved 5 min ago');
    expect(
      describeSaveStatus({ ...base, lastSavedAt: new Date('2026-11-19T07:00:00Z'), now }).text,
    ).toBe('Saved 3 hr ago');
  });
});

describe('hasMeaningfulDraft', () => {
  it('treats the empty initial store as empty', () => {
    expect(
      hasMeaningfulDraft({
        workflowId: null,
        developmentData: { name: '' },
        unitTypes: [],
        stepData: {},
      }),
    ).toBe(false);
  });

  it('treats any entered work as a draft worth keeping', () => {
    expect(hasMeaningfulDraft({ workflowId: 'residential_sale' })).toBe(true);
    expect(hasMeaningfulDraft({ developmentData: { name: 'Baltimore' } })).toBe(true);
    expect(hasMeaningfulDraft({ unitTypes: [{}] })).toBe(true);
    expect(hasMeaningfulDraft({ stepData: { location: {} } })).toBe(true);
  });
});

describe('computeWizardProgress', () => {
  const ids = ['configuration', 'identity_market', 'location'];

  it('counts the real visible steps (not currentPhase / 11) and has no separate setup stop', () => {
    expect(computeWizardProgress({ visibleStepIds: ids, currentStepId: 'configuration' })).toEqual({
      position: 1,
      total: 3,
      percent: 33,
    });
    expect(computeWizardProgress({ visibleStepIds: ids, currentStepId: 'location' })).toEqual({
      position: 3,
      total: 3,
      percent: 100,
    });
  });

  it('is 0 when the current step is unknown, such as a step an old draft used', () => {
    expect(computeWizardProgress({ visibleStepIds: ids, currentStepId: 'nope' }).percent).toBe(0);
    expect(computeWizardProgress({ visibleStepIds: ids, currentStepId: 'marketing_summary' })
      .position).toBe(0);
    expect(computeWizardProgress({ visibleStepIds: [], currentStepId: null }).percent).toBe(0);
  });
});
