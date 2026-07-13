import { useMemo, useState } from 'react';
import { AlertTriangle, CircleDollarSign, FileText, Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { EmptyPanel, ErrorPanel, SectionTitle } from '../workspace/WorkspacePrimitives';
import type { Tone, WorkspaceContentProps } from '../workspace/types';
import { formatDate, toneClasses } from '../workspace/utils';

type Settlement = any;
const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 });
const money = (value?: number | null) => currency.format(Number(value || 0));
const label = (value?: string | null) => String(value || 'not set').replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const outstanding = (settlement: Settlement) => Math.max(0, Number(settlement.expectedCommission || 0) - Number(settlement.amountReceived || 0));

function statusTone(status?: string | null): Tone {
  if (['received'].includes(String(status))) return 'emerald';
  if (['disputed', 'reconciliation_required', 'cancelled'].includes(String(status))) return 'rose';
  if (['partially_received', 'awaiting_payment'].includes(String(status))) return 'amber';
  return 'sky';
}

function StatusBadge({ status }: { status?: string | null }) {
  const tone = statusTone(status);
  return <Badge className={cn(toneClasses(tone).soft, toneClasses(tone).border, toneClasses(tone).text)}>{label(status)}</Badge>;
}

export function AgencyCommissionWorkspace(_props: WorkspaceContentProps) {
  const { user } = useAuth();
  const isAdmin = ['agency_admin', 'super_admin'].includes(String(user?.role || ''));
  const utils = trpc.useUtils();
  const settlementsQuery = trpc.agency.getCommissionSettlements.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const settlements = (settlementsQuery.data || []) as Settlement[];
  const selected = settlements.find(item => item.id === selectedId) || null;
  const filtered = useMemo(() => settlements.filter(item =>
    (statusFilter === 'all' || item.status === statusFilter) && (!overdueOnly || item.overdue),
  ), [settlements, statusFilter, overdueOnly]);
  const totals = useMemo(() => ({
    forecast: settlements.reduce((sum, item) => sum + Number(item.expectedCommission || 0), 0),
    received: settlements.reduce((sum, item) => sum + Number(item.amountReceived || 0), 0),
    outstanding: settlements.reduce((sum, item) => sum + outstanding(item), 0),
    exceptions: settlements.filter(item => item.overdue || ['disputed', 'reconciliation_required'].includes(item.status)).length,
  }), [settlements]);
  const refresh = async () => {
    await Promise.all([utils.agency.getCommissionSettlements.invalidate(), utils.agency.getCommissionStats.invalidate(), utils.agency.getDealWorkspace.invalidate()]);
  };

  if (settlementsQuery.isLoading) return <Card><CardContent className="p-6 text-sm text-slate-500">Loading canonical commission settlements…</CardContent></Card>;
  if (settlementsQuery.error) return <ErrorPanel title={`Commission workspace unavailable: ${settlementsQuery.error.message}`} />;

  return (
    <section className="space-y-5" data-testid="agency-commission-workspace">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Forecast commission', totals.forecast, 'sky'],
          ['Agency receipts', totals.received, 'emerald'],
          ['Outstanding receipts', totals.outstanding, 'amber'],
          ['Actionable exceptions', totals.exceptions, totals.exceptions ? 'rose' : 'emerald'],
        ].map(([title, value, tone]) => <Card key={String(title)} className="border-slate-200"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">{title}</p><p className={cn('mt-2 text-2xl font-semibold', toneClasses(tone as Tone).text)}>{typeof value === 'number' && title !== 'Actionable exceptions' ? money(value) : value}</p></CardContent></Card>)}
      </div>

      <Card className="border-slate-200">
        <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle icon={CircleDollarSign} title={isAdmin ? 'Commission reconciliation' : 'My commission position'} eyebrow="Canonical settlement records" />
          <div className="flex flex-wrap gap-2">
            <select aria-label="Settlement status" className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>{['forecast', 'awaiting_payment', 'partially_received', 'received', 'reconciliation_required', 'disputed', 'cancelled'].map(status => <option key={status} value={status}>{label(status)}</option>)}
            </select>
            <Button variant={overdueOnly ? 'default' : 'outline'} size="sm" onClick={() => setOverdueOnly(value => !value)}>Overdue only</Button>
          </div>
        </CardHeader>
        <CardContent>
          {!filtered.length ? <EmptyPanel icon={CircleDollarSign} title="No commission settlements" text="Accepted transactions will create a protected forecast here." /> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b text-left text-xs text-slate-500"><tr><th className="pb-3">Transaction</th><th className="pb-3">Expected</th><th className="pb-3">Received</th><th className="pb-3">Outstanding</th><th className="pb-3">Expected date</th><th className="pb-3">Status</th><th className="pb-3" /></tr></thead><tbody>{filtered.map(item => <tr key={item.id} className="border-b last:border-0"><td className="py-3"><p className="font-medium">{item.property?.title || item.listing?.title || `Transaction #${item.transaction?.id}`}</p><p className="text-xs text-slate-500">Transaction #{item.transaction?.id} · {item.agent?.name || 'Unassigned'} · Agent share {money(item.agentShare)}</p></td><td className="py-3">{money(item.expectedCommission)}</td><td className="py-3">{money(item.amountReceived)}</td><td className="py-3">{money(outstanding(item))}</td><td className="py-3">{item.expectedPaymentDate ? formatDate(item.expectedPaymentDate) : 'Not set'}{item.overdue ? <p className="mt-1 text-xs font-medium text-rose-600">Overdue</p> : null}</td><td className="py-3"><StatusBadge status={item.status} /></td><td className="py-3 text-right"><Button variant="outline" size="sm" onClick={() => setSelectedId(item.id)}>Breakdown</Button></td></tr>)}</tbody></table></div>
          )}
        </CardContent>
      </Card>
      <SettlementDialog settlement={selected} isAdmin={isAdmin} open={Boolean(selected)} onOpenChange={open => !open && setSelectedId(null)} onChanged={refresh} />
    </section>
  );
}

