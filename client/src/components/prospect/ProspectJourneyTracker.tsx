import { useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Calendar, Clock3, MapPin, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

function dateLabel(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date to be confirmed';
}

export function ProspectJourneyTracker() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const summary = trpc.prospectJourney.summary.useQuery();
  const enquiries = trpc.prospectJourney.enquiries.useQuery();
  const viewings = trpc.prospectJourney.viewings.useQuery();
  const timeline = trpc.prospectJourney.timeline.useQuery();
  const claim = trpc.prospectJourney.claimAction.useMutation({
    onSuccess: async () => { await Promise.all([utils.prospectJourney.summary.invalidate(), utils.prospectJourney.enquiries.invalidate(), utils.prospectJourney.viewings.invalidate(), utils.prospectJourney.timeline.invalidate()]); toast.success('Your journey item is now linked to this account.'); },
    onError: () => toast.error('This claim link is invalid or expired.'),
  });
  const token = useMemo(() => new URLSearchParams(window.location.search).get('claimToken'), []);
  useEffect(() => { if (token && !claim.isPending && !claim.isSuccess) claim.mutate({ token }); }, [claim, token]);
  const loading = summary.isLoading || enquiries.isLoading || viewings.isLoading;
  const hasJourney = (enquiries.data?.length || 0) + (viewings.data?.length || 0) > 0;

  return <section aria-labelledby="prospect-journey-title" className="mt-8 space-y-5">
    <Card className="border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle id="prospect-journey-title" className="flex items-center gap-2 text-xl"><ShieldCheck className="h-5 w-5 text-sky-700" />Your property journey</CardTitle><CardDescription className="mt-1">Private updates for your enquiries and viewings. Agency notes and internal decisions are never shown here.</CardDescription></div><Button variant="outline" size="sm" onClick={() => setLocation('/properties')}>Browse homes</Button></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active enquiries</p><p className="mt-1 text-2xl font-semibold">{summary.data?.activeEnquiries ?? 0}</p></div><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Upcoming viewings</p><p className="mt-1 text-2xl font-semibold">{summary.data?.upcomingViewings ?? 0}</p></div><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next step</p><p className="mt-1 text-sm font-semibold">{summary.data?.nextAction || 'Send an enquiry to begin'}</p></div></CardContent></Card>
    {loading ? <Card><CardContent className="py-8 text-center text-sm text-slate-500">Loading your private journey…</CardContent></Card> : !hasJourney ? <Card><CardContent className="py-9 text-center"><Send className="mx-auto mb-3 h-8 w-8 text-sky-700" /><p className="font-semibold">Your journey starts with an enquiry</p><p className="mx-auto mt-2 max-w-md text-sm text-slate-600">When you contact an agency while signed in, your safe progress updates will appear here.</p></CardContent></Card> : <><div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-lg">Enquiries</CardTitle></CardHeader><CardContent className="space-y-3">{enquiries.data?.map((item: any) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.subject.title}</p><p className="mt-1 flex min-w-0 items-center gap-1 text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{item.subject.location || 'Location available on the listing'}</span></p></div><Badge variant="outline">{item.status.label}</Badge></div><p className="mt-3 break-words text-xs text-slate-500">Submitted {dateLabel(item.submittedAt)}{item.publicContact.agencyName ? ` · ${item.publicContact.agencyName}` : ''}</p><p className="mt-2 text-sm">{item.status.nextAction}</p>{item.subject.href ? <Button variant="link" className="mt-1 h-auto p-0" onClick={() => setLocation(item.subject.href)}>View property</Button> : null}</article>)}</CardContent></Card><Card><CardHeader><CardTitle className="text-lg">Viewings</CardTitle></CardHeader><CardContent className="space-y-3">{viewings.data?.length ? viewings.data.map((item: any) => <article key={item.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.subject.title}</p><p className="mt-1 flex min-w-0 items-center gap-1 text-sm text-slate-600"><Calendar className="h-3.5 w-3.5 shrink-0" />{dateLabel(item.scheduledAt)}</p></div><Badge variant="outline">{item.status.label}</Badge></div><p className="mt-3 text-sm">{item.status.nextAction}</p></article>) : <p className="text-sm text-slate-500">No viewings have been arranged yet.</p>}</CardContent></Card></div><Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5" />Journey timeline</CardTitle></CardHeader><CardContent className="space-y-3">{timeline.data?.map((item: any, index: number) => <div key={`${item.type}-${item.occurredAt}-${index}`} className="border-l-2 border-sky-200 pl-4"><p className="font-medium">{item.message}</p><p className="break-words text-sm text-slate-600">{item.subject.title} · {dateLabel(item.occurredAt)}</p>{item.nextAction ? <p className="mt-1 text-sm">{item.nextAction}</p> : null}</div>)}</CardContent></Card></>}
  </section>;
}
