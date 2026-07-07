import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LeadRow } from '../leads/AgencyLeadsWorkspace';
import { EmptyPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import { TodayPanel } from '../workspace/WorkspacePanels';
import type { WorkspaceContentProps } from '../workspace/types';

export function AgencyMyDayWorkspace(props: WorkspaceContentProps) {
  const viewingLeads = props.leads.filter(lead =>
    ['viewing_scheduled', 'viewing'].includes(String(lead.status || '')),
  );
  const followUps = props.leads.filter(lead => (lead.status || '') === 'contacted');
  return (
    <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <TodayPanel items={props.agendaItems} onNavigate={props.onNavigate} />
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={CalendarDays} title="Viewing Follow-through" eyebrow="Appointments and feedback" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...viewingLeads, ...followUps].slice(0, 10).map(lead => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
          {!viewingLeads.length && !followUps.length ? (
            <EmptyPanel icon={CalendarDays} title="No viewing queue" text="Viewing-stage leads and follow-ups will appear here." />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export function AgencyViewingsWorkspace(props: WorkspaceContentProps) {
  return <AgencyMyDayWorkspace {...props} />;
}
