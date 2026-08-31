import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  COMMERCIAL_CONFIRMATION_SOURCE_LABELS,
  COMMERCIAL_CONFIRMATION_SOURCES,
  type CommercialConfirmationSource,
  type CommercialEconomicChargeBasis,
  type CommercialEconomicComponentCode,
  type CommercialSpecificationCode,
  type CommercialSpecificationValueState,
} from '@shared/commercial-domain';

const USE_TYPES = [
  {
    value: 'office',
    label: 'Office',
    defaultAssetKind: 'office_building',
    defaultSpaceKind: 'office_suite',
  },
  {
    value: 'industrial_logistics',
    label: 'Industrial & logistics',
    defaultAssetKind: 'industrial_park',
    defaultSpaceKind: 'warehouse',
  },
  {
    value: 'retail',
    label: 'Retail',
    defaultAssetKind: 'retail_centre',
    defaultSpaceKind: 'retail_unit',
  },
] as const;

type UseType = (typeof USE_TYPES)[number]['value'];
type AssetKind =
  | 'office_building'
  | 'industrial_park'
  | 'retail_centre'
  | 'standalone_premises'
  | 'mixed_use';
type SpaceKind = 'office_suite' | 'warehouse' | 'retail_unit' | 'whole_building' | 'yard';
type TruthValue = 'unknown' | 'yes' | 'no';
type PricingMode = 'componentised' | 'gross_quote';
type ConfirmationSource = CommercialConfirmationSource;
type EconomicComponentCode = Extract<
  CommercialEconomicComponentCode,
  | 'base_rent'
  | 'gross_rent'
  | 'operating_costs'
  | 'rates_recoveries'
  | 'parking'
  | 'fixed_levies'
  | 'utilities'
>;
type CommercialEconomicsDraft = {
  componentCode: EconomicComponentCode;
  valueState: 'supplied' | 'unknown';
  chargeBasis: CommercialEconomicChargeBasis | null;
  amountMinor: number | null;
  rangeMaximumMinor: null;
};
type CommercialSpecificationDraft = {
  specificationCode: CommercialSpecificationCode;
  valueState: CommercialSpecificationValueState;
  numericValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
};

const ASSET_KINDS: Record<UseType, readonly { value: AssetKind; label: string }[]> = {
  office: [
    { value: 'office_building', label: 'Office building' },
    { value: 'standalone_premises', label: 'Standalone premises' },
    { value: 'mixed_use', label: 'Mixed-use asset' },
  ],
  industrial_logistics: [
    { value: 'industrial_park', label: 'Industrial park' },
    { value: 'standalone_premises', label: 'Standalone premises' },
    { value: 'mixed_use', label: 'Mixed-use asset' },
  ],
  retail: [
    { value: 'retail_centre', label: 'Retail centre' },
    { value: 'standalone_premises', label: 'Standalone premises' },
    { value: 'mixed_use', label: 'Mixed-use asset' },
  ],
};

const SPACE_KINDS: Record<UseType, readonly { value: SpaceKind; label: string }[]> = {
  office: [
    { value: 'office_suite', label: 'Office suite' },
    { value: 'whole_building', label: 'Whole building' },
  ],
  industrial_logistics: [
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'yard', label: 'Yard' },
    { value: 'whole_building', label: 'Whole building' },
  ],
  retail: [
    { value: 'retail_unit', label: 'Retail unit' },
    { value: 'whole_building', label: 'Whole building' },
  ],
};

