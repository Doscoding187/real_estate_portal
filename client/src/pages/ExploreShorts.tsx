import { useState } from 'react';
import { ShortsContainer } from '@/components/explore/ShortsContainer';
import { FeedType } from '@/../../shared/types';
import { ArrowLeft, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';

export default function ExploreShorts() {
  const [, setLocation] = useLocation();
  const [feedType] = useState<FeedType>('recommended');
  const { isAuthenticated } = useAuth();

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

      {/* Upload button - only show for authenticated users */}
      {isAuthenticated && (
        <button
          onClick={() => setLocation('/explore/upload')}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 backdrop-blur-sm rounded-full text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
          aria-label="Upload content"
        >
          <Upload className="w-5 h-5" />
          <span className="font-medium">Upload</span>
        </button>
      )}

      {/* Shorts container */}
      <ShortsContainer feedType={feedType} />
    </div>
  );
}
