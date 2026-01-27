import { useParams } from 'wouter';
import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { MediaLightbox } from '@/components/MediaLightbox';
import { DevelopmentHeader } from '@/components/DevelopmentHeader';
import { DevelopmentGallery } from '@/components/DevelopmentGallery';
import { DeveloperOverview } from '@/components/development/DeveloperOverview';
import { StatCard } from '@/components/development/StatCard';
import { SectionNav } from '@/components/development/SectionNav';
import { DevelopmentOverviewCard } from '@/components/DevelopmentOverviewCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Building2,
  MapPin,
  Home,
  Bed,
  Bath,
  Square,
  Calendar,
  Check,
  Phone,
  Mail,
  Download,
  Maximize,
  ExternalLink,
  Award,
  Globe,
  Briefcase,
  Loader2,
  ArrowUpRight,
  Layers,
  Zap,
  Shield,
  Dumbbell,
  Leaf,
  Settings,
  Baby,
  LayoutGrid,
  Droplets,
  Wifi,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NearbyLandmarks } from '@/components/property/NearbyLandmarks';
import { SuburbInsights } from '@/components/property/SuburbInsights';
import { LocalityGuide } from '@/components/property/LocalityGuide';
import { Input } from '@/components/ui/input';
import { MetaControl } from '@/components/seo/MetaControl';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { Footer } from '@/components/Footer';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import {
  AMENITY_CATEGORIES,
  AMENITY_REGISTRY,
  type AmenityCategory,
} from '@/config/amenityRegistry';
import {
  getDevelopmentHeroMedia,
  buildDevelopmentGalleryImages,
  getGalleryStartIndex,
  getDevelopmentAmenityTileImage,
  getDevelopmentOutdoorsTileImage,
  getDevelopmentViewGalleryTileImage,
  type DevelopmentMedia,
} from '@/lib/media-logic';
import { formatPriceCompact } from '@/lib/formatPrice';

type AmenityTabKey = AmenityCategory | 'other';

const AMENITY_CATEGORY_ICONS: Record<AmenityTabKey, typeof Shield> = {
  security: Shield,
  lifestyle: Dumbbell,
  sustainability: Leaf,
  convenience: Settings,
  family: Baby,
  other: CheckCircle2,
};

// --- UNIT HELPERS ---
const getPrimaryUnitImage = (u: any, devHero?: string): string => {
  const bm = u.baseMedia;
  const gallery = Array.isArray(bm?.gallery) ? bm.gallery : Array.isArray(bm) ? bm : [];

  // robust gallery search
  const first =
    gallery.find((x: any) => x?.isPrimary && x?.url)?.url ||
    gallery.find((x: any) => x?.url)?.url ||
    // legacy fields
    u.primaryImageUrl ||
    u.image ||
    u.coverImage ||
    // fallbacks
    devHero ||
    '/assets/placeholder-home.jpg';

  return first;
};

const inferOwnership = (structuralType: string, defaultType?: string) => {
  if (defaultType) return defaultType;
  const t = (structuralType || '').toLowerCase();
  const isHouse = /house|duplex|simplex|townhouse|freestanding|cluster/.test(t);
  return isHouse ? 'Freehold' : 'Sectional Title';
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isPresentSize = (value: unknown): boolean => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0;
};

const formatSizeValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
      if (trimmed.includes('.')) {
        return trimmed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
      }
      return trimmed;
    }
  }

  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatBathValue = (value: unknown): string | null => {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? `${parsed}` : `${parsed}`;
};

