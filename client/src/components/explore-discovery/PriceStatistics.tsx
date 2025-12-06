/**
 * Price Statistics Component
 * Displays price trends and average property values
 * Requirements: 5.3
 */

import { TrendingUp, DollarSign } from 'lucide-react';
import { useState } from 'react';

interface PriceTrendData {
  month: string;
  avgPrice: number;
}

interface PriceStatisticsProps {
  avgPropertyPrice: number | null;
  priceTrend: {
    '6m'?: PriceTrendData[];
    '12m'?: PriceTrendData[];
  } | null;
}

export function PriceStatistics({ avgPropertyPrice, priceTrend }: PriceStatisticsProps) {
  const [timeframe, setTimeframe] = useState<'6m' | '12m'>('6m');

  if (!avgPropertyPrice && !priceTrend) {
    return null;
  }

  const trendData = priceTrend?.[timeframe] || [];
  const hasData = trendData.length > 0;

  // Calculate price change
  const priceChange = hasData
    ? ((trendData[trendData.length - 1].avgPrice - trendData[0].avgPrice) / trendData[0].avgPrice) *
      100
    : 0;

  // Find min and max for scaling
  const prices = trendData.map((d) => d.avgPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Average Price Card */}
      {avgPropertyPrice && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Average Property Price</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-blue-900">{formatPrice(avgPropertyPrice)}</span>
            {priceChange !== 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  priceChange > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <TrendingUp
                  className={`w-4 h-4 ${priceChange < 0 ? 'rotate-180' : ''}`}
                />
                <span>{Math.abs(priceChange).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <p className="text-sm text-blue-700 mt-2">
            {timeframe === '6m' ? 'Last 6 months' : 'Last 12 months'}
          </p>
        </div>
      )}

      {/* Price Trend Chart */}
      {hasData && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Price Trend</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeframe('6m')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  timeframe === '6m'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setTimeframe('12m')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  timeframe === '12m'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                12M
              </button>
            </div>
          </div>

          {/* Simple Line Chart */}
          <div className="relative h-48">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
              <span>{formatPrice(maxPrice)}</span>
              <span>{formatPrice((maxPrice + minPrice) / 2)}</span>
              <span>{formatPrice(minPrice)}</span>
            </div>

            {/* Chart area */}
            <div className="ml-20 h-full relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-gray-100" />
                ))}
              </div>

              {/* Line chart */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  points={trendData
                    .map((point, index) => {
                      const x = (index / (trendData.length - 1)) * 100;
                      const y =
                        100 - ((point.avgPrice - minPrice) / (priceRange || 1)) * 100;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {/* Data points */}
                {trendData.map((point, index) => {
                  const x = (index / (trendData.length - 1)) * 100;
                  const y = 100 - ((point.avgPrice - minPrice) / (priceRange || 1)) * 100;
                  return (
                    <circle
                      key={index}
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r="4"
                      fill="#3B82F6"
                      className="hover:r-6 transition-all"
                    />
                  );
                })}
              </svg>

              {/* X-axis labels */}
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-gray-500">
                {trendData.map((point, index) => {
                  // Show every other month for 12m, all months for 6m
                  if (timeframe === '12m' && index % 2 !== 0) return null;
                  return <span key={index}>{point.month}</span>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
