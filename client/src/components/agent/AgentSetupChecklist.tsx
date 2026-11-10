import { Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { openPlanGate } from '@/lib/agentPlanGate';
import { isAgentPlanEntitled } from '@/lib/agentJourney';
import type { AgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';

type ChecklistStep = {
  key: 'profile' | 'draft' | 'plan' | 'pay' | 'live';
  label: string;
  done: boolean;
  note?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const PLAN_CHOSEN_STATES = ['pending_payment', 'payment_under_review', 'active', 'grace_period'];

/**
 * "Get set up" checklist for the Agent dashboard. Done states come only from
 * the onboarding status and the existing billing.agentWorkspace projection.
 */
export function AgentSetupChecklist({
  status,
  hasDraft,
  agentLaunchAccessAvailable = false,
}: {
  status: AgentOnboardingStatus;
  hasDraft: boolean;
  agentLaunchAccessAvailable?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const workspaceQuery = trpc.billing.agentWorkspace.useQuery(undefined, {
    enabled: user?.role === 'agent' && agentLaunchAccessAvailable,
    retry: false,
  });
  const invoice = workspaceQuery.data?.activeInvoice ?? null;
  const entitled = isAgentPlanEntitled(status);
  const subscriptionStatus = String(status.subscriptionStatus);
  const underReview =
    !entitled && (subscriptionStatus === 'payment_under_review' || invoice?.status === 'submitted');

  const steps: ChecklistStep[] = [
    {
      key: 'profile',
      label: 'Complete your profile',
      done: status.onboardingStep >= 3,
      actionLabel: 'Open profile',
      onAction: () => setLocation('/agent/setup'),
    },
    {
      key: 'draft',
      label: 'Create your first draft listing',
      done: hasDraft,
      actionLabel: 'Start a draft',
      onAction: entitled ? () => setLocation('/listings/create') : openPlanGate,
    },
    {
      key: 'plan',
      label: 'Choose a plan',
      done: entitled || Boolean(invoice) || PLAN_CHOSEN_STATES.includes(subscriptionStatus),
      actionLabel: 'Choose plan',
      onAction: openPlanGate,
    },
    {
      key: 'pay',
      label: 'Pay',
      // Done only when paid by the shared rule; a payment notice under review is not done.
      done: entitled,
      note: underReview ? 'Under review' : undefined,
      actionLabel: invoice || underReview ? 'View payment details' : undefined,
      onAction: invoice || underReview ? openPlanGate : undefined,
    },
    { key: 'live', label: 'Go live', done: isAgentPlanEntitled(status) },
  ];

  if (steps.every(step => step.done)) return null;
  const nextKey = steps.find(step => !step.done)?.key;

  return (
    <section
      aria-label="Get set up"
      data-testid="agent-setup-checklist"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-950">Get set up</h2>
      <ol className="mt-3 grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => (
          <li
            key={step.key}
            data-done={step.done ? 'true' : 'false'}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
          >
            <div className="flex items-center gap-2">
              {step.done ? (
                <Check className="h-4 w-4 text-emerald-600" aria-label="Done" />
              ) : (
                <Circle className="h-4 w-4 text-slate-300" aria-hidden="true" />
              )}
              <span className="font-medium text-slate-800">
                {index + 1}. {step.label}
              </span>
            </div>
            {!step.done && step.note ? (
              <span className="text-xs font-medium text-amber-700">{step.note}</span>
            ) : null}
            {!step.done && step.onAction && step.actionLabel ? (
              <Button
                type="button"
                size="sm"
                variant={step.key === nextKey ? 'default' : 'outline'}
                className="h-8 self-start rounded-full px-3 text-xs"
                onClick={step.onAction}
              >
                {step.actionLabel}
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
