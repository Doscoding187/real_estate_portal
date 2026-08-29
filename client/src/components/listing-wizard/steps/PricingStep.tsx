/**
 * Step 5: Pricing & Costs
 *
 * Sale and Rent use separate commercial contracts. Auction remains renderable
 * only for historical records; it is not a live Step 1 authoring choice.
 */

import React from 'react';
import { CalendarIcon, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CurrencyInput from '@/components/listing-wizard/CurrencyInput';
import type { AuctionPricing, RentPricing, SellPricing } from '@/../../shared/listing-types';
import {
  normalizeMoneyFact,
  type MoneyFactStatus,
  type RecurringChargeFact,
  type RecurringCostKey,
  type Negotiability,
} from '@/../../shared/pricing-contract';
import {
  createDefaultRentalTerms,
  normalizeRentalTerms,
  type RentalAvailability,
  type RentalLease,
  type RentalTerms,
} from '@/../../shared/rental-terms-contract';

const COSTS: Array<{ key: RecurringCostKey; label: string; help: string; cadence?: boolean }> = [
  {
    key: 'ratesAndTaxes',
    label: 'Rates & taxes',
    help: 'Municipal property charges. Do not estimate if you are not sure.',
  },
  {
    key: 'bodyCorporateLevy',
    label: 'Body corporate levy',
    help: 'Only add this when the property has a confirmed body corporate charge.',
  },
  {
    key: 'hoaEstateLevy',
    label: 'HOA / estate levy',
    help: 'Only add this when a homeowners or estate levy applies.',
  },
  {
    key: 'specialLevy',
    label: 'Special levy',
    help: 'Use the cadence selector for a one-off or non-monthly charge.',
    cadence: true,
  },
  {
    key: 'otherMandatoryCharge',
    label: 'Other mandatory charge',
    help: 'A required recurring property charge that does not fit the categories above.',
    cadence: true,
  },
];

const COST_STATUS_OPTIONS: Array<{ value: MoneyFactStatus | ''; label: string }> = [
  { value: '', label: 'Not answered' },
  { value: 'known', label: 'Known amount' },
  { value: 'zero', label: 'Confirmed R0' },
  { value: 'unknown', label: 'Not sure' },
  { value: 'not_applicable', label: 'Not applicable' },
];

const CADENCE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'once', label: 'One-off' },
  { value: 'unknown', label: 'Cadence not sure' },
] as const;

const formatAmount = (value?: number | null) =>
  value === undefined || value === null
    ? ''
    : `R ${value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`;

