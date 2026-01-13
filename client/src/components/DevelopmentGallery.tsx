import { Play } from 'lucide-react';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
}

interface DevelopmentGalleryProps {
  media: MediaItem[];
  totalPhotos: number;
  featuredMedia: MediaItem;
  indices: {
      general: number;
      amenities: number;
      outdoors: number;
      videos: number;
      floorPlans: number;
  };
  onOpenLightbox: (index: number, title: string) => void;
  videos: any[];
  floorPlans: any[];
  images: string[];
}

export function DevelopmentGallery({
  media,
  totalPhotos,
  featuredMedia,
  indices,
  onOpenLightbox,
  videos,
  floorPlans,
  images
}: DevelopmentGalleryProps) {

  // Logic to determine Bottom Right Tile content to avoid redundancy
  const showVideoTile = videos && videos.length > 0 && featuredMedia.type !== 'video';
  
  // Helper to render media content
  const renderMediaContent = (item: MediaItem, alt: string) => {
    if (item.type === 'video') {
      return (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200"
        />
      );
    }
    return (
      <img
        src={item.url}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
    );
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-3 h-[400px] max-h-[400px] overflow-hidden">
      {/* LEFT: Featured Media (60% - 3 columns) */}
      <div className="lg:col-span-3 relative rounded-card overflow-hidden shadow-sm h-full max-h-[400px] group bg-slate-900 ring-1 ring-black/5">
        {renderMediaContent(featuredMedia, 'Featured View')}
        
        {/* Overlay Action */}
        <button
          onClick={() =>
            onOpenLightbox(
              featuredMedia.type === 'video' ? indices.videos : 0,
              featuredMedia.type === 'video' ? 'Watch Video' : 'All Photos',
            )
          }
          className="absolute bottom-3 right-3 bg-white/95 hover:bg-white backdrop-blur-md px-3.5 py-2 rounded-pill font-semibold text-xs shadow-sm border border-white/20 transition-all hover:scale-105 flex items-center gap-2"
        >
          {featuredMedia.type === 'video' ? (
             <>
               <Play className="w-3.5 h-3.5 fill-current" />
               <span>Watch Video</span>
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
            className="relative rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group h-[194px] ring-1 ring-black/5"
          >
            <img
              src="https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400"
              alt="Amenities"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
              Amenities
            </span>
          </button>

          {/* Outdoors Card */}
          <button
            onClick={() => onOpenLightbox(indices.outdoors, 'Outdoor Spaces')}
            className="relative rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group h-[194px] ring-1 ring-black/5"
          >
            <img
              src="https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=400"
              alt="Outdoors"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
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
                        <button
                          onClick={() => onOpenLightbox(indices.videos, 'Videos')}
                          className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5"
                        >
                          <img
                            src="https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=400"
                            alt="Videos"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/0 transition-colors">
                              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                  <Play className="w-3.5 h-3.5 text-white fill-current" />
                              </div>
                          </div>
                          <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
                            Videos ({videos.length})
                          </span>
                        </button>
                    );
                } else if (floorPlans && floorPlans.length > 0) {
                    return (
                        <button
                           onClick={() => onOpenLightbox(indices.floorPlans, 'Floor Plans')} 
                           className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5"
                        >
                            <img
                                src={floorPlans[0]?.url || images[1] || ''}
                                alt="Floor Plans"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                             <span className="absolute right-2.5 bottom-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-pill font-semibold text-[11px] shadow-sm border border-white/20">
                                Floor Plans
                             </span>
                        </button>
                    );
                } else {
                    // Fallback to Gallery (more photos)
                     return (
                        <button
                           onClick={() => onOpenLightbox(0, 'All Photos')} 
                           className="relative w-full h-[194px] rounded-card overflow-hidden shadow-sm hover:shadow-md transition-all group ring-1 ring-black/5"
                        >
                            <img
                                src={images[2] || images[0] || ''}
                                alt="Gallery"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
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
