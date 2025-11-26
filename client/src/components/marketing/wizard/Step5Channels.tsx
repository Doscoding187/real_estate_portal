import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { Megaphone, Search, LayoutGrid, Mail, Bell, Star, RefreshCw } from 'lucide-react';

interface Step5Props {
  data: any;
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
  campaignId: number;
}

const CHANNELS = [
  {
    id: 'feed',
    name: 'Feed Boost',
    description: 'Boost your listing in the main property feed.',
    icon: LayoutGrid,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'search',
    name: 'Search Priority',
    description: 'Appear at the top of relevant search results.',
    icon: Search,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'carousel',
    name: 'Featured Carousel',
    description: 'Showcase in the "Featured Properties" carousel on the homepage.',
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'newsletter',
    name: 'Email Newsletter',
    description: 'Include in our weekly property digest email.',
    icon: Mail,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    id: 'push',
    name: 'Push Notifications',
    description: 'Send alerts to users with matching saved searches.',
    icon: Bell,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  {
    id: 'retargeting',
    name: 'In-Platform Retargeting',
    description: 'Show to users who viewed similar properties.',
    icon: RefreshCw,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    id: 'showcase',
    name: 'Developer Showcase',
    description: 'Premium placement on the Developer Showcase page.',
    icon: Megaphone,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
];

const Step5Channels: React.FC<Step5Props> = ({ data, updateData, onNext, onBack, campaignId }) => {
  const [channels, setChannels] = useState<any[]>(
    data.channels || CHANNELS.map(c => ({ type: c.id, enabled: false }))
  );

  const updateChannelsMutation = trpc.marketing.updateChannels.useMutation();

  const toggleChannel = (channelId: string) => {
    setChannels(prev => 
      prev.map(c => c.type === channelId ? { ...c, enabled: !c.enabled } : c)
    );
  };

  const handleNext = async () => {
    try {
      // Filter only enabled channels or send all with status
      const channelsToUpdate = channels.map(c => ({
        type: c.type,
        enabled: c.enabled,
      }));

      await updateChannelsMutation.mutateAsync({
        campaignId,
        channels: channelsToUpdate,
      });

      updateData({ channels: channelsToUpdate });
      onNext();
    } catch (error) {
      console.error('Failed to update channels');
    }
  };

  const enabledCount = channels.filter(c => c.enabled).length;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Select Channels</h2>
        <p className="text-slate-500">Choose where your campaign will appear across the platform</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CHANNELS.map((channel) => {
          const isEnabled = channels.find(c => c.type === channel.id)?.enabled;
          
          return (
            <div
              key={channel.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                isEnabled 
                  ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${channel.bgColor} ${channel.color}`}>
                  <channel.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{channel.name}</h3>
                  <p className="text-sm text-slate-500">{channel.description}</p>
                </div>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => toggleChannel(channel.id)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={enabledCount === 0 || updateChannelsMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
        >
          {updateChannelsMutation.isPending ? 'Saving...' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
};

export default Step5Channels;
