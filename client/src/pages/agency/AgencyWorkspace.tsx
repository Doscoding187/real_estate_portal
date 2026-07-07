import { useState } from 'react';
import { useLocation } from 'wouter';
import { AgencyLayout } from '@/components/agency/AgencyLayout';
import { ActivationBanner } from '@/features/agency/shell/ActivationBanner';
import { AgencySidebar } from '@/features/agency/shell/AgencySidebar';
import { AgencyTopBar } from '@/features/agency/shell/AgencyTopBar';
import { WORKSPACE_TITLES, workspaceFromPath } from '@/features/agency/workspace/constants';
import { useAgencyWorkspaceData } from '@/features/agency/workspace/useAgencyWorkspaceData';
import { WorkspaceContent } from '@/features/agency/workspace/WorkspaceContent';
import type { WorkspaceId } from '@/features/agency/workspace/types';

export default function AgencyWorkspace() {
  const [location, setLocation] = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const workspace = workspaceFromPath(location);
  const workspaceMeta = WORKSPACE_TITLES[workspace];
  const {
    status,
    statusLoading,
    agencyName,
    principalName,
    setupComplete,
    billingNeedsAttention,
    teamNeedsAttention,
    workspaceContent,
  } = useAgencyWorkspaceData(workspace);

  const navigateTo = (id: WorkspaceId) => {
    setLocation(`/agency/${id}`);
    setMobileNavOpen(false);
  };

  if (statusLoading) {
    return (
      <AgencyLayout className="bg-[#f5f7f4]">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
            <p className="text-sm font-medium text-slate-500">Preparing your agency workspace...</p>
          </div>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout className="bg-[#f5f7f4]">
      <div className="min-h-screen text-slate-950">
        <AgencySidebar
          agencyName={agencyName}
          location={[status?.agency?.city, status?.agency?.province].filter(Boolean).join(', ')}
          activeWorkspace={workspace}
          onNavigate={navigateTo}
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />

        <div className="lg:pl-72">
          <AgencyTopBar
            workspace={workspace}
            workspaceMeta={workspaceMeta}
            principalName={principalName}
            setupComplete={setupComplete}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onNavigate={navigateTo}
            setLocation={setLocation}
          />

          <main className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 lg:px-6">
            {billingNeedsAttention || teamNeedsAttention ? (
              <ActivationBanner
                billingNeedsAttention={billingNeedsAttention}
                onNavigate={navigateTo}
              />
            ) : null}

            <WorkspaceContent
              workspace={workspace}
              {...workspaceContent}
              onNavigate={navigateTo}
              setLocation={setLocation}
              setupComplete={setupComplete}
            />
          </main>
        </div>
      </div>
    </AgencyLayout>
  );
}
