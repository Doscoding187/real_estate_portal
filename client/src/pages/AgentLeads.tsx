import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { LeadPipeline } from '@/components/agent/LeadPipeline';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';

export default function AgentLeads() {
  const [location, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const propertyId = useMemo(() => {
    const [, search = ''] = location.split('?');
    const searchParams = new URLSearchParams(search);
    const value = searchParams.get('propertyId');
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [location]);

  const leadsLocked = !statusLoading && !status?.entitlements?.canReceiveLeads;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads & Clients</h1>
            <p className="text-sm text-gray-500 mt-1">
              {propertyId
                ? `Managing enquiries for property #${propertyId}`
                : 'Manage your lead pipeline and client relationships'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your lead workspace"
            description="We are confirming your onboarding and lead access before loading your pipeline."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : leadsLocked ? (
          <AgentFeatureLockedState
            title="Lead management unlocks after contact setup"
            description="Add the remaining core profile details, especially your contact information, to start receiving and managing leads."
            actionLabel="Finish setup"
            onAction={() => setLocation('/agent/setup')}
          />
        ) : (
          <LeadPipeline propertyId={propertyId} />
        )}
      </main>
    </div>
  );
}
