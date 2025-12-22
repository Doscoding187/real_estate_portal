
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Search, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation } from 'wouter'; 
import { cn } from '@/lib/utils';

// Simplified property types for the quick search
const PROPERTY_TYPES = [
  { value: 'all', label: 'All Property Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'villa', label: 'Villa' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land / Plot' },
];

interface SearchStageProps {
  locationName: string;
  locationSlug: string; 
  totalListings?: number;
}

export function SearchStage({ locationName, locationSlug, totalListings }: SearchStageProps) {
  const [activeTab, setActiveTab] = useState('buy');
  const [propertyType, setPropertyType] = useState('all');
  const [_, setLocation] = useLocation();

  const handleSearch = () => {
    // 2025 Architecture: Search Input => Transaction Intent (SRP)
    // Route to Canonical SRP: /property-for-sale/{locationSlug}
    
    // Base Path
    let targetPath = `/property-for-sale/${locationSlug}`;
    const params = new URLSearchParams();

    // Map Tabs/Type to Query Params
    if (activeTab === 'rent') {
        targetPath = `/property-to-rent/${locationSlug}`;
    }
    // 'buy' is default /property-for-sale

    if (propertyType !== 'all') {
      params.append('propertyType', propertyType);
    }
    
    // Future: Handle 'new_development' tab -> /new-developments
     if (activeTab === 'new_development') {
        targetPath = `/new-developments`;
        // We might need a city/province filter for devs?
        // for now just route root
    }

    // Force Transaction Mode
    params.append('view', 'list');

    const queryString = params.toString();
    setLocation(`${targetPath}${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <Card className="w-full shadow-2xl border-0 overflow-hidden bg-white/95 backdrop-blur-sm">
        {/* Top Tabs: Buy / Rent / Commercial / Land */}
        <div className="bg-slate-50 border-b border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start h-12 bg-transparent p-0 gap-6 px-6">
                    <TabsTrigger 
                        value="buy" 
                        className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium"
                    >
                        Buy
                    </TabsTrigger>
                    <TabsTrigger 
                        value="rent" 
                        className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium"
                    >
                        Rent
                    </TabsTrigger>
                    <TabsTrigger 
                        value="commercial" 
                        className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium"
                    >
                        Commercial
                    </TabsTrigger>
                     <TabsTrigger 
                        value="new_development" 
                        className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 font-medium"
                    >
                        New Developments
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

      <CardContent className="p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
            
            {/* 1. Location Input (Locked) */}
            <div className="relative flex-1 w-full">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <MapPin className="h-5 w-5" />
                </div>
                {/* Visual "Input" that looks clickable/editable to show context but is actually locked/prefilled */}
                <div className="flex h-12 w-full items-center rounded-md border border-input bg-slate-50 px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-700 font-semibold cursor-default">
                    {locationName}
                </div>
                {/* Optional 'Change' link could go here if we wanted to allow swapping location */}
            </div>

            {/* 2. Property Type Selector */}
            <div className="w-full md:w-[280px]">
                <Select value={propertyType} onValueChange={setPropertyType}>
                    <SelectTrigger className="h-12 bg-white">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">Type:</span>
                            <SelectValue placeholder="All types" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {PROPERTY_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                                {type.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 3. Search Button (CTA) */}
            <Button 
                onClick={handleSearch} 
                size="lg" 
                className="w-full md:w-auto h-12 px-8 bg-primary hover:bg-primary/90 text-white font-semibold text-lg shadow-lg"
            >
                <Search className="mr-2 h-5 w-5" />
                Search
                {totalListings ? <span className="ml-1 opacity-90 text-sm font-normal">({totalListings})</span> : null}
            </Button>
        </div>

        {/* Optional: Keyword tags or quick links below input */}
        <div className="mt-4 flex gap-2 text-sm text-slate-500 items-center">
            <span className="font-medium text-slate-700">Popular:</span> 
            {/* Hardcoded or dynamic pills based on location */}
            <span className="cursor-pointer hover:text-primary underline decoration-dotted">3 Bedroom House</span>
            <span>•</span>
            <span className="cursor-pointer hover:text-primary underline decoration-dotted">Apartment under 2M</span>
        </div>

      </CardContent>
    </Card>
  );
}
