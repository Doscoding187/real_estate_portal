import type { DevelopmentGalleryTile, ImageMedia, VideoMedia } from '@/lib/media-logic';
import { VideoThumbnailGrid } from '@/components/media/VideoThumbnailGrid';

interface DevelopmentGalleryProps {
  // Pre-decided Media Buckets (Pure Data)
  featuredMedia:
    | { type: 'video'; video: VideoMedia }
    | { type: 'image'; image: ImageMedia | undefined };

  // Tiles are selected from the available, non-featured gallery photos.
  galleryTiles: DevelopmentGalleryTile[];
  galleryRemainderTileImage: ImageMedia | undefined;
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
    videos: number;
    floorPlans: number;
  };
}

const DEFAULT_GALLERY_PLACEHOLDER =
  '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg';

export function DevelopmentGallery({
  featuredMedia,
  galleryTiles,
  galleryRemainderTileImage,
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
  const hasSidebarMedia =
    galleryTiles.length > 0 ||
    showVideoTile ||
    hasFloorPlans ||
    (featuredMedia.type === 'video' && Boolean(viewGalleryTileImage));
  const sideMediaTileHeight = galleryTiles.length > 0 ? 'h-[194px]' : 'h-[400px]';
  const featuredAction = (() => {
    if (featuredMedia.type === 'video') {
      return {
        index: 0,
        title: 'Development Media',
        label: 'View all development media',
      };
    }

    if (hasPhotos) {
      const hasNonPhotoMedia = hasVideos || hasFloorPlans;
      return {
        index: 0,
        title: hasNonPhotoMedia ? 'Development Media' : 'All Photos',
        label: hasNonPhotoMedia ? 'View all development media' : `View all ${totalPhotos} photos`,
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

  const renderGalleryTile = ({ image, label, index }: DevelopmentGalleryTile) => {
    return (
      <button
        onClick={() => onOpenLightbox(index, label)}
        className="group relative h-[194px] w-full overflow-hidden rounded-card bg-slate-100 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md"
      >
        {renderImage(image, label)}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span className="absolute right-2.5 bottom-2.5 rounded-pill border border-white/20 bg-white/95 px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-md">
          {label}
        </span>
      </button>
    );
  };

  const renderFeaturedContent = () => {
    if (featuredMedia.type === 'video') {
      return (
        <video
          src={featuredMedia.video.url}
          className="h-full w-full object-cover"
          muted
          autoPlay
          loop
          playsInline
          poster={
            featuredMedia.video.thumbnailUrl ||
            viewGalleryTileImage?.url ||
            DEFAULT_GALLERY_PLACEHOLDER
          }
        />
      );
    }

    const img = featuredMedia.image;
    if (!img)
      return (
        <div className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
          <p className="text-base font-semibold">Gallery in preparation</p>
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
      <div
        className={`${hasSidebarMedia ? 'lg:col-span-3' : 'lg:col-span-5'} relative rounded-card overflow-hidden shadow-sm h-full max-h-[400px] group bg-slate-900 ring-1 ring-black/5`}
      >
        {renderFeaturedContent()}

        {/* Overlay Action */}
        {hasAnyMedia && featuredAction ? (
          <button
            onClick={() => onOpenLightbox(featuredAction.index, featuredAction.title)}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-pill border border-white/20 bg-white/95 px-3.5 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-white"
          >
            <span>{featuredAction.label}</span>
          </button>
        ) : (
          <div className="absolute bottom-3 right-3 rounded-pill border border-white/20 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-md">
            Media updates pending
          </div>
        )}
      </div>

      {/* RIGHT: Available Gallery Media - Hidden on mobile */}
      {hasSidebarMedia && (
        <div
          className={`hidden lg:grid lg:col-span-2 ${galleryTiles.length > 0 ? 'grid-rows-2' : 'grid-rows-1'} gap-3 h-[400px] max-h-[400px]`}
        >
          {galleryTiles.length > 0 && (
            <div
              className={`grid ${galleryTiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3 h-[194px]`}
            >
              {galleryTiles.map(tile => (
                <div key={tile.image.url}>{renderGalleryTile(tile)}</div>
              ))}
            </div>
          )}

          {/* Bottom Row: Video, floor plan, or the remaining gallery photo. */}
          <div className={sideMediaTileHeight}>
            {(() => {
              if (featuredMedia.type === 'video') {
                return (
                  <button
                    onClick={() => onOpenLightbox(0, 'Development Media')}
                    className={`relative w-full ${sideMediaTileHeight} rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-slate-100`}
                  >
                    {viewGalleryTileImage ? (
                      <>
                        {renderImage(viewGalleryTileImage, 'Main development photo')}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      </>
                    ) : (
                      renderTileFallback(
                        'Development Media',
                        'Open the gallery to explore this development’s media.',
                      )
                    )}
                    <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
                      View all development media
                    </span>
                  </button>
                );
              } else if (showVideoTile) {
                return (
                  <div
                    className={`relative w-full ${sideMediaTileHeight} rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-black`}
                  >
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
                    className={`relative w-full ${sideMediaTileHeight} rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-slate-100`}
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
              }

              return (
                <button
                  onClick={() => onOpenLightbox(0, 'Development Media')}
                  disabled={!hasAnyMedia}
                  className={`relative w-full ${sideMediaTileHeight} rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-slate-100`}
                >
                  {galleryRemainderTileImage
                    ? renderImage(galleryRemainderTileImage, 'More development photos')
                    : renderTileFallback(
                        'Development Media',
                        'Open the gallery to view all available development photos.',
                      )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
                    View all development media
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
