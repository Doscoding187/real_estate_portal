// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle2, Upload } from 'lucide-react';

const TOTAL_STEPS = 5;

function splitCsv(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function joinCsv(values: string[] = []) {
  return values.join(', ');
}

export function AgentSetupWizard() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    whatsapp: '',
    profileImage: '',
    areasServed: '',
    focus: 'both',
    specializations: '',
    propertyTypes: '',
    bio: '',
    licenseNumber: '',
    yearsExperience: '0',
    languages: '',
    website: '',
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    slug: '',
  });

  const profileQuery = trpc.agent.getMyProfileOnboarding.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const saveProfileMutation = trpc.agent.updateMyProfileOnboarding.useMutation({
    onError: error => {
      toast.error(error.message || 'Failed to save profile step');
    },
  });

  const publishProfileMutation = trpc.agent.publishMyProfile.useMutation({
    onError: error => {
      toast.error(error.message || 'Failed to publish profile');
    },
  });
  const presignUploadMutation = trpc.upload.presign.useMutation();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified. Finish your profile to unlock publishing and directory visibility.');
    }
  }, [searchParams]);

  useEffect(() => {
    const agent = profileQuery.data?.agent;
    if (!agent) return;

    setFormData(prev => ({
      ...prev,
      displayName: agent.displayName || prev.displayName,
      phone: agent.phone || prev.phone,
      whatsapp: agent.whatsapp || prev.whatsapp,
      profileImage: agent.profileImage || prev.profileImage,
      areasServed: joinCsv(agent.areasServed || []),
      focus: agent.focus || prev.focus,
      specializations: joinCsv(agent.specializations || []),
      propertyTypes: joinCsv(agent.propertyTypes || []),
      bio: agent.bio || prev.bio,
      licenseNumber: agent.licenseNumber || prev.licenseNumber,
      yearsExperience:
        typeof agent.yearsExperience === 'number'
          ? String(agent.yearsExperience)
          : prev.yearsExperience,
      languages: joinCsv(agent.languages || []),
      website: agent.socialLinks?.website || prev.website,
      facebook: agent.socialLinks?.facebook || prev.facebook,
      instagram: agent.socialLinks?.instagram || prev.instagram,
      linkedin: agent.socialLinks?.linkedin || prev.linkedin,
      twitter: agent.socialLinks?.twitter || prev.twitter,
      slug: agent.slug || prev.slug,
    }));
  }, [profileQuery.data]);

  const currentScore =
    saveProfileMutation.data?.profileCompletionScore ||
    profileQuery.data?.agent?.profileCompletionScore ||
    profileQuery.data?.entitlements?.profileCompletionScore ||
    0;

  const isSaving = saveProfileMutation.isPending;
  const isPublishing = publishProfileMutation.isPending;

  const canContinue =
    step !== 1 || (formData.displayName.trim().length >= 2 && formData.phone.trim().length >= 7);

  const buildPayload = () => ({
    displayName: formData.displayName.trim(),
    phone: formData.phone.trim(),
    whatsapp: formData.whatsapp.trim() || undefined,
    profileImage: formData.profileImage.trim() || undefined,
    areasServed: splitCsv(formData.areasServed),
    focus: formData.focus,
    specializations: splitCsv(formData.specializations),
    propertyTypes: splitCsv(formData.propertyTypes),
    bio: formData.bio.trim() || undefined,
    licenseNumber: formData.licenseNumber.trim() || undefined,
    yearsExperience: Number(formData.yearsExperience || 0),
    languages: splitCsv(formData.languages),
    socialLinks: {
      website: formData.website.trim(),
      facebook: formData.facebook.trim(),
      instagram: formData.instagram.trim(),
      linkedin: formData.linkedin.trim(),
      twitter: formData.twitter.trim(),
    },
    slug: formData.slug.trim() || undefined,
  });

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid image type. Upload JPG, PNG, or WebP.');
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error('Image is too large. Maximum size is 10MB.');
      return;
    }

    setIsUploadingProfileImage(true);
    const loadingToastId = toast.loading('Uploading profile photo...');

    try {
      const { url, publicUrl } = await presignUploadMutation.mutateAsync({
        filename: file.name,
        contentType: file.type,
      });

      const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text().catch(() => '');
        throw new Error(
          `Profile image upload failed (${uploadResponse.status})${errorText ? `: ${errorText}` : ''}`,
        );
      }

      setFormData(prev => ({ ...prev, profileImage: publicUrl }));
      toast.success('Profile photo uploaded.', { id: loadingToastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload profile photo.', {
        id: loadingToastId,
      });
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const openProfileImagePicker = () => {
    if (isUploadingProfileImage) return;
    profileImageInputRef.current?.click();
  };

  const handleSaveStep = async (nextStep?: number) => {
    await saveProfileMutation.mutateAsync(buildPayload());
    if (nextStep) setStep(nextStep);
  };

  const handlePublish = async () => {
    await saveProfileMutation.mutateAsync(buildPayload());
    const result = await publishProfileMutation.mutateAsync();

    toast.success('Your public profile is live.');
    if (result?.slug) {
      setLocation(`/agents/${result.slug}`);
      return;
    }

    setLocation('/agent/dashboard');
  };

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading onboarding...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Complete your agent profile</CardTitle>
              <CardDescription>
                Step {step} of {TOTAL_STEPS} - You can skip and return later.
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Completion</p>
              <p className="text-lg font-semibold">{currentScore}%</p>
            </div>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} />
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Display Name *</Label>
                <Input
                  value={formData.displayName}
                  onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+27 82 000 0000"
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={formData.whatsapp}
                  onChange={e => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="+27 82 000 0000"
                />
              </div>
              <div>
                <Label>Profile Photo Upload</Label>
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={e => void handleProfileImageUpload(e)}
                  disabled={isUploadingProfileImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={openProfileImagePicker}
                  disabled={isUploadingProfileImage}
                  className="mt-2 w-full rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {isUploadingProfileImage ? 'Uploading profile photo...' : 'Click to upload profile photo'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP (max 10MB)</p>
                </button>
                <p className="text-xs text-slate-500 mt-1">
                  Upload JPG, PNG, or WebP (max 10MB), or paste a URL below.
                </p>
                {isUploadingProfileImage && (
                  <p className="text-xs text-blue-600 mt-1">Uploading profile photo...</p>
                )}
              </div>
              <div>
                <Label>Profile Photo URL (optional)</Label>
                <Input
                  value={formData.profileImage}
                  onChange={e => setFormData(prev => ({ ...prev, profileImage: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              {formData.profileImage && (
                <div>
                  <Label>Photo Preview</Label>
                  <img
                    src={formData.profileImage}
                    alt="Profile preview"
                    className="mt-2 h-24 w-24 rounded-full object-cover border"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Service Areas</Label>
                <Input
                  value={formData.areasServed}
                  onChange={e => setFormData(prev => ({ ...prev, areasServed: e.target.value }))}
                  placeholder="Sandton, Rosebank, Midrand"
                />
                <p className="text-xs text-slate-500 mt-1">Comma-separated suburbs/cities.</p>
              </div>
              <div>
                <Label>Languages</Label>
                <Input
                  value={formData.languages}
                  onChange={e => setFormData(prev => ({ ...prev, languages: e.target.value }))}
                  placeholder="English, Zulu"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Focus</Label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={formData.focus}
                  onChange={e => setFormData(prev => ({ ...prev, focus: e.target.value }))}
                >
                  <option value="both">Sales and Rentals</option>
                  <option value="sales">Sales</option>
                  <option value="rentals">Rentals</option>
                </select>
              </div>
              <div>
                <Label>Specializations</Label>
                <Input
                  value={formData.specializations}
                  onChange={e => setFormData(prev => ({ ...prev, specializations: e.target.value }))}
                  placeholder="Residential Sales, Luxury"
                />
              </div>
              <div>
                <Label>Property Types</Label>
                <Input
                  value={formData.propertyTypes}
                  onChange={e => setFormData(prev => ({ ...prev, propertyTypes: e.target.value }))}
                  placeholder="Apartment, House, Commercial"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={formData.bio}
                  onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell clients about your experience and what you specialize in."
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>License Number</Label>
                  <Input
                    value={formData.licenseNumber}
                    onChange={e => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Years Experience</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.yearsExperience}
                    onChange={e => setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website}
                    onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input
                    value={formData.facebook}
                    onChange={e => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={formData.instagram}
                    onChange={e => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>LinkedIn</Label>
                  <Input
                    value={formData.linkedin}
                    onChange={e => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <Label>Public Profile URL Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="jane-doe"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Your profile will be available at `/agents/:slug`.
                </p>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
                <p className="text-sm">Profile completion: {currentScore}%</p>
                <p className="text-sm">
                  Listing publish unlock: {currentScore >= 70 ? 'Ready' : 'Need 70%+'}
                </p>
                <p className="text-sm">
                  Directory visibility unlock: {currentScore >= 80 ? 'Ready' : 'Need 80% + photo + areas'}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(prev => Math.max(1, prev - 1))}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              {step < TOTAL_STEPS && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(prev => Math.min(TOTAL_STEPS, prev + 1))}
                >
                  Skip
                </Button>
              )}
            </div>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => void handleSaveStep(step + 1)}
                disabled={!canContinue || isSaving || isUploadingProfileImage}
              >
                {isSaving ? 'Saving...' : 'Save & Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => void handlePublish()}
                disabled={isSaving || isPublishing || isUploadingProfileImage}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isPublishing ? 'Publishing...' : 'Publish Profile'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
