import { useState } from 'react';
import { Clock3, Edit, Eye, Home, MapPin, MoreHorizontal, Trash2 } from 'lucide-react';
import { PROPERTY_FACT_ICONS } from '@/components/icons/propertyFactIcons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReadinessIndicator } from '@/components/common/ReadinessIndicator';
import { withApiBase } from '@/lib/mediaUtils';
import { cn, formatCurrency } from '@/lib/utils';
import { LISTING_SUBMISSION_READINESS_THRESHOLD } from '@shared/listing-workflow-types';

export interface InventoryListing {
  id: number;
  listingId: number | null;
  title: string;
  action?: string | null;
  listingType?: string | null;
  address?: string | null;
  city?: string | null;
  suburb?: string | null;
  province?: string | null;
  price?: number | string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  houseAreaM2?: number | string | null;
  erfSizeM2?: number | string | null;
  primaryImage?: string | null;
  status?: string | null;
  approvalStatus?: string | null;
  enquiries?: number | null;
  rejectionReasons?: unknown;
  rejectionReason?: string | null;
  rejectionNote?: string | null;
  readiness: { score: number; missing: Record<string, string[]> };
}

const statuses: Record<string, { label: string; style: string }> = {
  pending: { label: 'Pending review', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  pending_review: { label: 'Pending review', style: 'bg-amber-50 text-amber-800 border-amber-200' },
  available: { label: 'Live', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  published: { label: 'Live', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  active: { label: 'Live', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  approved: { label: 'Approved · unpublished', style: 'bg-blue-50 text-blue-800 border-blue-200' },
  rejected: { label: 'Changes needed', style: 'bg-rose-50 text-rose-800 border-rose-200' },
};

function rejectionMessages(listing: InventoryListing): string[] {
  const value = listing.rejectionReasons ?? listing.rejectionReason;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    /* A plain-text reason is also supported by the existing review workflow. */
  }
  return [value];
}

export function AgentListingInventoryCard({
  listing,
  view,
  onEdit,
  onDelete,
  onView,
  editUnavailableLabel,
}: {
  listing: InventoryListing;
  view: 'list' | 'grid';
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  editUnavailableLabel?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const status = String(listing.status || 'draft').toLowerCase();
  const isPending = status === 'pending' || status === 'pending_review';
  const isRejected = status === 'rejected' || listing.approvalStatus === 'rejected';
  const isDraft = status === 'draft';
  const isLive = ['available', 'published', 'active'].includes(status);
  const badge = statuses[status] ?? {
    label:
      (
        { draft: 'Draft', sold: 'Sold', rented: 'Rented', archived: 'Archived' } as Record<
          string,
          string
        >
      )[status] ?? 'Status unavailable',
    style: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  const location = [
    ...new Set([listing.address, listing.suburb, listing.city].filter(Boolean)),
  ].join(', ');
  const image = withApiBase(listing.primaryImage);
  const price = Number(listing.price);
  const isRental = listing.action === 'rent' || listing.listingType === 'rent';
  const reasons = rejectionMessages(listing);
  const grid = view === 'grid';
  return (
    <article
      aria-label={listing.title || 'Untitled listing'}
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        grid ? 'flex flex-col' : 'p-3 sm:p-4',
      )}
    >
      <div
        className={cn(
          grid
            ? 'flex h-full flex-col'
            : 'flex flex-wrap items-center gap-3 xl:flex-nowrap xl:gap-4',
        )}
      >
        <div
          className={cn(
            'relative shrink-0 overflow-hidden bg-slate-100',
            grid ? 'h-40 w-full' : 'h-20 w-24 rounded-xl sm:h-24 sm:w-32',
          )}
        >
          {image && failedImage !== image ? (
            <img
              src={image}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setFailedImage(image)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
              <Home className="h-7 w-7" />
              <span className="text-xs">No photo</span>
            </div>
          )}
        </div>
        <div className={cn('min-w-0 flex-1', grid ? 'p-4 pb-3' : 'basis-40')}>
          <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-400">
            <Home className="h-3 w-3" />
            {listing.listingId == null
              ? `Property #${listing.id}`
              : `Listing #${listing.listingId}`}
          </div>
          <h2
            className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900"
            title={listing.title}
          >
            {listing.title || 'Untitled listing'}
          </h2>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1" title={location}>
              {location || 'Location not set'}
            </span>
          </p>
          <div
            className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600"
            aria-label="Property details"
          >
            {Number(listing.houseAreaM2) > 0 && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`Floor size ${listing.houseAreaM2} square metres`}
              >
                <PROPERTY_FACT_ICONS.residentialSize
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                {Number(listing.houseAreaM2).toLocaleString('en-ZA')} m² floor
              </span>
            )}
            {Number(listing.bedrooms) > 0 && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${listing.bedrooms} bedrooms`}
              >
                <PROPERTY_FACT_ICONS.bedrooms
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                {listing.bedrooms} {Number(listing.bedrooms) === 1 ? 'bed' : 'beds'}
              </span>
            )}
            {Number(listing.bathrooms) > 0 && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${listing.bathrooms} bathrooms`}
              >
                <PROPERTY_FACT_ICONS.bathrooms
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                {listing.bathrooms} {Number(listing.bathrooms) === 1 ? 'bath' : 'baths'}
              </span>
            )}
            {Number(listing.erfSizeM2) > 0 && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={`Erf or yard size ${listing.erfSizeM2} square metres`}
              >
                <PROPERTY_FACT_ICONS.landSize
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                {Number(listing.erfSizeM2).toLocaleString('en-ZA')} m² erf/yard
              </span>
            )}
          </div>
          {isDraft && (
            <div className="mt-2">
              <ReadinessIndicator
                score={listing.readiness.score}
                missing={listing.readiness.missing}
                variant="compact"
                size="sm"
              />
            </div>
          )}
          {!onEdit && editUnavailableLabel && (
            <p className="mt-2 text-xs text-slate-500">{editUnavailableLabel}</p>
          )}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-3',
            grid
              ? 'mt-auto px-4 pb-3'
              : 'flex-1 xl:w-40 xl:flex-none xl:flex-col xl:items-start xl:gap-2',
          )}
        >
          <p className="whitespace-nowrap text-base font-semibold text-slate-900">
            {Number.isFinite(price) && price > 0 ? formatCurrency(price) : 'Price not set'}
            {isRental && price > 0 && (
              <span className="ml-1 text-xs font-normal text-slate-500">/ month</span>
            )}
          </p>
          <div className="space-y-1">
            <Badge className={cn('border font-medium hover:bg-inherit', badge.style)}>
              {badge.label}
            </Badge>
            {isLive && typeof listing.enquiries === 'number' && (
              <p className="text-[11px] text-slate-500">
                {listing.enquiries} {listing.enquiries === 1 ? 'enquiry' : 'enquiries'}
              </p>
            )}
          </div>
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center gap-2',
            grid
              ? 'border-t border-slate-100 px-4 py-3'
              : 'w-full border-t border-slate-100 pt-3 sm:w-auto sm:border-0 sm:pt-0 xl:w-40',
          )}
        >
          <Button
            size="sm"
            variant={isDraft || isRejected ? 'default' : 'outline'}
            className="flex-1 gap-1.5 rounded-lg text-xs"
            disabled={!onEdit}
            onClick={onEdit}
            title={editUnavailableLabel}
          >
            <Edit className="h-3.5 w-3.5" />
            {isRejected
              ? 'Fix & resubmit'
              : isDraft
                ? listing.readiness.score >= LISTING_SUBMISSION_READINESS_THRESHOLD
                  ? 'Review & submit'
                  : 'Continue setup'
                : 'Edit listing'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label={`More actions for ${listing.title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onSelect={onView}>
                  <Eye className="h-4 w-4" />
                  View public listing
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled={!onDelete} onSelect={onDelete} variant="destructive">
                <Trash2 className="h-4 w-4" />
                Delete listing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isPending && grid && (
        <p className="flex items-center gap-1.5 border-t border-amber-100 bg-amber-50/50 px-4 py-2 text-[11px] text-amber-800">
          <Clock3 className="h-3.5 w-3.5" />
          Private until approved and published
        </p>
      )}
      {isRejected && (
        <div
          className={cn(
            'rounded-lg border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800',
            grid ? 'm-4 mt-0' : 'mt-3',
          )}
        >
          <p className="font-semibold">Admin feedback</p>
          {reasons.length > 0 && (
            <ul className="mt-1 list-inside list-disc space-y-1">
              {reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          )}
          {listing.rejectionNote && <p className="mt-1">{listing.rejectionNote}</p>}
        </div>
      )}
    </article>
  );
}
