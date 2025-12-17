import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';
import { Building, Home } from 'lucide-react';
import type { UnitType } from '@/hooks/useDevelopmentWizard';

interface BasicInfoTabProps {
  formData: Partial<UnitType>;
  updateFormData: (updates: Partial<UnitType>) => void;
  classification?: { type: string };
}

export function BasicInfoTab({ formData, updateFormData, classification }: BasicInfoTabProps) {
  const isMixedUse = classification?.type === 'mixed';

  return (
    <div className="space-y-6">
      {/* Unit Type Name */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <div className="flex justify-between items-start mb-4">
           <h3 className="text-lg font-semibold text-slate-900">Unit Identification</h3>
           {isMixedUse && (
             <div className="flex flex-col items-end gap-2">
                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Usage Type</Label>
                <ToggleGroup 
                  type="single" 
                  value={formData.usageType || 'residential'}
                  onValueChange={(val) => val && updateFormData({ usageType: val as any })}
                  className="bg-white border rounded-lg p-1"
                >
                   <ToggleGroupItem value="residential" aria-label="Residential" className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700">
                      <Home className="w-4 h-4 mr-2" /> Residential
                   </ToggleGroupItem>
                   <ToggleGroupItem value="commercial" aria-label="Commercial" className="data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700">
                      <Building className="w-4 h-4 mr-2" /> Commercial
                   </ToggleGroupItem>
                </ToggleGroup>
             </div>
           )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="label" className="text-sm font-medium">
              Unit Type Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="label"
              placeholder='e.g., "2 Bedroom Apartment", "60m² Simplex", "Bachelor Studio"'
              value={formData.label || ''}
              onChange={e => updateFormData({ label: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              Give this unit type a clear, descriptive name
            </p>
          </div>
        </div>
      </Card>

      {/* Basic Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bedrooms" className="text-sm font-medium">
              Bedrooms <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bedrooms"
              type="number"
              min="0"
              value={formData.bedrooms || 0}
              onChange={e => updateFormData({ bedrooms: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bathrooms" className="text-sm font-medium">
              Bathrooms <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bathrooms"
              type="number"
              min="0"
              step="0.5"
              value={formData.bathrooms || 0}
              onChange={e => updateFormData({ bathrooms: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Floor Size */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Size Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="unitSize" className="text-sm font-medium">
              Floor Size (m²)
            </Label>
            <Input
              id="unitSize"
              type="number"
              min="0"
              placeholder="e.g., 85"
              value={formData.unitSize || ''}
              onChange={e => {
                const val = parseInt(e.target.value);
                updateFormData({ unitSize: isNaN(val) ? undefined : val });
              }}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">Internal living area</p>
          </div>

          <div>
            <Label htmlFor="yardSize" className="text-sm font-medium">
              Yard/Garden Size (m²)
            </Label>
            <Input
              id="yardSize"
              type="number"
              min="0"
              placeholder="e.g., 250"
              value={formData.yardSize || ''}
              onChange={e => {
                const val = parseInt(e.target.value);
                updateFormData({ yardSize: isNaN(val) ? undefined : val });
              }}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">For freestanding properties</p>
          </div>
        </div>
      </Card>

      {/* Price Range */}
      <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="priceFrom" className="text-sm font-medium">
              Min Price (R) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="priceFrom"
              type="number"
              min="0"
              placeholder="e.g., 1500000"
              value={formData.priceFrom || ''}
              onChange={e => updateFormData({ priceFrom: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="priceTo" className="text-sm font-medium">
              Max Price (R)
            </Label>
            <Input
              id="priceTo"
              type="number"
              min="0"
              placeholder="e.g., 1800000"
              value={formData.priceTo || ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                updateFormData({ priceTo: isNaN(val) ? undefined : val });
              }}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">Optional - for price ranges</p>
          </div>
        </div>
      </Card>

      {/* Parking */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Parking</h3>
        <div>
          <Label htmlFor="parking" className="text-sm font-medium">
            Parking Type
          </Label>
          <Select
            value={formData.parking || 'none'}
            onValueChange={value => updateFormData({ parking: value as any })}
          >
            <SelectTrigger id="parking" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="1">1 Bay</SelectItem>
              <SelectItem value="2">2 Bays</SelectItem>
              <SelectItem value="carport">Carport</SelectItem>
              <SelectItem value="garage">Garage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Additional Optional Fields */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="availableUnits" className="text-sm font-medium">
              Available Units <span className="text-red-500">*</span>
            </Label>
            <Input
              id="availableUnits"
              type="number"
              min="0"
              placeholder="e.g., 12"
              value={formData.availableUnits || 0}
              onChange={e => updateFormData({ availableUnits: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="completionDate" className="text-sm font-medium">
              Completion Date
            </Label>
            <Input
              id="completionDate"
              type="date"
              value={formData.completionDate || ''}
              onChange={e => updateFormData({ completionDate: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="depositRequired" className="text-sm font-medium">
              Deposit Required (R)
            </Label>
            <Input
              id="depositRequired"
              type="number"
              min="0"
              placeholder="e.g., 50000"
              value={formData.depositRequired || ''}
              onChange={e => {
                const val = parseFloat(e.target.value);
                updateFormData({ depositRequired: isNaN(val) ? undefined : val });
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="internalNotes" className="text-sm font-medium">
              Internal Notes
            </Label>
            <Textarea
              id="internalNotes"
              placeholder="Any internal notes (hidden from buyers)"
              value={formData.internalNotes || ''}
              onChange={e => updateFormData({ internalNotes: e.target.value })}
              className="mt-1 h-20"
            />
            <p className="text-xs text-slate-500 mt-1">These notes are for internal use only</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
