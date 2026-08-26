/**
 * CategoryTileGrid Component
 *
 * Renders all six SERVICE_CATEGORIES as selectable radio tiles.
 * Shared between LeadRequestFlow (step 1) and ProviderOnboardingWizard (step 1).
 *
 * Requirements: 1.1, 1.2, 4.1, 7.4, 14.5
 */

import { motion } from 'framer-motion';
import {
  Camera,
  ClipboardCheck,
  Hammer,
  Scale,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@/features/services/catalog';

/**
 * Maps icon name strings from ServiceCategoryMeta.icon to Lucide React components.
 * Avoids dynamic imports and keeps the bundle deterministic.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Hammer,
  Scale,
  Truck,
  ClipboardCheck,
  ShieldCheck,
  Camera,
};

export type CategoryTileGridProps = {
  selected: ServiceCategory | null;
  onSelect: (category: ServiceCategory) => void;
  /**
   * Fixed column count. When omitted, uses responsive layout:
   * 2 columns on mobile, 3 on tablet, 6 on desktop.
   */
  columns?: 2 | 3 | 6;
};

const FIXED_COLUMN_CLASSES: Record<2 | 3 | 6, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  6: 'grid-cols-6',
};

const RESPONSIVE_COLUMN_CLASS = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

/**
 * Renders all six service categories as selectable tiles with radio semantics.
 * Selected tile is highlighted with a ring. Tiles animate on hover via Framer Motion.
 */
export function CategoryTileGrid({ selected, onSelect, columns }: CategoryTileGridProps) {
  const gridClass = columns ? FIXED_COLUMN_CLASSES[columns] : RESPONSIVE_COLUMN_CLASS;

  return (
    <div
      role="radiogroup"
      aria-label="Select a service category"
      className={`grid gap-3 ${gridClass}`}
    >
      {SERVICE_CATEGORIES.map(category => {
        const Icon = ICON_MAP[category.icon] ?? Hammer;
        const isSelected = selected === category.value;

        return (
          <motion.div
            key={category.value}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={category.label}
              onClick={() => onSelect(category.value)}
              className={[
                'w-full flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center',
                'cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-accent',
              ].join(' ')}
            >
              <Icon
                className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <span
                className={`text-sm font-medium leading-tight ${isSelected ? 'text-primary' : 'text-foreground'}`}
              >
                {category.label}
              </span>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
