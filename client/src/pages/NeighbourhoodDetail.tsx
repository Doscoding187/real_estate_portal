/**
 * Neighbourhood Detail Page
 * Comprehensive neighbourhood information with amenities, prices, videos, and properties
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Home, Video, Check } from 'lucide-react';
import { useNeighbourhoodDetail } from '@/hooks/useNeighbourhoodDetail';
import { AmenityDisplay } from '@/components/explore-discovery/AmenityDisplay';
import { PriceStatistics } from '@/components/explore-discovery/PriceStatistics';
import { VideoCard } from '@/components/explore-discovery/cards/VideoCard';
import { PropertyCard } from '@/components/explore-discovery/cards/PropertyCard';
import { FollowButton } from '@/components/explore-discovery/FollowButton';

export default function NeighbourhoodDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const neighbourhoodId = parseInt(id || '0', 10);

  const {
    neighbourhood,
    videos,
    isLoading,
    error,
    isFollowing,
    toggleFollow,
    isTogglingFollow,
  } = useNeighbourhoodDetail(neighbourhoodId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading neighbourhood...</p>
        </div>
      </div>
    );
  }

  if (error || !neighbourhood) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load neighbourhood</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="relative h-96 bg-gray-900">
        {neighbourhood.heroBannerUrl ? (
          <img
            src={neighbourhood.heroBannerUrl}
            alt={neighbourhood.name}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{neighbourhood.name}</h1>
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="w-5 h-5" />
                  <span>
                    {neighbourhood.city}
                    {neighbourhood.province && `, ${neighbourhood.province}`}
                  </span>
                </div>
              </div>

              {/* Follow button - Requirements 5.6, 13.1 */}
              <FollowButton
                type="neighbourhood"
                targetId={neighbourhoodId}
                initialFollowing={isFollowing}
                variant="default"
                size="lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{neighbourhood.followerCount}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <Home className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{neighbourhood.propertyCount}</p>
            <p className="text-sm text-gray-500">Properties</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <Video className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{neighbourhood.videoCount}</p>
            <p className="text-sm text-gray-500">Videos</p>
          </div>
        </div>

        {/* Description */}
        {neighbourhood.description && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About {neighbourhood.name}</h2>
            <p className="text-gray-700 leading-relaxed">{neighbourhood.description}</p>
          </div>
        )}

        {/* Highlights */}
        {neighbourhood.highlights && neighbourhood.highlights.length > 0 && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {neighbourhood.highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Amenities */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
            <AmenityDisplay
              amenities={neighbourhood.amenities}
              safetyRating={neighbourhood.safetyRating}
              walkabilityScore={neighbourhood.walkabilityScore}
            />
          </div>

          {/* Price Statistics */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Price Trends</h2>
            <PriceStatistics
              avgPropertyPrice={neighbourhood.avgPropertyPrice}
              priceTrend={neighbourhood.priceTrend}
            />
          </div>
        </div>

        {/* Videos Section */}
        {videos.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Video Tours</h2>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                See All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={{
                    id: video.id,
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl || '',
                    duration: video.duration || 0,
                    views: video.viewCount || 0,
                    creatorName: 'Agent',
                    creatorAvatar: undefined,
                  }}
                  onClick={() => console.log('Play video', video.id)}
                  onSave={() => console.log('Save video', video.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Properties Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Available Properties</h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              See All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* TODO: Load actual properties */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 text-center text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Properties loading...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
