import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Smartphone,
  Mail,
  Globe,
  Shield,
  Key,
  Link2,
  Eye,
  EyeOff,
  Save,
  Camera,
  Loader2,
  Clock,
  X,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';

type LocationOption = {
  id: number;
  name: string;
  type: 'province' | 'city' | 'suburb';
  provinceName?: string;
  cityName?: string;
};

const AGENT_BIO_MAX_LENGTH = 1000;

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

const AGENT_TIER_LABELS: Record<string, string> = {
  free: 'Free Trial',
  starter: 'Starter',
  professional: 'Professional',
  elite: 'Elite',
};

const AGENT_TIER_DESCRIPTIONS: Record<string, string> = {
  free: 'Trial access while you finish onboarding and publish your profile.',
  starter: 'Launch tier for early traction, profile visibility, and core lead handling.',
  professional: 'Growth tier with stronger intelligence, reporting, and publishing capacity.',
  elite: 'Top tier for scale, priority exposure, and full operational access.',
};

function formatSubscriptionStatus(status: string | null | undefined) {
  switch (status) {
    case 'trial':
      return 'Trial active';
    case 'active':
      return 'Active subscription';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Not configured';
  }
}

export default function AgentSettings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const isAgent = user?.role === 'agent';
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [selectedProfileImageName, setSelectedProfileImageName] = useState('');
  const [areaSearch, setAreaSearch] = useState('');

  // Form states
  const [profileData, setProfileData] = useState({
    displayName: user?.name || '',
    email: user?.email || '',
    phone: '',
    whatsapp: '',
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
    profileImage: '',
    areasServed: [] as string[],
  });

  const [notifications, setNotifications] = useState({
    emailLeads: true,
    emailShowings: true,
    emailCommissions: true,
    pushLeads: true,
    pushShowings: false,
    pushCommissions: true,
    smsShowings: true,
  });

  const profileQuery = trpc.agent.getMyProfileOnboarding.useQuery(undefined, {
    enabled: isAgent,
    refetchOnWindowFocus: false,
  });
  const saveProfileMutation = trpc.agent.updateMyProfileOnboarding.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully');
      void profileQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
  const presignUploadMutation = trpc.upload.presign.useMutation();

  useEffect(() => {
    const agent = profileQuery.data?.agent;
    if (!agent) return;

    setProfileData({
      displayName: agent.displayName || user?.name || '',
      email: user?.email || '',
      phone: agent.phone || '',
      whatsapp: agent.whatsapp || '',
      focus: agent.focus || 'both',
      specializations: joinCsv(agent.specializations || []),
      propertyTypes: joinCsv(agent.propertyTypes || []),
      bio: agent.bio || '',
      licenseNumber: agent.licenseNumber || '',
      yearsExperience:
        typeof agent.yearsExperience === 'number' ? String(agent.yearsExperience) : '0',
      languages: joinCsv(agent.languages || []),
      website: agent.socialLinks?.website || '',
      facebook: agent.socialLinks?.facebook || '',
      instagram: agent.socialLinks?.instagram || '',
      linkedin: agent.socialLinks?.linkedin || '',
      twitter: agent.socialLinks?.twitter || '',
      slug: agent.slug || '',
      profileImage: agent.profileImage || '',
      areasServed: agent.areasServed || [],
    });
  }, [profileQuery.data, user?.email, user?.name]);

  const handleSaveProfile = () => {
    saveProfileMutation.mutate({
      displayName: profileData.displayName.trim(),
      phone: profileData.phone.trim(),
      whatsapp: profileData.whatsapp.trim() || undefined,
      focus:
        profileData.focus === 'sales' ||
        profileData.focus === 'rentals' ||
        profileData.focus === 'both'
          ? profileData.focus
          : undefined,
      specializations: splitCsv(profileData.specializations),
      propertyTypes: splitCsv(profileData.propertyTypes),
      bio: profileData.bio.trim() || undefined,
      licenseNumber: profileData.licenseNumber.trim() || undefined,
      yearsExperience: Number(profileData.yearsExperience || 0),
      languages: splitCsv(profileData.languages),
      socialLinks: {
        website: profileData.website.trim(),
        facebook: profileData.facebook.trim(),
        instagram: profileData.instagram.trim(),
        linkedin: profileData.linkedin.trim(),
        twitter: profileData.twitter.trim(),
      },
      slug: profileData.slug.trim() || undefined,
      profileImage: profileData.profileImage || undefined,
      areasServed: profileData.areasServed,
    });
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };
  const currentTierKey = status?.subscriptionTier || 'starter';
  const currentTierLabel = AGENT_TIER_LABELS[currentTierKey] || 'Selected tier';
  const currentTierDescription =
    AGENT_TIER_DESCRIPTIONS[currentTierKey] ||
    'Your current onboarding tier controls the features available in Agent OS.';
  const trialEndsAt = status?.entitlements?.trialStatusDetail?.trialEndsAt
    ? new Date(status.entitlements.trialStatusDetail.trialEndsAt)
    : status?.trialEndsAt
      ? new Date(status.trialEndsAt)
      : null;
  const trialDaysRemaining = status?.entitlements?.trialStatusDetail?.daysRemaining ?? null;
  const trialBadgeText =
    status?.entitlements?.trialStatusDetail?.status === 'active'
      ? `${trialDaysRemaining ?? 0} day${trialDaysRemaining === 1 ? '' : 's'} left`
      : status?.entitlements?.trialStatusDetail?.status === 'expired'
        ? 'Trial expired'
        : formatSubscriptionStatus(status?.subscriptionStatus);
  const featureFlags = status?.entitlements?.featureFlags;
  const currentPlanMaxActiveListings = featureFlags?.maxActiveListings ?? 0;
  const listingLimitLabel =
    currentPlanMaxActiveListings === -1
      ? 'Unlimited'
      : currentPlanMaxActiveListings > 0
        ? String(currentPlanMaxActiveListings)
        : 'Not available yet';

  return (
    <AgentAppShell>
      <div className="min-h-screen bg-[#f7f6f3]">
        {/* Header */}
        <header className="border-b border-slate-200/80 bg-white/92 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={agentPageStyles.title}>Settings</h1>
                <p className={cn(agentPageStyles.subtitle, 'mt-1')}>
                  Manage your account and preferences
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn(agentPageStyles.container, 'max-w-[1200px]')}>
          {statusLoading ? (
            <AgentFeatureLockedState
              title="Preparing your settings workspace"
              description="We are confirming your onboarding access before loading account and billing settings."
              actionLabel="Loading"
              onAction={() => {}}
              isLoading
            />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={cn(agentPageStyles.tabsList, 'mb-6 grid w-full grid-cols-5')}>
                <TabsTrigger value="profile" className={agentPageStyles.tabTrigger}>
                  Profile
                </TabsTrigger>
                <TabsTrigger value="notifications" className={agentPageStyles.tabTrigger}>
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className={agentPageStyles.tabTrigger}>
                  Security
                </TabsTrigger>
                <TabsTrigger value="billing" className={agentPageStyles.tabTrigger}>
                  Billing
                </TabsTrigger>
                <TabsTrigger value="integrations" className={agentPageStyles.tabTrigger}>
                  Integrations
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Photo */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {profileData.profileImage ? (
                          <img
                            src={profileData.profileImage}
                            alt="Agent profile"
                            className="h-24 w-24 rounded-full object-cover shadow-[0_10px_28px_rgba(0,92,168,0.18)]"
                          />
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#5a9bd6] to-[var(--primary)] shadow-[0_10px_28px_rgba(0,92,168,0.24)]">
                            <span className="text-2xl font-semibold text-white">
                              {(profileData.displayName || user?.name)?.charAt(0) || 'A'}
                            </span>
                          </div>
                        )}
                        <input
                          ref={profileImageInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={async event => {
                            const file = event.target.files?.[0];
                            event.target.value = '';
                            if (!file) return;
                            const allowedTypes = [
                              'image/jpeg',
                              'image/jpg',
                              'image/png',
                              'image/webp',
                            ];
                            if (!allowedTypes.includes(file.type)) {
                              toast.error('Invalid image type. Upload JPG, PNG, or WebP.');
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('Image is too large. Maximum size is 10MB.');
                              return;
                            }

                            setIsUploadingProfileImage(true);
                            setSelectedProfileImageName(file.name);
                            const loadingToastId = toast.loading('Uploading profile photo...');

                            try {
                              const { url, publicUrl } = await presignUploadMutation.mutateAsync({
                                filename: file.name,
                                contentType: file.type,
                              });
                              const uploadResponse = await fetch(url, {
                                method: 'PUT',
                                body: file,
                                headers: { 'Content-Type': file.type },
                              });

                              if (!uploadResponse.ok) {
                                throw new Error(
                                  `Profile image upload failed (${uploadResponse.status})`,
                                );
                              }

                              setProfileData(prev => ({ ...prev, profileImage: publicUrl }));
                              toast.success('Profile photo uploaded.', { id: loadingToastId });
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to upload profile photo.',
                                { id: loadingToastId },
                              );
                            } finally {
                              setIsUploadingProfileImage(false);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => profileImageInputRef.current?.click()}
                          disabled={isUploadingProfileImage}
                          className="absolute bottom-0 right-0 rounded-full border border-slate-200 bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Camera className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Profile Photo</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Upload a professional photo to build trust with clients
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(agentPageStyles.ghostButton, 'mt-3')}
                          onClick={() => profileImageInputRef.current?.click()}
                          disabled={isUploadingProfileImage}
                        >
                          {isUploadingProfileImage ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Change Photo'
                          )}
                        </Button>
                        {selectedProfileImageName ? (
                          <p className="mt-2 text-xs text-gray-500">{selectedProfileImageName}</p>
                        ) : null}
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="display-name">Display Name</Label>
                        <Input
                          id="display-name"
                          value={profileData.displayName}
                          onChange={e =>
                            setProfileData({ ...profileData, displayName: e.target.value })
                          }
                          placeholder="Enter your public display name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          placeholder="your.email@example.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                          placeholder="+27 12 345 6789"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          type="tel"
                          value={profileData.whatsapp}
                          onChange={e =>
                            setProfileData({ ...profileData, whatsapp: e.target.value })
                          }
                          placeholder="+27 82 000 0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Service Areas</Label>
                      <LocationAutocomplete
                        value={areaSearch}
                        onValueChange={setAreaSearch}
                        onLocationSelect={location => {
                          const nextLabel = formatCoverageLabel(location as LocationOption);
                          setProfileData(prev => ({
                            ...prev,
                            areasServed: prev.areasServed.includes(nextLabel)
                              ? prev.areasServed
                              : [...prev.areasServed, nextLabel].slice(0, 20),
                          }));
                          setAreaSearch('');
                        }}
                        placeholder="Search suburb, city, or province"
                        type="all"
                      />
                      <p className="text-xs text-slate-500">
                        Select the exact places you cover so identical suburb names do not get mixed
                        up.
                      </p>
                      {profileData.areasServed.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profileData.areasServed.map(area => (
                            <span
                              key={area}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                            >
                              {area}
                              <button
                                type="button"
                                onClick={() =>
                                  setProfileData(prev => ({
                                    ...prev,
                                    areasServed: prev.areasServed.filter(item => item !== area),
                                  }))
                                }
                                className="rounded-full text-slate-400 transition hover:text-slate-700"
                                aria-label={`Remove ${area}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[12px] border border-dashed border-slate-200 bg-[#fbfaf7] p-4 text-sm text-slate-500">
                          No service areas selected yet.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="focus">Market Focus</Label>
                        <select
                          id="focus"
                          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                          value={profileData.focus}
                          onChange={e =>
                            setProfileData({
                              ...profileData,
                              focus: e.target.value,
                            })
                          }
                        >
                          <option value="both">Sales and Rentals</option>
                          <option value="sales">Sales only</option>
                          <option value="rentals">Rentals only</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="languages">Languages</Label>
                        <Input
                          id="languages"
                          value={profileData.languages}
                          onChange={e =>
                            setProfileData({ ...profileData, languages: e.target.value })
                          }
                          placeholder="English, Zulu"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="specializations">Specializations</Label>
                        <Input
                          id="specializations"
                          value={profileData.specializations}
                          onChange={e =>
                            setProfileData({ ...profileData, specializations: e.target.value })
                          }
                          placeholder="Residential sales, Luxury, First-time buyers"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="property-types">Property Types</Label>
                        <Input
                          id="property-types"
                          value={profileData.propertyTypes}
                          onChange={e =>
                            setProfileData({ ...profileData, propertyTypes: e.target.value })
                          }
                          placeholder="Apartment, House, Commercial"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={e =>
                          setProfileData({
                            ...profileData,
                            bio: e.target.value.slice(0, AGENT_BIO_MAX_LENGTH),
                          })
                        }
                        placeholder="Tell clients about yourself and your expertise..."
                        className="min-h-[120px]"
                        maxLength={AGENT_BIO_MAX_LENGTH}
                      />
                      <div className="text-right text-xs text-slate-500">
                        {profileData.bio.length}/{AGENT_BIO_MAX_LENGTH} characters
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="license-number">License Number</Label>
                        <Input
                          id="license-number"
                          value={profileData.licenseNumber}
                          onChange={e =>
                            setProfileData({ ...profileData, licenseNumber: e.target.value })
                          }
                          placeholder="FFC / license number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="years-experience">Years Experience</Label>
                        <Input
                          id="years-experience"
                          type="number"
                          min={0}
                          max={80}
                          value={profileData.yearsExperience}
                          onChange={e =>
                            setProfileData({ ...profileData, yearsExperience: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-slug">Public Profile Slug</Label>
                        <Input
                          id="profile-slug"
                          value={profileData.slug}
                          onChange={e => setProfileData({ ...profileData, slug: e.target.value })}
                          placeholder="jane-doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                      <div>
                        <h3 className="font-semibold text-slate-900">Public Links</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Keep your public profile and social channels aligned with the setup
                          wizard.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={profileData.website}
                            onChange={e =>
                              setProfileData({ ...profileData, website: e.target.value })
                            }
                            placeholder="https://yourwebsite.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="linkedin">LinkedIn</Label>
                          <Input
                            id="linkedin"
                            value={profileData.linkedin}
                            onChange={e =>
                              setProfileData({ ...profileData, linkedin: e.target.value })
                            }
                            placeholder="https://linkedin.com/in/yourprofile"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="facebook">Facebook</Label>
                          <Input
                            id="facebook"
                            value={profileData.facebook}
                            onChange={e =>
                              setProfileData({ ...profileData, facebook: e.target.value })
                            }
                            placeholder="https://facebook.com/yourpage"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instagram">Instagram</Label>
                          <Input
                            id="instagram"
                            value={profileData.instagram}
                            onChange={e =>
                              setProfileData({ ...profileData, instagram: e.target.value })
                            }
                            placeholder="https://instagram.com/yourhandle"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="twitter">X / Twitter</Label>
                          <Input
                            id="twitter"
                            value={profileData.twitter}
                            onChange={e =>
                              setProfileData({ ...profileData, twitter: e.target.value })
                            }
                            placeholder="https://x.com/yourhandle"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const agent = profileQuery.data?.agent;
                          if (!agent) return;
                          setProfileData({
                            displayName: agent.displayName || user?.name || '',
                            email: user?.email || '',
                            phone: agent.phone || '',
                            whatsapp: agent.whatsapp || '',
                            focus: agent.focus || 'both',
                            specializations: joinCsv(agent.specializations || []),
                            propertyTypes: joinCsv(agent.propertyTypes || []),
                            bio: agent.bio || '',
                            licenseNumber: agent.licenseNumber || '',
                            yearsExperience:
                              typeof agent.yearsExperience === 'number'
                                ? String(agent.yearsExperience)
                                : '0',
                            languages: joinCsv(agent.languages || []),
                            website: agent.socialLinks?.website || '',
                            facebook: agent.socialLinks?.facebook || '',
                            instagram: agent.socialLinks?.instagram || '',
                            linkedin: agent.socialLinks?.linkedin || '',
                            twitter: agent.socialLinks?.twitter || '',
                            slug: agent.slug || '',
                            profileImage: agent.profileImage || '',
                            areasServed: agent.areasServed || [],
                          });
                          setAreaSearch('');
                          setSelectedProfileImageName('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saveProfileMutation.isPending || isUploadingProfileImage}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-blue-600" />
                      Notification Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email Notifications */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-gray-600" />
                        Email Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          {
                            key: 'emailLeads',
                            label: 'New Leads',
                            description: 'Get notified when you receive new leads',
                          },
                          {
                            key: 'emailShowings',
                            label: 'Showing Requests',
                            description: 'Notifications for new showing requests',
                          },
                          {
                            key: 'emailCommissions',
                            label: 'Commission Updates',
                            description: 'Updates on commission status changes',
                          },
                        ].map(item => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-4"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <Switch
                              checked={
                                notifications[item.key as keyof typeof notifications] as boolean
                              }
                              onCheckedChange={checked =>
                                setNotifications({ ...notifications, [item.key]: checked })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Push Notifications */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-gray-600" />
                        Push Notifications
                      </h3>
                      <div className="space-y-4">
                        {[
                          {
                            key: 'pushLeads',
                            label: 'New Leads',
                            description: 'Real-time lead notifications',
                          },
                          {
                            key: 'pushShowings',
                            label: 'Showing Reminders',
                            description: '15 min before scheduled showings',
                          },
                          {
                            key: 'pushCommissions',
                            label: 'Commission Alerts',
                            description: 'Payment and approval notifications',
                          },
                        ].map(item => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-4"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{item.label}</p>
                              <p className="text-sm text-gray-500">{item.description}</p>
                            </div>
                            <Switch
                              checked={
                                notifications[item.key as keyof typeof notifications] as boolean
                              }
                              onCheckedChange={checked =>
                                setNotifications({ ...notifications, [item.key]: checked })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                      <Button variant="outline">Reset to Default</Button>
                      <Button onClick={handleSaveNotifications}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Change Password */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-gray-600" />
                        Change Password
                      </h3>
                      <div className="space-y-4 max-w-md">
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter new password"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input
                            id="confirm-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                          />
                        </div>

                        <Button className="w-full">Update Password</Button>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="pt-6 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                            <Key className="h-5 w-5 text-gray-600" />
                            Two-Factor Authentication
                          </h3>
                          <p className="text-sm text-gray-500">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline">Enable 2FA</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      Billing & Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!isAgent ? (
                      <div className="text-center py-12 text-gray-400">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">Billing is available for agent accounts only</p>
                      </div>
                    ) : statusLoading ? (
                      <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading your billing profile...
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                            <div className="text-sm text-gray-500">Current Access</div>
                            <div className="text-xl font-semibold text-gray-900 mt-1">
                              {currentTierLabel}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {currentTierDescription}
                            </div>
                          </div>
                          <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                            <div className="text-sm text-gray-500">Trial Status</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span className="text-lg font-semibold text-gray-900">
                                {trialBadgeText}
                              </span>
                            </div>
                            {trialEndsAt ? (
                              <div className="text-sm text-gray-500 mt-1">
                                Ends {trialEndsAt.toLocaleDateString()}
                              </div>
                            ) : null}
                            <div className="text-sm text-gray-500 mt-1">
                              {formatSubscriptionStatus(status?.subscriptionStatus)}
                            </div>
                          </div>
                          <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                            <div className="text-sm text-gray-500">Feature Access</div>
                            <div className="text-sm text-gray-800 mt-2 space-y-1">
                              <div>
                                Active listing limit:{' '}
                                <span className="font-medium">{listingLimitLabel}</span>
                              </div>
                              <div>
                                Priority exposure:{' '}
                                <span className="font-medium">
                                  {featureFlags?.hasPriorityExposure ? 'Enabled' : 'Standard'}
                                </span>
                              </div>
                              <div>
                                AI insights:{' '}
                                <span className="font-medium">
                                  {featureFlags?.hasAiInsights ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                              <div>
                                Revenue dashboard:{' '}
                                <span className="font-medium">
                                  {featureFlags?.hasRevenueDashboard ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-gray-900">Billing setup status</h3>
                              <p className="max-w-2xl text-sm leading-6 text-gray-600">
                                Your onboarding tier is saved and your current entitlements are
                                active. Self-serve billing actions like card management, invoices,
                                and live plan switching will appear here once the billing
                                infrastructure is connected in production.
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-600">
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                  Selected tier: {currentTierLabel}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                  Status: {formatSubscriptionStatus(status?.subscriptionStatus)}
                                </span>
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                  Listings: {listingLimitLabel}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 md:min-w-[220px]">
                              <Button onClick={() => setLocation('/agent/select-package')}>
                                Review launch tiers
                              </Button>
                              <Button variant="outline" onClick={() => setActiveTab('profile')}>
                                Update profile access
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Integrations Tab */}
              <TabsContent value="integrations" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-blue-600" />
                      Connected Integrations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          name: 'Google Calendar',
                          description: 'Sync your showings and appointments',
                          connected: true,
                        },
                        {
                          name: 'WhatsApp Business',
                          description: 'Send automated messages to clients',
                          connected: false,
                        },
                        { name: 'Zapier', description: 'Connect to 1000+ apps', connected: false },
                      ].map(integration => (
                        <div
                          key={integration.name}
                          className="flex items-center justify-between rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <Globe className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{integration.name}</p>
                              <p className="text-sm text-gray-500">{integration.description}</p>
                            </div>
                          </div>
                          {integration.connected ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className={agentPageStyles.ghostButton}
                            >
                              Disconnect
                            </Button>
                          ) : (
                            <Button size="sm" className={agentPageStyles.primaryButton}>
                              Connect
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </AgentAppShell>
  );
}
