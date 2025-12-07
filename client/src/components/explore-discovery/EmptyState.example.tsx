/**
 * EmptyState Component Examples
 * 
 * Demonstrates all variants and use cases of the EmptyState component
 */

import { useState } from 'react';
import { 
  EmptyState, 
  EmptyStateCard, 
  InlineEmptyState,
  EmptyStateType 
} from './EmptyState';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { Search, Heart } from 'lucide-react';

/**
 * Example 1: All Empty State Types
 */
export function AllEmptyStateTypesExample() {
  const types: EmptyStateType[] = [
    'noResults',
    'noLocation',
    'offline',
    'noSavedProperties',
    'noFollowedItems',
    'noContent',
    'noFiltersMatch',
  ];

  const [selectedType, setSelectedType] = useState<EmptyStateType>('noResults');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap gap-2">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <EmptyState
        type={selectedType}
        onAction={() => console.log('Primary action clicked')}
        onSecondaryAction={() => console.log('Secondary action clicked')}
      />
    </div>
  );
}

/**
 * Example 2: No Search Results
 */
export function NoSearchResultsExample() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={() => setHasResults(!hasResults)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Toggle Results
        </button>
      </div>

      {!hasResults ? (
        <EmptyState
          type="noResults"
          onAction={() => {
            console.log('Clearing filters...');
            setHasResults(true);
          }}
          onSecondaryAction={() => {
            console.log('Browsing all...');
            setHasResults(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ModernCard key={i} className="h-48 flex items-center justify-center">
              Property {i}
            </ModernCard>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Location Permission
 */
export function LocationPermissionExample() {
  const [hasPermission, setHasPermission] = useState(false);

  const requestPermission = () => {
    console.log('Requesting location permission...');
    // Simulate permission grant
    setTimeout(() => {
      setHasPermission(true);
    }, 1000);
  };

  return (
    <div className="p-6">
      {!hasPermission ? (
        <EmptyState
          type="noLocation"
          onAction={requestPermission}
          onSecondaryAction={() => console.log('Manual search...')}
        />
      ) : (
        <ModernCard className="p-8 text-center">
          <p className="text-lg font-semibold text-green-600">
            ✓ Location access granted!
          </p>
          <p className="text-gray-600 mt-2">
            Showing properties near you...
          </p>
        </ModernCard>
      )}
    </div>
  );
}

/**
 * Example 4: Offline State
 */
export function OfflineStateExample() {
  const [isOnline, setIsOnline] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={() => setIsOnline(!isOnline)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Toggle Connection
        </button>
      </div>

      {!isOnline ? (
        <EmptyState
          type="offline"
          onAction={() => {
            console.log('Retrying connection...');
            setIsOnline(true);
          }}
          onSecondaryAction={() => console.log('Viewing cached content...')}
        />
      ) : (
        <ModernCard className="p-8 text-center">
          <p className="text-lg font-semibold text-green-600">
            ✓ Connected!
          </p>
        </ModernCard>
      )}
    </div>
  );
}

/**
 * Example 5: No Saved Properties
 */
export function NoSavedPropertiesExample() {
  const [savedCount, setSavedCount] = useState(0);

  return (
    <div className="p-6">
      {savedCount === 0 ? (
        <EmptyState
          type="noSavedProperties"
          onAction={() => {
            console.log('Navigating to explore...');
            setSavedCount(3);
          }}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Saved Properties ({savedCount})</h2>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: savedCount }).map((_, i) => (
              <ModernCard key={i} className="h-48 flex items-center justify-center">
                <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
              </ModernCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: Custom Messages
 */
export function CustomMessagesExample() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Title & Description</h3>
        <EmptyState
          type="noContent"
          customTitle="No properties in this area"
          customDescription="Try expanding your search radius or exploring nearby neighborhoods to find more options."
          customActionLabel="Expand Search"
          onAction={() => console.log('Expanding search...')}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Action Label</h3>
        <EmptyState
          type="noResults"
          customActionLabel="Start Fresh"
          onAction={() => console.log('Starting fresh...')}
        />
      </div>
    </div>
  );
}

/**
 * Example 7: Compact Mode
 */
export function CompactModeExample() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Regular Size</h3>
        <EmptyState
          type="noResults"
          onAction={() => console.log('Action clicked')}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Compact Size</h3>
        <EmptyState
          type="noResults"
          compact
          onAction={() => console.log('Action clicked')}
        />
      </div>
    </div>
  );
}

/**
 * Example 8: EmptyStateCard Variant
 */
export function EmptyStateCardExample() {
  return (
    <div className="p-6 space-y-6">
      <h3 className="text-lg font-semibold">Card Variant</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <EmptyStateCard
          type="noSavedProperties"
          onAction={() => console.log('Explore clicked')}
          cardClassName="shadow-lg"
        />

        <EmptyStateCard
          type="noFollowedItems"
          onAction={() => console.log('Discover clicked')}
          cardClassName="shadow-lg"
        />
      </div>
    </div>
  );
}

/**
 * Example 9: InlineEmptyState
 */
export function InlineEmptyStateExample() {
  const [items, setItems] = useState<string[]>([]);

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setItems(['Item 1', 'Item 2', 'Item 3'])}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Add Items
        </button>
        <button
          onClick={() => setItems([])}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
        >
          Clear Items
        </button>
      </div>

      <ModernCard className="min-h-[200px]">
        {items.length === 0 ? (
          <InlineEmptyState
            icon={Search}
            message="No items to display"
            actionLabel="Add Item"
            onAction={() => setItems(['New Item'])}
          />
        ) : (
          <div className="p-4 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                {item}
              </div>
            ))}
          </div>
        )}
      </ModernCard>
    </div>
  );
}

/**
 * Example 10: Filter-Based Empty State
 */
export function FilterBasedEmptyStateExample() {
  const [filterCount, setFilterCount] = useState(0);
  const [hasResults, setHasResults] = useState(true);

  const emptyType = filterCount > 0 ? 'noFiltersMatch' : 'noResults';

  return (
    <div className="p-6">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => {
            setFilterCount(3);
            setHasResults(false);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
        >
          Apply Filters (No Results)
        </button>
        <button
          onClick={() => {
            setFilterCount(0);
            setHasResults(false);
          }}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
        >
          Clear Filters (No Results)
        </button>
        <button
          onClick={() => setHasResults(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg"
        >
          Show Results
        </button>
      </div>

      {!hasResults ? (
        <EmptyState
          type={emptyType}
          onAction={() => {
            setFilterCount(0);
            setHasResults(true);
          }}
          onSecondaryAction={() => console.log('Adjust filters...')}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ModernCard key={i} className="h-48 flex items-center justify-center">
              Property {i}
            </ModernCard>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Example 11: Responsive Layout
 */
export function ResponsiveLayoutExample() {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Responsive Empty State</h3>
      <p className="text-gray-600 mb-6">
        Resize your browser to see how the empty state adapts to different screen sizes.
      </p>

      <EmptyState
        type="noResults"
        onAction={() => console.log('Primary action')}
        onSecondaryAction={() => console.log('Secondary action')}
      />
    </div>
  );
}

/**
 * Example 12: All Examples Combined
 */
export function AllExamplesDemo() {
  const examples = [
    { title: 'All Types', component: AllEmptyStateTypesExample },
    { title: 'No Search Results', component: NoSearchResultsExample },
    { title: 'Location Permission', component: LocationPermissionExample },
    { title: 'Offline State', component: OfflineStateExample },
    { title: 'No Saved Properties', component: NoSavedPropertiesExample },
    { title: 'Custom Messages', component: CustomMessagesExample },
    { title: 'Compact Mode', component: CompactModeExample },
    { title: 'Card Variant', component: EmptyStateCardExample },
    { title: 'Inline Variant', component: InlineEmptyStateExample },
    { title: 'Filter-Based', component: FilterBasedEmptyStateExample },
    { title: 'Responsive', component: ResponsiveLayoutExample },
  ];

  const [selectedExample, setSelectedExample] = useState(0);
  const ExampleComponent = examples[selectedExample].component;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">EmptyState Component Examples</h1>
        <p className="text-gray-600 mb-8">
          Explore all variants and use cases of the EmptyState component
        </p>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <ModernCard className="p-4">
              <h3 className="font-semibold mb-3">Examples</h3>
              <div className="space-y-1">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedExample(index)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedExample === index
                        ? 'bg-indigo-100 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {example.title}
                  </button>
                ))}
              </div>
            </ModernCard>
          </div>

          {/* Content */}
          <div className="flex-1">
            <ModernCard className="min-h-[600px]">
              <ExampleComponent />
            </ModernCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllExamplesDemo;
