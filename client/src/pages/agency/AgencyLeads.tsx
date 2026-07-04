import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { AgencyLayout } from '@/components/agency/AgencyLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Building2,
  CalendarDays,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
} from 'lucide-react';

const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'viewing_scheduled',
  'offer_sent',
  'converted',
  'closed',
  'lost',
] as const;

const FILTERS = ['all', ...LEAD_STATUSES] as const;

type LeadFilter = (typeof FILTERS)[number];
type LeadStatus = (typeof LEAD_STATUSES)[number];

const STATUS_LABELS: Record<LeadFilter, string> = {
  all: 'All',
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  viewing_scheduled: 'Viewing',
  offer_sent: 'Offer',
  converted: 'Converted',
  closed: 'Closed',
  lost: 'Lost',
};

function formatDate(value?: string | null) {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoney(value?: number | null) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `R ${amount.toLocaleString('en-ZA')}`;
}

function statusTone(status: string) {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'contacted':
    case 'qualified':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'viewing_scheduled':
    case 'offer_sent':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'converted':
    case 'closed':
      return 'bg-slate-900 text-white border-slate-900';
    case 'lost':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function AgencyLeads() {
  const [status, setStatus] = useState<LeadFilter>('all');
  const utils = trpc.useUtils();

  const { data: leads = [], isLoading } = trpc.agency.getLeads.useQuery({
    status: 'all',
    limit: 100,
  });

  const updateLeadStatus = trpc.agency.updateLeadStatus.useMutation({
    onSuccess: async () => {
      await utils.agency.getLeads.invalidate();
      await utils.agency.getRecentLeads.invalidate();
      await utils.agency.getDashboardStats.invalidate();
      toast.success('Lead status updated');
    },
    onError: error => {
      toast.error(error.message || 'Could not update lead status');
    },
  });

  const statusCounts = useMemo(() => {
    const counts = new Map<LeadFilter, number>([['all', leads.length]]);
    leads.forEach((lead: any) => {
      const key = String(lead.status || 'new') as LeadFilter;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [leads]);

  const visibleLeads = useMemo(
    () => (status === 'all' ? leads : leads.filter((lead: any) => lead.status === status)),
    [leads, status],
  );

  return (
    <AgencyLayout>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Agency Leads</h1>
                <p className="text-sm text-slate-500">
                  Track buyer enquiries across your agency-owned listings and agents.
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>

        <Tabs value={status} onValueChange={value => setStatus(value as LeadFilter)}>
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            {FILTERS.map(filter => (
              <TabsTrigger
                key={filter}
                value={filter}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm data-[state=active]:border-emerald-300 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
              >
                {STATUS_LABELS[filter]}
                <span className="ml-2 text-xs text-slate-400">
                  {statusCounts.get(filter) || 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : visibleLeads.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <MessageSquare className="mx-auto mb-4 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-900">No leads in this view</p>
              <p className="mt-2 text-sm text-slate-500">
                New buyer enquiries will appear here once public listings receive interest.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {visibleLeads.map((lead: any) => {
              const priceLabel = formatMoney(lead.property?.price);

              return (
                <Card key={lead.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold text-slate-950">
                                {lead.name}
                              </h2>
                              <Badge className={statusTone(lead.status)}>
                                {STATUS_LABELS[lead.status as LeadStatus] || lead.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {lead.email}
                              </span>
                              {lead.phone ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  {lead.phone}
                                </span>
                              ) : null}
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-4 w-4" />
                                {formatDate(lead.createdAt)}
                              </span>
                            </div>
                          </div>

                          <Select
                            value={lead.status}
                            onValueChange={nextStatus =>
                              updateLeadStatus.mutate({
                                leadId: lead.id,
                                status: nextStatus as LeadStatus,
                              })
                            }
                            disabled={updateLeadStatus.isPending}
                          >
                            <SelectTrigger className="w-[190px] bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_STATUSES.map(nextStatus => (
                                <SelectItem key={nextStatus} value={nextStatus}>
                                  {STATUS_LABELS[nextStatus]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {lead.message ? (
                          <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                            {lead.message}
                          </p>
                        ) : null}
                      </div>

                      <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                        <div className="space-y-4 text-sm">
                          <div>
                            <p className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
                              <Building2 className="h-4 w-4" />
                              Listing
                            </p>
                            {lead.property ? (
                              <>
                                <p className="font-medium text-slate-950">{lead.property.title}</p>
                                <p className="text-slate-500">
                                  {[lead.property.city, lead.property.province]
                                    .filter(Boolean)
                                    .join(', ')}
                                </p>
                                {priceLabel ? <p className="text-slate-700">{priceLabel}</p> : null}
                              </>
                            ) : (
                              <p className="text-slate-500">No linked listing context</p>
                            )}
                          </div>

                          <div>
                            <p className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
                              <UserRound className="h-4 w-4" />
                              Assigned
                            </p>
                            <p className="text-slate-950">{lead.agent?.name || 'Unassigned'}</p>
                            <p className="text-slate-500">{lead.leadSource || lead.source || 'web'}</p>
                          </div>
                        </div>
                      </aside>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </AgencyLayout>
  );
}
