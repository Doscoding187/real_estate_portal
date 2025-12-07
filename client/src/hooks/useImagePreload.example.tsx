/**
 * useImagePreload Hook - Usage Examples
 * Demonstrates various ways to use the image preloading hook
 */

import React, { useState } from 'react';
import { useImagePreload, useFeedImagePreload, useProgressiveImagePreload } from './useImagePreload';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';

// Example 1: Basic Image Preloading
export function BasicPreloadExample() {
  const imageUrls = [
    'https://example.com/property1.jpg',
    'https://example.com/property2.jpg',
    'https://example.com/property3.jpg',
    'https://example.com/property4.jpg',
    'https://example.com/property5.jpg',
  ];

  const { loadedImages, isImageLoaded, isImageLoading } = useImagePreload(imageUrls, {
    preloadCount: 5,
    priority: 'low',
    onImageLoaded: (url) => console.log('Loaded:', url),
    onImageError: (url, error) => console.error('Failed:', url, error),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Basic Image Preloading</h2>
      <div className="text-sm text-gray-600">
        Loaded: {loadedImages.size} / {imageUrls.length}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {imageUrls.map((url, index) => (
          <div key={url} className="relative">
            <img
              src={url}
              alt={`Property ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
              {isImageLoaded(url) ? '✓ Loaded' : isImageLoading(url) ? '⏳ Loading' : '⏸ Pending'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 2: Feed Image Preloading
export function FeedPreloadExample() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const feedItems = [
    { id: 1, data: { imageUrl: 'https://example.com/feed1.jpg', title: 'Property 1' } },
    { id: 2, data: { thumbnailUrl: 'https://example.com/feed2.jpg', title: 'Property 2' } },
    { id: 3, data: { imageUrl: 'https://example.com/feed3.jpg', title: 'Property 3' } },
    { id: 4, data: { imageUrl: 'https://example.com/feed4.jpg', title: 'Property 4' } },
    { id: 5, data: { thumbnailUrl: 'https://example.com/feed5.jpg', title: 'Property 5' } },
    { id: 6, data: { imageUrl: 'https://example.com/feed6.jpg', title: 'Property 6' } },
    { id: 7, data: { imageUrl: 'https://example.com/feed7.jpg', title: 'Property 7' } },
  ];

  const { loadedImages, isImageLoaded } = useFeedImagePreload(feedItems, currentIndex, {
    preloadCount: 5,
    priority: 'low',
    preloadOnSlowConnection: false,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Feed Image Preloading</h2>
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm">
          Item {currentIndex + 1} / {feedItems.length}
        </span>
        <button
          onClick={() => setCurrentIndex(Math.min(feedItems.length - 1, currentIndex + 1))}
          disabled={currentIndex === feedItems.length - 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Preloaded: {loadedImages.size} images
      </div>

      <div className="space-y-2">
        {feedItems.map((item, index) => {
          const imageUrl = item.data.imageUrl || item.data.thumbnailUrl;
          const isPreloaded = isImageLoaded(imageUrl);
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex && index <= currentIndex + 5;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50'
                  : isUpcoming
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <img
                  src={imageUrl}
                  alt={item.data.title}
                  className="w-20 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="font-medium">{item.data.title}</div>
                  <div className="text-sm text-gray-600">
                    {isCurrent && '👁 Currently viewing'}
                    {isUpcoming && '🔄 Preloading...'}
                    {!isCurrent && !isUpcoming && '⏸ Not preloaded'}
                  </div>
                </div>
                <div className="text-sm">
                  {isPreloaded ? '✓ Ready' : '⏳ Pending'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Example 3: Progressive Image Preloading
export function ProgressivePreloadExample() {
  const [selectedImage, setSelectedImage] = useState('https://example.com/large-property.jpg');

  const { lowQualityLoaded, highQualityLoaded, isLoading } = useProgressiveImagePreload(
    selectedImage,
    {
      priority: 'high',
      onImageLoaded: (url) => console.log('Progressive load complete:', url),
    }
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Progressive Image Preloading</h2>
      
      <div className="space-y-2">
        <div className="text-sm">
          <span className={lowQualityLoaded ? 'text-green-600' : 'text-gray-400'}>
            ● Low Quality {lowQualityLoaded ? 'Loaded' : 'Loading...'}
          </span>
        </div>
        <div className="text-sm">
          <span className={highQualityLoaded ? 'text-green-600' : 'text-gray-400'}>
            ● High Quality {highQualityLoaded ? 'Loaded' : 'Loading...'}
          </span>
        </div>
      </div>

      <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}
        <img
          src={selectedImage}
          alt="Progressive loading example"
          className={`w-full h-full object-cover transition-all duration-500 ${
            lowQualityLoaded && !highQualityLoaded ? 'blur-sm scale-105' : ''
          }`}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedImage('https://example.com/large-property.jpg')}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
        >
          Load Image 1
        </button>
        <button
          onClick={() => setSelectedImage('https://example.com/large-property-2.jpg')}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
        >
          Load Image 2
        </button>
      </div>
    </div>
  );
}

// Example 4: Integration with ProgressiveImage Component
export function ProgressiveImageIntegrationExample() {
  const images = [
    { id: 1, url: 'https://example.com/property1.jpg', alt: 'Modern apartment' },
    { id: 2, url: 'https://example.com/property2.jpg', alt: 'Beach house' },
    { id: 3, url: 'https://example.com/property3.jpg', alt: 'City loft' },
    { id: 4, url: 'https://example.com/property4.jpg', alt: 'Mountain cabin' },
  ];

  const { isImageLoaded } = useImagePreload(
    images.map((img) => img.url),
    {
      preloadCount: 4,
      priority: 'low',
    }
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">ProgressiveImage Integration</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {images.map((image) => (
          <div key={image.id} className="space-y-2">
            <ProgressiveImage
              src={image.url}
              alt={image.alt}
              className="w-full h-48"
              priority={isImageLoaded(image.url)}
            />
            <div className="text-xs text-center text-gray-600">
              {isImageLoaded(image.url) ? '✓ Preloaded' : '⏳ Loading'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Network-Aware Preloading
export function NetworkAwarePreloadExample() {
  const [respectSlowConnection, setRespectSlowConnection] = useState(true);
  
  const imageUrls = Array.from({ length: 10 }, (_, i) => 
    `https://example.com/property${i + 1}.jpg`
  );

  const { loadedImages, loadingImages } = useImagePreload(imageUrls, {
    preloadCount: 5,
    priority: 'low',
    preloadOnSlowConnection: !respectSlowConnection,
  });

  // Detect connection type
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || 'unknown';
  const saveData = connection?.saveData || false;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Network-Aware Preloading</h2>
      
      <div className="p-4 bg-gray-100 rounded-lg space-y-2">
        <div className="text-sm">
          <strong>Connection Type:</strong> {effectiveType}
        </div>
        <div className="text-sm">
          <strong>Data Saver:</strong> {saveData ? 'Enabled' : 'Disabled'}
        </div>
        <div className="text-sm">
          <strong>Loaded:</strong> {loadedImages.size} / {imageUrls.length}
        </div>
        <div className="text-sm">
          <strong>Loading:</strong> {loadingImages.size}
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={respectSlowConnection}
          onChange={(e) => setRespectSlowConnection(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm">Respect slow connections (skip preload on 2G)</span>
      </label>

      <div className="grid grid-cols-5 gap-2">
        {imageUrls.map((url, index) => (
          <div key={url} className="aspect-square bg-gray-200 rounded flex items-center justify-center text-xs">
            {loadedImages.has(url) ? '✓' : loadingImages.has(url) ? '⏳' : index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

// Demo page combining all examples
export function ImagePreloadDemoPage() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Image Preloading Hook Examples</h1>
        <p className="text-gray-600">
          Demonstrations of the useImagePreload hook for optimizing image loading in the Explore feed
        </p>
      </div>

      <BasicPreloadExample />
      <hr />
      
      <FeedPreloadExample />
      <hr />
      
      <ProgressivePreloadExample />
      <hr />
      
      <ProgressiveImageIntegrationExample />
      <hr />
      
      <NetworkAwarePreloadExample />
    </div>
  );
}

export default ImagePreloadDemoPage;
