/**
 * Responsive Filter Panel Component
 * Automatically switches between desktop side panel and mobile bottom sheet
 * Requirements: 4.5, 4.6, 4.7
 */

import { useIsMobile } from '@/hooks/useMediaQuery';
import { FilterPanel } from './FilterPanel';
import { MobileFilterBottomSheet } from './MobileFilterBottomSheet';

interface ResponsiveFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: () => void;
}

export function ResponsiveFilterPanel({
  isOpen,
  onClose,
  onApply,
}: ResponsiveFilterPanelProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileFilterBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        onApply={onApply}
      />
    );
  }

  return (
    <FilterPanel
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
    />
  );
}
