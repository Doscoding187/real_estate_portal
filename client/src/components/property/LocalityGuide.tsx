import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LocalityGuideProps {
  suburb: string;
  city: string;
  province?: string;
  description?: string;
  images?: string[];
}

const PROVINCE_FALLBACK_IMAGES: Record<string, string> = {
  eastern_cape:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  free_state:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  gauteng:
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80',
  kwazulu_natal:
    'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1200&q=80',
  limpopo:
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  mpumalanga:
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80',
  north_west:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  northern_cape:
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  western_cape:
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
};

const DEFAULT_GUIDE_IMAGES = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1200&q=80',
];

export function LocalityGuide({
  suburb,
  city,
  province,
  description,
  images = [],
}: LocalityGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fallbackDescription = `${suburb} is a suburb in ${city}. Explore local amenities, transport links, and lifestyle highlights to understand what makes this area a great place to live.`;
  const resolvedDescription = description?.trim() ? description : fallbackDescription;
  const normalizedProvince = province
    ? province.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
    : '';
  const provinceFallback =
    (normalizedProvince && PROVINCE_FALLBACK_IMAGES[normalizedProvince]) || null;
  const resolvedImages =
    images && images.length > 0
      ? images
      : provinceFallback
        ? [provinceFallback]
        : DEFAULT_GUIDE_IMAGES;

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Suburb Guide</h3>
            <p className="text-slate-500">
              for {suburb}, {city}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300 gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Images Grid */}
        <div className="mb-6">
          {resolvedImages.slice(0, 1).map((img, index) => (
            <div key={index} className="h-[240px] rounded-xl overflow-hidden bg-slate-100 w-full">
              <img
                src={img}
                alt={`${suburb} locality ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className={`text-slate-600 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
            {resolvedDescription}
          </p>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-700 font-bold text-sm hover:underline focus:outline-none"
          >
            {isExpanded ? 'Read Less' : 'Read More'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
