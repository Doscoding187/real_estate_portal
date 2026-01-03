import React, { useState, useEffect } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Loader2, Send, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { calculateDevelopmentReadiness } from '@/lib/readiness';

import { useAuth } from '@/_core/hooks/useAuth';

export function FinalisationPhase() {
  const { user } = useAuth();
  const { 
    developmentData, 
    classification, 
    overview, 
    unitTypes, 
    validateForPublish,
    setPhase,
    editingId,
    reset,
    // Configs for serialization
    residentialConfig,
    landConfig,
    commercialConfig,
    estateProfile
  } = useDevelopmentWizard();

  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  const brandProfileId = urlParams.get('brandProfileId') ? parseInt(urlParams.get('brandProfileId')!) : undefined;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] }>({ isValid: true, errors: [] });

  // Mutations
  const createDevMutation = trpc.developer.createDevelopment.useMutation();
  const updateDevMutation = trpc.developer.updateDevelopment.useMutation();
  const createUnitTypeMutation = trpc.developer.createUnitType.useMutation();
  const publishDevMutation = trpc.developer.publishDevelopment.useMutation();

  useEffect(() => {
    // Calculate readiness
    const devCandidate = {
       name: developmentData.name,
       description: overview.description,
       address: developmentData.location?.address,
       latitude: developmentData.location?.latitude,
       longitude: developmentData.location?.longitude,
       images: developmentData.media?.photos?.map((p: any) => p.url) || [], 
       priceFrom: unitTypes.length > 0 ? Math.min(...unitTypes.map(u => u.basePriceFrom)) : undefined,
    };
    const readiness = calculateDevelopmentReadiness(devCandidate);

    const basicValidation = validateForPublish();
    const newErrors = [...basicValidation.errors];
    
    if (readiness.score < 90) {
        newErrors.push(`Readiness Score is ${readiness.score}% (Minimum 90% required).`);
        Object.entries(readiness.missing).forEach(([section, items]) => {
            if (items.length > 0) {
                newErrors.push(`${section.charAt(0).toUpperCase() + section.slice(1)}: ${items.join(', ')}`);
            }
        });
    }

    setValidationResult({
        isValid: basicValidation.isValid && readiness.score >= 90,
        errors: newErrors
    });
  }, [developmentData, classification, overview, unitTypes, validateForPublish]);

  const handlePublish = async () => {
    if (!validationResult.isValid) {
      toast.error('Please fix validation errors before publishing');
      return;
    }

    setIsSubmitting(true);
    let devId = editingId;
    let unitTypeErrors: string[] = [];
    
    try {
      console.log('[FinalisationPhase] Starting publish flow...', { editingId, hasUnitTypes: unitTypes.length });
      
      // Map Development Type
      let mappedType: 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex' = 'residential';
      if (classification.type === 'commercial') mappedType = 'commercial';
      else if (classification.type === 'mixed') mappedType = 'mixed_use';
      else if (classification.type === 'land') mappedType = 'estate';
      else if (classification.type === 'residential') mappedType = 'residential';

      // Prepare Configuration Features (Serialized)
      const configFeatures: string[] = [];
      const addConfig = (key: string, value: string) => configFeatures.push(`cfg:${key}:${value}`);

      // residential config
      if (classification.type === 'residential') {
          if (residentialConfig.residentialType) addConfig('res_type', residentialConfig.residentialType);
          residentialConfig.communityTypes.forEach(t => addConfig('comm_type', t));
          residentialConfig.securityFeatures.forEach(f => addConfig('sec_feat', f));
      } 
      else if (classification.type === 'land') {
          if (landConfig.landType) addConfig('land_type', landConfig.landType);
          landConfig.infrastructure.forEach(i => addConfig('infra', i));
      }
      else if (classification.type === 'commercial') {
          if (commercialConfig.commercialType) addConfig('comm_use', commercialConfig.commercialType);
          commercialConfig.features.forEach(f => addConfig('comm_feat', f));
      }

      // estate profile
      if (estateProfile.classification) addConfig('est_class', estateProfile.classification);
      if (estateProfile.hasHOA) addConfig('hoa', 'true');
      if (estateProfile.architecturalGuidelines) addConfig('arch_guide', 'true');
      estateProfile.estateAmenities.forEach(a => addConfig('est_amenity', a));

      // Combine with user-defined features
      const allFeatures = [...(overview.features || []), ...configFeatures];

      // Prepare images (Hero + Gallery)
      const allImages = [
          ...(developmentData.media.heroImage ? [developmentData.media.heroImage] : []),
          ...developmentData.media.photos
      ];

      // Prepare Payload
      const devPayload = {
        brandProfileId, // Add brand context
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
        highlights: overview.highlights, // Added highlights
        features: allFeatures,
        images: allImages.map(p => p.url), // Included Hero Image
        videos: developmentData.media.videos.map(v => v.url),
        priceFrom: unitTypes.length > 0 ? Math.min(...unitTypes.map(u => u.basePriceFrom)) : undefined,
        priceTo: unitTypes.length > 0 ? Math.max(...unitTypes.map(u => u.basePriceFrom)) : undefined,
      };

      // STEP 1: Create or Update Development
      if (devId) {
        console.log('[FinalisationPhase] Updating existing development:', devId);
        await updateDevMutation.mutateAsync({
          id: devId,
          data: devPayload
        });
        console.log('[FinalisationPhase] Development updated successfully');
      } else {
        console.log('[FinalisationPhase] Creating new development');
        const res = await createDevMutation.mutateAsync(devPayload);
        devId = res.development.id;
        console.log('[FinalisationPhase] Development created with ID:', devId);
      }

      // STEP 2: Handle Unit Types (non-blocking errors)
      if (unitTypes.length > 0 && devId) {
        console.log('[FinalisationPhase] Creating unit types:', unitTypes.length);
        
        for (const unit of unitTypes) {
          try {
            await createUnitTypeMutation.mutateAsync({
              developmentId: devId,
              name: unit.name,
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              parking: unit.parking,
              unitSize: unit.unitSize,
              basePriceFrom: unit.basePriceFrom || 0,
              amenities: [...unit.amenities.standard, ...unit.amenities.additional],
              baseMedia: unit.baseMedia, // Pass unit type images
            });
          } catch (unitError: any) {
            console.warn('[FinalisationPhase] Failed to create unit type:', unit.name, unitError.message);
            unitTypeErrors.push(`Unit "${unit.name}": ${unitError.message}`);
          }
        }
        
        if (unitTypeErrors.length > 0) {
          console.warn('[FinalisationPhase] Some unit types failed to create:', unitTypeErrors);
        }
      }

      // STEP 3: Publish (only if not already approved)
      if (developmentData.approvalStatus !== 'approved') {
        console.log('[FinalisationPhase] Publishing development:', devId);
        const publishResult = await publishDevMutation.mutateAsync({ id: devId! });
        console.log('[FinalisationPhase] Publish result:', { 
          id: publishResult.development.id, 
          approvalStatus: publishResult.development.approvalStatus,
          isPublished: publishResult.development.isPublished
        });
      } else {
        console.log('[FinalisationPhase] Development already approved, skipping publish status change.');
      }

      // Show appropriate success message
      if (unitTypeErrors.length > 0) {
        toast.warning('Development published with some unit type errors', {
          description: `${unitTypeErrors.length} unit type(s) failed to save. You can add them later.`
        });
      } else {
        toast.success('Development published successfully!');
      }
      
      
      reset();
      
      // Redirect based on role
      if (user?.role === 'super_admin') {
        setLocation('/admin/publisher');
      } else {
        setLocation('/developer/dashboard');
      }

    } catch (error: any) {
      console.error('[FinalisationPhase] Publish failed:', error);
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
          <Button variant="outline" onClick={() => setPhase(7)} disabled={isSubmitting}>
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
                {developmentData.approvalStatus === 'approved' ? 'Update Development' : 'Publish Development'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}