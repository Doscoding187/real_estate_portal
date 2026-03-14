import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight, Share2, Users } from 'lucide-react';
import { useLocation } from 'wouter';

export default function AgentReferrals() {
  const [, setLocation] = useLocation();

  return (
    <AgentAppShell>
      <main className={cn(agentPageStyles.container, 'max-w-[1200px]')}>
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className={agentPageStyles.title}>Referrals</h1>
            <p className={cn(agentPageStyles.subtitle, 'mt-1')}>
              Track referral growth and route opportunities into your agent workflow.
            </p>
          </div>
          <Button
            className={agentPageStyles.primaryButton}
            onClick={() => setLocation('/agent/leads')}
          >
            Open Leads
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className={agentPageStyles.panel}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[var(--primary)]" />
                Referral Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                Referral qualification is not wired into the current agent surface on this branch.
                The shell and route are in place, but the actual referral dataset/component does not
                exist on current `main`.
              </div>
              <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                Best next integration point: connect this page to live referral program endpoints
                once the referral feature lands in the agent router.
              </div>
            </CardContent>
          </Card>

          <Card className={agentPageStyles.panel}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--primary)]" />
                Current State
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                Referrals page shell is active.
              </div>
              <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                Navigation and routing are ready for future referral data.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AgentAppShell>
  );
}
