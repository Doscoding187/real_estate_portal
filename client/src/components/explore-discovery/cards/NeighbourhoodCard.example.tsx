/**
 * NeighbourhoodCard Example Usage
 *
 * Demonstrates various use cases and configurations of the NeighbourhoodCard component.
 */

import { NeighbourhoodCard } from './NeighbourhoodCard';
import { useState } from 'react';

// Sample neighbourhood data
const sampleNeighbourhoods = [
  {
    id: 1,
    name: 'Sandton',
    city: 'Johannesburg',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    propertyCount: 245,
    avgPrice: 3500000,
    priceChange: 5.2,
    followerCount: 1234,
    highlights: ['Luxury Living', 'Business Hub'],
  },
  {
    id: 2,
    name: 'Camps Bay',
    city: 'Cape Town',
    imageUrl: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800',
    propertyCount: 156,
    avgPrice: 8500000,
    priceChange: 8.7,
    followerCount: 2456,
    highlights: ['Beachfront', 'Mountain Views'],
  },
  {
    id: 3,
    name: 'Umhlanga',
    city: 'Durban',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    propertyCount: 189,
    avgPrice: 2800000,
    priceChange: -2.3,
    followerCount: 876,
    highlights: ['Coastal Living', 'Modern'],
  },
  {
    id: 4,
    name: 'Rosebank',
    city: 'Johannesburg',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    propertyCount: 312,
    avgPrice: 2200000,
    followerCount: 654,
    // No price change or highlights
  },
];

