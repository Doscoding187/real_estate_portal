import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { AgentDashboardOverview } from '@/components/agent/AgentDashboardOverview';
import { AgentStatusStrip } from '@/components/agent/AgentStatusStrip';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';

export default function AgentDashboard() {
  const { status, isLoading, error, retry } = useAgentOnboardingStatus({
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

  if (!status?.dashboardUnlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600"></div>
          <p className="text-slate-400">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <AgentAppShell>
      <div className="flex flex-col gap-4">
        <AgentStatusStrip />
        <AgentDashboardOverview onboardingStatus={status} />
      </div>
    </AgentAppShell>
  );
}
