import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LAND_CLASSIFICATION_LABELS, LAND_PUBLIC_CLASSIFICATIONS, type LandPublicClassification } from '@shared/land-domain';

const numberValue = (value: string) => value.trim() ? Number(value) : undefined;

export interface LandGeographyState {
  city: string;
  province: string;
  locationId?: string;
  locationIds: string[];
  searchAreaId?: string;
  handoffError?: string | null;
}

/** A typed manual edit replaces, never layers over, a specialist geography handoff. */
export function editManualLandGeography(
  state: LandGeographyState,
  edit: Pick<LandGeographyState, 'city' | 'province'>,
): LandGeographyState {
  return { ...edit, locationIds: [], handoffError: null };
}

export default function PlotsAndLand() {
  const initial = new URLSearchParams(window.location.search);
  const [handoffError, setHandoffError] = useState(initial.get('searchError'));
  const initialClassification = initial.get('classification') as LandPublicClassification | null;
  const [classification, setClassification] = useState<LandPublicClassification | ''>(initialClassification && LAND_PUBLIC_CLASSIFICATIONS.includes(initialClassification) ? initialClassification : '');
  const [city, setCity] = useState(initial.get('city') || '');
  const [province, setProvince] = useState(initial.get('province') || '');
  const [minPrice, setMinPrice] = useState(initial.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(initial.get('maxPrice') || '');
  const [minSize, setMinSize] = useState(initial.get('minSize') || '');
  const [maxSize, setMaxSize] = useState(initial.get('maxSize') || '');
  const [locationId, setLocationId] = useState(initial.get('locationId') || undefined);
  const [locationIds, setLocationIds] = useState(initial.getAll('locationIds'));
  const [searchAreaId, setSearchAreaId] = useState(initial.get('searchAreaId') || undefined);
  const applyManualGeography = (edit: Pick<LandGeographyState, 'city' | 'province'>) => {
    const next = editManualLandGeography({ city, province, locationId, locationIds, searchAreaId, handoffError }, edit);
    setCity(next.city); setProvince(next.province); setLocationId(undefined); setLocationIds([]); setSearchAreaId(undefined); setHandoffError(null);
  };
  const queryInput = { classification: classification || undefined, city: city || undefined, province: province || undefined, locationId, locationIds: locationIds.length ? locationIds : undefined, searchAreaId, minPrice: numberValue(minPrice), maxPrice: numberValue(maxPrice), minSize: numberValue(minSize), maxSize: numberValue(maxSize) };
  useEffect(() => {
    const next = new URLSearchParams();
    if (locationId) next.set('locationId', locationId); locationIds.forEach(id => next.append('locationIds', id)); if (searchAreaId) next.set('searchAreaId', searchAreaId);
    if (city) next.set('city', city); if (province) next.set('province', province); if (classification) next.set('classification', classification); if (minPrice) next.set('minPrice', minPrice); if (maxPrice) next.set('maxPrice', maxPrice); if (minSize) next.set('minSize', minSize); if (maxSize) next.set('maxSize', maxSize); if (handoffError) next.set('searchError', handoffError);
    window.history.replaceState(null, '', `${window.location.pathname}${next.toString() ? `?${next}` : ''}`);
  }, [classification, city, province, minPrice, maxPrice, minSize, maxSize, handoffError, locationId, searchAreaId, locationIds]);
  const results = trpc.landPublic.search.useQuery(queryInput);

  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6"><header><h1 className="text-3xl font-semibold">Plots &amp; Land</h1><p className="mt-2 text-slate-600">Find land. Understand the land. Verify what matters.</p></header>{handoffError === 'unsupported-location-scope' && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">That location scope is not available for Land yet. Choose a canonical province, city, suburb, sibling locations, or an approved Search Area.</p>}{results.error && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{results.error.message}</p>}<section aria-label="Land search filters" className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-sm"><span>City</span><input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="City" value={city} onChange={event => applyManualGeography({ city: event.target.value, province })} /></label><label className="grid gap-1 text-sm"><span>Province</span><input className="rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Province" value={province} onChange={event => applyManualGeography({ city, province: event.target.value })} /></label><label className="grid gap-1 text-sm"><span>Land type</span><select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={classification} onChange={event => setClassification(event.target.value as LandPublicClassification | '')}><option value="">Any land type</option>{LAND_PUBLIC_CLASSIFICATIONS.map(value => <option key={value} value={value}>{LAND_CLASSIFICATION_LABELS[value]}</option>)}</select></label><label className="grid gap-1 text-sm"><span>Minimum price (R)</span><input className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" min="1" value={minPrice} onChange={event => setMinPrice(event.target.value)} /></label><label className="grid gap-1 text-sm"><span>Maximum price (R)</span><input className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" min="1" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} /></label><label className="grid gap-1 text-sm"><span>Minimum extent (m²)</span><input className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" min="1" value={minSize} onChange={event => setMinSize(event.target.value)} /></label><label className="grid gap-1 text-sm"><span>Maximum extent (m²)</span><input className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" min="1" value={maxSize} onChange={event => setMaxSize(event.target.value)} /></label></section><section aria-live="polite" className="grid gap-4 md:grid-cols-3">{results.data?.map(item => <Link key={item.listingId} href={item.href} className="rounded border p-4 transition hover:border-slate-500"><p className="font-semibold">{item.title}</p><p>{LAND_CLASSIFICATION_LABELS[item.classification as keyof typeof LAND_CLASSIFICATION_LABELS] || item.classification} · {Number(item.extentM2).toLocaleString()} m²</p><p>{item.city}, {item.province}</p><p>{item.intendedUse || 'Land opportunity'}</p><p className="mt-2 font-medium">R {Number(item.askingPrice).toLocaleString()}</p><p className="text-sm text-slate-600">{item.passport.trustState?.replaceAll('_', ' ') || 'Listed with disclosures'}</p></Link>)}</section>{!results.isLoading && !results.error && !results.data?.length && <p className="rounded border border-dashed p-6 text-slate-600">No eligible Land listings match these exact filters.</p>}</main>;
}
