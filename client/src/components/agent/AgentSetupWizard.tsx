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
import { ArrowLeft, ArrowRight, CheckCircle2, Upload, X } from 'lucide-react';
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

const TOTAL_STEPS = 5;

type LocationOption = {
  id: number;
  name: string;
  type: 'province' | 'city' | 'suburb';
  provinceName?: string;
  cityName?: string;
};

function splitCsv(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function joinCsv(values: string[] = []) {
  return values.join(', ');
}

function formatCoverageLabel(location: LocationOption) {
  if (location.type === 'suburb') {
    return [location.name, location.cityName, location.provinceName].filter(Boolean).join(', ');
  }

  if (location.type === 'city') {
    return [location.name, location.provinceName].filter(Boolean).join(', ');
  }

  return location.name;
}

export function AgentSetupWizard() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState('');
  const [selectedProfileImageName, setSelectedProfileImageName] = useState('');
  const [isDragOverProfileImage, setIsDragOverProfileImage] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedCoverageAreas, setSelectedCoverageAreas] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    whatsapp: '',
    profileImage: '',
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

  const publishProfileMutation = trpc.agent.publishProfile.useMutation({
    onError: error => {
      toast.error(error.message || 'Failed to request public profile');
    },
  });

  const presignUploadMutation = trpc.upload.presign.useMutation();

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      toast.success('Email verified. Finish your profile setup to unlock publishing.');
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
    setSelectedCoverageAreas(agent.areasServed || []);
  }, [profileQuery.data]);

  useEffect(() => {
    return () => {
      if (profileImagePreviewUrl && profileImagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(profileImagePreviewUrl);
      }
    };
  }, [profileImagePreviewUrl]);

  const currentScore =
    saveProfileMutation.data?.entitlements?.profileCompletionScore ||
    profileQuery.data?.entitlements?.profileCompletionScore ||
    profileQuery.data?.agent?.profileCompletionScore ||
    0;
  const activeProfileImagePreview = profileImagePreviewUrl || formData.profileImage.trim();

  const canContinue =
    step !== 1 || (formData.displayName.trim().length >= 2 && formData.phone.trim().length >= 7);

  const buildPayload = () => ({
    displayName: formData.displayName.trim(),
    phone: formData.phone.trim(),
    whatsapp: formData.whatsapp.trim() || undefined,
    profileImage: formData.profileImage.trim() || undefined,
    areasServed: selectedCoverageAreas,
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

  const addCoverageArea = (location: LocationOption) => {
    const nextLabel = formatCoverageLabel(location);
    setSelectedCoverageAreas(prev =>
      prev.includes(nextLabel) ? prev : [...prev, nextLabel].slice(0, 20),
    );
    setAreaSearch('');
  };

  const removeCoverageArea = (label: string) => {
    setSelectedCoverageAreas(prev => prev.filter(item => item !== label));
  };

  const openProfileImagePicker = () => {
    if (isUploadingProfileImage) return;
    profileImageInputRef.current?.click();
  };

  const replaceProfileImagePreview = (nextPreviewUrl: string) => {
    setProfileImagePreviewUrl(prev => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return nextPreviewUrl;
    });
  };

  const uploadProfileImageFile = async (file: File) => {
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

    replaceProfileImagePreview(URL.createObjectURL(file));
    setSelectedProfileImageName(file.name);
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
        throw new Error(`Profile image upload failed (${uploadResponse.status})`);
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

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await uploadProfileImageFile(file);
  };

  const handleSaveStep = async (nextStep?: number) => {
    await saveProfileMutation.mutateAsync(buildPayload());
    if (nextStep) setStep(nextStep);
  };

  const handleCompleteSetup = async () => {
    await saveProfileMutation.mutateAsync(buildPayload());
    const result = await publishProfileMutation.mutateAsync();

    toast.success(
      result.isPublic
        ? 'Your public profile is now live.'
        : 'Profile completed. Public publishing is pending approval.',
    );

    if (result.slug && result.isPublic) {
      setLocation(`/agents/${result.slug}`);
      return;
    }

    setLocation('/agent/dashboard');
  };

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-600">Loading setup...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Card className="mx-auto max-w-3xl shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Finish your agent setup</CardTitle>
              <CardDescription>
                Step {step} of {TOTAL_STEPS}. Save progress as you go and return later if needed.
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
                  onDragOver={event => {
                    event.preventDefault();
                    if (!isUploadingProfileImage) {
                      setIsDragOverProfileImage(true);
                    }
                  }}
                  onDragLeave={() => setIsDragOverProfileImage(false)}
                  onDrop={event => {
                    event.preventDefault();
                    setIsDragOverProfileImage(false);
                    if (isUploadingProfileImage) return;
                    const file = event.dataTransfer.files?.[0];
                    if (!file) return;
                    void uploadProfileImageFile(file);
                  }}
                  disabled={isUploadingProfileImage}
                  className={`mt-2 w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    isDragOverProfileImage
                      ? 'border-[var(--primary)] bg-blue-50'
                      : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-slate-800">
                    {isUploadingProfileImage
                      ? 'Uploading profile photo...'
                      : 'Drop a profile photo here or click to browse'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">JPG, PNG, or WebP up to 10MB</p>
                  {selectedProfileImageName ? (
                    <p className="mt-3 text-xs font-medium text-slate-700">
                      Selected file: {selectedProfileImageName}
                    </p>
                  ) : null}
                </button>

                {activeProfileImagePreview ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={activeProfileImagePreview}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-2xl object-cover border border-slate-200"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">Photo preview</p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {selectedProfileImageName || 'Current profile photo'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openProfileImagePicker}
                            disabled={isUploadingProfileImage}
                          >
                            Change photo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              replaceProfileImagePreview('');
                              setSelectedProfileImageName('');
                              setFormData(prev => ({ ...prev, profileImage: '' }));
                            }}
                            disabled={isUploadingProfileImage}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Service Areas</Label>
                <div className="mt-2 space-y-3">
                  <LocationAutocomplete
                    value={areaSearch}
                    onValueChange={setAreaSearch}
                    onLocationSelect={location => addCoverageArea(location as LocationOption)}
                    placeholder="Search suburb, city, or province"
                    type="all"
                  />
                  <p className="text-xs text-slate-500">
                    Select exact coverage areas so Rosebank, Johannesburg is not confused with
                    similarly named places elsewhere.
                  </p>
                  {selectedCoverageAreas.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCoverageAreas.map(area => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => removeCoverageArea(area)}
                            className="rounded-full text-slate-400 transition hover:text-slate-700"
                            aria-label={`Remove ${area}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                      No service areas selected yet.
                    </div>
                  )}
                </div>
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
                  onChange={e =>
                    setFormData(prev => ({ ...prev, specializations: e.target.value }))
                  }
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
                  onChange={e =>
                    setFormData(prev => ({ ...prev, bio: e.target.value.slice(0, 1000) }))
                  }
                  placeholder="Tell clients about your experience and what you specialize in."
                  rows={5}
                  maxLength={1000}
                />
                <div className="text-right text-xs text-slate-500">
                  {formData.bio.length}/1000 characters
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>License Number</Label>
                  <Input
                    value={formData.licenseNumber}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Years Experience</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.yearsExperience}
                    onChange={e =>
                      setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div>
                <Label>Public Profile Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="jane-doe"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Your profile will be available at `/agents/:slug`.
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 p-4 space-y-2">
                <p className="text-sm">Profile completion: {currentScore}%</p>
                <p className="text-sm">
                  Listing publish unlock: {currentScore >= 70 ? 'Ready' : 'Need 70%+'}
                </p>
                <p className="text-sm">
                  Directory visibility unlock:{' '}
                  {currentScore >= 80 ? 'Ready' : 'Need 80% + photo + service areas'}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(prev => Math.max(1, prev - 1))}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
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
                disabled={!canContinue || saveProfileMutation.isPending || isUploadingProfileImage}
              >
                {saveProfileMutation.isPending ? 'Saving...' : 'Save & Continue'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => void handleCompleteSetup()}
                disabled={
                  saveProfileMutation.isPending ||
                  publishProfileMutation.isPending ||
                  isUploadingProfileImage
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {publishProfileMutation.isPending ? 'Completing...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
