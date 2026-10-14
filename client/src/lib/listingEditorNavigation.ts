const REVIEWABLE_STATUSES = new Set(['pending_review', 'approved', 'published', 'rejected']);

export function isReviewableListingEdit(isEditMode: boolean, status: string | null | undefined) {
  return isEditMode && REVIEWABLE_STATUSES.has(String(status));
}

// Review is a display surface. Publication still uses the full submission validators.
export function loadedListingNavigation(
  canAdvance: (step: number) => boolean,
  previewFirst: boolean,
) {
  const validSteps = Array.from({ length: 7 }, (_, index) => index + 1).filter(canAdvance);
  const firstUnfinished =
    Array.from({ length: 7 }, (_, index) => index + 1).find(step => !validSteps.includes(step)) ??
    8;
  return {
    currentStep: previewFirst ? 8 : firstUnfinished,
    completedSteps: previewFirst ? validSteps : validSteps.filter(step => step < firstUnfinished),
  };
}
