/**
 * Step 6: Media Upload
 * Handles image and video uploads for listings
 */

import React, { useState, useCallback } from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { X, Upload, Image, Video } from 'lucide-react';
import type { MediaFile } from '@/../../shared/listing-types';

const MediaUploadStep: React.FC = () => {
  const store = useListingWizardStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingPrimary, setIsDraggingPrimary] = useState(false);
  const [isDraggingAdditional, setIsDraggingAdditional] = useState(false);
  
  // TRPC mutation for media upload
  const uploadMediaMutation = trpc.listing.uploadMedia.useMutation();

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
        
        // Get file extension
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        
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
          isPrimary: isPrimary && newMediaFiles.length === 0, // Only first file can be primary
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
        store.setMainMedia(newMediaFiles[0].id!);
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
  const handleSetMainMedia = (mediaId: number) => {
    store.setMainMedia(mediaId);
  };

  // Handle primary file input change
  const handlePrimaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files, true);
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  // Handle additional files input change
  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  // Get display media type
  const displayMediaType = store.displayMediaType || 'image';

  // Drag and drop handlers for primary media
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

  // Drag and drop handlers for additional media
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
            <h4 className="font-medium">Uploaded Media</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {store.media.map((media, index) => (
                <div key={media.id || index} className="relative group">
                  <div className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    media.isPrimary ? 'border-blue-500' : 'border-gray-200'
                  }`}>
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt={`Uploaded ${media.fileName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  {media.isPrimary && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveMedia(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {!media.isPrimary && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => media.id && handleSetMainMedia(media.id)}
                      className="w-full mt-2 text-xs"
                    >
                      Set as Primary
                    </Button>
                  )}
                </div>
              ))}
            </div>
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