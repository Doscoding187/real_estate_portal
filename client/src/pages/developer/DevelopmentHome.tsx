import { Link, useLocation, useRoute } from 'wouter';
import { ArrowLeft, ExternalLink, Pencil, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

const lifecycleLabels = {
  live: 'Live',
  approved_private: 'Approved — private',
  in_review: 'In review',
  changes_required: 'Changes required',
  rejected: 'Rejected',
  draft_ready_to_submit: 'Draft — ready to submit',
  draft_action_required: 'Draft — action required',
} as const;

const lifecycleClasses = {
  live: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  approved_private: 'bg-blue-100 text-blue-800 border-blue-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  changes_required: 'bg-orange-100 text-orange-800 border-orange-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  draft_ready_to_submit: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  draft_action_required: 'bg-slate-100 text-slate-700 border-slate-200',
} as const;

const readinessExplanations = {
  live: 'This development is approved and publicly visible on Listify.',
  approved_private: 'Approval remains valid, but this development is not publicly visible.',
  in_review: 'Awaiting review',
  changes_required: 'Changes were requested before this development can be resubmitted.',
  rejected:
    'This submission was rejected. Review the reason and update the development in the editor.',
  draft_ready_to_submit:
    'Persisted submission requirements are currently satisfied. Submission remains subject to review.',
  draft_action_required: 'Persisted submission requirements need attention before submission.',
} as const;

function formatTimestamp(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function DevelopmentHomeLoading() {
  return (
    <div className="space-y-6" aria-label="Loading Development Home">
      <div className="h-10 w-48 animate-pulse rounded bg-slate-200" />
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100 sm:w-96" />
        </CardContent>
      </Card>
    </div>
  );
}

function PrivateNotFound() {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Development not found</h1>
        <p className="text-sm text-slate-600">
          This development is unavailable in your current workspace.
        </p>
        <Link
          href="/developer/developments"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to developments
        </Link>
      </CardContent>
    </Card>
  );
}

function DevelopmentHomeError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Unable to load Development Home</h1>
        <p className="text-sm text-slate-600">Please try again. No development data was loaded.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}>Retry</Button>
          <Link
            href="/developer/developments"
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Back to developments
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DevelopmentHome() {
  const [, params] = useRoute('/developer/developments/:developmentId');
  const [, setLocation] = useLocation();
  const developmentId = Number(params?.developmentId);
  const hasValidDevelopmentId = Number.isInteger(developmentId) && developmentId > 0;
  const homeQuery = trpc.developer.getDevelopmentHome.useQuery(
    { developmentId, range: '30d' },
    { enabled: hasValidDevelopmentId, retry: false, refetchOnWindowFocus: false },
  );

  if (!hasValidDevelopmentId) return <PrivateNotFound />;
  if (homeQuery.isLoading) return <DevelopmentHomeLoading />;
  if (homeQuery.error?.data?.code === 'NOT_FOUND') return <PrivateNotFound />;
  if (homeQuery.error || !homeQuery.data)
    return <DevelopmentHomeError onRetry={homeQuery.refetch} />;

  const { development, range } = homeQuery.data;
  const location = [
    development.location.suburb,
    development.location.city,
    development.location.province,
  ]
    .filter(Boolean)
    .join(', ');
  const lifecycleState = development.lifecycleState;
  const { readiness } = homeQuery.data;
  const latestSubmittedAt = formatTimestamp(readiness.latestReview?.submittedAt);
  const latestReviewedAt = formatTimestamp(readiness.latestReview?.reviewedAt);
  const publishedAt = formatTimestamp(development.publishedAt);
  const openEditor = () => setLocation(`/developer/create-development?id=${development.id}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/developer/developments"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Developments
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Development Home</h1>
        </div>
        <Badge className={lifecycleClasses[lifecycleState]}>
          {lifecycleLabels[lifecycleState]}
        </Badge>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{development.name}</CardTitle>
            <p className="text-sm text-slate-600">
              {location || development.location.address || 'Location not available'}
            </p>
            <p className="text-sm capitalize text-slate-500">
              {development.transactionType.replace('_', ' ')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={openEditor}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit development
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setLocation(`/developer/leads?developmentId=${development.id}&range=${range}`)
            }
          >
            <Users className="mr-2 h-4 w-4" />
            Open leads
          </Button>
          {development.publicEligible && development.slug ? (
            <Button
              variant="outline"
              onClick={() => setLocation(`/development/${development.slug}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View public page
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Market Readiness</CardTitle>
            <p className="text-sm text-slate-600">{readinessExplanations[readiness.state]}</p>
          </div>
          <Badge className={lifecycleClasses[readiness.state]}>
            {lifecycleLabels[readiness.state]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {(publishedAt || latestSubmittedAt || latestReviewedAt) && (
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              {publishedAt && (
                <div>
                  <dt className="text-slate-500">Published</dt>
                  <dd className="font-medium text-slate-900">{publishedAt}</dd>
                </div>
              )}
              {latestSubmittedAt && (
                <div>
                  <dt className="text-slate-500">Submitted</dt>
                  <dd className="font-medium text-slate-900">{latestSubmittedAt}</dd>
                </div>
              )}
              {latestReviewedAt && (
                <div>
                  <dt className="text-slate-500">Reviewed</dt>
                  <dd className="font-medium text-slate-900">{latestReviewedAt}</dd>
                </div>
              )}
            </dl>
          )}

          {readiness.latestReview?.feedback && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-900">Review feedback</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {readiness.latestReview.feedback}
              </p>
            </div>
          )}

          {readiness.blockers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-900">Submission blockers</p>
              <ul className="mt-2 space-y-2">
                {readiness.blockers.map(blocker => (
                  <li
                    key={`${blocker.field}-${blocker.message}`}
                    className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-900"
                  >
                    {blocker.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {readiness.recentReviewHistory.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-900">Recent review events</p>
              <ol className="mt-2 space-y-2">
                {readiness.recentReviewHistory.slice(0, 3).map((event, index) => (
                  <li
                    key={`${event.status}-${event.submittedAt}-${index}`}
                    className="rounded-md border border-slate-100 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-slate-900">{event.status.replace('_', ' ')}</p>
                    <p className="text-slate-600">Submitted {formatTimestamp(event.submittedAt)}</p>
                    {event.reviewedAt && (
                      <p className="text-slate-600">Reviewed {formatTimestamp(event.reviewedAt)}</p>
                    )}
                    {event.feedback && <p className="mt-1 text-slate-700">{event.feedback}</p>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {readiness.state === 'live' && development.publicEligible && development.slug ? (
              <Button
                variant="outline"
                onClick={() => setLocation(`/development/${development.slug}`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View public page
              </Button>
            ) : readiness.state === 'in_review' ? (
              <Button variant="outline" onClick={openEditor}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit development
              </Button>
            ) : (
              <Button onClick={openEditor}>
                <Pencil className="mr-2 h-4 w-4" />
                {readiness.state === 'draft_ready_to_submit'
                  ? 'Open editor to submit'
                  : 'Open editor'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
