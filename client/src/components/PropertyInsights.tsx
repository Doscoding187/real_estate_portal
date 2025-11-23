import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Map, FileText, TrendingUp } from 'lucide-react';

interface CityData {
  name: string;
  medianPrice: number;
  listings: number;
  transactions: number;
  grossValue: number;
  registeredRate: number;
  priceRanges: { range: string; count: number }[];
  micromarkets: { area: string; price: number }[];
}

const cityData: Record<string, CityData> = {
  Johannesburg: {
    name: 'Johannesburg',
    medianPrice: 2850000,
    listings: 45655,
    transactions: 128563,
    grossValue: 182806000000,
    registeredRate: 16950,
    priceRanges: [
      { range: 'Below R1M', count: 8500 },
      { range: 'R1M-R2M', count: 15200 },
      { range: 'R2M-R3M', count: 12800 },
      { range: 'R3M-R5M', count: 6400 },
      { range: 'R5M-R10M', count: 2100 },
      { range: 'Above R10M', count: 655 },
    ],
    micromarkets: [
      { area: 'Sandton', price: 46100 },
      { area: 'Rosebank', price: 34650 },
      { area: 'Fourways', price: 33100 },
      { area: 'Midrand', price: 30100 },
    ],
  },
  'Cape Town': {
    name: 'Cape Town',
    medianPrice: 3250000,
    listings: 52340,
    transactions: 145230,
    grossValue: 215430000000,
    registeredRate: 18500,
    priceRanges: [
      { range: 'Below R1M', count: 6200 },
      { range: 'R1M-R2M', count: 12800 },
      { range: 'R2M-R3M', count: 14500 },
      { range: 'R3M-R5M', count: 11200 },
      { range: 'R5M-R10M', count: 5800 },
      { range: 'Above R10M', count: 1840 },
    ],
    micromarkets: [
      { area: 'Camps Bay', price: 65200 },
      { area: 'Sea Point', price: 42300 },
      { area: 'Constantia', price: 38900 },
      { area: 'Claremont', price: 35400 },
    ],
  },
  Pretoria: {
    name: 'Pretoria',
    medianPrice: 2150000,
    listings: 32450,
    transactions: 89340,
    grossValue: 128450000000,
    registeredRate: 14200,
    priceRanges: [
      { range: 'Below R1M', count: 9800 },
      { range: 'R1M-R2M', count: 13500 },
      { range: 'R2M-R3M', count: 6200 },
      { range: 'R3M-R5M', count: 2300 },
      { range: 'R5M-R10M', count: 550 },
      { range: 'Above R10M', count: 100 },
    ],
    micromarkets: [
      { area: 'Waterkloof', price: 38500 },
      { area: 'Menlyn', price: 28900 },
      { area: 'Centurion', price: 26400 },
      { area: 'Brooklyn', price: 32100 },
    ],
  },
  Durban: {
    name: 'Durban',
    medianPrice: 1950000,
    listings: 28900,
    transactions: 76540,
    grossValue: 98230000000,
    registeredRate: 12800,
    priceRanges: [
      { range: 'Below R1M', count: 11200 },
      { range: 'R1M-R2M', count: 10500 },
      { range: 'R2M-R3M', count: 4800 },
      { range: 'R3M-R5M', count: 1800 },
      { range: 'R5M-R10M', count: 500 },
      { range: 'Above R10M', count: 100 },
    ],
    micromarkets: [
      { area: 'Umhlanga', price: 35600 },
      { area: 'Ballito', price: 28200 },
      { area: 'La Lucia', price: 32400 },
      { area: 'Durban North', price: 24800 },
    ],
  },
};

export function PropertyInsights() {
  const [selectedCity, setSelectedCity] = useState('Johannesburg');
  const data = cityData[selectedCity];

  const maxCount = Math.max(...data.priceRanges.map(r => r.count));

  return (
    <div className="py-16 bg-white">
      <div className="container">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Property Price Insights in South Africa
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl">
            Get accurate property price insights in South Africa with city-wise trends, median
            rates, and micro-market comparisons. Make smarter investment choices backed by real-time
            data and location benchmarks.
          </p>
        </div>

        <Tabs value={selectedCity} onValueChange={setSelectedCity} className="w-full">
        <TabsList className="flex flex-wrap justify-start gap-2 mb-8 bg-transparent p-0 h-auto">
            {Object.keys(cityData).map(city => (
              <TabsTrigger
                key={city}
                value={city}
                className="px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border bg-white text-muted-foreground border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-md data-[state=active]:scale-105"
              >
                {city}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(cityData).map(city => (
            <TabsContent key={city} value={city} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Average Price Map */}
                <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
                        <Map className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Average Price Map</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Interactive map showing average property prices across different areas
                    </p>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl h-40 flex items-center justify-center mb-4 border border-blue-100 group-hover:border-blue-200 transition-colors">
                      <div className="text-center">
                        <Map className="h-16 w-16 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm text-blue-600 font-medium">Interactive Map View</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                      Explore Map
                    </Button>
                  </CardContent>
                </Card>

                {/* Asking Price */}
                <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-amber-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Asking Price</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {city} has {data.listings.toLocaleString()} listings with median price of R {(data.medianPrice / 1000000).toFixed(2)}M
                    </p>
                    <div className="space-y-2 mb-4">
                      {data.priceRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24 text-right font-medium">
                            {range.range}
                          </span>
                          <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-full h-6 overflow-hidden border border-orange-100">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-amber-500 h-full flex items-center justify-end pr-2"
                              style={{ width: `${(range.count / maxCount) * 100}%` }}
                            >
                              {range.count > maxCount * 0.3 && (
                                <span className="text-xs text-white font-medium">
                                  {range.count.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      Price Range (R/Property)
                    </p>
                  </CardContent>
                </Card>

                {/* Market Activity */}
                <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Market Activity</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-6">
                      Current market activity and listing trends in {city}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-100 group-hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100">
                            <BarChart3 className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">Active Listings</span>
                        </div>
                        <span className="font-semibold text-lg">{data.listings.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-100 group-hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">Avg. Price/m²</span>
                        </div>
                        <span className="font-semibold text-lg">
                          R {data.registeredRate.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-emerald-100 group-hover:border-emerald-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100">
                            <FileText className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">Median Price</span>
                        </div>
                        <span className="font-semibold text-lg">
                          R {(data.medianPrice / 1000000).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Micromarket Price Comparison */}
                <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg font-semibold">Micromarket Comparison</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-6">
                      {city} avg. price is R {data.registeredRate.toLocaleString()} / m²
                    </p>
                    <div className="space-y-4">
                      {data.micromarkets.map((market, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">
                              {market.area}
                            </span>
                            <span className="text-sm font-semibold text-purple-600">
                              R {market.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-white/80 backdrop-blur-sm rounded-full h-2.5 border border-purple-100">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500"
                              style={{
                                width: `${(market.price / Math.max(...data.micromarkets.map(m => m.price))) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
