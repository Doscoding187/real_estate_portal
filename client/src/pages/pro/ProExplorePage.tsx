import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { applySeo } from '@/lib/seo';
import { ProNavigation } from '@/components/services/ProNavigation';
import { useServiceProviderOnboardingStatus } from '@/hooks/useServiceProviderOnboardingStatus';

const VERTICAL_OPTIONS = [
  { value: 'walkthroughs', label: 'Walkthroughs' },
  { value: 'home_improvement', label: 'Home Improvement' },
  { value: 'finance_legal', label: 'Finance & Legal' },
  { value: 'moving_lifestyle', label: 'Moving & Lifestyle' },
  { value: 'developer_story', label: 'Developer Story' },
] as const;

export default function ProExplorePage() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const { status, isLoading: statusLoading } = useServiceProviderOnboardingStatus();

  useEffect(() => {
    applySeo({
      title: 'Explore Publishing | Services Pro',
      description:
        'Submit provider videos, track moderation, and manage explore publishing status.',
      canonicalPath: '/service/explore',
      noindex: true,
    });
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vertical, setVertical] =
    useState<(typeof VERTICAL_OPTIONS)[number]['value']>('walkthroughs');

  useEffect(() => {
    if (statusLoading) return;
    if (!status?.fullFeaturesUnlocked && window.location.pathname !== '/service/profile') {
      setLocation('/service/profile');
    }
  }, [setLocation, status?.fullFeaturesUnlocked, statusLoading]);

  const videosQuery = trpc.servicesEngine.myExploreVideos.useQuery(
    { limit: 50 },
    { enabled: Boolean(status?.fullFeaturesUnlocked) },
  );
  const submitVideo = trpc.servicesEngine.submitExploreVideo.useMutation({
    onSuccess: async () => {
      toast.success('Video submitted for moderation');
      setTitle('');
      setDescription('');
      await videosQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Unable to submit video'),
  });

  const videos = videosQuery.data || [];

  if (statusLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <p className="text-sm text-slate-500">Preparing Explore access...</p>
      </main>
    );
  }

  if (!status?.fullFeaturesUnlocked) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Explore Publishing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Finish profile setup to publish
          </h1>
        </header>
        <ProNavigation />
        <Card>
          <CardHeader>
            <CardTitle>Explore is locked until setup is complete</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-slate-700">
            <p>
              Add your public profile details, services, and service areas first. Once those are in
              place, Explore submissions unlock automatically.
            </p>
            <Button onClick={() => setLocation('/service/profile')}>Complete profile setup</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Explore Publishing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Submit and track creator videos
        </h1>
      </header>
      <ProNavigation />

      <Card>
        <CardHeader>
          <CardTitle>Submit new video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Video title"
          />
          <Textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Video description"
          />
          <select
            value={vertical}
            onChange={event => setVertical(event.target.value as any)}
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {VERTICAL_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            disabled={!title.trim() || submitVideo.isPending}
            onClick={() =>
              submitVideo.mutate({
                title: title.trim(),
                description: description.trim() || undefined,
                vertical,
              })
            }
          >
            {submitVideo.isPending ? 'Submitting...' : 'Submit for moderation'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {videos.map((video: any) => (
            <article key={video.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{video.title}</p>
                  <p className="text-sm text-slate-600">
                    {video.vertical} · submitted {String(video.submittedAt || '').slice(0, 10)}
                  </p>
                </div>
                <Badge variant="outline">{video.moderationStatus}</Badge>
              </div>
            </article>
          ))}
          {videos.length === 0 && (
            <p className="text-sm text-slate-600">No videos submitted yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
