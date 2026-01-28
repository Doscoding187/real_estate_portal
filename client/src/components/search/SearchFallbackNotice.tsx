import React from 'react';
import { AlertCircle, MapPin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SearchFallbackNoticeProps {
  locationContext?: {
    confidence: 'exact' | 'expanded' | 'approximate';
    fallbackLevel: 'none' | 'suburb_to_city' | 'city_to_province' | 'suburb_to_province';
    name: string;
    originalIntent: string;
    type: 'province' | 'city' | 'suburb';
  };
}

export const SearchFallbackNotice: React.FC<SearchFallbackNoticeProps> = ({ locationContext }) => {
  if (!locationContext || locationContext.confidence === 'exact') {
    return null;
  }

  const { fallbackLevel, originalIntent, name, type } = locationContext;

  if (fallbackLevel === 'none') return null;

  return (
    <Alert variant="default" className="mb-6 bg-amber-50 border-amber-200 text-amber-900">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Expanded Search Area
      </AlertTitle>
      <AlertDescription className="text-amber-700 mt-1">
        We couldn't find any properties in <strong>{originalIntent}</strong>, so we're showing you
        results in <strong>{name}</strong> ({type}) instead.
      </AlertDescription>
    </Alert>
  );
};
