import {
  ArrowRight,
  BedDouble,
  Building2,
  Camera,
  Check,
  CircleDollarSign,
  Download,
  Info,
  LandPlot,
  MapPin,
  Maximize,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatBrochureCurrency,
  getMinimumBrochureQualifyingIncome,
} from '@/lib/distributionBrochure';
import {
  formatDevelopmentTypeLabel,
  formatCompactOpportunityModePrice,
  formatOpportunityCountRange,
  formatOpportunityMeasureRange,
  hasPublishedMode,
  summarizeOpportunityUnitNumbers,
  type OpportunityModeProjection,
} from '@/lib/distributionOpportunityFormat';

export type DevelopmentOpportunityCardProps = {
  item: any;
  marketMode: 'sale' | 'rent';
  onViewDetails?: (item: any) => void;
  onDownloadBrochure?: (item: any) => void;
  selected?: boolean;
  onToggleSelected?: (item: any) => void;
  variant?: 'catalogue' | 'select';
};

/**
 * The one development opportunity card. The catalogue and the referral
 * selection dashboard both render it so a development is never described twice
 * in two different ways.
 */
export default function DevelopmentOpportunityCard({
  item,
  marketMode,
  onViewDetails,
  onDownloadBrochure,
  selected = false,
  onToggleSelected,
  variant = 'catalogue',
}: DevelopmentOpportunityCardProps) {
  const mode = item.inventory?.modes?.[marketMode] as OpportunityModeProjection | undefined;
  const modeIsPublished = hasPublishedMode(mode);
  const currencyCode = item.program?.currencyCode || 'ZAR';
  const openForReferral = Boolean(item.opportunity?.openForReferral);
  const developmentType = formatDevelopmentTypeLabel(item.campaign?.developmentType);
  const imageCount = Array.isArray(item.campaign?.images) ? item.campaign.images.length : 0;
  const description = item.campaign?.description || item.campaign?.tagline;
  const minimumQualifyingIncome =
    marketMode === 'sale' ? getMinimumBrochureQualifyingIncome(item) : null;
  const selectable = variant === 'select';
  const unitTypes = Array.isArray(item.unitTypes) ? item.unitTypes : [];
  const publishedUnitTypes = unitTypes.filter(unitType => {
    const unitMode = unitType?.modes?.[marketMode];
    return unitMode ? hasPublishedMode(unitMode) : true;
  });
  const bedroomRange = summarizeOpportunityUnitNumbers(
    publishedUnitTypes,
    unitType => (unitType.bedrooms as number | null | undefined) ?? null,
  );
  const houseSizeRange = summarizeOpportunityUnitNumbers(
    publishedUnitTypes,
    unitType => (unitType.size as number | null | undefined) ?? null,
  );
  const yardSizeRange = summarizeOpportunityUnitNumbers(
    publishedUnitTypes,
    unitType => (unitType.yardSize as number | null | undefined) ?? null,
  );
  const bedroomLabel = formatOpportunityCountRange(bedroomRange, 'bed');
  const houseSizeLabel = formatOpportunityMeasureRange(houseSizeRange);
  const yardSizeLabel = formatOpportunityMeasureRange(yardSizeRange);
  const priceLabel = modeIsPublished
    ? formatCompactOpportunityModePrice(mode, currencyCode, marketMode === 'rent')
    : selectable
      ? 'Price on request'
      : 'Current price not yet published';

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm',
        selectable
          ? 'w-full'
          : 'w-[86%] shrink-0 snap-start sm:w-[calc((100%_-_1.5rem)/2.3)] xl:w-[calc((100%_-_1.5rem)/3_+_6px)]',
      )}
    >
      <div className="relative">
        {selectable ? (
          <label className="absolute right-3 top-3 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-[#9cc0ee] bg-white/95 shadow-sm">
            <input
              type="checkbox"
              className="sr-only"
              checked={selected}
              onChange={() => onToggleSelected?.(item)}
              aria-label={`Select ${item.developmentName}`}
            />
            <span
              className={cn(
                'flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition',
                selected ? 'border-[#1d6fe3] bg-[#1d6fe3] text-white' : 'border-[#9cc0ee] bg-white',
              )}
            >
              {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
          </label>
        ) : null}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.developmentName}
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-[#eef4fc]">
            <Building2 className="h-8 w-8 text-[#9cc0ee]" />
          </div>
        )}
        {!selectable ? (
          <span
            className={cn(
              'absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
              modeIsPublished
                ? 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]'
                : 'border-border bg-white/95 text-muted-foreground',
            )}
          >
            {modeIsPublished ? <Check className="h-3 w-3" /> : <Info className="h-3 w-3" />}
            {modeIsPublished ? 'Available to explore' : 'Awaiting availability'}
          </span>
        ) : null}
        {!selectable && imageCount > 1 ? (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            <Camera className="h-3 w-3" /> {imageCount}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-[16px] font-semibold leading-snug text-[#0b1c3f]">
          {item.developmentName}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {[item.city, item.province].filter(Boolean).join(', ') || 'Location to be confirmed'}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
          {bedroomLabel ? (
            <span className="inline-flex items-center gap-1.5" title="Bedrooms">
              <BedDouble className="h-3.5 w-3.5 shrink-0" /> {bedroomLabel}
            </span>
          ) : null}
          {houseSizeLabel ? (
            <span className="inline-flex items-center gap-1.5" title="House size">
              <Maximize className="h-3.5 w-3.5 shrink-0" /> {houseSizeLabel}
            </span>
          ) : null}
          {yardSizeLabel ? (
            <span className="inline-flex items-center gap-1.5" title="Yard size">
              <LandPlot className="h-3.5 w-3.5 shrink-0" /> {yardSizeLabel}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5" title="Price">
            <CircleDollarSign className="h-3.5 w-3.5 shrink-0" /> {priceLabel}
          </span>
        </div>

        {!selectable ? (
          <>
            {developmentType || modeIsPublished ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-muted-foreground">
                {developmentType ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> {developmentType}
                  </span>
                ) : null}
                {modeIsPublished ? (
                  <span>
                    {mode.availableCount} {marketMode === 'sale' ? 'home' : 'rental'}
                    {mode.availableCount === 1 ? '' : 's'} available
                  </span>
                ) : null}
              </div>
            ) : null}

            {minimumQualifyingIncome ? (
              <p
                className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-5 text-[#33507e]"
                title="Indicative only: a 240-month bond at the SARB prime rate (platform settings) with repayments at 30% of gross monthly income. Not a lender decision."
              >
                <span>
                  Minimum qualifying income{' '}
                  <span className="font-semibold text-[#0b1c3f]">
                    {formatBrochureCurrency(minimumQualifyingIncome)}
                  </span>
                </span>
              </p>
            ) : null}

            {description ? (
              <p className="mt-2 line-clamp-3 text-[13px] leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}

            <p
              className={cn(
                'mt-3 flex items-start gap-1.5 text-[12px] leading-5',
                openForReferral ? 'text-[#2f8f4e]' : 'text-muted-foreground',
              )}
              title={item.opportunity?.friendlyMessage || undefined}
            >
              {openForReferral ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              {openForReferral ? 'Open for referral' : 'Referral access: check programme'}
            </p>
          </>
        ) : null}

        {selectable ? (
          <div className="mt-auto pt-4">
            <Button
              variant={selected ? 'conversion' : 'outline'}
              className={cn(
                'h-10 w-full whitespace-nowrap text-[13px] font-semibold',
                !selected && 'border-[#9cc0ee] text-[#1d6fe3] hover:bg-[#eff5fe]',
              )}
              onClick={() => onDownloadBrochure?.(item)}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download brochure
            </Button>
          </div>
        ) : (
          <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-3">
            <Button
              variant="outline"
              className="flex-1 whitespace-nowrap px-2.5 text-[13px]"
              onClick={() => onViewDetails?.(item)}
            >
              View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="whitespace-nowrap px-2.5 text-[13px]"
              onClick={() => onDownloadBrochure?.(item)}
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Brochure
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
