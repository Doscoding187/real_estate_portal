import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import type { SubscriptionPlan, UserSubscription } from '@shared/subscription-types';

type SubscriptionSnapshotView = {
  subscription: UserSubscription;
  plan: SubscriptionPlan | null;
};

export default function AgentSettings() {
  const { user } = useAuth();
  const { isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const isAgent = user?.role === 'agent';

  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    location: '',
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

  const subscriptionSnapshotQuery = trpc.subscription.getMySubscription.useQuery(undefined, {
    enabled: isAgent,
    refetchOnWindowFocus: false,
  });
  const plansQuery = trpc.subscription.getPlans.useQuery(
    { category: 'agent' },
    {
      enabled: isAgent,
      refetchOnWindowFocus: false,
    },
  );
  const upgradePlanMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: () => {
      toast.success('Plan upgraded successfully');
      void subscriptionSnapshotQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || 'Could not upgrade plan');
    },
  });
  const downgradePlanMutation = trpc.subscription.downgrade.useMutation({
    onSuccess: () => {
      toast.success('Plan downgrade scheduled');
      void subscriptionSnapshotQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || 'Could not downgrade plan');
    },
  });

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleSaveNotifications = () => {
    toast.success('Notification preferences saved');
  };

  const snapshot = (subscriptionSnapshotQuery.data as SubscriptionSnapshotView | null) ?? null;
  const currentPlan = snapshot?.plan ?? null;
  const currentSubscription = snapshot?.subscription ?? null;
  const planCatalog = ((plansQuery.data as SubscriptionPlan[] | undefined) ?? []).filter(
    plan => plan.category === 'agent',
  );
  const activeListingCount = 0;
  const currentPlanMaxActiveListings = Number(currentPlan?.limits?.listings ?? -1);

  const resolvePlanMaxActiveListings = (plan: SubscriptionPlan): number => {
    const rawValue = plan?.limits?.listings;
    return typeof rawValue === 'number' ? rawValue : -1;
  };

  const handleChangePlan = (targetPlan: SubscriptionPlan) => {
    const targetPlanId = targetPlan?.plan_id;
    if (!currentPlan || !targetPlanId || currentPlan.plan_id === targetPlanId) return;
    const targetPriceMonthly = Number(targetPlan?.price_zar || 0);
    const currentPrice = Number(currentPlan.price_zar || 0);
    const action = targetPriceMonthly >= currentPrice ? 'upgrade' : 'downgrade';

    if (action === 'downgrade') {
      const targetMaxActiveListings = resolvePlanMaxActiveListings(targetPlan);
      let warningMessage =
        'Downgrading may reduce your feature access. You can continue and upgrade again anytime.';
      if (Number.isFinite(targetMaxActiveListings) && targetMaxActiveListings >= 0) {
        const overLimitCount = Math.max(0, activeListingCount - targetMaxActiveListings);
        if (overLimitCount > 0) {
          warningMessage = `You currently have ${activeListingCount} active listings. ${targetPlan.display_name} allows ${targetMaxActiveListings}. ${overLimitCount} listing${overLimitCount === 1 ? '' : 's'} will be moved to draft (not deleted). Continue?`;
        } else {
          warningMessage = `${targetPlan.display_name} allows ${targetMaxActiveListings} active listings. Continue downgrade?`;
        }
      }

      if (!window.confirm(warningMessage)) {
        return;
      }
    }

    if (action === 'upgrade') {
      upgradePlanMutation.mutate({ new_plan_id: targetPlanId, immediate: true });
      return;
    }

    downgradePlanMutation.mutate({ new_plan_id: targetPlanId, immediate: false });
  };

  const trialEndsAt = currentSubscription?.trial_ends_at
    ? new Date(currentSubscription.trial_ends_at)
    : null;
  const trialDaysRemaining =
    currentSubscription?.status === 'trial_active' && trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;
  const trialBadgeText =
    currentSubscription?.status === 'trial_active'
      ? `${trialDaysRemaining ?? 0} day${trialDaysRemaining === 1 ? '' : 's'} left`
      : currentSubscription?.status === 'trial_expired'
        ? 'Trial expired'
        : currentSubscription
          ? 'Paid plan'
          : 'No trial';

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
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#5a9bd6] to-[var(--primary)] shadow-[0_10px_28px_rgba(0,92,168,0.24)]">
                          <span className="text-2xl font-semibold text-white">
                            {user?.name?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <button className="absolute bottom-0 right-0 rounded-full border border-slate-200 bg-white p-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-all hover:border-[color:color-mix(in_oklab,var(--primary)_24%,white)] hover:text-[var(--primary)]">
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
                        >
                          Change Photo
                        </Button>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={e => setProfileData({ ...profileData, email: e.target.value })}
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
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={e =>
                            setProfileData({ ...profileData, location: e.target.value })
                          }
                          placeholder="City, Province"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        value={profileData.bio}
                        onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                        placeholder="Tell clients about yourself and your expertise..."
                        className="min-h-[120px] w-full rounded-[12px] border border-slate-200 bg-[#fbfaf7] px-4 py-3 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--primary)_12%,white)]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                      <Button variant="outline">Cancel</Button>
                      <Button onClick={handleSaveProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
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
                    ) : subscriptionSnapshotQuery.isLoading ? (
                      <div className="flex items-center justify-center py-12 text-gray-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading your billing profile...
                      </div>
                    ) : !currentPlan ? (
                      <div className="text-center py-12 text-gray-400">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="font-medium">No active plan found</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                            <div className="text-sm text-gray-500">Current Plan</div>
                            <div className="text-xl font-semibold text-gray-900 mt-1">
                              {currentPlan.display_name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              R{Number(currentPlan.price_zar || 0) / 100}/month
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
                          </div>
                          <div className={cn(agentPageStyles.mutedPanel, 'p-4')}>
                            <div className="text-sm text-gray-500">Feature Access</div>
                            <div className="text-sm text-gray-800 mt-2 space-y-1">
                              <div>
                                Active listing limit:{' '}
                                <span className="font-medium">
                                  {currentPlanMaxActiveListings === -1
                                    ? 'Unlimited'
                                    : currentPlanMaxActiveListings}
                                </span>
                              </div>
                              <div>
                                Active listings now:{' '}
                                <span className="font-medium">{activeListingCount}</span>
                              </div>
                              <div>
                                AI insights:{' '}
                                <span className="font-medium">
                                  {currentPlan?.permissions?.analytics_level
                                    ? 'Enabled'
                                    : 'Disabled'}
                                </span>
                              </div>
                              <div>
                                Revenue dashboard:{' '}
                                <span className="font-medium">
                                  {currentPlan?.permissions?.analytics_level === 'advanced'
                                    ? 'Enabled'
                                    : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Change Plan</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {planCatalog.map(plan => {
                              const isCurrent = plan.plan_id === currentPlan.plan_id;
                              const targetPrice = Number(plan.price_zar || 0);
                              const isUpgrade = targetPrice >= Number(currentPlan.price_zar || 0);
                              return (
                                <div
                                  key={plan.id}
                                  className={cn(
                                    'rounded-[15px] border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_0_1px_rgba(15,23,42,0.04)]',
                                    isCurrent
                                      ? 'border-blue-500 ring-2 ring-blue-100'
                                      : 'border-gray-200',
                                  )}
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-semibold text-gray-900">
                                        {plan.display_name}
                                      </div>
                                      <div className="text-sm text-gray-500 mt-1">
                                        R{targetPrice / 100}/month
                                      </div>
                                    </div>
                                    {isCurrent ? (
                                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                        Current
                                      </span>
                                    ) : null}
                                  </div>

                                  <div className="mt-3 text-xs text-gray-500 min-h-[32px]">
                                    {plan.description || 'Subscription tier'}
                                  </div>
                                  {resolvePlanMaxActiveListings(plan) >= 0 ? (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Active listing limit: {resolvePlanMaxActiveListings(plan)}
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-xs text-gray-600">
                                      Active listing limit: Unlimited
                                    </div>
                                  )}

                                  <Button
                                    className="mt-4 w-full"
                                    variant={isCurrent ? 'outline' : 'default'}
                                    disabled={
                                      isCurrent ||
                                      upgradePlanMutation.isPending ||
                                      downgradePlanMutation.isPending
                                    }
                                    onClick={() => handleChangePlan(plan)}
                                  >
                                    {upgradePlanMutation.isPending ||
                                    downgradePlanMutation.isPending ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Updating...
                                      </>
                                    ) : isCurrent ? (
                                      'Current Plan'
                                    ) : isUpgrade ? (
                                      <>
                                        <ArrowUpRight className="h-4 w-4 mr-2" />
                                        Upgrade
                                      </>
                                    ) : (
                                      <>
                                        <ArrowDownRight className="h-4 w-4 mr-2" />
                                        Downgrade
                                      </>
                                    )}
                                  </Button>
                                </div>
                              );
                            })}
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
