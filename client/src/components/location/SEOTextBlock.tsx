import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SEOTextBlockProps {
  title: string;
  content: string; // Can be HTML string or markdown text
  locationName: string;
}

export function SEOTextBlock({ title, content, locationName }: SEOTextBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="py-12 bg-white">
      <div className="container max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-slate-900">{title}</h2>
        
        <div 
          className={`prose prose-slate max-w-none text-slate-600 ${
            !isExpanded ? 'line-clamp-4 relative' : ''
          }`}
        >
          {/* Render content safely - keeping it simple for now, can use explicit dangerouslySetInnerHTML if content is trusted HTML */}
          <div dangerouslySetInnerHTML={{ __html: content }} />
          
          {/* Gradient fade for collapsed state */}
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
          )}
        </div>

        <Button 
          variant="ghost" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-primary hover:text-primary/80 p-0 h-auto font-medium"
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
