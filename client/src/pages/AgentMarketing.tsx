import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Megaphone,
  Share2,
  Mail,
  MessageSquare,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Plus,
  TrendingUp,
  Eye,
  MousePointerClick,
  Users,
  Calendar,
  ExternalLink,
  Copy,
  Download,
  Sparkles,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CampaignCardProps {
  title: string;
  status: 'active' | 'draft' | 'completed' | 'scheduled';
  reach: number;
  clicks: number;
  leads: number;
  startDate: string;
  platform: string[];
}

function CampaignCard({ title, status, reach, clicks, leads, startDate, platform }: CampaignCardProps) {
  const statusColors = {
    active: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-gray-50 text-gray-700 border-gray-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    scheduled: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <Card className="shadow-soft hover:shadow-hover transition-all duration-200">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>{startDate}</span>
              </div>
            </div>
            <Badge variant="outline" className={cn(statusColors[status])}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {platform.map(p => (
              <div key={p} className="p-2 bg-gray-100 rounded-lg">
                {p === 'facebook' && <Facebook className="h-4 w-4 text-blue-600" />}
                {p === 'instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                {p === 'twitter' && <Twitter className="h-4 w-4 text-blue-400" />}
                {p === 'linkedin' && <Linkedin className="h-4 w-4 text-blue-700" />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">Reach</p>
              <p className="text-lg font-semibold text-gray-900">{reach.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Clicks</p>
              <p className="text-lg font-semibold text-gray-900">{clicks}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Leads</p>
              <p className="text-lg font-semibold text-gray-900">{leads}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              View Details
            </Button>
            <Button variant="default" size="sm" className="flex-1">
              Edit Campaign
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentMarketing() {
  const [activeTab, setActiveTab] = useState('campaigns');

  const campaigns = [
    {
      title: 'Luxury Apartments Promotion',
      status: 'active' as const,
      reach: 12450,
      clicks: 348,
      leads: 23,
      startDate: 'Nov 15, 2024',
      platform: ['facebook', 'instagram'],
    },
    {
      title: 'Holiday Season Special',
      status: 'scheduled' as const,
      reach: 0,
      clicks: 0,
      leads: 0,
      startDate: 'Dec 15, 2024',
      platform: ['facebook', 'instagram', 'linkedin'],
    },
    {
      title: 'Open House Weekend',
      status: 'completed' as const,
      reach: 8920,
      clicks: 234,
      leads: 18,
      startDate: 'Nov 1, 2024',
      platform: ['instagram', 'twitter'],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Marketing Hub</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage your marketing campaigns
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-soft">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Active Campaigns</p>
                  <p className="text-3xl font-bold text-gray-900">3</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Megaphone className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Reach</p>
                  <p className="text-3xl font-bold text-gray-900">21.4K</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Click Rate</p>
                  <p className="text-3xl font-bold text-gray-900">2.8%</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <MousePointerClick className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Leads Generated</p>
                  <p className="text-3xl font-bold text-gray-900">41</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 p-1 bg-white rounded-xl shadow-soft">
            <TabsTrigger value="campaigns" className="rounded-lg">
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="social" className="rounded-lg">
              Social Media
            </TabsTrigger>
            <TabsTrigger value="email" className="rounded-lg">
              Email Marketing
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-lg">
              Content Library
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {campaigns.map((campaign, i) => (
                <CampaignCard key={i} {...campaign} />
              ))}
            </div>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Campaign Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                  <div className="text-center text-gray-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Performance chart coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-blue-600" />
                    Connected Accounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: 'Facebook', icon: Facebook, color: 'text-blue-600', connected: true },
                    { name: 'Instagram', icon: Instagram, color: 'text-pink-600', connected: true },
                    { name: 'Twitter', icon: Twitter, color: 'text-blue-400', connected: false },
                    { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', connected: true },
                  ].map(platform => (
                    <div
                      key={platform.name}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <platform.icon className={cn('h-5 w-5', platform.color)} />
                        <span className="font-medium text-gray-900">{platform.name}</span>
                      </div>
                      {platform.connected ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Connected
                        </Badge>
                      ) : (
                        <Button variant="outline" size="sm">
                          Connect
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Post Scheduler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-medium">Schedule posts across platforms</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Post
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Email Marketing Tab */}
          <TabsContent value="email" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Email Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">Create targeted email campaigns</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    New Email Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Library Tab */}
          <TabsContent value="content" className="space-y-6 mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Marketing Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-400">
                  <Download className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">Store and manage your marketing content</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Assets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
