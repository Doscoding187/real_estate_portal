/**
 * ImageUploader Usage Example
 *
 * This component demonstrates how to use the ImageUploader
 * Delete this file after integrating into your forms
 */

import { useState } from 'react';
import { ImageUploader, type ImageFile } from './ImageUploader';
import { Button } from './ui/button';

export function ImageUploaderExample() {
  const [images, setImages] = useState<ImageFile[]>([]);

  const handleGetUrls = () => {
    // Get all successfully uploaded image URLs
    const uploadedUrls = images.filter(img => img.uploaded && img.url).map(img => img.url!);

    console.log('Uploaded Image URLs:', uploadedUrls);
    alert(`Uploaded ${uploadedUrls.length} images. Check console for URLs.`);
    return uploadedUrls;
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Image Uploader Test</h1>

      <ImageUploader images={images} onImagesChange={setImages} maxImages={20} maxSizeMB={10} />

      <div className="mt-6 space-y-4">
        <Button onClick={handleGetUrls} disabled={images.length === 0}>
          Get Uploaded URLs
        </Button>

        <div className="text-sm text-muted-foreground">
          <p>Total images: {images.length}</p>
          <p>Uploaded: {images.filter(img => img.uploaded).length}</p>
          <p>Uploading: {images.filter(img => img.uploading).length}</p>
          <p>Failed: {images.filter(img => img.error).length}</p>
        </div>
      </div>
    </div>
  );
}
