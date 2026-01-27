import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function LocationMonetizationPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: rules, isLoading, refetch } = trpc.monetization.getAllRules.useQuery();

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Location Monetization Hub</h1>
          <p className="text-slate-500">
            Manage hero ads, featured developers, and recommended agents.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Targeting Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Targeting Rule</DialogTitle>
            </DialogHeader>
            <CreateRuleForm
              onSuccess={() => {
                setIsDialogOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : rules && rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {rule.targetType.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>
                          {rule.locationType} #{rule.locationId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{rule.targetId}</TableCell>
                    <TableCell>
                      <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                        {rule.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{rule.ranking}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(rule.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No targeting rules found. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateRuleForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    targetType: 'hero_ad',
    targetId: '0',
    locationType: 'city',
    locationId: '',
    ranking: '50',
    status: 'active',
    imageUrl: '',
    ctaText: 'Learn More',
    ctaUrl: '',
    customTitle: '',
  });

  const createMutation = trpc.monetization.createTargetingRule.useMutation({
    onSuccess: () => {
      toast.success('Targeting rule created successfully');
      onSuccess();
    },
    onError: error => {
      toast.error('Failed to create rule: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      targetType: formData.targetType as any,
      targetId: parseInt(formData.targetId),
      locationType: formData.locationType as any,
      locationId: parseInt(formData.locationId),
      ranking: parseInt(formData.ranking),
      status: formData.status as any,
      metadata: {
        imageUrl: formData.imageUrl,
        ctaText: formData.ctaText,
        ctaUrl: formData.ctaUrl,
        customTitle: formData.customTitle,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Type</label>
          <Select
            value={formData.targetType}
            onValueChange={v => setFormData({ ...formData, targetType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hero_ad">Hero Billboard Ad</SelectItem>
              <SelectItem value="featured_developer">Featured Developer</SelectItem>
              <SelectItem value="recommended_agent">Recommended Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Target ID (Reference)</label>
          <Input
            type="number"
            value={formData.targetId}
            onChange={e => setFormData({ ...formData, targetId: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Location Type</label>
          <Select
            value={formData.locationType}
            onValueChange={v => setFormData({ ...formData, locationType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="province">Province</SelectItem>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="suburb">Suburb</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Location ID</label>
          <Input
            type="number"
            placeholder="e.g. 1"
            value={formData.locationId}
            onChange={e => setFormData({ ...formData, locationId: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Image URL (For Hero Ad)</label>
        <Input
          placeholder="https://..."
          value={formData.imageUrl}
          onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Button Text</label>
          <Input
            placeholder="Learn More"
            value={formData.ctaText}
            onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Link URL</label>
          <Input
            placeholder="https://..."
            value={formData.ctaUrl}
            onChange={e => setFormData({ ...formData, ctaUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Custom Title (Optional)</label>
        <Input
          placeholder="Override location name..."
          value={formData.customTitle}
          onChange={e => setFormData({ ...formData, customTitle: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isLoading}>
        {createMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Rule
      </Button>
    </form>
  );
}
