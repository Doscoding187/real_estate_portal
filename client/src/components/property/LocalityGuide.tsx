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

const DEFAULT_GUIDE_IMAGE = '/placeholders/urban-illustration-with-large-buildings-with-cars-and-trees-city-activities-vector.jpg';

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
  const resolvedImage = DEFAULT_GUIDE_IMAGE;

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

        {/* Image */}
        <div className="mb-6">
          <div className="h-[240px] rounded-xl overflow-hidden bg-slate-100 w-full">
            <img
              src={resolvedImage}
              alt={`${suburb} locality`}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
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
