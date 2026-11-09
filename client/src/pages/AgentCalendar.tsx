import { useLocation } from 'wouter';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { getAgentJourneyAction, isAgentWorkspaceOpen } from '@/lib/agentJourney';
import { followAgentJourneyHref } from '@/lib/agentPlanGate';
import { ShowingsCalendar } from '@/components/agent/ShowingsCalendar';

export default function AgentCalendar() {
  const [, setLocation] = useLocation();
  const {
    status,
    isLoading: statusLoading,
    error: statusError,
    retry,
    agentLaunchAccessAvailable,
  } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  // Showings are paid operational data: ShowingsCalendar (which loads and books
  // showings) only mounts for an agent with full features. Fail closed on error.
  const calendarLocked = !statusLoading && !statusError && !status?.fullFeaturesUnlocked;
  const workspaceOpen = isAgentWorkspaceOpen(status);
  const journeyAction = getAgentJourneyAction(status, { agentLaunchAccessAvailable });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar & Showings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your property showings and appointments
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your calendar workspace"
            description="We are confirming your onboarding access before loading showings and appointment scheduling."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : statusError ? (
          <AgentJourneyStatusErrorState onRetry={retry} />
        ) : calendarLocked ? (
          <AgentFeatureLockedState
            title="Calendar unlocks with a plan"
            description="Choose a plan to schedule and manage showings. Only your profile is open before payment."
            actionLabel={
              journeyAction.waiting
                ? 'Return to dashboard'
                : workspaceOpen
                  ? 'Get access'
                  : journeyAction.label
            }
            onAction={() =>
              followAgentJourneyHref(
                journeyAction.waiting
                  ? '/agent/dashboard'
                  : workspaceOpen
                    ? '/agent/select-package'
                    : journeyAction.href,
                setLocation,
              )
            }
          />
        ) : (
          <ShowingsCalendar />
        )}
      </main>
    </div>
  );
}
