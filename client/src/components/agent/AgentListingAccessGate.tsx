import type { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import {
  getAgentJourneyAction,
  getPublishBlock,
  isAgentPaymentBlocked,
  isAgentPlanEntitled,
  isAgentWorkspaceOpen,
} from '@/lib/agentJourney';
import { openPlanGate } from '@/lib/agentPlanGate';

/**
 * Wraps the listing wizard route. Fails closed: an agent without a plan (or
 * whose status cannot be confirmed) sees a locked state and must press "Get
 * access" themselves. Other roles and entitled agents pass straight through.
 */
export function AgentListingAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAgent = user?.role === 'agent';
  const { status, isLoading, error, retry, agentLaunchAccessAvailable } =
    useAgentOnboardingStatus();

  if (!isAgent) return <>{children}</>;
  if (isLoading) return null;
  const publishBlock = error ? null : getPublishBlock(status);
  if (!error && isAgentPlanEntitled(status) && !publishBlock) return <>{children}</>;

  const journeyAction = getAgentJourneyAction(status, { agentLaunchAccessAvailable });
  const workspaceOpen = !error && isAgentWorkspaceOpen(status) && !isAgentPaymentBlocked(status);

  return (
    <AgentAppShell>
      <div className="mx-auto max-w-3xl p-6">
        {publishBlock ? (
          <AgentFeatureLockedState
            title={publishBlock.title}
            description={publishBlock.description}
            actionLabel={publishBlock.label}
            onAction={() => setLocation(publishBlock.href)}
          />
        ) : error ? (
          <AgentFeatureLockedState
            title="We could not confirm your access"
            description="Listings stay locked until your workspace status can be confirmed. Please try again."
            actionLabel="Retry"
            onAction={retry}
          />
        ) : workspaceOpen ? (
          <AgentFeatureLockedState
            title="Listings unlock with a plan"
            description="Choose a plan to create and publish listings. Only your profile is open before payment."
            actionLabel="Get access"
            onAction={openPlanGate}
          />
        ) : (
          <AgentFeatureLockedState
            title={journeyAction.title}
            description={journeyAction.description}
            actionLabel={journeyAction.label}
            onAction={() => setLocation(journeyAction.href)}
          />
        )}
      </div>
    </AgentAppShell>
  );
}
