import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Home, Activity } from 'lucide-react';
// Note: In a real implementation we might use a chart library like Recharts here
// For now, using stat cards and CSS-based visualizers

interface MarketInsightsProps {
  stats: {
    avgPrice: number;
    minPrice?: number;
    maxPrice?: number;
    totalListings: number;
    rentalCount?: number;
    saleCount?: number;
  };
  locationName: string;
  type: string;
}

export function MarketInsights({ stats, locationName, type }: MarketInsightsProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `R${(price / 1000000).toFixed(2)}M`;
    return `R${(price / 1000).toFixed(0)}k`;
  };

  return (
    <div className="py-16 bg-white border-t border-slate-100">
      <div className="container">
        <div className="flex items-center gap-2 mb-2 text-primary">
          <Activity className="h-5 w-5" />
          <span className="font-semibold uppercase tracking-wider text-sm">Market Data</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-8">{locationName} Property Insights</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Average Price Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                {/* <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">+5.2%</Badge> */}
              </div>
              <p className="text-sm text-slate-500 mb-1">Average Price</p>
              <p className="text-2xl font-bold text-slate-900">{formatPrice(stats.avgPrice)}</p>
              <p className="text-xs text-slate-400 mt-2">Based on active listings</p>
            </CardContent>
          </Card>

          {/* Listings Volume Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Home className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-1">Total Properties</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalListings}</p>
              <div className="flex gap-2 mt-2 text-xs">
                 <span className="text-slate-600 font-medium">{stats.saleCount || 0} For Sale</span>
                 <span className="text-slate-300">|</span>
                 <span className="text-slate-600 font-medium">{stats.rentalCount || 0} To Rent</span>
              </div>
            </CardContent>
          </Card>

          {/* Price Range Card */}
          <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-700">Price Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Entry Level</span>
                  <span className="font-bold">{formatPrice(stats.minPrice || 0)}</span>
                </div>
                
                {/* Visual Bar */}
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="w-1/4 bg-indigo-300" />
                  <div className="w-1/2 bg-indigo-500" />
                  <div className="w-1/4 bg-indigo-700" />
                </div>

                <div className="flex justify-between text-sm">
                  <span>Luxury Level</span>
                  <span className="font-bold">{formatPrice(stats.maxPrice || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
