import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Building2, Home, Trees, Briefcase } from 'lucide-react';

export const ClassificationPhase: React.FC = () => {
  const { classification, setClassification, validatePhase, setPhase } = useDevelopmentWizard();

  const [errors, setErrors] = useState<string[]>([]);

  const handleContinue = () => {
    const result = validatePhase(2);
    if (result.isValid) {
      setErrors([]);
      setPhase(3);
    } else {
      setErrors(result.errors);
    }
  };

  const types = [
    { id: 'residential', label: 'Residential', icon: Home, desc: 'Apartments, Estates, Housing' },
    {
      id: 'commercial',
      label: 'Commercial',
      icon: Briefcase,
      desc: 'Office Parks, Retail, Industrial',
    },
    {
      id: 'mixed',
      label: 'Mixed Use',
      icon: Building2,
      desc: 'Combination of residential & commercial',
    },
    { id: 'land', label: 'Vacant Land', icon: Trees, desc: 'Undeveloped plots or farm land' },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Classification</h2>
        <p className="text-gray-500">What type of development is this?</p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 text-sm">
          {errors.join(', ')}
        </div>
      )}

      {/* Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {types.map(t => {
          const Icon = t.icon;
          const isSelected = classification.type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setClassification({ type: t.id as any })}
              className={`
                flex items-start gap-4 p-6 rounded-xl border-2 text-left transition-all
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <div
                className={`p-3 rounded-lg ${isSelected ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {t.label}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{t.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Details */}
      <section className="space-y-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Ownership Type</label>
            <select
              value={classification.ownership}
              onChange={e => setClassification({ ownership: e.target.value as any })}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">Select Ownership...</option>
              <option value="sectional-title">Sectional Title</option>
              <option value="full-title">Full Title / Freehold</option>
              <option value="leasehold">Leasehold</option>
              <option value="share-block">Share Block</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Sub-Type / Style</label>
            <input
              type="text"
              value={classification.subType}
              onChange={e => setClassification({ subType: e.target.value })}
              placeholder="e.g. Security Estate, High-Rise"
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </section>

      <div className="flex justify-between pt-6 border-t border-gray-100">
        <button
          onClick={() => setPhase(1)}
          className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
