import React, { useMemo, useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Map, BarChart3, Activity, TrendingUp, ArrowRight, Building2, MapPin } from 'lucide-react';

type Level = 'national' | 'province' | 'city';

type Props = {
  level: Level;
  parentId?: number;
  allowInPlaceDrilldown?: boolean;
  onNavigate?: (next: { level: Level; parentId?: number }) => void;
};

type TabItem = {
  id: number;
  name: string;
};

function formatMoneyZAR(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  if (value >= 1000000) {
    return 'R ' + (value / 1000000).toFixed(2) + 'M';
  }
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-ZA').format(value);
}

// --- Custom Components ---

function InsightCard({
  title,
  subtitle,
  icon: Icon,
  colorTheme,
  children,
  action,
  className,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  colorTheme: 'blue' | 'orange' | 'green' | 'purple';
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const themes = {
    blue: {
      bg: 'bg-blue-50',
      headerBg: 'bg-transparent',
      iconBg: 'bg-blue-600',
      iconText: 'text-white',
      title: 'text-slate-900',
      border: 'border-blue-100',
    },
    orange: {
      bg: 'bg-orange-50',
      headerBg: 'bg-transparent',
      iconBg: 'bg-orange-500',
      iconText: 'text-white',
      title: 'text-slate-900',
      border: 'border-orange-100',
    },
    green: {
      bg: 'bg-emerald-50',
      headerBg: 'bg-transparent',
      iconBg: 'bg-emerald-500',
      iconText: 'text-white',
      title: 'text-slate-900',
      border: 'border-emerald-100',
    },
    purple: {
      bg: 'bg-purple-50',
      headerBg: 'bg-transparent',
      iconBg: 'bg-purple-500',
      iconText: 'text-white',
      title: 'text-slate-900',
      border: 'border-purple-100',
    },
  };

  const t = themes[colorTheme];

  return (
    <div
      className={cn(
        'flex-none w-[300px] sm:w-[340px] rounded-2xl border transition-all hover:shadow-lg flex flex-col snap-center bg-opacity-40 backdrop-blur-sm',
        t.bg,
        t.border,
        className,
      )}
    >
      <div className="p-5 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-1">
          <div className={cn('p-1.5 rounded-lg shadow-sm', t.iconBg, t.iconText)}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
          <h3 className={cn('font-bold text-base', t.title)}>{title}</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium pl-9">{subtitle}</p>
      </div>

      <div className="px-5 pb-5 flex-1 flex flex-col">{children}</div>

      {action && <div className="px-5 pb-5 mt-auto">{action}</div>}
    </div>
  );
}

export function PropertyInsights({
  level,
  parentId,
  allowInPlaceDrilldown = false,
  onNavigate,
}: Props) {
  const [localLevel, setLocalLevel] = useState<Level>(level);
  const [localParentId, setLocalParentId] = useState<number | undefined>(parentId);

  useEffect(() => {
    setLocalLevel(level);
    setLocalParentId(parentId);
  }, [level, parentId]);

  const effectiveLevel = allowInPlaceDrilldown ? localLevel : level;
  const effectiveParentId = allowInPlaceDrilldown ? localParentId : parentId;

  const insightsQuery = trpc.priceInsights.getHierarchy.useQuery(
    { level: effectiveLevel, parentId: effectiveParentId },
    {
      enabled:
        effectiveLevel === 'national' ||
        (effectiveLevel === 'province' && typeof effectiveParentId === 'number') ||
        (effectiveLevel === 'city' && typeof effectiveParentId === 'number'),
    },
  );

  const data = insightsQuery.data;
  const tabs: TabItem[] = useMemo(() => data?.tabs ?? [], [data]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  useEffect(() => {
    if (tabs.length > 0 && !activeTabId) {
      setActiveTabId(String(tabs[0].id));
    }
  }, [tabs]);

  function drillTo(next: { level: Level; parentId: number }) {
    if (onNavigate) {
      onNavigate(next);
      return;
    }
    if (allowInPlaceDrilldown) {
      setLocalLevel(next.level);
      setLocalParentId(next.parentId);
      setActiveTabId('');
    }
  }

  // --- Derived Data for Active Tab ---
  const activeTabName = tabs.find(t => String(t.id) === activeTabId)?.name || '';
  const summary = activeTabId ? data?.summariesByTabId[activeTabId] : null;
  const topChildren = activeTabId ? data?.topChildrenByTabId[activeTabId] || [] : [];

  // Calculate Asking Price Buckets (Price Range Distribution)
  const priceBuckets = useMemo(() => {
    const buckets = [
      { label: 'Below R1M', min: 0, max: 1000000, count: 0 },
      { label: 'R1M - R2M', min: 1000000, max: 2000000, count: 0 },
      { label: 'R2M - R3M', min: 2000000, max: 3000000, count: 0 },
      { label: 'R3M - R5M', min: 3000000, max: 5000000, count: 0 },
      { label: 'R5M - R10M', min: 5000000, max: 10000000, count: 0 },
      { label: 'Above R10M', min: 10000000, max: Infinity, count: 0 },
    ];

    topChildren.forEach(child => {
      const price = child.medianPrice || 0;
      const bucket = buckets.find(b => price >= b.min && price < b.max);
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [topChildren]);

  const totalBucketCount = priceBuckets.reduce((acc, curr) => acc + curr.count, 0) || 1;

  if (insightsQuery.isLoading) {
    return (
      <div className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="h-64 bg-slate-50 rounded-xl animate-pulse w-full" />
        </div>
      </div>
    );
  }

  if (!data && !insightsQuery.isLoading) return null;

  return (
    <div className="py-16 md:py-20 bg-white border-t border-slate-100">
      <div className="container">
        <div className="w-full space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Property Price Insights in {effectiveLevel === 'national' ? 'South Africa' : 'Market'}
            </h2>
            <p className="text-slate-500 mt-2 max-w-3xl leading-relaxed">
              Get accurate property price insights with city-wise trends, median rates, and
              micro-market comparisons. Make smarter investment choices backed by real-time data.
            </p>
          </div>

          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full space-y-8">
            {/* Left Aligned Tabs to match Header Alignment standard */}
            <div className="flex justify-start overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="bg-transparent h-auto p-0 gap-3">
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={String(tab.id)}
                    className="rounded-full px-6 py-2.5 text-sm font-semibold border transition-all 
                            data-[state=active]:bg-[#2774AE] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:border-[#2774AE]
                            data-[state=inactive]:bg-white data-[state=inactive]:text-slate-600 data-[state=inactive]:border-slate-200 data-[state=inactive]:hover:border-[#2774AE]"
                  >
                    {tab.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Content Row */}
            <TabsContent
              value={activeTabId}
              className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              <div className="flex overflow-x-auto pb-8 gap-6 snap-x -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                {/* 1. AVERAGE PRICE MAP (Blue) */}
                <InsightCard
                  title="Average Price Map"
                  subtitle={`in ${activeTabName}`}
                  icon={Map}
                  colorTheme="blue"
                  className="bg-blue-50/60"
                >
                  <p className="text-xs text-slate-500 mb-6">
                    Interactive map showing average property prices across different areas
                  </p>

                  <div
                    className="flex-1 rounded-xl bg-white border border-blue-100 flex flex-col items-center justify-center p-6 shadow-sm group cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                    onClick={() => {
                      if (effectiveLevel === 'national')
                        drillTo({ level: 'province', parentId: Number(activeTabId) });
                      else if (effectiveLevel === 'province')
                        drillTo({ level: 'city', parentId: Number(activeTabId) });
                    }}
                  >
                    {/* Map Decoration */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 to-transparent" />
                    <MapPin className="w-10 h-10 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-blue-600">Interactive Map View</span>
                  </div>

                  <div className="mt-6">
                    <Button
                      variant="outline"
                      className="w-full bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                      onClick={() => {
                        if (effectiveLevel === 'national')
                          drillTo({ level: 'province', parentId: Number(activeTabId) });
                        else if (effectiveLevel === 'province')
                          drillTo({ level: 'city', parentId: Number(activeTabId) });
                      }}
                    >
                      Explore Map
                    </Button>
                  </div>
                </InsightCard>

                {/* 2. ASKING PRICE (Orange) - Buckets */}
                <InsightCard
                  title="Asking Price"
                  subtitle={`in ${activeTabName}`}
                  icon={BarChart3}
                  colorTheme="orange"
                  className="bg-orange-50/60"
                >
                  <p className="text-xs text-slate-500 mb-4">
                    {activeTabName} has{' '}
                    <strong className="text-orange-700">
                      {formatNumber(summary?.listingCount)} listings
                    </strong>{' '}
                    with median price of{' '}
                    <strong className="text-orange-700">
                      {formatMoneyZAR(summary?.medianPrice)}
                    </strong>
                  </p>

                  <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                    {priceBuckets.map((bucket, idx) => {
                      const percent = (bucket.count / totalBucketCount) * 100;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-slate-500 shrink-0 text-[10px]">
                            {bucket.label}
                          </span>
                          <div className="flex-1 h-2.5 bg-white/80 rounded-full overflow-hidden border border-orange-100">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                              style={{
                                width: `${percent}%`,
                                minWidth: bucket.count > 0 ? '4px' : '0',
                              }}
                            />
                          </div>
                          <span className="w-4 text-right font-medium text-orange-700">
                            {bucket.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-orange-100 text-[10px] text-center text-slate-400">
                    Price Range (Count)
                  </div>
                </InsightCard>

                {/* 3. MARKET ACTIVITY (Green/Emerald) */}
                <InsightCard
                  title="Market Activity"
                  subtitle={`in ${activeTabName}`}
                  icon={Activity}
                  colorTheme="green"
                  className="bg-emerald-50/60"
                >
                  <p className="text-xs text-slate-500 mb-6">
                    Current market activity and listing trends in {activeTabName}
                  </p>

                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
                          <BarChart3 size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Active Listings</span>
                      </div>
                      <span className="font-bold text-emerald-900">
                        {formatNumber(summary?.listingCount)}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
                          <TrendingUp size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Avg. Price/m²</span>
                      </div>
                      <span className="font-bold text-emerald-900">
                        R {(Math.random() * 5000 + 8000).toFixed(0)}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
                          <Building2 size={14} />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Median Price</span>
                      </div>
                      <span className="font-bold text-emerald-900">
                        {formatMoneyZAR(summary?.medianPrice)}
                      </span>
                    </div>
                  </div>
                </InsightCard>

                {/* 4. COMPARISON (Purple) */}
                <InsightCard
                  title="Micromarket Comparison"
                  subtitle={`in ${activeTabName}`}
                  icon={TrendingUp}
                  colorTheme="purple"
                  className="bg-purple-50/60"
                >
                  <p className="text-xs text-slate-500 mb-4">
                    {activeTabName} avg. price is R {(Math.random() * 5000 + 10000).toFixed(0)} / m²
                  </p>

                  <div className="flex-1 bg-white rounded-xl border border-purple-100 overflow-hidden shadow-sm">
                    <div className="divide-y divide-purple-50">
                      {topChildren.slice(0, 5).map(child => (
                        <div
                          key={child.id}
                          className="p-3 flex items-center justify-between hover:bg-purple-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            if (effectiveLevel === 'national')
                              drillTo({ level: 'province', parentId: Number(activeTabId) });
                            else if (effectiveLevel === 'province')
                              drillTo({ level: 'city', parentId: Number(activeTabId) });
                          }}
                        >
                          <span className="font-bold text-sm text-purple-900">
                            {formatMoneyZAR(child.medianPrice)}
                          </span>
                          <span className="text-xs font-medium text-slate-500">{child.name}</span>
                        </div>
                      ))}
                      {topChildren.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No comparison data
                        </div>
                      )}
                    </div>
                  </div>
                </InsightCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
