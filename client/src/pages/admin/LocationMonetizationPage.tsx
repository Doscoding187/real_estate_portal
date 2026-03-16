// @ts-nocheck
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
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState('all');
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);
  const { data: rules, isLoading, refetch } = trpc.monetization.getAllRules.useQuery();
  const {
    data: simulation,
    isLoading: isSimulationLoading,
    refetch: refetchSimulation,
  } = trpc.monetization.getDeliverySimulation.useQuery({
    ruleId: selectedRuleId === 'all' ? undefined : Number(selectedRuleId),
    from: fromDate,
    to: toDate,
  });
  const {
    data: demandBaseline,
    isLoading: isDemandBaselineLoading,
    refetch: refetchDemandBaseline,
  } = trpc.monetization.getSurfaceDemandBaseline.useQuery({
    from: fromDate,
    to: toDate,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

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

      <Card>
        <CardHeader>
          <CardTitle>Expected vs Actual Delivery</CardTitle>
          <p className="text-sm text-slate-500">
            Diagnostic model for cap utilization, pacing pressure, and monetization efficiency.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rule Scope</label>
              <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rules</SelectItem>
                  {(rules || []).map(rule => (
                    <SelectItem key={rule.id} value={String(rule.id)}>
                      #{rule.id} {rule.targetType.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Run Model</label>
              <Button variant="outline" className="w-full" onClick={() => refetchSimulation()}>
                Refresh Simulation
              </Button>
            </div>
          </div>

          {simulation?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Expected</div>
                <div className="text-lg font-semibold">{simulation.totals.expectedImpressions}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Actual</div>
                <div className="text-lg font-semibold">{simulation.totals.actualImpressions}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Delivery Gap</div>
                <div className="text-lg font-semibold">{simulation.totals.deliveryGap}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">CTR</div>
                <div className="text-lg font-semibold">{simulation.totals.ctr}%</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Qualified Lead Rate</div>
                <div className="text-lg font-semibold">{simulation.totals.qualifiedLeadRate}%</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Revenue</div>
                <div className="text-lg font-semibold">{formatCurrency(simulation.totals.revenue)}</div>
              </div>
            </div>
          )}

          {isSimulationLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : simulation?.rules?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Cap Utilization</TableHead>
                  <TableHead>Pacing Block %</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>eCPM</TableHead>
                  <TableHead>eCPL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulation.rules.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">#{row.id}</div>
                      <div className="text-xs text-slate-500 capitalize">
                        {row.targetType.replace('_', ' ')} - {row.locationType} #{row.locationId}
                      </div>
                    </TableCell>
                    <TableCell>{row.expectedImpressions}</TableCell>
                    <TableCell>{row.actualImpressions}</TableCell>
                    <TableCell>{row.deliveryGap}</TableCell>
                    <TableCell>{row.capUtilization === null ? 'N/A' : `${row.capUtilization}%`}</TableCell>
                    <TableCell>{row.pacingBlockRate}%</TableCell>
                    <TableCell>{row.ctr}%</TableCell>
                    <TableCell>{row.leads}</TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    <TableCell>{formatCurrency(row.effectiveCpm)}</TableCell>
                    <TableCell>{row.effectiveCpl === null ? 'N/A' : formatCurrency(row.effectiveCpl)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No delivery diagnostics available for the selected date range.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demand Baseline by Surface</CardTitle>
          <p className="text-sm text-slate-500">
            Demand-aware baseline to distinguish true inventory ceiling from configuration loss.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => refetchDemandBaseline()}>
              Refresh Baseline
            </Button>
          </div>

          {demandBaseline?.totals && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Demand Ceiling</div>
                <div className="text-lg font-semibold">{demandBaseline.totals.demandCeilingSlots}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Config-Unlocked Ceiling</div>
                <div className="text-lg font-semibold">
                  {demandBaseline.totals.configUnlockedCeilingSlots}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Served</div>
                <div className="text-lg font-semibold">{demandBaseline.totals.servedSlots}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Config Loss</div>
                <div className="text-lg font-semibold">{demandBaseline.totals.configLossRate}%</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Delivery Rate</div>
                <div className="text-lg font-semibold">{demandBaseline.totals.deliveryRate}%</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">Inventory Fill</div>
                <div className="text-lg font-semibold">{demandBaseline.totals.inventoryFillRate}%</div>
              </div>
            </div>
          )}

          {isDemandBaselineLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : demandBaseline?.rows?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Surface</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Demand Ceiling</TableHead>
                  <TableHead>Config-Unlocked Ceiling</TableHead>
                  <TableHead>Served</TableHead>
                  <TableHead>Config Loss %</TableHead>
                  <TableHead>Delivery %</TableHead>
                  <TableHead>Inventory Fill %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demandBaseline.rows.slice(0, 80).map(row => (
                  <TableRow
                    key={`${row.metricDate}-${row.surfaceType}-${row.targetType}-${row.locationType}-${row.locationId}`}
                  >
                    <TableCell>{row.metricDate}</TableCell>
                    <TableCell className="capitalize">
                      {row.surfaceType} / {row.targetType.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {row.locationType} #{row.locationId}
                    </TableCell>
                    <TableCell>{row.demandCeilingSlots}</TableCell>
                    <TableCell>{row.configUnlockedCeilingSlots}</TableCell>
                    <TableCell>{row.servedSlots}</TableCell>
                    <TableCell>{row.configLossRate}%</TableCell>
                    <TableCell>{row.deliveryRate}%</TableCell>
                    <TableCell>{row.inventoryFillRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No demand baseline data available for the selected date range.
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
