import { BriefcaseBusiness } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CommissionSummary } from '../commission/AgencyCommissionWorkspace';
import { LeadRow } from '../leads/AgencyLeadsWorkspace';
import { EmptyPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { WorkspaceContentProps } from '../workspace/types';

export function AgencyTransactionsWorkspace(props: WorkspaceContentProps) {
  const transactionLeads = props.leads.filter(lead =>
    ['offer_sent', 'converted', 'closed'].includes(String(lead.status || '')),
  );
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={BriefcaseBusiness} title="Deals and Offers" eyebrow="Transaction progression" />
        </CardHeader>
        <CardContent className="space-y-3">
          {transactionLeads.map(lead => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
          {!transactionLeads.length ? (
            <EmptyPanel icon={BriefcaseBusiness} title="No active transactions" text="Offer and closed leads will appear here." />
          ) : null}
        </CardContent>
      </Card>
      <CommissionSummary commission={props.commission} />
    </section>
  );
}
