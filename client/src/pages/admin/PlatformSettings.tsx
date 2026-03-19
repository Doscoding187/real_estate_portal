// @ts-nocheck
import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { isSuperAdminRole } from '@/_core/roles';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, ArrowLeft, Save, Key, Tag, DollarSign, Bell, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformSettings() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [affordabilityDrafts, setAffordabilityDrafts] = useState<Record<string, number>>({});
  const isSuperAdmin = isSuperAdminRole(user?.role);

  const { data: currentSettings, isLoading } = trpc.admin.getPlatformSettings.useQuery();
  const affordabilityConfigQuery = trpc.admin.listAffordabilityConfig.useQuery(undefined, {
    retry: false,
  });

  const updateSettingMutation = trpc.admin.updatePlatformSetting.useMutation({
    onSuccess: () => {
      toast.success('Setting updated successfully');
      setModifiedKeys(new Set());
    },
    onError: error => {
      toast.error(error.message || 'Failed to update setting');
    },
  });

  const updateAffordabilityConfigMutation = trpc.admin.updateAffordabilityConfig.useMutation({
    onSuccess: async () => {
      toast.success('Affordability config updated');
      await affordabilityConfigQuery.refetch();
      await utils.distribution.qualification.previewQuick.invalidate();
    },
    onError: error => {
      toast.error(error.message || 'Failed to update affordability config');
    },
  });

  // Redirect if not authenticated or not super admin
  if (!isAuthenticated || !isSuperAdmin) {
    setLocation('/login');
    return null;
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setModifiedKeys(prev => new Set(prev).add(key));
  };

  const handleSaveSetting = (key: string) => {
    const value = settings[key];
    if (value === undefined) return;

    updateSettingMutation.mutate({
      key,
      value,
    });
  };

  const getSettingValue = (key: string, defaultValue: any = '') => {
    if (settings[key] !== undefined) return settings[key];

    const setting = currentSettings?.find((s: any) => s.key === key);
    if (setting) {
      try {
        return JSON.parse(setting.value);
      } catch {
        return setting.value;
      }
    }

    return defaultValue;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pricing':
        return <DollarSign className="h-4 w-4" />;
      case 'features':
        return <Zap className="h-4 w-4" />;
      case 'notifications':
        return <Bell className="h-4 w-4" />;
      case 'limits':
        return <Shield className="h-4 w-4" />;
      default:
        return <Key className="h-4 w-4" />;
    }
  };

  const getAffordabilityValue = (row: any) => {
    if (typeof affordabilityDrafts[row.key] === 'number') return affordabilityDrafts[row.key];
    return Number(row.value || 0);
  };

  const handleAffordabilityValueChange = (key: string, value: number) => {
    setAffordabilityDrafts(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAffordability = (row: any) => {
    const nextValue = getAffordabilityValue(row);
    updateAffordabilityConfigMutation.mutate({
      key: row.key,
      value: Number(nextValue),
    });
  };

  const categories = ['pricing', 'features', 'notifications', 'limits', 'other'];
  const categoryTitles = {
    pricing: 'Pricing & Billing',
    features: 'Feature Toggles',
    notifications: 'Notifications',
    limits: 'Limits & Restrictions',
    other: 'Other Settings',
  };

  const defaultSettings = {
    pricing: [
      {
        key: 'basic_plan_price',
        label: 'Basic Plan Monthly Price (ZAR)',
        type: 'number',
        default: 499,
      },
      {
        key: 'premium_plan_price',
        label: 'Premium Plan Monthly Price (ZAR)',
        type: 'number',
        default: 999,
      },
      {
        key: 'enterprise_plan_price',
        label: 'Enterprise Plan Monthly Price (ZAR)',
        type: 'number',
        default: 2499,
      },
      { key: 'trial_days', label: 'Trial Period (Days)', type: 'number', default: 14 },
    ],
    features: [
      {
        key: 'featured_listings_enabled',
        label: 'Enable Featured Listings',
        type: 'boolean',
        default: true,
      },
      {
        key: 'explore_videos_enabled',
        label: 'Enable Explore Videos',
        type: 'boolean',
        default: true,
      },
      {
        key: 'voice_transcription_enabled',
        label: 'Enable Voice Transcription',
        type: 'boolean',
        default: false,
      },
      {
        key: 'ai_agent_enabled',
        label: 'Enable AI Agent Features',
        type: 'boolean',
        default: false,
      },
      {
        key: 'agent_os_allow_legacy_scheduling_inventory',
        label: 'Allow Legacy Scheduling Inventory Fallback',
        type: 'boolean',
        default: true,
      },
    ],
    notifications: [
      {
        key: 'email_notifications_enabled',
        label: 'Enable Email Notifications',
        type: 'boolean',
        default: true,
      },
      {
        key: 'subscription_reminder_days',
        label: 'Subscription Reminder (Days Before Expiry)',
        type: 'number',
        default: 7,
      },
    ],
    limits: [
      {
        key: 'max_properties_per_agency',
        label: 'Max Properties Per Agency',
        type: 'number',
        default: 100,
      },
      {
        key: 'max_images_per_property',
        label: 'Max Images Per Property',
        type: 'number',
        default: 20,
      },
      {
        key: 'max_video_duration_seconds',
        label: 'Max Video Duration (Seconds)',
        type: 'number',
        default: 60,
      },
    ],
    other: [
      { key: 'platform_name', label: 'Platform Name', type: 'text', default: 'SA Property Portal' },
      {
        key: 'support_email',
        label: 'Support Email',
        type: 'text',
        default: 'support@propertyportal.co.za',
      },
      { key: 'terms_url', label: 'Terms of Service URL', type: 'text', default: '' },
      { key: 'privacy_url', label: 'Privacy Policy URL', type: 'text', default: '' },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/overview')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Platform Settings</h1>
              <p className="text-muted-foreground">
                Configure global platform settings and features
              </p>
            </div>
          </div>
        </div>

        {/* Settings by Category */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading settings...
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Affordability Engine Config
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {affordabilityConfigQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading affordability assumptions...</p>
                ) : (
                  (affordabilityConfigQuery.data?.entries || []).map((row: any) => (
                    <div key={row.key} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Key: <code>{row.key}</code> | Default: {row.defaultValue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step={row.valueType === 'integer' ? 1 : row.step || 0.01}
                          min={row.min}
                          max={row.max}
                          value={getAffordabilityValue(row)}
                          onChange={event =>
                            handleAffordabilityValueChange(
                              row.key,
                              row.valueType === 'integer'
                                ? parseInt(event.target.value || '0')
                                : parseFloat(event.target.value || '0'),
                            )
                          }
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveAffordability(row)}
                          disabled={updateAffordabilityConfigMutation.isPending}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {categories.map(category => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {categoryTitles[category as keyof typeof categoryTitles]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {defaultSettings[category as keyof typeof defaultSettings].map((setting: any) => (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <Label htmlFor={setting.key} className="text-sm font-medium">
                          {setting.label}
                        </Label>
                        {setting.type === 'boolean' ? (
                          <div className="mt-2">
                            <Switch
                              id={setting.key}
                              checked={getSettingValue(setting.key, setting.default)}
                              onCheckedChange={checked => handleSettingChange(setting.key, checked)}
                            />
                          </div>
                        ) : setting.type === 'number' ? (
                          <div className="mt-2">
                            <Input
                              id={setting.key}
                              type="number"
                              value={getSettingValue(setting.key, setting.default)}
                              onChange={e =>
                                handleSettingChange(setting.key, parseInt(e.target.value) || 0)
                              }
                              className="w-32"
                            />
                          </div>
                        ) : (
                          <div className="mt-2">
                            <Input
                              id={setting.key}
                              type="text"
                              value={getSettingValue(setting.key, setting.default)}
                              onChange={e => handleSettingChange(setting.key, e.target.value)}
                              className="w-64"
                            />
                          </div>
                        )}
                      </div>

                      {modifiedKeys.has(setting.key) && (
                        <Button
                          size="sm"
                          onClick={() => handleSaveSetting(setting.key)}
                          disabled={updateSettingMutation.isPending}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
