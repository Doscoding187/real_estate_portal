import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { mockFeedProvider } from '@/components/explore-sandbox/providers';
import { logSandboxEvent } from '@/components/explore-sandbox/telemetry';
import { useSandboxFeed } from '@/components/explore-sandbox/useSandboxFeed';
import { VideoFeed, type VideoFeedEventHandlers } from '@/features/explore/components/video-feed';

export default function ExploreSandbox() {
  const [, setLocation] = useLocation();
  const { items, isLoading, error, reload } = useSandboxFeed(mockFeedProvider);
  const eventHandlers = useMemo<VideoFeedEventHandlers>(
    () => ({
      onImpression: contentId => logSandboxEvent('impression', { contentId }),
      onViewStart: contentId => logSandboxEvent('viewStart', { contentId }),
      onViewProgress: (contentId, pct) => logSandboxEvent('viewProgress', { contentId, pct }),
      onViewComplete: contentId => logSandboxEvent('viewComplete', { contentId }),
      onLike: contentId => logSandboxEvent('like', { contentId }),
      onSave: contentId => logSandboxEvent('save', { contentId }),
      onShare: contentId => logSandboxEvent('share', { contentId }),
      onNotInterested: contentId => logSandboxEvent('notInterested', { contentId }),
      onCtaClick: (contentId, ctaType) => logSandboxEvent('ctaClick', { contentId, ctaType }),
    }),
    [],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Loading explore sandbox...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-white">
        <p className="text-center text-sm text-white/80">{error}</p>
        <button
          onClick={() => {
            void reload();
          }}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-50 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="pointer-events-auto flex items-center justify-between">
          <button
            onClick={() => setLocation('/explore/home')}
            className="flex items-center gap-2 rounded-full border border-white/25 bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="rounded-full border border-white/25 bg-black/45 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
            Explore Sandbox
          </span>
        </div>
      </div>

      <VideoFeed items={items} {...eventHandlers} />
    </div>
  );
}
