import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { isAgentPlanEntitled } from '@/lib/agentJourney';
import { openPlanGate } from '@/lib/agentPlanGate';

/**
 * Wraps the listing wizard route. Agents without a plan cannot create or edit
 * drafts: they see a locked state and the "Get access" panel. Other roles and
 * entitled agents pass straight through.
 */
export function AgentListingAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAgent = user?.role === 'agent';
  const { status, isLoading, error } = useAgentOnboardingStatus();
  const locked = isAgent && !isLoading && !error && Boolean(status) && !isAgentPlanEntitled(status);

  useEffect(() => {
    if (locked) openPlanGate();
  }, [locked]);

  if (!isAgent) return <>{children}</>;
  if (isLoading) return null;
  if (!locked) return <>{children}</>;

  return (
    <AgentAppShell>
      <div className="mx-auto max-w-3xl p-6">
        <AgentFeatureLockedState
          title="Listings unlock with a plan"
          description="Choose a plan to create and publish listings. Your profile stays open in the meantime."
          actionLabel="Get access"
          onAction={openPlanGate}
        />
      </div>
    </AgentAppShell>
  );
}