function SettlementDialog({ settlement, isAdmin, open, onOpenChange, onChanged }: { settlement: Settlement | null; isAdmin: boolean; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  const [amount, setAmount] = useState(''); const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10)); const [reference, setReference] = useState(''); const [note, setNote] = useState(''); const [reason, setReason] = useState('');
  const receipt = trpc.agency.recordCommissionPayment.useMutation({ onSuccess: async () => { toast.success('Receipt recorded'); setAmount(''); setReference(''); setNote(''); await onChanged(); }, onError: error => toast.error(error.message) });
  const status = trpc.agency.updateCommissionSettlementStatus.useMutation({ onSuccess: async () => { toast.success('Settlement updated'); await onChanged(); }, onError: error => toast.error(error.message) });
  const resolve = trpc.agency.resolveCommissionSettlementDispute.useMutation({ onSuccess: async () => { toast.success('Dispute resolved'); setReason(''); await onChanged(); }, onError: error => toast.error(error.message) });
  if (!settlement) return null;
  const transaction = settlement.transaction || {}; const totalOutstanding = outstanding(settlement);
  const submitReceipt = () => receipt.mutate({ settlementId: settlement.id, amountReceived: Number(amount), receivedAt, reference: reference || null, note: note || null, varianceReason: reason || null });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{settlement.property?.title || settlement.listing?.title || `Commission settlement #${settlement.id}`}</DialogTitle><DialogDescription>Operational commission statement — not a tax certificate, payslip, or audited accounting document.</DialogDescription></DialogHeader>
    <div className="grid gap-3 sm:grid-cols-2"><Breakdown label="Transaction value" value={money(transaction.acceptedAmount)} /><Breakdown label={`Commission basis (${label(transaction.commissionBasis)})`} value={transaction.commissionBasis === 'percentage' ? `${transaction.commissionPercentage}%` : money(transaction.commissionFixedAmount)} /><Breakdown label="Gross commission" value={money(transaction.grossCommission)} /><Breakdown label={`VAT treatment (${label(transaction.commissionVatTreatment)})`} value="Captured at acceptance" /><Breakdown label="Referral deduction" value={money(transaction.referralSplit)} /><Breakdown label="Other deductions" value={money(transaction.otherDeductions)} /><Breakdown label="Net commission forecast" value={money(settlement.expectedCommission)} /><Breakdown label="Agent expected share" value={money(settlement.agentShare)} /><Breakdown label="Agency share" value={money(settlement.agencyShare)} /><Breakdown label="Agency receipts" value={money(settlement.amountReceived)} /><Breakdown label="Outstanding receipt" value={money(totalOutstanding)} /><Breakdown label="Variance" value={money(settlement.variance)} /></div>
    {settlement.varianceReason ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><AlertTriangle className="mr-2 inline h-4 w-4 text-amber-700" />{settlement.varianceReason}</div> : null}
    <div><p className="mb-2 text-sm font-semibold">Receipt history</p>{settlement.payments?.length ? <div className="space-y-2">{settlement.payments.map((payment: any) => <div className="flex justify-between rounded border p-2 text-sm" key={payment.id}><span>{formatDate(payment.receivedAt)}{payment.reference ? ` · ${payment.reference}` : ''}</span><span className="font-medium">{money(payment.amountReceived)}</span></div>)}</div> : <p className="text-sm text-slate-500">No agency receipt has been recorded.</p>}</div>
    <div className="flex flex-wrap gap-2"><StatusBadge status={settlement.status} /><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print statement</Button></div>
    {isAdmin ? <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="font-semibold">Protected finance actions</p>{['forecast', 'awaiting_payment', 'partially_received', 'reconciliation_required'].includes(settlement.status) ? <div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Receipt amount" type="number" min="0.01" step="0.01" placeholder="Receipt amount" value={amount} onChange={event => setAmount(event.target.value)} /><Input aria-label="Receipt date" type="date" value={receivedAt} onChange={event => setReceivedAt(event.target.value)} /><Input aria-label="Payment reference" placeholder="Payment reference" value={reference} onChange={event => setReference(event.target.value)} /><Input aria-label="Private reconciliation note" placeholder="Private reconciliation note" value={note} onChange={event => setNote(event.target.value)} /><Button disabled={!Number(amount) || receipt.isPending} onClick={submitReceipt}><Plus className="mr-2 h-4 w-4" />Record receipt</Button></div> : null}
      {settlement.status === 'disputed' ? <div className="flex gap-2"><Textarea aria-label="Dispute resolution note" placeholder="Resolution note" value={reason} onChange={event => setReason(event.target.value)} /><Button disabled={reason.trim().length < 2 || resolve.isPending} onClick={() => resolve.mutate({ settlementId: settlement.id, resolutionNote: reason })}>Resolve dispute</Button></div> : <div className="flex gap-2"><Input aria-label="Dispute reason" placeholder="Dispute reason" value={reason} onChange={event => setReason(event.target.value)} /><Button variant="outline" disabled={reason.trim().length < 2 || status.isPending} onClick={() => status.mutate({ settlementId: settlement.id, status: 'disputed', varianceReason: reason })}>Mark disputed</Button></div>}</div> : <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600"><FileText className="mr-2 inline h-4 w-4" />You can view this statement and receipt history. Agency finance controls protected calculations and receipts. Agent payout is not yet modelled.</div>}
  </DialogContent></Dialog>;
}

function Breakdown({ label, value }: { label: string; value: string }) { return <div className="rounded border border-slate-200 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-medium">{value}</p></div>; }
