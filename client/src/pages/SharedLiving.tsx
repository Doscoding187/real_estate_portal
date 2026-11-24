import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowRight, Bath, BedDouble, Building2, GraduationCap, MapPin, Search, ShieldCheck, Users, Wifi, Zap } from 'lucide-react';
import { CanonicalPlaceSelector, type CanonicalPlaceSelection } from '@/components/location/CanonicalPlaceSelector';
import { trpc } from '@/lib/trpc';
import { HomeLayout } from '@/layouts/HomeLayout';
import { isSharedLivingPreviewEnabled, SHARED_LIVING_PREVIEW_FIXTURES } from '@/lib/sharedLivingPreviewFixtures';

const accommodationLabels: Record<string, string> = {
  private_room: 'Private room', shared_room: 'Shared room', en_suite_room: 'En-suite room',
  garden_cottage: 'Garden cottage', granny_flat: 'Granny flat', bachelor_studio: 'Bachelor / studio',
  backyard_room: 'Backyard room', backyard_unit: 'Backyard unit', room_shared_house: 'Room in shared house',
  room_shared_apartment: 'Room in shared apartment',
};

function rentLabel(item: { rentUnknown: boolean; rentAmountMinor: number; rentBasis: string }) {
  if (item.rentUnknown) return 'Rent to be confirmed';
  const price = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 }).format(item.rentAmountMinor / 100);
  return `R ${price} / month${item.rentBasis === 'per_person' ? ' per person' : ''}`;
}

