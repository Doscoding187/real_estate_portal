import React, { useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PropertyCardList from '@/components/PropertyCardList';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';
import { formatFullPropertyLocation } from '@/lib/propertyLocationDisplay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CheckCircle2,
  CircleCheck,
  Clock3,
  Eye,
  FileText,
  Image as ImageIcon,
  ImageOff,
  Info,
  MapPin,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getCompletedListingImages,
  getListingMediaType,
  getListingMediaUrl,
  getPrimaryListingImage,
} from '@shared/listing-media';
import { readCorePropertyInformation } from '@shared/core-property-information';

type ReviewMedia = Record<string, any>;

function formatCurrency(value: unknown, action?: string) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 'Price not set';

  return `R ${amount.toLocaleString('en-ZA')}${action === 'rent' ? ' / month' : ''}`;
}

function titleCase(value: unknown, fallback = 'Not provided') {
  const normalized = String(value || '').trim();
  if (!normalized) return fallback;

  return normalized
    .split(/[_-]/g)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function knownNumber(fact: any): number | undefined {
  if (fact?.status !== 'known') return undefined;
  const value = Number(fact.value);
  return Number.isFinite(value) ? value : undefined;
}

function knownArea(fact: any): number | undefined {
  if (fact?.status !== 'known') return undefined;
  const value = Number(fact.valueM2);
  return Number.isFinite(value) ? value : undefined;
}

function parsePrivateAddress(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, any>;

  try {
    return JSON.parse(String(value)) as Record<string, any>;
  } catch {
    return null;
  }
}

/**
 * Mirrors the public projection's location policy. The source address remains
 * visible only in the dedicated reviewer-only block below.
 */
function getLocationPresentation(listing: any) {
  const privateAddress = parsePrivateAddress(listing?.privateAddress);
  const areaLabel = [listing?.suburb, listing?.city, listing?.province]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
  const streetName = String(privateAddress?.streetName || '').trim();
  const streetNumber = String(privateAddress?.streetNumber || '').trim();
  const exactAddress = [[streetNumber, streetName].filter(Boolean).join(' '), areaLabel]
    .filter(Boolean)
    .join(', ');
  const approximateAddress = [streetName, areaLabel].filter(Boolean).join(', ');
  const isExact = listing?.publicLocationPrecision === 'exact';

  return {
    publicAddress:
      (isExact ? exactAddress : approximateAddress) || areaLabel || 'Location available',
    privateAddress: formatFullPropertyLocation({
      address: listing?.address,
      suburb: listing?.suburb,
      city: listing?.city,
      province: listing?.province,
    }),
    policyLabel: isExact ? 'Full address shown publicly' : 'Street-level location shown publicly',
  };
}

function getAgentPresentation(agent: any) {
  const name = String(
    agent?.displayName ||
      agent?.name ||
      [agent?.firstName, agent?.lastName].filter(Boolean).join(' ') ||
      '',
  ).trim();
  const image = [agent?.avatar, agent?.profileImage, agent?.profilePhoto, agent?.photoUrl].find(
    value => typeof value === 'string' && value.trim(),
  ) as string | undefined;

  return name ? { name, image } : undefined;
}

function stringLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String(item.label || item.name || item.value || '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

function mediaStatusLabel(media: ReviewMedia) {
  switch (media.processingStatus) {
    case 'pending':
      return 'Waiting to process';
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Needs attention';
    default:
      return 'Ready';
  }
}

function isReadyMedia(media: ReviewMedia) {
  return !media.processingStatus || media.processingStatus === 'completed';
}

function ReviewMediaGallery({ media, listingTitle }: { media: ReviewMedia[]; listingTitle: string }) {
  const photos = useMemo(
    () => media.filter(item => getListingMediaType(item) === 'image'),
    [media],
  );
  const primary = getPrimaryListingImage(photos);
  const [selectedId, setSelectedId] = useState<string | null>(
    primary?.id === undefined || primary?.id === null ? null : String(primary.id),
  );
  const selected =
    photos.find(item => String(item.id) === selectedId) || primary || photos[0] || null;
  const selectedUrl = selected ? getListingMediaUrl(selected) : null;
  const readyPhotos = photos.filter(isReadyMedia).length;

  return (
    <section
      data-testid="admin-review-media-gallery"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-base font-bold text-slate-950">Photo review</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Review every uploaded image at full size before publishing the buyer card.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            photos.length > 0 && readyPhotos === photos.length
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-800'
          }`}
        >
          {readyPhotos} of {photos.length} ready
        </span>
      </div>

      {photos.length === 0 ? (
        <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
          <ImageOff className="h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-800">No photos were uploaded</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            There is no buyer-facing image to review or publish for this listing.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-xl bg-slate-100">
            {selectedUrl ? (
              <img
                src={selectedUrl}
                alt={`${listingTitle} – photo ${Math.max(1, photos.indexOf(selected) + 1)}`}
                className="aspect-[16/10] w-full object-contain"
              />
            ) : (
              <div className="flex aspect-[16/10] flex-col items-center justify-center px-6 text-center">
                <ImageOff className="h-9 w-9 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">This image cannot be displayed</p>
                <p className="mt-1 text-xs text-slate-500">
                  The uploaded media has no available delivery URL.
                </p>
              </div>
            )}
            {selected?.isPrimary ? (
              <span className="absolute left-3 top-3 rounded-full bg-slate-950/85 px-2.5 py-1 text-xs font-semibold text-white">
                Main card image
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">All uploaded photos</p>
            <p className="text-xs text-slate-500">
              {photos.length} photo{photos.length === 1 ? '' : 's'} · select to inspect
            </p>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {photos.map((photo, index) => {
              const id = String(photo.id ?? index);
              const photoUrl =
                (typeof photo.thumbnail === 'string' && photo.thumbnail) ||
                (typeof photo.thumbnailUrl === 'string' && photo.thumbnailUrl) ||
                getListingMediaUrl(photo);
              const isSelected = selected && String(selected.id) === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                    isSelected ? 'border-[var(--primary)]' : 'border-transparent hover:border-slate-300'
                  }`}
                  aria-label={`Review photo ${index + 1}${photo.isPrimary ? ', main card image' : ''}`}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-4 w-4 text-slate-400" />
                    </span>
                  )}
                  {photo.isPrimary ? (
                    <span className="absolute left-1 top-1 rounded bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      MAIN
                    </span>
                  ) : null}
                  <span
                    className={`absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      isReadyMedia(photo)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-400 text-amber-950'
                    }`}
                  >
                    {mediaStatusLabel(photo)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function ReviewWorkspace({ data }: { data: any }) {
  const listing = data?.property;
  const media = (Array.isArray(data?.media) ? data.media : data?.images || []) as ReviewMedia[];
  const location = getLocationPresentation(listing);
  const completedImages = getCompletedListingImages(media);
  const primaryImage = getPrimaryListingImage(media);
  const primaryImageUrl = getListingMediaUrl(primaryImage || {}) || PROPERTY_IMAGE_FALLBACK;
  const imageCount = media.filter(item => getListingMediaType(item) === 'image').length;
  const videoCount = media.filter(item => getListingMediaType(item) === 'video').length;
  const core = readCorePropertyInformation(listing?.propertyType, listing?.propertyDetails);
  const bedrooms = knownNumber(core.bedrooms);
  const bathrooms = knownNumber(core.bathrooms);
  const internalArea = knownArea(core.internalArea);
  const erfArea = knownArea(core.erfArea);
  const agent = getAgentPresentation(data?.agent);
  const details = listing?.propertyDetails || {};
  const badges = stringLabels(details.badges || listing?.badges);
  const highlights = stringLabels(
    details.propertyHighlights || details.amenities || listing?.propertyHighlights || listing?.amenities,
  );
  const hasPrice = Number(listing?.price) > 0;
  const allImagesReady = imageCount > 0 && completedImages.length === imageCount;
  const publicFactsComplete =
    bedrooms !== undefined && bathrooms !== undefined && internalArea !== undefined;
  const checks = [
    {
      label: 'Buyer card can render',
      detail: primaryImage ? 'A completed main image is selected for the card.' : 'No completed main image is available.',
      passed: Boolean(primaryImage && listing?.title && hasPrice),
    },
    {
      label: 'Photo gallery is complete',
      detail:
        imageCount > 0
          ? `${completedImages.length} of ${imageCount} uploaded photos are ready for publication.`
          : 'No uploaded photos are available.',
      passed: allImagesReady,
    },
    {
      label: 'Public location is clear',
      detail: `${location.policyLabel}: ${location.publicAddress}`,
      passed: location.publicAddress !== 'Location available',
    },
    {
      label: 'Core property facts are present',
      detail: publicFactsComplete
        ? 'Bedrooms, bathrooms and internal area will be shown accurately.'
        : 'One or more key buyer facts are missing or marked unknown.',
      passed: publicFactsComplete,
    },
    {
      label: 'Description is supplied',
      detail: listing?.description
        ? `${String(listing.description).trim().length} characters supplied.`
        : 'No buyer description was supplied.',
      passed: Boolean(String(listing?.description || '').trim()),
    },
  ];

  if (!listing) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ImageOff className="mx-auto h-9 w-9 text-slate-300" />
        <h1 className="mt-3 text-lg font-bold text-slate-900">Listing not available</h1>
        <p className="mt-2 text-sm text-slate-500">This private review record could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[var(--primary)]" />
              <h1 className="text-base font-bold text-slate-950">Buyer-facing search card</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              This is the shared card component buyers will see once this listing is published.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
            <Eye className="h-3.5 w-3.5" /> Public presentation
          </span>
        </div>
        <div className="bg-slate-50 px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-[840px]">
            <PropertyCardList
              interactionMode="static"
              id={String(listing.id)}
              title={listing.title || 'Untitled property'}
              price={Number(listing.price) || 0}
              location={location.publicAddress}
              image={primaryImageUrl}
              description={listing.description || undefined}
              bedrooms={bedrooms}
              bathrooms={bathrooms}
              area={internalArea}
              yardSize={erfArea}
              propertyType={titleCase(listing.propertyType, 'Property')}
              listingType={listing.action || listing.listingType}
              agent={agent}
              badges={badges}
              imageCount={imageCount}
              videoCount={videoCount}
              highlights={highlights}
            />
          </div>
          <p className="mx-auto mt-3 max-w-[840px] text-xs text-slate-500">
            Public location setting: <span className="font-medium text-slate-700">{location.policyLabel}</span>
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <ReviewMediaGallery media={media} listingTitle={listing.title || 'Listing'} />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="text-base font-bold text-slate-950">Buyer copy</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              This is the full description behind the shortened card preview above.
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {listing.description || 'No description provided.'}
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="text-base font-bold text-slate-950">Listing facts</h2>
            </div>
            <dl className="mt-3">
              <DetailRow label="Listing ID" value={`#${listing.id}`} />
              <DetailRow label="Offer" value={titleCase(listing.action || listing.listingType)} />
              <DetailRow label="Property type" value={titleCase(listing.propertyType)} />
              <DetailRow label="Price" value={formatCurrency(listing.price, listing.action)} />
              <DetailRow label="Bedrooms" value={bedrooms ?? 'Unknown'} />
              <DetailRow label="Bathrooms" value={bathrooms ?? 'Unknown'} />
              <DetailRow label="Internal area" value={internalArea ? `${internalArea} m²` : 'Unknown'} />
              {erfArea ? <DetailRow label="Erf / yard area" value={`${erfArea} m²`} /> : null}
              <DetailRow label="Agent" value={agent?.name || 'Not assigned'} />
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="text-base font-bold text-slate-950">Location review</h2>
            </div>
            <div className="mt-4 rounded-xl bg-sky-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Buyers will see</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{location.publicAddress}</p>
              <p className="mt-1 text-xs text-slate-600">{location.policyLabel}</p>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Private review address</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{location.privateAddress}</p>
              <p className="mt-1 text-xs text-slate-500">
                Visible to reviewers only; never copied into the public card by this screen.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
              <h2 className="text-base font-bold text-slate-950">Publication checks</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              A quick integrity check. Use the card and full gallery above for the visual decision.
            </p>
            <ul className="mt-3 space-y-3">
              {checks.map(check => (
                <li key={check.label} className="flex gap-2.5">
                  {check.passed ? (
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{check.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function formatStatus(value: unknown) {
  return String(value || 'loading')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export default function AdminPropertyReview() {
  const [, params] = useRoute('/admin/review/:id');
  const [, setLocation] = useLocation();
  const propertyId = params?.id ? parseInt(params.id) : 0;
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [hasConfirmedReview, setHasConfirmedReview] = useState(false);

  const { data: propertyData, isLoading, refetch } = trpc.listing.getById.useQuery(
    { id: propertyId },
    { enabled: propertyId > 0 },
  );

  const approveMutation = trpc.listing.approve.useMutation({
    onSuccess: () => {
      toast.success('Property approved and published successfully');
      setIsApproveDialogOpen(false);
      refetch();
      setTimeout(() => setLocation('/admin/listing-approvals'), 1500);
    },
    onError: error => {
      toast.error(error.message || 'Failed to approve property');
    },
  });

  const rejectMutation = trpc.listing.reject.useMutation({
    onSuccess: () => {
      toast.success('Property rejected and feedback sent');
      setIsRejectDialogOpen(false);
      refetch();
      setTimeout(() => setLocation('/admin/listing-approvals'), 1500);
    },
    onError: error => {
      toast.error(error.message || 'Failed to reject property');
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({ listingId: propertyId, notes: approvalNotes });
  };

  const handleReject = () => {
    if (!rejectionFeedback.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ listingId: propertyId, reason: rejectionFeedback });
  };

  if (!propertyId) return <div>Invalid Property ID</div>;

  const listing = propertyData?.property;
  const status = String(listing?.status || 'loading');
  const canMakeDecision = status === 'pending_review';
  const media = (Array.isArray(propertyData?.media) ? propertyData.media : propertyData?.images || []) as ReviewMedia[];
  const photoCount = media.filter(item => getListingMediaType(item) === 'image').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-white shadow-sm">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => setLocation('/admin/listing-approvals')}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to queue</span>
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">Listing review</p>
              <p className="truncate text-xs text-slate-400">
                Inspect buyer presentation, media and private source details.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
              status === 'pending_review'
                ? 'bg-amber-400 text-amber-950'
                : status === 'published' || status === 'approved'
                  ? 'bg-emerald-400 text-emerald-950'
                  : status === 'rejected'
                    ? 'bg-red-400 text-red-950'
                    : 'bg-slate-700 text-slate-100'
            }`}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {formatStatus(status)}
          </span>
        </div>
      </header>

      <main className="px-4 py-6 lg:px-8 lg:py-8">
        {isLoading ? (
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading complete listing review…
          </div>
        ) : (
          <ReviewWorkspace data={propertyData} />
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              {photoCount} uploaded photo{photoCount === 1 ? '' : 's'} available to review in this workspace.
              {!canMakeDecision ? ` This listing is ${formatStatus(status).toLowerCase()}.` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Dialog open={isRejectDialogOpen} onOpenChange={open => setIsRejectDialogOpen(open)}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex-1 sm:flex-none" disabled={!canMakeDecision}>
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Return listing to the agent</DialogTitle>
                  <DialogDescription>
                    Explain what needs to change. Your feedback is sent directly to the agent.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                  <label className="mb-2 block text-sm font-medium">Required feedback</label>
                  <Textarea
                    placeholder="For example: Replace the first photo, which does not show the property clearly."
                    className="min-h-[120px]"
                    value={rejectionFeedback}
                    onChange={event => setRejectionFeedback(event.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending ? 'Returning…' : 'Return for changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isApproveDialogOpen}
              onOpenChange={open => {
                setIsApproveDialogOpen(open);
                if (!open) setHasConfirmedReview(false);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none"
                  disabled={!canMakeDecision}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & publish
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Approve this listing for publication</DialogTitle>
                  <DialogDescription>
                    Approval creates the public listing projection using the card, location policy and selected media you just reviewed.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={hasConfirmedReview}
                      onChange={event => setHasConfirmedReview(event.target.checked)}
                    />
                    <span>
                      I have reviewed the buyer card, every uploaded photo, the public location treatment and the listing facts.
                    </span>
                  </label>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Internal notes (optional)</label>
                    <Textarea
                      placeholder="Any internal context about this approval…"
                      value={approvalNotes}
                      onChange={event => setApprovalNotes(event.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={handleApprove}
                    disabled={!hasConfirmedReview || approveMutation.isPending}
                  >
                    {approveMutation.isPending ? 'Publishing…' : 'Confirm approval'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
