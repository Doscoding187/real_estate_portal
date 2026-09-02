import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { CanvassingWorkspace } from '@/features/canvassing/CanvassingWorkspace';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { AgentJourneyStatusErrorState } from '@/components/agent/AgentJourneyStatusErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { getAgentJourneyAction, isAgentProfileJourneyStep } from '@/lib/agentJourney';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ArrowRight, Building2, Loader2, MapPinned, Megaphone, Share2, Users } from 'lucide-react';

function IndependentGrowthPlan({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    {
      icon: Megaphone,
      title: 'Stay visible locally',
      description: 'Create a listing launch post or neighbourhood update from your Marketing Hub.',
      label: 'Open Marketing Hub',
      href: '/agent/marketing',
    },
    {
      icon: Users,
      title: 'Work every buyer conversation',
      description:
        'Use your CRM to record a real contact outcome, schedule the next action, and progress qualified enquiries.',
      label: 'Open Leads & CRM',
      href: '/agent/leads',
    },
    {
      icon: Share2,
      title: 'Expand your opportunity mix',
      description:
        'Match qualified buyers with current developer referral opportunities and retain the buyer file in your workspace.',
      label: 'Explore Referrals',
      href: '/agent/referrals',
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 rounded-[22px] border border-sky-200 bg-[linear-gradient(135deg,#eff8ff_0%,#ffffff_58%,#f0fdf4_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="border-sky-200 bg-white text-sky-800 hover:bg-white">
            Independent agent plan
          </Badge>
          <span className="text-xs font-medium text-slate-500">
            Build your business deliberately
          </span>
        </div>
        <div>
          <h1 className={agentPageStyles.title}>Seller acquisition, built around your next move</h1>
          <p className={cn(agentPageStyles.subtitle, 'mt-2 max-w-3xl')}>
            Use the tools you already have to stay visible, respond to buyer demand, and keep a
            consistent weekly growth rhythm. Shared seller prospect records and mandate workflows
            are intentionally kept inside agency teams.
          </p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold text-slate-950">Your independent growth loop</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <Card key={action.title} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="flex h-full flex-col p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-[var(--primary)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-950">{action.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {action.description}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 justify-between border-slate-200"
                    onClick={() => onNavigate(action.href)}
                  >
                    {action.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="border-amber-200 bg-amber-50/70 shadow-none">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-amber-950">
              Need a shared seller and mandate workflow?
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-900">
              Team canvassing includes private seller records, assignments, follow-ups, and mandate
              evidence. It needs an agency membership so that sensitive seller information has a
              clear operating owner.
            </p>
          </div>
          <Button
            className="shrink-0 bg-amber-700 hover:bg-amber-800"
            onClick={() => onNavigate('/contact')}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Talk about team setup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AgentCanvassing() {
  const [, setLocation] = useLocation();
  const {
    status,
    isLoading: statusLoading,
    error: statusError,
    retry: retryStatus,
  } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const accessQuery = trpc.canvassing.getWorkspaceAccess.useQuery(undefined, {
    enabled: !statusLoading && Boolean(status?.fullFeaturesUnlocked),
    retry: false,
  });
  const journeyAction = getAgentJourneyAction(status);
  const needsProfileCompletion = isAgentProfileJourneyStep(status);
  const journeyLocked = !statusLoading && !status?.fullFeaturesUnlocked;

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your acquisition workspace"
            description="We are checking your onboarding and Launch Access before loading business-growth tools."
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
                ? 'Complete your profile before building your workspace'
                : journeyAction.title
            }
            description={
              needsProfileCompletion
                ? 'Finish your professional profile, then activate Launch Access to use your agent growth workspace.'
                : journeyAction.description
            }
            actionLabel={journeyAction.waiting ? 'Return to dashboard' : journeyAction.label}
            onAction={() =>
              setLocation(journeyAction.waiting ? '/agent/dashboard' : journeyAction.href)
            }
          />
        ) : accessQuery.isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Preparing your seller acquisition workspace…
          </div>
        ) : accessQuery.isError ? (
          <AgentFeatureLockedState
            title="Seller acquisition is unavailable right now"
            description="We could not confirm the workspace that matches your account. Your other agent tools remain available."
            actionLabel="Try again"
            onAction={() => void accessQuery.refetch()}
          />
        ) : accessQuery.data?.mode === 'agency_team' ? (
          <CanvassingWorkspace mode="agent" onNavigate={setLocation} />
        ) : accessQuery.data?.mode === 'agency_profile_required' ? (
          <AgentFeatureLockedState
            title="Finish agency membership before canvassing"
            description={
              accessQuery.data.message ||
              'An approved agency agent profile is required before you can work private seller prospects.'
            }
            actionLabel="Open settings"
            onAction={() => setLocation('/agent/settings')}
          />
        ) : (
          <IndependentGrowthPlan onNavigate={setLocation} />
        )}
      </main>
    </AgentAppShell>
  );
}
