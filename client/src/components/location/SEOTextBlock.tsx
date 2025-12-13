import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { generateSEOContent } from '@/lib/seoGenerator';

interface SEOTextBlockProps {
  title: string;
  content?: string; // Can be HTML string or markdown text
  locationName: string;
  locationType?: 'province' | 'city' | 'suburb';
  parentName?: string;
  stats?: {
    totalListings: number;
    avgPrice: number;
    rentalCount?: number;
    saleCount?: number;
    minPrice?: number;
    maxPrice?: number;
    avgRentalPrice?: number;
  };
}

export function SEOTextBlock({ 
  title, 
  content, 
  locationName,
  locationType,
  parentName,
  stats
}: SEOTextBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate content if not provided and we have stats
  const finalContent = useMemo(() => {
    if (content) return content;
    
    if (locationType && stats) {
      return generateSEOContent({
        type: locationType,
        name: locationName,
        parentName,
        stats
      });
    }
    
    return '';
  }, [content, locationType, locationName, parentName, stats]);

  if (!finalContent) return null;

  return (
    <div className="py-12 bg-white border-t border-slate-100">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-slate-900">{title}</h2>
        
        <div 
          className={`prose prose-slate max-w-none text-slate-600 ${
            !isExpanded ? 'line-clamp-4 relative' : ''
          }`}
        >
          {/* Render content safely - keeping it simple for now, can use explicit dangerouslySetInnerHTML if content is trusted HTML */}
          <div dangerouslySetInnerHTML={{ __html: finalContent }} />
          
          {/* Gradient fade for collapsed state */}
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        <Button 
          variant="ghost" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-primary hover:text-primary/80 p-0 h-auto font-medium hover:bg-transparent"
        >
          {isExpanded ? (
            <span className="flex items-center">
              Read Less <ChevronUp className="ml-1 h-4 w-4" />
            </span>
          ) : (
            <span className="flex items-center">
              Read More about {locationName} <ChevronDown className="ml-1 h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
