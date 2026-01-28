import React, { useRef, useState } from 'react';
import { useDevelopmentWizard, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Upload,
  X,
  Star,
  Image as ImageIcon,
  Video,
  TreePine,
  Dumbbell,
  FileText,
  MapPin,
  Layout,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { SortableMediaGrid } from '@/components/media/SortableMediaGrid';
import type { MediaItem as GridMediaItem } from '@/components/media/SortableMediaGrid';
import { WizardData } from '@/lib/types/wizard-workflows';

// Helper component for Video URL input
function VideoUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('');

  const isValidVideoUrl = (link: string) => {
    // Check for YouTube or Vimeo URLs
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;
    const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/\d+/;
    return youtubeRegex.test(link) || vimeoRegex.test(link);
  };

  const handleAdd = () => {
    if (!url.trim()) {
      toast.error('Please enter a video URL');
      return;
    }
    if (!isValidVideoUrl(url)) {
      toast.error('Please enter a valid YouTube or Vimeo URL');
      return;
    }
    onAdd(url.trim());
    setUrl('');
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="pl-9"
        />
      </div>
      <Button onClick={handleAdd} type="button" variant="secondary" className="shrink-0">
        <Plus className="w-4 h-4 mr-1" />
        Add
      </Button>
    </div>
  );
}

