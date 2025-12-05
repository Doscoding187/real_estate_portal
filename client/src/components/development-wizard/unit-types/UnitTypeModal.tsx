import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, FileText, Settings, Image, Package } from 'lucide-react';
import type { UnitType } from '@/hooks/useDevelopmentWizard';
import { BasicInfoTab } from './tabs/BasicInfoTab';
import { SpecificationsTab } from './tabs/SpecificationsTab';
import { MediaTab } from './tabs/MediaTab';
import { ExtrasTab } from './tabs/ExtrasTab';

interface UnitTypeModalProps {
  open: boolean;
  onClose: () => void;
  unitType: Partial<UnitType> | null;
  onSave: (unitType: Partial<UnitType>) => void;
  masterSpecs?: Record<string, any>; // Master development specifications
}

export function UnitTypeModal({
  open,
  onClose,
  unitType,
  onSave,
  masterSpecs = {},
}: UnitTypeModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<UnitType>>(
    unitType || {
      label: '',
      bedrooms: 2,
      bathrooms: 2,
      priceFrom: 0,
      availableUnits: 0,
      ownershipType: 'sectional-title',
      structuralType: 'apartment',
    }
  );

  const handleSave = () => {
    // Validate required fields
    if (!formData.label || !formData.priceFrom || formData.priceFrom <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    onSave(formData);
    onClose();
  };

  const updateFormData = (updates: Partial<UnitType>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {unitType?.id ? 'Edit Unit Type' : 'Add New Unit Type'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Specifications</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="extras" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Extras</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            <TabsContent value="basic" className="mt-0">
              <BasicInfoTab formData={formData} updateFormData={updateFormData} />
            </TabsContent>

            <TabsContent value="specs" className="mt-0">
              <SpecificationsTab
                formData={formData}
                updateFormData={updateFormData}
                masterSpecs={masterSpecs}
              />
            </TabsContent>

            <TabsContent value="media" className="mt-0">
              <MediaTab formData={formData} updateFormData={updateFormData} />
            </TabsContent>

            <TabsContent value="extras" className="mt-0">
              <ExtrasTab formData={formData} updateFormData={updateFormData} />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => {
                  const tabs = ['basic', 'specs', 'media', 'extras'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
              >
                Previous
              </Button>
            )}
            {activeTab !== 'extras' ? (
              <Button
                onClick={() => {
                  const tabs = ['basic', 'specs', 'media', 'extras'];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Save Unit Type
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
