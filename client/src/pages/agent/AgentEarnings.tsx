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
            title="Commission tracking is not unlocked yet"
            description={
              !status?.fullFeaturesUnlocked
                ? 'Finish the remaining onboarding steps to unlock commission tracking and earnings insights.'
                : 'Your current package does not include commission tracking yet.'
            }
            actionLabel={!status?.fullFeaturesUnlocked ? 'Finish setup' : 'Review access'}
            onAction={() =>
              setLocation(!status?.fullFeaturesUnlocked ? '/agent/setup' : '/agent/settings')
            }
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
