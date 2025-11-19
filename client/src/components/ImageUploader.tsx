import { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ImageFile {
  file: File;
  preview: string;
  id: string;
  uploading?: boolean;
  progress?: number;
  uploaded?: boolean;
  url?: string;
  error?: string;
}

interface ImageUploaderProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  className?: string;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 20,
  maxSizeMB = 10,
  className,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presignMutation = trpc.upload.presign.useMutation();

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type: ${file.name}. Only JPG, PNG, and WebP are allowed.`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File too large: ${file.name}. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  const uploadFile = async (imageFile: ImageFile): Promise<ImageFile> => {
    try {
      // Update status to uploading
      updateImage(imageFile.id, { uploading: true, progress: 0 });

      // Get presigned URL
      const { url, key } = await presignMutation.mutateAsync({
        filename: imageFile.file.name,
        contentType: imageFile.file.type,
      });

      // Update progress
      updateImage(imageFile.id, { progress: 30 });

      // Upload to S3 (or storage proxy)
      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: imageFile.file,
        headers: {
          'Content-Type': imageFile.file.type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '');
        throw new Error(
          `Upload failed: ${uploadResponse.statusText}${errorText ? ` - ${errorText}` : ''}`,
        );
      }

      // Update progress
      updateImage(imageFile.id, { progress: 90 });

      // Construct the final URL using the CloudFront URL or S3 bucket URL
      let finalUrl: string;

      // Use the CloudFront URL from environment variables if available, otherwise construct S3 URL
      const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
      const s3BucketUrl = `https://${import.meta.env.VITE_S3_BUCKET_NAME}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com`;
      
      if (cloudFrontUrl) {
        finalUrl = `${cloudFrontUrl}/${key}`;
      } else {
        finalUrl = `${s3BucketUrl}/${key}`;
      }

      console.log('[Upload] File uploaded successfully:', finalUrl);

      // Complete upload
      updateImage(imageFile.id, {
        uploading: false,
        progress: 100,
        uploaded: true,
        url: finalUrl,
      });

      return { ...imageFile, url: finalUrl, uploaded: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      console.error('[Upload] Upload failed:', errorMsg);
      updateImage(imageFile.id, {
        uploading: false,
        error: errorMsg,
      });
      throw err;
    }
  };

  const updateImage = (
    id: string,
    updates: Partial<Omit<ImageFile, 'id' | 'file' | 'preview'>>,
  ) => {
    onImagesChange(images.map(img => (img.id === id ? { ...img, ...updates } : img)));
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      // Check if we'll exceed max images
      if (images.length + files.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const newImages: ImageFile[] = [];

      // Validate and prepare files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const validationError = validateFile(file);

        if (validationError) {
          setError(validationError);
          continue;
        }

        const imageFile: ImageFile = {
          file,
          preview: URL.createObjectURL(file),
          id: `${Date.now()}-${i}`,
        };

        newImages.push(imageFile);
      }

      if (newImages.length === 0) return;

      // Add images to state
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);

      // Upload each file
      for (const imageFile of newImages) {
        try {
          await uploadFile(imageFile);
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
    },
    [images, maxImages, onImagesChange],
  );

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
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    const image = images.find(img => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
    onImagesChange(images.filter(img => img.id !== id));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Get uploaded image URLs for form submission
  const getUploadedUrls = (): string[] => {
    return images.filter(img => img.uploaded && img.url).map(img => img.url!);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50',
          images.length >= maxImages && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleFileInput}
          disabled={images.length >= maxImages}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragging ? 'Drop images here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or WebP (max {maxSizeMB}MB each, up to {maxImages} images)
            </p>
          </div>
          {images.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {images.length} / {maxImages} images uploaded
            </p>
          )}
        </div>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="relative group rounded-lg border bg-card overflow-hidden aspect-square"
            >
              {/* Image Preview */}
              <img
                src={image.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                  Primary
                </div>
              )}

              {/* Upload Progress */}
              {image.uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                  <div className="text-white text-sm font-medium">Uploading...</div>
                  <Progress value={image.progress || 0} className="w-3/4" />
                </div>
              )}

              {/* Upload Success */}
              {image.uploaded && !image.uploading && (
                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {/* Error State */}
              {image.error && (
                <div className="absolute inset-0 bg-destructive/90 flex flex-col items-center justify-center gap-2 p-2">
                  <AlertCircle className="h-6 w-6 text-white" />
                  <p className="text-white text-xs text-center">{image.error}</p>
                </div>
              )}

              {/* Remove Button */}
              {!image.uploading && (
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={e => {
                    e.stopPropagation();
                    removeImage(image.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
}

// Export helper function to get uploaded URLs
export { type ImageFile };
