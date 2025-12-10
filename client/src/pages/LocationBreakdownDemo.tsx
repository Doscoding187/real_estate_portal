import { SuburbList } from '@/components/location/SuburbList';
import { CityList } from '@/components/location/CityList';
import { NearbySuburbs } from '@/components/location/NearbySuburbs';

/**
 * Demo page showcasing the three location breakdown components
 * This demonstrates how they work with sample data
 */
export default function LocationBreakdownDemo() {
  // Sample data for CityList
  const sampleCities = [
    {
      id: 1,
      name: 'Johannesburg',
      listingCount: 1250,
      avgPrice: 2500000,
      slug: 'johannesburg',
      suburbCount: 45,
      developmentCount: 12,
      popularity: 95
    },
    {
      id: 2,
      name: 'Pretoria',
      listingCount: 890,
      avgPrice: 1800000,
      slug: 'pretoria',
      suburbCount: 38,
      developmentCount: 8,
      popularity: 85
    },
    {
      id: 3,
      name: 'Centurion',
      listingCount: 450,
      avgPrice: 2200000,
      slug: 'centurion',
      suburbCount: 15,
      developmentCount: 5,
      popularity: 75
    },
  ];

  // Sample data for SuburbList
  const sampleSuburbs = [
    {
      id: 1,
      name: 'Sandton',
      listingCount: 320,
      avgPrice: 4500000,
      slug: 'sandton',
      priceChange: 5.2,
      popularity: 98
    },
    {
      id: 2,
      name: 'Rosebank',
      listingCount: 180,
      avgPrice: 3800000,
      slug: 'rosebank',
      priceChange: 3.1,
      popularity: 92
    },
    {
      id: 3,
      name: 'Fourways',
      listingCount: 250,
      avgPrice: 3200000,
      slug: 'fourways',
      priceChange: -1.5,
      popularity: 88
    },
    {
      id: 4,
      name: 'Randburg',
      listingCount: 210,
      avgPrice: 2500000,
      slug: 'randburg',
      priceChange: 2.8,
      popularity: 82
    },
  ];

  // Sample data for NearbySuburbs
  const sampleNearbySuburbs = [
    {
      id: 2,
      name: 'Rosebank',
      listingCount: 180,
      avgPrice: 3800000,
      slug: 'rosebank',
      distance: 3.2,
      cityName: 'Johannesburg'
    },
    {
      id: 5,
      name: 'Hyde Park',
      listingCount: 95,
      avgPrice: 5200000,
      slug: 'hyde-park',
      distance: 2.1,
      cityName: 'Johannesburg'
    },
    {
      id: 6,
      name: 'Morningside',
      listingCount: 120,
      avgPrice: 4100000,
      slug: 'morningside',
      distance: 4.5,
      cityName: 'Johannesburg'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Location Breakdown Components Demo
          </h1>
          <p className="text-slate-600">
            Showcasing the three location breakdown components with sample data
          </p>
        </div>
      </div>

      {/* CityList Demo */}
      <div className="bg-white">
        <CityList
          title="Major Cities in Gauteng"
          cities={sampleCities}
          parentSlug="gauteng"
          showFilters={true}
        />
      </div>

      {/* SuburbList Demo */}
      <div className="bg-slate-50">
        <SuburbList
          title="Popular Suburbs in Johannesburg"
          suburbs={sampleSuburbs}
          parentSlug="gauteng/johannesburg"
          showFilters={true}
        />
      </div>

      {/* NearbySuburbs Demo */}
      <div className="bg-white">
        <NearbySuburbs
          title="Suburbs Near Sandton"
          suburbs={sampleNearbySuburbs}
          parentSlug="gauteng/johannesburg"
          currentSuburbName="Sandton"
          maxDisplay={6}
        />
      </div>

      {/* Feature Highlights */}
      <div className="bg-slate-50 py-12">
        <div className="container">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Component Features</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="font-bold text-lg mb-3">CityList</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Sort by name, price, listings, popularity</li>
                <li>✓ Filter by minimum listings (10, 50, 100+)</li>
                <li>✓ Shows suburb and development counts</li>
                <li>✓ Larger cards for prominence</li>
                <li>✓ Responsive 1-3 column grid</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="font-bold text-lg mb-3">SuburbList</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Sort by name, price, listings, popularity</li>
                <li>✓ Filter by minimum listings (5, 10, 20+)</li>
                <li>✓ Price trend indicators (↑↓)</li>
                <li>✓ Compact card design</li>
                <li>✓ Responsive 1-4 column grid</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <h3 className="font-bold text-lg mb-3">NearbySuburbs</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Shows distance from current location</li>
                <li>✓ Distance badges (km/m)</li>
                <li>✓ No sorting/filtering needed</li>
                <li>✓ Configurable max display</li>
                <li>✓ Responsive 1-3 column grid</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
