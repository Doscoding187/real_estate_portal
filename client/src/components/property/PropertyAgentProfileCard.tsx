import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Home } from 'lucide-react';
import { Link } from 'wouter';

export function PropertyAgentProfileCard({
  href,
  name,
  role,
  agency,
  image,
  bio,
  yearsExperience,
  isVerified,
  activeListings,
  listingsMayContinue,
  listingsLoading,
}: {
  href: string;
  name: string;
  role: string;
  agency?: string | null;
  image?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  isVerified?: boolean;
  activeListings?: number;
  listingsMayContinue?: boolean;
  listingsLoading?: boolean;
}) {
  const listingsLabel =
    activeListings === undefined ? '—' : `${activeListings}${listingsMayContinue ? '+' : ''}`;

  return (
    <section
      aria-labelledby="property-agent-profile-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">
          The listing representative
        </p>
        <h2
          id="property-agent-profile-heading"
          className="mt-1 text-lg font-extrabold text-slate-950"
        >
          Meet the agent
        </h2>
      </div>

      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-24 sm:w-24">
            {image ? (
              <img src={image} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-2xl font-bold text-blue-700">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-950">{name}</h3>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">{role}</p>
            {agency && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Building2 className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                {agency}
              </p>
            )}
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
              {bio?.trim() || `${name} is the approved representative for this listing.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <Home className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" /> Current listings
            </p>
            <p className="mt-1 text-lg font-extrabold text-slate-950">
              {listingsLoading ? '…' : listingsLabel}
            </p>
          </div>
          {yearsExperience != null && yearsExperience > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                Experience
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-950">{yearsExperience}+ years</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Link
          href={href}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto"
        >
          View agent profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
