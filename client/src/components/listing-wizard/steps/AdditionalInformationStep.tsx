import { useListingWizardStore } from '@/hooks/useListingWizard';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Droplets, Zap, Building2, Truck, Shield, Waves, Home, Warehouse, Users } from 'lucide-react';

export function AdditionalInformationStep() {
  const store = useListingWizardStore();
  const propertyType = store.propertyType;
  const basicInfo = store.basicInfo || {};
  const additionalInfo = store.additionalInfo || {};

  // Update handler
  const updateAdditionalInfo = (field: string, value: any) => {
    store.setAdditionalInfo({ ...additionalInfo, [field]: value });
  };

  const propertyCategory = basicInfo.propertyCategory;

  return (
    <div className="py-6 space-y-6">
      {/* Residential Land */}
      {propertyCategory === 'residential_land' && (
        <>
          {/* Documentation Section */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">Documentation</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="landSurveyReport" className="text-slate-700">
                  Land Survey Report
                </Label>
                <Select
                  value={additionalInfo.landSurveyReport || ''}
                  onValueChange={(value) => updateAdditionalInfo('landSurveyReport', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="soilSurvey" className="text-slate-700">
                  Soil Survey / Geotechnical Report
                </Label>
                <Select
                  value={additionalInfo.soilSurvey || ''}
                  onValueChange={(value) => updateAdditionalInfo('soilSurvey', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="environmentalAssessment" className="text-slate-700">
                  Environmental Assessment
                </Label>
                <Select
                  value={additionalInfo.environmentalAssessment || ''}
                  onValueChange={(value) => updateAdditionalInfo('environmentalAssessment', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_required">Not Required</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="required_not_completed">Required (Not Completed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Utility Availability Section */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-bold text-slate-800">Utility Availability</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="waterAvailability" className="text-slate-700">
                  Water
                </Label>
                <Select
                  value={additionalInfo.waterAvailability || ''}
                  onValueChange={(value) => updateAdditionalInfo('waterAvailability', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="nearby">Nearby</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="electricityAvailability" className="text-slate-700">
                  Electricity
                </Label>
                <Select
                  value={additionalInfo.electricityAvailability || ''}
                  onValueChange={(value) => updateAdditionalInfo('electricityAvailability', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="nearby">Nearby</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sewageAvailability" className="text-slate-700">
                  Sewage
                </Label>
                <Select
                  value={additionalInfo.sewageAvailability || ''}
                  onValueChange={(value) => updateAdditionalInfo('sewageAvailability', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="municipal">Municipal</SelectItem>
                    <SelectItem value="septic_required">Septic Required</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Estate Plot */}
      {propertyCategory === 'estate_plot' && (
        <>
          {/* Documentation Section */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">Documentation</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hoaDocuments" className="text-slate-700">
                  HOA / Estate Compliance Documents
                </Label>
                <Select
                  value={additionalInfo.hoaDocuments || ''}
                  onValueChange={(value) => updateAdditionalInfo('hoaDocuments', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buildingGuidelines" className="text-slate-700">
                  Architectural / Building Guidelines
                </Label>
                <Select
                  value={additionalInfo.buildingGuidelines || ''}
                  onValueChange={(value) => updateAdditionalInfo('buildingGuidelines', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estateFibre" className="text-slate-700">
                  Estate Fibre / Internet Readiness
                </Label>
                <Select
                  value={additionalInfo.estateFibre || ''}
                  onValueChange={(value) => updateAdditionalInfo('estateFibre', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Estate Services Section */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-slate-800">Estate Services</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estateWater" className="text-slate-700">
                  Water
                </Label>
                <Select
                  value={additionalInfo.estateWater || ''}
                  onValueChange={(value) => updateAdditionalInfo('estateWater', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="included">Included</SelectItem>
                    <SelectItem value="not_included">Not Included</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estateElectricity" className="text-slate-700">
                  Electricity
                </Label>
                <Select
                  value={additionalInfo.estateElectricity || ''}
                  onValueChange={(value) => updateAdditionalInfo('estateElectricity', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="included">Included</SelectItem>
                    <SelectItem value="not_included">Not Included</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estateSewage" className="text-slate-700">
                  Sewage
                </Label>
                <Select
                  value={additionalInfo.estateSewage || ''}
                  onValueChange={(value) => updateAdditionalInfo('estateSewage', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="included">Included</SelectItem>
                    <SelectItem value="not_included">Not Included</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="developmentPhase" className="text-slate-700">
                  Estate Development Phase
                </Label>
                <Select
                  value={additionalInfo.developmentPhase || ''}
                  onValueChange={(value) => updateAdditionalInfo('developmentPhase', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase_1">Phase 1</SelectItem>
                    <SelectItem value="phase_2">Phase 2</SelectItem>
                    <SelectItem value="phase_3">Phase 3</SelectItem>
                    <SelectItem value="completed">Completed Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Industrial Land */}
      {propertyCategory === 'industrial_land' && (
        <>
          {/* Documentation Section */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800">Documentation</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="boundarySurvey" className="text-slate-700">
                  Land Survey / Boundary Confirmation
                </Label>
                <Select
                  value={additionalInfo.boundarySurvey || ''}
                  onValueChange={(value) => updateAdditionalInfo('boundarySurvey', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="soilLoadTest" className="text-slate-700">
                  Soil Test / Compaction or Load-Bearing Report
                </Label>
                <Select
                  value={additionalInfo.soilLoadTest || ''}
                  onValueChange={(value) => updateAdditionalInfo('soilLoadTest', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="eia" className="text-slate-700">
                  Environmental Impact Assessment (EIA)
                </Label>
                <Select
                  value={additionalInfo.eia || ''}
                  onValueChange={(value) => updateAdditionalInfo('eia', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="required_not_completed">Required (Not Completed)</SelectItem>
                    <SelectItem value="not_required">Not Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="truckAccess" className="text-slate-700">
                  Truck / Heavy Vehicle Access Confirmation
                </Label>
                <Select
                  value={additionalInfo.truckAccess || ''}
                  onValueChange={(value) => updateAdditionalInfo('truckAccess', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Utility Capacity Section */}
          <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-5 h-5 text-cyan-600" />
              <h3 className="text-lg font-bold text-slate-800">Utility Capacity</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="electricitySupply" className="text-slate-700">
                  Electricity Supply
                </Label>
                <Select
                  value={additionalInfo.electricitySupply || ''}
                  onValueChange={(value) => updateAdditionalInfo('electricitySupply', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="three_phase">3-Phase Available</SelectItem>
                    <SelectItem value="single_phase">Single Phase Available</SelectItem>
                    <SelectItem value="nearby">Nearby</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="waterSupply" className="text-slate-700">
                  Water Supply
                </Label>
                <Select
                  value={additionalInfo.waterSupply || ''}
                  onValueChange={(value) => updateAdditionalInfo('waterSupply', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industrial">Industrial Supply Available</SelectItem>
                    <SelectItem value="municipal_domestic">Municipal Domestic Only</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="wastewaterSystem" className="text-slate-700">
                  Sewage / Wastewater
                </Label>
                <Select
                  value={additionalInfo.wastewaterSystem || ''}
                  onValueChange={(value) => updateAdditionalInfo('wastewaterSystem', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industrial">Industrial Wastewater System</SelectItem>
                    <SelectItem value="municipal">Standard Municipal</SelectItem>
                    <SelectItem value="septic_required">None / Septic Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </>
      )}


      {/* Apartment / Flat */}
      {propertyType === 'apartment' && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">Apartment Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bodyCorporateRules" className="text-slate-700">
                Body Corporate Rules
              </Label>
              <Select
                value={additionalInfo.bodyCorporateRules || ''}
                onValueChange={(value) => updateAdditionalInfo('bodyCorporateRules', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_request">On Request</SelectItem>
                  <SelectItem value="not_available">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="petPolicy" className="text-slate-700">
                Pet Policy
              </Label>
              <Select
                value={additionalInfo.petPolicy || ''}
                onValueChange={(value) => updateAdditionalInfo('petPolicy', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pets_allowed">Pets Allowed</SelectItem>
                  <SelectItem value="cats_only">Cats Only</SelectItem>
                  <SelectItem value="with_permission">With Permission</SelectItem>
                  <SelectItem value="no_pets">No Pets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="elevatorAccess" className="text-slate-700">
                Elevator Access
              </Label>
              <Select
                value={additionalInfo.elevatorAccess || ''}
                onValueChange={(value) => updateAdditionalInfo('elevatorAccess', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="floorNumber" className="text-slate-700">
                Floor Number
              </Label>
              <input
                type="number"
                id="floorNumber"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                value={additionalInfo.floorNumber || ''}
                onChange={(e) => updateAdditionalInfo('floorNumber', Number(e.target.value))}
                placeholder="e.g. 3"
              />
            </div>
          </div>
        </Card>
      )}

      {/* House */}
      {propertyType === 'house' && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-slate-800">House Features</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poolType" className="text-slate-700">
                Swimming Pool
              </Label>
              <Select
                value={additionalInfo.poolType || ''}
                onValueChange={(value) => updateAdditionalInfo('poolType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select pool type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chlorine">Chlorine</SelectItem>
                  <SelectItem value="salt_water">Salt Water</SelectItem>
                  <SelectItem value="heated">Heated</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gardenService" className="text-slate-700">
                Garden Service
              </Label>
              <Select
                value={additionalInfo.gardenService || ''}
                onValueChange={(value) => updateAdditionalInfo('gardenService', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">Included</SelectItem>
                  <SelectItem value="optional">Optional</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label className="text-slate-700 mb-2 block">Security Features</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Alarm System', 'Electric Fence', 'Outdoor Beams', 'CCTV', 'Security Gates', 'Intercom'].map((feature) => {
                  const isSelected = (additionalInfo.securityFeatures || []).includes(feature);
                  return (
                    <div 
                      key={feature}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => {
                        const current = additionalInfo.securityFeatures || [];
                        const updated = isSelected
                          ? current.filter((f: string) => f !== feature)
                          : [...current, feature];
                        updateAdditionalInfo('securityFeatures', updated);
                      }}
                    >
                      <Shield className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Commercial */}
      {propertyType === 'commercial' && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Warehouse className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800">Commercial Specs</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loadingZones" className="text-slate-700">
                Loading Zones
              </Label>
              <Select
                value={additionalInfo.loadingZones || ''}
                onValueChange={(value) => updateAdditionalInfo('loadingZones', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="backupPower" className="text-slate-700">
                Backup Power
              </Label>
              <Select
                value={additionalInfo.backupPower || ''}
                onValueChange={(value) => updateAdditionalInfo('backupPower', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generator">Generator</SelectItem>
                  <SelectItem value="ups">UPS / Inverter</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ceilingHeight" className="text-slate-700">
                Ceiling Height (m)
              </Label>
              <input
                type="number"
                id="ceilingHeight"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                value={additionalInfo.ceilingHeight || ''}
                onChange={(e) => updateAdditionalInfo('ceilingHeight', Number(e.target.value))}
                placeholder="e.g. 4.5"
              />
            </div>

            <div>
              <Label htmlFor="amperage" className="text-slate-700">
                Power Amperage (Amps)
              </Label>
              <input
                type="number"
                id="amperage"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                value={additionalInfo.amperage || ''}
                onChange={(e) => updateAdditionalInfo('amperage', Number(e.target.value))}
                placeholder="e.g. 60"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Farm */}
      {propertyType === 'farm' && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Waves className="w-5 h-5 text-cyan-600" />
            <h3 className="text-lg font-bold text-slate-800">Farm Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="waterRights" className="text-slate-700">
                Water Rights
              </Label>
              <Select
                value={additionalInfo.waterRights || ''}
                onValueChange={(value) => updateAdditionalInfo('waterRights', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="in_process">In Process</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fencingType" className="text-slate-700">
                Fencing
              </Label>
              <Select
                value={additionalInfo.fencingType || ''}
                onValueChange={(value) => updateAdditionalInfo('fencingType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="game">Game Fencing</SelectItem>
                  <SelectItem value="cattle">Cattle Fencing</SelectItem>
                  <SelectItem value="electric">Electric Fencing</SelectItem>
                  <SelectItem value="partial">Partial Fencing</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="soilAnalysis" className="text-slate-700">
                Soil Analysis
              </Label>
              <Select
                value={additionalInfo.soilAnalysis || ''}
                onValueChange={(value) => updateAdditionalInfo('soilAnalysis', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on_request">On Request</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label className="text-slate-700 mb-2 block">Infrastructure</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Sheds', 'Silos', 'Staff Quarters', 'Cold Storage', 'Workshops', 'Dams'].map((item) => {
                  const isSelected = (additionalInfo.infrastructure || []).includes(item);
                  return (
                    <div 
                      key={item}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-cyan-50 border-cyan-200 text-cyan-700' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => {
                        const current = additionalInfo.infrastructure || [];
                        const updated = isSelected
                          ? current.filter((i: string) => i !== item)
                          : [...current, item];
                        updateAdditionalInfo('infrastructure', updated);
                      }}
                    >
                      <Building2 className={`w-4 h-4 mr-2 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Shared Living */}
      {propertyType === 'shared_living' && (
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-800">Shared Living Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="roomType" className="text-slate-700">
                Room Type
              </Label>
              <Select
                value={additionalInfo.roomType || ''}
                onValueChange={(value) => updateAdditionalInfo('roomType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private Room</SelectItem>
                  <SelectItem value="shared">Shared Room</SelectItem>
                  <SelectItem value="dorm">Dormitory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="occupancy" className="text-slate-700">
                Max Occupancy
              </Label>
              <input
                type="number"
                id="occupancy"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                value={additionalInfo.occupancy || ''}
                onChange={(e) => updateAdditionalInfo('occupancy', Number(e.target.value))}
                placeholder="e.g. 2"
              />
            </div>

            <div>
              <Label htmlFor="bathroomType" className="text-slate-700">
                Bathroom
              </Label>
              <Select
                value={additionalInfo.bathroomType || ''}
                onValueChange={(value) => updateAdditionalInfo('bathroomType', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select bathroom type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="kitchenAccess" className="text-slate-700">
                Kitchen Access
              </Label>
              <Select
                value={additionalInfo.kitchenAccess || ''}
                onValueChange={(value) => updateAdditionalInfo('kitchenAccess', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select access type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label className="text-slate-700 mb-2 block">Shared Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {['Lounge Area', 'Dining Area', 'Laundry Facilities', 'Gym', 'Outdoor Space', 'Study Area'].map((feature) => {
                  const isSelected = (additionalInfo.sharedAmenities || []).includes(feature);
                  return (
                    <div 
                      key={feature}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-purple-50 border-purple-200 text-purple-700' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => {
                        const current = additionalInfo.sharedAmenities || [];
                        const updated = isSelected
                          ? current.filter((i: string) => i !== feature)
                          : [...current, feature];
                        updateAdditionalInfo('sharedAmenities', updated);
                      }}
                    >
                      <Users className={`w-4 h-4 mr-2 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Fallback for missing category (e.g. Land without category selected) */}
      {propertyType === 'land' && !['residential_land', 'estate_plot', 'industrial_land'].includes(propertyCategory) && (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Property Category Required</h3>
          <p className="text-yellow-700 mb-4">
            Please go back to the Basic Information step and select a specific Land Category (Residential, Estate, or Industrial) to see additional options.
          </p>
        </div>
      )}
    </div>
  );
}
