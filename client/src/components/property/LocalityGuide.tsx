import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LocalityGuideProps {
  suburb: string;
  city: string;
  description?: string;
  images?: string[];
}

export function LocalityGuide({ 
  suburb, 
  city, 
  description = "Shadnagar is a town in Southern Hyderabad, located at a distance of approximately 50Km from Hyderabad city. Chatanpally, Farooknagar, Solipur, Kishannagar, Elikatta, and Hajipally are the nearby localities to Shadnagar. Active development in infrastructure and connectivity has made this area a prime location for real estate investment.",
  images = [
    "https://images.unsplash.com/photo-1544989164-302997a6cd12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  ]
}: LocalityGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Suburb Guide</h3>
            <p className="text-slate-500">for {suburb}, {city}</p>
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
          {images.slice(0, 1).map((img, index) => (
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
            {description}
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
