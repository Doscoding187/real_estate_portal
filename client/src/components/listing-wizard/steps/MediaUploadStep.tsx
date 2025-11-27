import React, { useState, useCallback } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { Upload, Video, GripVertical } from 'lucide-react';
import type { MediaFile } from '@/../../shared/listing-types';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { SortableMediaItem } from './SortableMediaItem';

const MediaUploadStep: React.FC = () => {
  const store = useListingWizardStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingPrimary, setIsDraggingPrimary] = useState(false);
  const [isDraggingAdditional, setIsDraggingAdditional] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // TRPC mutation for media upload
  const uploadMediaMutation = trpc.listing.uploadMedia.useMutation();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4, // Require 4px movement before drag starts
      },
    })
  );

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null, isPrimary: boolean = false) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const newMediaFiles: MediaFile[] = [];
      
      // Process each selected file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const isValidImage = file.type.startsWith('image/');
        const isValidVideo = file.type.startsWith('video/');
        
        if (!isValidImage && !isValidVideo) {
          setUploadError('Please select only image or video files');
          continue;
        }
        
        // Validate file size (5MB for images, 50MB for videos)
        const maxSize = isValidImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
          setUploadError(`File ${file.name} is too large. Max size: ${isValidImage ? '5MB' : '50MB'}`);
          continue;
        }
        
        // Determine media type
        const mediaType = isValidImage ? 'image' : 'video';
        
        // Request presigned URL from server
        const uploadData = await uploadMediaMutation.mutateAsync({
          type: mediaType,
          filename: file.name,
          contentType: file.type,
        });
        
        // Upload file directly to S3
        const response = await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        // Create media file object
        const mediaFile: MediaFile = {
          id: uploadData.mediaId,
          url: uploadData.publicUrl,
          type: mediaType,
          fileName: file.name,
          fileSize: file.size,
          displayOrder: store.media.length + newMediaFiles.length,
          isPrimary: isPrimary && newMediaFiles.length === 0,
          processingStatus: 'completed',
        };
        
        newMediaFiles.push(mediaFile);
      }
      
      // Add uploaded media to store
      newMediaFiles.forEach(media => {
        store.addMedia(media);
      });
      
      // Set first uploaded file as main media if none is set
      if (newMediaFiles.length > 0 && !store.mainMediaId) {
        store.setMainMedia(newMediaFiles[0].id! as any);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  }, [store, uploadMediaMutation]);

  // Remove media
  const handleRemoveMedia = (index: number) => {
    store.removeMedia(index);
  };

  // Set as main media
  const handleSetMainMedia = (mediaId: string) => {
    store.setMainMedia(mediaId as any);
  };

  // Handle primary file input change
  const handlePrimaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files, true);
    e.target.value = '';
  };

  // Handle additional files input change
  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    e.target.value = '';
  };

  // Get display media type
  const displayMediaType = store.displayMediaType || 'image';

  // Drag and drop handlers for file upload
  const handlePrimaryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPrimary(true);
  };

  const handlePrimaryDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPrimary(false);
  };

  const handlePrimaryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPrimary(false);
    handleFileSelect(e.dataTransfer.files, true);
  };

  const handleAdditionalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAdditional(true);
  };

  const handleAdditionalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAdditional(false);
  };

  const handleAdditionalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAdditional(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // @dnd-kit handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = store.media.findIndex((item, index) => (item.id || String(index)) === active.id);
      const newIndex = store.media.findIndex((item, index) => (item.id || String(index)) === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        store.reorderMedia(oldIndex, newIndex);
      }
    }

    setActiveId(null);
  };

  // Get active media item for drag overlay
  const activeMedia = activeId 
    ? store.media.find((item, index) => (item.id || String(index)) === activeId) 
    : null;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload Media</h3>
          <p className="text-gray-600">
            Add photos and videos to showcase your property. High-quality images help attract more potential buyers.
          </p>
        </div>

        {/* Primary Media Upload */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Primary {displayMediaType === 'image' ? 'Image' : 'Video'}
          </Label>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDraggingPrimary 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handlePrimaryDragOver}
            onDragLeave={handlePrimaryDragLeave}
            onDrop={handlePrimaryDrop}
          >
            <Input
              type="file"
              accept={displayMediaType === 'image' ? 'image/*' : 'video/*'}
              onChange={handlePrimaryFileChange}
              className="hidden"
              id="primary-media"
              multiple
            />
            <Label 
              htmlFor="primary-media" 
              className="cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="font-medium">
                  {isDraggingPrimary ? 'Drop files here' : `Click to upload or drag ${displayMediaType === 'image' ? 'images' : 'videos'}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported: {displayMediaType === 'image' ? 'JPG, PNG, WebP' : 'MP4, MOV'} (Select multiple files)
                </p>
              </div>
              <div className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? 'Uploading...' : 'Choose Files'}
              </div>
            </Label>
          </div>
        </div>

        {/* Additional Media Upload */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            Additional Media
          </Label>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDraggingAdditional 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleAdditionalDragOver}
            onDragLeave={handleAdditionalDragLeave}
            onDrop={handleAdditionalDrop}
          >
            <Input
              type="file"
              accept="image/*,video/*"
              onChange={handleAdditionalFilesChange}
              className="hidden"
              id="additional-media"
              multiple
            />
            <Label 
              htmlFor="additional-media" 
              className="cursor-pointer flex flex-col items-center justify-center gap-3"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="font-medium">{isDraggingAdditional ? 'Drop files here' : 'Click to upload or drag and drop'}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported: JPG, PNG, WebP, MP4, MOV (Select multiple files)
                </p>
              </div>
              <div className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? 'Uploading...' : 'Choose Files'}
              </div>
            </Label>
          </div>
        </div>

        {/* Uploaded Media Preview */}
        {store.media.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Uploaded Media</h4>
              <p className="text-sm text-gray-500">Drag to reorder</p>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <SortableContext
                items={store.media.map((m, i) => m.id || String(i))}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 transform-none">
                  {store.media.map((media, index) => (
                    <SortableMediaItem
                      key={media.id || index}
                      media={media}
                      index={index}
                      onRemove={handleRemoveMedia}
                      onSetPrimary={handleSetMainMedia}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* CRITICAL FIX: Portal-based DragOverlay escapes all parent transforms */}
              {createPortal(
                <DragOverlay adjustScale={false}>
                  {activeMedia ? (
                    <div className="w-40 h-40 opacity-90 cursor-grabbing">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-blue-500 shadow-2xl bg-white">
                        {activeMedia.type === 'image' ? (
                          <img
                            src={activeMedia.url}
                            alt={`Uploaded ${activeMedia.fileName}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Video className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded p-1.5 shadow-lg">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>,
                document.getElementById('dnd-portal')!
              )}
            </DndContext>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{uploadError}</p>
          </div>
        )}

        {/* Upload Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Upload Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use high-quality photos with good lighting</li>
            <li>• Include wide shots and detailed close-ups</li>
            <li>• Show all rooms and key features</li>
            <li>• Keep videos under 60 seconds</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default MediaUploadStep;