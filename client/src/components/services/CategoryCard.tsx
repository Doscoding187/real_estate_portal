/**
 * CategoryCard Component
 *
 * Renders a single service category as a clickable card with an icon,
 * bold label, and muted subtitle. Uses Framer Motion for a subtle hover
 * scale animation.
 *
 * Requirements: 1.2, 1.3
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
import type { ServiceCategory, ServiceCategoryMeta } from '@/features/services/catalog';

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

export type CategoryCardProps = {
  category: ServiceCategoryMeta;
  onClick: (value: ServiceCategory) => void;
};

/**
 * Renders a category card with icon, bold label, and muted subtitle.
 * Applies a subtle hover scale via Framer Motion.
 */
export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const Icon = ICON_MAP[category.icon] ?? Hammer;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <button
        type="button"
        aria-label={category.label}
        onClick={() => onClick(category.value)}
        className={[
          'w-full flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-5 text-center',
          'cursor-pointer transition-colors duration-150',
          'hover:border-primary/50 hover:bg-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold leading-tight text-foreground">{category.label}</span>
        <span className="text-xs leading-snug text-muted-foreground">{category.subtitle}</span>
      </button>
    </motion.div>
  );
}
