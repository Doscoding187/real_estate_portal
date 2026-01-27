import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Archive,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

export default function PlanEditor() {
  const [, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    price: 0,
    currency: 'ZAR',
    interval: 'month',
    revenueCategory: 'owner',
    features: [] as string[],
    limits: {} as Record<string, any>,
    isActive: true,
    isPopular: false,
    sortOrder: 0,
  });

  const [featureInput, setFeatureInput] = useState('');
  const [createNewVersion, setCreateNewVersion] = useState(true);

  // Queries
  const {
    data: plans,
    isLoading,
    refetch,
  } = trpc.subscription.getPlans.useQuery({
    includeInactive,
  });

  // Mutations
  const createMutation = trpc.subscription.createPlan.useMutation({
    onSuccess: () => {
      toast.success('Plan created successfully');
      setIsDrawerOpen(false);
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const updateMutation = trpc.subscription.updatePlan.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || 'Plan updated successfully');
      setIsDrawerOpen(false);
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const toggleStatusMutation = trpc.subscription.togglePlanStatus.useMutation({
    onSuccess: () => {
      toast.success('Plan status updated');
      refetch();
    },
  });

  // Handlers
  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      revenueCategory: plan.limits?.revenueCategory || 'owner',
      features: plan.features || [],
      limits: plan.limits || {},
      isActive: plan.isActive === 1,
      isPopular: plan.isPopular === 1,
      sortOrder: plan.sortOrder,
    });
    setCreateNewVersion(true); // Default to true for edits
    setIsDrawerOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      price: 0,
      currency: 'ZAR',
      interval: 'month',
      revenueCategory: 'owner',
      features: [],
      limits: {},
      isActive: true,
      isPopular: false,
      sortOrder: 0,
    });
    setIsDrawerOpen(true);
  };

  const handleSave = () => {
    const limits = { ...formData.limits, revenueCategory: formData.revenueCategory };

    if (editingPlan) {
      updateMutation.mutate({
        planId: editingPlan.id,
        changes: {
          displayName: formData.displayName,
          description: formData.description,
          price: Number(formData.price),
          currency: formData.currency,
          interval: formData.interval as 'month' | 'year',
          features: formData.features,
          limits: limits,
          isActive: formData.isActive,
          isPopular: formData.isPopular,
          sortOrder: Number(formData.sortOrder),
        },
        createNewVersion,
      });
    } else {
      createMutation.mutate({
        name: formData.name, // Internal slug
        displayName: formData.displayName,
        description: formData.description,
        price: Number(formData.price),
        currency: formData.currency,
        interval: formData.interval as 'month' | 'year',
        features: formData.features,
        limits: limits,
        isPopular: formData.isPopular,
        sortOrder: Number(formData.sortOrder),
      });
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...formData.features];
    newFeatures.splice(index, 1);
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Plan Editor</h1>
            <p className="text-slate-500">Manage subscription plans and pricing versions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Switch
              checked={includeInactive}
              onCheckedChange={setIncludeInactive}
              id="show-inactive"
            />
            <Label htmlFor="show-inactive">Show Archived</Label>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Plan List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Display Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Revenue Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Loading plans...
                </TableCell>
              </TableRow>
            ) : plans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No plans found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              plans?.map((plan: any) => (
                <TableRow key={plan.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    {plan.displayName}
                    {plan.isPopular === 1 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Popular
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-xs">{plan.name}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('en-ZA', {
                      style: 'currency',
                      currency: plan.currency,
                    }).format(plan.price)}
                  </TableCell>
                  <TableCell className="capitalize">{plan.interval}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {plan.limits?.revenueCategory || 'owner'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {plan.isActive === 1 ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleStatusMutation.mutate({
                            planId: plan.id,
                            isActive: plan.isActive !== 1,
                          })
                        }
                      >
                        {plan.isActive === 1 ? (
                          <Archive className="h-4 w-4 text-slate-400" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Editor Drawer (Dialog for now) */}
      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Modify plan details. Significant changes will create a new version.'
                : 'Define a new subscription plan for your users.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={formData.displayName}
                  onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g. Pro Agency"
                />
              </div>
              <div className="space-y-2">
                <Label>Internal Slug</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. pro-agency-v1"
                  disabled={!!editingPlan} // Slug is immutable after create (for now)
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={val => setFormData({ ...formData, currency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">ZAR (R)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={val => setFormData({ ...formData, interval: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Revenue Category</Label>
              <Select
                value={formData.revenueCategory}
                onValueChange={val => setFormData({ ...formData, revenueCategory: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">Agency Subscription</SelectItem>
                  <SelectItem value="owner">Private Owner Listing</SelectItem>
                  <SelectItem value="developer">Developer Package</SelectItem>
                  <SelectItem value="marketplace">Marketplace Fee</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Determines how this revenue is classified in the Revenue Center.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Plan description visible to users..."
              />
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={e => setFeatureInput(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyDown={e => e.key === 'Enter' && addFeature()}
                />
                <Button type="button" onClick={addFeature} variant="secondary">
                  Add
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {formData.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm"
                  >
                    <span>{feature}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                      onClick={() => removeFeature(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isPopular}
                  onCheckedChange={checked => setFormData({ ...formData, isPopular: checked })}
                  id="is-popular"
                />
                <Label htmlFor="is-popular">Mark as Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  className="w-20"
                  value={formData.sortOrder}
                  onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                />
              </div>
            </div>

            {editingPlan && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Versioning Control</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      By default, saving changes will create a new version of this plan and archive
                      the old one. This preserves history for existing subscribers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-8">
                  <Switch
                    checked={createNewVersion}
                    onCheckedChange={setCreateNewVersion}
                    id="create-version"
                  />
                  <Label htmlFor="create-version" className="text-amber-900 font-medium">
                    Create new version (Recommended)
                  </Label>
                </div>
                {!createNewVersion && (
                  <p className="text-xs text-red-600 pl-8">
                    Warning: In-place updates are only allowed for cosmetic changes or if no active
                    subscriptions exist.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isLoading || updateMutation.isLoading}
            >
              {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Save Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
