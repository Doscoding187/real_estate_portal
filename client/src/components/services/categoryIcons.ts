import {
  Camera,
  ClipboardCheck,
  Hammer,
  Scale,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceCategory } from '@/features/services/catalog';

/**
 * The canonical icon for each of the six Services categories.
 *
 * The six-category authority is fixed by the Services contract, so this map is
 * exhaustive by design: a new category cannot be added to the surface without
 * a category decision and an icon.
 */
export const SERVICE_CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  home_improvement: Hammer,
  moving: Truck,
  finance_legal: Scale,
  inspection_compliance: ClipboardCheck,
  insurance: ShieldCheck,
  media_marketing: Camera,
};
