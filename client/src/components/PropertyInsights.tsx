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
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            Property Price Insights in South Africa
          </h2>
          <p className="text-muted-foreground text-lg">
            Get accurate property price insights in South Africa with city-wise trends, median
            rates, and micro-market comparisons. Make smarter investment choices backed by real-time
            data and location benchmarks.
          </p>
        </div>

        <Tabs value={selectedCity} onValueChange={setSelectedCity} className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-muted/30 mb-8 p-2">
            {Object.keys(cityData).map(city => (
              <TabsTrigger
                key={city}
                value={city}
                className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2 rounded-md"
              >
                {city}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(cityData).map(city => (
            <TabsContent key={city} value={city} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Property Rates Heatmap */}
                <Card className="bg-teal-50 border-teal-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Map className="h-5 w-5 text-teal-600" />
                      <CardTitle className="text-lg">Property Rates Heatmap</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="text-sm text-muted-foreground">
                        An Interactive Map to help you understand a City's Real Estate
                      </p>
                    </div>
                    <div className="bg-teal-100 rounded-lg h-40 flex items-center justify-center mb-4">
                      <div className="text-center">
                        <Map className="h-16 w-16 text-teal-600 mx-auto mb-2" />
                        <p className="text-sm text-teal-700">Interactive Map View</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Explore Now
                    </Button>
                  </CardContent>
                </Card>

                {/* Asking Price */}
                <Card className="bg-orange-50 border-orange-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-lg">Asking Price</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="text-sm text-muted-foreground">
                        {city} has {data.listings.toLocaleString()} Listings on Marketplaces with
                        Median Price of R {(data.medianPrice / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div className="space-y-2 mb-4">
                      {data.priceRanges.map((range, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24 text-right">
                            {range.range}
                          </span>
                          <div className="flex-1 bg-orange-100 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-orange-500 h-full flex items-center justify-end pr-2"
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

                {/* Govt. Registrations */}
                <Card className="bg-pink-50 border-pink-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-pink-600" />
                      <CardTitle className="text-lg">Govt. Registrations</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2 mb-6">
                      <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="text-sm text-muted-foreground">
                        {data.transactions.toLocaleString()} Sales Transactions Registered in {city}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Sales Transactions</span>
                        </div>
                        <span className="font-semibold">{data.transactions.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Gross Sales Value</span>
                        </div>
                        <span className="font-semibold">
                          R {(data.grossValue / 1000000000).toFixed(1)}B
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Registered Rate</span>
                        </div>
                        <span className="font-semibold">
                          R {data.registeredRate.toLocaleString()} / m²
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Micromarket Price Comparison */}
                <Card className="bg-purple-50 border-purple-200">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">Micromarket Price Comparison</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">in {city}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2 mb-6">
                      <TrendingUp className="h-4 w-4 text-muted-foreground mt-1" />
                      <p className="text-sm text-muted-foreground">
                        {city} avg. price is R {data.registeredRate.toLocaleString()} / m²
                      </p>
                    </div>
                    <div className="space-y-3">
                      {data.micromarkets.map((market, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              R {market.price.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">{market.area}</span>
                          </div>
                          <div className="w-full bg-purple-100 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
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
