import { UnitTypesStepEnhanced } from '@/components/development-wizard/steps/UnitTypesStepEnhanced';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function UnitTypesDemo() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Unit Types & Configurations Demo
              </h1>
              <p className="text-slate-600">
                Comprehensive unit type management with 4-tab modal interface
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation('/developer/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </Card>

        {/* Features Overview */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Features Included:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Tab 1: Basic Info</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Unit name & configuration</li>
                <li>• Bedrooms & bathrooms</li>
                <li>• Floor size & pricing</li>
                <li>• Parking & availability</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Tab 2: Specifications</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Inherited master specs</li>
                <li>• Toggle-based overrides</li>
                <li>• Custom specifications</li>
                <li>• Clean data model</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Tab 3: Media</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Floor plans upload</li>
                <li>• Interior & exterior photos</li>
                <li>• 3D renderings</li>
                <li>• Virtual tour links</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-2">Tab 4: Extras</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Optional upgrade packs</li>
                <li>• Name & description</li>
                <li>• Pricing (optional)</li>
                <li>• Total value calculation</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Main Component */}
        <UnitTypesStepEnhanced />

        {/* Instructions */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">How to Use:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Click "Add Your First Unit Type" or "Add Unit Type" to open the modal</li>
            <li>Fill in the Basic Info tab with essential details (name, beds, baths, price)</li>
            <li>Navigate to Specifications tab to override master specs or add custom ones</li>
            <li>Upload media in the Media tab (floor plans, photos, renderings)</li>
            <li>Add optional upgrade packs in the Extras tab</li>
            <li>Click "Save Unit Type" to add it to your development</li>
            <li>Use Edit, Duplicate, or Delete buttons on unit cards to manage them</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
