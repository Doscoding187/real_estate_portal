import { Play } from 'lucide-react';
import type { ImageMedia, VideoMedia } from '@/lib/media-logic';
import { VideoThumbnailGrid } from '@/components/media/VideoThumbnailGrid';

interface DevelopmentGalleryProps {
  // Pre-decided Media Buckets (Pure Data)
  featuredMedia:
    | { type: 'video'; video: VideoMedia }
    | { type: 'image'; image: ImageMedia | undefined };

  // Tiles (Jump Points)
  amenityTileImage: ImageMedia | undefined;
  outdoorsTileImage: ImageMedia | undefined;
  viewGalleryTileImage: ImageMedia | undefined;

  // Data for Labels/Badges
  totalPhotos: number;
  totalVideos: number;
  videoList: VideoMedia[]; // Needed for grid
  floorPlans: { url: string }[];

  // Action Handlers
  onOpenLightbox: (index: number, title: string) => void;

  // Jump Indices
  indices: {
    general: number;
    amenities: number;
    outdoors: number;
    videos: number;
    floorPlans: number;
  };
}

const DEFAULT_GALLERY_PLACEHOLDER =
  '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg';

export function DevelopmentGallery({
  featuredMedia,
  amenityTileImage,
  outdoorsTileImage,
  viewGalleryTileImage,
  totalPhotos,
  totalVideos,
  videoList,
  floorPlans,
  onOpenLightbox,
  indices,
}: DevelopmentGalleryProps) {
  const showVideoTile = totalVideos > 0 && featuredMedia.type !== 'video';
  const hasPhotos = totalPhotos > 0;
  const hasVideos = totalVideos > 0;
  const hasFloorPlans = floorPlans.length > 0;
  const hasAnyMedia = hasPhotos || hasVideos || hasFloorPlans;
  const featuredAction = (() => {
    if (featuredMedia.type === 'video') {
      return {
        index: indices.videos,
        title: 'Videos',
        label: `View all ${totalVideos > 1 ? `${totalVideos} ` : ''}videos`,
      };
    }

    if (hasPhotos) {
      return {
        index: 0,
        title: 'All Photos',
        label: `View all ${totalPhotos} photos`,
      };
    }

    if (hasFloorPlans) {
      return {
        index: indices.floorPlans,
        title: 'Floor Plans',
        label: 'View floor plans',
      };
    }

    if (hasVideos) {
      return {
        index: indices.videos,
        title: 'Videos',
        label: `View all ${totalVideos > 1 ? `${totalVideos} ` : ''}videos`,
      };
    }

    return null;
  })();

  const renderImage = (image: ImageMedia | undefined, alt: string) => (
    <img
      src={image?.url || DEFAULT_GALLERY_PLACEHOLDER}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      onError={e => {
        const target = e.currentTarget;
        if (target.src.includes(DEFAULT_GALLERY_PLACEHOLDER)) return;
        target.src = DEFAULT_GALLERY_PLACEHOLDER;
      }}
    />
  );

  const renderTileFallback = (title: string, description: string) => (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-br from-slate-200 via-slate-100 to-white p-4 text-left">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );

  const renderFeaturedContent = () => {
    if (featuredMedia.type === 'video') {
      const video = featuredMedia.video;
      return (
        <video
          src={video.url}
          className="w-full h-full object-cover"
          muted
          autoPlay
          playsInline
          poster={viewGalleryTileImage?.url || DEFAULT_GALLERY_PLACEHOLDER}
        />
      );
    }

    const img = featuredMedia.image;
    if (!img)
      return (
        <div className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
          <p className="text-base font-semibold">Gallery coming soon</p>
          <p className="mt-2 max-w-sm text-sm text-white/75">
            We are preparing visuals, floor plans, and sales material for this development.
          </p>
        </div>
      );

    return renderImage(img, 'Featured development view');
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-[400px] max-h-[400px] overflow-hidden">
      {/* LEFT: Featured Media (60% - 3 columns) */}
      <div className="lg:col-span-3 relative rounded-card overflow-hidden shadow-sm h-full max-h-[400px] group bg-slate-900 ring-1 ring-black/5">
        {renderFeaturedContent()}

        {/* Overlay Action */}
        {hasAnyMedia && featuredAction ? (
          <button
            onClick={() => onOpenLightbox(featuredAction.index, featuredAction.title)}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-pill border border-white/20 bg-white/95 px-3.5 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-white"
          >
            {featuredMedia.type === 'video' ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{featuredAction.label}</span>
              </>
            ) : (
              <span>{featuredAction.label}</span>
            )}
          </button>
        ) : (
          <div className="absolute bottom-3 right-3 rounded-pill border border-white/20 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-md">
            Media updates pending
          </div>
        )}
      </div>

      {/* RIGHT: Category Cards (40% - 2 columns) - Hidden on mobile */}
      <div className="hidden lg:grid lg:col-span-2 grid-rows-2 gap-3 h-[400px] max-h-[400px]">
        {/* Top Row: 2 cards side by side (50/50) - Fixed 200px height */}
        <div className="grid grid-cols-2 gap-3 h-[194px]">
          {/* Amenities Card */}
          <button
            onClick={() => onOpenLightbox(indices.amenities, 'Amenities')}
            disabled={!amenityTileImage && !hasAnyMedia}
            className="relative rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group h-[194px] ring-1 ring-black/5 bg-slate-100"
          >
            {amenityTileImage
              ? renderImage(amenityTileImage, 'Development amenities')
              : renderTileFallback(
                  'Amenities',
                  'Amenity visuals will appear here as the developer adds more media.',
                )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
              Amenities
            </span>
          </button>

          {/* Outdoors Card */}
          <button
            onClick={() => onOpenLightbox(indices.outdoors, 'Outdoor Spaces')}
            disabled={!outdoorsTileImage && !hasAnyMedia}
            className="relative rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group h-[194px] ring-1 ring-black/5 bg-slate-100"
          >
            {outdoorsTileImage
              ? renderImage(outdoorsTileImage, 'Outdoor spaces')
              : renderTileFallback(
                  'Outdoor Spaces',
                  'Landscape and exterior imagery will be added as sales content expands.',
                )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
              Outdoors
            </span>
          </button>
        </div>

        {/* Bottom Row: Dynamic Card (Videos -> Floor Plans -> Gallery) - Fixed 200px height */}
        <div className="h-[194px]">
          {(() => {
            if (showVideoTile) {
              return (
                <div className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-black">
                  {/* Uses the new VideoThumbnailGrid */}
                  <VideoThumbnailGrid
                    videos={videoList}
                    onPlayClick={() => onOpenLightbox(indices.videos, 'Videos')}
                    fallbackImage={viewGalleryTileImage?.url}
                  />

                  <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20 pointer-events-none">
                    Videos ({totalVideos})
                  </span>
                </div>
              );
            } else if (floorPlans && floorPlans.length > 0) {
              return (
                <button
                  onClick={() => onOpenLightbox(indices.floorPlans, 'Floor Plans')}
                  className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-slate-100"
                >
                  {floorPlans[0]?.url ? (
                    <img
                      src={floorPlans[0].url}
                      alt="Floor Plans"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={e => {
                        const target = e.currentTarget;
                        if (target.src.includes(DEFAULT_GALLERY_PLACEHOLDER)) return;
                        target.src = DEFAULT_GALLERY_PLACEHOLDER;
                      }}
                    />
                  ) : (
                    renderTileFallback(
                      'Floor Plans',
                      'Request the brochure to receive the latest floor plan pack from sales.',
                    )
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
                    Floor Plans
                  </span>
                </button>
              );
            } else {
              // Fallback to Gallery (more photos) - using viewGalleryTileImage
              return (
                <button
                  onClick={() => onOpenLightbox(0, 'All Photos')}
                  disabled={!viewGalleryTileImage && !hasAnyMedia}
                  className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-slate-100"
                >
                  {viewGalleryTileImage
                    ? renderImage(viewGalleryTileImage, 'Development gallery')
                    : renderTileFallback(
                        'Gallery',
                        'More photography will appear here as this development listing is updated.',
                      )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
                    View Gallery
                  </span>
                </button>
              );
            }
          })()}
        </div>
      </div>
    </section>
  );
}
