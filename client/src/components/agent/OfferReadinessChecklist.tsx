import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AgentLeadOfferReadiness } from '@shared/agentLeadOfferReadiness';

const STEPS: Array<{ key: keyof AgentLeadOfferReadiness; label: string; instructions: string }> = [
  {
    key: 'viewingCompleted',
    label: 'Viewing completed',
    instructions:
      'Finish the viewing and mark it Complete in Calendar. Then confirm this check here.',
  },
  {
    key: 'feedbackLogged',
    label: 'Buyer feedback logged',
    instructions:
      'Save the buyer’s feedback and agreed next step in the lead’s outcome notes. Then confirm this check.',
  },
  {
    key: 'affordabilityConfirmed',
    label: 'Buyer affordability or qualification confirmed',
    instructions:
      'Confirm the buyer’s budget and intended payment approach. Record the basis for your assessment in the lead’s notes, then confirm this check.',
  },
];

type Props = {
  readiness: AgentLeadOfferReadiness;
  canMoveToOffer: boolean;
  blockers: string[];
  isLoading: boolean;
  isSaving: boolean;
  onToggle: (key: keyof AgentLeadOfferReadiness) => void;
};

export function OfferReadinessChecklist({
  readiness,
  canMoveToOffer,
  blockers,
  isLoading,
  isSaving,
  onToggle,
}: Props) {
  const recorded = STEPS.filter(step => readiness[step.key]).length;
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs leading-5 text-slate-500">
        Work through these steps before moving the lead to Offer. These are your recorded
        confirmations; Calendar completion and saved notes do not automatically tick the checks.
      </p>
      <p className="text-xs font-semibold text-slate-700" role="status">
        {isLoading
          ? 'Loading checks…'
          : isSaving
            ? 'Saving confirmation…'
            : `${recorded} of 3 confirmations recorded`}
      </p>
      <div className="space-y-2">
        {STEPS.map((step, index) => {
          const checked = readiness[step.key];
          return (
            <button
              key={step.key}
              type="button"
              aria-pressed={checked}
              aria-label={`${index + 1}. ${step.label}`}
              disabled={isLoading || isSaving}
              onClick={() => onToggle(step.key)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${checked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
            >
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {checked ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="block h-4 w-4 rounded-full border border-slate-300" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {index + 1}. {step.label}
                </span>
                <span className="mt-1 block text-xs leading-5">{step.instructions}</span>
                <span className="mt-1 block text-[11px] font-semibold">
                  {checked
                    ? 'Recorded · click to undo'
                    : 'Not recorded · click to confirm when done'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {!isLoading && !canMoveToOffer && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Why Move to Offer is unavailable
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {(blockers.length
              ? blockers
              : ['Record all three checks and resolve the lead’s outstanding requirements.']
            ).map((blocker, index) => (
              <li key={`${index}-${blocker}`}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
      {!isLoading && canMoveToOffer && (
        <p className="text-xs leading-5 text-emerald-700">
          Your confirmations are recorded and the lead meets the requirements to move to Offer.
        </p>
      )}
      <p className="text-xs leading-5 text-slate-500">
        Move to Offer updates the CRM stage. It does not send an offer document or confirm a sale.
      </p>
    </div>
  );
}
