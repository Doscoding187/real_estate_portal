/**
 * Saved Properties Page
 * Requirements: 14.3, 14.5
 * Display all saved properties with organization options
 */

import React, { useState } from 'react';
import { trpc } from '../lib/trpc';
import { Bookmark, Grid, List, Loader2, Trash2 } from 'lucide-react';
import { PropertyCard } from '../components/explore-discovery/cards/PropertyCard';
import { useSaveProperty } from '../hooks/useSaveProperty';

type ViewMode = 'grid' | 'list';

export default function SavedProperties() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [limit] = useState(50);
  const [offset] = useState(0);

  const { data, isLoading, refetch } = trpc.exploreApi.getSavedProperties.useQuery({
    limit,
    offset,
  });

  const handleUnsave = () => {
    // Refetch to update the list
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading saved properties...</p>
        </div>
      </div>
    );
  }

  const savedItems = data?.data.items || [];
  const total = data?.data.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Saved Properties</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {total} {total === 1 ? 'property' : 'properties'} saved
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  px-3 py-2 rounded-md transition-all duration-200
                  ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                aria-label="Grid view"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`
                  px-3 py-2 rounded-md transition-all duration-200
                  ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                aria-label="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {savedItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bookmark className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No saved properties yet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start exploring and save properties you're interested in. They'll appear here for
              easy access later.
            </p>
            <a
              href="/explore"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Explore Properties
            </a>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {savedItems.map((item) => (
                  <div key={item.id} className="relative group">
                    <PropertyCard
                      id={item.property.id}
                      title={item.property.title}
                      price={item.property.price}
                      location={item.property.location}
                      imageUrl={item.property.imageUrl}
                      beds={item.property.beds}
                      baths={item.property.baths}
                      area={item.property.area}
                      propertyType={item.property.propertyType}
                    />
                    {/* Unsave button overlay */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <SaveButtonWrapper
                        propertyId={item.property.id}
                        onUnsave={handleUnsave}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {savedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4"
                  >
                    <img
                      src={item.property.imageUrl}
                      alt={item.property.title}
                      className="w-32 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.property.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{item.property.location}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{item.property.beds} beds</span>
                        <span>{item.property.baths} baths</span>
                        <span>{item.property.area} m²</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          R {item.property.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Saved {new Date(item.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <SaveButtonWrapper propertyId={item.property.id} onUnsave={handleUnsave} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper component to handle unsave
function SaveButtonWrapper({
  propertyId,
  onUnsave,
}: {
  propertyId: number;
  onUnsave: () => void;
}) {
  const { isSaved, toggleSave } = useSaveProperty({
    propertyId,
    initialSaved: true,
    onUnsaveSuccess: onUnsave,
  });

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSave();
      }}
      className="w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center justify-center transition-colors"
      aria-label="Remove from saved"
      title="Remove from saved"
    >
      {isSaved ? <Bookmark size={20} fill="currentColor" /> : <Trash2 size={20} />}
    </button>
  );
}
