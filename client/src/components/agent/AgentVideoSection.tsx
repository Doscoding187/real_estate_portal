import { useState } from 'react';
import { Play } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PublicAgentVideo } from '@shared/agentPublicVideo';

export function AgentVideoSection({ slug, agentName }: { slug: string; agentName: string }) {
  const query = trpc.agent.getPublicVideosForAgent.useInfiniteQuery(
    { slug, limit: 6 },
    {
      getNextPageParam: page => page.nextCursor ?? undefined,
      staleTime: 30_000,
      retry: false,
    },
  );
  const [selected, setSelected] = useState<PublicAgentVideo | null>(null);
  const [playbackError, setPlaybackError] = useState(false);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);
  const videos = Array.from(
    new Map(query.data?.pages.flatMap(page => page.items).map(video => [video.id, video])).values(),
  );
  // Optional content never exposes an empty shelf, a draft, or global videos.
  if (!videos.length) return null;
  const title = (video: PublicAgentVideo) => video.title?.trim() || `Video from ${agentName}`;

  return (
    <section
      className="as-videos"
      aria-labelledby="agent-videos-title"
      data-testid="agent-videos-section"
    >
      <div className="as-section-heading">
        <div>
          <p className="as-eyebrow">Watch & discover</p>
          <h2 id="agent-videos-title">Videos from {agentName}</h2>
          <p className="as-video-intro">
            Property tours, local stories and insights shared by {agentName}.
          </p>
        </div>
      </div>
      <div className="as-video-grid">
        {videos.map(video => (
          <button
            className="as-insight-card as-video-card"
            key={video.id}
            aria-label={`Watch ${title(video)}`}
            onClick={() => {
              setPlaybackError(false);
              setSelected(video);
            }}
          >
            <div className="as-insight-media">
              {video.thumbnailUrl && (
                <img src={video.thumbnailUrl} alt="" loading="lazy" width={640} height={400} />
              )}
              <span className="as-insight-play" aria-hidden="true">
                <Play size={20} fill="currentColor" />
              </span>
            </div>
            <div className="as-insight-body">
              <p className="as-insight-category">Video</p>
              <h3>{title(video)}</h3>
              {video.description && (
                <p className="as-insight-description as-video-description">{video.description}</p>
              )}
              <span className="as-insight-action">Watch video</span>
            </div>
          </button>
        ))}
      </div>
      {query.isError && (
        <p role="alert" className="as-video-status">
          More videos couldn't be loaded. Your current videos are still available.
        </p>
      )}
      {(query.hasNextPage || query.isError) && (
        <button
          className="as-button as-outline as-videos-more"
          disabled={query.isFetchingNextPage}
          onClick={() => void (query.isError ? query.refetch() : query.fetchNextPage())}
        >
          {query.isFetchingNextPage
            ? 'Loading videos...'
            : query.isError
              ? 'Try again'
              : 'Load more videos'}
        </button>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={open => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="as-video-dialog">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{title(selected)}</DialogTitle>
                <DialogDescription>
                  {selected.description || `Published by ${agentName}`}
                </DialogDescription>
              </DialogHeader>
              <video
                key={`${selected.id}-${playbackAttempt}`}
                src={selected.videoUrl}
                poster={selected.thumbnailUrl || undefined}
                controls
                playsInline
                preload="none"
                aria-label={title(selected)}
                onError={() => setPlaybackError(true)}
              />
              {playbackError && (
                <div role="alert">
                  <p>This video couldn't be played. Please try again.</p>
                  <button
                    className="as-button as-outline"
                    onClick={() => {
                      setPlaybackError(false);
                      setPlaybackAttempt(attempt => attempt + 1);
                    }}
                  >
                    Retry video
                  </button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
