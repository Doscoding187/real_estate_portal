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
  usePlanGateOpen,
} from '@/lib/agentPlanGate';
import { isAgentPlanEntitled, isAgentWorkspaceOpen } from '@/lib/agentJourney';

/**
 * Rendered once by the Agent shell: the slim preview banner, the shared
 * PlanGateDialog and the once-per-session auto-prompt.
 */
export function AgentPlanGateLayer() {
  const { status, isLoading, error } = useAgentOnboardingStatus();
  const open = usePlanGateOpen();
  const ready = !isLoading && !error && isAgentWorkspaceOpen(status);
  const entitled = isAgentPlanEntitled(status);

  useEffect(() => {
    if (!ready || entitled) return;
    // Only after a meaningful action (profile saved / first draft created),
    // never on first login, and never again after a dismissal this session.
    if (consumePlanPromptTrigger() && claimPlanPrompt()) openPlanGate();
  }, [ready, entitled]);

  if (!ready) return null;

  return (
    <>
      {!entitled ? (
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
