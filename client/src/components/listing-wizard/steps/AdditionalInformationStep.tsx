import React from 'react';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { CheckCircle2, Home, Building2, Wheat, Map, Store, Users, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-start justify-between gap-4 p-4 rounded-xl border-2 transition-all',
        checked
          ? 'border-emerald-400 bg-emerald-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <div className="space-y-1">
        <p className="font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
      <div className={cn(
        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
        checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300',
      )}>
        {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
      </div>
    </button>
  );
}

export default function AdditionalInformationStep() {
  const store = useListingWizardStore();

  const propertyType = store.propertyType;
  const details = store.propertyDetails || {};
  const additionalInfo = store.additionalInfo || {};

  const updateDetail = (key: string, value: any) => {
    store.setPropertyDetails({
      ...(details as any),
      [key]: value,
    });
  };

  const updateAdditional = (key: string, value: any) => {
    store.setAdditionalInfo({
      ...(additionalInfo as any),
      [key]: value,
    });
  };

  const renderContent = () => {
    switch (propertyType) {
      case 'apartment':
        return (
          <div className="space-y-8">
            {/* Residential Section */}
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Apartment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: '2' },
                  { key: 'bathrooms', label: 'Bathrooms', type: 'number', placeholder: '2' },
                  { key: 'unitSizeM2', label: 'Unit Size (m²)', type: 'number', placeholder: '85' },
                  { key: 'floorLevel', label: 'Floor Level', type: 'number', placeholder: '3' },
                  { key: 'parkingBays', label: 'Parking Bays', type: 'number', placeholder: '1' },
                  { key: 'petFriendly', label: 'Pet Friendly', type: 'select', options: ['Yes', 'No', 'Cats only'] },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Amenities Section */}
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Amenities
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: 'hasPool', label: 'Swimming Pool', desc: 'Private or communal pool' },
                  { key: 'hasGym', label: 'Gym', desc: 'On-site fitness facility' },
                  { key: 'hasSecurity', label: '24hr Security', desc: 'Guarded access or CCTV' },
                  { key: 'hasBalcony', label: 'Balcony', desc: 'Private outdoor space' },
                  { key: 'hasAircon', label: 'Air Conditioning', desc: 'Split unit or central AC' },
                  { key: 'hasFibre', label: 'Fibre Ready', desc: 'Internet connectivity' },
                ].map((item) => (
                  <ToggleField
                    key={item.key}
                    label={item.label}
                    description={item.desc}
                    checked={Boolean((details as any)[item.key])}
                    onChange={(value) => updateDetail(item.key, value)}
                  />
                ))}
              </div>
            </section>
          </div>
        );

      case 'house':
        return (
          <div className="space-y-8">
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                House Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'bedrooms', label: 'Bedrooms', type: 'number', placeholder: '3' },
                  { key: 'bathrooms', label: 'Bathrooms', type: 'number', placeholder: '2' },
                  { key: 'houseAreaM2', label: 'House Area (m²)', type: 'number', placeholder: '180' },
                  { key: 'erfSizeM2', label: 'Erf Size (m²)', type: 'number', placeholder: '500' },
                  { key: 'garages', label: 'Garages', type: 'number', placeholder: '2' },
                  { key: 'storeys', label: 'Storeys', type: 'number', placeholder: '2' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      value={(details as any)[field.key] || ''}
                      onChange={(e) => updateDetail(field.key, Number(e.target.value))}
                      placeholder={field.placeholder}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Features
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { key: 'hasPool', label: 'Pool', desc: 'Private swimming pool' },
                  { key: 'hasGarden', label: 'Garden', desc: 'Landscaped garden' },
                  { key: 'hasBorehole', label: 'Borehole', desc: 'Water backup system' },
                  { key: 'hasSolar', label: 'Solar', desc: 'Solar panels or inverter' },
                  { key: 'hasFlatlet', label: 'Flatlet', desc: 'Separate granny flat' },
                  { key: 'hasAlarm', label: 'Alarm System', desc: 'Armed response ready' },
                ].map((item) => (
                  <ToggleField
                    key={item.key}
                    label={item.label}
                    description={item.desc}
                    checked={Boolean((details as any)[item.key])}
                    onChange={(value) => updateDetail(item.key, value)}
                  />
                ))}
              </div>
            </section>
          </div>
        );

      case 'farm':
        return (
          <div className="space-y-8">
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wheat className="w-5 h-5 text-blue-600" />
                Farm Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'totalSizeHa', label: 'Total Size (Ha)', type: 'number', placeholder: '50' },
                  { key: 'arableLandHa', label: 'Arable Land (Ha)', type: 'number', placeholder: '20' },
                  { key: 'grazingLandHa', label: 'Grazing Land (Ha)', type: 'number', placeholder: '30' },
                  { key: 'waterRights', label: 'Water Rights', type: 'select', options: ['Yes', 'No', 'Partial'] },
                  { key: 'fencing', label: 'Fencing', type: 'select', options: ['Fully fenced', 'Partially fenced', 'Not fenced'] },
                  { key: 'irrigationType', label: 'Irrigation', type: 'text', placeholder: 'Drip irrigation, centre pivot...' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        );

      case 'land':
        return (
          <div className="space-y-8">
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Map className="w-5 h-5 text-blue-600" />
                Plot Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'landSizeM2', label: 'Land Size (m²)', type: 'number', placeholder: '1000' },
                  { key: 'landSizeHa', label: 'Land Size (Ha)', type: 'number', placeholder: '1' },
                  { key: 'zoning', label: 'Zoning', type: 'select', options: ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use'] },
                  { key: 'serviced', label: 'Serviced', type: 'select', options: ['Yes', 'No', 'Partially'] },
                  { key: 'approvedPlans', label: 'Approved Plans', type: 'select', options: ['Yes', 'No', 'In progress'] },
                  { key: 'buildingRestrictions', label: 'Restrictions', type: 'text', placeholder: 'Building lines, height restrictions...' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        );

      case 'commercial':
        return (
          <div className="space-y-8">
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                Commercial Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'floorAreaM2', label: 'Floor Area (m²)', type: 'number', placeholder: '500' },
                  { key: 'parkingRatio', label: 'Parking Ratio', type: 'number', placeholder: '1 per 100m²' },
                  { key: 'loadingDocks', label: 'Loading Docks', type: 'number', placeholder: '2' },
                  { key: 'commercialType', label: 'Type', type: 'select', options: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed Use'] },
                  { key: 'powerSupply', label: 'Power Supply', type: 'number', placeholder: 'kVA available' },
                  { key: 'leaseTerms', label: 'Lease Terms', type: 'text', placeholder: 'Minimum lease period...' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        );

      case 'shared_living':
        return (
          <div className="space-y-8">
            <section className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Shared Living Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'roomsAvailable', label: 'Rooms Available', type: 'number', placeholder: '3' },
                  { key: 'minimumStayMonths', label: 'Minimum Stay (months)', type: 'number', placeholder: '1' },
                  { key: 'billsIncluded', label: 'Bills Included', type: 'select', options: ['All inclusive', 'Partial', 'Tenant pays own'] },
                  { key: 'furnishingStatus', label: 'Furnishing', type: 'select', options: ['Furnished', 'Semi-furnished', 'Unfurnished'] },
                  { key: 'petPolicy', label: 'Pet Policy', type: 'select', options: ['Allowed', 'Cats only', 'No pets', 'By arrangement'] },
                  { key: 'studentFriendly', label: 'Student Friendly', type: 'select', options: ['Yes', 'No'] },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(details as any)[field.key] || ''}
                        onChange={(e) => updateDetail(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        );

      default:
        return (
          <div className="p-8 border-2 border-dashed border-slate-300 rounded-xl text-center">
            <p className="text-slate-500">Select a property type first to see relevant fields.</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-slate-900">Additional Information</h3>
        <p className="text-sm text-slate-500 mt-1">
          Add the details that make your property stand out
        </p>
      </div>

      {/* Property type context */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
          Current property type
        </p>
        <p className="text-sm text-blue-900 capitalize">
          {propertyType ? propertyType.replace(/_/g, ' ') : 'Not selected yet'}
        </p>
      </div>

      {renderContent()}
    </div>
  );
}