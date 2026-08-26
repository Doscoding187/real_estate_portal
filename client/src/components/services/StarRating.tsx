import { Star, StarHalf } from 'lucide-react';

export type StarRatingProps = {
  rating: number | null | undefined; // 0–5
  reviewCount?: number | null;
  size?: 'sm' | 'md';
  showCount?: boolean;
};

/**
 * Rounds a rating to the nearest half star.
 * Pure function exported for testing.
 * Requirements: 3.2
 */
export function roundToHalfStar(rating: number): number {
  return Math.round(rating * 2) / 2;
}

const SIZE_CLASS = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
} as const;

/**
 * Renders a 5-star visual rating.
 * When rating is null/0 and reviewCount is 0, renders "New" instead of stars.
 * Requirements: 3.2, 3.3
 */
export function StarRating({
  rating,
  reviewCount,
  size = 'md',
  showCount = false,
}: StarRatingProps) {
  const safeRating = rating ?? 0;
  const safeReviewCount = reviewCount ?? 0;

  // When rating is null/0 AND reviewCount is 0, render "New"
  if (!safeRating && safeReviewCount === 0) {
    return (
      <span className="text-sm font-medium text-slate-500" aria-label="New provider">
        New
      </span>
    );
  }

  const rounded = roundToHalfStar(safeRating);
  const floor = Math.floor(rounded);
  const hasHalf = rounded !== Math.floor(rounded);
  const iconClass = SIZE_CLASS[size];

  const stars = Array.from({ length: 5 }, (_, i) => {
    const position = i + 1; // 1-based position

    if (position <= floor) {
      // Full star
      return (
        <Star
          key={position}
          className={`${iconClass} text-amber-400 fill-amber-400`}
          aria-hidden="true"
        />
      );
    } else if (position === Math.ceil(rounded) && hasHalf) {
      // Half star
      return (
        <StarHalf
          key={position}
          className={`${iconClass} text-amber-400 fill-amber-400`}
          aria-hidden="true"
        />
      );
    } else {
      // Empty star
      return (
        <Star
          key={position}
          className={`${iconClass} text-gray-300`}
          aria-hidden="true"
        />
      );
    }
  });

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${safeRating} out of 5 stars`}
    >
      <div className="flex items-center">{stars}</div>
      {showCount && reviewCount != null && (
        <span className="text-sm text-slate-500">({reviewCount} reviews)</span>
      )}
    </div>
  );
}
