import React, { useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Edit2, Eye, 
  MapPin, Home, Layers, Image as ImageIcon, FileText, 
  ArrowLeft, Upload, Share2, Calendar, Smartphone, Monitor, Maximize
} from 'lucide-react';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';

export function FinalisationPhase() {
  const [, navigate] = useLocation();
  const store = useDevelopmentWizard();
  const { 
    developmentData, 
    unitTypes, 
    classification,
    developmentType,
    residentialConfig,
    selectedAmenities,
    listingIdentity,
    setPhase, 
    reset,
    validateForPublish 
  } = store;
  
  // Get editingId from store for edit mode detection
  const editingId = (store as any).editingId as number | undefined;

  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'desktop' | 'mobile'>('desktop');

  // Backend mutations
  const createDevelopment = trpc.developer.createDevelopment.useMutation();
  const updateDevelopment = trpc.developer.updateDevelopment.useMutation();
  const publishDevelopment = trpc.developer.publishDevelopment.useMutation();

  // Run validation
  const validationResult = validateForPublish();
  const errors = validationResult?.errors || [];
  const warnings: string[] = []; // Placeholder for future warnings support
  const canPublish = errors.length === 0;

  // Helper to get formatted status
  const getStepStatus = (stepErrors: string[]) => {
      if (stepErrors.length > 0) return { status: 'error', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' };
      return { status: 'success', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' };
  };

  // Extract images from media state
  const extractImageUrls = (): string[] => {
    const media = developmentData.media;
    if (!media) return [];
    
    const urls: string[] = [];
    // Hero image first
    if (media.heroImage?.url) urls.push(media.heroImage.url);
    // Then photos
    media.photos?.forEach(p => { if (p.url) urls.push(p.url); });
    return urls;
  };

  // Extract video URLs
  const extractVideoUrls = (): string[] => {
    return developmentData.media?.videos?.map(v => v.url).filter(Boolean) as string[] || [];
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      const images = extractImageUrls();
      const videos = extractVideoUrls();
      
      // Build features array (includes config prefixes for hydration)
      const features: string[] = [];
      if (residentialConfig?.residentialType) features.push(`cfg:res_type:${residentialConfig.residentialType}`);
      residentialConfig?.communityTypes?.forEach(c => features.push(`cfg:comm_type:${c}`));
      residentialConfig?.securityFeatures?.forEach(s => features.push(`cfg:sec_feat:${s}`));
      
      let developmentId: number;
      
      if (editingId) {
        // UPDATE MODE
        console.log('[FinalisationPhase] Update mode, editingId:', editingId);
        await updateDevelopment.mutateAsync({
          id: editingId,
          data: {
            name: developmentData.name,
            description: developmentData.description,
            developmentType: (developmentType || 'residential') as 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex',
            address: developmentData.location?.address,
            city: developmentData.location?.city,
            province: developmentData.location?.province,
            latitude: developmentData.location?.latitude,
            longitude: developmentData.location?.longitude,
            amenities: selectedAmenities || developmentData.amenities || [],
            features,
            highlights: developmentData.highlights || [],
            unitTypes: unitTypes || [],
            images,
            videos,
          }
        });
        developmentId = editingId;
        toast.success('Development updated!');
      } else {
        // CREATE MODE
        console.log('[FinalisationPhase] Create mode');
        const result = await createDevelopment.mutateAsync({
          name: developmentData.name || 'Untitled Development',
          developmentType: (developmentType || 'residential') as 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex',
          description: developmentData.description,
          address: developmentData.location?.address,
          city: developmentData.location?.city || 'Unknown',
          province: developmentData.location?.province || 'Unknown',
          latitude: developmentData.location?.latitude,
          longitude: developmentData.location?.longitude,
          amenities: selectedAmenities || developmentData.amenities || [],
          features,
          highlights: developmentData.highlights || [],
          unitTypes: unitTypes || [],
          images,
          priceFrom: unitTypes[0]?.priceFrom || unitTypes[0]?.basePriceFrom,
          priceTo: unitTypes[unitTypes.length - 1]?.priceTo || unitTypes[unitTypes.length - 1]?.basePriceTo,
        });
        developmentId = result.development.id;
        toast.success('Development created!');
      }
      
      // Now publish (submit for review)
      console.log('[FinalisationPhase] Publishing development:', developmentId);
      await publishDevelopment.mutateAsync({ id: developmentId });
      
      // Success!
      setShowConfirmPublish(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success('Development submitted for review!');
      
      // Reset wizard and redirect
      reset();
      navigate('/developer/developments');
      
    } catch (error: any) {
      console.error('[FinalisationPhase] Publish failed:', error);
      toast.error('Failed to publish', { description: error.message });
    } finally {
      setIsPublishing(false);
    }
  };

  // Render Section Helper
  const ReviewSection = ({ 
    title, icon: Icon, step, data, onEdit 
  }: { 
    title: string, icon: any, step: number, data: React.ReactNode, onEdit: () => void 
  }) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
        <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-100">
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Edit2 className="w-3 h-3 mr-1" /> Edit
            </Button>
        </div>
        <div className="p-4 text-sm text-slate-600">
            {data}
        </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Review & Publish</h2>
        <p className="text-slate-600">Finalize your listing details before going live.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Col: Validation & Summary */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Validation Dashboard */}
           <Card className={!canPublish ? "border-red-200 shadow-sm" : "border-green-200 shadow-sm"}>
              <CardHeader className={!canPublish ? "bg-red-50/50 pb-4" : "bg-green-50/50 pb-4"}>
                 <div className="flex items-start gap-4">
                    <div className={!canPublish ? "p-2 bg-red-100 rounded-full text-red-600" : "p-2 bg-green-100 rounded-full text-green-600"}>
                        {!canPublish ? <AlertTriangle className="w-6 h-6"/> : <CheckCircle2 className="w-6 h-6"/>}
                    </div>
                    <div>
                        <CardTitle className={!canPublish ? "text-red-900" : "text-green-900"}>
                            {!canPublish ? "Action Required" : "Ready to Publish"}
                        </CardTitle>
                        <CardDescription className={!canPublish ? "text-red-700" : "text-green-700"}>
                            {!canPublish 
                                ? `Please resolve ${errors.length} error${errors.length > 1 ? 's' : ''} to continue.` 
                                : "All required fields are complete. You can schedule or publish now."}
                        </CardDescription>
                    </div>
                 </div>
              </CardHeader>
              {(!canPublish || warnings.length > 0) && (
                 <CardContent className="pt-4 space-y-3">
                    {errors.map((err, idx) => (
                        <Alert key={`err-${idx}`} variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Missing Requirement</AlertTitle>
                            <AlertDescription>{err}</AlertDescription>
                        </Alert>
                    ))}
                    {warnings.map((warn: string, idx: number) => (
                        <Alert key={`warn-${idx}`} className="bg-amber-50 border-amber-200 text-amber-800">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-900">Recommendation</AlertTitle>
                            <AlertDescription>{warn}</AlertDescription>
                        </Alert>
                    ))}
                 </CardContent>
              )}
           </Card>

           {/* Detailed Summary */}
           <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Listing Details</h3>
              
              <ReviewSection 
                 title="Identity & Type"
                 icon={Home}
                 step={1}
                 onEdit={() => setPhase(1)} // Identity Step
                 data={
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">Name</span>
                            <span className="font-medium text-slate-900">{developmentData.name || 'Untitled'}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">Type</span>
                            <span className="font-medium text-slate-900 capitalize">
                                {classification?.type?.replace('_', ' ')} • {developmentData.ownershipType || 'N/A'}
                            </span>
                        </div>
                    </div>
                 }
              />

              <ReviewSection 
                 title="Location"
                 icon={MapPin}
                 step={2} // Location phase
                 onEdit={() => setPhase(5)} 
                 data={
                    <div>
                        <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">Address</span>
                        <span className="font-medium text-slate-900">
                             {developmentData.location?.address || 'Address not set'}
                        </span>
                        {/* Map placeholder */}
                        <div className="mt-2 h-24 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                            Map Preview
                        </div>
                    </div>
                 }
              />

              <ReviewSection 
                 title="Amenities & Features"
                 icon={Share2}
                 step={6} // Amenities
                 onEdit={() => setPhase(7)}
                 data={
                    <div className="flex flex-wrap gap-2">
                        {(selectedAmenities || developmentData.amenities || []).map((a: string) => (
                            <Badge key={a} variant="secondary" className="bg-slate-100 text-slate-700">{a}</Badge>
                        ))}
                        {(selectedAmenities || developmentData.amenities || []).length === 0 && <span className="text-slate-400 italic">No amenities selected</span>}
                    </div>
                 }
              />

              <ReviewSection 
                  title="Marketing & Media"
                  icon={ImageIcon}
                  step={8} // Media
                  onEdit={() => setPhase(9)}
                  data={
                      <div className="space-y-3">
                          <p className="line-clamp-2 italic text-slate-500">"{developmentData.description || 'No description provided'}"</p>
                          <div className="flex gap-4 text-xs font-medium text-slate-700 border-t pt-2">
                              <span>{developmentData.media?.heroImage ? '✅ Hero Image' : '❌ No Hero'}</span>
                              <span>{developmentData.media?.photos?.length || 0} Photos</span>
                              <span>{developmentData.media?.videos?.length || 0} Videos</span>
                              <span>{developmentData.media?.documents?.length || 0} Docs</span>
                          </div>
                      </div>
                  }
              />

              <ReviewSection
                  title="Unit Configuration"
                  icon={Layers}
                  step={9} // Units
                  onEdit={() => setPhase(11)}
                  data={
                      <div className="space-y-2">
                          {unitTypes.length === 0 ? (
                              <span className="text-red-500 italic">No unit types defined</span>
                          ) : (
                              unitTypes.map(u => (
                                  <div key={u.id} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                      <span className="font-medium">{u.name}</span>
                                      <div className="flex gap-3 text-xs text-slate-500">
                                          <span>{u.bedrooms} Bed</span>
                                          <span>{u.bathrooms} Bath</span>
                                          <span>R {u.priceFrom?.toLocaleString()}</span>
                                          <Badge variant="outline" className={u.availableUnits > 0 ? "text-green-600 border-green-200" : "text-red-600 border-red-200"}>{u.availableUnits} Avail</Badge>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  }
              />

           </div>
        </div>

        {/* Right Col: Preview & Actions */}
        <div className="space-y-6">
            
            {/* Control Panel */}
            <Card className="sticky top-6 border-slate-200 shadow-md">
                <CardHeader className="bg-slate-50 border-b pb-4">
                    <CardTitle className="text-lg">Publishing Controls</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                         <Button variant="outline" className="w-full text-xs">
                             <Calendar className="w-3.5 h-3.5 mr-2" /> Schedule
                         </Button>
                         <Button variant="outline" className="w-full text-xs" onClick={() => toast.success("Draft saved")}>
                             Save Draft
                         </Button>
                    </div>

                    <Separator />
                    
                    <div className="space-y-2">
                        <Button 
                            className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                            disabled={!canPublish}
                            onClick={() => setShowConfirmPublish(true)}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Publish Listing
                        </Button>
                        {!canPublish && (
                            <p className="text-xs text-center text-red-500">
                                Resolve validation errors to publish.
                            </p>
                        )}
                        <p className="text-xs text-center text-slate-400">
                            By publishing, you agree to our listing terms.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Preview Widget */}
            <Card>
                <CardHeader className="pb-2 border-b">
                   <div className="flex justify-between items-center">
                       <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-500">Live Preview Mode</CardTitle>
                       <div className="flex bg-slate-100 rounded-lg p-1">
                           <button 
                              onClick={() => setActivePreviewTab('desktop')}
                              className={`p-1.5 rounded ${activePreviewTab === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                               <Monitor className="w-4 h-4" />
                           </button>
                           <button 
                              onClick={() => setActivePreviewTab('mobile')}
                              className={`p-1.5 rounded ${activePreviewTab === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                           >
                               <Smartphone className="w-4 h-4" />
                           </button>
                       </div>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className={`mx-auto bg-slate-100 overflow-hidden transition-all duration-300 ${activePreviewTab === 'mobile' ? 'w-[280px] h-[500px] my-4 rounded-[2rem] border-4 border-slate-800 shadow-xl' : 'w-full h-[400px]'}`}>
                        {/* Mock Content */}
                        <div className="bg-white w-full h-full flex flex-col overflow-y-auto">
                            <div className="h-1/3 bg-slate-200 relative">
                                {developmentData.media?.heroImage ? (
                                    <img src={developmentData.media.heroImage.url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400"><ImageIcon/></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                                     <h1 className="text-white font-bold text-sm leading-tight">{developmentData.name || 'Development Name'}</h1>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-bold text-slate-700 uppercase">From R {unitTypes?.[0]?.priceFrom?.toLocaleString() || '---'}</h3>
                                    <p className="text-[10px] text-slate-500 line-clamp-2">{developmentData.description || 'Description...'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                     {unitTypes.slice(0, 2).map(u => (
                                         <div key={u.id} className="bg-slate-50 p-2 rounded border border-slate-100">
                                              <div className="text-[10px] font-bold">{u.name}</div>
                                              <div className="text-[9px] text-slate-500 flex items-center gap-2">
                                                  <span className="flex items-center gap-1">{u.bedrooms} Bed &bull; <HouseMeasureIcon className="w-3 h-3"/> {u.sizeFrom}m²</span>
                                                  {u.yardSize && u.yardSize > 0 && <span className="text-green-600 flex items-center gap-0.5"><Maximize className="w-2 h-2"/> {u.yardSize}m²</span>}
                                              </div>
                                         </div>
                                     ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmPublish} onOpenChange={setShowConfirmPublish}>
           <DialogContent>
               <DialogHeader>
                   <DialogTitle>Confirm Publication</DialogTitle>
                   <DialogDescription>
                       You are about to make <strong>{developmentData.name}</strong> live to the public.
                       This will activate search indexing and notifications.
                   </DialogDescription>
               </DialogHeader>
               <div className="py-4">
                   <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                       <CheckCircle2 className="w-4 h-4 text-blue-600" />
                       <AlertTitle className="text-blue-900">Passed Validation</AlertTitle>
                       <AlertDescription>Your listing meets 100% of the quality standards.</AlertDescription>
                   </Alert>
               </div>
               <DialogFooter>
                   <Button variant="outline" onClick={() => setShowConfirmPublish(false)}>Cancel</Button>
                   <Button onClick={handlePublish} disabled={isPublishing} className="bg-green-600 hover:bg-green-700">
                       {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
                   </Button>
               </DialogFooter>
           </DialogContent>
      </Dialog>

    </div>
  );
}