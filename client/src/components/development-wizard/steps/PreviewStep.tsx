import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { DevelopmentCard } from '@/components/DevelopmentCard';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Eye, FileCheck, Save, Send } from 'lucide-react';
import { useState } from 'react';

export function PreviewStep() {
  const state = useDevelopmentWizard();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate location string
  const locationString = `${state.unitTypes.map(u => `${u.bedrooms} `).join(', ')}Bed Apartments in ${state.suburb || state.city}`;

  // Get primary image
  const primaryImage = state.media.find(m => m.isPrimary) || state. media[0];

  // Validation
  const isValid = 
    state.developmentName &&
    state.address &&
    state.city &&
    state.province &&
    state.unitTypes.length > 0 &&
    state.description &&
    state.media.length > 0 &&
    state.developerName &&
    state.contactDetails.name &&
    state.contactDetails.email &&
    state.contactDetails.phone;

  const handleSubmit = async () => {
    if (!isValid || !agreedToTerms) return;

    setIsSubmitting(true);
    
    // TODO: Submit to backend
    console.log('Submitting development:', state);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Development submitted for review!');
      state.reset();
    }, 2000);
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
                <h3 className="font-semibold text-orange-900 mb-2">Please complete all required fields:</h3>
                <ul className="text-sm text-orange-800 space-y-1 list-disc pl-4">
                  {!state.developmentName && <li>Development name</li>}
                  {!state.address && <li>Address</li>}
                  {!state.city && <li>City</li>}
                  {!state.province && <li>Province</li>}
                  {state.unitTypes.length === 0 && <li>At least one unit type</li>}
                  {!state.description && <li>Development description</li>}
                  {state.media.length === 0 && <li>At least one image</li>}
                  {!state.developerName && <li>Developer name</li>}
                  {!state.contactDetails.name && <li>Contact person name</li>}
                  {!state.contactDetails.email && <li>Contact email</li>}
                  {!state.contactDetails.phone && <li>Contact phone</li>}
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
        <div className="mb-8">
          <Label className="mb-4 block text-slate-700 font-semibold">Listing Preview</Label>
          <div className="bg-slate-100/50 p-6 rounded-xl border border-slate-200 flex justify-center">
            <div className="max-w-md w-full">
              <DevelopmentCard
                id="preview"
                title={state.developmentName || 'Development Name'}
                rating={state.rating}
                location={locationString}
                description={state.description || 'Development description will appear here...'}
                image={primaryImage?.url || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'}
                unitTypes={state.unitTypes.map(unit => ({
                  bedrooms: unit.bedrooms,
                  label: unit.label,
                  priceFrom: unit.priceFrom,
                }))}
                highlights={[...state.amenities.slice(0, 2), ...state.highlights.slice(0, 2)]}
                developer={{
                  name: state.developerName || 'Developer Name',
                  isFeatured: state.isFeaturedDealer,
                }}
                imageCount={state.media.length}
                isFeatured={false}
                isNewBooking={state.status === 'now-selling'}
              />
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-3 p-4 border border-slate-200 rounded-lg bg-slate-50/50 mb-6">
          <Checkbox
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            disabled={!isValid}
            className="mt-1"
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed text-slate-600">
            I confirm that all information provided is accurate and I agree to the{' '}
            <a href="/terms" className="text-blue-600 hover:underline font-medium">Terms & Conditions</a>.
            I understand that my listing will be reviewed before publishing.
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={!isValid || !agreedToTerms || isSubmitting}
            size="lg"
            className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit for Review
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          Your development will be reviewed by our team within 24-48 hours.
        </p>
      </Card>
    </div>
  );
}
