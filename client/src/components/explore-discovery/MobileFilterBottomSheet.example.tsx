/**
 * Mobile Filter Bottom Sheet - Example Usage
 * Demonstrates various use cases and integration patterns
 */

import { useState } from 'react';
import { MobileFilterBottomSheet } from './MobileFilterBottomSheet';
import { ResponsiveFilterPanel } from './ResponsiveFilterPanel';
import { SlidersHorizontal } from 'lucide-react';

/**
 * Example 1: Basic Usage
 */
export function BasicExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Open Filters
      </button>

      <MobileFilterBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onApply={() => {
          console.log('Filters applied');
          setIsOpen(false);
        }}
      />
    </div>
  );
}

/**
 * Example 2: With Filter Count Badge
 */
export function WithBadgeExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(0);

  return (
    <div className="p-4">
      <button
        onClick={() => setIsOpen(true)}
        className="relative px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span>Filters</span>
        {filterCount > 0 && (
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {filterCount}
          </span>
        )}
      </button>

      <MobileFilterBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onApply={() => {
          // Update filter count from store
          console.log('Filters applied');
        }}
      />
    </div>
  );
}

/**
 * Example 3: Responsive (Auto-switches between mobile/desktop)
 */
export function ResponsiveExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Open Filters (Responsive)
      </button>

      {/* Automatically uses mobile bottom sheet on mobile, desktop panel on desktop */}
      <ResponsiveFilterPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onApply={() => {
          console.log('Filters applied');
        }}
      />
    </div>
  );
}

/**
 * Example 4: With Custom Apply Handler
 */
export function CustomApplyExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<any>(null);

  const handleApply = () => {
    // Get current filters from store
    const filters = {
      propertyType: 'residential',
      priceMin: 100000,
      priceMax: 500000,
      bedrooms: 3,
      bathrooms: 2,
    };
    
    setAppliedFilters(filters);
    console.log('Applied filters:', filters);
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
      >
        Open Filters
      </button>

      {appliedFilters && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Applied Filters:</h3>
          <pre className="text-sm">{JSON.stringify(appliedFilters, null, 2)}</pre>
        </div>
      )}

      <MobileFilterBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onApply={handleApply}
      />
    </div>
  );
}

/**
 * Example 5: Integration with Explore Pages
 */
export function ExplorePageExample() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);

  const handleApplyFilters = () => {
    // Fetch properties with applied filters
    console.log('Fetching properties with filters...');
    // In real app, this would trigger a React Query refetch
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-30">
        <h1 className="text-xl font-bold">Explore</h1>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <SlidersHorizontal className="w-6 h-6" />
        </button>
      </header>

      {/* Content */}
      <main className="p-4">
        <div className="grid grid-cols-1 gap-4">
          {properties.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No properties found. Try adjusting your filters.
            </p>
          ) : (
            properties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg p-4 shadow">
                {property.title}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Filter Bottom Sheet */}
      <MobileFilterBottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
      />
    </div>
  );
}

/**
 * Example 6: Testing Snap Points
 */
export function SnapPointTestExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Snap Point Testing</h2>
        <p className="text-gray-600">
          Open the bottom sheet and try:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>Dragging the handle down slowly</li>
          <li>Dragging the handle up slowly</li>
          <li>Fast swipe down (should close)</li>
          <li>Fast swipe up (should go to full)</li>
          <li>Clicking the snap point indicators</li>
        </ul>
        
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Test Snap Points
        </button>
      </div>

      <MobileFilterBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

/**
 * Example 7: Accessibility Testing
 */
export function AccessibilityTestExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-4">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Accessibility Testing</h2>
        <p className="text-gray-600">
          Test keyboard navigation:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
          <li>Press Tab to cycle through elements</li>
          <li>Press Shift+Tab to go backwards</li>
          <li>Press Escape to close</li>
          <li>Focus should stay trapped in the sheet</li>
          <li>First element should receive focus on open</li>
        </ul>
        
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Test Accessibility
        </button>
      </div>

      <MobileFilterBottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
