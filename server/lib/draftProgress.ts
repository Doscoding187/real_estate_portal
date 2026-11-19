/**
 * Progress percentage stored on a development draft.
 *
 * The wizard computes `progressPercent` from its real step list. Older clients
 * only send `currentPhase`, so the legacy estimate is kept as a fallback.
 */
const LEGACY_PHASE_COUNT = 11;

export function draftProgressPercent(rawDraftData: unknown, sanitizedDraftData: unknown): number {
  const raw = (rawDraftData ?? {}) as Record<string, unknown>;
  const reported = Number(raw.progressPercent);
  if (raw.progressPercent !== undefined && raw.progressPercent !== null && Number.isFinite(reported)) {
    return Math.min(100, Math.max(0, Math.round(reported)));
  }
  const sanitized = (sanitizedDraftData ?? {}) as Record<string, unknown>;
  const currentStep = Math.max(0, Number(sanitized.currentPhase ?? 0) || 0);
  return Math.min(100, Math.max(0, Math.round((currentStep / LEGACY_PHASE_COUNT) * 100)));
}
