import React, { useState, useEffect, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Filter,
  RefreshCw,
  Eye,
  Info,
  Target,
  Zap,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  ResponsiveContainer,
  Treemap,
  Tooltip,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts';

// TypeScript interfaces for proper type safety (eliminating any types)
interface SuburbPriceData {
  suburbId: number;
  suburbName: string;
  cityName: string;
  province: string;
  averagePrice: number;
  medianPrice: number;
  sixMonthGrowth: number;
  trendingDirection: 'up' | 'down' | 'stable';
  trendConfidence: number;
  propertyCount: number;
  heatmapIntensity: number;
  color: string;
  priceCategory: string;
  growthInsight: string;
}

interface PropertyPriceHeatmapProps {
  cityId?: number;
  provinceId?: number;
  propertyType?: string;
  listingType?: string;
  onSuburbSelect?: (suburb: SuburbPriceData) => void;
  className?: string;
}

// Enhanced FilterState with useReducer pattern
type FilterState = {
  provinceId: string;
  propertyType: string;
  listingType: string;
  sortBy: 'price' | 'growth' | 'properties';
  viewMode: 'heatmap' | 'bars' | 'pie';
};

type FilterAction =
  | { type: 'SET_PROVINCE'; payload: string }
  | { type: 'SET_PROPERTY_TYPE'; payload: string }
  | { type: 'SET_LISTING_TYPE'; payload: string }
  | { type: 'SET_SORT_BY'; payload: 'price' | 'growth' | 'properties' }
  | { type: 'SET_VIEW_MODE'; payload: 'heatmap' | 'bars' | 'pie' }
  | { type: 'RESET_FILTERS' };

// useReducer for centralized state management
const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_PROVINCE':
      return { ...state, provinceId: action.payload };
    case 'SET_PROPERTY_TYPE':
      return { ...state, propertyType: action.payload };
    case 'SET_LISTING_TYPE':
      return { ...state, listingType: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'RESET_FILTERS':
      return {
        provinceId: 'all',
        propertyType: 'all',
        listingType: 'all',
        sortBy: 'price',
        viewMode: 'heatmap',
      };
    default:
      return state;
  }
};

// Recharts TypeScript interfaces for proper type safety
interface TreemapTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SuburbPriceData;
  }>;
}

// Color schemes with proper typing
const PRICE_COLORS: Record<string, string> = {
  Budget: '#10B981', // Green
  Affordable: '#34D399', // Light green
  'Mid-Range': '#F59E0B', // Amber
  'High-End': '#EF4444', // Red
  Premium: '#7C2D12', // Dark red
};

const GROWTH_COLORS: Record<'up' | 'down' | 'stable', string> = {
  up: '#10B981',
  down: '#EF4444',
  stable: '#6B7280',
};

