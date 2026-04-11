import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface PropertyImage {
  id: number;
  imageUrl: string;
  isPrimary?: number;
  displayOrder?: number;
}

interface PropertyImageGalleryProps {
  images: PropertyImage[];
  propertyTitle: string;
  videoCount?: number;
  hasVirtualTour?: boolean;
  hasFloorPlan?: boolean;
  onOpenVideos?: () => void;
  onOpenVirtualTour?: () => void;
  onOpenFloorPlan?: () => void;
}

export function PropertyImageGallery({
  images,
  propertyTitle,
  videoCount = 0,
  hasVirtualTour = false,
  hasFloorPlan = false,
  onOpenVideos,
  onOpenVirtualTour,
  onOpenFloorPlan,
}: PropertyImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'videos' | 'virtual' | 'plan'>(
    'photos',
  );
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary === 1) return -1;
    if (b.isPrimary === 1) return 1;
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  const handlePrevious = () => {
    setSelectedImageIndex(prev => (prev === 0 ? sortedImages.length - 1 : prev - 1));
    setZoomLevel(1);
  };

  const handleNext = () => {
    setSelectedImageIndex(prev => (prev === sortedImages.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrevious();
    }
  };
  const mediaTabs = [
    {
      id: 'photos' as const,
      label: 'Photos',
      count: sortedImages.length,
      enabled: true,
      action: () => setActiveMediaTab('photos'),
    },
    {
      id: 'videos' as const,
      label: 'Videos',
      count: videoCount,
      enabled: videoCount > 0 && Boolean(onOpenVideos),
      action: () => {
        setActiveMediaTab('videos');
        onOpenVideos?.();
      },
    },
    {
      id: 'virtual' as const,
      label: 'Virtual Tour',
      count: null,
      enabled: hasVirtualTour && Boolean(onOpenVirtualTour),
      action: () => {
        setActiveMediaTab('virtual');
        onOpenVirtualTour?.();
      },
    },
    {
      id: 'plan' as const,
      label: 'Floor Plan',
      count: null,
      enabled: hasFloorPlan && Boolean(onOpenFloorPlan),
      action: () => {
        setActiveMediaTab('plan');
        onOpenFloorPlan?.();
      },
    },
  ].filter(tab => tab.enabled);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => (prev === 0 ? sortedImages.length - 1 : prev - 1));
        setZoomLevel(1);
      }
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => (prev === sortedImages.length - 1 ? 0 : prev + 1));
        setZoomLevel(1);
      }
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, sortedImages.length]);

  if (sortedImages.length === 0) {
    return (
      <div className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground">No images available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative group rounded-lg overflow-hidden">
        <img
          src={sortedImages[selectedImageIndex].imageUrl}
          alt={`${propertyTitle} - Image ${selectedImageIndex + 1}`}
          className="w-full h-[280px] sm:h-[400px] lg:h-[500px] object-cover cursor-pointer transition-transform hover:scale-105"
          onClick={() => setIsLightboxOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Desktop Image Counter */}
        <div className="absolute top-4 right-4 hidden md:block bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium">
          {selectedImageIndex + 1} / {sortedImages.length}
        </div>

        {/* Navigation Arrows - Always visible on mobile */}
        {sortedImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity rounded-full"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Desktop Expand Buttons */}
        <div className="absolute bottom-4 right-4 hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="secondary" size="sm" onClick={() => setIsLightboxOpen(true)}>
            <ZoomIn className="h-4 w-4 mr-2" />
            View All Photos
          </Button>
          {videoCount > 0 && onOpenVideos && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
              onClick={onOpenVideos}
            >
              <ZoomIn className="h-4 w-4 mr-2" />
              View All Videos
            </Button>
          )}
        </div>
      </div>

      {/* Media Tabs - Mobile */}
      <div className="flex justify-center gap-2 overflow-x-auto pb-1 md:hidden">
        {mediaTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={tab.action}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeMediaTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* Image Counter - Mobile */}
      <div className="text-center space-y-2 md:hidden">
        <span className="text-sm text-slate-500">
          {selectedImageIndex + 1} / {sortedImages.length}
        </span>
        {sortedImages.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {sortedImages.slice(0, 8).map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Go to image ${index + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  selectedImageIndex === index ? 'bg-blue-600 w-4' : 'bg-slate-300'
                }`}
                onClick={() => setSelectedImageIndex(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Grid - Hidden on mobile */}
      {sortedImages.length > 1 && (
        <div className="hidden md:grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {sortedImages.slice(0, 8).map((image, index) => (
            <div
              key={image.id}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                selectedImageIndex === index
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'hover:opacity-80'
              }`}
              onClick={() => setSelectedImageIndex(index)}
            >
              <img
                src={image.imageUrl}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 7 && sortedImages.length > 8 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                  +{sortedImages.length - 8}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-full h-full p-2 sm:p-8 lg:max-w-7xl lg:h-[90vh] lg:p-16 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Image Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium z-50">
              {selectedImageIndex + 1} / {sortedImages.length}
            </div>

            {/* Navigation in lightbox - Always visible on mobile */}
            {sortedImages.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full z-50"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full z-50"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.25))}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium">
                {Math.round(zoomLevel * 100)}%
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-8 lg:p-16">
              <img
                src={sortedImages[selectedImageIndex].imageUrl}
                alt={`${propertyTitle} - Image ${selectedImageIndex + 1}`}
                className="max-w-full max-h-full object-contain transition-transform"
                style={{ transform: `scale(${zoomLevel})` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            {/* Thumbnail Strip */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-4xl overflow-x-auto">
              <div className="flex gap-2 px-4">
                {sortedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedImageIndex === index
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => {
                      setSelectedImageIndex(index);
                      setZoomLevel(1);
                    }}
                  >
                    <img
                      src={image.imageUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
