import { useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import { ArrowRight, CheckCircle2, Clock3, MapPinned, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProviderCard, type ProviderDirectoryItem } from '@/components/services/ProviderCard';
import { trpc } from '@/lib/trpc';
import {
  formatArea,
  formatCategoryLabel,
  isServiceCategory,
  type ServiceCategory,
} from '@/features/services/catalog';
import { applySeo } from '@/lib/seo';
import { useServicesLocation } from '@/features/services/useServicesLocation';

function parsePositiveInteger(value: string | null | undefined) {
  if (!value || !/^\d+$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function readableStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, value => value.toUpperCase());
}

export default function ServicesResultsPage() {
  const [, params] = useRoute('/services/results/:leadId');
  const { setLocation } = useServicesLocation();
  const leadId = parsePositiveInteger(params?.leadId);
  const leadQuery = trpc.servicesEngine.getLead.useQuery({ leadId }, { enabled: leadId > 0 });
  const lead = leadQuery.data;
  const categoryParam = String(lead?.serviceCategory || '').toLowerCase();
  const category = isServiceCategory(categoryParam)
    ? (categoryParam as ServiceCategory)
    : ('home_improvement' as ServiceCategory);
  const location = lead?.location || {
    city: null,
    province: null,
    suburb: null,
  };
  const locationLabel = formatArea(location.city, location.province, location.suburb);
  const directorySearch = new URLSearchParams();
  if (location.suburb) directorySearch.set('suburb', location.suburb);
  if (location.city) directorySearch.set('city', location.city);
  if (location.province) directorySearch.set('province', location.province);
  const directoryPath = `/services/${category}${
    directorySearch.toString() ? `?${directorySearch.toString()}` : ''
  }`;
  const intentStage = lead?.intentStage || 'general';
  const provider = lead?.provider as ProviderDirectoryItem | null | undefined;
  const notes = lead?.notes || null;

  useEffect(() => {
    applySeo({
      title: lead?.provider?.companyName
        ? `Request sent to ${lead.provider.companyName} | Property Listify`
        : 'Service request | Property Listify',
      description: 'Track the status and context of your Property Listify service request.',
      canonicalPath: `/services/results/${leadId || 0}`,
      noindex: true,
    });
  }, [lead?.provider?.companyName, leadId]);

  if (leadId <= 0) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-[#0f3d91]/10 bg-white shadow-sm">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold text-slate-950">Request unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This request link is not valid. Start a new request from the Services directory.
            </p>
            <Button className="mt-6" onClick={() => setLocation('/services')}>
              Browse services
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (leadQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <div className="mx-auto max-w-4xl animate-pulse space-y-4">
          <div className="h-8 w-2/3 rounded bg-slate-200" />
          <div className="h-64 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (leadQuery.error || !lead) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] px-4 py-12 md:px-6">
        <Card className="mx-auto max-w-3xl border-red-200 bg-white shadow-sm">
          <CardContent className="p-8">
            <h1 className="text-2xl font-semibold text-slate-950">
              We could not load this request
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The request may have been removed or your account may not have access. Return to the
              directory to start again.
            </p>
            <Button className="mt-6" onClick={() => setLocation('/services')}>
              Browse services
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,61,145,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(201,139,43,0.16),_transparent_22%),linear-gradient(180deg,_#f9f6ef_0%,_#eef4ff_56%,_#f7f4ec_100%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
          <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_90px_-50px_rgba(15,61,145,0.55)] md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Request received
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#10294f] px-3 py-1 text-xs font-semibold text-white">
                <Clock3 className="h-3.5 w-3.5" />
                {readableStatus(lead.status)}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl font-['Sora'] text-3xl font-bold tracking-[-0.04em] text-slate-950 md:text-5xl">
              {provider
                ? `Your request is with ${provider.companyName}.`
                : 'Your request was recorded.'}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              {provider
                ? 'The provider can see your project details and account contact context, and will update the request status as they respond.'
                : 'There is no published provider attached to this request yet. Browse the category to choose a provider.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={() => setLocation(directoryPath)}>
                Browse {formatCategoryLabel(category)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setLocation(directoryPath)}>
                Start another request
              </Button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {provider && <ProviderCard provider={provider} serviceCategory={category} />}

              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Request details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Service
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatCategoryLabel(category)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Listed area
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                      <MapPinned className="h-4 w-4 text-[#0f3d91]" />
                      {locationLabel}
                    </p>
                  </div>
                  {lead.propertyId && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Property context
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        Linked property #{lead.propertyId}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Submitted
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {String(lead.createdAt).slice(0, 10)}
                    </p>
                  </div>
                  {notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Project details
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">{notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>What happens next</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
                  <p>The provider receives this request in their private provider workspace.</p>
                  <p>They can use the contact details on your account to follow up directly.</p>
                  <p>Status updates appear here when the provider accepts or quotes the request.</p>
                </CardContent>
              </Card>
              {lead.providerResponse?.note && (
                <Card className="border-emerald-200 bg-emerald-50/70 shadow-sm">
                  <CardHeader>
                    <CardTitle>Provider response</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-emerald-950">
                    {lead.providerResponse.note}
                  </CardContent>
                </Card>
              )}
              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                    Privacy boundary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-slate-600">
                  This request is visible to you and the selected provider. Other providers cannot
                  access this request through the platform.
                </CardContent>
              </Card>
              <Card className="border-[#0f3d91]/10 bg-white/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Request context</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-600">
                  <p>Journey stage: {intentStage.replace(/_/g, ' ')}</p>
                  <p>Source: {String(lead.sourceSurface).replace(/_/g, ' ')}</p>
                  <p>Status: {readableStatus(lead.status)}</p>
                </CardContent>
              </Card>
            </aside>
          </section>

          <p className="text-center text-xs text-slate-500">
            Need a different service?{' '}
            <Link href="/services" className="font-semibold text-[#0f3d91]">
              Return to all services
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
