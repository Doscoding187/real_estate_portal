import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlanGateDialog } from '@/components/agent/PlanGateDialog';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import {
  claimPlanPrompt,
  closePlanGate,
  consumePlanPromptTrigger,
  markPlanPromptSeen,
  openPlanGate,
  setPlanGateAvailable,
  usePlanGateOpen,
} from '@/lib/agentPlanGate';
import {
  getAgentStatusBannerCopy,
  isAgentPaymentBlocked,
  isAgentPlanEntitled,
  isAgentWorkspaceOpen,
} from '@/lib/agentJourney';

/**
 * Rendered once by the Agent shell: the slim preview banner (or a status banner
 * for rejected, suspended, approval and agency-managed states), the shared
 * PlanGateDialog and the once-per-session auto-prompt.
 */
export function AgentPlanGateLayer() {
  const { status, isLoading, error } = useAgentOnboardingStatus();
  const open = usePlanGateOpen();
  const ready = !isLoading && !error && isAgentWorkspaceOpen(status);
  const entitled = isAgentPlanEntitled(status);
  const blocked = isAgentPaymentBlocked(status);
  const statusBanner = getAgentStatusBannerCopy(status);
  const available = ready && !entitled;

  useEffect(() => {
    // Not ready (loading, error, unverified) or already entitled: no control may
    // open the dialog, and a stale open flag is cleared.
    setPlanGateAvailable(available);
    if (!available) closePlanGate();
  }, [available]);

  useEffect(() => {
    if (!available || blocked) return;
    // Only after a meaningful action (profile saved), never on first login, and
    // never again after a dismissal this session.
    if (consumePlanPromptTrigger() && claimPlanPrompt()) openPlanGate();
  }, [available, blocked]);

  if (!ready) return null;

  return (
    <>
      {!entitled && statusBanner ? (
        <div
          role="status"
          data-testid="agent-status-banner"
          className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-950 md:px-7"
        >
          <span className="font-semibold">{statusBanner.title}.</span> {statusBanner.description}
        </div>
      ) : null}
      {!entitled && !statusBanner ? (
        <div
          role="status"
          data-testid="agent-preview-banner"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-[12.5px] text-amber-950 md:px-7"
        >
          <span>Preview mode - choose a plan to publish your listings and receive leads</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-full border-amber-300 bg-white px-3 text-xs"
            onClick={openPlanGate}
          >
            Choose plan
          </Button>
        </div>
      ) : null}
      {!entitled ? (
        <PlanGateDialog
          open={open}
          blockedReason={statusBanner?.description ?? null}
          onOpenChange={next => {
            if (next) {
              openPlanGate();
            } else {
              markPlanPromptSeen();
              closePlanGate();
            }
          }}
        />
      ) : null}
    </>
  );
}
