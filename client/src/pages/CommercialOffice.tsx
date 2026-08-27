import { Link } from 'wouter';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const money = (minor?: number | null) => minor == null ? 'To confirm' : `R ${(minor / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

const PAGE_SIZE = 24;

const numberParam = (value: string) => (value.trim() ? Number(value) : undefined);

export default function CommercialOffice() {
  const handoffParams = new URLSearchParams(window.location.search);
  const unsupportedLocationScope = handoffParams.get('searchError') === 'unsupported-location-scope';
  const [location, setLocation] = useState(handoffParams.get('location') || '');
  const [minAreaM2, setMinAreaM2] = useState(handoffParams.get('minAreaM2') || '');
  const [maxAreaM2, setMaxAreaM2] = useState(handoffParams.get('maxAreaM2') || '');
  const [budget, setBudget] = useState(handoffParams.get('maxMonthlyBudget') || '');
  const [backupPower, setBackupPower] = useState(handoffParams.get('backupPower') === '1');
  const [backupWater, setBackupWater] = useState(handoffParams.get('backupWater') === '1');
  const [fibreConnectivity, setFibreConnectivity] = useState(handoffParams.get('fibreConnectivity') === '1');
  const [page, setPage] = useState(Number(handoffParams.get('page')) || 0);
  const results = trpc.commercialOffice.search.useQuery({ location: location || undefined, minAreaM2: numberParam(minAreaM2), maxAreaM2: numberParam(maxAreaM2), maxMonthlyBudgetMinor: budget ? Math.round(Number(budget) * 100) : undefined, backupPower: backupPower || undefined, backupWater: backupWater || undefined, fibreConnectivity: fibreConnectivity || undefined }, { enabled: !unsupportedLocationScope });
  const allOffices = results.data || [];
  const totalResults = allOffices.length;
  const pageCount = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleOffices = allOffices.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  useEffect(() => {
    const next = new URLSearchParams();
    if (location) next.set('location', location);
    if (minAreaM2) next.set('minAreaM2', minAreaM2);
    if (maxAreaM2) next.set('maxAreaM2', maxAreaM2);
    if (budget) next.set('maxMonthlyBudget', budget);
    if (backupPower) next.set('backupPower', '1');
    if (backupWater) next.set('backupWater', '1');
    if (fibreConnectivity) next.set('fibreConnectivity', '1');
    if (safePage > 0) next.set('page', String(safePage));
    window.history.replaceState(null, '', `${window.location.pathname}${next.toString() ? `?${next}` : ''}`);
  }, [location, minAreaM2, maxAreaM2, budget, backupPower, backupWater, fibreConnectivity, safePage]);
  const changePage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 0), pageCount - 1));
    window.scrollTo({ top: 0 });
  };
  return <main className="mx-auto max-w-6xl space-y-6 p-6"><section><p className="text-sm font-medium text-sky-700">Property Listify Commercial · Office leasing</p><h1 className="text-3xl font-semibold">Find office space that works for your business</h1><p className="mt-2 text-slate-600">Availability, commercial terms and known monthly occupancy costs—shown separately from what still needs confirmation.</p></section>{unsupportedLocationScope && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Choose one location to continue into the current Commercial search. Multi-location and Search Area handoff are not available yet.</p>}<section className="grid gap-3 rounded border bg-slate-50 p-4 md:grid-cols-4"><input aria-label="Location" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={location} onChange={e => { setLocation(e.target.value); setPage(0); }} placeholder="Location" /><input aria-label="Minimum square metres" className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" value={minAreaM2} onChange={e => { setMinAreaM2(e.target.value); setPage(0); }} placeholder="Min m²" /><input aria-label="Maximum square metres" className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" value={maxAreaM2} onChange={e => { setMaxAreaM2(e.target.value); setPage(0); }} placeholder="Max m²" /><input aria-label="Monthly occupancy budget" className="rounded-md border border-input bg-background px-3 py-2 text-sm" type="number" value={budget} onChange={e => { setBudget(e.target.value); setPage(0); }} placeholder="Monthly budget (R)" /><label><input type="checkbox" checked={backupPower} onChange={e => setBackupPower(e.target.checked)} /> Backup power</label><label><input type="checkbox" checked={backupWater} onChange={e => setBackupWater(e.target.checked)} /> Backup water</label><label><input type="checkbox" checked={fibreConnectivity} onChange={e => setFibreConnectivity(e.target.checked)} /> Fibre</label></section><p className="text-sm text-slate-600">A monthly-budget filter includes only spaces whose recurring Cost Passport is complete; unknown charges are never treated as R0.</p><section className="grid gap-4 md:grid-cols-2">{visibleOffices.map((office: any) => <Link key={office.availability.id} href={office.href} className="rounded border p-5 hover:border-sky-500"><p className="font-semibold">{office.asset.name} — {office.asset.suburb || office.asset.city}</p><p>{office.space.identifier} · {Number(office.space.rentableAreaM2).toLocaleString()} m² Office</p><p className="mt-2">{office.pricing.quotedRent ? `${money(office.pricing.quotedRent.amountMinor)} / ${office.pricing.quotedRent.chargeBasis === 'per_m2_month' ? 'm²' : 'month'} quoted` : 'Quoted rent to confirm'}</p><p className="font-medium">Estimated occupancy: {money(office.costPassport.monthlyMinimumMinor)}–{money(office.costPassport.monthlyMaximumMinor)} / month</p>{office.costPassport.unknownComponentCodes.length ? <p className="text-sm text-amber-700">Still unresolved: {office.costPassport.unknownComponentCodes.join(', ').replaceAll('_',' ')}</p> : null}<p className="mt-2 text-sm text-slate-700">{office.availability.label}{office.availability.confirmedAt ? ` · confirmed ${String(office.availability.confirmedAt).slice(0,10)}` : ''}{office.availability.source ? ` by ${office.availability.source}` : ''}</p></Link>)}</section>{!unsupportedLocationScope && !results.isLoading && totalResults === 0 ? <p>No published Office spaces match these requirements.</p> : null}{totalResults > PAGE_SIZE && <nav aria-label="Result pages" className="flex items-center justify-between rounded border bg-white p-4"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={safePage === 0} onClick={() => changePage(safePage - 1)}>Previous</button><p className="text-sm text-slate-600">Page {safePage + 1} of {pageCount} · {totalResults} spaces</p><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={safePage >= pageCount - 1} onClick={() => changePage(safePage + 1)}>Next</button></nav>}</main>;
}
