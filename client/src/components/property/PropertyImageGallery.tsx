import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Box, Camera, ChevronLeft, ChevronRight, Images, Maximize2, Play, Ruler, X, ZoomIn, ZoomOut } from 'lucide-react';

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
      icon: Images,
      meta: String(sortedImages.length),
      enabled: true,
      action: () => setActiveMediaTab('photos'),
    },
    {
      id: 'videos' as const,
      label: 'Videos',
      icon: Play,
      meta: String(videoCount || 0),
      enabled: videoCount > 0 && Boolean(onOpenVideos),
      action: () => {
        if (videoCount > 0 && onOpenVideos) {
          setActiveMediaTab('videos');
          onOpenVideos();
        }
      },
    },
    {
      id: 'virtual' as const,
      label: '3D Tour',
      icon: Box,
      meta: hasVirtualTour ? '360°' : '0',
      enabled: hasVirtualTour && Boolean(onOpenVirtualTour),
      action: () => {
        if (hasVirtualTour && onOpenVirtualTour) {
          setActiveMediaTab('virtual');
          onOpenVirtualTour();
        }
      },
    },
    {
      id: 'plan' as const,
      label: 'Floor Plan',
      icon: Ruler,
      meta: hasFloorPlan ? '1' : '0',
      enabled: hasFloorPlan && Boolean(onOpenFloorPlan),
      action: () => {
        if (hasFloorPlan && onOpenFloorPlan) {
          setActiveMediaTab('plan');
          onOpenFloorPlan();
        }
      },
    },
  ];

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
    <div className="flex h-full flex-col gap-3">
      {/* Main Image */}
      <div className="relative group min-h-[520px] flex-1 overflow-hidden rounded-2xl bg-slate-100">
        <img
          src={sortedImages[selectedImageIndex].imageUrl}
          alt={`${propertyTitle} - Image ${selectedImageIndex + 1}`}
          className="h-full min-h-[520px] w-full object-cover cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => setIsLightboxOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Desktop Image Counter */}
        <div className="absolute bottom-4 left-4 hidden items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur md:inline-flex">
          <Camera className="h-3.5 w-3.5" />
          {selectedImageIndex + 1} / {sortedImages.length}
        </div>

        {/* Navigation Arrows - Desktop hover only; mobile uses swipe */}
        {sortedImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full opacity-0 transition-opacity md:flex md:group-hover:opacity-100"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full opacity-0 transition-opacity md:flex md:group-hover:opacity-100"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Desktop Expand Button */}
        <div className="absolute bottom-4 right-4 hidden md:flex">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full bg-white/90 text-slate-900 shadow-sm backdrop-blur hover:bg-white"
            onClick={() => setIsLightboxOpen(true)}
          >
            <Maximize2 className="mr-2 h-4 w-4" />
            View all photos
          </Button>
        </div>
      </div>

      {/* Media Tabs - Mobile */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {mediaTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={!tab.enabled}
              onClick={tab.action}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeMediaTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${!tab.enabled ? 'cursor-not-allowed opacity-45 hover:bg-slate-100' : ''}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                {tab.meta}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop Media Rail */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 gap-2">
          {mediaTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeMediaTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                disabled={!tab.enabled}
                onClick={tab.action}
                aria-pressed={isActive}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/60'
                } ${!tab.enabled ? 'cursor-not-allowed opacity-45 hover:border-slate-200 hover:bg-white' : ''}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden truncate sm:inline">{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.meta}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
