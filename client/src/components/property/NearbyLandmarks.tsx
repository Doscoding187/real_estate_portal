import React, { useState } from 'react';
import { 
  MapPin, 
  School, 
  Heart, 
  Bus, 
  ShoppingBag, 
  Ticket, 
  Footprints,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GooglePropertyMap } from '@/components/maps/GooglePropertyMap';

interface NearbyLandmarksProps {
  property: {
    id: number;
    title: string;
    latitude: string | number;
    longitude: string | number;
  };
}

const POI_DATA = {
  Education: [
    { name: 'St Peter\'s College', distance: '2.5 km' },
    { name: 'University of Johannesburg', distance: '5.1 km' },
    { name: 'Sandton Primary School', distance: '1.2 km' },
  ],
  Health: [
    { name: 'Sandton Mediclinic', distance: '3.4 km' },
    { name: 'Morningside Hospital', distance: '4.2 km' },
  ],
  Transportation: [
    { name: 'Gautrain Sandton Station', distance: '1.5 km' },
    { name: 'Bus Stop (Rivonia Rd)', distance: '0.3 km' },
  ],
  Shopping: [
    { name: 'Sandton City Mall', distance: '1.8 km' },
    { name: 'The Marc', distance: '1.2 km' },
  ],
  Entertainment: [
    { name: 'Ster-Kinekor Sandton', distance: '1.8 km' },
    { name: 'Theatre on the Square', distance: '1.6 km' },
  ],
};

const TABS = [
  { id: 'Education', icon: School, label: 'Education' },
  { id: 'Health', icon: Heart, label: 'Health' },
  { id: 'Transportation', icon: Bus, label: 'Transportation' },
  { id: 'Shopping', icon: ShoppingBag, label: 'Shopping' },
  { id: 'Entertainment', icon: Ticket, label: 'Entertainment' },
];

export function NearbyLandmarks({ property }: NearbyLandmarksProps) {
  const [activeTab, setActiveTab] = useState('Education');

  const activePOIs = POI_DATA[activeTab as keyof typeof POI_DATA] || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 pb-0">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Nearby Landmarks</h3>
        
        {/* Map Preview */}
        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-[240px] mb-6 group">
          <GooglePropertyMap
            center={{ 
              lat: typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude || 0, 
              lng: typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude || 0 
            }}
            zoom={14}
            minimal={true}
            properties={[
              {
                id: property.id,
                title: property.title,
                latitude: typeof property.latitude === 'string' ? parseFloat(property.latitude) : property.latitude || 0,
                longitude: typeof property.longitude === 'string' ? parseFloat(property.longitude) : property.longitude || 0,
                price: 0,
                currency: 'ZAR',
                address: '',
                image: '',
                bed: 0,
                bath: 0,
                size: 0
              }
            ]}
          />
          
          {/* Floating Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 shadow-lg flex items-center gap-2 pointer-events-auto transition-transform group-hover:scale-105"
            >
              <MapPin className="h-4 w-4" />
              View on Map
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'bg-orange-50 border-orange-500 text-orange-700' 
                    : 'bg-white border-orange-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/50'
                  }
                `}
              >
                <MapPin className={`h-3.5 w-3.5 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* POI List */}
      <div className="px-6">
        <div className="space-y-0">
          {activePOIs.map((poi, index) => (
            <div 
              key={index} 
              className={`flex items-center justify-between py-4 ${index !== activePOIs.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="text-slate-700 font-medium">{poi.name}</span>
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-sm font-semibold text-slate-900">{poi.distance}</span>
                <Footprints className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View More Button */}
      <div className="p-6 pt-2 flex justify-center">
        <Button 
          variant="outline" 
          className="rounded-full border-orange-200 text-slate-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 px-8"
        >
          View more
        </Button>
      </div>
    </div>
  );
}
