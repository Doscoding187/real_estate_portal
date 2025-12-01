import { useState } from 'react';
import { ShortsContainer } from '@/components/explore/ShortsContainer';
import { FeedType } from '@/../../shared/types';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ExploreShorts() {
  const [, setLocation] = useLocation();
  const [feedType] = useState<FeedType>('recommended');

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Back button */}
      <button
        onClick={() => setLocation('/')}
        className="absolute top-4 left-4 z-50 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Shorts container */}
      <ShortsContainer feedType={feedType} />
    </div>
  );
}