// Debounced filter hook for performance optimization
const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Memoized Custom Tooltip component for performance
const CustomTooltip = memo<TreemapTooltipProps>(({ active, payload }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white p-4 border rounded-lg shadow-lg max-w-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{data.suburbName}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {data.cityName}, {data.province}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-medium">Avg Price</div>
            <div className="text-lg">R{data.averagePrice.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">6M Growth</div>
            <div
              className={`text-lg ${data.sixMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {data.sixMonthGrowth >= 0 ? '+' : ''}
              {data.sixMonthGrowth.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium">Properties</div>
            <div>{data.propertyCount}</div>
          </div>
          <div>
            <div className="font-medium">Category</div>
            <Badge variant="outline" className="text-xs">
              {data.priceCategory}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">{data.growthInsight}</div>
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// Memoized Insights Panel component
const InsightsPanel = memo<{ selectedSuburb: SuburbPriceData }>(({ selectedSuburb }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MapPin className="h-5 w-5" />
        {selectedSuburb.suburbName} Insights
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            R{selectedSuburb.averagePrice.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Average Price</div>
        </div>
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${selectedSuburb.sixMonthGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {selectedSuburb.sixMonthGrowth >= 0 ? '+' : ''}
            {selectedSuburb.sixMonthGrowth.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground">6 Month Growth</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{selectedSuburb.propertyCount}</div>
          <div className="text-sm text-muted-foreground">Properties</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            {selectedSuburb.trendingDirection === 'up' && (
              <TrendingUp className="h-5 w-5 text-green-600" />
            )}
            {selectedSuburb.trendingDirection === 'down' && (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            {selectedSuburb.trendingDirection === 'stable' && (
              <Minus className="h-5 w-5 text-gray-600" />
            )}
            <div
              className={`text-sm font-medium ${
                selectedSuburb.trendingDirection === 'up'
                  ? 'text-green-600'
                  : selectedSuburb.trendingDirection === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600'
              }`}
            >
              {selectedSuburb.trendingDirection.charAt(0).toUpperCase() +
                selectedSuburb.trendingDirection.slice(1)}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Market Trend</div>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div>
            <div className="font-medium mb-1">Market Insight</div>
            <div className="text-sm text-muted-foreground">{selectedSuburb.growthInsight}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Badge variant="outline">{selectedSuburb.priceCategory}</Badge>
        <Badge variant="secondary">
          Confidence: {(selectedSuburb.trendConfidence * 100).toFixed(0)}%
        </Badge>
      </div>
    </CardContent>
  </Card>
));

InsightsPanel.displayName = 'InsightsPanel';

// Memoized Market Summary component
const MarketSummary = memo<{ heatmapData: SuburbPriceData[] }>(({ heatmapData }) => {
  const marketStats = useMemo(() => {
    if (!heatmapData.length) return null;

    const totalProperties = heatmapData.reduce((sum, item) => sum + item.propertyCount, 0);
    const averagePrice = Math.round(
      heatmapData.reduce((sum, item) => sum + item.averagePrice, 0) / heatmapData.length,
    );
    const growingAreas = heatmapData.filter(item => item.trendingDirection === 'up').length;
    const avgGrowth =
      heatmapData.reduce((sum, item) => sum + item.sixMonthGrowth, 0) / heatmapData.length;

    return { totalProperties, averagePrice, growingAreas, avgGrowth };
  }, [heatmapData]);

  if (!marketStats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Market Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold">
              {marketStats.totalProperties.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Properties</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              R{marketStats.averagePrice.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Market Average</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{marketStats.growingAreas}</div>
            <div className="text-sm text-muted-foreground">Growing Areas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{marketStats.avgGrowth.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Avg Growth Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

MarketSummary.displayName = 'MarketSummary';

// Main Component with Performance Optimizations
export function PropertyPriceHeatmap({
  cityId,
  provinceId,
  propertyType,
  listingType,
  onSuburbSelect,
  className = '',
}: PropertyPriceHeatmapProps) {
  // useReducer for centralized state management
  const [state, dispatch] = useReducer(filterReducer, {
    provinceId: provinceId?.toString() || 'all',
    propertyType: propertyType || 'all',
    listingType: listingType || 'all',
    sortBy: 'price',
    viewMode: 'heatmap',
  });

  const [selectedSuburb, setSelectedSuburb] = useState<SuburbPriceData | null>(null);

  // Debounced filters to prevent excessive API calls
  const debouncedFilters = useDebouncedValue(state, 300);

  // Enhanced query with pagination and debounced filters
  const {
    data: heatmapData,
    isLoading,
    refetch,
  } = trpc.priceInsights.getSuburbPriceHeatmap.useQuery({
    cityId: cityId,
    provinceId:
      debouncedFilters.provinceId !== 'all' ? parseInt(debouncedFilters.provinceId) : undefined,
    propertyType:
      debouncedFilters.propertyType !== 'all' ? debouncedFilters.propertyType : undefined,
    listingType: debouncedFilters.listingType !== 'all' ? debouncedFilters.listingType : undefined,
    limit: 50,
    offset: 0,
  });

  // Memoized data formatters for performance
  const formatForBarChart = useMemo(
    () => (data: SuburbPriceData[]) => {
      return data
        .sort((a, b) => {
          switch (state.sortBy) {
            case 'price':
              return b.averagePrice - a.averagePrice;
            case 'growth':
              return b.sixMonthGrowth - a.sixMonthGrowth;
            case 'properties':
              return b.propertyCount - a.propertyCount;
            default:
              return 0;
          }
        })
        .slice(0, 15)
        .map(item => ({
          ...item,
          name:
            item.suburbName.length > 15
              ? item.suburbName.substring(0, 15) + '...'
              : item.suburbName,
          fullName: item.suburbName,
        }));
    },
    [state.sortBy],
  );

  const formatForPieChart = useMemo(
    () => (data: SuburbPriceData[]) => {
      const categories = data.reduce(
        (acc, item) => {
          acc[item.priceCategory] = (acc[item.priceCategory] || 0) + item.propertyCount;
          return acc;
        },
        {} as Record<string, number>,
      );

      return Object.entries(categories).map(([category, count]) => ({
        name: category,
        value: count,
        color: PRICE_COLORS[category] || '#6B7280',
      }));
    },
    [],
  );

  // Memoized suburb click handler
  const handleSuburbClick = useMemo(
    () => (data: SuburbPriceData) => {
      setSelectedSuburb(data);
      onSuburbSelect?.(data);
    },
    [onSuburbSelect],
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Property Price Insights
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive heatmap showing average house prices across suburbs
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters with useReducer actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Province</label>
              <Select
                value={state.provinceId}
                onValueChange={value => dispatch({ type: 'SET_PROVINCE', payload: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Provinces</SelectItem>
                  <SelectItem value="gauteng">Gauteng</SelectItem>
                  <SelectItem value="western-cape">Western Cape</SelectItem>
                  <SelectItem value="kwazulu-natal">KwaZulu-Natal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Property Type</label>
              <Select
                value={state.propertyType}
                onValueChange={value => dispatch({ type: 'SET_PROPERTY_TYPE', payload: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Listing Type</label>
              <Select
                value={state.listingType}
                onValueChange={value => dispatch({ type: 'SET_LISTING_TYPE', payload: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Listings</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select
                value={state.sortBy}
                onValueChange={value => dispatch({ type: 'SET_SORT_BY', payload: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">Average Price</SelectItem>
                  <SelectItem value="growth">Growth Rate</SelectItem>
                  <SelectItem value="properties">Property Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Toggle with useReducer */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">View:</span>
            <div className="flex gap-1">
              {(['heatmap', 'bars', 'pie'] as const).map(mode => (
                <Button
                  key={mode}
                  variant={state.viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: mode })}
                >
                  {mode === 'heatmap' && 'Heatmap'}
                  {mode === 'bars' && 'Bar Chart'}
                  {mode === 'pie' && 'Categories'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization with memoized components */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading price insights...</p>
              </div>
            </div>
          ) : heatmapData && heatmapData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {state.viewMode === 'heatmap' && (
                  <Treemap data={heatmapData} dataKey="propertyCount" onClick={handleSuburbClick}>
                    {heatmapData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Tooltip content={<CustomTooltip />} />
                  </Treemap>
                )}

                {state.viewMode === 'bars' && (
                  <BarChart data={formatForBarChart(heatmapData)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        name === 'averagePrice' ? `R${Number(value).toLocaleString()}` : value,
                        name === 'averagePrice' ? 'Avg Price' : name,
                      ]}
                    />
                    <Bar dataKey="averagePrice" fill="#3B82F6" />
                  </BarChart>
                )}

                {state.viewMode === 'pie' && (
                  <PieChart>
                    <Pie
                      data={formatForPieChart(heatmapData)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {formatForPieChart(heatmapData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <Info className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No data available for the selected filters</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Memoized Insights Panel */}
      {selectedSuburb && <InsightsPanel selectedSuburb={selectedSuburb} />}

      {/* Memoized Market Summary */}
      {heatmapData && heatmapData.length > 0 && <MarketSummary heatmapData={heatmapData} />}
    </div>
  );
}

// Enhanced Hook for tracking user behavior with better typing
export function usePriceInsightsTracking() {
  const trackEvent = trpc.priceInsights.trackUserBehavior.useMutation();

  const trackHeatmapView = useMemo(
    () => (filters: Partial<FilterState>) => {
      trackEvent.mutate({
        sessionId: getSessionId(),
        eventType: 'map_interaction',
        eventData: {
          type: 'heatmap_view',
          filters,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [trackEvent],
  );

  const trackSuburbSelect = useMemo(
    () => (suburb: SuburbPriceData) => {
      trackEvent.mutate({
        sessionId: getSessionId(),
        eventType: 'map_interaction',
        eventData: {
          type: 'suburb_select',
          suburbId: suburb.suburbId,
          suburbName: suburb.suburbName,
          timestamp: new Date().toISOString(),
        },
        suburbId: suburb.suburbId,
      });
    },
    [trackEvent],
  );

  return {
    trackHeatmapView,
    trackSuburbSelect,
  };
}

// Helper function with proper typing
function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}
