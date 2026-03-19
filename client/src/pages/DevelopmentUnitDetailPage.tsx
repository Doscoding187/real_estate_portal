import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
  Mail,
  MapPinned,
  Phone,
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import { DevelopmentLeadDialog } from '@/components/development/DevelopmentLeadDialog';
import { MetaControl } from '@/components/seo/MetaControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  calculateMonthlyRepayment,
  formatSARandShort,
  SA_PRIME_RATE,
} from '@/lib/bond-calculator';
import { trackCTAClick, trackFunnelStep } from '@/lib/analytics/advertiseTracking';
import { resolveMediaUrl } from '@/lib/mediaUtils';
import { trpc } from '@/lib/trpc';

const DEFAULT_BOND_TERM_YEARS = 20;
const QUICK_QUALIFICATION_PAYMENT_RATIO = 3;

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatLabel = (value?: string | null) =>
  value
    ? value
        .replace(/[-_]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '-';

const formatSizeValue = (value: unknown) => {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatBathValue = (value: unknown) => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatExactRand = (value: unknown) => {
  const parsed = parseNumber(value);
  if (parsed === null || parsed <= 0) return null;
  return `R ${Math.round(parsed).toLocaleString('en-ZA')}`;
};

const formatParkingLabel = (parkingType: unknown, parkingBays: unknown) => {
  const bays = parseNumber(parkingBays);
  const normalizedType = String(parkingType || '')
    .replace(/[_-]/g, ' ')
    .trim();

  if (normalizedType && normalizedType !== 'none' && bays && bays > 0) {
    return `${formatLabel(normalizedType)} x${bays}`;
  }
  if (normalizedType && normalizedType !== 'none') return formatLabel(normalizedType);
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

const inferOwnership = (structuralType: string, defaultType?: string) => {
  if (defaultType) return defaultType;
  return /house|duplex|simplex|townhouse|freestanding|cluster/.test(
    (structuralType || '').toLowerCase(),
  )
    ? 'Freehold'
    : 'Sectional Title';
};

const toUnitRouteKey = (unit: any): string => {
  const directId = unit?.id ?? unit?.unitTypeId ?? unit?.unitId;
  if (directId !== null && directId !== undefined && `${directId}`.trim() !== '') {
    return `${directId}`;
  }
  return String(unit?.name || unit?.type || unit?.structuralType || 'unit')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getPrimaryUnitImage = (unit: any, devHero?: string) => {
  const gallery = Array.isArray(unit?.baseMedia?.gallery) ? unit.baseMedia.gallery : [];
  const firstGallery =
    gallery.find((item: any) => item?.isPrimary && resolveDocumentUrl(item)) ||
    gallery.find((item: any) => resolveDocumentUrl(item));
  return (
    resolveDocumentUrl(firstGallery) ||
    unit?.primaryImageUrl ||
    unit?.image ||
    unit?.coverImage ||
    devHero ||
    '/assets/placeholder-home.jpg'
  );
};

const getFloorPlanUrl = (unit: any) => {
  const floorPlans = Array.isArray(unit?.baseMedia?.floorPlans) ? unit.baseMedia.floorPlans : [];
  for (const item of floorPlans) {
    const url = resolveDocumentUrl(item);
    if (url) return url;
  }
  return null;
};

const getGalleryUrls = (unit: any) => {
  const gallery = Array.isArray(unit?.baseMedia?.gallery) ? unit.baseMedia.gallery : [];
  const urls = gallery
    .map((item: any) => resolveDocumentUrl(item))
    .filter((url): url is string => Boolean(url && url.trim()));
  const primary =
    typeof unit?.normalizedImage === 'string' && unit.normalizedImage.trim()
      ? resolveMediaUrl(unit.normalizedImage)
      : null;
  return Array.from(new Set([primary, ...urls].filter(Boolean) as string[]));
};

const toTitle = (value: string) =>
  value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const getAmenityChips = (unit: any) => {
  const amenities = unit?.amenities;
  const standard = Array.isArray(amenities?.standard) ? amenities.standard : [];
  const additional = Array.isArray(amenities?.additional) ? amenities.additional : [];
  const builtIn = Object.entries(unit?.specifications?.builtInFeatures || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([feature]) => toTitle(feature));
  return Array.from(
    new Set(
      [...standard, ...additional, ...builtIn]
        .map(item => String(item || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 12);
};

const BOOLEAN_FEATURE_LABELS: Record<string, string> = {
  builtInWardrobes: 'Built-in wardrobes',
  tiledFlooring: 'Tiled flooring',
  graniteCounters: 'Granite countertops',
  prepaidElectricity: 'Prepaid electricity',
  balcony: 'Private balcony',
  petFriendly: 'Pet friendly',
};

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const dedupeStrings = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.map(item => String(item || '').trim()).filter(Boolean)));

const getUnitSpecificationGroups = (unit: any) => {
  const baseFinishes = unit?.baseFinishes || {};
  const baseFeatures = unit?.baseFeatures || {};
  const specifications = unit?.specifications || {};
  const builtInFeatures = specifications?.builtInFeatures || {};
  const electrical = specifications?.electrical || {};
  const finishes = specifications?.finishes || {};
  const features = unit?.features || {};

  const groups = [
    {
      title: 'Kitchen',
      items: dedupeStrings([
        asNonEmptyString(baseFinishes.kitchenFeatures),
        asNonEmptyString(finishes.kitchenFeatures),
        ...(Array.isArray(features.kitchen) ? features.kitchen : []),
        baseFeatures.graniteCounters || builtInFeatures.graniteCounters
          ? BOOLEAN_FEATURE_LABELS.graniteCounters
          : null,
      ]),
    },
    {
      title: 'Bathrooms',
      items: dedupeStrings([
        asNonEmptyString(baseFinishes.bathroomFeatures),
        asNonEmptyString(finishes.bathroomFeatures),
        ...(Array.isArray(features.bathroom) ? features.bathroom : []),
      ]),
    },
    {
      title: 'Finishes',
      items: dedupeStrings([
        asNonEmptyString(baseFinishes.paintAndWalls),
        asNonEmptyString(finishes.paintAndWalls),
        asNonEmptyString(baseFinishes.flooringTypes),
        asNonEmptyString(finishes.flooringTypes),
        ...(Array.isArray(features.flooring) ? features.flooring : []),
        baseFeatures.tiledFlooring || builtInFeatures.tiledFlooring
          ? BOOLEAN_FEATURE_LABELS.tiledFlooring
          : null,
      ]),
    },
    {
      title: 'Storage & layout',
      items: dedupeStrings([
        ...(Array.isArray(features.storage) ? features.storage : []),
        baseFeatures.builtInWardrobes || builtInFeatures.builtInWardrobes
          ? BOOLEAN_FEATURE_LABELS.builtInWardrobes
          : null,
        baseFeatures.balcony ? BOOLEAN_FEATURE_LABELS.balcony : null,
      ]),
    },
    {
      title: 'Utilities',
      items: dedupeStrings([
        baseFeatures.prepaidElectricity || electrical.prepaidElectricity
          ? BOOLEAN_FEATURE_LABELS.prepaidElectricity
          : null,
        ...(Array.isArray(features.climate) ? features.climate : []),
        ...(Array.isArray(features.other) ? features.other : []),
      ]),
    },
    {
      title: 'Security & outdoor',
      items: dedupeStrings([
        ...(Array.isArray(features.security) ? features.security : []),
        ...(Array.isArray(features.outdoor) ? features.outdoor : []),
        baseFeatures.petFriendly ? BOOLEAN_FEATURE_LABELS.petFriendly : null,
      ]),
    },
  ];

  return groups.filter(group => group.items.length > 0);
};

export default function DevelopmentUnitDetailPage() {
  const { slug, unitId } = useParams<{ slug: string; unitId: string }>();
  const [, setLocation] = useLocation();
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [leadDialogMode, setLeadDialogMode] = useState<'brochure' | 'contact' | 'qualification' | 'info'>('info');
  const [leadDialogLocation, setLeadDialogLocation] = useState('unit_detail_page');

  const { data: dev, isLoading } = trpc.developer.getPublicDevelopmentBySlug.useQuery(
    { slugOrId: slug || '' },
    { enabled: !!slug },
  );

  const development = useMemo(() => {
    if (!dev) return null;

    const publisher =
      (dev as any).publisher ||
      (dev as any).brandProfile ||
      (dev as any).developerBrandProfile ||
      null;

    let parsedImages: any[] = [];
    if (Array.isArray((dev as any).images)) parsedImages = (dev as any).images;
    else if (typeof dev.images === 'string') {
      try {
        parsedImages = JSON.parse(dev.images);
      } catch {
        parsedImages = [];
      }
    }

    const heroImage =
      parsedImages
        .map((item: any) => {
          if (typeof item === 'string') return { url: resolveMediaUrl(item), isPrimary: false };
          const candidate = item?.url ?? item?.key ?? item?.src ?? null;
          return {
            url: typeof candidate === 'string' ? resolveMediaUrl(candidate) : null,
            isPrimary: Boolean(item?.isPrimary),
          };
        })
        .filter((item: any) => item?.url)
        .sort((a: any, b: any) => Number(b.isPrimary) - Number(a.isPrimary))[0]?.url || null;

    const estateSpecs = (() => {
      if (!dev.estateSpecs) return {};
      if (typeof dev.estateSpecs === 'object') return dev.estateSpecs;
      try {
        return JSON.parse(dev.estateSpecs);
      } catch {
        return {};
      }
    })();

    const brochureItems = Array.isArray((dev as any).brochures) ? (dev as any).brochures : [];
    const brochureUrl = brochureItems.map(resolveDocumentUrl).find(Boolean) || null;

    return {
      id: dev.id,
      name: dev.name,
      slug: dev.slug || slug,
      suburb: dev.suburb,
      city: dev.city,
      heroImage,
      brochureUrl,
      developerBrandProfileId: (dev as any).developerBrandProfileId ?? publisher?.id ?? null,
      developerName: publisher?.name || dev.developer?.name || null,
      units: (Array.isArray(dev.unitTypes) ? dev.unitTypes : []).map((unit: any) => ({
        ...unit,
        normalizedType: formatLabel(unit.structuralType || unit.type || 'Unit'),
        normalizedOwnership: formatLabel(
          unit.ownershipType || (estateSpecs as any)?.ownershipType || inferOwnership(unit.structuralType || unit.type),
        ),
        normalizedImage: getPrimaryUnitImage(unit, heroImage || undefined),
        floorSize: unit.unitSize,
        landSize: unit.erfSize || unit.yardSize,
      })),
    };
  }, [dev, slug]);

  const selectedUnit = useMemo(() => {
    if (!development) return null;
    return (
      development.units.find((unit: any) => toUnitRouteKey(unit) === unitId) ||
      development.units.find((unit: any) => `${unit.id}` === `${unitId}`) ||
      null
    );
  }, [development, unitId]);

  const currentUnitIndex = useMemo(() => {
    if (!development || !selectedUnit) return -1;
    return development.units.findIndex((unit: any) => toUnitRouteKey(unit) === toUnitRouteKey(selectedUnit));
  }, [development, selectedUnit]);

  const previousUnit =
    currentUnitIndex > 0 && development ? development.units[currentUnitIndex - 1] : null;
  const nextUnit =
    currentUnitIndex >= 0 && development && currentUnitIndex < development.units.length - 1
      ? development.units[currentUnitIndex + 1]
      : null;

  const galleryUrls = useMemo(() => (selectedUnit ? getGalleryUrls(selectedUnit) : []), [selectedUnit]);
  const amenityChips = useMemo(() => (selectedUnit ? getAmenityChips(selectedUnit) : []), [selectedUnit]);
  const specificationGroups = useMemo(
    () => (selectedUnit ? getUnitSpecificationGroups(selectedUnit) : []),
    [selectedUnit],
  );

  const floorPlanUrl = selectedUnit ? getFloorPlanUrl(selectedUnit) : null;
  const priceFrom = parseNumber(selectedUnit?.basePriceFrom) || 0;
  const priceTo = parseNumber(selectedUnit?.basePriceTo);
  const priceLabel =
    priceFrom > 0
      ? priceTo && priceTo > priceFrom
        ? `${formatExactRand(priceFrom)} - ${formatExactRand(priceTo)}`
        : formatExactRand(priceFrom)
      : 'Price on request';
  const repayment =
    priceFrom > 0 ? calculateMonthlyRepayment(priceFrom, SA_PRIME_RATE, DEFAULT_BOND_TERM_YEARS) : 0;
  const qualifyingIncome = repayment > 0 ? Math.round(repayment * QUICK_QUALIFICATION_PAYMENT_RATIO) : 0;
  const heroAsset =
    floorPlanUrl ||
    galleryUrls[Math.min(activeGalleryIndex, Math.max(galleryUrls.length - 1, 0))] ||
    selectedUnit?.normalizedImage ||
    development?.heroImage ||
    '/assets/placeholder-home.jpg';
  const unitDescription =
    String(selectedUnit?.configDescription || selectedUnit?.description || '').trim() ||
    `View the layout, included finishes, and pricing guidance for ${selectedUnit?.name || 'this unit'} at ${development?.name || 'this development'}.`;
  const optionalExtras = Array.isArray(selectedUnit?.extras)
    ? selectedUnit.extras.filter((item: any) => item && (item.label || item.name))
    : [];
  const availabilityCount = Math.max(Number(selectedUnit?.availableUnits || 0), 0);
  const totalCount = Math.max(Number(selectedUnit?.totalUnits || 0), 0);
  const availabilityLabel =
    availabilityCount > 0
      ? availabilityCount <= 3
        ? `Only ${availabilityCount} left`
        : `${availabilityCount} available`
      : totalCount > 0
        ? 'Currently sold out'
        : 'Availability on request';
  const positioningLine =
    Number(selectedUnit?.bedrooms || 0) >= 3
      ? 'Well suited to growing families who need more layout flexibility.'
      : Number(selectedUnit?.bedrooms || 0) >= 2
        ? 'A balanced layout for first-time buyers, couples, or small families.'
        : 'A compact entry point for buyers who want estate living with a lower starting price.';
  const backToDevelopmentHref = development
    ? `/development/${development.slug}#available-units`
    : `/development/${slug || ''}#available-units`;

  const openLeadDialog = (mode: 'brochure' | 'contact' | 'qualification' | 'info', ctaLocation: string) => {
    setLeadDialogMode(mode);
    setLeadDialogLocation(ctaLocation);
    setLeadDialogOpen(true);
    trackCTAClick({
      ctaLabel:
        mode === 'brochure'
          ? 'Download Brochure'
          : mode === 'contact'
            ? 'Request Callback'
            : mode === 'qualification'
              ? 'Start Qualification'
              : 'Request Information',
      ctaLocation,
      ctaHref: typeof window !== 'undefined' ? window.location.href : '',
    });
  };

  const goToQualification = () => {
    if (!development || !selectedUnit) return;
    const query = new URLSearchParams();
    query.set('unit', toUnitRouteKey(selectedUnit));
    trackCTAClick({
      ctaLabel: 'Check If You Qualify',
      ctaLocation: 'unit_detail_action_panel',
      ctaHref:
        typeof window !== 'undefined'
          ? `${window.location.origin}/development/${development.slug}/qualification?${query.toString()}`
          : `/development/${development.slug}/qualification?${query.toString()}`,
    });
    trackFunnelStep({
      funnel: 'development_unit_detail',
      step: 'qualification_entry',
      action: 'start',
      path: String(selectedUnit.id || selectedUnit.name || 'unit'),
    });
    setLocation(`/development/${development.slug}/qualification?${query.toString()}`);
  };

  const navigateToSiblingUnit = (unit: any, ctaLocation: string) => {
    if (!development || !unit) return;
    const href = `/development/${development.slug}/unit/${toUnitRouteKey(unit)}`;
    trackCTAClick({
      ctaLabel: 'Browse Adjacent Unit',
      ctaLocation,
      ctaHref: typeof window !== 'undefined' ? `${window.location.origin}${href}` : href,
    });
    setLocation(href);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!development || !selectedUnit) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <Button variant="ghost" className="gap-2 px-0" onClick={() => setLocation(`/development/${slug || ''}`)}>
              <ArrowLeft className="h-4 w-4" />
              Back to development
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Card className="border-slate-200">
            <CardContent className="p-10 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Unit not found</h1>
              <p className="mt-3 text-sm text-slate-600">
                The unit you are looking for is unavailable or no longer part of this development.
              </p>
              <Button className="mt-6" onClick={() => setLocation(`/development/${slug || ''}`)}>
                Back to development
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const floorSizeLabel = formatSizeValue(selectedUnit.floorSize ?? selectedUnit.unitSize);
  const yardSizeLabel = formatSizeValue(selectedUnit.landSize ?? selectedUnit.yardSize);
  const parkingLabel = formatParkingLabel(selectedUnit.parkingType, selectedUnit.parkingBays);
  const bedroomLabel =
    selectedUnit.bedroomKey === 'other'
      ? 'Studio / Other'
      : `${selectedUnit.bedrooms ?? selectedUnit.bedroomLabel ?? '-'}`;

  return (
    <>
      <MetaControl
        title={`${selectedUnit.name} at ${development.name}`}
        description={`View the floor plan, pricing, and unit details for ${selectedUnit.name} at ${development.name}.`}
      />

      <div className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <Button variant="ghost" className="gap-2 px-0 text-slate-700" onClick={() => setLocation(backToDevelopmentHref)}>
              <ArrowLeft className="h-4 w-4" />
              Back to {development.name}
            </Button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="min-w-0 text-right">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {development.name}
                </p>
                <p className="truncate text-sm font-semibold text-slate-900">{selectedUnit.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-200"
                  disabled={!previousUnit}
                  onClick={() =>
                    previousUnit
                      ? navigateToSiblingUnit(previousUnit, 'unit_detail_header_previous')
                      : undefined
                  }
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-slate-200"
                  disabled={!nextUnit}
                  onClick={() =>
                    nextUnit ? navigateToSiblingUnit(nextUnit, 'unit_detail_header_next') : undefined
                  }
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_360px]">
            <div className="space-y-6">
              <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50">
                      {selectedUnit.normalizedType}
                    </Badge>
                    <Badge className="border border-slate-200 bg-white text-slate-600 hover:bg-white">
                      {selectedUnit.normalizedOwnership}
                    </Badge>
                    <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      {availabilityLabel}
                    </Badge>
                  </div>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    {selectedUnit.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-slate-600">{positioningLine}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    {(development.suburb || development.city) && (
                      <span className="inline-flex items-center gap-2">
                        <MapPinned className="h-4 w-4 text-slate-400" />
                        {[development.suburb, development.city].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {development.developerName ? (
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                        By {development.developerName}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-6">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {floorPlanUrl ? 'Floor plan' : 'Unit preview'}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {floorPlanUrl ? `Primary layout for ${selectedUnit.name}` : `Gallery preview for ${selectedUnit.name}`}
                        </p>
                      </div>
                      {floorPlanUrl ? (
                        <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => window.open(floorPlanUrl, '_blank', 'noopener,noreferrer')}>
                          <Download className="mr-2 h-4 w-4" />
                          Download plan
                        </Button>
                      ) : null}
                    </div>
                    <div className="aspect-[16/10] bg-white">
                      {typeof heroAsset === 'string' && heroAsset ? (
                        isImageAsset(heroAsset) ? (
                          <img src={heroAsset} alt={selectedUnit.name} className="h-full w-full object-contain bg-white" />
                        ) : (
                          <iframe src={heroAsset} title={`${selectedUnit.name} floor plan`} className="h-full w-full bg-white" />
                        )
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500">
                          <ImageIcon className="h-8 w-8 text-slate-300" />
                          <div>
                            <p className="font-medium text-slate-700">Preview unavailable</p>
                            <p className="text-sm text-slate-500">Request information for the latest layout and media pack.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {galleryUrls.length > 1 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900">Unit gallery</p>
                        <div className="flex items-center gap-2">
                          <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => setActiveGalleryIndex(current => (current <= 0 ? galleryUrls.length - 1 : current - 1))}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="outline" className="h-9 w-9 rounded-full" onClick={() => setActiveGalleryIndex(current => (current >= galleryUrls.length - 1 ? 0 : current + 1))}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                        {galleryUrls.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            type="button"
                            className={`overflow-hidden rounded-2xl border ${index === activeGalleryIndex ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-slate-200'}`}
                            onClick={() => setActiveGalleryIndex(index)}
                          >
                            <img src={url} alt={`${selectedUnit.name} gallery ${index + 1}`} className="aspect-[4/3] h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-6 sm:p-6">
                {[
                  { label: 'Price from', value: formatExactRand(priceFrom) || 'On request' },
                  { label: 'Bedrooms', value: bedroomLabel },
                  { label: 'Bathrooms', value: formatBathValue(selectedUnit.bathrooms) || '-' },
                  { label: 'Size', value: floorSizeLabel ? `${floorSizeLabel} m2` : '-' },
                  { label: yardSizeLabel ? 'Yard size' : 'Parking', value: yardSizeLabel ? `${yardSizeLabel} m2` : parkingLabel || '-' },
                  { label: 'Availability', value: availabilityLabel },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-950">
                      {item.value}
                    </p>
                  </div>
                ))}
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Unit overview
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{unitDescription}</p>
                {amenityChips.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-slate-900">Included features</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {amenityChips.map(chip => (
                        <Badge key={chip} variant="secondary" className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                          {chip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              {specificationGroups.length > 0 ? (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Finishes & specifications
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      What is included in this unit type
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                      Use this section to understand the level of finish, built-in features, and
                      practical details that shape day-to-day living in this layout.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {specificationGroups.map(group => (
                      <div
                        key={group.title}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-sm font-semibold text-slate-900">{group.title}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.items.map(item => (
                            <Badge
                              key={`${group.title}-${item}`}
                              variant="secondary"
                              className="rounded-full bg-white px-3 py-1 text-slate-700 hover:bg-white"
                            >
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {optionalExtras.length > 0 ? (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Optional upgrades
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      Add-ons available for this unit
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                      Some developers offer upgrade packs or optional extras that can be discussed
                      during enquiry.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {optionalExtras.map((extra: any, index: number) => {
                      const extraLabel = String(extra.label || extra.name || `Option ${index + 1}`).trim();
                      const extraDescription = asNonEmptyString(extra.description);
                      const extraPrice = formatExactRand(extra.price);

                      return (
                        <div
                          key={`${extraLabel}-${index}`}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {extraLabel}
                              </p>
                              {extraDescription ? (
                                <p className="mt-2 text-sm text-slate-600">{extraDescription}</p>
                              ) : null}
                            </div>
                            <div className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-700">
                              {extraPrice ? `+ ${extraPrice}` : 'On request'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Enquire on this unit
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    Choose the next step that matches your intent
                  </h2>
                  <p className="mt-3 text-sm text-slate-600">
                    Every enquiry from this page is tied directly to {selectedUnit.name}, so the
                    sales team can respond with the right layout, pricing, and next steps.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {[
                    {
                      title: 'Get pricing and details',
                      body: 'Request the latest pricing, specifications, and available options for this unit type.',
                      action: () => openLeadDialog('info', 'unit_detail_intent_info'),
                      label: 'Request information',
                    },
                    {
                      title: 'Have the floor plan emailed',
                      body: 'Unlock the floor plan or brochure pack and receive the latest supporting documents.',
                      action: () => openLeadDialog('brochure', 'unit_detail_intent_brochure'),
                      label: 'Send me the plan',
                    },
                    {
                      title: 'Talk to sales',
                      body: 'Request a callback to discuss stock, timelines, and the best fit within the development.',
                      action: () => openLeadDialog('contact', 'unit_detail_intent_contact'),
                      label: 'Request callback',
                    },
                    {
                      title: 'Check affordability',
                      body: 'Start the qualification flow using this unit as your target reference point.',
                      action: () => goToQualification(),
                      label: 'Check affordability',
                    },
                  ]
                    .filter(item => item.title !== 'Have the floor plan emailed' || development.brochureUrl)
                    .map(item => (
                      <div
                        key={item.title}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                        <Button
                          variant="outline"
                          className="mt-4 border-slate-300 text-slate-800 hover:bg-white"
                          onClick={item.action}
                        >
                          {item.label}
                        </Button>
                      </div>
                    ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Development context
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      Keep comparing within {development.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      Move back to all unit types or step through the adjacent layouts without
                      leaving the buying journey.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    onClick={() => setLocation(backToDevelopmentHref)}
                  >
                    Back to all unit types
                  </Button>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-auto justify-between border-slate-200 px-4 py-4 text-left"
                    disabled={!previousUnit}
                    onClick={() =>
                      previousUnit
                        ? navigateToSiblingUnit(previousUnit, 'unit_detail_footer_previous')
                        : undefined
                    }
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Previous unit
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {previousUnit?.name || 'No previous unit'}
                      </p>
                    </div>
                    <ChevronLeft className="h-4 w-4 shrink-0 text-slate-500" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto justify-between border-slate-200 px-4 py-4 text-left"
                    disabled={!nextUnit}
                    onClick={() =>
                      nextUnit ? navigateToSiblingUnit(nextUnit, 'unit_detail_footer_next') : undefined
                    }
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Next unit
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                        {nextUnit?.name || 'No next unit'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                  </Button>
                </div>
              </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className="bg-slate-950 px-5 py-6 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200">Unit pricing</p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight">{priceLabel}</h2>
                    <p className="mt-3 text-sm text-slate-300">
                      Review the layout, compare the monthly picture, and move into enquiry.
                    </p>
                    <p className="mt-3 text-sm font-medium text-orange-100">{availabilityLabel}</p>
                  </div>
                  <div className="space-y-4 px-5 py-5">
                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                      {[
                        { label: 'Beds', value: bedroomLabel },
                        { label: 'Baths', value: formatBathValue(selectedUnit.bathrooms) || '-' },
                        { label: 'Parking', value: parkingLabel || '-' },
                        { label: 'Size', value: floorSizeLabel ? `${floorSizeLabel} m2` : '-' },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {item.label}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Ownership snapshot
                      </p>
                      <div className="mt-4 grid gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calculator className="mt-0.5 h-4 w-4" />
                            <span className="text-sm">Estimated repayment</span>
                          </div>
                          <span className="text-right text-sm font-semibold text-slate-950">
                            {repayment > 0 ? `${formatSARandShort(repayment)} / month` : 'On request'}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <CheckCircle2 className="mt-0.5 h-4 w-4" />
                            <span className="text-sm">Qualifying income</span>
                          </div>
                          <span className="text-right text-sm font-semibold text-slate-950">
                            {qualifyingIncome > 0 ? `${formatSARandShort(qualifyingIncome)} / month` : 'On request'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Button className="h-11 w-full bg-orange-500 text-white hover:bg-orange-600" onClick={() => openLeadDialog('info', 'unit_detail_action_panel_info')}>
                        Enquire about this unit
                      </Button>
                      <Button variant="outline" className="h-11 w-full border-blue-200 text-blue-700 hover:bg-blue-50" onClick={goToQualification}>
                        Check affordability
                      </Button>
                      <Button variant="outline" className="h-11 w-full border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => openLeadDialog('contact', 'unit_detail_action_panel_contact')}>
                        <Phone className="mr-2 h-4 w-4" />
                        Request callback
                      </Button>
                      {development.brochureUrl ? (
                        <Button variant="ghost" className="h-10 w-full text-slate-600 hover:text-slate-900" onClick={() => openLeadDialog('brochure', 'unit_detail_action_panel_brochure')}>
                          <Download className="mr-2 h-4 w-4" />
                          Download floor plan or brochure
                        </Button>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-900">Next step support</p>
                      <ul className="mt-3 space-y-2 text-sm text-emerald-800">
                        <li className="flex gap-2">
                          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                          Pricing pack and availability guidance sent to your inbox
                        </li>
                        <li className="flex gap-2">
                          <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                          Sales callback for availability and next steps
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {selectedUnit.name}
              </p>
              <p className="truncate text-sm font-bold text-slate-950">{priceLabel}</p>
            </div>
            <Button size="sm" className="h-10 bg-orange-500 px-3 hover:bg-orange-600" onClick={() => openLeadDialog('info', 'unit_detail_mobile_info')}>
              Enquire
            </Button>
            <Button size="sm" variant="outline" className="h-10 px-3" onClick={goToQualification}>
              Afford
            </Button>
          </div>
        </div>

        <Footer />
      </div>

      <DevelopmentLeadDialog
        open={leadDialogOpen}
        onOpenChange={setLeadDialogOpen}
        mode={leadDialogMode}
        ctaLocation={leadDialogLocation}
        unitContext={{ id: selectedUnit.id ?? null, name: selectedUnit.name ?? null }}
        development={{
          id: development.id,
          name: development.name,
          developerBrandProfileId: development.developerBrandProfileId,
          brochureUrl: development.brochureUrl,
        }}
      />
    </>
  );
}
