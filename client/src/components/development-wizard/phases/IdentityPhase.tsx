import React, { useRef } from 'react';
import { useDevelopmentWizard, type MediaItem } from '@/hooks/useDevelopmentWizard';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, MapPin, Building2, ArrowLeft, ArrowRight, Calendar, Key, Tag } from 'lucide-react';
import { LocationMapPicker, type LocationData } from '@/components/location/LocationMapPicker';
import { 
  DEVELOPMENT_STATUS_OPTIONS, 
  TRANSACTION_TYPE_OPTIONS, 
  OWNERSHIP_TYPE_OPTIONS 
} from '@/types/wizardTypes';

export function IdentityPhase() {
  const { 
    developmentData, 
    setIdentity, 
    setPhase, 
    validatePhase 
  } = useDevelopmentWizard();
  
  const navigation = useWizardNavigation();

  const handleLocationSelect = (data: LocationData) => {
    setIdentity({
      location: {
        ...developmentData.location,
        address: data.address || developmentData.location.address,
        city: data.city || developmentData.location.city,
        province: data.province || developmentData.location.province,
        suburb: data.suburb || developmentData.location.suburb,
        postalCode: data.postalCode || developmentData.location.postalCode,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
      }
    });
    toast.success('Location updated from map');
  };

  const handleNext = () => {
    const { isValid, errors } = validatePhase(4); 
    if (isValid) {
      setPhase(5); // Continue to Location
    } else {
      errors.forEach(e => toast.error(e));
    }
  };
  
  const handleBack = () => {
    setPhase(3); 
  };

  // Check if current status implies active construction/launch
  const showCompletionDate = ['launching-soon', 'selling'].includes(developmentData.status);

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Identity Section */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Development Identity</CardTitle>
              <CardDescription>Name and describe your development.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name">Development Name <span className="text-red-500">*</span></Label>
              <Input 
                id="name" 
                placeholder="e.g. Sunset Heights" 
                value={developmentData.name}
                onChange={(e) => setIdentity({ name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle / Tagline</Label>
              <Input 
                id="subtitle" 
                placeholder="e.g. Luxury Coastal Living" 
                value={developmentData.subtitle || ''}
                onChange={(e) => setIdentity({ subtitle: e.target.value })}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
             <div className="space-y-2">
                <Label htmlFor="nature">Nature of Development</Label>
                <Select 
                  value={developmentData.nature} 
                  onValueChange={(val: any) => setIdentity({ nature: val })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Development</SelectItem>
                    <SelectItem value="phase">New Phase of Existing</SelectItem>
                    <SelectItem value="extension">Extension / Redevelopment</SelectItem>
                  </SelectContent>
                </Select>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Timeline & Status Section */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardHeader>
           <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Timeline & Status</CardTitle>
              <CardDescription>Current construction status and dates.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="status">Development Status <span className="text-red-500">*</span></Label>
              <Select 
                value={developmentData.status} 
                onValueChange={(val: any) => setIdentity({ status: val })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVELOPMENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {DEVELOPMENT_STATUS_OPTIONS.find(o => o.value === developmentData.status)?.description}
              </p>
            </div>

            {showCompletionDate && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="completionDate">Expected Completion</Label>
                <Input 
                  id="completionDate"
                  type="date"
                  value={developmentData.completionDate ? new Date(developmentData.completionDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setIdentity({ completionDate: e.target.value ? new Date(e.target.value) : null })}
                  className="h-11"
                />
              </div>
            )}
          </div>
          
           {/* Legacy Totals - Keep nearby context */}
           <div className="grid grid-cols-2 gap-5 pt-4 border-t border-slate-100/50">
              <div className="space-y-2">
                <Label htmlFor="totalUnits">Total Units</Label>
                <Input 
                  id="totalUnits"
                  type="number"
                  placeholder="e.g. 120"
                  value={developmentData.totalUnits || ''}
                  onChange={(e) => setIdentity({ totalUnits: parseInt(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalArea">Total Area (m²)</Label>
                <Input 
                  id="totalArea"
                  type="number"
                  placeholder="e.g. 25000"
                  value={developmentData.totalDevelopmentArea || ''}
                  onChange={(e) => setIdentity({ totalDevelopmentArea: parseInt(e.target.value) || undefined })}
                  className="h-11"
                />
              </div>
           </div>
        </CardContent>
      </Card>

      {/* 3. Market Configuration */}
       <Card className="border-slate-200/60 shadow-sm">
        <CardHeader>
           <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Tag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-900">Market Configuration</CardTitle>
              <CardDescription>How this development is being sold.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
           <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                 <Label htmlFor="transactionType">Transaction Type <span className="text-red-500">*</span></Label>
                 <Select 
                   value={developmentData.transactionType} 
                   onValueChange={(val: any) => setIdentity({ transactionType: val })}
                 >
                   <SelectTrigger className="h-11">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {TRANSACTION_TYPE_OPTIONS.map(opt => (
                       <SelectItem key={opt.value} value={opt.value}>
                         {opt.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
              
              <div className="space-y-2">
                 <Label htmlFor="ownershipType">Ownership Type <span className="text-red-500">*</span></Label>
                 <Select 
                   value={developmentData.ownershipType} 
                   onValueChange={(val: any) => setIdentity({ ownershipType: val })}
                 >
                   <SelectTrigger className="h-11">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {OWNERSHIP_TYPE_OPTIONS.map(opt => (
                       <SelectItem key={opt.value} value={opt.value}>
                         {opt.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>
           </div>

           {/* Property Types Multi-Select */}
           <div className="space-y-3 pt-2">
              <Label>Unit Types Available</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                 {['Apartments', 'Houses', 'Townhouses', 'Land'].map((type) => {
                    const isSelected = (developmentData.propertyTypes || []).includes(type.toLowerCase());
                    return (
                       <div 
                         key={type}
                         onClick={() => {
                           const current = developmentData.propertyTypes || [];
                           const val = type.toLowerCase();
                           const newTypes = current.includes(val) 
                             ? current.filter(t => t !== val)
                             : [...current, val];
                           setIdentity({ propertyTypes: newTypes });
                         }}
                         className={`cursor-pointer border rounded-lg p-3 flex items-center gap-2 transition-all ${isSelected ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-slate-50 border-slate-200'}`}
                       >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                          </div>
                          <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{type}</span>
                       </div>
                    );
                 })}
              </div>
           </div>

           {/* Custom Classification */}
           <div className="space-y-2">
              <Label htmlFor="customClassification">Specific Classification <span className="text-slate-400 font-normal">(Optional)</span></Label>
              <Input 
                id="customClassification" 
                placeholder="e.g. Duplexes, Lofts, Clusters" 
                value={developmentData.customClassification || ''}
                onChange={(e) => setIdentity({ customClassification: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-slate-500">Add specific keywords to aid in search filtering (comma separated).</p>
           </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-8 mt-8 border-t border-slate-200">
        <Button 
          variant="outline"
          onClick={handleBack}
          className="px-6 h-11 border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          size="lg" 
          className="px-8 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-300"
        >
         Continue to Location
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}