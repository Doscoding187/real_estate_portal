import { Play } from 'lucide-react';
import type { ImageMedia, VideoMedia } from '@/lib/media-logic';
import { VideoThumbnailGrid } from '@/components/media/VideoThumbnailGrid';

interface DevelopmentGalleryProps {
  // Pre-decided Media Buckets (Pure Data)
  featuredMedia: { type: 'video', video: VideoMedia } | { type: 'image', image: ImageMedia | undefined };
  
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

  // Logic to determine Bottom Right Tile content
  // If videos trigger a dedicated tile, they take priority over floor plans/gallery
  const showVideoTile = totalVideos > 0 && featuredMedia.type !== 'video';
  
  // Helper to render media content
  const renderFeaturedContent = () => {
    if (featuredMedia.type === 'video') {
       const video = featuredMedia.video;
       return (
        <video
          src={video.url}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          // No generic placeholder - if video loads it shows, if not, browser default or we can add a specific poster later
        />
       );
    } 

    const img = featuredMedia.image;
    if (!img) return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">No Image</div>;

    return (
      <img
        src={img.url}
        alt="Featured View"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
    );
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-[400px] max-h-[400px] overflow-hidden">
      {/* LEFT: Featured Media (60% - 3 columns) */}
      <div className="lg:col-span-3 relative rounded-card overflow-hidden shadow-sm h-full max-h-[400px] group bg-slate-900 ring-1 ring-black/5">
        {renderFeaturedContent()}
        
        {/* Overlay Action */}
        <button
          onClick={() =>
            onOpenLightbox(
              featuredMedia.type === 'video' ? indices.videos : 0,
              featuredMedia.type === 'video' ? 'Videos' : 'All Photos',
            )
          }
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white backdrop-blur-md px-3.5 py-2 rounded-pill font-semibold text-xs shadow-sm border border-white/20 transition-all hover:scale-105 flex items-center gap-2"
        >
          {featuredMedia.type === 'video' ? (
             <>
               <Play className="w-3.5 h-3.5 fill-current" />
               <span>View all {totalVideos > 1 ? totalVideos + ' ' : ''}videos</span>
             </>
          ) : (
             <span>View all {totalPhotos} photos</span>
          )}
        </button>
      </div>

      {/* RIGHT: Category Cards (40% - 2 columns) - Hidden on mobile */}
      <div className="hidden lg:grid lg:col-span-2 grid-rows-2 gap-3 h-[400px] max-h-[400px]">
        {/* Top Row: 2 cards side by side (50/50) - Fixed 200px height */}
        <div className="grid grid-cols-2 gap-3 h-[194px]">
          {/* Amenities Card */}
          <button
            onClick={() => onOpenLightbox(indices.amenities, 'Amenities')}
            className="relative rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group h-[194px] ring-1 ring-black/5 bg-slate-100"
          >
            {amenityTileImage ? (
                <img
                src={amenityTileImage.url}
                alt="Amenities"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">No Amenities</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
              Amenities
            </span>
          </button>

          {/* Outdoors Card */}
          <button
            onClick={() => onOpenLightbox(indices.outdoors, 'Outdoor Spaces')}
            className="relative rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group h-[194px] ring-1 ring-black/5 bg-slate-100"
          >
            {outdoorsTileImage ? (
                <img
                src={outdoorsTileImage.url}
                alt="Outdoors"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">No Outdoors</div>
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
                                />
                            ) : null}
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
                           className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5 bg-slate-100"
                        >
                            {viewGalleryTileImage ? (
                                <img
                                    src={viewGalleryTileImage.url}
                                    alt="Gallery"
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : null}
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
