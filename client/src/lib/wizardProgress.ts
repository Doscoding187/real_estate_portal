/**
 * Progress for the development wizard, counted from the real list of steps.
 *
 * Residential wizards have eight steps (Basics, About, Location, Monthly
 * costs, Amenities, Media, House types, Review & publish). Sale or rent is a
 * small choice inside Basics, so there is no separate setup screen to count.
 */

export interface WizardProgress {
  /** 1-based position of the current step, 0 when the position is unknown. */
  position: number;
  total: number;
  percent: number;
}

export function computeWizardProgress({
  visibleStepIds,
  currentStepId,
}: {
  visibleStepIds: readonly string[];
  currentStepId: string | null | undefined;
}): WizardProgress {
  const total = visibleStepIds.length;
  const index = currentStepId ? visibleStepIds.indexOf(currentStepId) : -1;
  const position = index === -1 ? 0 : index + 1;
  const percent = position <= 0 || total === 0 ? 0 : Math.min(100, Math.round((position / total) * 100));
  return { position, total, percent };
}
