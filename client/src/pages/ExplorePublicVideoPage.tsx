import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useRoute } from 'wouter';
import { ArrowLeft, Bookmark, Share2, UserPlus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ExploreSoftGateOverlay } from '@/components/explore/ExploreSoftGateOverlay';
import { getFeedItems } from '@/lib/exploreFeed';

function parseContentIdFromSlug(slug?: string): number | null {
  if (!slug) return null;
  const match = slug.match(/-(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function ExplorePublicVideoPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [showGate, setShowGate] = useState(false);
  const [match, params] = useRoute('/explore/@:handle/:slug');
  const contentId = useMemo(() => parseContentIdFromSlug(params?.slug), [params?.slug]);

  const { data, isLoading } = trpc.explore.getFeed.useQuery(
    {
      feedType: 'recommended',
      limit: 12,
      offset: 0,
    },
    {
      enabled: match && Boolean(contentId),
      retry: false,
    },
  );

  const feedItems = useMemo(() => getFeedItems(data), [data]);
  const video = useMemo(
    () => feedItems.find(item => Number(item.id) === Number(contentId)) || null,
    [contentId, feedItems],
  );
  const related = useMemo(
    () => feedItems.filter(item => Number(item.id) !== Number(contentId)).slice(0, 8),
    [contentId, feedItems],
  );

  const shareVideo = async () => {
    const canonical =
      (typeof window !== 'undefined' ? window.location.pathname : '');
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}${canonical}` : canonical;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: video?.title || 'Explore video',
          text: video?.title || 'Explore this video',
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const navigateToVideo = (item: any) => {
    const handle = slugify(item?.actor?.displayName || 'creator');
    const slug = `${slugify(item?.title || 'video')}-${item.id}`;
    setLocation(`/explore/@${handle}/${slug}`);
  };

  if (!match || !contentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        Invalid Explore video link.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        Loading video...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p>Video not found.</p>
        <button
          type="button"
          onClick={() => setLocation('/explore/feed')}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Open Explore
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => setLocation('/explore/feed')}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-white/15 bg-black"
            >
              <video
                src={video.mediaUrl}
                poster={video.thumbnailUrl || video.mediaUrl}
                controls
                playsInline
                className="h-auto w-full max-h-[78vh] object-cover"
              />
            </motion.div>

            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-2 py-1">
                  {video.actor?.verificationStatus || 'unverified'}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-1">{video.category}</span>
              </div>

              <h1 className="text-2xl font-semibold">{video.title || 'Explore Video'}</h1>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowGate(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Follow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowGate(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                >
                  <Bookmark className="h-4 w-4" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void shareVideo();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>

          <aside>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
              Related videos
            </h2>
            <div className="space-y-3">
              {related.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToVideo(item)}
                  className="flex w-full items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-2 text-left"
                >
                  <img
                    src={item.thumbnailUrl || item.mediaUrl}
                    alt={item.title || 'Related video'}
                    className="h-16 w-12 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-white">
                      {item.title || 'Explore Video'}
                    </p>
                    <p className="mt-1 text-xs text-white/65">
                      {item.actor?.displayName || 'Creator'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLocation('/explore/feed')}
              className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              Open Explore
            </button>
          </aside>
        </div>
      </div>

      <ExploreSoftGateOverlay
        open={showGate}
        onClose={() => setShowGate(false)}
        onLogin={() => setLocation('/login')}
        onSignup={() => setLocation('/get-started')}
      />
    </div>
  );
}
