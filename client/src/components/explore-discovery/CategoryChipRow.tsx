import { motion } from 'framer-motion';
import { Compass, Hammer, Landmark, Building2, Drill, Home, MapPinned, PlayCircle } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import type { ExploreFocus } from '@/lib/exploreIntentSession';
import { exploreExperienceTokens } from '@/lib/animations/exploreExperienceTokens';

export type ExploreSeedFocus = ExploreFocus;

export interface CategoryChip {
  id: string;
  label: string;
  focus: ExploreSeedFocus;
  subFocus?: string;
}

interface CategoryChipRowProps {
  chips: CategoryChip[];
  onChipClick: (chip: CategoryChip) => void;
  onChipPrefetch?: (chip: CategoryChip) => void;
  selectedChipId?: string;
  className?: string;
}

const CHIP_ICONS: Record<string, typeof PlayCircle> = {
  walkthroughs: PlayCircle,
  investment_finance: Landmark,
  renovations: Hammer,
  interior_design: Home,
  architecture: Building2,
  construction: Drill,
  neighbourhoods: MapPinned,
  developments: Compass,
};

export function CategoryChipRow({
  chips,
  onChipClick,
  onChipPrefetch,
  selectedChipId,
  className = '',
}: CategoryChipRowProps) {
  return (
    <div className={`overflow-x-auto scrollbar-hide ${className}`}>
      <div className="flex min-w-max items-center gap-2 pb-2">
        {chips.map(chip => {
          const Icon = CHIP_ICONS[chip.id] || PlayCircle;
          const isActive = selectedChipId === chip.id;
          return (
            <motion.button
              key={chip.id}
              type="button"
              onClick={() => onChipClick(chip)}
              onMouseEnter={() => onChipPrefetch?.(chip)}
              onFocus={() => onChipPrefetch?.(chip)}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all"
              style={{
                borderColor: isActive
                  ? `${designTokens.colors.accent.primary}55`
                  : designTokens.colors.bg.tertiary,
                backgroundColor: isActive
                  ? `${designTokens.colors.accent.primary}16`
                  : designTokens.colors.bg.primary,
                color: isActive ? designTokens.colors.accent.primary : designTokens.colors.text.secondary,
                boxShadow: isActive ? designTokens.shadows.sm : 'none',
                transitionDuration: `${exploreExperienceTokens.durationsMs.hover}ms`,
                transitionTimingFunction: exploreExperienceTokens.easingCss.interactive,
              }}
              whileHover={exploreExperienceTokens.interactions.ctaHover}
              whileTap={exploreExperienceTokens.interactions.tap}
              transition={exploreExperienceTokens.transitions.hover}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{chip.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
