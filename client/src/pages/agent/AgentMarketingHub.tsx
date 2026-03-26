import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { AgentAppShell } from '@/components/agent/AgentAppShell';
import { agentPageStyles } from '@/components/agent/agentPageStyles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import {
  Upload,
  TrendingUp,
  Video,
  Eye,
  Target,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Megaphone,
  Play,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentMarketingHub() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

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

  const { data: marketingSummary } = trpc.demand.myLeadSummary.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  // Mock data
  const exploreVideos = [
    {
      id: 1,
      title: '360° Virtual Tour - Luxury Villa',
      views: 2345,
      likes: 187,
      shares: 45,
      engagement: 87,
      thumbnail: '/assets/video1.jpg',
      uploadDate: '2024-11-28',
      status: 'published',
    },
    {
      id: 2,
      title: 'Cape Town Waterfront Apartment Tour',
      views: 1823,
      likes: 156,
      shares: 32,
      engagement: 92,
      thumbnail: '/assets/video2.jpg',
      uploadDate: '2024-11-25',
      status: 'published',
    },
    {
      id: 3,
      title: 'Modern Kitchen Design Ideas',
      views: 956,
      likes: 89,
      shares: 18,
      engagement: 76,
      thumbnail: '/assets/video3.jpg',
      uploadDate: '2024-11-22',
      status: 'published',
    },
  ];

  const promotedListings = [
    {
      id: 1,
      title: 'Luxury Villa - Camps Bay',
      budget: 5000,
      spent: 3200,
      impressions: 12500,
      clicks: 234,
      leads: 12,
      status: 'active',
      endsIn: '5 days',
    },
    {
      id: 2,
      title: 'Modern Apartment - Sandton',
      budget: 3000,
      spent: 3000,
      impressions: 8900,
      clicks: 156,
      leads: 8,
      status: 'completed',
      endsIn: 'Ended',
    },
  ];

  const contentTemplates = [
    {
      id: 1,
      category: 'Social Post',
      title: 'New Listing Announcement',
      description: 'Announce a new property with key details',
      icon: Megaphone,
    },
    {
      id: 2,
      category: 'Video Script',
      title: 'Property Walkthrough',
      description: 'Guide for filming property tours',
      icon: Video,
    },
    {
      id: 3,
      category: 'Email',
      title: 'Open House Invitation',
      description: 'Invite clients to your open house',
      icon: FileText,
    },
    {
      id: 4,
      category: 'Social Post',
      title: 'Market Update',
      description: 'Share market insights with your audience',
      icon: BarChart3,
    },
  ];

  const totalViews = exploreVideos.reduce((acc, v) => acc + v.views, 0);
  const totalEngagement = Math.round(
    exploreVideos.reduce((acc, v) => acc + v.engagement, 0) / exploreVideos.length,
  );

  return (
    <AgentAppShell>
      <main className={agentPageStyles.container}>
        {/* Header */}
        <div className={agentPageStyles.header}>
          <div className={agentPageStyles.headingBlock}>
            <h1 className={agentPageStyles.title}>Marketing Hub</h1>
            <p className={agentPageStyles.subtitle}>
              Grow your visibility and promote your listings
            </p>
          </div>
          <Button
            onClick={() => setLocation('/explore/upload')}
            className={agentPageStyles.primaryButton}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload to Explore
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-pink-500')}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Explore Views</p>
                  <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
                  <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +12% this week
                  </p>
                </div>
                <div className="p-3 bg-pink-50 rounded-xl">
                  <Eye className="h-6 w-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-[var(--primary)]')}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Engagement Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEngagement}%</p>
                  <p className="text-xs text-blue-600 font-medium mt-2">Above average</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-violet-500')}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Videos Published</p>
                  <p className="text-2xl font-bold text-gray-900">{exploreVideos.length}</p>
                  <p className="text-xs text-purple-600 font-medium mt-2">This month</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(agentPageStyles.statCard, 'border-l-4 border-l-emerald-500')}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Active Promotions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {marketingSummary?.activeCampaigns ??
                      promotedListings.filter(p => p.status === 'active').length}
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-2">
                    {marketingSummary
                      ? `${marketingSummary.assignedThisWeek} leads assigned this week`
                      : 'Running campaigns'}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Megaphone className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(agentPageStyles.tabsList, 'grid w-full max-w-3xl grid-cols-5')}>
            <TabsTrigger value="explore" className={agentPageStyles.tabTrigger}>
              Explore Feed
            </TabsTrigger>
            <TabsTrigger value="promote" className={agentPageStyles.tabTrigger}>
              Promote Listings
            </TabsTrigger>
            <TabsTrigger value="social" className={agentPageStyles.tabTrigger}>
              Social Media
            </TabsTrigger>
            <TabsTrigger value="branding" className={agentPageStyles.tabTrigger}>
              Branding
            </TabsTrigger>
            <TabsTrigger value="templates" className={agentPageStyles.tabTrigger}>
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Explore Videos Tab */}
          <TabsContent value="explore" className="space-y-4">
            <Card className={agentPageStyles.panel}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-pink-600" />
                    My Explore Videos
                  </CardTitle>
                  <Button
                    onClick={() => setLocation('/explore/upload')}
                    className={agentPageStyles.primaryButton}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Video
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {exploreVideos.map(video => (
                  <div
                    key={video.id}
                    className="rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-5 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex gap-4">
                      <div className="w-32 h-24 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{video.title}</h3>
                            <p className="text-sm text-gray-500">
                              Uploaded {new Date(video.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-700">{video.status}</Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Views</p>
                            <p className="font-semibold text-gray-900">
                              {video.views.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Likes</p>
                            <p className="font-semibold text-gray-900">{video.likes}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Shares</p>
                            <p className="font-semibold text-gray-900">{video.shares}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Engagement</p>
                            <p className="font-semibold text-green-600">{video.engagement}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promote Listings Tab */}
          <TabsContent value="promote" className="space-y-4">
            <Card className={agentPageStyles.panel}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Promotions</CardTitle>
                  <Button className={agentPageStyles.primaryButton}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {promotedListings.map(promo => (
                  <div
                    key={promo.id}
                    className="rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{promo.title}</h3>
                        <p className="text-sm text-gray-500">Ends in: {promo.endsIn}</p>
                      </div>
                      <Badge
                        className={
                          promo.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {promo.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Budget</p>
                        <p className="font-semibold text-gray-900">
                          R {promo.budget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Spent</p>
                        <p className="font-semibold text-blue-600">
                          R {promo.spent.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Impressions</p>
                        <p className="font-semibold text-gray-900">
                          {promo.impressions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Clicks</p>
                        <p className="font-semibold text-gray-900">{promo.clicks}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Leads</p>
                        <p className="font-semibold text-green-600">{promo.leads}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${(promo.spent / promo.budget) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4">
            <Card className={agentPageStyles.panel}>
              <CardHeader>
                <CardTitle>Share on Social Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Share your listings and content across your social media platforms
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Instagram',
                      icon: Instagram,
                      color: 'from-pink-500 to-purple-600',
                      connected: true,
                    },
                    {
                      name: 'Facebook',
                      icon: Facebook,
                      color: 'from-blue-600 to-blue-700',
                      connected: true,
                    },
                    {
                      name: 'Twitter',
                      icon: Twitter,
                      color: 'from-sky-400 to-sky-600',
                      connected: false,
                    },
                    {
                      name: 'LinkedIn',
                      icon: Linkedin,
                      color: 'from-blue-700 to-blue-800',
                      connected: false,
                    },
                  ].map(platform => (
                    <div
                      key={platform.name}
                      className="rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-3 rounded-xl bg-gradient-to-br', platform.color)}>
                            <platform.icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{platform.name}</p>
                            <p className="text-sm text-gray-500">
                              {platform.connected ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={platform.connected ? 'default' : 'outline'}
                          size="sm"
                          className={
                            platform.connected
                              ? agentPageStyles.primaryButton
                              : agentPageStyles.ghostButton
                          }
                        >
                          {platform.connected ? 'Share' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <Card className={agentPageStyles.panel}>
              <CardHeader>
                <CardTitle>Personal Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[12px] border border-slate-200/70 bg-gradient-to-r from-blue-50 to-purple-50 p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">Share Your Profile</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Share your agent profile with potential clients
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-600">
                      https://portal.co.za/agent/{user?.id}
                    </div>
                    <Button className={agentPageStyles.primaryButton}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <ImageIcon className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Profile Cover Image</p>
                        <p className="text-sm text-gray-500">Update your cover photo</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(agentPageStyles.ghostButton, 'w-full')}
                    >
                      Upload Image
                    </Button>
                  </div>

                  <div className="rounded-[12px] border border-slate-200/70 bg-[#fbfaf7] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Agent Biography</p>
                        <p className="text-sm text-gray-500">Tell your story</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(agentPageStyles.ghostButton, 'w-full')}
                    >
                      Edit Bio
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card className={agentPageStyles.panel}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                  Content Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contentTemplates.map(template => (
                    <div
                      key={template.id}
                      className="p-5 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                          <template.icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <Badge className="bg-blue-100 text-blue-700 text-xs mb-2">
                            {template.category}
                          </Badge>
                          <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 p-0 h-auto hover:bg-transparent"
                          >
                            Use Template <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </AgentAppShell>
  );
}
