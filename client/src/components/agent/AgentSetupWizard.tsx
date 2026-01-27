import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  User,
  Phone,
  FileText,
  Award,
  Briefcase,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

const SPECIALIZATION_OPTIONS = [
  'Residential Sales',
  'Commercial Sales',
  'Luxury Properties',
  'First-Time Buyers',
  'Investment Properties',
  'Rentals',
  'Property Management',
  'Land & Farms',
];

export function AgentSetupWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    bio: '',
    profilePhoto: '',
    licenseNumber: '',
    specializations: [] as string[],
  });

  const createProfileMutation = trpc.agent.createProfile.useMutation({
    onSuccess: () => {
      setLocation('/agent/dashboard');
    },
    onError: error => {
      alert('Failed to create profile: ' + error.message);
    },
  });

  const handleSubmit = () => {
    createProfileMutation.mutate(formData);
  };

  const toggleSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const canProceed = () => {
    if (step === 1) return formData.displayName.length >= 2 && formData.phoneNumber.length >= 10;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Complete Your Agent Profile
          </CardTitle>
          <CardDescription className="text-base">
            Step {step} of 3 - Let's set up your professional profile
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Display Name *
                </Label>
                <Input
                  id="displayName"
                  placeholder="e.g., John Smith"
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g., +27 12 345 6789"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseNumber" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  License Number (Optional)
                </Label>
                <Input
                  id="licenseNumber"
                  placeholder="e.g., FFC1234567"
                  value={formData.licenseNumber}
                  onChange={e => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="text-base"
                />
              </div>
            </div>
          )}

          {/* Step 2: Professional Details */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Professional Bio (Optional)
                </Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your experience and expertise..."
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  rows={5}
                  className="text-base resize-none"
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.bio.length}/1000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Specializations (Optional)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {SPECIALIZATION_OPTIONS.map(spec => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSpecialization(spec)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        formData.specializations.includes(spec)
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Profile Photo */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Profile Photo (Optional)
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-2">Photo upload coming soon</p>
                  <p className="text-xs text-gray-500">
                    For now, you can skip this step and add a photo later
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Ready to get started!</h4>
                <p className="text-sm text-blue-700">
                  Click "Complete Setup" to finish creating your agent profile and access your
                  dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="ml-auto gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createProfileMutation.isLoading}
                className="ml-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {createProfileMutation.isLoading ? 'Creating...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
