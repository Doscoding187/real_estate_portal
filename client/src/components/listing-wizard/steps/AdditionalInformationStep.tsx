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
import { FileText, Droplets, Zap, Building2, Truck } from 'lucide-react';

export function AdditionalInformationStep() {
  const store = useListingWizardStore();
  const propertyType = store.propertyType;
  const basicInfo = store.basicInfo || {};
  const additionalInfo = store.additionalInfo || {};

  // Update handler
  const updateAdditionalInfo = (field: string, value: any) => {
    store.setAdditionalInfo({ ...additionalInfo, [field]: value });
  };

  // Only show for land properties
  if (propertyType !== 'land') {
    return (
      <div className="py-6">
        <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
          <p className="text-slate-600 text-center">
            Additional information is not required for this property type.
          </p>
        </Card>
      </div>
    );
  }

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
    </div>
  );
}
