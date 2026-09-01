import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { CommissionTracker } from '@/components/agent/CommissionTracker';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';

export default function AgentEarnings() {
  const [, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const earningsLocked =
    !statusLoading && !status?.entitlements?.featureFlags?.hasCommissionTracking;

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your earnings workspace"
            description="We are confirming your onboarding and commission access before loading payout data."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : earningsLocked ? (
          <AgentFeatureLockedState
            title="Commission tracking is not active on this account"
            description="This workspace has not been granted commission and earnings tracking yet. Your listings, leads and daily pipeline remain available according to your current access."
            actionLabel="Back to dashboard"
            onAction={() => setLocation('/agent/dashboard')}
          />
        ) : (
          <>
            <div className={agentPageStyles.header}>
              <div className={agentPageStyles.headingBlock}>
                <h1 className={agentPageStyles.title}>Earnings</h1>
                <p className={agentPageStyles.subtitle}>
                  Track live commissions, payout state, and exportable earnings records.
                </p>
              </div>
            </div>

            <CommissionTracker />
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
