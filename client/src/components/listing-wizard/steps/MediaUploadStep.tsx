import React, { useState, useCallback } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import { SortableMediaGrid } from '@/components/media/SortableMediaGrid';
import { UploadProgressList, UploadProgress } from '@/components/media/UploadProgressBar';
import { Lightbulb } from 'lucide-react';
import type { MediaFile } from '@/../../shared/listing-types';
import type { MediaItem } from '@/components/media/SortableMediaGrid';

const MediaUploadStep: React.FC = () => {
  const store = useListingWizardStore();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  
  // TRPC mutation for media upload
  const uploadMediaMutation = trpc.listing.uploadMedia.useMutation();

  // Handle file upload
  const handleUpload = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) return;
    
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
        const mediaType = isImage ? 'image' : 'video';
        
        // Update progress: requesting upload URL
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 10 } : u
        ));
        
        // Request presigned URL from server
        const uploadData = await uploadMediaMutation.mutateAsync({
          type: mediaType,
          filename: file.name,
          contentType: file.type,
        });
        
        // Update progress: uploading to S3
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 20 } : u
        ));
        
        // Upload file to S3 with progress tracking
        const xhr = new XMLHttpRequest();
        
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = 20 + (e.loaded / e.total) * 70; // 20-90%
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = e.loaded / elapsed;
              const remaining = (e.total - e.loaded) / speed;
              
              setUploads(prev => prev.map(u => 
                u.id === uploadId 
                  ? { ...u, progress: Math.round(percentComplete), speed, timeRemaining: remaining }
                  : u
              ));
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
        
        // Update progress: finalizing
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 95 } : u
        ));
        
        // Create media file object
        const mediaFile: MediaFile = {
          id: uploadData.mediaId,
          url: uploadData.publicUrl,
          type: mediaType,
          fileName: file.name,
          fileSize: file.size,
          displayOrder: store.media.length,
          isPrimary: store.media.length === 0, // First upload is primary
          processingStatus: 'completed',
        };
        
        // Add to store
        store.addMedia(mediaFile);
        
        // Set as main media if first upload
        if (store.media.length === 1) {
          store.setMainMedia(uploadData.mediaId as any);
        }
        
        // Mark as completed
        setUploads(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 100, status: 'completed' as const } : u
        ));
        
      } catch (error: any) {
        console.error('Upload error:', error);
        setUploads(prev => prev.map(u => 
          u.id === uploadId 
            ? { ...u, status: 'error' as const, error: error.message || 'Upload failed' }
            : u
        ));
      }
    }
  }, [store, uploadMediaMutation]);

  // Convert store media to MediaItem format
  const mediaItems: MediaItem[] = store.media.map((media, index) => ({
    id: media.id?.toString() || `media-${index}`,
    url: media.url,
    type: media.type as 'image' | 'video' | 'floorplan' | 'pdf',
    fileName: media.fileName,
    isPrimary: media.isPrimary,
    displayOrder: media.displayOrder,
  }));

  // Handle media reorder - bulk replace all media with new order
  const handleReorder = useCallback((reorderedMedia: MediaItem[]) => {
    // Convert MediaItem[] back to MediaFile[] format and update store
    const updatedMedia = reorderedMedia.map((item, index) => {
      const original = store.media.find(m => m.id?.toString() === item.id);
      return {
        ...original,
        displayOrder: index,
      };
    }).filter(Boolean) as typeof store.media;
    
    store.setMedia(updatedMedia);
  }, [store]);

  // Handle media remove
  const handleRemove = useCallback((id: string) => {
    const index = store.media.findIndex(m => m.id?.toString() === id);
    if (index !== -1) {
      store.removeMedia(index);
    }
  }, [store]);

  // Handle set as primary
  const handleSetPrimary = useCallback((id: string) => {
    store.setMainMedia(id as any);
  }, [store]);

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
          <h3 className="text-lg font-semibold mb-2">Upload Media</h3>
          <p className="text-gray-600">
            Add photos and videos to showcase your property. High-quality images help attract more potential buyers.
          </p>
        </div>

        {/* Upload Zone */}
        <MediaUploadZone
          onUpload={handleUpload}
          maxFiles={30}
          maxSizeMB={5}
          maxVideoSizeMB={50}
          acceptedTypes={['image/*', 'video/*']}
          existingMediaCount={store.media.length}
          disabled={uploads.some(u => u.status === 'uploading')}
        />

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