import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { SortableMediaGrid } from '@/components/media/SortableMediaGrid';
import { UploadProgressList, UploadProgress } from '@/components/media/UploadProgressBar';
import { FileText, Images, Lightbulb, Map as MapIcon, Play, Upload, Video } from 'lucide-react';
import type { MediaFile } from '@/../../shared/listing-types';
import type { MediaItem } from '@/components/media/SortableMediaGrid';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getPrimaryListingImage } from '@/../../shared/listing-media';
import {
  PROPERTY_PRESENTATION_PLAN_LABELS,
  PROPERTY_PRESENTATION_PLAN_LABEL_TEXT,
  propertyPresentationSchema,
  safeParsePropertyPresentation,
} from '@/../../shared/property-presentation';

type PresentationUploadCategory = 'photos' | 'plans' | 'video' | 'documents' | 'tour';

const PRESENTATION_CATEGORIES: Array<{
  id: PresentationUploadCategory;
  label: string;
  description: string;
}> = [
  { id: 'photos', label: 'Photos', description: 'Gallery images and your hero photo' },
  { id: 'plans', label: 'Plans & layouts', description: 'Floor plans as images or PDFs' },
  { id: 'video', label: 'Video', description: 'A walkthrough or property video' },
  { id: 'tour', label: '3D tour', description: 'Matterport virtual tour link' },
  { id: 'documents', label: 'Documents', description: 'Public brochures and information sheets' },
];

