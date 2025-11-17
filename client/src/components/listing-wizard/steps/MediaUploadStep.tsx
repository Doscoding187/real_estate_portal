/**
 * Step 6: Media Upload with Validation
 * Implements image/video upload with FFmpeg processing
 */

import React, { useState, useCallback, useRef } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Video, FileText, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MediaFile as ListingMediaFile } from '@/../../shared/listing-types';

const MediaUploadStep: React.FC = () => {
  const { media, addMedia, removeMedia, setMainMedia } = useListingWizardStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note: In a real implementation, this would call the actual trpc endpoint
  // For now, we're using a mock implementation
  // const presignMutation = trpc.listing.uploadMedia.useMutation();

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
  const validateFile = (
    file: File,
  ): { isValid: boolean; error?: string; type?: ListingMediaFile['type'] } => {
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
  };

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
  const uploadFile = async (mediaFile: any): Promise<any> => {
    try {
      // For now, we'll just add the media to the store without actual upload
      // In a real implementation, this would upload to S3/Cloud storage

      const newMediaItem = {
        id: Date.now(),
        url: mediaFile.preview,
        type: mediaFile.type,
        fileName: mediaFile.name,
        fileSize: mediaFile.size,
        displayOrder: media.length,
        isPrimary: media.length === 0, // First media is primary by default
        processingStatus: 'completed',
      };

      addMedia(newMediaItem);

      return newMediaItem;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      throw err;
    }
  };

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

        // Create media file object
        const mediaFile: any = {
          file,
          preview: URL.createObjectURL(file),
          id: `${Date.now()}-${i}`,
          type: validation.type!,
          name: file.name,
          size: file.size,
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
    [media, mediaCounts],
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

  return (
    <Card className="p-6 space-y-6">
      <h3 className="text-lg font-semibold">Upload Media</h3>

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

      {/* Upload Area */}
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
        <p className="text-gray-600 mb-4">Drag and drop files here, or click to browse</p>
        <Button type="button">Select Files</Button>
        <p className="text-xs text-gray-500 mt-2">Supported: JPG, PNG, WebP, MP4, MOV, PDF</p>
      </div>

      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map((item: ListingMediaFile, index: number) => (
            <div
              key={item.id || index}
              className="relative group rounded-lg border bg-card overflow-hidden aspect-square"
            >
              {/* Media Preview */}
              {item.type === 'image' && item.url && (
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}

              {item.type === 'video' && (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Video className="h-8 w-8 text-gray-400" />
                  {item.duration && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1 rounded">
                      {Math.floor(item.duration / 60)}:
                      {String(Math.floor(item.duration % 60)).padStart(2, '0')}
                    </span>
                  )}
                </div>
              )}

              {item.type === 'floorplan' && (
                <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              )}

              {item.type === 'pdf' && (
                <div className="w-full h-full bg-red-50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-red-500" />
                </div>
              )}

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
              {!item.isPrimary && (
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
