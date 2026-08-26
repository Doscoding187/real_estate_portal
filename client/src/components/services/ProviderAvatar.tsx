import { useState } from 'react';

export type ProviderAvatarProps = {
  companyName: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg'; // 32px / 48px / 80px
};

/**
 * Derives initials from a company name.
 * - Single word: first 2 characters uppercased
 * - Multiple words: first character of first two words, uppercased
 * Pure function exported for testing.
 * Requirements: 3.1, 6.1
 */
export function getInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(w => w.length > 0);
  
  // Filter to only alphabetic characters
  const alphaWords = words.map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 0);
  
  // If no alphabetic characters, return default fallback
  if (alphaWords.length === 0) {
    return 'XX'; // Ultimate fallback for non-alphabetic names
  }
  
  if (alphaWords.length === 1) return alphaWords[0].slice(0, 2).toUpperCase();
  return (alphaWords[0][0] + alphaWords[1][0]).toUpperCase();
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
} as const;

/**
 * Displays a provider's logo image, falling back to initials when no logo is
 * available or when the image fails to load.
 * Requirements: 3.1, 6.1
 */
export function ProviderAvatar({
  companyName,
  logoUrl,
  size = 'md',
}: ProviderAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const initials = getInitials(companyName);

  const showImage = logoUrl && !imgError;

  if (showImage) {
    return (
      <img
        src={logoUrl}
        alt={`${companyName} logo`}
        className={`${sizeClass} rounded-full object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold select-none`}
      aria-label={`${companyName} avatar`}
    >
      {initials}
    </div>
  );
}
