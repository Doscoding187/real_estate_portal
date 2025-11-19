/**
 * Step 6: Media Upload with Validation
 * Implements image/video upload with FFmpeg processing
 */

import React, { useState, useCallback, useRef } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Video, FileText, AlertCircle, Play } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaFile as ListingMediaFile } from '@/../../shared/listing-types';

const MediaUploadStep: React.FC = () => {
  const store: any = useListingWizardStore();
  const media = store.media || [];
  const addMedia = store.addMedia;
  const removeMedia = store.removeMedia;
  const setMainMedia = store.setMainMedia;
  const displayMediaType = store.displayMediaType || 'image';
  const setDisplayMediaType = store.setDisplayMediaType;

  // Get primary media based on selected display type
  const primaryMedia = media.find(
    (m: ListingMediaFile) => m.isPrimary && m.type === displayMediaType,
  );

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note: In a real implementation, this would call the actual trpc endpoint
  // For now, we're using a mock implementation
  const presignMutation = trpc.listing.uploadMedia.useMutation();

  // Media limits from shared types
  const MEDIA_LIMITS = {
    maxImages: 30,
    maxVideos: 5,
    maxFloorplans: 5,
    maxPdfs: 3,
    maxImageSizeMB: 5,
    maxVideoSizeMB: 50,
    maxVideoDurationSeconds: 180,
  };

  // Count media by type
  const mediaCounts = {
    images: media.filter((m: ListingMediaFile) => m.type === 'image').length,
    videos: media.filter((m: ListingMediaFile) => m.type === 'video').length,
    floorplans: media.filter((m: ListingMediaFile) => m.type === 'floorplan').length,
    pdfs: media.filter((m: ListingMediaFile) => m.type === 'pdf').length,
  };

  // Validate file
  const validateFile = useCallback(
    (file: File): { isValid: boolean; error?: string; type?: ListingMediaFile['type'] } => {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const fileSizeMB = file.size / (1024 * 1024);

      // Determine media type
      let mediaType: ListingMediaFile['type'] | undefined;

      if (fileType.startsWith('image/')) {
        mediaType = 'image';
        if (mediaCounts.images >= MEDIA_LIMITS.maxImages) {
          return { isValid: false, error: `Maximum ${MEDIA_LIMITS.maxImages} images allowed` };
        }
        if (fileSizeMB > MEDIA_LIMITS.maxImageSizeMB) {
          return {
            isValid: false,
            error: `Image size exceeds ${MEDIA_LIMITS.maxImageSizeMB}MB limit`,
          };
        }
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(fileType)) {
          return { isValid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
        }
      } else if (fileType.startsWith('video/')) {
        mediaType = 'video';
        if (mediaCounts.videos >= MEDIA_LIMITS.maxVideos) {
          return { isValid: false, error: `Maximum ${MEDIA_LIMITS.maxVideos} videos allowed` };
        }
        if (fileSizeMB > MEDIA_LIMITS.maxVideoSizeMB) {
          return {
            isValid: false,
            error: `Video size exceeds ${MEDIA_LIMITS.maxVideoSizeMB}MB limit`,
          };
        }
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // Check if it's a floorplan or document
        if (fileName.includes('floor') || fileName.includes('plan')) {
          mediaType = 'floorplan';
          if (mediaCounts.floorplans >= MEDIA_LIMITS.maxFloorplans) {
            return {
              isValid: false,
              error: `Maximum ${MEDIA_LIMITS.maxFloorplans} floorplans allowed`,
            };
          }
        } else {
          mediaType = 'pdf';
          if (mediaCounts.pdfs >= MEDIA_LIMITS.maxPdfs) {
            return { isValid: false, error: `Maximum ${MEDIA_LIMITS.maxPdfs} documents allowed` };
          }
        }
        if (fileSizeMB > 10) {
          return { isValid: false, error: 'PDF size exceeds 10MB limit' };
        }
      } else {
        return {
          isValid: false,
          error: 'Unsupported file type. Please upload images, videos, or PDFs.',
        };
      }

      return { isValid: true, type: mediaType };
    },
    [mediaCounts],
  );

  // Get video metadata
  const getVideoMetadata = (
    file: File,
  ): Promise<{
    duration: number;
    width: number;
    height: number;
    orientation: 'vertical' | 'horizontal' | 'square';
  }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;
        let orientation: 'vertical' | 'horizontal' | 'square' = 'square';

        if (width > height) {
          orientation = 'horizontal';
        } else if (height > width) {
          orientation = 'vertical';
        }

        // Clean up
        URL.revokeObjectURL(video.src);
        resolve({ duration, width, height, orientation });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Upload file
  const uploadFile = useCallback(
    async (mediaFile: any): Promise<any> => {
      try {
        // Get presigned URL from backend
        const uploadResponse = await presignMutation.mutateAsync({
          type: mediaFile.type,
          filename: mediaFile.name,
          contentType: mediaFile.file.type,
          // listingId will be added when the listing is actually created
        } as any); // Type assertion to bypass potential TypeScript error

        // Upload file directly to S3 using the presigned URL
        const uploadResult = await fetch(uploadResponse.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mediaFile.file.type,
          },
          body: mediaFile.file,
        });

        if (!uploadResult.ok) {
          throw new Error('Failed to upload file to S3');
        }

        // Check if this should be the primary media
        const shouldSetAsPrimary =
          media.length === 0 || // First media item
          (!store.mainMediaId && mediaFile.type === displayMediaType); // No main media set yet and matches display type

        const newMediaItem = {
          id: uploadResponse.mediaId, // Use the S3 key as ID
          url: uploadResponse.publicUrl || uploadResponse.uploadUrl, // Use public CDN URL
          type: mediaFile.type,
          fileName: mediaFile.name,
          fileSize: mediaFile.size,
          displayOrder: media.length,
          isPrimary: shouldSetAsPrimary,
          processingStatus: 'completed',
          // Store the file data as base64 for persistence
          fileData: mediaFile.fileData, // This will be added during file processing
        };

        addMedia(newMediaItem);

        // If this should be the primary media, set it as main
        if (shouldSetAsPrimary) {
          setMainMedia(newMediaItem.id);
        }

        return newMediaItem;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';
        throw err;
      }
    },
    [
      media.length,
      addMedia,
      displayMediaType,
      media,
      setMainMedia,
      store.mainMediaId,
      presignMutation,
    ],
  );

  // Handle files
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      const newMediaFiles: any[] = [];

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validation = validateFile(file);

        if (!validation.isValid) {
          setError(validation.error || 'File validation failed');
          continue;
        }

        // Convert file to base64 for persistence
        const fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Create media file object
        const mediaFile: any = {
          file,
          preview: URL.createObjectURL(file),
          id: `${Date.now()}-${i}`,
          type: validation.type!,
          name: file.name,
          size: file.size,
          fileData, // Store base64 data for persistence
        };

        // For videos, get metadata
        if (mediaFile.type === 'video') {
          try {
            const metadata = await getVideoMetadata(file);
            mediaFile.duration = metadata.duration;
            mediaFile.width = metadata.width;
            mediaFile.height = metadata.height;
            mediaFile.orientation = metadata.orientation;

            // Validate video duration
            if (metadata.duration > MEDIA_LIMITS.maxVideoDurationSeconds) {
              setError(
                `Video duration exceeds ${MEDIA_LIMITS.maxVideoDurationSeconds} seconds limit`,
              );
              URL.revokeObjectURL(mediaFile.preview);
              continue;
            }

            // Validate video orientation (require vertical for real estate)
            if (metadata.orientation !== 'vertical') {
              setError('Only vertical videos are allowed for real estate listings');
              URL.revokeObjectURL(mediaFile.preview);
              continue;
            }
          } catch (err) {
            console.error('Video metadata error:', err);
            setError('Failed to process video file');
            URL.revokeObjectURL(mediaFile.preview);
            continue;
          }
        }

        newMediaFiles.push(mediaFile);
      }

      if (newMediaFiles.length === 0) return;

      // Upload each file
      for (const mediaFile of newMediaFiles) {
        try {
          await uploadFile(mediaFile);
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
    },
    [validateFile, uploadFile],
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  // Remove media
  const removeMediaFile = (id: string) => {
    const mediaItem = media.find((m: ListingMediaFile) => m.id?.toString() === id);
    if (mediaItem) {
      removeMedia(media.indexOf(mediaItem));
    }
  };

  // Set as primary media
  const setAsPrimary = (id: string) => {
    const mediaItem = media.find((m: ListingMediaFile) => m.id?.toString() === id);
    if (mediaItem) {
      setMainMedia(mediaItem.id!);
    }
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Helper function to render media preview
  const renderMediaPreview = (item: ListingMediaFile) => {
    // Check if we have fileData that can be used to reconstruct the image
    if (item.type === 'image' && (item.url || item.fileData)) {
      const imageUrl = item.url || item.fileData;
      return (
        <div className="aspect-video bg-gray-100 flex items-center justify-center">
          <img src={imageUrl} alt="Primary media" className="w-full h-full object-cover" />
        </div>
      );
    }

    if (item.type === 'video') {
      return (
        <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
          <Video className="h-12 w-12 text-white" />
          {item.duration && (
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
              {Math.floor(item.duration / 60)}:
              {String(Math.floor(item.duration % 60)).padStart(2, '0')}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button variant="secondary" size="icon" className="bg-black/50 hover:bg-black/70">
              <Play className="h-6 w-6 text-white" />
            </Button>
          </div>
        </div>
      );
    }

    if (item.type === 'floorplan') {
      return (
        <div className="aspect-video bg-blue-50 flex items-center justify-center">
          <FileText className="h-12 w-12 text-blue-500" />
        </div>
      );
    }

    if (item.type === 'pdf') {
      return (
        <div className="aspect-video bg-red-50 flex items-center justify-center">
          <FileText className="h-12 w-12 text-red-500" />
        </div>
      );
    }

    return (
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        <FileText className="h-12 w-12 text-gray-400" />
      </div>
    );
  };

  // Helper function to render media thumbnails
  const renderMediaThumbnail = (item: ListingMediaFile) => {
    // Check if we have fileData that can be used to reconstruct the image
    if (item.type === 'image' && (item.url || item.fileData)) {
      const imageUrl = item.url || item.fileData;
      return <img src={imageUrl} alt={`Media ${item.id}`} className="w-full h-full object-cover" />;
    }

    if (item.type === 'video') {
      return (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <Video className="h-6 w-6 text-white" />
          {item.duration && (
            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
              {Math.floor(item.duration / 60)}:
              {String(Math.floor(item.duration % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
      );
    }

    if (item.type === 'floorplan') {
      return (
        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
          <FileText className="h-6 w-6 text-blue-500" />
        </div>
      );
    }

    if (item.type === 'pdf') {
      return (
        <div className="w-full h-full bg-red-100 flex items-center justify-center">
          <FileText className="h-6 w-6 text-red-500" />
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <FileText className="h-6 w-6 text-gray-400" />
      </div>
    );
  };

  return (
    <Card className="p-6 space-y-6">
      <h3 className="text-lg font-semibold">Upload Media</h3>

      {/* Display Media Type Selection - Always show this first */}
      <div className="space-y-4">
        <h4 className="font-medium">Select Primary Display Media Type</h4>
        <RadioGroup
          value={displayMediaType}
          onValueChange={setDisplayMediaType}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="image" id="image" />
            <Label htmlFor="image" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Image
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="video" id="video" />
            <Label htmlFor="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Upload Limits Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📸 Media Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Images: Up to 30 (max 5MB each, JPG/PNG/WebP)</li>
          <li>• Videos: Up to 5 (max 50MB, 3 min duration, VERTICAL ONLY)</li>
          <li>• Floorplans: Up to 5 (PDF or Image)</li>
          <li>• Documents: Up to 3 PDFs</li>
        </ul>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Primary Media Upload Box */}
      <div className="space-y-4">
        <h4 className="font-medium">
          Upload Primary {displayMediaType === 'image' ? 'Image' : 'Video'}
        </h4>
        {/* Upload Area for Primary Media */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={displayMediaType === 'image' ? 'image/*' : 'video/*'}
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            Drag and drop your primary {displayMediaType} here, or click to browse
          </p>
          <Button type="button">
            Select Primary {displayMediaType === 'image' ? 'Image' : 'Video'}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Supported: {displayMediaType === 'image' ? 'JPG, PNG, WebP' : 'MP4, MOV'}
          </p>
        </div>
      </div>

      {/* Primary Media Preview */}
      {primaryMedia && (
        <div className="space-y-4">
          <h4 className="font-medium">Primary Display Media</h4>
          <div className="border rounded-lg overflow-hidden">
            {renderMediaPreview(primaryMedia)}
            <div className="p-3 bg-gray-50 flex justify-between items-center">
              <span className="text-sm font-medium text-primary">Primary Media</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  removeMediaFile(
                    primaryMedia.id?.toString() || media.indexOf(primaryMedia).toString(),
                  );
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Media Upload Box */}
      <div className="space-y-4">
        <h4 className="font-medium">Upload Additional Media</h4>
        {/* Upload Area for Gallery Media */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFilePicker}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            Drag and drop additional media here, or click to browse
          </p>
          <Button type="button">Select Additional Media</Button>
          <p className="text-xs text-gray-500 mt-2">Supported: JPG, PNG, WebP, MP4, MOV, PDF</p>
        </div>
      </div>

      {/* Gallery Preview */}
      {media.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">
            Gallery Media ({media.length - (primaryMedia ? 1 : 0)} items)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {media
              .filter((m: ListingMediaFile) => !m.isPrimary || m.type !== displayMediaType)
              .map((item: ListingMediaFile, index: number) => (
                <div
                  key={item.id || index}
                  className="relative group rounded-lg border bg-card overflow-hidden aspect-square"
                >
                  {/* Media Preview */}
                  {renderMediaThumbnail(item)}

                  {/* Primary Badge */}
                  {item.isPrimary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                      Primary
                    </div>
                  )}

                  {/* Media Type Badge */}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs font-medium px-1.5 py-0.5 rounded capitalize">
                    {item.type}
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={e => {
                      e.stopPropagation();
                      removeMediaFile(item.id?.toString() || index.toString());
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </Button>

                  {/* Set as Primary Button */}
                  {!item.isPrimary && item.type === displayMediaType && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        setAsPrimary(item.id?.toString() || index.toString());
                      }}
                      className="absolute bottom-2 left-2 text-xs h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set Primary
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {media.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No media uploaded yet</p>
        </div>
      )}
    </Card>
  );
};

export default MediaUploadStep;