export function NeighbourhoodCardExamples() {
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());

  const handleClick = (id: number) => {
    console.log('Neighbourhood clicked:', id);
    // In real app: navigate(`/neighbourhood/${id}`)
  };

  const handleFollow = (id: number) => {
    setFollowedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        console.log('Unfollowed neighbourhood:', id);
      } else {
        newSet.add(id);
        console.log('Followed neighbourhood:', id);
      }
      return newSet;
    });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">NeighbourhoodCard Examples</h1>
        <p className="text-gray-600 mb-8">
          Demonstrating various configurations and states of the NeighbourhoodCard component.
        </p>

        {/* Example 1: Full Featured */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Full Featured Card</h2>
          <p className="text-gray-600 mb-4">
            Card with all features: price change, highlights, follower count
          </p>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[0]}
              onClick={() => handleClick(sampleNeighbourhoods[0].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[0].id)}
            />
          </div>
        </section>

        {/* Example 2: Positive Price Change */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Positive Price Trend</h2>
          <p className="text-gray-600 mb-4">
            Card showing positive price change with green indicator
          </p>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[1]}
              onClick={() => handleClick(sampleNeighbourhoods[1].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[1].id)}
            />
          </div>
        </section>

        {/* Example 3: Negative Price Change */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Negative Price Trend</h2>
          <p className="text-gray-600 mb-4">
            Card showing negative price change with red indicator
          </p>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[2]}
              onClick={() => handleClick(sampleNeighbourhoods[2].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[2].id)}
            />
          </div>
        </section>

        {/* Example 4: Minimal Data */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Minimal Data</h2>
          <p className="text-gray-600 mb-4">
            Card with only required fields (no price change or highlights)
          </p>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[3]}
              onClick={() => handleClick(sampleNeighbourhoods[3].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[3].id)}
            />
          </div>
        </section>

        {/* Example 5: Grid Layout */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Grid Layout</h2>
          <p className="text-gray-600 mb-4">Multiple cards in a responsive grid</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleNeighbourhoods.map(neighbourhood => (
              <NeighbourhoodCard
                key={neighbourhood.id}
                neighbourhood={neighbourhood}
                onClick={() => handleClick(neighbourhood.id)}
                onFollow={() => handleFollow(neighbourhood.id)}
              />
            ))}
          </div>
        </section>

        {/* Example 6: Single Column Layout */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Single Column Layout</h2>
          <p className="text-gray-600 mb-4">Cards stacked vertically with spacing</p>
          <div className="max-w-md mx-auto space-y-6">
            {sampleNeighbourhoods.slice(0, 2).map(neighbourhood => (
              <NeighbourhoodCard
                key={neighbourhood.id}
                neighbourhood={neighbourhood}
                onClick={() => handleClick(neighbourhood.id)}
                onFollow={() => handleFollow(neighbourhood.id)}
              />
            ))}
          </div>
        </section>

        {/* Example 7: With Follow State */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Interactive Follow State</h2>
          <p className="text-gray-600 mb-4">
            Click follow buttons to see state changes. Followed IDs:{' '}
            {Array.from(followedIds).join(', ') || 'None'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {sampleNeighbourhoods.slice(0, 2).map(neighbourhood => (
              <NeighbourhoodCard
                key={neighbourhood.id}
                neighbourhood={neighbourhood}
                onClick={() => handleClick(neighbourhood.id)}
                onFollow={() => handleFollow(neighbourhood.id)}
              />
            ))}
          </div>
        </section>

        {/* Example 8: Animation Showcase */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Animation Showcase</h2>
          <p className="text-gray-600 mb-4">Hover and click to see animations:</p>
          <ul className="text-sm text-gray-600 mb-4 space-y-1">
            <li>• Hover card → 2px lift + subtle scale</li>
            <li>• Click card → Scale down to 0.98</li>
            <li>• Hover follow button → Scale up to 1.05</li>
            <li>• Click follow button → Scale down to 0.95</li>
            <li>• Hover image → Scale up to 1.05</li>
          </ul>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[0]}
              onClick={() => handleClick(sampleNeighbourhoods[0].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[0].id)}
            />
          </div>
        </section>

        {/* Example 9: Accessibility Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Accessibility Features</h2>
          <p className="text-gray-600 mb-4">Try these accessibility features:</p>
          <ul className="text-sm text-gray-600 mb-4 space-y-1">
            <li>• Tab to focus on card</li>
            <li>• Press Enter or Space to activate</li>
            <li>• Screen reader announces: "Neighbourhood: Sandton in Johannesburg"</li>
            <li>• Follow button has descriptive label</li>
            <li>• High contrast text (WCAG AA compliant)</li>
          </ul>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[0]}
              onClick={() => handleClick(sampleNeighbourhoods[0].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[0].id)}
            />
          </div>
        </section>

        {/* Example 10: Design System Integration */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Design System Integration</h2>
          <p className="text-gray-600 mb-4">This card uses design tokens for:</p>
          <ul className="text-sm text-gray-600 mb-4 space-y-1">
            <li>• Spacing: designTokens.spacing.md (16px), .sm (8px)</li>
            <li>• Colors: designTokens.colors.text.primary, .secondary</li>
            <li>• Typography: designTokens.typography.fontWeight.bold</li>
            <li>• Shadows: shadow-md → shadow-hover on hover</li>
            <li>• Border radius: designTokens.borderRadius.pill for highlights</li>
          </ul>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[1]}
              onClick={() => handleClick(sampleNeighbourhoods[1].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[1].id)}
            />
          </div>
        </section>

        {/* Example 11: Comparison with PropertyCard */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Consistency Check</h2>
          <p className="text-gray-600 mb-4">
            NeighbourhoodCard shares design patterns with PropertyCard:
          </p>
          <ul className="text-sm text-gray-600 mb-4 space-y-1">
            <li>✅ Same ModernCard base component</li>
            <li>✅ Same hover animation (2px lift, 1.01 scale)</li>
            <li>✅ Same press animation (0.98 scale)</li>
            <li>✅ Same spacing tokens</li>
            <li>✅ Same color tokens</li>
            <li>✅ Same typography tokens</li>
            <li>✅ Same accessibility features</li>
          </ul>
          <div className="max-w-sm">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhoods[2]}
              onClick={() => handleClick(sampleNeighbourhoods[2].id)}
              onFollow={() => handleFollow(sampleNeighbourhoods[2].id)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// Export for use in demo pages
export default NeighbourhoodCardExamples;
