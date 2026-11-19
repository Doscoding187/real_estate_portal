import {
  Building,
  Building2,
  CalendarClock,
  Cctv,
  ClipboardCheck,
  Construction,
  Dumbbell,
  Fence,
  Flag,
  Footprints,
  Home,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  Leaf,
  type LucideIcon,
  MapPin,
  Mountain,
  PenLine,
  Rows3,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Tag,
  Baby,
  TreeDeciduous,
  Trees,
  Wallet,
  Waves,
  Wifi,
  Zap,
  DoorOpen,
  UserCheck,
  LayoutGrid,
  Hourglass,
} from 'lucide-react';

/**
 * Single mapping table from wizard concepts to lucide-react icons.
 * Unknown / custom labels always resolve to FALLBACK_ICON so a publisher's
 * own text never renders without an icon.
 */
export const FALLBACK_ICON: LucideIcon = Star;

/** Steps, keyed by workflow step id (and a few friendly aliases). */
export const STEP_ICONS: Record<string, LucideIcon> = {
  project_setup: Home,
  configuration: Building,
  identity_market: PenLine,
  location: MapPin,
  governance_finances: Wallet,
  amenities_features: Sparkles,
  marketing_summary: PenLine,
  media: ImageIcon,
  development_media: ImageIcon,
  unit_types: Rows3,
  review: Flag,
  review_publish: Flag,
};

/** Development setting (Standalone / Gated community / Security estate). */
export const SETTING_ICONS: Record<string, LucideIcon> = {
  standalone: Building2,
  gated: DoorOpen,
  estate: ShieldCheck,
};

/** Estate kinds. */
export const ESTATE_TYPE_ICONS: Record<string, LucideIcon> = {
  standard: ShieldCheck,
  lifestyle: Sparkles,
  golf: Flag,
  eco: Leaf,
  equestrian: Footprints,
  country: TreeDeciduous,
  nature: Trees,
  coastal: Waves,
  mountain: Mountain,
};

/** Sales statuses. */
export const STATUS_ICONS: Record<string, LucideIcon> = {
  launching_soon: CalendarClock,
  now_selling: Construction,
  ready_to_move_in: KeyRound,
  sold_out: Tag,
};

/** Ordered rules; first match wins. Patterns run on the lower-cased label. */
const AMENITY_RULES: Array<{ icon: LucideIcon; pattern: RegExp }> = [
  { icon: Fence, pattern: /fence|perimeter wall|boundary wall/ },
  { icon: Waves, pattern: /\bpools?\b|swimming/ },
  { icon: Landmark, pattern: /club[\s-]?house/ },
  { icon: LayoutGrid, pattern: /\bcourts?\b|tennis|squash|padel|basketball/ },
  { icon: Dumbbell, pattern: /\bgym\b|fitness|exercise/ },
  { icon: Footprints, pattern: /running|\btrack\b|jogging|walking|\btrails?\b/ },
  { icon: Baby, pattern: /\bplay|\bkids\b|children|cr[eè]che/ },
  { icon: TreeDeciduous, pattern: /\bparks?\b|garden|green\s?belt/ },
  { icon: Sun, pattern: /solar|photovoltaic/ },
  { icon: Zap, pattern: /backup|generator|inverter|\bpower\b/ },
  { icon: Wifi, pattern: /fib(re|er)|wi-?fi|internet/ },
  { icon: Cctv, pattern: /cctv|camera|surveillance/ },
  { icon: UserCheck, pattern: /guard|manned|patrol|24[\s-]?(hr|hour)/ },
  { icon: DoorOpen, pattern: /\bgate|access control|\bboom\b|entrance/ },
];

/** Icon for an amenity label. Unknown or custom labels get the fallback star. */
export function iconForAmenity(label: string | null | undefined): LucideIcon {
  const text = String(label ?? '')
    .trim()
    .toLowerCase();
  if (!text) return FALLBACK_ICON;
  for (const rule of AMENITY_RULES) {
    if (rule.pattern.test(text)) return rule.icon;
  }
  return FALLBACK_ICON;
}

export function iconForStep(stepId: string | null | undefined): LucideIcon {
  return (stepId && STEP_ICONS[stepId]) || ClipboardCheck;
}

export function iconForSetting(value: string | null | undefined): LucideIcon {
  return (value && SETTING_ICONS[value]) || FALLBACK_ICON;
}

export function iconForEstateType(value: string | null | undefined): LucideIcon {
  return (value && ESTATE_TYPE_ICONS[value]) || FALLBACK_ICON;
}

export function iconForStatus(value: string | null | undefined): LucideIcon {
  return (value && STATUS_ICONS[value]) || Hourglass;
}
