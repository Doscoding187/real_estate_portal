// @ts-nocheck
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function OnboardingSuccess() {
  const [, navigate] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);

  const agencyId = queryParams.get('agency_id');
  const invoiceId = queryParams.get('invoiceId');
  const isManualEftHandoff = Boolean(invoiceId);

  const agencyQuery = trpc.agency.getById.useQuery(
    { id: Number(agencyId) },
    {
      enabled: Boolean(agencyId),
      refetchInterval: data => {
        if (data?.subscriptionStatus === 'active') return false;
        return isManualEftHandoff ? false : 2000;
      },
    },
  );
  const agency = agencyQuery.data as any;
  const isActive = agency?.subscriptionStatus === 'active';

  const billingUrl = invoiceId
    ? `/agency/billing?invoiceId=${encodeURIComponent(invoiceId)}&onboarding=1`
    : '/agency/billing?onboarding=1';
  const canContinue = isActive || isManualEftHandoff;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {isActive
              ? 'Agency Launch Access active'
              : isManualEftHandoff
                ? 'Invoice Issued'
                : 'Activation Pending'}
          </h1>
          <p className="text-gray-600">
            {isManualEftHandoff && !isActive
              ? 'Your agency setup is saved. Complete the EFT payment and upload proof to activate access.'
              : isActive
                ? 'Your Agency workspace is active and ready for your people, inventory and opportunities.'
                : 'A verified invoice and payment proof are required before agency access can be activated.'}
          </p>
        </div>

        {!isActive && isManualEftHandoff ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="mb-1 font-medium text-blue-900">EFT invoice ready</p>
                <p className="text-sm text-blue-700">
                  Open billing to view bank details, use your invoice reference, and upload proof of
                  payment.
                </p>
                <p className="mt-2 text-xs text-blue-600">Invoice ID: {invoiceId}</p>
              </div>
            </div>
          </div>
        ) : !isActive ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <p className="mb-1 font-medium text-amber-900">Activation is not available yet</p>
                <p className="text-sm text-amber-700">
                  Start from the canonical agency billing workspace to request an invoice and submit
                  payment proof.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="mb-1 font-medium text-green-900">Agency workspace ready</p>
                <p className="text-sm text-green-700">
                  Bring the team into the workspace, then manage inventory, opportunities and
                  commercial progress in one place.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => navigate(isActive ? '/agency/dashboard?welcome=true' : billingUrl)}
          disabled={!canContinue}
          className="w-full"
          size="lg"
        >
          {isActive ? (
            <>
              Open Agency workspace
              <span className="ml-2">→</span>
            </>
          ) : isManualEftHandoff ? (
            <>
              Open Billing Workspace
              <span className="ml-2">→</span>
            </>
          ) : (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Waiting for invoice...
            </>
          )}
        </Button>

        <p className="mt-6 text-center text-xs text-gray-500">
          {isManualEftHandoff
            ? 'Activation starts after finance approves your proof of payment.'
            : 'If you expected an invoice, please return to agency onboarding or contact support.'}
        </p>
      </div>
    </div>
  );
}