const formatParkingLabel = (parking?: string | number, parkingBays?: number): string | null => {
  const parkingValue = parking ?? undefined;
  const baysValue = parseNumber(parkingBays);

  if (typeof parkingValue === 'string') {
    const trimmed = parkingValue.trim();
    if (trimmed === '' || trimmed === 'none' || trimmed === '0') {
      return baysValue && baysValue > 0
        ? `${baysValue} Bay${baysValue === 1 ? '' : 's'}`
        : null;
    }
    if (/^\d+$/.test(trimmed)) {
      const bays = Number(trimmed);
      return bays > 0 ? `${bays} Bay${bays === 1 ? '' : 's'}` : null;
    }
    const normalized = trimmed.replace(/[_-]+/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  return baysValue && baysValue > 0 ? `${baysValue} Bay${baysValue === 1 ? '' : 's'}` : null;
};

type UnitTypeCarouselProps = {
  units: any[];
};

function UnitTypeCarousel({ units }: UnitTypeCarouselProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    const update = () => {
      setSelectedIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };

    update();
    api.on('select', update);
    api.on('reInit', update);

    return () => {
      api.off('select', update);
      api.off('reInit', update);
    };
  }, [api]);

  if (units.length === 0) return null;

  return (
    <div className="relative w-full">
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {units.map(unit => {
            const showHouseSize = isPresentSize(unit.floorSize);
            const showLandSize = isPresentSize(unit.landSize);
            const houseSizeLabel = formatSizeValue(unit.floorSize);
            const landSizeLabel = formatSizeValue(unit.landSize);
            const parkingLabel = formatParkingLabel(unit.parkingType, unit.parkingBays);

            return (
              <CarouselItem key={unit.id} className="pl-4 md:basis-5/12 lg:basis-5/12">
                <Card className="overflow-hidden hover:shadow-md transition-all duration-300 border-slate-200 h-full flex flex-col">
                  {/* Image with fixed aspect ratio */}
                  <div className="relative w-full aspect-[4/3] bg-slate-200 overflow-hidden group">
                    <img
                      src={unit.normalizedImage}
                      alt={unit.normalizedType}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.includes('placeholder')) {
                          target.src = '/assets/placeholder-home.jpg';
                        }
                      }}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <CardContent className="p-3 space-y-3 flex-1 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">
                          {formatPriceCompact(unit.basePriceFrom)}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">{unit.name}</p>
                        {unit.basePriceTo &&
                          Number(unit.basePriceTo) > 0 &&
                          unit.basePriceTo > unit.basePriceFrom && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              - {formatPriceCompact(unit.basePriceTo)}
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 py-2 border-t border-b border-slate-100 mt-auto min-h-[50px]">
                      {/* 1. House Size */}
                      <div className="flex flex-col items-center justify-center text-center px-1">
                        <HouseMeasureIcon className="h-3.5 w-3.5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {showHouseSize && houseSizeLabel ? `${houseSizeLabel} m2` : '-'}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-slate-100 shrink-0" />

                      {/* 2. Bedrooms */}
                      <div className="flex flex-col items-center justify-center text-center px-1">
                        <Bed className="h-3.5 w-3.5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {unit.bedrooms} Bed
                        </span>
                      </div>

                      <div className="h-6 w-px bg-slate-100 shrink-0" />

                      {/* 3. Bathrooms */}
                      <div className="flex flex-col items-center justify-center text-center px-1">
                        <Bath className="h-3.5 w-3.5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {formatBathValue(unit.bathrooms) ?? '-'} Bath
                        </span>
                      </div>

                      {/* 4. Erf/Yard size (Preferred) or Parking fallback */}
                      {showLandSize && landSizeLabel ? (
                        <>
                          <div className="h-6 w-px bg-slate-100 shrink-0" />
                          <div className="flex flex-col items-center justify-center text-center px-1">
                            <Maximize className="h-3.5 w-3.5 text-slate-400 mb-1" />
                            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {landSizeLabel} m2
                            </span>
                          </div>
                        </>
                      ) : (
                        parkingLabel && (
                          <>
                            <div className="h-6 w-px bg-slate-100 shrink-0" />
                            <div className="flex flex-col items-center justify-center text-center px-1">
                              <Car className="h-3.5 w-3.5 text-slate-400 mb-1" />
                              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                Parking {parkingLabel}
                              </span>
                            </div>
                          </>
                        )
                      )}
                    </div>

                    <div className="pt-1">
                      <Button
                        variant="outline"
                        className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 h-9 text-xs font-bold rounded-md shadow-none uppercase tracking-wide"
                      >
                        Request callback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="hidden md:block">
          <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white shadow-md border-slate-200" />
          <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white shadow-md border-slate-200" />
        </div>
      </Carousel>

      {snapCount > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: snapCount }).map((_, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => api?.scrollTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  isActive ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DevelopmentDetail() {
  const { slug } = useParams();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxTitle, setLightboxTitle] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAmenityTab, setActiveAmenityTab] = useState<AmenityTabKey | ''>('');
  const amenityTabsRef = useRef<HTMLDivElement | null>(null);
  const [canScrollAmenityLeft, setCanScrollAmenityLeft] = useState(false);
  const [canScrollAmenityRight, setCanScrollAmenityRight] = useState(false);
  const heroSentinelRef = useRef<HTMLDivElement | null>(null);
  const [showQuickNav, setShowQuickNav] = useState(false);

  // Parse helpers
  const parseJSON = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  // Lightbox handler
  const openLightbox = (index: number, title: string) => {
    setLightboxIndex(index);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  // Fetch real development by slug or ID
  const { data: dev, isLoading } = trpc.developer.getPublicDevelopmentBySlug.useQuery(
    { slugOrId: slug || '' },
    { enabled: !!slug },
  );

  // Fetch other developments from same developer
  const { data: allDevelopments } = trpc.developer.listPublicDevelopments.useQuery(
    { limit: 50 },
    { enabled: !!dev?.developer?.id },
  );

  const amenityList = parseJSON(dev?.amenities);
  const amenityGroups = buildAmenityGroups(amenityList);
  const amenityTabs = [
    ...AMENITY_CATEGORIES.map(category => ({
      key: category.key,
      label: category.label,
      count: amenityGroups[category.key]?.length ?? 0,
      icon: AMENITY_CATEGORY_ICONS[category.key],
    })).filter(tab => tab.count > 0),
    ...(amenityGroups.other.length > 0
      ? [
          {
            key: 'other' as AmenityTabKey,
            label: 'Other',
            count: amenityGroups.other.length,
            icon: AMENITY_CATEGORY_ICONS.other,
          },
        ]
      : []),
  ];
  const amenityTabKeys = amenityTabs.map(tab => tab.key);

  useEffect(() => {
    if (amenityTabKeys.length === 0) return;
    if (!amenityTabKeys.includes(activeAmenityTab as AmenityTabKey)) {
      setActiveAmenityTab(amenityTabKeys[0]);
    }
  }, [activeAmenityTab, amenityTabKeys]);

  useEffect(() => {
    const container = amenityTabsRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      setCanScrollAmenityLeft(container.scrollLeft > 0);
      setCanScrollAmenityRight(container.scrollLeft < maxScrollLeft - 1);
    };

    updateScrollState();

    const handleResize = () => updateScrollState();
    const handleScroll = () => updateScrollState();

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [amenityTabs.length]);

  useEffect(() => {
    const container = amenityTabsRef.current;
    if (!container) return;
    const activeTab = container.querySelector('[data-state="active"]') as HTMLElement | null;
    if (!activeTab) return;

    window.requestAnimationFrame(() => {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, [activeAmenityTab]);

  useEffect(() => {
    const sentinel = heroSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setShowQuickNav(entry ? !entry.isIntersecting : false);
      },
      { root: null, threshold: 0 },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dev) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Development Not Found</h2>
            <p className="text-gray-600 mt-2">
              The development you are looking for does not exist or has been removed.
            </p>
            <Button className="mt-4" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Format label helper
  const formatLabel = (value: string) => {
    if (!value) return '—';
    return value
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  function getAmenityLabel(key: string) {
    const match = AMENITY_REGISTRY.find(item => item.key === key);
    return match?.label ?? formatLabel(key);
  }

  function buildAmenityGroups(list: string[]) {
    const groups: Record<AmenityTabKey, { key: string; label: string }[]> = {
      security: [],
      lifestyle: [],
      sustainability: [],
      convenience: [],
      family: [],
      other: [],
    };
    const seen = new Set<string>();

    list.forEach(raw => {
      const key = String(raw ?? '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      const match = AMENITY_REGISTRY.find(item => item.key === key);
      const category = (match?.category ?? 'other') as AmenityTabKey;
      groups[category].push({ key, label: getAmenityLabel(key) });
    });

    return groups;
  }

  // Get unit type label
  const getUnitTypeLabel = (unitTypes: any[]) => {
    if (!unitTypes || unitTypes.length === 0) return '-';
    if (unitTypes.length === 1) {
      const name = unitTypes[0]?.name;
      return name ? String(name) : '1 Unit Type';
    }
    return `${unitTypes.length} Types`;
  };

  const parseOwnershipTypes = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {
        return [value];
      }
    }
    return [];
  };

  const getOwnershipLabel = (devData: any, estate: any) => {
    if (devData?.ownershipType) return formatLabel(devData.ownershipType);
    const ownershipTypes = parseOwnershipTypes(devData?.ownershipTypes);
    if (ownershipTypes.length === 1) return formatLabel(ownershipTypes[0]);
    if (ownershipTypes.length > 1) return 'Multiple';
    if (estate?.ownershipType) return formatLabel(estate.ownershipType);
    return '-';
  };

  // 1. RAW DATA EXTRACTION
  const rawImages = parseJSON(dev.images);
  const rawVideos = parseJSON(dev.videos);

  // 2. NORMALIZE TO CANONICAL TYPES
  // Convert DB format to our typed ImageMedia/VideoMedia
  const normalizeImage = (img: any): any => {
    // Using any temporarily to bridge types, verified below
    if (typeof img === 'string') return { url: img, category: 'featured' };
    return {
      url: img.url,
      category: img.category || 'general',
      isPrimary: img.isPrimary,
    };
  };

  const normalizeVideo = (v: any) => (typeof v === 'string' ? { url: v } : v);

  const normalizedImages = rawImages.map(normalizeImage);
  const normalizedVideos = rawVideos.map(normalizeVideo);

  // Create the Data Object
  const mediaData: DevelopmentMedia = {
    featuredImage: normalizedImages.find((img: any) => img.isPrimary) || normalizedImages[0],
    images: normalizedImages,
    videos: normalizedVideos,
  };

  // 3. APPLY CANONICAL LOGIC (Pure Decisions)
  // 3. APPLY CANONICAL LOGIC (Pure Decisions)
  const heroMedia = getDevelopmentHeroMedia(mediaData);
  const galleryImages = buildDevelopmentGalleryImages(mediaData);

  // Bento Tiles
  const amenityTile = getDevelopmentAmenityTileImage(mediaData);
  const outdoorTile = getDevelopmentOutdoorsTileImage(mediaData);
  const viewGalleryTile = getDevelopmentViewGalleryTileImage(mediaData);

  // Jump Indices (Calculated once from the single truth gallery)
  const galleryIndices = {
    general: 0, // Always starts at 0
    amenities: getGalleryStartIndex(galleryImages, 'amenities'),
    outdoors: getGalleryStartIndex(galleryImages, 'outdoors'),
    videos: 0, // Videos open separately in this UI pattern usually, or handled via specific index if mixed (but we don't mix)
    floorPlans: 0, // Placeholder, we treat floorplans separate typically
  };

  // Missing declaration restoration
  const floorPlans: any[] = []; // Initialize as empty array for now, or derive from units if available later
  const amenities = amenityList;
  const units = dev.unitTypes || [];

  // Parse estateSpecs for ownership type
  const estateSpecs = (() => {
    if (!dev.estateSpecs) return {};
    if (typeof dev.estateSpecs === 'object') return dev.estateSpecs;
    try {
      return JSON.parse(dev.estateSpecs);
    } catch (e) {
      return {};
    }
  })();

  // Calculate sales metrics from unit types
  const sales = (() => {
    const unitTypes = dev.unitTypes || [];
    const totals = unitTypes.reduce(
      (acc: any, u: any) => {
        const total = Number(u.totalUnits || 0);
        const avail = Number(u.availableUnits || 0);
        acc.total += total > 0 ? total : 0;
        acc.available += avail > 0 ? avail : 0;
        return acc;
      },
      { total: 0, available: 0 }
    );

    if (totals.total <= 0) return { soldPct: null, total: 0, available: 0 };

    const clampedAvailable = Math.min(Math.max(totals.available, 0), totals.total);
    const sold = totals.total - clampedAvailable;
    const soldPct = Math.round((sold / totals.total) * 100);

    return { soldPct, total: totals.total, available: clampedAvailable };
  })();

  // ... (Update development object)
  const development = {
    // ... existing fields ...
    id: dev.id,
    name: dev.name,
    developer: dev.developer?.name || 'Unknown Developer',
    developerLogo: dev.developer?.logo || null,
    developerDescription:
      dev.developer?.description ||
      'Professional property developer committed to quality and excellence.',
    developerWebsite: dev.developer?.website || null,
    developerSlug: dev.developer?.slug || null,
    location: `${dev.suburb ? dev.suburb + ', ' : ''}${dev.city}`,
    address: dev.address || '',
    description: dev.description || '',
    completionDate: dev.completionDate ? new Date(dev.completionDate).toLocaleDateString() : null,
    totalUnits: dev.totalUnits || 0,
    availableUnits: dev.availableUnits || 0,
    startingPrice: Number(dev.priceFrom) || 0,
    developmentType: dev.developmentType || 'residential',
    status: dev.status,

    // Media Props
    heroMedia: heroMedia,
    galleryImages: galleryImages,

    // Tiles
    amenityTile: amenityTile,
    outdoorTile: outdoorTile,
    viewGalleryTile: viewGalleryTile,

    // Counts & Lists
    totalPhotos: galleryImages.length,
    totalVideos: normalizedVideos.length,
    videoList: normalizedVideos,
    floorPlans: floorPlans, // Kept separate for now

    indices: galleryIndices,
    amenities: amenities,
    // CRITICAL: Ensure we rely on unitTypes, not mixed sources
    units: units.map((u: any) => {
      // Debug source for ownership
      const rawOwnership = u.ownershipType;
      const estateOwnership = estateSpecs.ownershipType;
      const structural = u.structuralType || u.type;
      const inferred = inferOwnership(structural);

      const source = rawOwnership ? 'Unit' : (estateOwnership ? 'Estate' : `Derived(${structural})`);
      const finalLabel = formatLabel(rawOwnership || estateOwnership || inferred);

      return {
        ...u,
        // Normalize upfront for easier consumption
        normalizedImage: getPrimaryUnitImage(u, heroMedia.image?.url),
        normalizedOwnership: finalLabel,
        normalizedType: formatLabel(u.structuralType || u.type || 'Apartment'),
        floorSize: u.unitSize,
        landSize: u.erfSize || u.yardSize,
      };
    }),
  };

  return (
    <>
      <MetaControl
        title={`${development.name} | ${development.developer}`}
        description={development.description}
        image={
          development.heroMedia.type === 'image' ? development.heroMedia.image?.url : undefined
        }
      />

      <div className="min-h-screen bg-slate-50 pb-20">
        <ListingNavbar />

        <div className="pt-24 pb-4 container max-w-7xl mx-auto px-4">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: development.location, href: '#' },
              { label: development.name, href: `/development/${development.id}`, active: true },
            ]}
          />
        </div>

        {/* Gallery Section - CRITICAL: Isolated container with overflow control */}
        <div className="w-full bg-white border-b border-slate-200">
          <div className="container max-w-7xl mx-auto px-4 py-4">
            {/* IMPORTANT: Wrapper to contain gallery overflow */}
            <div className="relative w-full overflow-hidden">
              <DevelopmentGallery
                featuredMedia={development.heroMedia}
                amenityTileImage={development.amenityTile}
                outdoorsTileImage={development.outdoorTile}
                viewGalleryTileImage={development.viewGalleryTile}
                totalPhotos={development.totalPhotos}
                totalVideos={development.totalVideos}
                videoList={development.videoList}
                floorPlans={development.floorPlans}
                indices={development.indices}
                onOpenLightbox={(index, title) => openLightbox(index, title)}
              />
            </div>
          </div>
        </div>

        <div ref={heroSentinelRef} className="h-px w-full" aria-hidden />

        {/* Quick Info Section - ABOVE SectionNav */}
        <div className="w-full bg-white border-b border-slate-200">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-stretch">
              {/* Left Column - Stats + Overview Card */}
              <div className="flex flex-col gap-6 h-full">
                {/* Quick Stats */}
                <section id="overview" className="w-full">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                      icon={Home}
                      label="Type"
                      value={formatLabel(dev.developmentType)}
                      color="blue"
                    />
                    <StatCard
                      icon={Check}
                      label="Status"
                      value={formatLabel(dev.status)}
                      color="green"
                    />
                    <StatCard
                      icon={Home}
                      label="Ownership"
                      value={getOwnershipLabel(dev, estateSpecs)}
                      color="purple"
                    />
                    <StatCard
                      icon={LayoutGrid}
                      label="Unit Types"
                      value={getUnitTypeLabel(dev.unitTypes || [])}
                      color="orange"
                    />
                  </div>
                </section>

                {/* Overview Card */}
                <DevelopmentOverviewCard
                  priceFrom={development.startingPrice}
                  completionDate={development.completionDate || '—'}
                  progressPercentage={sales.soldPct ?? 0}
                  constructionStatus={formatLabel(dev.status)}
                  salesMetrics={sales}
                />
              </div>

              {/* Right Column - Developer Info Card */}
              <div className="w-full lg:w-[360px] h-full self-stretch">
                <Card className="shadow-sm border-slate-200 h-full">
                  <CardContent className="p-3 h-full flex flex-col">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                        {development.developerLogo ? (
                          <img
                            src={development.developerLogo}
                            alt={development.developer}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate">
                          {development.developer}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Award className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
                            Verified Developer
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-2 leading-relaxed line-clamp-2">
                      {development.developerDescription}
                    </p>

                    {development.developerWebsite && (
                      <a
                        href={development.developerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-3"
                      >
                        <Globe className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Visit Website</span>
                      </a>
                    )}

                    <Separator className="bg-slate-100 my-2" />

                    {(() => {
                      const otherProjects = (allDevelopments || [])
                        .filter((d: any) => d.developerId === dev.developer?.id && d.id !== dev.id)
                        .slice(0, 3);

                      if (otherProjects.length === 0) return null;

                      return (
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            Other Projects
                          </p>
                          <div className="space-y-1 pl-1 border-l-2 border-slate-100">
                            {otherProjects.map((project: any) => (
                              <a
                                key={project.id}
                                href={`/development/${project.slug}`}
                                className="text-xs text-slate-600 pl-2 hover:text-blue-600 transition-colors block truncate"
                              >
                                {project.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-600 mt-auto pt-2 text-xs font-medium"
                    >
                      View Developer Profile →
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {showQuickNav && <div className="h-16" aria-hidden />}

        {/* Section Navigation - Fixed only after hero */}
        <div
          className={`bg-white border-b border-slate-200 shadow-sm h-16 ${
            showQuickNav ? 'fixed top-0 left-0 right-0 z-[999]' : 'relative'
          }`}
        >
          <div className="container max-w-7xl mx-auto h-16 flex items-center">
            <SectionNav />
          </div>
        </div>

        {/* Main Content Area - BELOW SectionNav */}
        <div className="w-full py-8">
          <div className="container max-w-7xl mx-auto px-4">
            {/* CRITICAL: Grid with proper gap, no negative margins */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
              {/* Main Content Column - No nested containers */}
              <main className="w-full min-w-0 space-y-8">
                {/* About Section */}
                <section className="w-full">
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                      <CardTitle className="font-bold text-slate-900">
                        About {development.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div
                        className={`text-slate-600 leading-relaxed whitespace-pre-line overflow-hidden transition-all duration-300 ${isExpanded ? '' : 'line-clamp-6'}`}
                      >
                        {development.description ||
                          'Experience luxury living in this exclusive new development. Providing state-of-the-art amenities and modern architectural design, this is the perfect place to call home.'}
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-blue-600 font-medium mt-4 hover:text-blue-700"
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        {isExpanded ? 'Show Less' : 'Read Full Description'}
                      </Button>
                    </CardContent>
                  </Card>
                </section>

                <Separator className="bg-slate-200" />

                {/* Floor Plans Section - CRITICAL: Carousel overflow contained */}
                <section id="units" className="w-full">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-900">Available Units</h3>
                  </div>

                  {(() => {
                    // Use the normalized units from the development object
                    const validUnits = (development.units || []).filter((u: any) => {
                      const bed = Number(u.bedrooms);
                      return Number.isFinite(bed) && bed >= 0;
                    });

                    if (validUnits.length === 0) {
                      return (
                        <div className="w-full text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                          <Home className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="text-slate-500 font-medium">Detailed unit configurations coming soon.</p>
                          <p className="text-xs text-slate-400">Contact the developer for floor plans.</p>
                        </div>
                      );
                    }

                    const bedroomCounts = Array.from(
                      new Set(validUnits.map((u: any) => Number(u.bedrooms))),
                    ).sort((a: any, b: any) => a - b);
                    const defaultTab = bedroomCounts[0]?.toString() || '0';

                    return (
                      <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="bg-transparent p-0 flex flex-wrap gap-2 h-auto mb-6 justify-start">
                          {bedroomCounts.map((count: any) => {
                            const unitsInGroup = validUnits.filter(
                              (u: any) => Number(u.bedrooms) === count,
                            );
                            const types = Array.from(
                              new Set(unitsInGroup.map((u: any) => u.normalizedType)),
                            );

                            // Smart Group Labeling
                            let label = 'Apartments';
                            const lowerTypes = types.map((t: any) => t.toLowerCase());
                            if (lowerTypes.every(t => t.includes('house') || t.includes('simplex') || t.includes('duplex'))) label = 'Houses';
                            else if (types.length === 1) label = `${types[0]}s`;

                            return (
                              <TabsTrigger
                                key={count}
                                value={count.toString()}
                                className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 shadow-sm transition-all"
                              >
                                {count} Bedroom{' '}
                                <span className="ml-1 opacity-70 font-normal">{label}</span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>

                        {bedroomCounts.map((count: any) => (
                          <TabsContent
                            key={count}
                            value={count.toString()}
                            className="mt-0 focus-visible:outline-none"
                          >
                            <UnitTypeCarousel
                              units={validUnits.filter((u: any) => Number(u.bedrooms) === count)}
                            />
                          </TabsContent>
                        ))}
                      </Tabs>
                    );
                  })()}
                </section>

                {/* Specifications */}
                {(() => {
                  const estateSpecs = (dev as any).estateSpecs || {};
                  const hasEstateSpecs =
                    estateSpecs.ownershipType || estateSpecs.powerBackup || estateSpecs.waterSupply;

                  const formatLabel = (value: string) => {
                    if (!value) return '';
                    return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  };

                  const specs: Array<{ icon: any; label: string; value: string }> = [];

                  if (hasEstateSpecs) {
                    if (estateSpecs.ownershipType) {
                      specs.push({
                        icon: Home,
                        label: 'Ownership Type',
                        value: formatLabel(estateSpecs.ownershipType),
                      });
                    }
                    if (estateSpecs.powerBackup && estateSpecs.powerBackup !== 'none') {
                      specs.push({
                        icon: Zap,
                        label: 'Power Backup',
                        value: formatLabel(estateSpecs.powerBackup),
                      });
                    }
                    if (estateSpecs.securityFeatures?.length > 0) {
                      const secCount = estateSpecs.securityFeatures.length;
                      specs.push({
                        icon: Shield,
                        label: 'Security',
                        value:
                          secCount > 2
                            ? `${secCount} Features`
                            : estateSpecs.securityFeatures.map(formatLabel).join(', '),
                      });
                    }
                    if (estateSpecs.waterSupply) {
                      specs.push({
                        icon: Droplets,
                        label: 'Water Supply',
                        value: formatLabel(estateSpecs.waterSupply),
                      });
                    }
                    if (estateSpecs.internetAccess && estateSpecs.internetAccess !== 'none') {
                      specs.push({
                        icon: Wifi,
                        label: 'Internet',
                        value: formatLabel(estateSpecs.internetAccess),
                      });
                    }
                    if (estateSpecs.flooring) {
                      specs.push({
                        icon: Layers,
                        label: 'Flooring',
                        value: formatLabel(estateSpecs.flooring),
                      });
                    }
                    if (estateSpecs.parkingType && estateSpecs.parkingType !== 'none') {
                      specs.push({
                        icon: Car,
                        label: 'Parking',
                        value: formatLabel(estateSpecs.parkingType),
                      });
                    }
                    if (estateSpecs.petFriendly) {
                      specs.push({
                        icon: CheckCircle2,
                        label: 'Pet Friendly',
                        value: formatLabel(estateSpecs.petFriendly),
                      });
                    }
                    if (estateSpecs.electricitySupply) {
                      specs.push({
                        icon: Zap,
                        label: 'Electricity',
                        value: formatLabel(estateSpecs.electricitySupply),
                      });
                    }
                  }

                  if (specs.length === 0) return null;

                  return (
                    <section id="specifications" className="w-full">
                      <Card className="shadow-sm border border-slate-200 bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                          <CardTitle className="font-bold text-slate-900">
                            Development Specifications
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {specs.map((spec, index) => {
                              const IconComponent = spec.icon;
                              return (
                                <div
                                  key={index}
                                  className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg"
                                >
                                  <IconComponent className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-500">{spec.label}</p>
                                    <p className="font-semibold text-slate-900 capitalize">
                                      {spec.value}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  );
                })()}

                {/* Amenities */}
                {development.amenities.length > 0 && (
                  <>
                    <Separator className="bg-slate-200" />
                    <section id="amenities" className="w-full">
                      <div className="mb-6">
                        <h3 className="text-2xl font-bold text-slate-900">Lifestyle & Features</h3>
                      </div>

                      <Tabs
                        value={activeAmenityTab as string}
                        onValueChange={value => setActiveAmenityTab(value as AmenityTabKey)}
                        className="w-full"
                      >
                        <div className="relative">
                          {canScrollAmenityLeft && (
                            <button
                              type="button"
                              aria-label="Scroll tabs left"
                              onClick={() =>
                                amenityTabsRef.current?.scrollBy({ left: -220, behavior: 'smooth' })
                              }
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <ChevronLeft className="h-4 w-4 mx-auto" />
                            </button>
                          )}
                          {canScrollAmenityRight && (
                            <button
                              type="button"
                              aria-label="Scroll tabs right"
                              onClick={() =>
                                amenityTabsRef.current?.scrollBy({ left: 220, behavior: 'smooth' })
                              }
                              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <ChevronRight className="h-4 w-4 mx-auto" />
                            </button>
                          )}

                          <div
                            ref={amenityTabsRef}
                            className="overflow-x-auto scrollbar-hide pb-2 px-10"
                          >
                            <TabsList className="bg-transparent p-0 h-auto inline-flex w-max flex-nowrap gap-2">
                              {amenityTabs.map(tab => {
                                const Icon = tab.icon || CheckCircle2;
                                const isActive = tab.key === activeAmenityTab;
                                return (
                                  <TabsTrigger
                                    key={tab.key}
                                    value={tab.key}
                                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm border ${
                                      isActive
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                    <Badge
                                      variant="secondary"
                                      className={`ml-1 h-5 px-1.5 ${
                                        isActive
                                          ? 'bg-white/15 text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {tab.count}
                                    </Badge>
                                  </TabsTrigger>
                                );
                              })}
                            </TabsList>
                          </div>
                        </div>

                        {amenityTabs.map(tab => (
                          <TabsContent key={tab.key} value={tab.key} className="mt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {(amenityGroups[tab.key] || []).map(item => (
                                <div
                                  key={item.key}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                  {item.label}
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </section>
                  </>
                )}


                <Separator className="bg-slate-200" />

                {/* Developer Overview */}
                <section id="developer" className="w-full">
                  <DeveloperOverview
                    developerName={development.developer}
                    developerLogo={development.developerLogo}
                  />
                </section>

                <Separator className="bg-slate-200" />

                {/* Location Section */}
                <section id="location" className="w-full space-y-6">
                  <NearbyLandmarks
                    property={{
                      id: dev.id,
                      title: dev.name,
                      latitude: dev.latitude || '0',
                      longitude: dev.longitude || '0',
                    }}
                  />

                  <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                      <SuburbInsights
                        suburbId={dev.suburbId || 0}
                        suburbName={dev.suburb || dev.city}
                        isDevelopment={true}
                      />
                    </CardContent>
                  </Card>

                  <LocalityGuide
                    suburb={dev.suburb || dev.city}
                    city={dev.city}
                    province={dev.province}
                  />
                </section>
              </main >

              {/* Sidebar - CRITICAL: Proper sticky positioning */}
              < aside className="w-full lg:w-[360px] space-y-4 self-stretch" >
                {/* Sticky wrapper with proper constraints */}
                < div
                  className="sticky self-start space-y-4"
                  style={{ top: showQuickNav ? 64 : 96 }}
                >
                  {/* Contact Form */}
                  < Card className="shadow-sm border-slate-200" >
                    <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-4">
                      <CardTitle className="text-sm font-bold text-slate-800">
                        Interested in This Development?
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2.5">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white h-10 text-sm font-semibold shadow-sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download Brochure
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-10 border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Schedule a Viewing
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full h-9 text-slate-600 hover:text-slate-900 text-xs"
                      >
                        <Mail className="mr-2 h-3.5 w-3.5" />
                        Contact Sales Team
                      </Button>
                    </CardContent>
                  </Card >
                </div >
              </aside >
            </div >
          </div >
        </div >
      </div >

      {/* Footer - Outside main container */}
      < Footer />

      {/* Lightbox - Portal */}
      < MediaLightbox
        media={development.unifiedMedia}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={lightboxTitle}
      />
    </>
  );
}
