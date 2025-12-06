/**
 * Followed Items Page
 * Requirements: 13.3, 13.4
 * Display followed neighbourhoods and creators
 */

import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Users, MapPin, Loader2 } from 'lucide-react';
import { FollowButton } from '../components/explore-discovery/FollowButton';
import { NeighbourhoodCard } from '../components/explore-discovery/cards/NeighbourhoodCard';

type TabType = 'neighbourhoods' | 'creators';

export default function FollowedItems() {
  const [activeTab, setActiveTab] = useState<TabType>('neighbourhoods');

  const { data, isLoading, refetch } = trpc.exploreApi.getFollowedItems.useQuery();

  const handleUnfollow = () => {
    // Refetch to update the lists
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading followed items...</p>
        </div>
      </div>
    );
  }

  const neighbourhoods = data?.data.neighbourhoods || [];
  const creators = data?.data.creators || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Following</h1>
              <p className="text-sm text-gray-600 mt-1">
                Neighbourhoods and creators you follow
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('neighbourhoods')}
              className={`
                px-4 py-3 font-medium transition-all duration-200 border-b-2
                ${
                  activeTab === 'neighbourhoods'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>Neighbourhoods</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {neighbourhoods.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('creators')}
              className={`
                px-4 py-3 font-medium transition-all duration-200 border-b-2
                ${
                  activeTab === 'creators'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>Creators</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                  {creators.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'neighbourhoods' ? (
          <NeighbourhoodsTab neighbourhoods={neighbourhoods} onUnfollow={handleUnfollow} />
        ) : (
          <CreatorsTab creators={creators} onUnfollow={handleUnfollow} />
        )}
      </div>
    </div>
  );
}

// Neighbourhoods Tab
function NeighbourhoodsTab({
  neighbourhoods,
  onUnfollow,
}: {
  neighbourhoods: any[];
  onUnfollow: () => void;
}) {
  if (neighbourhoods.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          No neighbourhoods followed yet
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Follow neighbourhoods to see more content from areas you're interested in.
        </p>
        <a
          href="/explore"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Explore Neighbourhoods
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {neighbourhoods.map((item) => (
        <div key={item.id} className="relative">
          <NeighbourhoodCard
            id={item.neighbourhood.id}
            name={item.neighbourhood.name}
            city={item.neighbourhood.city}
            imageUrl={item.neighbourhood.imageUrl}
            propertyCount={item.neighbourhood.propertyCount}
            averagePrice={item.neighbourhood.averagePrice}
            description={item.neighbourhood.description}
          />
          <div className="absolute top-4 right-4">
            <FollowButton
              type="neighbourhood"
              targetId={item.neighbourhood.id}
              initialFollowing={true}
              variant="outline"
              size="sm"
              onUnfollowSuccess={onUnfollow}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Creators Tab
function CreatorsTab({ creators, onUnfollow }: { creators: any[]; onUnfollow: () => void }) {
  if (creators.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">No creators followed yet</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Follow agents and developers to see more of their content in your feed.
        </p>
        <a
          href="/explore"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Discover Creators
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {creators.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
              {item.creator.name.charAt(0).toUpperCase()}
            </div>

            {/* Creator Info */}
            <h3 className="font-semibold text-gray-900 mb-1">{item.creator.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{item.creator.role}</p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div>
                <span className="font-semibold text-gray-900">
                  {item.creator.videoCount || 0}
                </span>{' '}
                videos
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  {item.creator.followerCount || 0}
                </span>{' '}
                followers
              </div>
            </div>

            {/* Follow Button */}
            <FollowButton
              type="creator"
              targetId={item.creator.id}
              initialFollowing={true}
              variant="outline"
              size="sm"
              onUnfollowSuccess={onUnfollow}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
