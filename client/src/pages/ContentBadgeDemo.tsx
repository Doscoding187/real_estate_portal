/**
 * Content Badge Demo Page
 * 
 * Demonstrates the ContentBadge component integrated with all card types.
 * Shows all badge types (property, expert_tip, service, finance, design)
 * on different card components.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { VideoCard } from '@/components/explore-discovery/cards/VideoCard';
import { PropertyCard } from '@/components/explore-discovery/cards/PropertyCard';
import { NeighbourhoodCard } from '@/components/explore-discovery/cards/NeighbourhoodCard';
import { InsightCard } from '@/components/explore-discovery/cards/InsightCard';
import { ContentBadge, getAllBadgeTypes } from '@/components/explore-discovery/ContentBadge';

export default function ContentBadgeDemo() {
  // Sample data with different badge types
  const sampleVideo = {
    id: 1,
    title: 'Modern 3-Bedroom Home Tour in Sandton',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    duration: 180,
    views: 12500,
    creatorName: 'John Smith Properties',
    creatorAvatar: 'https://i.pravatar.cc/150?img=1',
    badgeType: 'property' as const,
  };

  const sampleProperty = {
    id: 1,
    title: 'Luxury Penthouse with City Views',
    price: 4500000,
    location: 'Sandton, Johannesburg',
    beds: 3,
    baths: 2,
    size: 180,
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
    propertyType: 'Apartment',
    badgeType: 'property' as const,
  };

  const sampleNeighbourhood = {
    id: 1,
    name: 'Sandton',
    city: 'Johannesburg',
    imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600',
    propertyCount: 245,
    avgPrice: 3200000,
    priceChange: 5.2,
    followerCount: 1250,
    highlights: ['Business District', 'Shopping Malls'],
    badgeType: 'expert_tip' as const,
  };

  const sampleInsight = {
    id: 1,
    title: 'Property Market Trends Q1 2024',
    description: 'Discover the latest trends in the South African property market with insights from industry experts.',
    insightType: 'market-trend' as const,
    badgeType: 'finance' as const,
    data: {
      value: '12.5%',
      change: 2.3,
      label: 'Year-over-year growth',
    },
  };

  const serviceVideo = {
    ...sampleVideo,
    id: 2,
    title: 'Home Security System Installation Guide',
    badgeType: 'service' as const,
  };

  const designInsight = {
    ...sampleInsight,
    id: 2,
    title: 'Modern Interior Design Trends',
    insightType: 'area-spotlight' as const,
    badgeType: 'design' as const,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Content Badge Component Demo
          </h1>
          <p className="text-lg text-gray-600">
            Demonstrating content badges on all card types with different badge types.
          </p>
        </div>

        {/* Badge Types Reference */}
        <div className="mb-12 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Badge Types</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {getAllBadgeTypes().map((type) => (
              <div key={type} className="flex flex-col items-center gap-2">
                <ContentBadge type={type} showLabel size="lg" />
                <span className="text-sm text-gray-600 capitalize">
                  {type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Property Badge Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Property Badge (🏠) - Requirement 4.2
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <VideoCard
              video={sampleVideo}
              onClick={() => console.log('Video clicked')}
              onSave={() => console.log('Video saved')}
            />
            <PropertyCard
              property={sampleProperty}
              onClick={() => console.log('Property clicked')}
              onSave={() => console.log('Property saved')}
            />
          </div>
        </section>

        {/* Expert Tip Badge Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Expert Tip Badge (💡) - Requirement 4.3
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NeighbourhoodCard
              neighbourhood={sampleNeighbourhood}
              onClick={() => console.log('Neighbourhood clicked')}
              onFollow={() => console.log('Neighbourhood followed')}
            />
          </div>
        </section>

        {/* Service Badge Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Service Badge (🛠️) - Requirement 4.4
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <VideoCard
              video={serviceVideo}
              onClick={() => console.log('Service video clicked')}
              onSave={() => console.log('Service video saved')}
            />
          </div>
        </section>

        {/* Finance Badge Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Finance Badge (💰) - Requirement 4.5
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InsightCard
              insight={sampleInsight}
              onClick={() => console.log('Finance insight clicked')}
            />
          </div>
        </section>

        {/* Design Badge Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Design Badge (📐) - Requirement 4.6
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <InsightCard
              insight={designInsight}
              onClick={() => console.log('Design insight clicked')}
            />
          </div>
        </section>

        {/* Badge Sizes */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Badge Sizes</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <ContentBadge type="property" size="sm" showLabel />
                <span className="text-sm text-gray-600">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ContentBadge type="property" size="md" showLabel />
                <span className="text-sm text-gray-600">Medium (Default)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <ContentBadge type="property" size="lg" showLabel />
                <span className="text-sm text-gray-600">Large</span>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements Validation */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Requirements Validation
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.1:</strong> Badge displayed in top-left corner of all content cards
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.2:</strong> Property badge (🏠) with primary brand color
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.3:</strong> Expert Tip badge (💡) with amber color
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.4:</strong> Service badge (🛠️) with blue color
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.5:</strong> Finance badge (💰) with green color
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.6:</strong> Design badge (📐) with purple color
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>4.7:</strong> Only primary category badge displayed (single badge per card)
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
