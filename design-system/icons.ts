// Lucide icon size & stroke mapping utilities
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

export const iconSizes: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export const iconStrokeWidth = 1.75;

export function iconProps(size: IconSize = 'md') {
  return { size: iconSizes[size], strokeWidth: iconStrokeWidth };
}
