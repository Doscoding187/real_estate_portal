import { ArrowRight } from 'lucide-react';

export type RegisterRole = 'agency_admin' | 'property_developer';

const ROLE_COPY: Record<RegisterRole, { label: string; hint: string }> = {
  agency_admin: {
    label: 'Create your Agency owner account',
    hint: 'Create the owner account, verify your email, then continue into agency set-up. Publishing and paid access open later.',
  },
  property_developer: {
    label: 'Create your Developer account',
    hint: 'Create the owner account, verify your email, then continue into company onboarding. Publishing and paid access open later.',
  },
};

/** Sign-up CTA for the agency and developer landing pages. Preselects the role on /login. */
export function RegisterRoleCta({
  role,
  tone = 'dark',
}: {
  role: RegisterRole;
  tone?: 'dark' | 'light';
}) {
  const dark = tone === 'dark';
  const copy = ROLE_COPY[role];
  return (
    <div data-testid="cta-register-role" className="flex flex-col gap-2">
      <a
        href={`/login?mode=register&role=${role}`}
        className={`inline-flex w-fit items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
          dark
            ? 'bg-white text-slate-950 hover:bg-slate-100'
            : 'bg-slate-950 text-white hover:bg-slate-800'
        }`}
      >
        {copy.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
      <span className={`max-w-md text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        {copy.hint}
      </span>
    </div>
  );
}
