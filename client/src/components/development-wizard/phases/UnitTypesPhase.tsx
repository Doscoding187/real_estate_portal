import React, { useState } from 'react';
import { useDevelopmentWizard, type UnitType } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, Plus, Edit2, BedDouble, Bath, Car, Ruler } from 'lucide-react';
import { toast } from 'sonner';

export function UnitTypesPhase() {
  const { 
    unitTypes, 
    addUnitType, 
    updateUnitType, 
    removeUnitType, 
    setPhase,
    validatePhase 
  } = useDevelopmentWizard();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UnitType>>({
    name: '',
    bedrooms: 1,
    bathrooms: 1,
    parking: '1',
    unitSize: 0,
    basePriceFrom: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      bedrooms: 1,
      bathrooms: 1,
      parking: '1',
      unitSize: 0,
      basePriceFrom: 0,
    });
    setEditingId(null);
  };

  const handleOpenDialog = (unit?: UnitType) => {
    if (unit) {
      setEditingId(unit.id);
      setFormData({
        name: unit.name,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        parking: unit.parking,
        unitSize: unit.unitSize,
        basePriceFrom: unit.basePriceFrom,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.basePriceFrom) {
      toast.error('Please fill in required fields');
      return;
    }

    const baseData = {
      name: formData.name,
      bedrooms: formData.bedrooms || 0,
      bathrooms: formData.bathrooms || 0,
      parking: (formData.parking || 'none') as any,
      unitSize: formData.unitSize || 0,
      basePriceFrom: formData.basePriceFrom,
      // Defaults for complex objects required by store type
      amenities: { standard: [], additional: [] },
      specifications: {
        builtInFeatures: { builtInWardrobes: true, tiledFlooring: true, graniteCounters: false },
        finishes: {},
        electrical: { prepaidElectricity: true }
      },
      baseMedia: { gallery: [], floorPlans: [], renders: [] },
      specs: [],
      displayOrder: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (editingId) {
      updateUnitType(editingId, formData);
      toast.success('Unit type updated');
    } else {
      addUnitType(baseData);
      toast.success('Unit type added');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleNext = () => {
    const { isValid, errors } = validatePhase(4);
    if (isValid) {
      setPhase(5);
    } else {
      errors.forEach(e => toast.error(e));
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Unit Types</h2>
          <p className="text-slate-600">Define the different types of units available in this development.</p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300 h-11"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Unit Type
        </Button>
      </div>

      {unitTypes.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <Plus className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Unit Types Yet</h3>
            <p className="text-slate-600 mb-6 max-w-md">
              Start by adding your first unit type to define the inventory for this development.
            </p>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Unit Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unitTypes.map((unit) => (
            <Card key={unit.id} className="group hover:shadow-xl transition-all duration-300 border-slate-200/60 hover:border-blue-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-start text-lg">
                  <span className="truncate font-semibold text-slate-900" title={unit.name}>{unit.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-blue-50" 
                      onClick={() => handleOpenDialog(unit)}
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-red-50" 
                      onClick={() => removeUnitType(unit.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="p-1.5 bg-blue-50 rounded">
                      <BedDouble className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{unit.bedrooms} Beds</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="p-1.5 bg-blue-50 rounded">
                      <Bath className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{unit.bathrooms} Baths</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="p-1.5 bg-blue-50 rounded">
                      <Car className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="capitalize font-medium">{unit.parking}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <div className="p-1.5 bg-blue-50 rounded">
                      <Ruler className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{unit.unitSize}m²</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Starting From</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(unit.basePriceFrom)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-8 border-t">
        <Button variant="outline" onClick={() => setPhase(3)}>Back</Button>
        <Button onClick={handleNext} disabled={unitTypes.length === 0}>Continue</Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Unit Type' : 'Add Unit Type'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Unit Type Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Type A - 2 Bed Simplex" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input 
                  id="bedrooms" 
                  type="number" 
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({...formData, bedrooms: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input 
                  id="bathrooms" 
                  type="number" 
                  min="0"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({...formData, bathrooms: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="size">Unit Size (m²)</Label>
                <Input 
                  id="size" 
                  type="number" 
                  min="0"
                  value={formData.unitSize}
                  onChange={(e) => setFormData({...formData, unitSize: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="parking">Parking</Label>
                <Select 
                  value={formData.parking} 
                  onValueChange={(val) => setFormData({...formData, parking: val as any})}
                >
                  <SelectTrigger>
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Base Price (ZAR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">R</span>
                <Input 
                  id="price" 
                  type="number" 
                  min="0"
                  className="pl-8"
                  value={formData.basePriceFrom}
                  onChange={(e) => setFormData({...formData, basePriceFrom: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {editingId ? 'Save Changes' : 'Add Unit Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button 
          variant="outline" 
          onClick={() => setPhase(3)}
          className="px-6 h-11 border-slate-300"
        >
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
          Continue to Finalisation
        </Button>
      </div>
    </div>
  );
}