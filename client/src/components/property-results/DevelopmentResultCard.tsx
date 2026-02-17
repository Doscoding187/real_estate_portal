import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { ChevronLeft, ChevronRight, FileText, Phone, Star } from 'lucide-react';
import { useLocation } from 'wouter';

type DevelopmentImage =
  | string
  | {
      url?: string;
      imageUrl?: string;
    };

export interface DevelopmentResultCardProps {
  id: number | string;
  name: string;
  slug?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  status?: string | null;
  isFeatured?: boolean | null;
  rating?: number | null;
  highlights?: string[];
  builderName?: string | null;
  builderLogoUrl?: string | null;
  description?: string | null;
  configurations?: Array<{ label?: string; priceFrom?: number | null }>;
  images?: DevelopmentImage[];
}

function resolveDevelopmentImage(images?: DevelopmentImage[]) {
  if (!images || images.length === 0) return 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
  const first = images[0];
  if (typeof first === 'string') return first;
  return first.url || first.imageUrl || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
}

function getImageCount(images?: DevelopmentImage[]) {
  if (!Array.isArray(images) || images.length === 0) return 0;
  return images.length;
}

function formatShortPrice(value?: number | null) {
  if (typeof value !== 'number' || value <= 0) return '-';
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R${Math.round(value / 1_000)}K`;
  return `R${value.toLocaleString()}`;
}

function toTitleCaseWords(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DevelopmentResultCard({
  id,
  name,
  slug,
  suburb,
  city,
  province,
  status,
  isFeatured,
  rating,
  highlights,
  builderName,
  builderLogoUrl,
  description,
  configurations,
  images,
}: DevelopmentResultCardProps) {
  const [, setLocation] = useLocation();
  const [configCarouselApi, setConfigCarouselApi] = useState<CarouselApi>();
  const [canScrollConfigPrev, setCanScrollConfigPrev] = useState(false);
  const [canScrollConfigNext, setCanScrollConfigNext] = useState(false);
  const href = `/development/${slug || id}`;
  const locationLabel = [suburb, city, province].filter(Boolean).join(', ');
  const builderDisplayName = builderName?.trim() ? toTitleCaseWords(builderName.trim()) : '-';
  const hasBuilderName = builderDisplayName !== '-';
  const [builderFirstWord, ...builderRestWords] = hasBuilderName
    ? builderDisplayName.split(/\s+/)
    : ['-'];
  const builderSecondLine = builderRestWords.join(' ');
  const builderInitials = hasBuilderName ? builderDisplayName.slice(0, 2).toUpperCase() : 'D';
  const statusLabel = status ? status.replace(/-/g, ' ') : null;
  const imageCount = getImageCount(images);
  const imageIndicatorCount = Math.max(1, Math.min(imageCount, 5));
  const displayConfigs = (
    Array.isArray(configurations) ? configurations : []
  )
    .slice(0)
    .map(cfg => ({
      label: cfg.label || '-',
      price:
        typeof cfg.priceFrom === 'number' && cfg.priceFrom > 0
          ? `From ${formatShortPrice(cfg.priceFrom)}`
          : '-',
    }));

  useEffect(() => {
    if (!configCarouselApi) return;

    const onSelect = () => {
      setCanScrollConfigPrev(configCarouselApi.canScrollPrev());
      setCanScrollConfigNext(configCarouselApi.canScrollNext());
    };

    onSelect();
    configCarouselApi.on('select', onSelect);
    configCarouselApi.on('reInit', onSelect);

    return () => {
      configCarouselApi.off('select', onSelect);
      configCarouselApi.off('reInit', onSelect);
    };
  }, [configCarouselApi]);

  return (
    <div className="w-full max-w-[760px] overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative h-52 flex-shrink-0 sm:h-auto sm:w-80" onClick={() => setLocation(href)}>
          <img
            src={resolveDevelopmentImage(images)}
            alt={name}
            loading="lazy"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            }}
            className="h-full w-full object-cover"
          />
          {isFeatured && (
            <span className="absolute top-2 left-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground tracking-wider">
              Featured
            </span>
          )}
          {imageCount > 1 && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {Array.from({ length: imageIndicatorCount }).map((_, i) => (
                <div key={i} className="h-1.5 w-4 rounded-full bg-primary-foreground/50" />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 overflow-hidden p-5 pr-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2">
                <h3
                  className="cursor-pointer line-clamp-1 text-lg font-semibold text-foreground"
                  onClick={() => setLocation(href)}
                >
                  {name}
                </h3>
                {typeof rating === 'number' && rating > 0 && (
                  <div className="flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    <span className="text-[10px] font-bold text-primary">
                      {rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{locationLabel || '-'}</p>
            </div>
            {statusLabel && (
              <Badge className="shrink-0 border border-primary/20 bg-primary/10 text-[10px] font-bold uppercase text-primary">
                {statusLabel}
              </Badge>
            )}
          </div>

          {/* Configurations Carousel */}
          <div className="mt-4 pr-2">
            {displayConfigs.length > 0 ? (
              <div className="group relative">
                <Carousel
                  setApi={setConfigCarouselApi}
                  opts={{ align: 'start', containScroll: 'trimSnaps' }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    {displayConfigs.map((config, index) => (
                      <CarouselItem
                        key={`cfg-${index}-${config.label}-${config.price}`}
                        className="basis-1/2 pl-2 md:basis-1/3"
                      >
                        <div className="min-w-0 rounded-md border bg-muted/30 px-2.5 py-2">
                          <p className="truncate text-[11px] text-muted-foreground">{config.label}</p>
                          <p className="truncate whitespace-nowrap text-xs font-semibold text-foreground">
                            {config.price}
                          </p>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={[
                    'absolute left-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-sm',
                    'opacity-0 pointer-events-none transition-opacity',
                    'group-hover:opacity-100 group-hover:pointer-events-auto',
                    'group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
                    canScrollConfigPrev ? '' : 'hidden',
                  ].join(' ')}
                  onClick={e => {
                    e.stopPropagation();
                    configCarouselApi?.scrollPrev();
                  }}
                  disabled={!canScrollConfigPrev}
                  aria-label="Previous configurations"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={[
                    'absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/90 shadow-sm',
                    'opacity-0 pointer-events-none transition-opacity',
                    'group-hover:opacity-100 group-hover:pointer-events-auto',
                    'group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
                    canScrollConfigNext ? '' : 'hidden',
                  ].join(' ')}
                  onClick={e => {
                    e.stopPropagation();
                    configCarouselApi?.scrollNext();
                  }}
                  disabled={!canScrollConfigNext}
                  aria-label="Next configurations"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" />
              </div>
            ) : (
              <div className="w-full rounded-md border bg-muted/30 px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">Unit Type</p>
                <p className="text-xs font-semibold text-foreground">-</p>
              </div>
            )}
          </div>

          {/* Highlights */}
          {Array.isArray(highlights) && highlights.length > 0 && (
            <div className="mt-4 pr-3">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                {highlights.slice(0, 3).map((h, index) => (
                  <span
                    key={`highlight-${index}-${h}`}
                    className="max-w-[170px] shrink-0 truncate rounded border border-primary/15 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <p className="mt-4 line-clamp-3 pr-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          {/* Builder & Actions */}
          <div className="mt-5 flex flex-col gap-3 pr-0.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={builderLogoUrl || ''} alt={builderDisplayName || 'Developer'} />
                <AvatarFallback className="text-[10px]">{builderInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                <p className="line-clamp-2 break-words text-xs font-semibold leading-snug text-foreground">
                  {builderFirstWord}
                  {builderSecondLine ? <><br />{builderSecondLine}</> : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-primary px-2 text-[10px] text-primary hover:bg-primary/10"
              >
                <FileText className="h-3 w-3" />
                Brochure
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1 bg-primary px-2 text-[10px] text-primary-foreground hover:bg-primary/90"
              >
                <Phone className="h-3 w-3" />
                View Number
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
