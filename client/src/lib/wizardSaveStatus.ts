/**
 * Honest save status for the development wizard header.
 *
 * "Saved" is only ever reported after a write has succeeded. Until then the
 * status is idle ("Not saved yet"), saving, or error.
 */

export type WizardSaveKind = 'idle' | 'saving' | 'saved' | 'error';

export interface WizardSaveStatus {
  kind: WizardSaveKind;
  text: string;
}

export function describeSaveStatus({
  isSaving,
  hasError,
  lastSavedAt,
  now = new Date(),
}: {
  isSaving: boolean;
  hasError: boolean;
  lastSavedAt: Date | null | undefined;
  now?: Date;
}): WizardSaveStatus {
  if (isSaving) return { kind: 'saving', text: 'Saving…' };
  if (hasError) return { kind: 'error', text: 'Couldn’t save — retry' };
  if (!lastSavedAt) return { kind: 'idle', text: 'Not saved yet' };

  const seconds = Math.max(0, Math.floor((now.getTime() - lastSavedAt.getTime()) / 1000));
  if (seconds < 60) return { kind: 'saved', text: 'Saved just now' };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return { kind: 'saved', text: `Saved ${minutes} min ago` };
  }
  const hours = Math.floor(minutes / 60);
  return { kind: 'saved', text: `Saved ${hours} hr ago` };
}

/**
 * True when the local wizard state holds something a publisher would be upset
 * to lose. Used to decide between a clean start and "Resume draft / Start new".
 */
export function hasMeaningfulDraft(state: {
  workflowId?: string | null;
  developmentData?: { name?: string | null } | null;
  unitTypes?: unknown[] | null;
  stepData?: Record<string, unknown> | null;
}): boolean {
  if (state.workflowId) return true;
  if (String(state.developmentData?.name ?? '').trim()) return true;
  if (Array.isArray(state.unitTypes) && state.unitTypes.length > 0) return true;
  return Boolean(state.stepData && Object.keys(state.stepData).length > 0);
}