const toMinor = (value: string) => Math.round(Number(value || 0) * 100);
const money = (value: number) =>
  `R ${(value / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;
const localDateTimeInput = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};

function textSpecification(
  specificationCode: CommercialSpecificationCode,
  value: string,
): CommercialSpecificationDraft {
  return {
    specificationCode,
    valueState: value.trim() ? 'known' : 'unknown',
    numericValue: null,
    textValue: value.trim() || null,
    booleanValue: null,
  };
}

function numericSpecification(
  specificationCode: CommercialSpecificationCode,
  value: string,
): CommercialSpecificationDraft {
  return {
    specificationCode,
    valueState: value.trim() ? 'known' : 'unknown',
    numericValue: value.trim() ? Number(value) : null,
    textValue: null,
    booleanValue: null,
  };
}

function booleanSpecification(
  specificationCode: CommercialSpecificationCode,
  value: TruthValue,
): CommercialSpecificationDraft {
  return {
    specificationCode,
    valueState: value === 'unknown' ? 'unknown' : 'known',
    numericValue: null,
    textValue: null,
    booleanValue: value === 'unknown' ? null : value === 'yes',
  };
}

function fieldLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase());
}

export default function CommercialOfficeAuthoringWorkspace() {
  const create = trpc.commercial.createDraft.useMutation();
  const submit = trpc.commercial.submit.useMutation();
  const attach = trpc.commercial.attachMarketingMedia.useMutation();
  const upload = trpc.listing.uploadMedia.useMutation();
  const confirm = trpc.listing.confirmMediaUpload.useMutation();
  const [useType, setUseType] = useState<UseType>('office');
  const [assetKind, setAssetKind] = useState<AssetKind>('office_building');
  const [spaceKind, setSpaceKind] = useState<SpaceKind>('office_suite');
  const [assetMode, setAssetMode] = useState<'new' | 'existing'>('new');
  const [commercialAssetId, setCommercialAssetId] = useState('');
  const reusableAssets = trpc.commercial.reusableAssets.useQuery({ spaceClass: useType });
  const provinces = trpc.location.getLocationHierarchy.useQuery({ depth: 'province' });
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');
  const [suburbId, setSuburbId] = useState('');
  const cities = trpc.location.getLocationHierarchy.useQuery(
    { depth: 'city', provinceId: Number(provinceId) || undefined },
    { enabled: Boolean(provinceId) },
  );
  const suburbs = trpc.location.getLocationHierarchy.useQuery(
    { depth: 'suburb', cityId: Number(cityId) || undefined },
    { enabled: Boolean(cityId) },
  );
  const [listingId, setListingId] = useState<number>();
  const [pricingMode, setPricingMode] = useState<PricingMode>('componentised');
  const [more, setMore] = useState(false);
  const [form, setForm] = useState({
    assetName: '',
    streetNumber: '',
    streetName: '',
    confirmLocation: false,
    identifier: '',
    rentableArea: '',
    usableArea: '',
    title: '',
    description: '',
    availabilityState: 'available_confirmed' as 'available_confirmed' | 'available_upcoming',
    occupationDate: '',
    confirmationSource: 'broker' as ConfirmationSource,
    confirmationSourceLabel: '',
    confirmedAt: localDateTimeInput(new Date()),
    dueAt: localDateTimeInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    baseRent: '',
    grossRent: '',
    operatingCosts: '',
    ratesRecoveries: '',
    parkingCost: '',
    fixedCharge: '',
    utilities: '',
    vatTreatment: 'excluded',
    minimumLeaseMonths: '',
    quotedLeaseMonths: '',
    annualEscalation: '',
    deposit: '',
    tenantInstallationAllowance: '',
    beneficialOccupationDays: '',
    parkingBays: '',
    backupPower: 'unknown' as TruthValue,
    backupWater: 'unknown' as TruthValue,
    fibreConnectivity: 'unknown' as TruthValue,
    buildingGrade: '',
    fitOutCondition: '',
    eavesHeight: '',
    yardHardstand: 'unknown' as TruthValue,
    truckAccess: '',
    rollerDoors: '',
    loadingDocks: '',
    powerCapacity: '',
    floorLoading: '',
    sprinklers: 'unknown' as TruthValue,
    craneCapacity: '',
    frontageVisibility: '',
    footfallContext: '',
    extractionCapability: 'unknown' as TruthValue,
    tenantMixContext: '',
    deliveryAccess: '',
  });

  const set = (key: keyof typeof form, value: (typeof form)[typeof key]) =>
    setForm(current => ({ ...current, [key]: value }));

  const economics = useMemo(() => {
    const recurring = (
      componentCode: EconomicComponentCode,
      value: string,
      chargeBasis: CommercialEconomicChargeBasis,
    ): CommercialEconomicsDraft =>
      value.trim()
        ? {
            componentCode,
            valueState: 'supplied',
            chargeBasis,
            amountMinor: toMinor(value),
            rangeMaximumMinor: null,
          }
        : {
            componentCode,
            valueState: 'unknown',
            chargeBasis: null,
            amountMinor: null,
            rangeMaximumMinor: null,
          };

    return [
      pricingMode === 'gross_quote'
        ? recurring('gross_rent', form.grossRent, 'per_m2_month')
        : recurring('base_rent', form.baseRent, 'per_m2_month'),
      pricingMode === 'componentised'
        ? recurring('operating_costs', form.operatingCosts, 'per_m2_month')
        : null,
      pricingMode === 'componentised'
        ? recurring('rates_recoveries', form.ratesRecoveries, 'per_m2_month')
        : null,
      recurring('parking', form.parkingCost, 'per_bay_month'),
      recurring('fixed_levies', form.fixedCharge, 'fixed_monthly'),
      recurring('utilities', form.utilities, 'fixed_monthly'),
    ].filter((item): item is CommercialEconomicsDraft => item !== null);
  }, [form, pricingMode]);

  const costPreview = useMemo(() => {
    let total = 0;
    const unresolved: string[] = [];
    for (const item of economics) {
      if (item.valueState === 'unknown' || item.amountMinor == null) {
        unresolved.push(item.componentCode);
        continue;
      }
      if (item.chargeBasis === 'per_m2_month') {
        if (form.rentableArea) total += item.amountMinor * Number(form.rentableArea);
        else unresolved.push(item.componentCode);
      } else if (item.chargeBasis === 'per_bay_month') {
        if (form.parkingBays) total += item.amountMinor * Number(form.parkingBays);
        else unresolved.push(item.componentCode);
      } else total += item.amountMinor;
    }
    return { total, unresolved };
  }, [economics, form.parkingBays, form.rentableArea]);

  const specifications = useMemo(() => {
    const common = [
      numericSpecification('parking_bays', form.parkingBays),
      booleanSpecification('backup_power', form.backupPower),
      booleanSpecification('backup_water', form.backupWater),
      booleanSpecification('fibre_connectivity', form.fibreConnectivity),
    ];
    if (useType === 'office') {
      return [
        ...common,
        textSpecification('building_grade', form.buildingGrade),
        textSpecification('fit_out_condition', form.fitOutCondition),
      ];
    }
    if (useType === 'industrial_logistics') {
      return [
        ...common,
        numericSpecification('eaves_height_m', form.eavesHeight),
        booleanSpecification('yard_hardstand', form.yardHardstand),
        textSpecification('truck_access', form.truckAccess),
        numericSpecification('roller_doors', form.rollerDoors),
        numericSpecification('loading_docks', form.loadingDocks),
        numericSpecification('power_capacity_kva', form.powerCapacity),
        numericSpecification('floor_loading', form.floorLoading),
        booleanSpecification('sprinklers', form.sprinklers),
        numericSpecification('crane_capacity', form.craneCapacity),
      ];
    }
    return [
      ...common,
      textSpecification('frontage_visibility', form.frontageVisibility),
      textSpecification('footfall_context', form.footfallContext),
      booleanSpecification('extraction_capability', form.extractionCapability),
      textSpecification('tenant_mix_context', form.tenantMixContext),
      textSpecification('delivery_access', form.deliveryAccess),
    ];
  }, [form, useType]);

  const changeUseType = (nextUseType: UseType) => {
    const definition = USE_TYPES.find(type => type.value === nextUseType)!;
    setUseType(nextUseType);
    setAssetKind(definition.defaultAssetKind);
    setSpaceKind(definition.defaultSpaceKind);
    setCommercialAssetId('');
  };

  const textInput = (
    label: string,
    key: keyof typeof form,
    options?: { type?: string; hint?: string; min?: number },
  ) => (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <input
        className="rounded border p-2"
        aria-label={label}
        type={options?.type || 'text'}
        min={options?.min}
        value={form[key] as string}
        onChange={event => set(key, event.target.value as never)}
      />
      {options?.hint ? <span className="text-xs text-slate-500">{options.hint}</span> : null}
    </label>
  );

  const truthSelect = (label: string, key: keyof typeof form) => (
    <label className="grid gap-1 text-sm">
      <span>{label}</span>
      <select
        className="rounded border p-2"
        value={form[key] as string}
        onChange={event => set(key, event.target.value as never)}
      >
        <option value="unknown">To confirm</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );

  const save = async () => {
    try {
      if (assetMode === 'existing' && !commercialAssetId) {
        throw new Error('Select the existing Commercial asset for this space.');
      }
      if (assetMode === 'new' && (!provinceId || !cityId)) {
        throw new Error('Select the canonical Province and City for this Commercial asset.');
      }
      if (assetMode === 'new' && !form.assetName.trim()) {
        throw new Error('Enter a name for the Commercial asset.');
      }
      if (assetMode === 'new' && (!form.streetName.trim() || !form.confirmLocation)) {
        throw new Error('Enter the asset street and confirm its physical location.');
      }
      if (!form.identifier.trim()) {
        throw new Error('Enter the space, suite or unit identifier.');
      }
      const rentableAreaM2 = Number(form.rentableArea);
      if (!Number.isFinite(rentableAreaM2) || rentableAreaM2 <= 0) {
        throw new Error('Enter a rentable area greater than zero.');
      }
      if (form.usableArea.trim()) {
        const usableAreaM2 = Number(form.usableArea);
        if (!Number.isFinite(usableAreaM2) || usableAreaM2 <= 0) {
          throw new Error('Usable area must be greater than zero when supplied.');
        }
      }
      if (form.title.trim().length < 10) {
        throw new Error('Add a marketing title of at least 10 characters.');
      }
      if (form.description.trim().length < 50) {
        throw new Error('Add a marketing description of at least 50 characters.');
      }
      if (form.availabilityState === 'available_upcoming' && !form.occupationDate) {
        throw new Error('Enter an occupation date for upcoming availability.');
      }
      if (form.confirmationSource === 'other' && !form.confirmationSourceLabel.trim()) {
        throw new Error('Describe the source of the availability confirmation.');
      }
      const confirmedAt = new Date(form.confirmedAt);
      const reconfirmationDueAt = new Date(form.dueAt);
      if (
        !Number.isFinite(confirmedAt.getTime()) ||
        !Number.isFinite(reconfirmationDueAt.getTime())
      ) {
        throw new Error('Enter valid confirmation and reconfirmation dates.');
      }
      if (reconfirmationDueAt < confirmedAt) {
        throw new Error('Reconfirm by must be on or after the confirmation date.');
      }
      const primaryRent = pricingMode === 'gross_quote' ? form.grossRent : form.baseRent;
      if (
        !primaryRent.trim() ||
        !Number.isFinite(Number(primaryRent)) ||
        Number(primaryRent) <= 0
      ) {
        throw new Error(
          pricingMode === 'gross_quote'
            ? 'Enter the supplied gross rental before saving.'
            : 'Enter the supplied base / net rent before saving.',
        );
      }

      const asset =
        assetMode === 'new'
          ? {
              mode: 'new' as const,
              assetKind,
              name: form.assetName,
              provinceId: Number(provinceId),
              cityId: Number(cityId),
              suburbId: suburbId ? Number(suburbId) : null,
              privateAddress: {
                ...(form.streetNumber ? { streetNumber: form.streetNumber } : {}),
                streetName: form.streetName,
                buildingName: form.assetName,
              },
              coordinateSource: 'manual_confirmed' as const,
              confirmPhysicalLocation: true as const,
            }
          : { mode: 'existing' as const, commercialAssetId: Number(commercialAssetId) };

      const result = await create.mutateAsync({
        asset,
        space: {
          spaceClass: useType,
          spaceKind,
          identifier: form.identifier,
          rentableAreaM2,
          usableAreaM2: form.usableArea ? Number(form.usableArea) : null,
        },
        availability: {
          availabilityState: form.availabilityState,
          occupationDate: form.occupationDate || null,
          confirmationSource: form.confirmationSource,
          confirmationSourceLabel: form.confirmationSourceLabel.trim() || null,
          lastConfirmedAt: confirmedAt.toISOString(),
          reconfirmationDueAt: reconfirmationDueAt.toISOString(),
          pricingMode,
          vatTreatment: form.vatTreatment as 'included' | 'excluded' | 'not_applicable' | 'unknown',
        },
        economics,
        specifications,
        leaseTerms: {
          minimumLeaseMonths: form.minimumLeaseMonths ? Number(form.minimumLeaseMonths) : null,
          quotedLeaseMonths: form.quotedLeaseMonths ? Number(form.quotedLeaseMonths) : null,
          annualEscalationPercent: form.annualEscalation ? Number(form.annualEscalation) : null,
          depositMinor: form.deposit ? toMinor(form.deposit) : null,
          tenantInstallationAllowanceMinor: form.tenantInstallationAllowance
            ? toMinor(form.tenantInstallationAllowance)
            : null,
          beneficialOccupationDays: form.beneficialOccupationDays
            ? Number(form.beneficialOccupationDays)
            : null,
        },
        marketing: { title: form.title, description: form.description },
      });
      setListingId(result.listingId);
      toast.success('Canonical Commercial draft saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save Commercial draft.');
    }
  };

  const addMedia = async (file: File | null) => {
    if (!listingId || !file) return;
    try {
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type === 'application/pdf'
          ? 'pdf'
          : 'video';
      const item = await upload.mutateAsync({
        listingId,
        type,
        filename: file.name,
        contentType: file.type,
      });
      const response = await fetch(item.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('Marketing media upload failed.');
      const done = await confirm.mutateAsync({ uploadToken: item.uploadToken });
      await attach.mutateAsync({ listingId, uploadToken: done.uploadToken });
      toast.success('Marketing media attached to the Listing.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to attach marketing media.');
    }
  };
  const inventoryHref = window.location.pathname.startsWith('/agency')
    ? '/agency/commercial'
    : '/agent/commercial';

  if (listingId) {
    return (
      <AgentAppShell>
        <main className="mx-auto max-w-3xl space-y-4 p-6">
          <h1 className="text-2xl font-semibold">Commercial draft ready</h1>
          <p>Listing #{listingId} is linked to the canonical Commercial availability.</p>
          <label className="grid gap-1">
            <span>Marketing media</span>
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={event => addMedia(event.target.files?.[0] || null)}
            />
          </label>
          <button
            className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
            disabled={submit.isPending}
            onClick={() => submit.mutate({ listingId })}
          >
            Submit through Listing review
          </button>
          <Link
            href={inventoryHref}
            className="inline-block text-sm font-medium text-sky-700 underline"
          >
            Manage Commercial availability
          </Link>
          {submit.error ? (
            <p role="alert" className="text-sm text-rose-700">
              {submit.error.message}
            </p>
          ) : null}
        </main>
      </AgentAppShell>
    );
  }

  const selectedAsset = reusableAssets.data?.find(asset => asset.id === Number(commercialAssetId));
  const typeLabel = USE_TYPES.find(type => type.value === useType)!.label;

  return (
    <AgentAppShell>
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <header>
          <p className="text-sm font-medium text-sky-700">Commercial · Leasing inventory</p>
          <h1 className="text-3xl font-semibold">Create a Commercial vacancy</h1>
          <p className="text-slate-600">
            Store the physical space, availability and commercial terms separately from marketing.
            Unknown costs and operational facts remain explicitly unresolved.
          </p>
        </header>

        <section className="space-y-4 rounded border p-4">
          <h2 className="font-semibold">Use type and physical identity</h2>
          <label className="grid gap-1 text-sm">
            <span>Commercial use type</span>
            <select
              className="rounded border p-2"
              value={useType}
              onChange={event => changeUseType(event.target.value as UseType)}
            >
              {USE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="rounded border p-3">
              <input
                type="radio"
                checked={assetMode === 'new'}
                onChange={() => setAssetMode('new')}
              />{' '}
              <b>Create a new asset</b>
              <span className="block text-sm text-slate-600">
                Use this for the first space in a building, park or centre.
              </span>
            </label>
            <label className="rounded border p-3">
              <input
                type="radio"
                checked={assetMode === 'existing'}
                onChange={() => setAssetMode('existing')}
              />{' '}
              <b>Add to an existing asset</b>
              <span className="block text-sm text-slate-600">
                Only your active, physically confirmed assets are available.
              </span>
            </label>
          </div>

          {assetMode === 'new' ? (
            <>
              <label className="grid gap-1 text-sm">
                <span>Asset type</span>
                <select
                  className="rounded border p-2"
                  value={assetKind}
                  onChange={event => setAssetKind(event.target.value as AssetKind)}
                >
                  {ASSET_KINDS[useType].map(kind => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>
              {textInput('Asset name', 'assetName')}
              <div className="grid gap-3 md:grid-cols-2">
                {textInput('Street number (optional)', 'streetNumber')}
                {textInput('Street name', 'streetName')}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span>Province</span>
                  <select
                    className="rounded border p-2"
                    value={provinceId}
                    onChange={event => {
                      setProvinceId(event.target.value);
                      setCityId('');
                      setSuburbId('');
                    }}
                  >
                    <option value="">Choose Province</option>
                    {provinces.data?.map(province => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span>City</span>
                  <select
                    className="rounded border p-2"
                    value={cityId}
                    disabled={!provinceId}
                    onChange={event => {
                      setCityId(event.target.value);
                      setSuburbId('');
                    }}
                  >
                    <option value="">Choose City</option>
                    {cities.data?.map(city => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span>Suburb / locality (optional)</span>
                  <select
                    className="rounded border p-2"
                    value={suburbId}
                    disabled={!cityId}
                    onChange={event => setSuburbId(event.target.value)}
                  >
                    <option value="">Not specified</option>
                    {suburbs.data?.map(suburb => (
                      <option key={suburb.id} value={suburb.id}>
                        {suburb.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.confirmLocation}
                  onChange={event => set('confirmLocation', event.target.checked as never)}
                />
                I confirm this is the physical asset location.
              </label>
            </>
          ) : (
            <>
              <label className="grid gap-1 text-sm">
                <span>Existing {typeLabel} asset</span>
                <select
                  className="rounded border p-2"
                  value={commercialAssetId}
                  onChange={event => setCommercialAssetId(event.target.value)}
                >
                  <option value="">Select an asset</option>
                  {reusableAssets.data?.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                      {asset.address ? ` — ${asset.address}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {selectedAsset ? (
                <p className="rounded bg-slate-50 p-3 text-sm">
                  <b>{selectedAsset.name}</b>
                  {selectedAsset.address ? ` · ${selectedAsset.address}` : ''}
                  <br />
                  The asset identity and location will not change.
                </p>
              ) : null}
            </>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Space type</span>
              <select
                className="rounded border p-2"
                value={spaceKind}
                onChange={event => setSpaceKind(event.target.value as SpaceKind)}
              >
                {SPACE_KINDS[useType].map(kind => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </label>
            {textInput('Suite, unit, warehouse or floor identifier', 'identifier')}
            {textInput('Rentable m²', 'rentableArea', { type: 'number', min: 0 })}
            {textInput('Usable m² (optional)', 'usableArea', { type: 'number', min: 0 })}
          </div>
          {textInput('Marketing title', 'title')}
          <label className="grid gap-1 text-sm">
            <span>Marketing description</span>
            <textarea
              className="min-h-28 rounded border p-2"
              value={form.description}
              onChange={event => set('description', event.target.value)}
            />
          </label>
        </section>

        <section className="space-y-4 rounded border p-4">
          <h2 className="font-semibold">Availability and rental basis</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span>Availability</span>
              <select
                className="rounded border p-2"
                value={form.availabilityState}
                onChange={event =>
                  set(
                    'availabilityState',
                    event.target.value as 'available_confirmed' | 'available_upcoming',
                  )
                }
              >
                <option value="available_confirmed">Available now — confirmed</option>
                <option value="available_upcoming">Available from a future date</option>
              </select>
            </label>
            {form.availabilityState === 'available_upcoming'
              ? textInput('Occupation date', 'occupationDate', { type: 'date' })
              : null}
            {textInput('Confirmed at', 'confirmedAt', { type: 'datetime-local' })}
            {textInput('Reconfirm by', 'dueAt', {
              type: 'datetime-local',
              hint: 'Set the next date this availability must be reconfirmed.',
            })}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Availability confirmation source</span>
              <select
                className="rounded border p-2"
                aria-label="Availability confirmation source"
                value={form.confirmationSource}
                onChange={event =>
                  set('confirmationSource', event.target.value as ConfirmationSource)
                }
              >
                {COMMERCIAL_CONFIRMATION_SOURCES.map(source => (
                  <option key={source} value={source}>
                    {COMMERCIAL_CONFIRMATION_SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">
                Record who supplied the latest availability confirmation.
              </span>
            </label>
            {form.confirmationSource === 'other'
              ? textInput('Confirmation source details', 'confirmationSourceLabel', {
                  hint: 'Name the responsible source or organisation.',
                })
              : null}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="rounded border p-3">
              <input
                type="radio"
                checked={pricingMode === 'gross_quote'}
                onChange={() => setPricingMode('gross_quote')}
              />{' '}
              <b>Gross rental</b>
              <span className="block text-sm text-slate-600">
                The quote already includes some property charges.
              </span>
            </label>
            <label className="rounded border p-3">
              <input
                type="radio"
                checked={pricingMode === 'componentised'}
                onChange={() => setPricingMode('componentised')}
              />{' '}
              <b>Componentised rental</b>
              <span className="block text-sm text-slate-600">
                Base rent and recoveries are stated separately.
              </span>
            </label>
          </div>
          {pricingMode === 'gross_quote' ? (
            textInput('Supplied gross rental (R/m²/month)', 'grossRent', { type: 'number', min: 0 })
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {textInput('Base / net rent (R/m²/month)', 'baseRent', { type: 'number', min: 0 })}
              {textInput('Operating costs (R/m²/month)', 'operatingCosts', {
                type: 'number',
                min: 0,
              })}
              {textInput('Rates / recoveries (R/m²/month)', 'ratesRecoveries', {
                type: 'number',
                min: 0,
              })}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {textInput('Parking charge (R/bay/month)', 'parkingCost', { type: 'number', min: 0 })}
            {textInput('Other fixed recurring charge (R/month)', 'fixedCharge', {
              type: 'number',
              min: 0,
            })}
            {textInput('Utilities (R/month)', 'utilities', { type: 'number', min: 0 })}
          </div>
          <label className="grid gap-1 text-sm md:max-w-xs">
            <span>VAT treatment</span>
            <select
              className="rounded border p-2"
              value={form.vatTreatment}
              onChange={event => set('vatTreatment', event.target.value)}
            >
              <option value="excluded">Excluded</option>
              <option value="included">Included</option>
              <option value="unknown">Unknown</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </label>
          <div className="rounded bg-slate-50 p-3 text-sm">
            <b>Cost Passport preview</b>
            <p>Known recurring monthly cost: {money(costPreview.total)}</p>
            <p>
              {costPreview.unresolved.length
                ? `Still unresolved: ${costPreview.unresolved.map(fieldLabel).join(', ')}`
                : 'All declared recurring charges are included.'}
            </p>
            <p>
              {pricingMode === 'gross_quote'
                ? 'Gross rent is not added to net rent, operating costs or rates.'
                : 'Componentised amounts are calculated separately.'}
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded border p-4">
          <button className="font-semibold underline" onClick={() => setMore(current => !current)}>
            {more ? 'Hide' : 'Add'} lease terms and {typeLabel.toLowerCase()} facts
          </button>
          {more ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                {textInput('Minimum lease months', 'minimumLeaseMonths', {
                  type: 'number',
                  min: 0,
                })}
                {textInput('Quoted lease months', 'quotedLeaseMonths', { type: 'number', min: 0 })}
                {textInput('Annual escalation (%)', 'annualEscalation', { type: 'number', min: 0 })}
                {textInput('Deposit (R)', 'deposit', { type: 'number', min: 0 })}
                {textInput('Tenant-installation allowance (R)', 'tenantInstallationAllowance', {
                  type: 'number',
                  min: 0,
                })}
                {textInput('Beneficial / rent-free occupation days', 'beneficialOccupationDays', {
                  type: 'number',
                  min: 0,
                })}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {textInput('Parking bays', 'parkingBays', { type: 'number', min: 0 })}
                {truthSelect('Backup power', 'backupPower')}
                {truthSelect('Backup water', 'backupWater')}
                {truthSelect('Fibre connectivity', 'fibreConnectivity')}
              </div>

              {useType === 'office' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {textInput('Building grade', 'buildingGrade')}
                  {textInput('Fit-out condition', 'fitOutCondition')}
                </div>
              ) : null}

              {useType === 'industrial_logistics' ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {textInput('Eaves height (m)', 'eavesHeight', { type: 'number', min: 0 })}
                  {truthSelect('Yard / hardstand', 'yardHardstand')}
                  {textInput('Truck access', 'truckAccess')}
                  {textInput('Roller doors', 'rollerDoors', { type: 'number', min: 0 })}
                  {textInput('Loading docks', 'loadingDocks', { type: 'number', min: 0 })}
                  {textInput('Power capacity (kVA)', 'powerCapacity', { type: 'number', min: 0 })}
                  {textInput('Floor loading', 'floorLoading', { type: 'number', min: 0 })}
                  {truthSelect('Sprinklers', 'sprinklers')}
                  {textInput('Crane capacity', 'craneCapacity', { type: 'number', min: 0 })}
                </div>
              ) : null}

              {useType === 'retail' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {textInput('Frontage / visibility', 'frontageVisibility')}
                  {textInput('Footfall context', 'footfallContext')}
                  {truthSelect('Extraction capability', 'extractionCapability')}
                  {textInput('Tenant mix context', 'tenantMixContext')}
                  {textInput('Delivery access', 'deliveryAccess')}
                </div>
              ) : null}

              <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Zoning and permitted-use evidence is never inferred from an asset or marketing
                description. Confirm it with the advertiser until the governed zoning record is
                available in this workflow.
              </p>
            </>
          ) : null}
        </section>

        <button
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          disabled={create.isPending}
          onClick={save}
        >
          Save canonical Commercial draft
        </button>
      </main>
    </AgentAppShell>
  );
}