export default function SharedLiving({ studentMode = false }: { studentMode?: boolean }) {
  const onStudentRoute = useRoute('/student-accommodation')[0];
  const student = studentMode || onStudentRoute;
  const [marketTag, setMarketTag] = useState<'all' | 'room_share' | 'independent_micro' | 'student'>(student ? 'student' : 'all');
  const [place, setPlace] = useState<CanonicalPlaceSelection | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [furnished, setFurnished] = useState<'any' | 'furnished' | 'partial'>('any');
  const [bathroom, setBathroom] = useState<'any' | 'own' | 'shared'>('any');
  const [availableBy, setAvailableBy] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => {
    setMarketTag(student ? 'student' : 'all');
    setPage(0);
  }, [student]);
  const search = trpc.sharedLiving.search.useQuery({
    ...(marketTag === 'all' ? {} : { marketTag }),
    ...(place ? { canonicalPlaceId: place.canonicalPlaceId } : {}),
    ...(minPrice && Number.isFinite(Number(minPrice)) ? { minPrice: Number(minPrice) } : {}),
    ...(maxPrice && Number.isFinite(Number(maxPrice)) ? { maxPrice: Number(maxPrice) } : {}),
    ...(furnished === 'any' ? {} : { furnished }),
    ...(bathroom === 'any' ? {} : { bathroom }),
    ...(availableBy ? { availableFrom: availableBy } : {}),
    page,
  }, { retry: false });

  const previewItems = SHARED_LIVING_PREVIEW_FIXTURES.filter(({ card }) => !student || card.marketTag === 'student');

  return (
    <HomeLayout>
    <main id="main-content" className="min-h-screen bg-[#f5f8fb] text-slate-900">
      <section className="bg-gradient-to-br from-[#062846] via-[#0c4568] to-[#0c765e] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-emerald-200">Property Listify · Shared Living</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{student ? 'Student accommodation that feels like home.' : 'Find a place to live, your way.'}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-sky-100 md:text-lg">Discover rooms, shared homes and private cottages with clear rent, availability and facilities.</p>
            </div>
            <Link href={student ? '/shared-living' : '/student-accommodation'} className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white/10">{student ? 'Browse all Shared Living' : 'Explore student accommodation'}</Link>
          </div>

          <form className="mt-8 grid gap-3 rounded-2xl bg-white p-3 text-slate-900 shadow-xl md:grid-cols-[minmax(260px,1.5fr)_1fr_1fr_auto] md:items-end" onSubmit={event => event.preventDefault()}>
            <CanonicalPlaceSelector value={place} onChange={value => { setPage(0); setPlace(value); }} purpose="search" label="Where would you like to live?" placeholder="Search an approved suburb, town or city" hint="Exact residence addresses stay private." />
            <label className="text-sm font-medium">Monthly rent from<input type="number" min="0" value={minPrice} onChange={event => { setPage(0); setMinPrice(event.target.value); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" placeholder="Any" /></label>
            <label className="text-sm font-medium">Monthly rent to<input type="number" min="0" value={maxPrice} onChange={event => { setPage(0); setMaxPrice(event.target.value); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" placeholder="Any" /></label>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"><Search className="h-4 w-4" aria-hidden="true" />Find a place</button>
          </form>
        </div>
      </section>

      <section aria-label="Choose your accommodation journey" className="mx-auto -mt-5 grid max-w-7xl gap-4 px-4 md:grid-cols-2 md:px-8">
        <Link href="#space-search" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><Building2 className="h-7 w-7" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-lg font-bold">Find Shared Living accommodation</span><span className="mt-1 block text-sm leading-5 text-slate-600">Browse rooms, cottages and spaces in a shared home.</span></span>
          <ArrowRight className="h-5 w-5 text-emerald-800 transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>
        <Link href="/student-accommodation" className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800"><GraduationCap className="h-7 w-7" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-lg font-bold">Student Accommodation</span><span className="mt-1 block text-sm leading-5 text-slate-600">Explore student rooms from the same reviewed marketplace.</span></span>
          <ArrowRight className="h-5 w-5 text-blue-800 transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </section>

      <section id="space-search" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{student ? 'Student spaces' : 'Explore available spaces'}</h2>
            <p className="mt-1 text-sm text-slate-600">{place ? `Showing places in ${place.label}` : 'Explore approved accommodation across the Property Listify network.'}</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Accommodation type">
            {([
              ['all', 'All spaces'], ['room_share', 'Rooms'], ['independent_micro', 'Cottages & studios'], ['student', 'Student accommodation'],
            ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={marketTag === value} onClick={() => { setPage(0); setMarketTag(value); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${marketTag === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}>{label}</button>)}
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Furnishing<select value={furnished} onChange={event => { setPage(0); setFurnished(event.target.value as typeof furnished); }} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"><option value="any">Any</option><option value="furnished">Furnished</option><option value="partial">Part furnished</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bathroom<select value={bathroom} onChange={event => { setPage(0); setBathroom(event.target.value as typeof bathroom); }} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"><option value="any">Any</option><option value="own">Private bathroom</option><option value="shared">Shared bathroom</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available by<input type="date" value={availableBy} onChange={event => { setPage(0); setAvailableBy(event.target.value); }} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800" /></label>
          <div className="flex items-end text-sm text-slate-600"><MapPin className="mr-2 h-4 w-4 text-emerald-700" aria-hidden="true" />Public results show an approved area, never a street address.</div>
          <div className="flex items-end justify-end text-sm font-semibold text-slate-700">{search.data ? `Page ${page + 1} · ${search.data.items.length} places` : ''}</div>
        </div>

        {search.isLoading && <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200" /></div>}
        {search.error && <div role="alert" className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><h3 className="font-semibold">Accommodation search is temporarily unavailable.</h3><p className="mt-1 text-sm">Please try again shortly. Your search filters have not been saved or submitted.</p><button type="button" onClick={() => void search.refetch()} className="mt-3 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-semibold">Try again</button></div>}
        {!search.isLoading && !search.error && search.data?.items.length === 0 && <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-800"><MapPin className="h-6 w-6" aria-hidden="true" /></div><h3 className="mt-4 text-xl font-bold">{place ? `No approved spaces in ${place.label} yet` : 'No accommodation is available just yet'}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">We only show residences and spaces that have passed review and have a current advertising mandate. Try another area or check back as the network grows.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => { setPage(0); setPlace(null); setMarketTag(student ? 'student' : 'all'); setMinPrice(''); setMaxPrice(''); setFurnished('any'); setBathroom('any'); setAvailableBy(''); }} className="rounded-xl border px-4 py-2 text-sm font-semibold">Clear search</button><Link href="/shared-living/list" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Advertise accommodation</Link></div></div>}

        {!!search.data?.items.length && <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {search.data.items.map(item => {
            const cover = item.images.find(image => image.isCover)?.url || item.images[0]?.url;
            return <Link key={item.id} href={`/shared-living/${item.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
              <div className="relative h-56 bg-slate-200">{cover ? <img src={cover} alt={item.label} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-200 to-emerald-100 text-slate-500">No photo provided</div>}<span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-800">{accommodationLabels[item.accommodationType] || 'Accommodation'}</span></div>
              <div className="p-5"><p className="text-lg font-bold text-emerald-800">{rentLabel(item)}</p><h3 className="mt-2 text-xl font-bold">{item.label}</h3><p className="mt-1 text-sm text-slate-500">{item.residenceName}</p><p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />{item.locationLabel}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />Up to {item.occupancyCount ?? '—'}</span><span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" aria-hidden="true" />{item.bathroomAccess === 'own' ? 'Private bathroom' : item.bathroomAccess === 'shared' ? 'Shared bathroom' : 'Bathroom to confirm'}</span><span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" aria-hidden="true" />{item.furnishedState === 'unknown' ? 'Furnishing to confirm' : item.furnishedState === 'partial' ? 'Part furnished' : item.furnishedState === 'furnished' ? 'Furnished' : 'Unfurnished'}</span><span className="inline-flex items-center gap-1"><Wifi className="h-4 w-4" aria-hidden="true" /><Zap className="h-4 w-4" aria-hidden="true" />Facilities on detail</span></div></div>
            </Link>;
          })}
        </div>}
        {(search.data?.hasMore || page > 0) && <div className="mt-7 flex justify-center gap-3">{page > 0 && <button type="button" onClick={() => setPage(current => Math.max(0, current - 1))} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold">Previous</button>}{search.data?.hasMore && <button type="button" disabled={search.isFetching} onClick={() => setPage(current => current + 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold disabled:opacity-50">{search.isFetching ? 'Loading…' : 'Next results'}</button>}</div>}

        {isSharedLivingPreviewEnabled && <section aria-labelledby="shared-living-examples" className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">Preview examples · not live inventory</p><h2 id="shared-living-examples" className="mt-2 text-2xl font-bold">See how accommodation details appear</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">These fictional examples use locally bundled photos to demonstrate the marketplace. They are not available homes, do not accept enquiries and are never saved to the inventory.</p></div>
            {student && <Link href="/shared-living" className="text-sm font-semibold text-emerald-800 underline underline-offset-4">See all example types</Link>}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {previewItems.map(({ card }) => <Link key={card.slug} href={`/shared-living/preview/${card.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
              <div className="relative h-56 bg-slate-200"><img src={card.images[0]?.url} alt={card.images[0]?.caption || card.label} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /><span className="absolute left-3 top-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">Illustrative preview</span></div>
              <div className="p-5"><p className="text-lg font-bold text-emerald-800">{rentLabel(card)}</p><h3 className="mt-2 text-xl font-bold">{card.label}</h3><p className="mt-1 text-sm text-slate-500">{card.residenceName}</p><p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600"><MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />{card.locationLabel}</p><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{card.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />Up to {card.occupancyCount}</span><span className="font-semibold text-emerald-800">View preview <ArrowRight className="inline h-4 w-4" aria-hidden="true" /></span></div></div>
            </Link>)}
          </div>
        </section>}

        <section aria-labelledby="list-accommodation" className="mt-12 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#062846] via-[#0b405c] to-[#0a765d] text-white shadow-xl">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-10 md:py-10">
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">For property professionals and accommodation providers</p><h2 id="list-accommodation" className="mt-3 max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">Have a room, cottage or residence to advertise?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-100 md:text-base">Homeowners, landlords and residence operators can bring their accommodation through a Property Listify agent. Agents can manage one space or a full residence, with current authority reviewed before publication.</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-emerald-50"><span className="rounded-full bg-white/10 px-3 py-1.5">One space or many</span><span className="rounded-full bg-white/10 px-3 py-1.5">Private addresses protected</span><span className="rounded-full bg-white/10 px-3 py-1.5">Listings reviewed before publication</span></div></div>
            <div className="flex flex-col gap-3 md:min-w-56"><Link href="/shared-living/list" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#073955] transition hover:bg-emerald-50">List your accommodation <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>{isSharedLivingPreviewEnabled && <Link href="/shared-living/listing-preview" className="inline-flex items-center justify-center rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Preview the agent journey</Link>}<p className="text-center text-xs text-sky-100">Real listings require an agent account and residence-specific authority.</p></div>
          </div>
        </section>
      </section>
    </main>
    </HomeLayout>
  );
}