function RecurringCostRow({
  cost,
  fact,
  onChange,
}: {
  cost: (typeof COSTS)[number];
  fact?: RecurringChargeFact;
  onChange: (fact: RecurringChargeFact | undefined) => void;
}) {
  const status = fact?.status || '';
  const handleStatus = (nextStatus: MoneyFactStatus | '') => {
    if (!nextStatus) {
      onChange(undefined);
      return;
    }
    onChange({
      status: nextStatus,
      ...(nextStatus === 'known' && fact?.amount !== undefined ? { amount: fact.amount } : {}),
      ...(cost.cadence ? { cadence: fact?.cadence || 'monthly' } : {}),
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label
            htmlFor={`pricing-${cost.key}-status`}
            className="text-sm font-semibold text-slate-800"
          >
            {cost.label}
          </Label>
          <p className="mt-1 text-xs text-slate-500">{cost.help}</p>
        </div>
        <select
          id={`pricing-${cost.key}-status`}
          aria-label={`${cost.label} status`}
          value={status}
          onChange={event => handleStatus(event.target.value as MoneyFactStatus | '')}
          className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          {COST_STATUS_OPTIONS.map(option => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {fact?.status === 'known' && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`pricing-${cost.key}-amount`} className="text-xs text-slate-600">
              Amount (R)
            </Label>
            <CurrencyInput
              id={`pricing-${cost.key}-amount`}
              aria-label={`${cost.label} amount`}
              value={fact.amount}
              onValueChange={amount =>
                onChange({
                  ...fact,
                  status: 'known',
                  amount: amount ?? undefined,
                })
              }
              placeholder="0"
              className="mt-1"
            />
          </div>
          {cost.cadence && (
            <div>
              <Label htmlFor={`pricing-${cost.key}-cadence`} className="text-xs text-slate-600">
                Frequency
              </Label>
              <select
                id={`pricing-${cost.key}-cadence`}
                aria-label={`${cost.label} frequency`}
                value={fact.cadence || 'monthly'}
                onChange={event =>
                  onChange({
                    ...fact,
                    status: 'known',
                    cadence: event.target.value as RecurringChargeFact['cadence'],
                  })
                }
                className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {CADENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      {fact?.status === 'zero' && (
        <p className="mt-2 text-xs font-medium text-slate-600">
          Confirmed as R0 — not an unknown amount.
        </p>
      )}
      {fact?.status === 'unknown' && (
        <p className="mt-2 text-xs font-medium text-amber-700">
          This will be shown as “To confirm” to prospects.
        </p>
      )}
    </div>
  );
}

const SellPricingForm: React.FC<{
  pricing?: SellPricing;
  setPricing: (pricing: SellPricing) => void;
}> = ({ pricing = {}, setPricing }) => {
  const update = (patch: Partial<SellPricing>) => setPricing({ ...pricing, ...patch });
  const recurringCosts = pricing.recurringCosts || {};

  const updateCost = (key: RecurringCostKey, fact: RecurringChargeFact | undefined) => {
    const nextCosts = { ...recurringCosts };
    if (fact) nextCosts[key] = fact;
    else delete nextCosts[key];
    update({ recurringCosts: nextCosts });
  };

  const negotiability: Negotiability =
    pricing.negotiability ||
    (pricing.negotiable === true
      ? 'negotiable'
      : pricing.negotiable === false
        ? 'not_negotiable'
        : 'unknown');

  return (
    <Card className="space-y-6 p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
          Pricing & Costs
        </p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">Set the sale terms</h3>
        <p className="mt-1 text-sm text-slate-500">
          Give buyers a clear asking price and any ownership costs you know.
        </p>
      </div>

      <div>
        <Label htmlFor="askingPrice" className="text-sm font-semibold text-slate-800">
          Asking price (R) <span className="text-red-500">*</span>
        </Label>
        <CurrencyInput
          id="askingPrice"
          aria-label="Asking price in Rand"
          value={pricing.askingPrice}
          onValueChange={askingPrice => update({ askingPrice })}
          placeholder="2 500 000"
          className="mt-2 h-12 text-lg"
        />
        {pricing.askingPrice !== undefined && (
          <p className="mt-1 text-xs text-slate-500">{formatAmount(pricing.askingPrice)}</p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-800">Is the price negotiable?</legend>
        <div
          className="grid gap-2 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Price negotiability"
        >
          {(
            [
              ['negotiable', 'Negotiable'],
              ['not_negotiable', 'Not negotiable'],
              ['unknown', 'Not sure'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                negotiability === value
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200'
              }`}
            >
              <input
                type="radio"
                name="negotiability"
                value={value}
                checked={negotiability === value}
                onChange={() =>
                  update({ negotiability: value, negotiable: value === 'negotiable' })
                }
                className="h-4 w-4 accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <section
        className="space-y-3 border-t border-slate-100 pt-5"
        aria-labelledby="ownership-costs-heading"
      >
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-600" />
            <h4 id="ownership-costs-heading" className="text-base font-semibold text-slate-900">
              Ownership costs
            </h4>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Add only charges that apply. Property type does not determine these costs.
          </p>
        </div>
        <div className="space-y-2">
          {COSTS.map(cost => (
            <RecurringCostRow
              key={cost.key}
              cost={cost}
              fact={recurringCosts[cost.key]}
              onChange={fact => updateCost(cost.key, fact)}
            />
          ))}
        </div>
      </section>

      <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        <strong>Pricing is your decision.</strong> Compare similar properties and use figures you
        can support. Buyers can confirm costs before making an offer.
      </div>
    </Card>
  );
};

const RentPricingForm: React.FC<{
  pricing?: RentPricing;
  setPricing: (pricing: RentPricing) => void;
  rentalTerms: RentalTerms;
  setRentalTerms: (rentalTerms: RentalTerms) => void;
}> = ({ pricing = {}, setPricing, rentalTerms, setRentalTerms }) => {
  const update = (patch: Partial<RentPricing>) => setPricing({ ...pricing, ...patch });
  const depositFact = pricing.depositFact || normalizeMoneyFact(pricing.deposit);
  const depositStatus = depositFact?.status || '';
  const updateRentalTerms = (patch: Partial<RentalTerms>) =>
    setRentalTerms({ ...rentalTerms, ...patch });

  const updateAvailability = (status: RentalAvailability['status']) => {
    if (status === 'available_from') {
      updateRentalTerms({
        availability:
          rentalTerms.availability.status === 'available_from'
            ? rentalTerms.availability
            : { status: 'available_from', date: format(new Date(), 'yyyy-MM-dd') },
      });
      return;
    }
    updateRentalTerms({ availability: { status } });
  };

  const updateLease = (status: RentalLease['status']) => {
    if (status === 'fixed_term') {
      updateRentalTerms({
        lease:
          rentalTerms.lease.status === 'fixed_term'
            ? rentalTerms.lease
            : { status: 'fixed_term', minimumMonths: 12 },
      });
      return;
    }
    updateRentalTerms({ lease: { status } });
  };

  const updateDepositStatus = (status: MoneyFactStatus | '') => {
    if (!status) {
      update({ depositFact: undefined });
      return;
    }
    update({
      depositFact: {
        status,
        ...(status === 'known' && depositFact?.amount !== undefined
          ? { amount: depositFact.amount }
          : {}),
        provenance: 'advertiser',
      },
    });
  };

  return (
    <Card className="space-y-6 p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
          Pricing & Costs
        </p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">Set the rental terms</h3>
        <p className="mt-1 text-sm text-slate-500">
          Give prospective tenants a clear monthly rent and deposit position.
        </p>
      </div>

      <div>
        <Label htmlFor="monthlyRent" className="text-sm font-semibold text-slate-800">
          Monthly rent (R) <span className="text-red-500">*</span>
        </Label>
        <CurrencyInput
          id="monthlyRent"
          aria-label="Monthly rent in Rand"
          value={pricing.monthlyRent}
          onValueChange={monthlyRent => update({ monthlyRent })}
          placeholder="18 000"
          className="mt-2 h-12 text-lg"
        />
        {pricing.monthlyRent !== undefined && (
          <p className="mt-1 text-xs text-slate-500">{formatAmount(pricing.monthlyRent)} / month</p>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-5">
        <div>
          <Label htmlFor="deposit-status" className="text-sm font-semibold text-slate-800">
            Deposit <span className="text-red-500">*</span>
          </Label>
          <p className="mt-1 text-sm text-slate-500">
            Choose what you know. Not sure is different from no deposit.
          </p>
        </div>
        <select
          id="deposit-status"
          aria-label="Deposit status"
          value={depositStatus}
          onChange={event => updateDepositStatus(event.target.value as MoneyFactStatus | '')}
          className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Choose a deposit position</option>
          <option value="known">Known amount</option>
          <option value="zero">Confirmed no deposit (R0)</option>
          <option value="unknown">Not sure</option>
        </select>
        {depositFact?.status === 'known' && (
          <CurrencyInput
            id="deposit"
            aria-label="Deposit amount in Rand"
            value={depositFact.amount}
            onValueChange={amount =>
              update({
                depositFact: { ...depositFact, status: 'known', amount, provenance: 'advertiser' },
              })
            }
            placeholder="10 000"
          />
        )}
        {depositFact?.status === 'zero' && (
          <p className="text-xs font-medium text-slate-600">
            Confirmed as R0 — no deposit is required.
          </p>
        )}
        {depositFact?.status === 'unknown' && (
          <p className="text-xs font-medium text-amber-700">
            This will be shown as “To confirm” to prospects.
          </p>
        )}
        {pricing.monthlyRent !== undefined && depositFact?.status !== 'known' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-0 text-blue-700 hover:bg-transparent hover:text-blue-800"
            onClick={() =>
              update({
                depositFact: {
                  status: 'known',
                  amount: pricing.monthlyRent,
                  provenance: 'advertiser',
                },
              })
            }
          >
            Use one month of rent as the deposit
          </Button>
        )}
      </div>

      <section
        className="space-y-4 border-t border-slate-100 pt-5"
        aria-labelledby="rental-essentials-heading"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
            Tenant decision facts
          </p>
          <h4 id="rental-essentials-heading" className="mt-1 text-base font-semibold text-slate-900">
            Rental essentials
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            These facts appear with the rental listing. Choose “To confirm” only when the
            representative still needs to verify the detail.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="rental-availability" className="text-sm font-semibold text-slate-800">
              Availability
            </Label>
            <select
              id="rental-availability"
              aria-label="Rental availability"
              value={rentalTerms.availability.status}
              onChange={event =>
                updateAvailability(event.target.value as RentalAvailability['status'])
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="available_now">Available now</option>
              <option value="available_from">Available from a date</option>
              <option value="to_confirm">To confirm</option>
            </select>
            {rentalTerms.availability.status === 'available_from' && (
              <Input
                aria-label="Available from date"
                type="date"
                value={rentalTerms.availability.date}
                onChange={event =>
                  updateRentalTerms({
                    availability: { status: 'available_from', date: event.target.value },
                  })
                }
                className="mt-2"
              />
            )}
          </div>

          <div>
            <Label htmlFor="rental-lease" className="text-sm font-semibold text-slate-800">
              Lease
            </Label>
            <select
              id="rental-lease"
              aria-label="Lease terms"
              value={rentalTerms.lease.status}
              onChange={event => updateLease(event.target.value as RentalLease['status'])}
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="fixed_term">Fixed-term lease</option>
              <option value="month_to_month">Month-to-month</option>
              <option value="to_confirm">To confirm</option>
            </select>
            {rentalTerms.lease.status === 'fixed_term' && (
              <div className="mt-2">
                <Label htmlFor="rental-minimum-months" className="text-xs text-slate-600">
                  Minimum lease (months)
                </Label>
                <Input
                  id="rental-minimum-months"
                  aria-label="Minimum lease months"
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={rentalTerms.lease.minimumMonths}
                  onChange={event =>
                    updateRentalTerms({
                      lease: {
                        status: 'fixed_term',
                        minimumMonths: Number(event.target.value) || 0,
                      },
                    })
                  }
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="rental-utilities" className="text-sm font-semibold text-slate-800">
              Utilities
            </Label>
            <select
              id="rental-utilities"
              aria-label="Utilities responsibility"
              value={rentalTerms.utilities}
              onChange={event =>
                updateRentalTerms({ utilities: event.target.value as RentalTerms['utilities'] })
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="included">Included in rent</option>
              <option value="not_included">Not included in rent</option>
              <option value="partially_included">Partly included</option>
              <option value="to_confirm">To confirm</option>
            </select>
          </div>

          <div>
            <Label htmlFor="rental-furnishing" className="text-sm font-semibold text-slate-800">
              Furnishing
            </Label>
            <select
              id="rental-furnishing"
              aria-label="Rental furnishing"
              value={rentalTerms.furnishing}
              onChange={event =>
                updateRentalTerms({ furnishing: event.target.value as RentalTerms['furnishing'] })
              }
              className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="furnished">Furnished</option>
              <option value="partly_furnished">Partly furnished</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="to_confirm">To confirm</option>
            </select>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        <strong>Clear terms build trust.</strong> A tenant can still enquire when a detail is marked
        “To confirm,” but we will never turn missing information into a claim.
      </div>
    </Card>
  );
};

const AuctionPricingForm: React.FC<{
  pricing?: AuctionPricing;
  setPricing: (pricing: AuctionPricing) => void;
}> = ({ pricing = {} as AuctionPricing, setPricing }) => {
  const [auctionDate, setAuctionDate] = React.useState<Date | undefined>(
    pricing.auctionDateTime ? new Date(pricing.auctionDateTime) : undefined,
  );
  const update = (patch: Partial<AuctionPricing>) => setPricing({ ...pricing, ...patch });

  return (
    <Card className="space-y-5 p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Historical listing
        </p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">Auction pricing</h3>
        <p className="mt-1 text-sm text-slate-500">
          Auction is retained for legacy records and is not a current live authoring choice.
        </p>
      </div>
      <div>
        <Label htmlFor="startingBid">Starting bid (R)</Label>
        <CurrencyInput
          id="startingBid"
          value={pricing.startingBid}
          onValueChange={startingBid => update({ startingBid: startingBid as number })}
          placeholder="1 500 000"
          className="mt-2"
        />
      </div>
      <div>
        <Label htmlFor="reservePrice">Reserve price (R)</Label>
        <CurrencyInput
          id="reservePrice"
          value={pricing.reservePrice}
          onValueChange={reservePrice => update({ reservePrice })}
          placeholder="Optional"
          className="mt-2"
        />
      </div>
      <div>
        <Label>Auction date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="mt-2 w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {auctionDate ? format(auctionDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={auctionDate}
              onSelect={date => {
                setAuctionDate(date);
                if (date) update({ auctionDateTime: date });
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div>
        <Label htmlFor="auctionTerms">Auction terms document URL</Label>
        <Input
          id="auctionTerms"
          value={pricing.auctionTermsDocumentUrl || ''}
          onChange={event => update({ auctionTermsDocumentUrl: event.target.value })}
          placeholder="Optional"
          className="mt-2"
        />
      </div>
    </Card>
  );
};

const PricingStep: React.FC = () => {
  const { action, pricing, setPricing, propertyDetails, setPropertyDetails } = useListingWizardStore();
  const rentalTerms = normalizeRentalTerms(propertyDetails?.rentalTerms) ?? createDefaultRentalTerms();
  const hasStoredRentalTerms = propertyDetails?.rentalTerms !== undefined;

  React.useEffect(() => {
    // Initialize a newly entered rental journey, but do not overwrite an
    // in-progress (and temporarily invalid) authored value while the user is
    // editing a date or lease length. Publish validation owns correctness.
    if (action !== 'rent' || hasStoredRentalTerms) return;
    setPropertyDetails({ ...propertyDetails, rentalTerms: createDefaultRentalTerms() });
  }, [action, hasStoredRentalTerms, propertyDetails, setPropertyDetails]);

  const setRentalTerms = (nextRentalTerms: RentalTerms) =>
    setPropertyDetails({ ...propertyDetails, rentalTerms: nextRentalTerms });

  if (!action) {
    return (
      <div className="py-8 text-center text-gray-500">Please select For Sale or To Rent first.</div>
    );
  }

  return (
    <div className="py-4">
      {action === 'sell' && (
        <SellPricingForm pricing={pricing as SellPricing} setPricing={setPricing} />
      )}
      {action === 'rent' && (
        <RentPricingForm
          pricing={pricing as RentPricing}
          setPricing={setPricing}
          rentalTerms={rentalTerms}
          setRentalTerms={setRentalTerms}
        />
      )}
      {action === 'auction' && (
        <AuctionPricingForm pricing={pricing as AuctionPricing} setPricing={setPricing} />
      )}
    </div>
  );
};

export default PricingStep;
