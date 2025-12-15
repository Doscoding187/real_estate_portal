import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2 } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

export interface TabbedListingSectionProps<T> {
  title: string;
  description?: string;
  tabs: { label: string; value: string }[];
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  filterItem: (item: T, tabValue: string) => boolean;
  viewAllLink?: (tabValue: string) => string;
  viewAllText?: string;
  emptyMessage?: string;
  className?: string;
}

export function TabbedListingSection<T>({
  title,
  description,
  tabs,
  items,
  renderItem,
  filterItem,
  viewAllLink,
  viewAllText = "Explore More",
  emptyMessage = "No properties available in this category at the moment",
  className
}: TabbedListingSectionProps<T>) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.value || '');

  // Filter items for the current tab
  const filteredItems = useMemo(() => {
    return items.filter(item => filterItem(item, activeTab));
  }, [items, activeTab, filterItem]);

  // Find label for active tab for the button text
  const activeTabLabel = tabs.find(t => t.value === activeTab)?.label || activeTab;

  if (!tabs.length) return null;

  return (
    <div className={cn("py-16 bg-white", className)}>
      <div className="container">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-base max-w-3xl">
              {description}
            </p>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap justify-start gap-2 mb-8 bg-transparent p-0 h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border bg-white text-muted-foreground border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-md data-[state=active]:scale-105"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 animate-in fade-in-50 duration-500">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredItems.map((item, index) => (
                  <div key={index} className="h-full">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-slate-200">
                <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground">
                  {emptyMessage}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {viewAllLink && (
          <div className="text-center mt-8">
            <Link href={viewAllLink(activeTab)}>
              <Button 
                variant="outline" 
                size="lg" 
                className="gap-2 group border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              >
                {viewAllText} {activeTabLabel}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
