import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  HelpCircle,
  MessageCircle,
  Target,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

function formatSetupFlag(flag: string): string {
  return flag
    .replace(/^missing_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof Target;
  tone: string;
}) {
  return (
    <Card className={cn(agentPageStyles.statCard, tone)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className={agentPageStyles.statLabel}>{title}</p>
            <p className={agentPageStyles.statValue}>{value}</p>
            <p className={cn(agentPageStyles.statSub, 'mt-2')}>{subtitle}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3">
            <Icon className="h-6 w-6 text-slate-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-200 bg-[#fbfaf7] px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AgentTrainingSupport() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('academy');
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const { data: stats, isLoading: statsLoading } = trpc.agent.getDashboardStats.useQuery(
    undefined,
    {
      retry: false,
    },
  );

  const profileCompletionScore = status?.profileCompletionScore ?? 0;
  const missingSetupItems = useMemo(() => {
    const flags = status?.profileCompletionFlags ?? [];
    return flags.map(formatSetupFlag).slice(0, 6);
  }, [status?.profileCompletionFlags]);

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your training workspace"
            description="We are confirming your onboarding access before loading guidance and support tools."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : (
          <>
            <div className={agentPageStyles.header}>
              <div className={agentPageStyles.headingBlock}>
                <h1 className={agentPageStyles.title}>Training & Support</h1>
                <p className={agentPageStyles.subtitle}>
                  Guidance, resources, and next steps tied to your live onboarding progress.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <StatCard
                title="Profile Completion"
                value={`${profileCompletionScore}%`}
                subtitle={
                  profileCompletionScore >= 80
                    ? 'Your agent profile is production-ready.'
                    : 'Finish setup to unlock the full workspace.'
                }
                icon={UserCheck}
                tone="border-l-4 border-l-[var(--primary)]"
              />
              <StatCard
                title="Active Listings"
                value={statsLoading ? '�' : (stats?.activeListings ?? 0)}
                subtitle="Listings currently live"
                icon={TrendingUp}
                tone="border-l-4 border-l-emerald-500"
              />
              <StatCard
                title="Leads This Week"
                value={statsLoading ? '�' : (stats?.newLeadsThisWeek ?? 0)}
                subtitle="Incoming pipeline activity"
                icon={Target}
                tone="border-l-4 border-l-blue-500"
              />
              <StatCard
                title="Showings Today"
                value={statsLoading ? '�' : (stats?.showingsToday ?? 0)}
                subtitle="Appointments on schedule"
                icon={CalendarDays}
                tone="border-l-4 border-l-amber-500"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className={cn(agentPageStyles.tabsList, 'grid w-full max-w-3xl grid-cols-4')}
              >
                <TabsTrigger value="academy" className={agentPageStyles.tabTrigger}>
                  Academy
                </TabsTrigger>
                <TabsTrigger value="certifications" className={agentPageStyles.tabTrigger}>
                  Certifications
                </TabsTrigger>
                <TabsTrigger value="help" className={agentPageStyles.tabTrigger}>
                  Help Center
                </TabsTrigger>
                <TabsTrigger value="support" className={agentPageStyles.tabTrigger}>
                  Support
                </TabsTrigger>
              </TabsList>

              <TabsContent value="academy" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      Guided Onboarding
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {missingSetupItems.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600">
                          Focus on the items below to unlock full dashboard access.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {missingSetupItems.map(item => (
                            <Badge key={item} variant="outline" className="rounded-full">
                              {item}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          className={agentPageStyles.primaryButton}
                          onClick={() => setLocation('/agent/setup')}
                        >
                          Continue setup
                        </Button>
                      </div>
                    ) : (
                      <EmptyPanel
                        title="Your profile is complete"
                        description="Academy content will appear here once the training library is connected."
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certifications" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyPanel
                      title="Certification tracking is not live yet"
                      description="Once credentials are connected, your earned badges and progress will show here."
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="help" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5 text-blue-600" />
                      Help Center
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Jump back to the core workspace areas while the knowledge base is being
                      connected.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={() => setLocation('/agent/listings')}>
                        Listings
                      </Button>
                      <Button variant="outline" onClick={() => setLocation('/agent/leads')}>
                        Leads
                      </Button>
                      <Button variant="outline" onClick={() => setLocation('/agent/marketing')}>
                        Marketing Hub
                      </Button>
                      <Button variant="outline" onClick={() => setLocation('/agent/settings')}>
                        Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="support" className="space-y-4">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      Support Desk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <EmptyPanel
                      title="Support ticketing is not connected"
                      description="Use the strategy desk while we wire the support queue into the agent workspace."
                    />
                    <Button
                      className={agentPageStyles.primaryButton}
                      onClick={() => setLocation('/book-strategy')}
                    >
                      Schedule a support call
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
