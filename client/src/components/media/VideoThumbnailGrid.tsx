import { Play } from 'lucide-react';
import { VideoMedia, getVideoThumbnail } from '@/lib/media-logic';

interface VideoThumbnailGridProps {
  videos: VideoMedia[];
  onPlayClick: () => void;
  fallbackImage?: string;
}

export function VideoThumbnailGrid({
  videos,
  onPlayClick,
  fallbackImage,
}: VideoThumbnailGridProps) {
  const count = videos.length;

  // Helper to render a single video tile background
  const renderTile = (video: VideoMedia, className: string, showPlayIcon = true) => {
    const thumb = getVideoThumbnail(video) || fallbackImage;
    return (
      <div className={`relative overflow-hidden group/video ${className}`}>
        {thumb ? (
          <img
            src={thumb}
            className="w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-105"
            alt="Video Thumbnail"
          />
        ) : (
          <div className="w-full h-full bg-slate-900" />
        )}
        <div className="absolute inset-0 bg-black/20 group-hover/video:bg-black/10 transition-colors" />
        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover/video:scale-110 transition-transform">
              <Play className="w-3 h-3 text-white fill-current" />
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1 Video: Full Tile
  if (count === 1) {
    return (
      <button onClick={onPlayClick} className="w-full h-full relative group">
        {renderTile(videos[0], 'w-full h-full')}
      </button>
    );
  }

  // 2 Videos: Split Vertical (Left/Right)
  if (count === 2) {
    return (
      <button onClick={onPlayClick} className="w-full h-full grid grid-cols-2 gap-0.5">
        {renderTile(videos[0], 'h-full')}
        {renderTile(videos[1], 'h-full')}
      </button>
    );
  }

  // 3 Videos: One Large Left, Two Small Right Stacked
  if (count === 3) {
    return (
      <button onClick={onPlayClick} className="w-full h-full grid grid-cols-2 gap-0.5">
        {renderTile(videos[0], 'h-full')}
        <div className="flex flex-col gap-0.5 h-full">
          {renderTile(videos[1], 'h-full')}
          {renderTile(videos[2], 'h-full')}
        </div>
      </button>
    );
  }

  // 4+ Videos: 2x2 Grid
  return (
    <button onClick={onPlayClick} className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
      {videos.slice(0, 4).map((v, i) => (
        <div key={i} className="w-full h-full">
          {renderTile(v, 'w-full h-full', i === 3 && count > 4 ? false : true)}
          {/* Overlay for +more on the last tile if count > 4 */}
          {i === 3 && count > 4 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <span className="text-white font-bold text-sm">+{count - 4} More</span>
            </div>
          )}
        </div>
      ))}
    </button>
  );
}