const MediaUploadStep: React.FC = () => {
  const store = useListingWizardStore();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PresentationUploadCategory>('photos');
  const [planLabel, setPlanLabel] =
    useState<(typeof PROPERTY_PRESENTATION_PLAN_LABELS)[number]>('other');
  const [tourUrl, setTourUrl] = useState('');
  const [tourLabel, setTourLabel] = useState('3D virtual tour');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TRPC mutation for media upload
  const uploadMediaMutation = trpc.listing.uploadMedia.useMutation();
  const confirmMediaUploadMutation = trpc.listing.confirmMediaUpload.useMutation();

  const savedPresentation = useMemo(
    () => safeParsePropertyPresentation(store.propertyDetails?.propertyPresentation).data,
    [store.propertyDetails?.propertyPresentation],
  );

  useEffect(() => {
    if (savedPresentation?.virtualTour?.sourceUrl) {
      setTourUrl(savedPresentation.virtualTour.sourceUrl);
      setTourLabel(savedPresentation.virtualTour.displayLabel || '3D virtual tour');
    }
  }, [savedPresentation]);

  // Handle file upload
  const handleUpload = useCallback(
    async (
      files: File[],
      category: PresentationUploadCategory,
      selectedPlanLabel?: (typeof PROPERTY_PRESENTATION_PLAN_LABELS)[number],
    ) => {
      if (!files || files.length === 0) return;
      const existingCount = store.media.length;

      // Create upload progress entries
      const newUploads: UploadProgress[] = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        fileName: file.name,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploads(prev => [...prev, ...newUploads]);

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadId = newUploads[i].id;
        const startTime = Date.now();

        try {
          // Determine media type
          const isImage = file.type.startsWith('image/');
          const isPdf = file.type === 'application/pdf';
          const mediaType =
            category === 'plans'
              ? 'floorplan'
              : category === 'documents'
                ? 'pdf'
                : isPdf
                  ? 'pdf'
                  : isImage
                    ? 'image'
                    : 'video';

          // Update progress: requesting upload URL
          setUploads(prev => prev.map(u => (u.id === uploadId ? { ...u, progress: 10 } : u)));

          // Request presigned URL from server
          const uploadData = await uploadMediaMutation.mutateAsync({
            type: mediaType,
            filename: file.name,
            contentType: file.type,
          });

          // Update progress: uploading to S3
          setUploads(prev => prev.map(u => (u.id === uploadId ? { ...u, progress: 20 } : u)));

          // Upload file to S3 with progress tracking
          const xhr = new XMLHttpRequest();

          await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener('progress', e => {
              if (e.lengthComputable) {
                const percentComplete = 20 + (e.loaded / e.total) * 70; // 20-90%
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = e.loaded / elapsed;
                const remaining = (e.total - e.loaded) / speed;

                setUploads(prev =>
                  prev.map(u =>
                    u.id === uploadId
                      ? {
                          ...u,
                          progress: Math.round(percentComplete),
                          speed,
                          timeRemaining: remaining,
                        }
                      : u,
                  ),
                );
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => reject(new Error('Network error')));
            xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

            xhr.open('PUT', uploadData.uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
          });

          // A successful browser PUT is not yet listing authority. The server
          // verifies the object and returns a confirmation token bound to this
          // user/upload before the item enters wizard state.
          const confirmation = await confirmMediaUploadMutation.mutateAsync({
            uploadToken: uploadData.uploadToken,
          });

          // Update progress: finalizing
          setUploads(prev => prev.map(u => (u.id === uploadId ? { ...u, progress: 95 } : u)));

          // Create media file object
          const mediaFile: MediaFile = {
            id: uploadData.mediaId,
            url: uploadData.publicUrl,
            type: mediaType,
            uploadToken: confirmation.uploadToken,
            fileName: file.name,
            fileSize: confirmation.fileSize ?? file.size,
            displayOrder: existingCount + i,
            isPrimary:
              mediaType === 'image' &&
              getPrimaryListingImage(useListingWizardStore.getState().media as any[]) === null,
            processingStatus: 'completed',
            presentationLabel:
              category === 'plans'
                ? PROPERTY_PRESENTATION_PLAN_LABEL_TEXT[selectedPlanLabel || 'other']
                : category === 'documents'
                  ? file.name.replace(/\.[^.]+$/, '')
                  : undefined,
          };

          // Add to store
          store.addMedia(mediaFile);

          // Mark as completed
          setUploads(prev =>
            prev.map(u =>
              u.id === uploadId ? { ...u, progress: 100, status: 'completed' as const } : u,
            ),
          );
        } catch (error: any) {
          console.error('Upload error:', error);
          setUploads(prev =>
            prev.map(u =>
              u.id === uploadId
                ? { ...u, status: 'error' as const, error: error.message || 'Upload failed' }
                : u,
            ),
          );
        }
      }
    },
    [store, uploadMediaMutation, confirmMediaUploadMutation],
  );

  const MAX_FILES = 30;
  const MAX_IMAGE_MB = 15;
  const MAX_VIDEO_MB = 80;

  const validateAndUpload = useCallback(
    (files: File[], category: PresentationUploadCategory = activeCategory) => {
      if (category === 'tour') return;
      if (!files.length) return;

      const remainingSlots = Math.max(0, MAX_FILES - store.media.length);
      if (remainingSlots === 0) {
        toast.error(`Maximum of ${MAX_FILES} files reached.`);
        return;
      }

      const limitedFiles = files.slice(0, remainingSlots);
      const rejected = files.length - limitedFiles.length;
      if (rejected > 0) {
        toast.info(`Only ${remainingSlots} file(s) accepted. ${rejected} were skipped.`);
      }

      const validFiles = limitedFiles.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isPdf = file.type === 'application/pdf';
        const allowed =
          category === 'photos'
            ? isImage
            : category === 'plans'
              ? isImage || isPdf
              : category === 'video'
                ? isVideo
                : isPdf;
        if (!allowed) {
          toast.error(`Unsupported media type: ${file.name}`);
          return false;
        }

        const sizeMb = file.size / (1024 * 1024);
        const sizeLimit = isVideo
          ? MAX_VIDEO_MB
          : category === 'plans' || category === 'documents'
            ? 25
            : MAX_IMAGE_MB;
        if (sizeMb > sizeLimit) {
          toast.error(`${file.name} exceeds ${sizeLimit}MB limit.`);
          return false;
        }

        return true;
      });

      if (!validFiles.length) return;
      void handleUpload(validFiles, category, category === 'plans' ? planLabel : undefined);
    },
    [activeCategory, handleUpload, planLabel, store.media.length],
  );

  const openFileDialog = useCallback(() => {
    if (uploads.some(u => u.status === 'uploading')) return;
    fileInputRef.current?.click();
  }, [uploads]);

  const saveVirtualTour = useCallback(() => {
    const normalizedUrl = tourUrl.trim();
    if (!normalizedUrl) {
      const current = savedPresentation;
      if (current?.media.length) {
        store.updatePropertyDetail('propertyPresentation', { media: current.media });
      } else {
        store.updatePropertyDetail('propertyPresentation', undefined as any);
      }
      toast.success('3D tour removed from this presentation.');
      return;
    }

    const result = propertyPresentationSchema.safeParse({
      media: savedPresentation?.media || [],
      virtualTour: {
        provider: 'matterport',
        sourceUrl: normalizedUrl,
        displayLabel: tourLabel.trim() || '3D virtual tour',
        status: 'active',
      },
    });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Enter an approved Matterport URL.');
      return;
    }

    store.updatePropertyDetail('propertyPresentation', result.data as any);
    toast.success('3D tour added to the property presentation.');
  }, [savedPresentation, store, toast, tourLabel, tourUrl]);

  const onDropZoneDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (uploads.some(u => u.status === 'uploading')) return;
      validateAndUpload(Array.from(e.dataTransfer.files || []), activeCategory);
    },
    [activeCategory, uploads, validateAndUpload],
  );

  // Convert store media to MediaItem format
  const getMediaKey = useCallback(
    (media: MediaFile, index: number) =>
      String(media.id ?? media.url ?? `${media.fileName || 'media'}-${index}`),
    [],
  );

  const mediaItems: MediaItem[] = store.media.map((media, index) => ({
    id: getMediaKey(media, index),
    url: media.url,
    type: media.type as 'image' | 'video' | 'floorplan' | 'pdf',
    fileName: media.fileName,
    isPrimary: media.isPrimary,
    presentationLabel: media.presentationLabel,
    displayOrder: media.displayOrder,
  }));

  // Handle media reorder - bulk replace all media with new order
  const handleReorder = useCallback(
    (reorderedMedia: MediaItem[]) => {
      const sourceMap = new globalThis.Map(
        store.media.map((media, index) => [getMediaKey(media, index), media] as const),
      );
      const updatedMedia = reorderedMedia
        .map((item, index) => {
          const original = sourceMap.get(item.id);
          return original ? { ...original, displayOrder: index } : null;
        })
        .filter(Boolean) as MediaFile[];

      if (updatedMedia.length > 0) {
        store.setMedia(updatedMedia);
      }
    },
    [getMediaKey, store],
  );

  // Handle media remove
  const handleRemove = useCallback(
    (id: string) => {
      const index = store.media.findIndex((m, idx) => getMediaKey(m, idx) === id);
      if (index !== -1) {
        store.removeMedia(index);
      }
    },
    [getMediaKey, store],
  );

  // Handle set as primary
  const handleSetPrimary = useCallback(
    (id: string) => {
      const selected = store.media.find((m, idx) => getMediaKey(m, idx) === id);
      if (selected?.id) {
        store.setMainMedia(String(selected.id));
        return;
      }
      const updated = store.media.map((m, idx) => ({
        ...m,
        isPrimary: getMediaKey(m, idx) === id,
      }));
      store.setMedia(updated);
    },
    [getMediaKey, store],
  );

  // Handle upload cancel
  const handleCancelUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  // Handle upload retry
  const handleRetryUpload = useCallback((id: string) => {
    // Remove failed upload from list
    setUploads(prev => prev.filter(u => u.id !== id));
    // In a real implementation, you would retry the upload here
  }, []);

  // Handle upload remove
  const handleRemoveUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="mb-2 text-xl font-semibold text-slate-950">Showcase the property</h3>
          <p className="text-gray-600">
            Help prospects understand the property with photos, plans, video and immersive tours.
          </p>
        </div>

        {/* Compact semantic presentation navigation. Photos remain the default, while each
            category writes to the same canonical listing media collection. */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-2 sm:grid-cols-5">
          {PRESENTATION_CATEGORIES.map(category => {
            const Icon =
              category.id === 'photos'
                ? Images
                : category.id === 'plans'
                  ? MapIcon
                  : category.id === 'video'
                    ? Video
                    : category.id === 'tour'
                      ? Play
                      : FileText;
            return (
              <button
                key={category.id}
                type="button"
                className={cn(
                  'rounded-lg px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  activeCategory === category.id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-white/70',
                )}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" />
                  {category.label}
                </span>
                <span className="mt-1 hidden text-[11px] leading-tight text-slate-500 sm:block">
                  {category.description}
                </span>
              </button>
            );
          })}
        </div>

        {activeCategory === 'tour' ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-start gap-3">
              <MapIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <h4 className="font-semibold text-slate-900">Add a 3D virtual tour</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Add a Matterport share URL. Property Listify derives the safe public launch URL;
                  arbitrary embed HTML is not accepted.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.5fr)_auto] sm:items-end">
              <label className="block text-sm font-medium text-slate-700">
                Matterport URL
                <input
                  value={tourUrl}
                  onChange={event => setTourUrl(event.target.value)}
                  placeholder="https://my.matterport.com/show/?m=..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  inputMode="url"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Label
                <input
                  value={tourLabel}
                  onChange={event => setTourLabel(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  maxLength={120}
                />
              </label>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={saveVirtualTour}
              >
                Save tour
              </button>
            </div>
            {savedPresentation?.virtualTour && (
              <p className="mt-3 text-xs font-medium text-emerald-700">
                Matterport tour is ready for public presentation after approval.
              </p>
            )}
          </div>
        ) : (
          <>
            {activeCategory === 'plans' && (
              <label className="block max-w-sm text-sm font-medium text-slate-700">
                Plan label
                <select
                  value={planLabel}
                  onChange={event => setPlanLabel(event.target.value as typeof planLabel)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {PROPERTY_PRESENTATION_PLAN_LABELS.map(label => (
                    <option key={label} value={label}>
                      {PROPERTY_PRESENTATION_PLAN_LABEL_TEXT[label]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Upload Zone */}
            <div
              className={cn(
                'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all',
                isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:bg-slate-50',
                uploads.some(u => u.status === 'uploading') &&
                  'cursor-not-allowed opacity-60 hover:bg-transparent',
              )}
              onClick={openFileDialog}
              onDragOver={e => {
                e.preventDefault();
                e.stopPropagation();
                if (!uploads.some(u => u.status === 'uploading')) setIsDragOver(true);
              }}
              onDragLeave={e => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget === e.target) setIsDragOver(false);
              }}
              onDrop={onDropZoneDrop}
            >
              <Upload
                className={cn(
                  'mx-auto mb-3 h-10 w-10 transition-colors',
                  isDragOver ? 'text-blue-600' : 'text-slate-400',
                )}
              />
              <p className="text-base font-medium text-slate-800">
                {isDragOver
                  ? 'Drop files here'
                  : `Add ${PRESENTATION_CATEGORIES.find(item => item.id === activeCategory)?.label.toLowerCase()}`}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {activeCategory === 'photos'
                  ? `Images up to ${MAX_IMAGE_MB}MB each`
                  : activeCategory === 'plans'
                    ? 'PNG, JPG or PDF up to 25MB each'
                    : activeCategory === 'video'
                      ? `Video up to ${MAX_VIDEO_MB}MB`
                      : 'Public PDF documents up to 25MB each'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {store.media.length} presentation assets added
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept={
                  activeCategory === 'photos'
                    ? 'image/*'
                    : activeCategory === 'plans'
                      ? 'image/*,application/pdf'
                      : activeCategory === 'video'
                        ? 'video/*'
                        : 'application/pdf'
                }
                onChange={e => {
                  validateAndUpload(Array.from(e.target.files || []), activeCategory);
                  e.currentTarget.value = '';
                }}
              />
            </div>
          </>
        )}

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <UploadProgressList
            uploads={uploads}
            onCancel={handleCancelUpload}
            onRetry={handleRetryUpload}
            onRemove={handleRemoveUpload}
          />
        )}

        {/* Uploaded Media Grid */}
        {store.media.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Uploaded Media ({store.media.length})</h4>
              <p className="text-sm text-gray-500">Drag to reorder • Click star to set primary</p>
            </div>

            <SortableMediaGrid
              media={mediaItems}
              onReorder={handleReorder}
              onRemove={handleRemove}
              onSetPrimary={handleSetPrimary}
            />
          </div>
        )}

        {/* Upload Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Upload Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use high-quality photos with good lighting</li>
                <li>• Include wide shots and detailed close-ups</li>
                <li>• Show all rooms and key features</li>
                <li>• Keep videos under 60 seconds</li>
                <li>• First uploaded image becomes the primary image</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MediaUploadStep;
