import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Building2, Home, Wheat, Map, Store, Users } from 'lucide-react';
import type { PropertyType } from '@shared/listing-types';

const propertyTypes: { value: PropertyType; label: string; icon: React.ComponentType<any>; description: string }[] = [
  { value: 'apartment', label: 'Apartment', icon: Building2, description: 'Flats, units, and sectional title properties' },
  { value: 'house', label: 'House', icon: Home, description: 'Freestanding homes with land' },
  { value: 'farm', label: 'Farm', icon: Wheat, description: 'Agricultural properties and farms' },
  { value: 'land', label: 'Land/Plot', icon: Map, description: 'Vacant land and development plots' },
  { value: 'commercial', label: 'Commercial', icon: Store, description: 'Office, retail, industrial properties' },
  { value: 'shared_living', label: 'Shared Living', icon: Users, description: 'Student accommodation, co-living spaces' },
];

export default function PropertyTypeStep() {
  const store = useListingWizardStore();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Property Type</h3>
        <p className="text-sm text-slate-500">What type of property are you listing?</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {propertyTypes.map(({ value, label, icon: Icon, description }) => {
          const isSelected = store.propertyType === value;
          return (
            <button
              key={value}
              onClick={() => store.setPropertyType(value)}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 text-center transition-all duration-200 ${
                isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`p-3 rounded-full ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                <Icon className={`w-8 h-8 ${isSelected ? 'text-blue-600' : 'text-slate-600'}`} />
              </div>
              <div>
                <h4 className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{label}</h4>
                <p className="text-sm text-slate-500 mt-1">{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}