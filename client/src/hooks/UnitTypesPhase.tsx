import React, { useState } from 'react';
import { useDevelopmentWizard, UnitType } from '@/hooks/useDevelopmentWizard';
import { Plus, Trash2, Bed, Bath, Car, Ruler, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export const UnitTypesPhase: React.FC = () => {
  const { 
    unitTypes, 
    addUnitType, 
    removeUnitType, 
    updateUnitType,
    validatePhase,
    setPhase 
  } = useDevelopmentWizard();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleAddUnit = () => {
    addUnitType({
      name: 'New Unit Type',
      bedrooms: 1,
      bathrooms: 1,
      parking: '1',
      basePriceFrom: 0,
      amenities: { standard: [], additional: [] },
      specifications: {
        builtInFeatures: { builtInWardrobes: true, tiledFlooring: true, graniteCounters: false },
        finishes: {},
        electrical: { prepaidElectricity: true }
      },
      baseMedia: { gallery: [], floorPlans: [], renders: [] },
      specs: [],
      displayOrder: unitTypes.length,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleContinue = () => {
    const result = validatePhase(4);
    if (result.isValid) {
      setPhase(5);
    } else {
      setErrors(result.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Unit Types</h2>
          <p className="text-gray-500">Define the different types of units available in this development.</p>
        </div>
        <button
          onClick={handleAddUnit}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Unit Type
        </button>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-700 text-sm">
          {errors.join(', ')}
        </div>
      )}

      <div className="space-y-4">
        {unitTypes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <p className="text-gray-500">No unit types added yet. Click "Add Unit Type" to start.</p>
          </div>
        ) : (
          unitTypes.map((unit) => (
            <div key={unit.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
              
              {/* Unit Header / Summary */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer bg-gray-50/50 hover:bg-gray-50"
                onClick={() => toggleExpand(unit.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {unit.bedrooms}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{unit.name || 'Untitled Unit'}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {unit.bedrooms} Bed</span>
                      <span className="flex items-center gap-1"><Bath className="w-3 h-3" /> {unit.bathrooms} Bath</span>
                      <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {unit.parking}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {unit.basePriceFrom > 0 ? `R ${unit.basePriceFrom.toLocaleString()}` : 'Price TBD'}
                    </div>
                    <div className="text-xs text-gray-500">{unit.unitSize || 0} m²</div>
                  </div>
                  {expandedId === unit.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Edit Form */}
              {expandedId === unit.id && (
                <div className="p-6 border-t border-gray-100 space-y-6 bg-white">
                  
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-gray-500">Unit Name</label>
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => updateUnitType(unit.id, { name: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase text-gray-500">Base Price (R)</label>
                      <input
                        type="number"
                        value={unit.basePriceFrom}
                        onChange={(e) => updateUnitType(unit.id, { basePriceFrom: Number(e.target.value) })}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Bedrooms</label>
                      <input
                        type="number"
                        min="0"
                        value={unit.bedrooms}
                        onChange={(e) => updateUnitType(unit.id, { bedrooms: Number(e.target.value) })}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Bathrooms</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={unit.bathrooms}
                        onChange={(e) => updateUnitType(unit.id, { bathrooms: Number(e.target.value) })}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Size (m²)</label>
                      <input
                        type="number"
                        value={unit.unitSize}
                        onChange={(e) => updateUnitType(unit.id, { unitSize: Number(e.target.value) })}
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Parking</label>
                      <select
                        value={unit.parking}
                        onChange={(e) => updateUnitType(unit.id, { parking: e.target.value as any })}
                        className="w-full p-2 border rounded-lg text-sm bg-white"
                      >
                        <option value="none">None</option>
                        <option value="1">1 Bay</option>
                        <option value="2">2 Bays</option>
                        <option value="garage">Garage</option>
                      </select>
                    </div>
                  </div>

                  {/* Features Toggles */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Included Features</h4>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'builtInWardrobes', label: 'Built-in Wardrobes' },
                        { key: 'tiledFlooring', label: 'Tiled Flooring' },
                        { key: 'graniteCounters', label: 'Granite Tops' },
                      ].map((feature) => {
                        const isChecked = unit.specifications.builtInFeatures[feature.key as keyof typeof unit.specifications.builtInFeatures];
                        return (
                          <button
                            key={feature.key}
                            onClick={() => updateUnitType(unit.id, {
                              specifications: {
                                ...unit.specifications,
                                builtInFeatures: {
                                  ...unit.specifications.builtInFeatures,
                                  [feature.key]: !isChecked
                                }
                              }
                            })}
                            className={`
                              flex items-center gap-2 px-3 py-2 rounded-full text-sm border transition-all
                              ${isChecked 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }
                            `}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                            {feature.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-4 border-t border-gray-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this unit type?')) {
                          removeUnitType(unit.id);
                        }
                      }}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Unit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          Continue to Finalisation
        </button>
      </div>
    </div>
  );
};