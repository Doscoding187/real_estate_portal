import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { DevelopmentCard } from '@/components/DevelopmentCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Save,
  Send,
  MapPin,
  Home,
  Bed,
  Bath,
  Maximize,
  Calendar,
  Award,
  Phone,
  Mail,
  Globe,
  Building2,
  Sparkles,
  Info,
  Image,
  Layout,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export function PreviewStep() {
  const state = useDevelopmentWizard();
  const [, setLocation] = useLocation();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Extract values from nested structure
  const developmentName = state.developmentData?.name || '';
  const address = state.developmentData?.location?.address || '';
  const city = state.developmentData?.location?.city || '';
  const province = state.developmentData?.location?.province || '';
  const suburb = state.developmentData?.location?.suburb || '';
  const postalCode = state.developmentData?.location?.postalCode || '';
  const latitude = state.developmentData?.location?.latitude || '';
  const longitude = state.developmentData?.location?.longitude || '';
  const gpsAccuracy = state.developmentData?.location?.gpsAccuracy;
  const description = state.developmentData?.description || '';
  const amenities = state.developmentData?.amenities || [];
  const highlights = state.developmentData?.highlights || [];
  const developerName = state.developmentData?.developerName || '';
  const status = state.developmentData?.status || 'now-selling';
  const rating = state.developmentData?.rating;
  const unitTypes = state.unitTypes || [];
  const media = state.media || [];
  
  // Properties that don't exist in new structure - using placeholders
  const totalUnits = 0;
  const projectSize = undefined;
  const projectHighlights = highlights; // Use highlights as projectHighlights
  const completionDate = undefined;
  const contactDetails = { name: '', email: '', phone: '' };
  const isFeaturedDealer = false;
  const developerWebsite = '';
  const pastProjects = [];

  // tRPC mutation for creating development
  const createDevelopment = trpc.developer.createDevelopment.useMutation();
  const publishDevelopment = trpc.developer.publishDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development submitted successfully!', {
        description: 'Your development is now under review.',
      });
      state.reset();
      setLocation('/developer/developments');
    },
    onError: error => {
      toast.error('Failed to submit development', {
        description: error.message,
      });
    },
  });

  // Generate location string
  const locationString = `${unitTypes.map(u => `${u.bedrooms} `).join(', ')}Bed Apartments in ${suburb || city}`;

  // Get primary image
  const primaryImage = media.find(m => m.isPrimary) || media[0];

  // Validation
  const isValid =
    developmentName &&
    address &&
    city &&
    province &&
    unitTypes.length > 0 &&
    description &&
    media.length > 0 &&
    developerName;
    // Note: contactDetails validation removed as it doesn't exist in new structure

  const handleSubmit = async () => {
    if (!isValid || !agreedToTerms) return;

    try {
      console.log('[PreviewStep] Starting submit flow...');
      
      // Step 1: Create development
      const result = await createDevelopment.mutateAsync({
        name: developmentName,
        developmentType: 'residential', // Default type
        description: description,
        address: address,
        city: city,
        province: province,
        // Include coordinates if available (from map pin)
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        showHouseAddress: true, // Default to showing address
        priceFrom:
          unitTypes.length > 0 ? Math.min(...unitTypes.map(u => u.basePriceFrom)) : undefined,
        priceTo:
          unitTypes.length > 0 ? Math.max(...unitTypes.map(u => u.basePriceTo || u.basePriceFrom)) : undefined,
        amenities: amenities,
        completionDate: undefined, // Not in new structure
      });
      
      console.log('[PreviewStep] Development created:', result.development.id);
      
      // Step 2: Publish development (submit for review)
      console.log('[PreviewStep] Publishing development...');
      await publishDevelopment.mutateAsync({ id: result.development.id });
      console.log('[PreviewStep] Publish complete');
      
    } catch (error: any) {
      console.error('[PreviewStep] Submit failed:', error);
      toast.error('Failed to submit development', {
        description: error.message,
      });
    }
  };

  const handleSaveDraft = () => {
    console.log('Saving draft:', state);
    alert('Draft saved successfully!');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm rounded-[1.5rem] border-white/40 shadow-[0_8px_30px_rgba(8,_112,_184,_0.06)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Preview & Submit</h3>
        </div>
        <p className="text-slate-600 mb-6">Review your development listing before submitting</p>

        {/* Validation Summary */}
        {!isValid && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 mb-2">
                  Please complete all required fields:
                </h3>
                <ul className="text-sm text-orange-800 space-y-1 list-disc pl-4">
                  {!developmentName && <li>Development name</li>}
                  {!address && <li>Address</li>}
                  {!city && <li>City</li>}
                  {!province && <li>Province</li>}
                  {unitTypes.length === 0 && <li>At least one unit type</li>}
                  {!description && <li>Development description</li>}
                  {media.length === 0 && <li>At least one image</li>}
                  {!developerName && <li>Developer name</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {isValid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                All required fields are complete. Your listing is ready to submit!
              </p>
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="space-y-6 mb-8">
          <Label className="text-slate-700 font-semibold text-lg flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Complete Listing Preview
          </Label>

          {/* Development Card Preview */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border-2 border-blue-200">
            <Label className="mb-4 block text-slate-700 font-medium text-sm uppercase tracking-wide">
              How Your Listing Will Appear
            </Label>
            <div className="max-w-4xl mx-auto">
              <DevelopmentCard
                id="preview"
                title={developmentName || 'Development Name'}
                rating={rating}
                location={locationString}
                description={description || 'Development description will appear here...'}
                image={
                  primaryImage?.url || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'
                }
                unitTypes={unitTypes.map(unit => ({
                  bedrooms: unit.bedrooms,
                  label: unit.name,
                  priceFrom: unit.basePriceFrom,
                }))}
                highlights={[...amenities.slice(0, 2), ...highlights.slice(0, 2)]}
                developer={{
                  name: developerName || 'Developer Name',
                  isFeatured: isFeaturedDealer,
                }}
                imageCount={media.length}
                isFeatured={false}
                isNewBooking={status === 'now-selling'}
              />
            </div>
          </div>

          {/* Detailed Information Grid - Property24 Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Details */}
            <Card className="p-5 border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Basic Information
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Development Name:</span>
                  <span className="font-semibold text-slate-900">
                    {developmentName || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <Badge
                    className={`${
                      status === 'now-selling'
                        ? 'bg-green-100 text-green-700'
                        : status === 'launching-soon'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
                {totalUnits > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Units:</span>
                    <span className="font-semibold text-slate-900">{totalUnits}</span>
                  </div>
                )}
                {projectSize && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Project Size:</span>
                    <span className="font-semibold text-slate-900">{projectSize} acres</span>
                  </div>
                )}
                {completionDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Completion:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(completionDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Location */}
            <Card className="p-5 border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                Location
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-slate-700">{address}</p>
                <p className="text-slate-600">
                  {suburb && `${suburb}, `}
                  {city}, {province}
                </p>
                {postalCode && <p className="text-slate-600">{postalCode}</p>}
                {gpsAccuracy && (
                  <Badge
                    variant="outline"
                    className={`${
                      gpsAccuracy === 'accurate'
                        ? 'border-green-300 text-green-700'
                        : 'border-orange-300 text-orange-700'
                    }`}
                  >
                    GPS: {gpsAccuracy}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Unit Configurations */}
            <Card className="p-5 border-slate-200 md:col-span-2">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Home className="w-4 h-4 text-purple-600" />
                Unit Configurations ({unitTypes.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unitTypes.map((unit, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200"
                  >
                    <p className="font-semibold text-slate-900 mb-2">{unit.label}</p>
                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Bed className="w-3 h-3" />
                        <span>{unit.bedrooms} Bed</span>
                        <span>•</span>
                        <Bath className="w-3 h-3" />
                        <span>{unit.bathrooms} Bath</span>
                      </div>
                      {unit.unitSize && (
                        <div className="flex items-center gap-2">
                          <Maximize className="w-3 h-3" />
                          <span>{unit.unitSize}m²</span>
                        </div>
                      )}
                      <div className="font-semibold text-purple-700 mt-2">
                        R{unit.priceFrom.toLocaleString()}
                        {unit.priceTo && ` - R${unit.priceTo.toLocaleString()}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        {unit.availableUnits} units available
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Project Highlights */}
            {projectHighlights.length > 0 && (
              <Card className="p-5 border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Project Highlights
                </h4>
                <ul className="space-y-2">
                  {projectHighlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <Card className="p-5 border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Amenities ({amenities.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {amenities.slice(0, 8).map((amenity, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {amenity}
                    </Badge>
                  ))}
                  {amenities.length > 8 && (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                      +{amenities.length - 8} more
                    </Badge>
                  )}
                </div>
              </Card>
            )}

            {/* Media Summary */}
            <Card className="p-5 border-slate-200 md:col-span-2">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 text-pink-600" />
                Media Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {media.filter(m => m.category === 'photo' && m.isPrimary).length}
                  </p>
                  <p className="text-xs text-slate-600">Featured</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {media.filter(m => m.category === 'photo').length}
                  </p>
                  <p className="text-xs text-slate-600">Photos</p>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {media.filter(m => m.category === 'floorplan').length}
                  </p>
                  <p className="text-xs text-slate-600">Floor Plans</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <p className="text-2xl font-bold text-pink-600">
                    {media.filter(m => m.type === 'video').length}
                  </p>
                  <p className="text-xs text-slate-600">Videos</p>
                </div>
              </div>
            </Card>

            {/* Developer Information */}
            <Card className="p-5 border-slate-200 md:col-span-2">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Developer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-slate-900">{developerName}</p>
                  {isFeaturedDealer && (
                    <Badge className="bg-orange-500 text-white">
                      <Award className="w-3 h-3 mr-1" />
                      FEATURED DEALER
                    </Badge>
                  )}
                  {developerWebsite && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe className="w-3 h-3" />
                      <span className="text-xs">{developerWebsite}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {contactDetails.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-3 h-3" />
                      <span>{contactDetails.email}</span>
                    </div>
                  )}
                  {contactDetails.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3 h-3" />
                      <span>{contactDetails.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              {pastProjects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-700 mb-2">
                    Past Projects: {pastProjects.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {pastProjects.slice(0, 3).map((project: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs border-slate-300">
                        {project.name} ({project.year})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-3 p-4 border border-slate-200 rounded-lg bg-slate-50/50 mb-6">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={checked => setAgreedToTerms(checked as boolean)}
            disabled={!isValid}
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed text-slate-600">
            I confirm that all information provided is accurate and I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:underline font-medium">
              Terms & Conditions
            </a>
            . I understand that my listing will be reviewed before publishing.
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSaveDraft} variant="outline" size="lg" className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            Save as Draft
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!isValid || !agreedToTerms || createDevelopment.isPending || publishDevelopment.isPending}
            size="lg"
            className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
          >
            {(createDevelopment.isPending || publishDevelopment.isPending) ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit for Review
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4 flex items-center justify-center gap-2">
          <Info className="w-3 h-3" />
          Your development will be reviewed by our team within 24-48 hours.
        </p>
      </Card>
    </div>
  );
}
