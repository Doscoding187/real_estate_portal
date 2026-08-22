import { Link } from 'wouter';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { getAccountAuthHref } from '@/lib/publicNavigation';

const AGENCY_SETUP_PATH = '/agency/setup';

const ROLE_LABELS: Record<string, string> = {
  visitor: 'a buyer / visitor account',
  agent: 'an Agent account',
  property_developer: 'a Developer account',
  service_provider: 'a Service provider account',
  super_admin: 'a platform admin account',
};

/**
 * Assisted entry shown to signed-in non-agency users who express Agency
 * purchase intent on /agency/setup. It explains the account boundary without
 * mutating roles or weakening server-enforced agency_admin authorization,
 * and hands the user an actionable path that preserves their intent.
 */
export function AgencySetupAccountBoundary() {
  const { user } = useAuth();
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? 'another account type';
  const isAgent = user?.role === 'agent';
  const registerHref = getAccountAuthHref('register', AGENCY_SETUP_PATH, 'agency_admin');

  return (
    <div className="mx-auto max-w-xl px-4 py-16" data-testid="agency-setup-account-boundary">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
          Agency setup needs an Agency owner account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You are signed in as {roleLabel}. Agency setup creates your agency's commercial account
          and issues its Launch Access invoice, so it cannot run under this sign-in.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link href={registerHref}>
            <Button className="w-full">
              Register an Agency owner account
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/advertise/sell/agencies">
            <Button variant="outline" className="w-full">
              Back to the Agency overview
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          Your current sign-in stays active. Registering an Agency owner account creates a separate
          account for your agency.
        </p>
      </div>

      {isAgent ? (
        <p className="mt-4 text-center text-sm text-slate-600">
          Looking for individual agent access instead?{' '}
          <Link href="/agent/select-package">
            <span className="font-semibold text-blue-700 hover:underline">
              Continue to Agent Launch Access
            </span>
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default AgencySetupAccountBoundary;
