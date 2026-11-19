/**
 * Turns the wizard state into what the live "What buyers will see" panel shows.
 * Pure and defensive: every field may be missing while the publisher is typing.
 */

import { COMMUNITY_TYPE_OPTIONS } from '@/types/wizardTypes';
import {
  buildTimelineLine,
  ownershipTagLabel,
  salesChoiceOf,
  settingTagLabel,
} from '@/lib/wizardBasicsAbout';

export interface PreviewUnit {
  name: string;
  beds: number | null;
  baths: number | null;
  size: number | null;
  priceFrom: number | null;
  available: number | null;
}

export interface DevelopmentPreviewModel {
  coverUrl: string | null;
  statusBadge: string | null;
  name: string;
  tagline: string;
  locationLabel: string;
  priceFrom: number | null;
  bedsRange: string | null;
  sizeRange: string | null;
  unitTypeCount: number;
  highlights: string[];
  moreHighlights: number;
  tags: string[];
  /** "For sale" / "To rent", from the start screen answer. */
  transactionLabel: string | null;
  /** Optional "Phase 2" badge. */
  phaseLabel: string;
  /** "First homes handed over from Mar 2027 · final completion Dec 2029", "Launching Mar 2027", or null. */
  timelineLine: string | null;
  unit: PreviewUnit | null;
}

const STATUS_LABELS: Record<string, string> = {
  'launching-soon': 'Launching soon',
  launching_soon: 'Launching soon',
  selling: 'Now selling',
  now_selling: 'Now selling',
  ready_to_move_in: 'Ready to move in',
  'sold-out': 'Sold out',
  sold_out: 'Sold out',
};

const SETTING_LABELS: Record<string, string> = {
  security_estate: 'Security estate',
};

export const PREVIEW_CARD_HIGHLIGHTS = 3;

const toNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const rangeText = (values: number[], unit = ''): string | null => {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min}${unit}` : `${min}–${max}${unit}`;
};

/** "R1,745,000": grouped with commas regardless of the browser locale. */
export function formatRand(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return `R${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

const asString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const mediaUrl = (item: unknown): string | null => {
  if (!item) return null;
  if (typeof item === 'string') return item || null;
  const url = (item as { url?: unknown }).url;
  return typeof url === 'string' && url ? url : null;
};

export function buildPreviewModel(
  data: Record<string, any> | null | undefined,
  unitTypesInput?: any[] | null,
): DevelopmentPreviewModel {
  const d = data ?? {};
  const unitTypes: any[] = Array.isArray(unitTypesInput)
    ? unitTypesInput
    : Array.isArray(d.unitTypes)
      ? d.unitTypes
      : [];

  const coverUrl =
    mediaUrl(d.media?.heroImage) ??
    mediaUrl(d.heroImage) ??
    mediaUrl(d.media?.photos?.find((p: any) => p?.isPrimary)) ??
    mediaUrl(d.media?.photos?.[0]);

  const prices = unitTypes.map(u => toNumber(u?.priceFrom)).filter((n): n is number => n != null);
  const beds = unitTypes.map(u => Number(u?.bedrooms)).filter(n => Number.isFinite(n) && n >= 0);
  const sizes = unitTypes.map(u => toNumber(u?.unitSize)).filter((n): n is number => n != null);

  const rawHighlights: unknown[] = Array.isArray(d.highlights) ? d.highlights : [];
  const highlights = rawHighlights.map(asString).filter(Boolean);

  const locationLabel =
    asString(d.location?.suburbLabel) ||
    asString(d.location?.suburb) ||
    asString(d.location?.city) ||
    asString(d.location?.address);

  const communityKey = asString(d.communityTypes?.[0]);
  const settingLabel =
    settingTagLabel(asString(d.setting), asString(d.estateType)) ??
    SETTING_LABELS[asString(d.setting)] ??
    COMMUNITY_TYPE_OPTIONS.find(option => option.value === communityKey)?.label;
  const ownershipKey = asString(d.ownershipTypes?.[0]) || asString(d.ownershipType);
  const tags = [settingLabel, ownershipTagLabel(ownershipKey)].filter((tag): tag is string =>
    Boolean(tag),
  );

  const choice = salesChoiceOf(d);
  const statusBadge =
    choice === 'off_plan' && d.salesStage === 'off_plan'
      ? 'Selling off-plan'
      : choice === 'ready'
        ? 'Ready to move in'
        : (STATUS_LABELS[asString(d.status)] ?? null);

  const firstUnit = unitTypes[0];
  const unit: PreviewUnit | null = firstUnit
    ? {
        name: asString(firstUnit.name) || 'House type',
        beds: Number.isFinite(Number(firstUnit.bedrooms)) ? Number(firstUnit.bedrooms) : null,
        baths: Number.isFinite(Number(firstUnit.bathrooms)) ? Number(firstUnit.bathrooms) : null,
        size: toNumber(firstUnit.unitSize),
        priceFrom: toNumber(firstUnit.priceFrom),
        available: Number.isFinite(Number(firstUnit.availableUnits))
          ? Number(firstUnit.availableUnits)
          : null,
      }
    : null;

  return {
    coverUrl,
    statusBadge,
    name: asString(d.name),
    tagline: asString(d.subtitle) || asString(d.tagline),
    locationLabel,
    priceFrom: prices.length ? Math.min(...prices) : null,
    bedsRange: rangeText(beds),
    sizeRange: rangeText(sizes, ' m²'),
    unitTypeCount: unitTypes.length,
    highlights: highlights.slice(0, PREVIEW_CARD_HIGHLIGHTS),
    moreHighlights: Math.max(0, highlights.length - PREVIEW_CARD_HIGHLIGHTS),
    tags,
    transactionLabel:
      d.transactionType === 'for_sale' || d.transactionType === 'sale'
        ? 'For sale'
        : d.transactionType === 'for_rent' || d.transactionType === 'rent'
          ? 'To rent'
          : null,
    phaseLabel: asString(d.phaseLabel),
    timelineLine: buildTimelineLine(d),
    unit,
  };
}
