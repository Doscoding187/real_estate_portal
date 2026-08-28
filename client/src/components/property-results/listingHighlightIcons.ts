import {
  Archive,
  BriefcaseBusiness,
  Building2,
  CircleParking,
  Droplets,
  Dumbbell,
  House,
  KeyRound,
  Leaf,
  Mountain,
  PanelTop,
  PanelsTopLeft,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Sun,
  Trees,
  UsersRound,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ListingHighlightIconKey } from '@shared/listing-highlight-registry';

/** The API transports stable semantic keys; the UI owns icon components. */
const LISTING_HIGHLIGHT_ICONS: Record<ListingHighlightIconKey, LucideIcon> = {
  access: KeyRound,
  balcony: PanelTop,
  building: Building2,
  family: UsersRound,
  fibre: Wifi,
  fitness: Dumbbell,
  garden: Trees,
  home: House,
  layout: PanelsTopLeft,
  light: Sun,
  parking: CircleParking,
  pet: PawPrint,
  pool: Waves,
  power: Zap,
  scenic: Mountain,
  security: ShieldCheck,
  sparkles: Sparkles,
  storage: Archive,
  study: BriefcaseBusiness,
  sustainability: Leaf,
  water: Droplets,
};

export function getListingHighlightIcon(iconKey: ListingHighlightIconKey): LucideIcon {
  return LISTING_HIGHLIGHT_ICONS[iconKey] || Sparkles;
}
