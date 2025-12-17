import React, { useState, useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

export function FinalisationPhase() {
  const { 
    developmentData, 
    classification, 
    overview, 
    unitTypes, 
    validateForPublish,
    setPhase,
    editingId,
    reset
  } = useDevelopmentWizard();

  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });

  // Mutations
  const createDevMutation = trpc.developer.createDevelopment.useMutation();
  const updateDevMutation = trpc.developer.updateDevelopment.useMutation();
  const createUnitTypeMutation = trpc.developer.createUnitType.useMutation();
  const publishDevMutation = trpc.developer.publishDevelopment.useMutation();

  useEffect(() => {
    setValidationResult(validateForPublish());
  }, [developmentData, classification, overview, unitTypes, validateForPublish]);

  const handlePublish = async () => {
    const validation = validateForPublish();
    if (!validation.isValid) {
      setValidationResult(validation);
      toast.error('Please fix validation errors before publishing');
      return;
    }

    setIsSubmitting(true);
    try {
      let devId = editingId;

      // Map Development Type
      let mappedType: 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex' = 'residential';
      if (classification.type === 'commercial') mappedType = 'commercial';
      else if (classification.type === 'mixed') mappedType = 'mixed_use';
      else if (classification.type === 'land') mappedType = 'estate';
      else if (classification.type === 'residential') mappedType = 'residential';

      // Prepare Payload
      const devPayload = {
        name: developmentData.name,
        developmentType: mappedType,
        description: overview.description,
        address: developmentData.location.address,
        city: developmentData.location.city,
        province: developmentData.location.province,
        suburb: developmentData.location.suburb,
        postalCode: developmentData.location.postalCode,
        latitude: developmentData.location.latitude,
        longitude: developmentData.location.longitude,
        amenities: overview.amenities,
        images: developmentData.media.photos.map(p => p.url),
        videos: developmentData.media.videos.map(v => v.url),
        priceFrom: unitTypes.length > 0 ? Math.min(...unitTypes.map(u => u.basePriceFrom)) : undefined,
        priceTo: unitTypes.length > 0 ? Math.max(...unitTypes.map(u => u.basePriceFrom)) : undefined,
      };

      if (devId) {
        await updateDevMutation.mutateAsync({
          id: devId,
          data: devPayload
        });
      } else {
        const res = await createDevMutation.mutateAsync(devPayload);
        devId = res.development.id;
      }

      // Handle Unit Types (Create new ones)
      // Note: In a real edit scenario, we should avoid duplicating existing units.
      // For now, we assume unitTypes in store that have string IDs (e.g. "unit-123") are new.
      if (unitTypes.length > 0) {
        for (const unit of unitTypes) {
           await createUnitTypeMutation.mutateAsync({
             developmentId: devId!,
             name: unit.name,
             bedrooms: unit.bedrooms,
             bathrooms: unit.bathrooms,
             parking: unit.parking,
             unitSize: unit.unitSize,
             basePriceFrom: unit.basePriceFrom,
             amenities: [...unit.amenities.standard, ...unit.amenities.additional]
           });
        }
      }

      // Publish
      await publishDevMutation.mutateAsync({ id: devId! });

      toast.success('Development published successfully!');
      reset();
      setLocation('/developer/dashboard');

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to publish development');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Finalisation</h2>
        <p className="text-slate-500">Review your development details and publish.</p>
      </div>

      <div className="grid gap-6">
        {/* Validation Status */}
        <Card className={`border-l-4 ${validationResult.isValid ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.isValid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Ready to Publish
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Action Required
                </>
              )}
            </CardTitle>
            <CardDescription>
              {validationResult.isValid 
                ? "All required fields have been completed. You can now publish your development."
                : "Please address the following issues before publishing:"
              }
            </CardDescription>
          </CardHeader>
          {!validationResult.isValid && (
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Development Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Name</span>
                <span className="font-medium">{developmentData.name || 'Untitled'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Type</span>
                <span className="font-medium capitalize">{classification.type} {classification.subType ? `(${classification.subType})` : ''}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Location</span>
                <span className="font-medium">{developmentData.location.city}, {developmentData.location.province}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Unit Types</span>
                <span className="font-medium">{unitTypes.length} defined</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setPhase(4)} disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handlePublish} 
            disabled={!validationResult.isValid || isSubmitting}
            className="bg-green-600 hover:bg-green-700 min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish Development
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}