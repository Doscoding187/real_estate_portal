/**
 * Progress for the development wizard, counted from the real list of steps.
 *
 * The shell lists "Project Setup" first, then the visible workflow steps, so a
 * residential sale wizard with 9 workflow steps has 10 stops in total.
 */

export interface WizardProgress {
  /** 1-based position of the current stop, 0 when the position is unknown. */
  position: number;
  total: number;
  percent: number;
}

export function computeWizardProgress({
  visibleStepIds,
  currentStepId,
  onProjectSetup,
}: {
  visibleStepIds: readonly string[];
  currentStepId: string | null | undefined;
  /** True while the Project Setup screen is showing. */
  onProjectSetup: boolean;
}): WizardProgress {
  const total = visibleStepIds.length + 1;
  let position = 0;
  if (onProjectSetup) {
    position = 1;
  } else if (currentStepId) {
    const index = visibleStepIds.indexOf(currentStepId);
    position = index === -1 ? 0 : index + 2;
  }
  const percent = position <= 0 ? 0 : Math.min(100, Math.round((position / total) * 100));
  return { position, total, percent };
}
