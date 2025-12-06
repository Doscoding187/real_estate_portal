import { useState, useEffect } from 'react';
import { Play, Grid3x3, SlidersHorizontal, MapPin } from 'lucide-react';
import { DiscoveryCardFeed } from '@/components/explore-discovery/DiscoveryCardFeed';
import { ExploreVideoFeed } from '@/components/explore-discovery/ExploreVideoFeed';
import { LifestyleCategorySelector } from '@/components/explore-discovery/LifestyleCategorySelector';
import { FilterPanel } from '@/components/explore-discovery/FilterPanel';
import { PersonalizedContentBlock } from '@/components/explore-discovery/PersonalizedContentBlock';
import { useCategoryFilter } from '@/hooks/useCategoryFilter';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { usePersonalizedContent } from '@/hooks/usePersonalizedContent';
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';

type ViewMode = 'home' | 'cards' | 'videos';

export default function ExploreHome() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const { selectedCategoryId, setSelectedCategoryId } = useCategoryFilter();
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  
  const {
    filters,
    setPropertyType,
    updateCommonFilters,
    updateResidentialFilters,
    updateDevelopmentFilters,
    updateLandFilters,
    clearFilters,
    getFilterCount,
  } = usePropertyFilters();

  // Get personalized content sections
  const { sections, isLoading: sectionsLoading } = usePersonalizedContent({
    categoryId: selectedCategoryId,
    location: userLocation,
  });

  // Get user location for "Popular Near You"
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  const handleItemClick = (item: DiscoveryItem) => {
    console.log('Item clicked:', item);
    // TODO: Navigate to detail page based on item type
    if (item.type === 'property') {
      // Navigate to property detail
    } else if (item.type === 'video') {
      // Open video feed at this video
      setViewMode('videos');
    } else if (item.type === 'neighbourhood') {
      // Navigate to neighbourhood detail
    }
  };

  const handleSeeAll = (sectionType: string) => {
    console.log('See all:', sectionType);
    // Navigate to full view of section
    setViewMode('cards');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
            
            {/* View mode toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setViewMode('home')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'home'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Home</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('videos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'videos'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Videos</span>
              </button>
            </div>
          </div>

          {/* Category filter */}
          <LifestyleCategorySelector
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            variant="light"
            className="pb-2"
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto">
        {viewMode === 'home' ? (
          <div className="py-6">
            {/* Personalized Content Sections */}
            {sectionsLoading ? (
              <>
                <PersonalizedContentBlock
                  title="Loading..."
                  items={[]}
                  onItemClick={handleItemClick}
                  isLoading={true}
                />
                <PersonalizedContentBlock
                  title="Loading..."
                  items={[]}
                  onItemClick={handleItemClick}
                  isLoading={true}
                />
              </>
            ) : (
              sections.map((section) => (
                <PersonalizedContentBlock
                  key={section.id}
                  title={section.title}
                  subtitle={section.subtitle}
                  items={section.items}
                  onItemClick={handleItemClick}
                  onSeeAll={() => handleSeeAll(section.type)}
                />
              ))
            )}

            {/* Empty state */}
            {!sectionsLoading && sections.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start Exploring
                </h3>
                <p className="text-gray-600 mb-6">
                  Discover properties tailored to your preferences
                </p>
                <button
                  onClick={() => setViewMode('cards')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All Properties
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="py-6">
            <DiscoveryCardFeed
              categoryId={selectedCategoryId}
              filters={filters}
              onItemClick={handleItemClick}
            />
          </div>
        ) : (
          <ExploreVideoFeed categoryId={selectedCategoryId} />
        )}
      </main>

      {/* Filter button (floating) */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-30"
        onClick={() => setShowFilters(true)}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-6 h-6" />
        {getFilterCount() > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {getFilterCount()}
          </span>
        )}
      </button>

      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        propertyType={filters.propertyType}
        onPropertyTypeChange={setPropertyType}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        onPriceChange={(min, max) => updateCommonFilters({ priceMin: min, priceMax: max })}
        residentialFilters={filters.residential}
        onResidentialFiltersChange={updateResidentialFilters}
        developmentFilters={filters.development}
        onDevelopmentFiltersChange={updateDevelopmentFilters}
        landFilters={filters.land}
        onLandFiltersChange={updateLandFilters}
        filterCount={getFilterCount()}
        onClearAll={clearFilters}
      />
    </div>
  );
}
