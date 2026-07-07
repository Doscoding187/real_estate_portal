import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Gauge,
  HelpCircle,
  Receipt,
  Settings,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/lib/trpc';
import { WORKSPACE_TITLES } from '../workspace/constants';
import { SectionTitle } from '../workspace/WorkspacePrimitives';
import { AttentionPanel } from '../workspace/WorkspacePanels';
import type { Tone, WorkspaceContentProps } from '../workspace/types';
import { numberLabel, toneClasses } from '../workspace/utils';

export function AgencyAttentionWorkspace(props: WorkspaceContentProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <AttentionPanel
        items={props.attentionItems}
        onNavigate={props.onNavigate}
        isLoading={props.isLoading.leads}
      />
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={Gauge} title="Queue Composition" eyebrow="Operational split" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'New leads', value: props.leadSignals.newLeadCount, tone: 'rose' as Tone },
            { label: 'Unassigned', value: props.leadSignals.unassignedCount, tone: 'amber' as Tone },
            {
              label: 'Overdue follow-ups',
              value: props.leadSignals.contactedFollowUpCount,
              tone: 'sky' as Tone,
            },
            { label: 'Pending listings', value: props.stats.pendingListings, tone: 'teal' as Tone },
          ].map(item => {
            const classes = toneClasses(item.tone);
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">{item.label}</span>
                  <span className="text-slate-500">{numberLabel(item.value)}</span>
                </div>
                <Progress
                  value={Math.min(100, item.value * 20)}
                  indicatorClassName={classes.progress}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}

export function AgencyComplianceWorkspace(props: WorkspaceContentProps) {
  const accessQuery = trpc.agency.getAccessState.useQuery();
  const access = accessQuery.data;
  const checks = [
    {
      label: 'Profile configured',
      done: Boolean(access?.onboardingComplete || props.setupComplete),
      detail: access?.onboardingComplete ? 'Configured' : 'Pending',
    },
    {
      label: 'Billing active',
      done: access?.billingStatus === 'active',
      detail: access?.actionableReason || 'Canonical billing state unavailable',
    },
    {
      label: 'Team ready',
      done: props.stats.totalAgents > 0,
      detail: `${numberLabel(props.stats.totalAgents)} active team members`,
    },
  ];

  return (
    <section className="grid gap-5 md:grid-cols-3">
      {checks.map(item => (
        <Card key={item.label} className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-950">{item.label}</p>
              <Badge className={item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                {item.done ? 'Ready' : 'Needs action'}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{item.detail}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

export function AgencyBillingWorkspace(_props: WorkspaceContentProps) {
  const utils = trpc.useUtils();
  const billingStateQuery = trpc.agency.getBillingState.useQuery();
  const subscriptionQuery = trpc.billing.subscription.useQuery();
  const invoicesQuery = trpc.billing.invoices.useQuery();
  const paymentMethodsQuery = trpc.billing.paymentMethods.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      toast.success('Checkout session created');
    },
    onError: error => toast.error(error.message || 'Checkout could not be started'),
  });
  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: async () => {
      await refreshBilling(utils);
      toast.success('Subscription cancellation scheduled');
    },
    onError: error => toast.error(error.message || 'Subscription could not be cancelled'),
  });
  const reactivateSubscription = trpc.billing.reactivateSubscription.useMutation({
    onSuccess: async () => {
      await refreshBilling(utils);
      toast.success('Subscription reactivated');
    },
    onError: error => toast.error(error.message || 'Subscription could not be reactivated'),
  });

  const billingState = billingStateQuery.data;
  const access = billingState?.accessState;
  const canonical = billingState?.canonicalSubscription;
  const stripeSubscription =
    billingState?.stripeSubscription?.subscription || subscriptionQuery.data || null;
  const stripePlan = billingState?.stripeSubscription?.plan || subscriptionQuery.data?.plan || null;
  const currentPlan = canonical?.plan || stripePlan;
  const currentStatus = access?.billingStatus || 'unavailable';
  const invoices = invoicesQuery.data || [];
  const paymentMethods = paymentMethodsQuery.data || [];
  const capabilityLabels = [
    { key: 'listings', label: 'Listing workspace' },
    { key: 'publishing', label: 'Publication controls' },
    { key: 'teamManagement', label: 'Team management' },
    { key: 'reporting', label: 'Reporting' },
  ];
  const includedCapabilities = capabilityLabels.filter(
    capability => Boolean((access?.workspaceAccess as any)?.[capability.key]),
  );
  const blockedCapabilities = capabilityLabels.filter(
    capability => !Boolean((access?.workspaceAccess as any)?.[capability.key]),
  );
  const nextBillingAction =
    currentStatus === 'active'
      ? 'No billing action required.'
      : currentStatus === 'unavailable'
        ? 'Run migrations or contact support before trusting billing gates.'
        : currentStatus === 'not_started'
          ? 'Select an available agency plan.'
          : access?.actionableReason || 'Review subscription status.';

  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={CreditCard} title="Billing" eyebrow="Canonical access state" />
          </CardHeader>
          <CardContent>
            {billingStateQuery.isLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Current plan</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-950">
                      {currentPlan?.displayName || currentPlan?.name || 'No canonical plan'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Source: {access?.planAccessSource || 'none'}
                    </p>
                  </div>
                  <StatusBadge status={currentStatus} />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700">
                    {access?.actionableReason || 'Billing state could not be resolved.'}
                  </p>
                  {access?.fallbackReason ? (
                    <p className="mt-2 text-sm text-slate-500">{access.fallbackReason}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <AccessTile label="Listings" enabled={Boolean(access?.workspaceAccess.listings)} />
                  <AccessTile label="Publishing" enabled={Boolean(access?.workspaceAccess.publishing)} />
                  <AccessTile label="Reporting" enabled={Boolean(access?.workspaceAccess.reporting)} />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <CapabilityList
                    title="Included capabilities"
                    empty="No capabilities are currently unlocked."
                    items={includedCapabilities.map(item => item.label)}
                    tone="included"
                  />
                  <CapabilityList
                    title="Blocked capabilities"
                    empty="No blocked capabilities."
                    items={blockedCapabilities.map(item => item.label)}
                    tone="blocked"
                    reason={access?.actionableReason}
                  />
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Available next action
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-700">{nextBillingAction}</p>
                </div>

                {stripeSubscription?.cancelAtPeriodEnd ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Subscription cancellation is scheduled for the current period end.
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <SectionTitle icon={Receipt} title="Billing Actions" eyebrow="Subscription controls" />
          </CardHeader>
          <CardContent className="space-y-3">
            {stripeSubscription?.cancelAtPeriodEnd ? (
              <Button
                disabled={reactivateSubscription.isPending}
                onClick={() => reactivateSubscription.mutate()}
                className="w-full"
              >
                Reactivate subscription
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={
                  cancelSubscription.isPending ||
                  !subscriptionQuery.data?.stripeSubscriptionId ||
                  currentStatus !== 'active'
                }
                onClick={() => cancelSubscription.mutate()}
                className="w-full"
              >
                Cancel at period end
              </Button>
            )}
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
              Payment methods: {numberLabel(paymentMethods.length)}
            </div>
            <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
              Invoices: {numberLabel(invoices.length)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={CreditCard} title="Available Plans" eyebrow="Agency plans" />
        </CardHeader>
        <CardContent>
          {billingStateQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          ) : billingState?.plans?.length ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {billingState.plans.map(plan => (
                <Card key={plan.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{plan.displayName}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPlanPrice(plan.priceMonthly || plan.price, plan.interval)}
                        </p>
                      </div>
                      {currentPlan?.id === plan.id ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Current</Badge>
                      ) : null}
                    </div>
                    <FeatureList value={plan.features} />
                    <Button
                      variant={currentPlan?.id === plan.id ? 'outline' : 'default'}
                      disabled={createCheckout.isPending || currentPlan?.id === plan.id}
                      onClick={() =>
                        createCheckout.mutate({
                          planId: plan.id,
                          successUrl: `${window.location.origin}/agency/billing?checkout=success`,
                          cancelUrl: `${window.location.origin}/agency/billing?checkout=cancelled`,
                        })
                      }
                      className="mt-4 w-full"
                    >
                      {currentPlan?.id === plan.id ? 'Selected' : 'Select plan'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
              No active agency plans are available.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <SectionTitle icon={Receipt} title="Invoices" eyebrow="Billing history" />
        </CardHeader>
        <CardContent>
          {invoicesQuery.isLoading ? (
            <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          ) : invoices.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="grid gap-2 border-t border-slate-200 px-4 py-3 text-sm first:border-t-0 md:grid-cols-[1fr_140px_140px]"
                >
                  <span>{formatDate(invoice.createdAt)}</span>
                  <span>{formatCurrency(Number(invoice.amount || 0))}</span>
                  <Badge variant="outline" className="w-fit capitalize">
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">
              No invoices recorded.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export function AgencyUtilityWorkspace(props: WorkspaceContentProps) {
  const meta = WORKSPACE_TITLES[props.workspace];
  const Icon = props.workspace === 'settings' ? Settings : props.workspace === 'help' ? HelpCircle : meta.icon;
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <SectionTitle icon={Icon} title={meta.title} eyebrow={meta.eyebrow} />
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">
          This workspace keeps the agency shell active while detailed utility controls are expanded.
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';
  const Icon = active ? CheckCircle2 : XCircle;
  return (
    <Badge className={active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function AccessTile({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {enabled ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <XCircle className="h-4 w-4 text-slate-400" />
        )}
      </div>
    </div>
  );
}

function CapabilityList({
  title,
  items,
  empty,
  tone,
  reason,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: 'included' | 'blocked';
  reason?: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="font-semibold text-slate-950">{title}</p>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
              {tone === 'included' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-600" />
              )}
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      )}
      {reason && tone === 'blocked' ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">{reason}</p>
      ) : null}
    </div>
  );
}

function FeatureList({ value }: { value?: string | null }) {
  const features = parseFeatures(value).slice(0, 4);
  if (!features.length) return null;
  return (
    <ul className="mt-4 space-y-2 text-sm text-slate-600">
      {features.map(feature => (
        <li key={feature} className="flex gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function parseFeatures(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPlanPrice(cents: number, interval?: string | null) {
  return `${formatCurrency(Number(cents || 0))} / ${interval || 'month'}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function refreshBilling(utils: ReturnType<typeof trpc.useUtils>) {
  await Promise.all([
    utils.agency.getBillingState.invalidate(),
    utils.agency.getAccessState.invalidate(),
    utils.agency.getOnboardingStatus.invalidate(),
    utils.billing.subscription.invalidate(),
    utils.billing.invoices.invalidate(),
    utils.billing.paymentMethods.invalidate(),
  ]);
}
