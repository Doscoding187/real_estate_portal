import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { AgentFeatureLockedState } from '@/components/agent/AgentFeatureLockedState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { useAgentOnboardingStatus } from '@/hooks/useAgentOnboardingStatus';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart3,
  Copy,
  ExternalLink,
  Eye,
  Facebook,
  FileText,
  Globe,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Megaphone,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Twitter,
  Upload,
  Video,
} from 'lucide-react';

type MarketingTemplate = {
  id: string;
  category: string;
  title: string;
  description: string;
  content: string;
  icon: typeof Megaphone;
};

type SocialPlatform = {
  key: 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'website';
  name: string;
  icon: typeof Instagram;
  bgClass: string;
  connectedUrl?: string;
};

const ZAR_FORMATTER = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('en-ZA');

const contentTemplates: MarketingTemplate[] = [
  {
    id: 'new-listing-announcement',
    category: 'Social post',
    title: 'New listing announcement',
    description: 'A short launch post for Instagram, Facebook, or LinkedIn.',
    content:
      'Just listed in [Suburb]. [Property type] with [key feature], priced at [price]. DM me for a private viewing or more information.',
    icon: Megaphone,
  },
  {
    id: 'walkthrough-hook',
    category: 'Video script',
    title: 'Property walkthrough hook',
    description: 'A cleaner opening line for Explore or short-form property tours.',
    content:
      'If you want [target buyer outcome], this [property type] in [Suburb] is worth your attention. Let me show you the three details that make it stand out.',
    icon: Video,
  },
  {
    id: 'open-house-invite',
    category: 'Client email',
    title: 'Open house invitation',
    description: 'Invite active buyers without sounding generic.',
    content:
      'I would like to invite you to a private viewing / open house at [property title] in [Suburb] on [date]. If you would like the brochure and pin location, reply here and I will send it through.',
    icon: FileText,
  },
  {
    id: 'market-update',
    category: 'Market update',
    title: 'Neighborhood pulse update',
    description: 'Use this when you want to stay visible without pushing a listing.',
    content:
      'Buyer activity in [Suburb] is currently [trend]. Homes in the [price band] range are drawing the most interest. If you want an updated pricing view for your street or shortlist, I can share one.',
    icon: BarChart3,
  },
];

function formatCurrency(value: unknown) {
  const amount = Number(value || 0);
  return amount > 0 ? ZAR_FORMATTER.format(amount) : 'Price on request';
}

function formatNumber(value: unknown) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

function formatDate(value: unknown) {
  if (!value) return 'Recently';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFocusLabel(value: string | null | undefined) {
  switch (value) {
    case 'sales':
      return 'Sales focus';
    case 'rentals':
      return 'Rentals focus';
    default:
      return 'Sales and rentals';
  }
}

function formatListingStatusLabel(value: string | null | undefined) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'available' || normalized === 'published' || normalized === 'active') {
    return 'Live';
  }

  return formatStatus(value);
}

