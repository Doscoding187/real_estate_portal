import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Info,
  MapPin,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPartnerDateTime } from '@/lib/distributionPartnerJourney';
import {
  formatDevelopmentTypeLabel,
  formatOpportunityModePrice,
  hasPublishedMode,
  type OpportunityModeProjection,
} from '@/lib/distributionOpportunityFormat';
import { UnitMediaFolder } from './UnitMediaFolder';

export function DevelopmentUnitsDialog({
  open,
  onOpenChange,
  item,
  marketMode,
  onStartReferral,
  onOpenHowReferring,
  onOpenBrochure,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  marketMode: 'sale' | 'rent';
  onStartReferral: () => void;
  onOpenHowReferring: () => void;
  onOpenBrochure?: () => void;
}) {
  const mode = item?.inventory?.modes?.[marketMode] as OpportunityModeProjection | undefined;
  const modeIsPublished = hasPublishedMode(mode);
  const currencyCode = item?.program?.currencyCode || 'ZAR';
  const openForReferral = Boolean(item?.opportunity?.openForReferral);
  const canStartReferral = openForReferral && modeIsPublished;
  const unitTypes = Array.isArray(item?.unitTypes) ? item.unitTypes : [];
  const developmentType = formatDevelopmentTypeLabel(item?.campaign?.developmentType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#0b1c3f]">{item?.developmentName}</DialogTitle>
          <DialogDescription>
            {item?.locationLabels?.join(', ') ||
              'Location to be confirmed'}
            {' · '}
            {marketMode === 'sale' ? 'Homes for sale' : 'Rental homes'} available in this
            development.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                openForReferral
                  ? 'border-[#cde9d2] bg-[#f5fcf6] text-[#2f8f4e]'
                  : 'border-[#f5d9a8] bg-[#fffbf2] text-[#b07a1e]',
              )}
            >
              {openForReferral ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Info className="h-3 w-3" />
              )}
              {openForReferral ? 'Open for referral' : 'Referral access: check programme'}
            </span>
            {developmentType ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Building2 className="h-3 w-3" /> {developmentType}
              </span>
            ) : null}
          </div>

          <section className="rounded-lg border border-border bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Current availability
            </p>
            <p className="mt-2 text-[13.5px] font-semibold text-[#0b1c3f]">
              {modeIsPublished
                ? `${mode.availableCount} ${marketMode === 'sale' ? 'home' : 'rental'}${mode.availableCount === 1 ? '' : 's'} currently listed · ${formatOpportunityModePrice(mode, currencyCode, marketMode === 'rent')}`
                : `The developer has not published current ${marketMode === 'sale' ? 'sale' : 'rental'} availability for this development yet.`}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              Checked {formatPartnerDateTime(item?.developerProjectionObservedAt)}. Confirm current
              stock before proceeding.
            </p>
          </section>

          <section>
            <p className="text-sm font-semibold text-[#0b1c3f]">
              {marketMode === 'sale' ? 'Homes available' : 'Rentals available'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Unit details the developer has published for this development.
            </p>
            <div className="mt-2 space-y-2">
              {unitTypes.map((unitType: any) => {
                const unitMode = unitType?.modes?.[marketMode] as
                  | OpportunityModeProjection
                  | undefined;
                const unitIsPublished = hasPublishedMode(unitMode);
                const details = [
                  unitType?.bedrooms === null || unitType?.bedrooms === undefined
                    ? null
                    : `${unitType.bedrooms} bed${unitType.bedrooms === 1 ? '' : 's'}`,
                  unitType?.bathrooms === null || unitType?.bathrooms === undefined
                    ? null
                    : `${unitType.bathrooms} bath${unitType.bathrooms === 1 ? '' : 's'}`,
                  unitType?.size ? `${unitType.size} m²` : null,
                ].filter(Boolean);
                return (
                  <div key={unitType.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0b1c3f]">{unitType.name}</p>
                        {details.length ? (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {details.join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        {unitIsPublished ? (
                          <>
                            <p className="text-[13.5px] font-semibold text-[#0b1c3f]">
                              {formatOpportunityModePrice(unitMode, currencyCode, marketMode === 'rent')}
                            </p>
                            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                              {unitMode.availableCount} available
                            </p>
                          </>
                        ) : (
                          <p className="text-[12px] text-muted-foreground">
                            Not currently available
                          </p>
                        )}
                      </div>
                    </div>
                    <UnitMediaFolder unitName={unitType.name} media={unitType.media} />
                  </div>
                );
              })}
              {!unitTypes.length ? (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  The developer has not published unit-level details for this development yet.
                </p>
              ) : null}
            </div>
          </section>

          {item?.opportunity?.friendlyMessage ? (
            <p className="rounded-lg border border-[#cfe0f8] bg-[#eff5fe] p-3 text-[12.5px] leading-5 text-[#33507e]">
              {item.opportunity.friendlyMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {onOpenBrochure ? (
              <Button variant="outline" onClick={onOpenBrochure}>
                <FileText className="mr-2 h-4 w-4" /> Brochure
              </Button>
            ) : null}
            <Button variant="outline" onClick={onOpenHowReferring}>
              How referring works
            </Button>
            <Button variant="conversion" disabled={!canStartReferral} onClick={onStartReferral}>
              Start a referral <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
