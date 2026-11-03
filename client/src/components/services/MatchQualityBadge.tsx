/**
 * MatchQualityBadge — displays a labelled, colour-coded badge indicating how
 * well a provider matches a consumer's lead request.
 *
 * Colour is never the sole differentiator: the text label is always rendered
 * alongside the colour indicator (accessibility requirement).
 *
 * Requirements: 5.2
 */

export type MatchLabel = 'Strong match' | 'Good match' | 'Possible match';

/**
 * Maps a normalised match score (0–1) to a human-readable quality label.
 * Pure function exported for property-based testing.
 *
 * Thresholds:
 *   score >= 0.75  → 'Strong match'
 *   score >= 0.45  → 'Good match'
 *   score <  0.45  → 'Possible match'
 *
 * Requirements: 5.2
 */
export function getMatchLabel(score: number): MatchLabel {
  if (score >= 0.75) return 'Strong match';
  if (score >= 0.45) return 'Good match';
  return 'Possible match';
}

type MatchQualityBadgeProps = {
  /** Normalised match score in the range [0, 1]. */
  score: number;
};

const LABEL_STYLES: Record<MatchLabel, string> = {
  'Strong match': 'bg-green-100 text-green-800 border-green-200',
  'Good match': 'bg-amber-100 text-amber-800 border-amber-200',
  'Possible match': 'bg-slate-100 text-slate-700 border-slate-200',
};

const DOT_STYLES: Record<MatchLabel, string> = {
  'Strong match': 'bg-green-500',
  'Good match': 'bg-amber-500',
  'Possible match': 'bg-slate-400',
};

/**
 * Renders a small badge showing the match quality label and a colour dot.
 * The text label is always visible so colour is never the sole indicator.
 */
export function MatchQualityBadge({ score }: MatchQualityBadgeProps) {
  const label = getMatchLabel(score);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${LABEL_STYLES[label]}`}
      aria-label={label}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[label]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