function normalizeExternalUrl(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getProfileUrl(slug: string | undefined) {
  if (!slug || typeof window === 'undefined') return null;
  return `${window.location.origin}/agents/${slug}`;
}

function MetricCard({
  title,
  value,
  meta,
  icon,
  accentClass,
}: {
  title: string;
  value: string;
  meta: string;
  icon: ReactNode;
  accentClass: string;
}) {
  return (
    <Card className={cn(agentPageStyles.statCard, 'border-l-4', accentClass)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-2 text-xs font-medium text-slate-500">{meta}</p>
          </div>
          <div className="rounded-xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/70">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
        <Sparkles className="h-5 w-5 text-[var(--primary)]" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className={cn(agentPageStyles.primaryButton, 'mt-5')}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function AgentMarketingHub() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { status, isLoading: statusLoading } = useAgentOnboardingStatus({
    requireDashboardUnlocked: true,
  });

  const allowedTabs = useMemo(
    () => new Set(['explore', 'promote', 'social', 'branding', 'templates']),
    [],
  );
  const initialTab = useMemo(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab && allowedTabs.has(tab) ? tab : 'explore';
  }, [allowedTabs]);
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && allowedTabs.has(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [activeTab, allowedTabs, location]);

  useEffect(() => {
    const nextSearch = new URLSearchParams(window.location.search);
    if (nextSearch.get('tab') !== activeTab) {
      nextSearch.set('tab', activeTab);
      const nextPath = `${window.location.pathname}?${nextSearch.toString()}`;
      window.history.replaceState(null, '', nextPath);
    }
  }, [activeTab]);

  const marketingLocked = !statusLoading && !status?.entitlements?.canPublishListings;

  const profileQuery = trpc.agent.getMyProfileOnboarding.useQuery(undefined, {
    enabled: Boolean(user) && !marketingLocked,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const listingsQuery = trpc.agent.getMyListings.useQuery(
    { limit: 24 },
    {
      enabled: Boolean(user) && !marketingLocked,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const marketingSummaryQuery = trpc.demand.myLeadSummary.useQuery(undefined, {
    enabled: Boolean(user) && !marketingLocked,
    retry: false,
  });
  const campaignsQuery = trpc.demand.listMyCampaigns.useQuery(undefined, {
    enabled: Boolean(user) && !marketingLocked,
    retry: false,
  });
  const exploreAnalyticsQuery = trpc.exploreAnalytics.getMyAnalyticsDashboard.useQuery(
    { period: 'week' },
    {
      enabled: Boolean(user) && !marketingLocked,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const profile = profileQuery.data?.agent;
  const liveListings = useMemo(
    () =>
      (listingsQuery.data || []).filter(listing =>
        ['available', 'published'].includes(String(listing.status || '').toLowerCase()),
      ),
    [listingsQuery.data],
  );
  const analytics = exploreAnalyticsQuery.data?.data;
  const profileUrl = getProfileUrl(profile?.slug || undefined);
  const socialLinks = profile?.socialLinks || {};
  const socialPlatforms: SocialPlatform[] = [
    {
      key: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      bgClass: 'from-[#ff6a95] via-[#ff5f7a] to-[#9b4dff]',
      connectedUrl: normalizeExternalUrl(socialLinks.instagram || undefined),
    },
    {
      key: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      bgClass: 'from-[#2563eb] to-[#1d4ed8]',
      connectedUrl: normalizeExternalUrl(socialLinks.facebook || undefined),
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      bgClass: 'from-[#0f5fbf] to-[#0a66c2]',
      connectedUrl: normalizeExternalUrl(socialLinks.linkedin || undefined),
    },
    {
      key: 'twitter',
      name: 'X / Twitter',
      icon: Twitter,
      bgClass: 'from-slate-700 to-slate-900',
      connectedUrl: normalizeExternalUrl(socialLinks.twitter || undefined),
    },
    {
      key: 'website',
      name: 'Website',
      icon: Globe,
      bgClass: 'from-emerald-500 to-teal-600',
      connectedUrl: normalizeExternalUrl(socialLinks.website || undefined),
    },
  ];

  const brandingChecklist = [
    {
      label: 'Public profile slug',
      complete: Boolean(profile?.slug),
    },
    {
      label: 'Profile image',
      complete: Boolean(profile?.profileImage),
    },
    {
      label: 'Agent bio',
      complete: Boolean(profile?.bio),
    },
    {
      label: 'Coverage areas',
      complete: Boolean(profile?.areasServed?.length),
    },
    {
      label: 'At least one social link',
      complete: socialPlatforms.some(item => Boolean(item.connectedUrl)),
    },
  ];

  const completedBrandingItems = brandingChecklist.filter(item => item.complete).length;
  const totalBrandingItems = brandingChecklist.length;
  const brandingCompletion = Math.round((completedBrandingItems / totalBrandingItems) * 100);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const handleOpenExternal = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {statusLoading ? (
          <AgentFeatureLockedState
            title="Preparing your marketing hub"
            description="We are confirming your publishing and onboarding access before loading promotion tools."
            actionLabel="Loading"
            onAction={() => {}}
            isLoading
          />
        ) : marketingLocked ? (
          <AgentFeatureLockedState
            title="Marketing tools unlock after publishing access"
            description={
              (status?.profileCompletionScore || 0) < 70
                ? 'Finish your setup and reach 70% profile completion to unlock Explore publishing and marketing tools.'
                : status?.entitlements?.trialExpired
                  ? 'Your trial access has expired. Review your package to restore promotion tools.'
                  : 'Your current package does not include publishing and promotion access yet.'
            }
            actionLabel={
              (status?.profileCompletionScore || 0) < 70 ? 'Finish setup' : 'Review access'
            }
            onAction={() =>
              setLocation(
                (status?.profileCompletionScore || 0) < 70 ? '/agent/setup' : '/agent/settings',
              )
            }
          />
        ) : (
          <>
            <div className={agentPageStyles.header}>
              <div className={agentPageStyles.headingBlock}>
                <h1 className={agentPageStyles.title}>Marketing Hub</h1>
                <p className={agentPageStyles.subtitle}>
                  Use your real profile, live inventory, and current demand activity to grow your
                  visibility.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className={agentPageStyles.ghostButton}
                  onClick={() => setLocation('/agent/listings')}
                >
                  Manage listings
                </Button>
                <Button
                  onClick={() => setLocation('/explore/upload')}
                  className={agentPageStyles.primaryButton}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to Explore
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Explore videos"
                value={formatNumber(analytics?.overview.totalVideos)}
                meta={
                  analytics
                    ? `${formatNumber(analytics.periodMetrics.views)} views this week`
                    : 'Upload your first video to start tracking performance'
                }
                icon={<Video className="h-6 w-6 text-rose-600" />}
                accentClass="border-l-rose-500"
              />
              <MetricCard
                title="Explore views"
                value={formatNumber(analytics?.overview.totalViews)}
                meta={
                  analytics
                    ? `${analytics.overview.engagementRate.toFixed(1)}% engagement rate`
                    : 'No Explore analytics yet'
                }
                icon={<Eye className="h-6 w-6 text-sky-600" />}
                accentClass="border-l-sky-500"
              />
              <MetricCard
                title="Active demand campaigns"
                value={formatNumber(marketingSummaryQuery.data?.activeCampaigns)}
                meta={
                  marketingSummaryQuery.data
                    ? `${formatNumber(marketingSummaryQuery.data.assignedThisWeek)} leads assigned this week`
                    : 'Campaign routing summary will appear here'
                }
                icon={<Megaphone className="h-6 w-6 text-emerald-600" />}
                accentClass="border-l-emerald-500"
              />
              <MetricCard
                title="Live listings ready to market"
                value={formatNumber(liveListings.length)}
                meta={
                  liveListings.length > 0
                    ? `${formatNumber(
                        liveListings.reduce(
                          (total, listing) => total + Number(listing.enquiries || 0),
                          0,
                        ),
                      )} enquiries across live inventory`
                    : 'Publish inventory to create more marketing touchpoints'
                }
                icon={<Target className="h-6 w-6 text-amber-600" />}
                accentClass="border-l-amber-500"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className={cn(agentPageStyles.tabsList, 'grid w-full max-w-4xl grid-cols-5')}
              >
                <TabsTrigger value="explore" className={agentPageStyles.tabTrigger}>
                  Explore
                </TabsTrigger>
                <TabsTrigger value="promote" className={agentPageStyles.tabTrigger}>
                  Promote
                </TabsTrigger>
                <TabsTrigger value="social" className={agentPageStyles.tabTrigger}>
                  Social
                </TabsTrigger>
                <TabsTrigger value="branding" className={agentPageStyles.tabTrigger}>
                  Branding
                </TabsTrigger>
                <TabsTrigger value="templates" className={agentPageStyles.tabTrigger}>
                  Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="explore" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Play className="h-5 w-5 text-rose-600" />
                          Explore performance
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-600">
                          These numbers come from your live Explore analytics, not sample content.
                        </p>
                      </div>
                      <Button
                        onClick={() => setLocation('/explore/upload')}
                        className={agentPageStyles.primaryButton}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload new video
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {exploreAnalyticsQuery.isLoading ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[0, 1, 2].map(item => (
                          <div
                            key={item}
                            className="h-28 animate-pulse rounded-[16px] bg-slate-100"
                          ></div>
                        ))}
                      </div>
                    ) : analytics ? (
                      <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                            <p className="text-sm font-medium text-slate-500">Views this week</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {formatNumber(analytics.periodMetrics.views)}
                            </p>
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              {formatNumber(analytics.periodMetrics.uniqueViewers)} unique viewers
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                            <p className="text-sm font-medium text-slate-500">Watch quality</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {analytics.periodMetrics.completionRate.toFixed(1)}%
                            </p>
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              Avg session{' '}
                              {Math.round(analytics.periodMetrics.averageSessionDuration)}s
                            </p>
                          </div>
                          <div className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                            <p className="text-sm font-medium text-slate-500">Engagement actions</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900">
                              {formatNumber(
                                analytics.engagement.saves +
                                  analytics.engagement.shares +
                                  analytics.engagement.clicks,
                              )}
                            </p>
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              Saves {formatNumber(analytics.engagement.saves)} • Shares{' '}
                              {formatNumber(analytics.engagement.shares)} • Clicks{' '}
                              {formatNumber(analytics.engagement.clicks)}
                            </p>
                          </div>
                        </div>

                        {analytics.topPerformingVideos.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Top performing content
                              </h3>
                              <Badge className="bg-rose-50 text-rose-700">
                                Live analytics feed
                              </Badge>
                            </div>
                            {analytics.topPerformingVideos.slice(0, 5).map((video, index) => (
                              <div
                                key={video.contentId}
                                className="flex flex-col gap-4 rounded-[16px] border border-slate-200/70 bg-white p-5 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-sm font-semibold text-rose-700">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900">{video.title}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      {formatNumber(video.views)} views •{' '}
                                      {video.completionRate.toFixed(1)}% completion
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-6 text-sm">
                                  <div>
                                    <p className="text-slate-500">Engagement score</p>
                                    <p className="font-semibold text-slate-900">
                                      {video.engagementScore.toFixed(0)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState
                            title="No ranked videos yet"
                            description="Your Explore analytics feed is connected, but there is no published content with enough engagement history to rank yet."
                          />
                        )}
                      </>
                    ) : (
                      <EmptyState
                        title="No Explore analytics yet"
                        description="Upload your first Explore video to start seeing real views, completion rate, and engagement data here."
                        actionLabel="Upload to Explore"
                        onAction={() => setLocation('/explore/upload')}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="promote" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                          Campaign activity
                        </CardTitle>
                        <p className="mt-1 text-sm text-slate-600">
                          Demand routing and listing promotion now reflect real campaign and
                          inventory data only.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {campaignsQuery.isLoading ? (
                      <div className="space-y-3">
                        {[0, 1].map(item => (
                          <div
                            key={item}
                            className="h-24 animate-pulse rounded-[16px] bg-slate-100"
                          ></div>
                        ))}
                      </div>
                    ) : campaignsQuery.data && campaignsQuery.data.length > 0 ? (
                      <div className="space-y-4">
                        {campaignsQuery.data.slice(0, 5).map(campaign => (
                          <div
                            key={campaign.id}
                            className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                                  <Badge
                                    className={cn(
                                      campaign.status === 'active'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-700',
                                    )}
                                  >
                                    {campaign.status}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-sm text-slate-500">
                                  {String(campaign.sourceChannel || 'manual').toUpperCase()} •{' '}
                                  {String(campaign.distributionMode || 'shared').replace('-', ' ')}{' '}
                                  distribution • Created {formatDate(campaign.createdAt)}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm md:text-right">
                                <div>
                                  <p className="text-slate-500">Shared recipients</p>
                                  <p className="font-semibold text-slate-900">
                                    {formatNumber(campaign.sharedRecipientCount)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Weekly assigned leads</p>
                                  <p className="font-semibold text-emerald-700">
                                    {formatNumber(marketingSummaryQuery.data?.assignedThisWeek)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        title="No live campaigns yet"
                        description="Your campaign workspace is connected to the real demand engine, but this account does not have active campaigns yet. When campaigns are created, they will appear here with live status instead of sample metrics."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Listings ready to promote</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {liveListings.length > 0 ? (
                      liveListings.slice(0, 6).map(listing => (
                        <div
                          key={listing.id}
                          className="flex flex-col gap-4 rounded-[16px] border border-slate-200/70 bg-white p-5 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold text-slate-900">
                                {listing.title || 'Untitled listing'}
                              </h3>
                              <Badge className="bg-slate-100 text-slate-700">
                                {formatListingStatusLabel(listing.status)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                              {[listing.suburb, listing.city].filter(Boolean).join(', ') ||
                                'Location pending'}{' '}
                              • {String(listing.propertyType || 'Property')}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm md:min-w-[280px] md:text-right">
                            <div>
                              <p className="text-slate-500">Price</p>
                              <p className="font-semibold text-slate-900">
                                {formatCurrency(listing.price)}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-500">Enquiries</p>
                              <p className="font-semibold text-slate-900">
                                {formatNumber(listing.enquiries)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No live inventory to promote"
                        description="As soon as you have available or published listings, this tab will show the real inventory your marketing and demand efforts can support."
                        actionLabel="Go to listings"
                        onAction={() => setLocation('/agent/listings')}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="social" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Social destinations</CardTitle>
                    <p className="text-sm text-slate-600">
                      This section reflects the social links on your profile. It does not pretend
                      direct cross-posting is connected when it is not.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {socialPlatforms.map(platform => (
                        <div
                          key={platform.key}
                          className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'rounded-xl bg-gradient-to-br p-3 text-white shadow-sm',
                                  platform.bgClass,
                                )}
                              >
                                <platform.icon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{platform.name}</p>
                                <p className="text-sm text-slate-500">
                                  {platform.connectedUrl ? 'Connected on profile' : 'Not added yet'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant={platform.connectedUrl ? 'default' : 'outline'}
                              size="sm"
                              className={
                                platform.connectedUrl
                                  ? agentPageStyles.primaryButton
                                  : agentPageStyles.ghostButton
                              }
                              onClick={() =>
                                platform.connectedUrl
                                  ? handleOpenExternal(platform.connectedUrl)
                                  : setLocation('/agent/settings?tab=profile')
                              }
                            >
                              {platform.connectedUrl ? 'Open' : 'Add in settings'}
                            </Button>
                          </div>
                          {platform.connectedUrl ? (
                            <div className="mt-4 flex items-center justify-between gap-3 rounded-[12px] bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200/70">
                              <span className="truncate">{platform.connectedUrl}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-2 py-1 text-slate-600"
                                onClick={() => handleCopy(platform.connectedUrl!, platform.name)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Share-ready profile links</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[16px] border border-slate-200/70 bg-white p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-500">Public profile</p>
                          <p className="mt-1 font-semibold text-slate-900">
                            {profileUrl ||
                              'Set your public slug to generate a shareable profile link'}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className={agentPageStyles.ghostButton}
                            onClick={() => setLocation('/agent/settings?tab=profile')}
                          >
                            Update profile
                          </Button>
                          <Button
                            className={agentPageStyles.primaryButton}
                            disabled={!profileUrl}
                            onClick={() => profileUrl && handleCopy(profileUrl, 'Profile URL')}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy link
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branding" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Branding readiness</CardTitle>
                    <p className="text-sm text-slate-600">
                      Your branding progress below comes from the actual agent profile record used
                      by setup and settings.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-[18px] border border-slate-200/70 bg-gradient-to-br from-[#f1f7ff] via-white to-[#fbf7ef] p-6">
                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
                            Profile completion
                          </p>
                          <p className="mt-2 text-3xl font-bold text-slate-900">
                            {brandingCompletion}%
                          </p>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                            {completedBrandingItems} of {totalBrandingItems} profile branding items
                            are in place.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className={agentPageStyles.ghostButton}
                            onClick={() => setLocation('/agent/settings?tab=profile')}
                          >
                            Edit profile
                          </Button>
                          <Button
                            className={agentPageStyles.primaryButton}
                            disabled={!profileUrl}
                            onClick={() => profileUrl && window.open(profileUrl, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View public profile
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {brandingChecklist.map(item => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between rounded-[14px] border border-slate-200/70 bg-[#fbfaf7] px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          <Badge
                            className={
                              item.complete
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }
                          >
                            {item.complete ? 'Ready' : 'Needs attention'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>What clients will see</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-start gap-4 rounded-[16px] border border-slate-200/70 bg-white p-5">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/70">
                          {profile?.profileImage ? (
                            <img
                              src={profile.profileImage}
                              alt={profile.displayName || 'Agent profile'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-semibold text-slate-900">
                            {profile?.displayName || user?.name || 'Your profile name'}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatFocusLabel(profile?.focus)}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {profile?.bio ||
                              'Add a short agent biography to turn this into a stronger public profile introduction.'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-slate-500">Coverage areas</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {profile?.areasServed?.length ? (
                            profile.areasServed.map(area => (
                              <Badge key={area} className="bg-slate-100 text-slate-700">
                                {area}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-slate-500">
                              No service areas have been added yet.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={agentPageStyles.panel}>
                    <CardHeader>
                      <CardTitle>Profile routing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                        <p className="text-sm font-medium text-slate-500">Public URL</p>
                        <p className="mt-2 break-all font-semibold text-slate-900">
                          {profileUrl || 'Set a slug in settings to generate a public URL'}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                        <p className="text-sm font-medium text-slate-500">Profile focus</p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {formatFocusLabel(profile?.focus)}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                        <p className="text-sm font-medium text-slate-500">Social links connected</p>
                        <p className="mt-2 font-semibold text-slate-900">
                          {socialPlatforms.filter(item => Boolean(item.connectedUrl)).length} /{' '}
                          {socialPlatforms.length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <Card className={agentPageStyles.panel}>
                  <CardHeader>
                    <CardTitle>Marketing starting points</CardTitle>
                    <p className="text-sm text-slate-600">
                      These are reusable prompts and copy starters, not fake campaign data.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {contentTemplates.map(template => (
                        <div
                          key={template.id}
                          className="rounded-[18px] border border-slate-200/70 bg-gradient-to-br from-white via-[#fbfaf7] to-[#f4f8ff] p-5"
                        >
                          <div className="flex items-start gap-4">
                            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
                              <template.icon className="h-5 w-5 text-[var(--primary)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Badge className="bg-slate-100 text-slate-700">
                                {template.category}
                              </Badge>
                              <h3 className="mt-3 font-semibold text-slate-900">
                                {template.title}
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {template.description}
                              </p>
                              <div className="mt-4 rounded-[14px] border border-slate-200/70 bg-white p-4 text-sm leading-6 text-slate-700">
                                {template.content}
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Button
                                  variant="outline"
                                  className={agentPageStyles.ghostButton}
                                  onClick={() => handleCopy(template.content, template.title)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy template
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </AgentAppShell>
  );
}
