import { useMemo, useState } from 'react';
import {
  Bath,
  Bed,
  Car,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Maximize,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import { formatPriceCompact } from '@/lib/formatPrice';
import { resolveMediaUrl } from '@/lib/mediaUtils';

type UnitFloorPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developmentName: string;
  unit: any | null;
  onRequestInformation: (unit: any) => void;
  onRequestCallback: (unit: any) => void;
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatBathValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatSizeValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatParkingLabel = (parkingType: unknown, parkingBays: unknown): string | null => {
  const bays = parseNumber(parkingBays);
  const normalizedType = String(parkingType || '')
    .replace(/_/g, ' ')
    .trim();

  if (normalizedType && bays && bays > 0) return `${normalizedType} x${bays}`;
  if (normalizedType) return normalizedType;
  if (bays && bays > 0) return `${bays} bay${bays === 1 ? '' : 's'}`;
  return null;
};

const resolveDocumentUrl = (item: unknown): string | null => {
  if (!item || typeof item !== 'object') return null;
  const doc = item as { url?: string; href?: string; src?: string; key?: string };
  const candidate = doc.url ?? doc.href ?? doc.src ?? doc.key ?? null;
  return typeof candidate === 'string' && candidate.trim() ? resolveMediaUrl(candidate) : null;
};

const isImageAsset = (url: string) => /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(url);

const toTitle = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const getFloorPlanUrl = (unit: any): string | null => {
  const floorPlans = Array.isArray(unit?.baseMedia?.floorPlans) ? unit.baseMedia.floorPlans : [];
  for (const item of floorPlans) {
    const url = resolveDocumentUrl(item);
    if (url) return url;
  }
  return null;
};

const getGalleryUrls = (unit: any): string[] => {
  const gallery = Array.isArray(unit?.baseMedia?.gallery) ? unit.baseMedia.gallery : [];
  const urls = gallery
    .map(resolveDocumentUrl)
    .filter((url): url is string => Boolean(url && url.trim()));

  if (typeof unit?.normalizedImage === 'string' && unit.normalizedImage.trim()) {
    const primary = resolveMediaUrl(unit.normalizedImage);
    return Array.from(new Set([primary, ...urls]));
  }

  return Array.from(new Set(urls));
};

const getAmenityChips = (unit: any): string[] => {
  const amenities = unit?.amenities;
  const standard = Array.isArray(amenities?.standard) ? amenities.standard : [];
  const additional = Array.isArray(amenities?.additional) ? amenities.additional : [];
  const builtInFeatures = Object.entries(unit?.specifications?.builtInFeatures || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([feature]) => toTitle(feature));

  return Array.from(
    new Set(
      [...standard, ...additional, ...builtInFeatures]
        .map(item => String(item || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
};

const renderFloorPlanPreview = (floorPlanUrl: string, unitName: string) => {
  if (isImageAsset(floorPlanUrl)) {
    return (
      <img
        src={floorPlanUrl}
        alt={`${unitName} floor plan`}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <iframe
      src={floorPlanUrl}
      title={`${unitName} floor plan`}
      className="h-full w-full bg-white"
    />
  );
};

export function UnitFloorPlanDialog({
  open,
  onOpenChange,
  developmentName,
  unit,
  onRequestInformation,
  onRequestCallback,
}: UnitFloorPlanDialogProps) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  const floorPlanUrl = unit ? getFloorPlanUrl(unit) : null;
  const galleryUrls = useMemo(() => (unit ? getGalleryUrls(unit) : []), [unit]);
  const amenityChips = useMemo(() => (unit ? getAmenityChips(unit) : []), [unit]);

  const unitPriceFrom = parseNumber(unit?.basePriceFrom) ?? 0;
  const unitPriceTo = parseNumber(unit?.basePriceTo);
  const houseSizeLabel = formatSizeValue(unit?.floorSize ?? unit?.unitSize);
  const yardSizeLabel = formatSizeValue(unit?.landSize ?? unit?.yardSize);
  const parkingLabel = formatParkingLabel(unit?.parkingType, unit?.parkingBays);
  const description =
    String(unit?.configDescription || unit?.description || '').trim() ||
    `View the ${unit?.name || 'unit'} layout, finishes, and configuration for ${developmentName}.`;

  const exactPriceFrom = unitPriceFrom > 0 ? formatPriceCompact(unitPriceFrom) : 'Price on request';
  const exactPriceTo =
    unitPriceTo !== null && unitPriceTo > unitPriceFrom ? formatPriceCompact(unitPriceTo) : null;
  const hasGallery = galleryUrls.length > 0;
  const galleryImage = hasGallery
    ? galleryUrls[Math.min(activeGalleryIndex, galleryUrls.length - 1)]
    : null;

  if (!unit) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) setActiveGalleryIndex(0);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
        <div className="max-h-[88vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-blue-200 text-blue-700">
                {developmentName}
              </Badge>
              {unit?.normalizedType ? (
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  {unit.normalizedType}
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="mt-2 text-2xl font-bold text-slate-950">
              {unit.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Review the floor plan, unit particulars, and gallery before requesting more
              information or a callback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 px-6 py-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Floor Plan
                  </p>
                  <p className="text-sm text-slate-600">Primary layout for {unit.name}</p>
                </div>
                {floorPlanUrl ? (
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => window.open(floorPlanUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                ) : null}
              </div>

              <div className="aspect-[16/9] bg-white">
                {floorPlanUrl ? (
                  renderFloorPlanPreview(floorPlanUrl, unit.name)
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                    <div>
                      <p className="font-medium text-slate-700">Floor plan unavailable</p>
                      <p className="text-sm text-slate-500">
                        Request information to get the latest layout pack from sales.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Unit Snapshot
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <h3 className="text-3xl font-bold text-slate-950">{exactPriceFrom}</h3>
                    {exactPriceTo ? (
                      <p className="pb-1 text-sm text-slate-500">up to {exactPriceTo}</p>
                    ) : null}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <HouseMeasureIcon className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                        Unit Size
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {houseSizeLabel ? `${houseSizeLabel} m2` : '-'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Bed className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                        Bedrooms
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {unit?.bedroomKey === 'other'
                        ? 'Studio / Other'
                        : `${unit?.bedrooms ?? unit?.bedroomLabel ?? '-'}`}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Bath className="h-4 w-4" />
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                        Bathrooms
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {formatBathValue(unit?.bathrooms) ?? '-'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      {yardSizeLabel ? (
                        <Maximize className="h-4 w-4" />
                      ) : (
                        <Car className="h-4 w-4" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                        {yardSizeLabel ? 'Yard Size' : 'Parking'}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {yardSizeLabel ? `${yardSizeLabel} m2` : parkingLabel || '-'}
                    </p>
                  </div>
                </div>

                {amenityChips.length > 0 ? (
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      What This Unit Includes
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {amenityChips.map(chip => (
                        <Badge
                          key={chip}
                          variant="secondary"
                          className="rounded-full bg-slate-100 px-3 py-1 text-slate-700"
                        >
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">
                  Ready To Enquire
                </p>
                <h3 className="mt-2 text-2xl font-bold">Move this unit conversation forward</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Use the buttons below to capture the lead and route the enquiry to the correct
                  sales team with the right unit context.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                    onClick={() => onRequestInformation(unit)}
                  >
                    Request Information
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => onRequestCallback(unit)}
                  >
                    Request Callback
                  </Button>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                  <p className="font-semibold text-white">What happens next</p>
                  <p className="mt-2">
                    Your request is stored against this development so sales can respond with the
                    right pricing, specs, and next steps.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Unit Gallery
                  </p>
                  <p className="text-sm text-slate-600">
                    View the unit imagery that supports this floor plan.
                  </p>
                </div>
                {hasGallery && galleryUrls.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() =>
                        setActiveGalleryIndex(index =>
                          index === 0 ? galleryUrls.length - 1 : index - 1,
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onClick={() =>
                        setActiveGalleryIndex(index =>
                          index === galleryUrls.length - 1 ? 0 : index + 1,
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
              </div>

              {galleryImage ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="aspect-[16/9] bg-slate-100">
                    <img
                      src={galleryImage}
                      alt={`${unit.name} gallery image ${activeGalleryIndex + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {galleryUrls.length > 1 ? (
                    <div className="grid grid-cols-4 gap-3 border-t border-slate-200 bg-white p-3 md:grid-cols-6">
                      {galleryUrls.map((url, index) => (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          className={`overflow-hidden rounded-xl border transition ${
                            index === activeGalleryIndex
                              ? 'border-blue-500 ring-2 ring-blue-100'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => setActiveGalleryIndex(index)}
                        >
                          <img
                            src={url}
                            alt={`${unit.name} thumbnail ${index + 1}`}
                            className="aspect-[4/3] h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                  Unit gallery images will appear here once media has been uploaded for this unit.
                </div>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
