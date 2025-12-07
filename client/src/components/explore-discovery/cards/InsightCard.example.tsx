/**
 * InsightCard Example Usage
 * 
 * Demonstrates all insight types with various configurations
 */

import { InsightCard } from './InsightCard';

export function InsightCardExamples() {
  const insights = [
    // Market Trend with data
    {
      id: 1,
      title: 'Sandton Property Market Surging',
      description: 'Average property prices in Sandton have increased significantly over the past quarter, driven by high demand and limited supply in premium areas.',
      insightType: 'market-trend' as const,
      data: {
        value: 'R 2.5M',
        change: 12.5,
        label: 'Average price',
      },
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
    },

    // Price Analysis with negative change
    {
      id: 2,
      title: 'Cape Town Coastal Properties Stabilizing',
      description: 'After months of rapid growth, coastal property prices are showing signs of stabilization with slight decreases in some areas.',
      insightType: 'price-analysis' as const,
      data: {
        value: 'R 4.2M',
        change: -3.2,
        label: 'Median price',
      },
      imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400',
    },

    // Investment Tip without image
    {
      id: 3,
      title: 'Best Time to Invest in Johannesburg',
      description: 'Market analysis suggests Q2 2024 is optimal for Johannesburg investments, with favorable interest rates and increasing rental yields.',
      insightType: 'investment-tip' as const,
      data: {
        value: '8.5%',
        change: 2.1,
        label: 'Rental yield',
      },
    },

    // Area Spotlight
    {
      id: 4,
      title: 'Rosebank: The New Business Hub',
      description: 'Rosebank is emerging as a prime business district with new developments, excellent transport links, and vibrant lifestyle amenities.',
      insightType: 'area-spotlight' as const,
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
    },

    // Simple insight without data
    {
      id: 5,
      title: 'Understanding Property Transfer Costs',
      description: 'Learn about the various costs involved in property transfers, including transfer duty, bond registration, and legal fees.',
      insightType: 'investment-tip' as const,
    },

    // Market trend with large positive change
    {
      id: 6,
      title: 'Pretoria East Experiencing Boom',
      description: 'The Pretoria East property market is experiencing unprecedented growth, with new developments and infrastructure improvements driving demand.',
      insightType: 'market-trend' as const,
      data: {
        value: 'R 1.8M',
        change: 18.7,
        label: 'Average price',
      },
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          InsightCard Examples
        </h1>
        <p className="text-gray-600 mb-8">
          Demonstrating all insight types with modern design and micro-interactions
        </p>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onClick={() => {
                console.log('Insight clicked:', insight.title);
                alert(`Clicked: ${insight.title}`);
              }}
            />
          ))}
        </div>

        {/* Single Column Layout */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Single Column Layout
          </h2>
          <div className="max-w-2xl space-y-4">
            {insights.slice(0, 3).map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onClick={() => console.log('Insight clicked:', insight.title)}
              />
            ))}
          </div>
        </div>

        {/* Compact Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Compact Grid (4 columns)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onClick={() => console.log('Insight clicked:', insight.title)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightCardExamples;
