import { describe, expect, it } from 'vitest';
import { isReviewableListingEdit, loadedListingNavigation } from './listingEditorNavigation';
describe('loaded listing editor navigation', () => {
  it('opens submitted and completed listing edits at review', () => {
    for (const status of ['pending_review', 'approved', 'published', 'rejected'])
      expect(isReviewableListingEdit(true, status)).toBe(true);
    expect(loadedListingNavigation(() => true, true)).toEqual({
      currentStep: 8,
      completedSteps: [1, 2, 3, 4, 5, 6, 7],
    });
  });
  it('does not mark missing fields complete when opening their review', () => {
    const navigation = loadedListingNavigation(step => step !== 3 && step !== 6, true);
    expect(navigation.currentStep).toBe(8);
    expect(navigation.completedSteps).not.toContain(3);
    expect(navigation.completedSteps).not.toContain(6);
  });
  it('resumes a private draft at its first incomplete step', () => {
    expect(loadedListingNavigation(step => step !== 3, false)).toEqual({
      currentStep: 3,
      completedSteps: [1, 2],
    });
    expect(loadedListingNavigation(() => false, false)).toEqual({
      currentStep: 1,
      completedSteps: [],
    });
  });
  it('takes a fully filled private draft to Preview', () => {
    expect(loadedListingNavigation(() => true, false).currentStep).toBe(8);
  });
  it('does not grant free review navigation to new, draft or unknown routes', () => {
    expect(isReviewableListingEdit(false, 'published')).toBe(false);
    for (const status of ['draft', 'unknown', null, undefined])
      expect(isReviewableListingEdit(true, status)).toBe(false);
  });
});