export function MediaPhase() {
  const { developmentData, saveWorkflowStepData, stepData: allStepData } = useDevelopmentWizard();

  const [activeTab, setActiveTab] = useState('gallery');

  // SOURCE OF TRUTH: stepData.development_media
  // FALLBACK: developmentData.media (legacy migration only)
  const currentStepData = allStepData?.development_media || {};

  const photos = currentStepData.photos ?? developmentData.media?.photos ?? [];
  const videos = currentStepData.videos ?? developmentData.media?.videos ?? [];
  // Important: Canonical source calls it 'documents', legacy fallback might be 'documents' or 'brochures'
  const documents =
    currentStepData.documents ??
    developmentData.media?.documents ??
    (developmentData.media as any)?.brochures ??
    [];

  // Hero Image Derivation (Deterministic)
  // heroImage = first photo where category === 'hero' OR first photo
  const heroImage = (() => {
    const heroCandidate = photos.find(p => p.category === 'hero') || photos[0];
    return heroCandidate; // Return the full object for display
  })();

  const featuredCount = photos.filter(p => p.category === 'featured').length;
  // All photos that are not featured count as gallery, plus featured ones are technically photos too.
  // The logic in previous was: photos.filter(p => p.category !== 'featured').length + featuredCount
  // Simplify: basically all photos count except the hero might be special in UI but in data it's just category='hero'.
  // Use legacy 'featured' category check for migration, but new hero category is 'hero' (from prompt instructions? Prompt said "hero selection stable... category === 'hero' OR first photo").
  // Wait, previous code used `category: isHero ? 'featured' : category`.
  // Let's stick to consistent category names.
  // If we want deterministic hero, let's say category 'hero' is explicit hero.
  // But previous code saved hero as 'featured'. Let's support 'featured' as hero category for now to minimize drift.

  const galleryCount = photos.length;

  // Progress Calculation
  const hasHero = !!heroImage;
  const hasMinGallery = galleryCount >= 3;
  const hasDocuments = documents.length >= 1;

  const progressPercent = [
    hasHero ? 40 : 0,
    Math.min(galleryCount, 5) * 6, // Max 30 (5 items)
    hasDocuments ? 30 : 0, // Documents requirement
  ].reduce((a, b) => a + b, 0);

  const presignMutation = trpc.upload.presign.useMutation();

  // ACTIONS ------------------------------------------------------------------

  const persistMedia = (
    newPhotos?: MediaItem[],
    newVideos?: MediaItem[],
    newDocuments?: MediaItem[],
  ) => {
    saveWorkflowStepData('development_media', {
      photos: newPhotos ?? photos,
      videos: newVideos ?? videos,
      documents: newDocuments ?? documents,
    } as any);
  };

  const handleAddMedia = (item: MediaItem) => {
    if (item.type === 'image') {
      // If adding a hero (featured), pre-pend or append?
      // If category is 'featured', it's hero.
      persistMedia([...photos, item], undefined, undefined);
    } else if (item.type === 'video') {
      persistMedia(undefined, [...videos, item], undefined);
    } else if (item.type === 'pdf' || item.type === 'document') {
      persistMedia(undefined, undefined, [...documents, item]);
    }
  };

  const handleRemoveMedia = (id: string) => {
    // Search all arrays
    if (photos.some(p => p.id === id)) {
      persistMedia(
        photos.filter(p => p.id !== id),
        undefined,
        undefined,
      );
    } else if (videos.some(v => v.id === id)) {
      persistMedia(
        undefined,
        videos.filter(v => v.id !== id),
        undefined,
      );
    } else if (documents.some(d => d.id === id)) {
      persistMedia(
        undefined,
        undefined,
        documents.filter(d => d.id !== id),
      );
    }
  };

  const handleReorderMedia = (newItems: MediaItem[]) => {
    // Reorder applies to the list passed to SortableMediaGrid
    // We need to figure out which list it is.
    // SortableMediaGrid mixes types? No, it usually takes one list.
    // In this UI, we have Tabs.
    // If we are in Gallery tab, we are reordering Photos.
    // We can infer from the items passed.

    const firstItem = newItems[0];
    if (!firstItem) return; // Empty list

    if (firstItem.type === 'image') {
      // We might be receiving a filtered list (e.g. only particular category).
      // But SortableMediaGrid usually shows all unless filtered.
      // Current implementation shows filtered items by category. Reordering filtered lists is tricky.
      // However, the previous implementation passed `items` (filtered) to SortableMediaGrid.
      // Only reorder within that category? Or globally?
      // Ideally, reorder should update the GLOBAL photos list order.

      // If we are viewing ALL photos (or a category), we need to reflect that in main list.
      // Simplest for now: The previous code filtered items by category.
      // Reordering within a category?
      // The previous code had `reorderMedia` action which likely handled finding items by ID and updating displayOrder.
      // Since we store flat arrays `photos`, we should just update their order in the array.

      // Strategy:
      // 1. Map all existing photos to a map by ID.
      // 2. Iterate newItems, update their order/index.
      // 3. Reconstruct photos array respecting new order for these items, keeping others stable?
      // actually, if we drag-drop in a filtered view, we only reorder relative to each other.

      // Simple approach: Replace the items in the main array that match these IDs with the new order.
      // But if we only see a subset, we can't trivially reorder the whole array without gaps.

      // Let's assume for MVP Refactor that SortableMediaGrid returns the reordered subset.
      // We take `photos`, separate out the ones NOT in `newItems`.
      // Then append `newItems` (reordered)? Or place them back?
      // Placing them back is hard if they were scattered.

      // Let's just update the `displayOrder` property and sort the whole list?
      // `SortableMediaGrid` usually returns the array in the visual order.
      // We should just update the `photos` array.

      // Map IDs from newItems
      const newOrderIds = newItems.map(i => i.id);

      // Filter output: items NOT in newItems + items IN newItems (sorted by newOrderIds)
      const others = photos.filter(p => !newOrderIds.includes(p.id));
      const reorderedSubset = newItems;

      // If we are reordering 'gallery', which might be split across tabs? No, tabs split by category.
      // If I reorder 'outdoors', I expect them to stay 'outdoors' but change order relative to each other.

      // Combine: others + reorderedSubset? This changes global order (e.g. 'general' media might now be after 'outdoors' media).
      // That's acceptable for a unified "photos" array.

      persistMedia([...others, ...reorderedSubset], undefined, undefined);
    } else if (firstItem.type === 'video') {
      // Videos usually valid
      const newOrderIds = newItems.map(i => i.id);
      const others = videos.filter(v => !newOrderIds.includes(v.id));
      persistMedia(undefined, [...others, ...newItems], undefined);
    }
  };

  const UploadSection = ({
    category,
    title,
    description,
    icon: Icon,
    isHero = false,
    acceptedTypes = 'image/*',
  }: {
    category: MediaItem['category'];
    title: string;
    description: string;
    icon: any;
    isHero?: boolean;
    acceptedTypes?: string;
  }) => {
    // Filter items for this view
    let items: MediaItem[] = [];
    if (isHero) {
      // Explicitly hero category ('hero' or 'featured')
      items = photos.filter(p => p.category === 'hero' || p.category === 'featured'); // Support both for now, ideally shift to 'hero'
      // But UI wants to show THE Hero image.
      // We derived `heroImage` above.
      // If we want to manage it, we show the derived one?
      // Or if specific category uploading:
      // previous code: `isHero ? [heroImage] : []`.
      // Let's match that.
      items = heroImage ? [heroImage] : [];
    } else if (category === 'videos') {
      items = videos;
    } else if (category === 'document') {
      items = documents;
    } else {
      // Gallery categories
      items = photos.filter(p => p.category === category);
    }

    const [isDragging, setIsDragging] = useState(false);

    const processFiles = async (files: File[]) => {
      // 1. Concurrent Uploads
      const uploadPromises = files.map(async file => {
        const loadingToast = toast.loading(`Uploading ${file.name}...`);
        const optimisticUrl = URL.createObjectURL(file);

        try {
          let type: MediaItem['type'] = 'image';
          if (file.type.startsWith('video')) type = 'video';
          if (file.type === 'application/pdf') type = 'pdf';

          const { url: uploadUrl, publicUrl } = await presignMutation.mutateAsync({
            filename: file.name,
            contentType: file.type,
          });

          await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          URL.revokeObjectURL(optimisticUrl);
          toast.dismiss(loadingToast);
          toast.success(`Uploaded ${file.name}`);

          return {
            id: `media-${Date.now()}-${Math.random()}`,
            url: publicUrl,
            type,
            category: isHero ? 'hero' : category, // Enforce 'hero' category on new uploads
            isPrimary: isHero,
            displayOrder: 0,
            fileName: file.name,
            uploadedAt: new Date(),
          } as MediaItem;
        } catch (error) {
          console.error('Upload failed:', error);
          toast.error(`Failed to upload ${file.name}`, { id: loadingToast });
          return null;
        }
      });

      // 2. Gather results
      const results = await Promise.all(uploadPromises);
      const newItems = results.filter((item): item is MediaItem => item !== null);

      if (newItems.length === 0) return;

      // 3. Batch Update & Dedupe
      const dedupe = (base: MediaItem[], added: MediaItem[]) => {
        const seen = new Set(base.map(i => i.url));
        return [...base, ...added.filter(i => !seen.has(i.url))];
      };

      const newImages = newItems.filter(i => i.type === 'image');
      const newVideos = newItems.filter(i => i.type === 'video');
      const newDocs = newItems.filter(i => i.type === 'pdf' || i.type === 'document');

      persistMedia(
        newImages.length > 0 ? dedupe(photos, newImages) : undefined,
        newVideos.length > 0 ? dedupe(videos, newVideos) : undefined,
        newDocs.length > 0 ? dedupe(documents, newDocs) : undefined,
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>

        {/* Dropzone */}
        {(items.length === 0 || !isHero) && (
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group min-h-[160px]',
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50',
            )}
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={async e => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files.length) await processFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={e => {
              const input = e.currentTarget.querySelector('input');
              input?.click();
            }}
          >
            <div className="mb-3 p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
              <Upload className={cn('w-5 h-5', isDragging ? 'text-blue-600' : 'text-slate-400')} />
            </div>
            <p className="text-sm font-medium text-slate-900">
              {isDragging
                ? 'Drop files here'
                : `Click to upload ${isHero ? 'Hero Image' : 'files'}`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {category === 'videos'
                ? 'MP4, WebM (Max 100MB)'
                : category === 'document'
                  ? 'PDF (Max 10MB)'
                  : 'JPG, PNG, WebP (Max 5MB)'}
            </p>
            <input
              type="file"
              className="hidden"
              multiple={!isHero}
              accept={acceptedTypes}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                if (e.target.files) processFiles(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* File List / Grid */}
        {items.length > 0 && (
          <>
            {category === 'document' ? (
              <div className="grid gap-4 grid-cols-1">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center p-3 gap-3"
                  >
                    <div className="p-2 bg-red-50 rounded text-red-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.fileName || 'Document'}
                      </p>
                      <p className="text-xs text-slate-500">PDF Document</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={e => {
                        e.stopPropagation();
                        handleRemoveMedia(item.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : isHero ? (
              <div className="grid gap-4 grid-cols-1">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-md transition-all aspect-video max-w-lg"
                  >
                    <img src={item.url} alt="Hero" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded-lg">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveMedia(item.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">
                        Primary Hero
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SortableMediaGrid
                media={items.map(
                  (item, idx) =>
                    ({
                      id: item.id,
                      url: item.url,
                      type: item.type === 'video' ? 'video' : item.type === 'pdf' ? 'pdf' : 'image',
                      category: item.category,
                      fileName: item.fileName,
                      isPrimary: item.isPrimary,
                      displayOrder: item.displayOrder ?? idx,
                    }) as GridMediaItem,
                )}
                onReorder={reordered => {
                  // Map back to MediaItem
                  const asMediaItems = reordered.map(
                    r =>
                      ({
                        id: r.id,
                        url: r.url,
                        type: r.type,
                        category: r.category,
                        isPrimary: r.isPrimary,
                        displayOrder: r.displayOrder,
                        fileName: r.fileName,
                      }) as unknown as MediaItem,
                  );
                  handleReorderMedia(asMediaItems);
                }}
                onRemove={handleRemoveMedia}
              />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Development Media</h2>
          <p className="text-slate-600">
            Visuals are critical for engagement. Start with a stunning hero image.
          </p>
        </div>

        <div className="w-full md:w-80 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span className="text-slate-700">Media Quality Score</span>
            <span className={cn(progressPercent >= 100 ? 'text-green-600' : 'text-blue-600')}>
              {Math.round(progressPercent)}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2 text-xs">
              {hasHero ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className={hasHero ? 'text-slate-600' : 'text-slate-400'}>
                Hero Image (Required)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {hasMinGallery ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className={hasMinGallery ? 'text-slate-600' : 'text-slate-400'}>
                Gallery Images ({galleryCount}/3+)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {hasDocuments ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className={hasDocuments ? 'text-slate-600' : 'text-slate-400'}>
                Brochure/Documents (Required)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Hero Section */}
        <Card>
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Hero Image
            </CardTitle>
            <CardDescription>
              The main face of your development. This appears at the top of your listing.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <UploadSection
              // Current hero finding logic: category='hero' or photos[0].
              // Let's pass 'hero' category to be explicit.
              category="hero"
              title="Hero Image"
              description="Upload a high-quality image that best represents your development."
              icon={Star}
              isHero={true}
            />
          </CardContent>
        </Card>

        {/* Gallery Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Media Gallery</h3>
            <TabsList className="bg-slate-100">
              <TabsTrigger value="gallery">Photos</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="docs">
                Documents
                {documents.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1">
                    {documents.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="gallery" className="mt-0 space-y-6">
            <Card>
              <CardContent className="pt-6 grid gap-8">
                <UploadSection
                  category="outdoors"
                  title="Exterior & Outdoors"
                  description="Facades, gardens, and landscaping."
                  icon={TreePine}
                />
                <UploadSection
                  category="general"
                  title="Interior & Living"
                  description="Living areas, bedrooms, and finishes."
                  icon={ImageIcon}
                />
                <UploadSection
                  category="amenities"
                  title="Amenities"
                  description="Pool, gym, and shared spaces."
                  icon={Dumbbell}
                />
                <UploadSection
                  category="photo"
                  title="Location & Views"
                  description="Neighborhood and scenic views."
                  icon={MapPin}
                />
                <UploadSection
                  category="render"
                  title="Aerial & Drone"
                  description="Site overview and scale."
                  icon={Layout}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos" className="mt-0 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <UploadSection
                  category="videos"
                  title="Videos & Virtual Tours"
                  description="Upload walkthroughs (MP4)."
                  icon={Video}
                  acceptedTypes="video/*"
                />
              </CardContent>
            </Card>

            {/* Video URL Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-500" />
                  Add Video Link
                </CardTitle>
                <CardDescription>Paste a YouTube or Vimeo URL to embed</CardDescription>
              </CardHeader>
              <CardContent>
                <VideoUrlInput
                  onAdd={url => {
                    const newItem: MediaItem = {
                      id: `video-${Date.now()}`,
                      url,
                      type: 'video',
                      category: 'videos',
                      isPrimary: false,
                      displayOrder: videos.length,
                      fileName: url.includes('youtube')
                        ? 'YouTube Video'
                        : url.includes('vimeo')
                          ? 'Vimeo Video'
                          : 'Video Link',
                    };
                    handleAddMedia(newItem);
                    toast.success('Video link added!');
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="mt-0">
            <Card>
              <CardContent className="pt-6">
                <UploadSection
                  category="document"
                  title="Brochures & Floor Plans"
                  description="Downloadable PDFs for buyers."
                  icon={FileText}
                  acceptedTypes="application/pdf"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
