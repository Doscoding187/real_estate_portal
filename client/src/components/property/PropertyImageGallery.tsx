import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Box,
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Images,
  Play,
  Ruler,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

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
      action: () => {
        setActiveMediaTab('photos');
        setIsLightboxOpen(true);
      },
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
  const visibleMediaTabs = mediaTabs.filter(tab => tab.id === 'photos' || tab.enabled);

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
      <div className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-6 text-center md:min-h-[500px]">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="font-semibold text-slate-700">Photos have not been added yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          You can still review the property details and send an enquiry to the listing
          representative.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Main Image */}
      <div className="group relative aspect-[4/3] min-h-[260px] flex-1 overflow-hidden rounded-2xl bg-slate-100 md:aspect-auto md:min-h-[520px]">
        <button
          type="button"
          aria-label={`Open photo gallery for ${propertyTitle}`}
          className="absolute inset-0 h-full w-full cursor-zoom-in rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/60"
          onClick={() => setIsLightboxOpen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={sortedImages[selectedImageIndex].imageUrl}
            alt={`${propertyTitle} - Image ${selectedImageIndex + 1}`}
            className="h-full min-h-[260px] w-full object-cover transition-transform hover:scale-[1.02] md:min-h-[520px]"
          />
        </button>

        {/* Desktop Image Counter */}
        <div className="absolute bottom-4 left-4 hidden items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur md:inline-flex">
          <Camera className="h-3.5 w-3.5" />
          {selectedImageIndex + 1} / {sortedImages.length}
        </div>

        {/*
         * Carousel controls are deliberately absent at rest. Desktop users
         * reveal them through a purposeful hover or keyboard focus; touch
         * users swipe the canvas or open the photo counter. This keeps the
         * media experience calm without making it inaccessible.
         */}
        {sortedImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 rounded-full opacity-0 transition-opacity focus:pointer-events-auto focus:opacity-100 md:flex md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
              onClick={handlePrevious}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-full opacity-0 transition-opacity focus:pointer-events-auto focus:opacity-100 md:flex md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
              onClick={handleNext}
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        {/* Desktop media controls live in the canvas when that media exists. */}
        <div className="absolute bottom-4 right-4 z-10 hidden max-w-[calc(100%-8rem)] items-center justify-end gap-2 md:flex">
          {visibleMediaTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                aria-label={`${tab.label}, ${tab.meta}`}
                aria-pressed={activeMediaTab === tab.id}
                disabled={!tab.enabled}
                onClick={tab.action}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur transition ${
                  activeMediaTab === tab.id
                    ? 'border-blue-200 bg-white text-blue-700'
                    : 'border-white/30 bg-slate-950/70 text-white hover:bg-slate-950/90'
                } ${!tab.enabled ? 'cursor-not-allowed opacity-45' : ''}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="text-[10px] opacity-75">{tab.meta}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Tabs - Mobile */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {visibleMediaTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={`${tab.label}, ${tab.meta}`}
              aria-pressed={activeMediaTab === tab.id}
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

      {sortedImages.length > 1 && (
        <div className="hidden gap-2 md:flex" aria-label="Property photo thumbnails">
          {sortedImages.slice(0, 5).map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => {
                setSelectedImageIndex(index);
                setZoomLevel(1);
              }}
              aria-label={`View photo ${index + 1}`}
              aria-pressed={selectedImageIndex === index}
              className={`h-16 min-w-0 flex-1 overflow-hidden rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                selectedImageIndex === index
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <img
                src={image.imageUrl}
                alt={`${propertyTitle} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
          {sortedImages.length > 5 && (
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-xs font-bold text-white transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={`View all ${sortedImages.length} photos`}
            >
              <img
                src={sortedImages[5]?.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <span className="absolute inset-0 grid place-items-center bg-slate-950/45">
                +{sortedImages.length - 5}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent
          aria-label={`${propertyTitle} photo gallery`}
          className="h-full max-w-full bg-black/95 p-2 sm:p-8 lg:h-[90vh] lg:max-w-7xl lg:p-16"
        >
          <DialogTitle className="sr-only">{propertyTitle} photo gallery</DialogTitle>
          <DialogDescription className="sr-only">
            Browse photos of {propertyTitle}. Use the previous and next photo controls or swipe on
            touch devices.
          </DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close photo gallery"
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
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full z-50"
                  onClick={handleNext}
                  aria-label="Next photo"
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
                aria-label="Zoom out"
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
                aria-label="Zoom in"
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
                  <button
                    type="button"
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
                    aria-label={`View photo ${index + 1}`}
                  >
                    <img
                      src={image.imageUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
