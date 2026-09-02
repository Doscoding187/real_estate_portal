import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { CommissionTracker } from '@/components/agent/CommissionTracker';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { getAgentJourneyAction, isAgentProfileJourneyStep } from '@/lib/agentJourney';

export default function AgentEarnings() {
  const [, setLocation] = useLocation();
  const {
    status,
    isLoading: statusLoading,
    error: statusError,
    retry: retryStatus,
  } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const journeyLocked = !statusLoading && !status?.fullFeaturesUnlocked;
  const earningsLocked =
    !statusLoading && !journeyLocked && !status?.entitlements?.featureFlags?.hasCommissionTracking;
  const journeyAction = getAgentJourneyAction(status);
  const needsProfileCompletion = isAgentProfileJourneyStep(status);

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
        ) : statusError ? (
          <AgentJourneyStatusErrorState onRetry={retryStatus} />
        ) : journeyLocked ? (
          <AgentFeatureLockedState
            title={
              needsProfileCompletion
                ? 'Complete your profile before using earnings'
                : journeyAction.title
            }
            description={
              needsProfileCompletion
                ? 'Finish your professional profile, then activate Launch Access before using optional business tools.'
                : journeyAction.description
            }
            actionLabel={journeyAction.waiting ? 'Return to dashboard' : journeyAction.label}
            onAction={() =>
              setLocation(journeyAction.waiting ? '/agent/dashboard' : journeyAction.href)
            }
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
