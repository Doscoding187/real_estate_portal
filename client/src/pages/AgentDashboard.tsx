import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { AgentDashboardOverview } from '@/components/agent/AgentDashboardOverview';
import { AgentStatusStrip } from '@/components/agent/AgentStatusStrip';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { AgentServicesReferralPanel } from '@/components/agent/AgentServicesReferral';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { isAgentWorkspaceOpen, isAgentPlanEntitled } from '@/lib/agentJourney';

export default function AgentDashboard() {
  const { status, isLoading, error, retry, agentLaunchAccessAvailable } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] px-6">
        <AgentJourneyStatusErrorState onRetry={retry} />
      </div>
    );
  }

  if (!isAgentWorkspaceOpen(status)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          <p className="text-slate-400">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <AgentAppShell>
      <div className="flex flex-col gap-4">
        <AgentStatusStrip agentLaunchAccessAvailable={agentLaunchAccessAvailable} />
        <AgentServicesReferralPanel />
        {!isAgentPlanEntitled(status) ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-lg font-semibold">Prepare your professional workspace</h2>
            <p className="mt-2 text-sm">
              Complete your profile and approval information. Listings, publishing and enquiries
              unlock when you choose a plan.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold underline">
              <a href="/agent/setup">Complete profile</a>
            </div>
          </section>
        ) : null}
        <AgentDashboardOverview
          onboardingStatus={status}
          agentLaunchAccessAvailable={agentLaunchAccessAvailable}
        />
      </div>
    </AgentAppShell>
  );
}
