import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Download,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function SubscriptionManagementPage() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Queries
  const { data: subscriptionsData, isLoading: isLoadingSubs, refetch: refetchSubs } = 
    trpc.subscription.getAllSubscriptions.useQuery({
      page,
      limit: 10,
      status: statusFilter === 'all' ? undefined : statusFilter as any,
    }, {
      enabled: activeTab === 'subscriptions',
    });

  const { data: plansData, isLoading: isLoadingPlans } = 
    trpc.subscription.getAvailablePlans.useQuery(undefined, {
      enabled: activeTab === 'plans',
    });

  const { data: proofsData, isLoading: isLoadingProofs, refetch: refetchProofs } = 
    trpc.subscription.getPaymentProofs.useQuery({
      page,
      limit: 10,
      status: 'pending',
    }, {
      enabled: activeTab === 'verification',
    });

  // Mutations
  const verifyPaymentMutation = trpc.subscription.verifyPayment.useMutation({
    onSuccess: () => {
      toast.success('Payment verified successfully');
      refetchProofs();
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const handleVerifyPayment = (proofId: number, status: 'verified' | 'rejected') => {
    verifyPaymentMutation.mutate({
      paymentProofId: proofId,
      status,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'verified':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200">Past Due</Badge>;
      case 'canceled':
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">Canceled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subscription Management</h1>
          <p className="text-slate-500 mt-1">Manage plans, subscriptions, and payment verifications.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-sm border border-white/40 p-1 rounded-xl mb-6">
          <TabsTrigger value="subscriptions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Subscriptions</TabsTrigger>
          <TabsTrigger value="plans" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Plans</TabsTrigger>
          <TabsTrigger value="verification" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Payment Verification
            {proofsData?.pagination?.total ? (
              <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                {proofsData.pagination.total}
              </span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search subscriptions..." 
                  className="pl-10 bg-white/50 border-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-white/50 border-slate-200">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <SelectValue placeholder="Filter by status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="bg-white/50 border-slate-200">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white/50">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Agency</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSubs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Loading subscriptions...
                      </TableCell>
                    </TableRow>
                  ) : subscriptionsData?.subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No subscriptions found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptionsData?.subscriptions.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{sub.agency?.name || 'Unknown Agency'}</span>
                            <span className="text-xs text-slate-500">{sub.agency?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 font-normal">
                            {sub.plan?.displayName || 'Unknown Plan'}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="capitalize">{sub.plan?.interval || 'Monthly'}</TableCell>
                        <TableCell>
                          {sub.currentPeriodEnd 
                            ? new Date(sub.currentPeriodEnd).toLocaleDateString() 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {sub.plan?.price 
                            ? formatCurrency(Number(sub.plan.price) / 100) 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoadingPlans ? (
              <div className="col-span-3 text-center py-12 text-slate-500">Loading plans...</div>
            ) : (
              plansData?.map((plan) => (
                <GlassCard key={plan.id} className="p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-xl font-medium">
                      Most Popular
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900">{plan.displayName}</h3>
                    <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-slate-900">{formatCurrency(plan.price)}</span>
                    <span className="text-slate-500">/{plan.interval}</span>
                  </div>
                  <div className="space-y-3 mb-8">
                    {plan.features.slice(0, 5).map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 5 && (
                      <div className="text-xs text-slate-400 pl-6">
                        + {plan.features.length - 5} more features
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="w-full border-slate-200">Edit</Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>
              ))
            )}
            
            {/* Add New Plan Card */}
            <button className="flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group h-full min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900">Create New Plan</h3>
              <p className="text-slate-500 text-sm text-center mt-1">Add a new subscription tier</p>
            </button>
          </div>
        </TabsContent>

        {/* VERIFICATION TAB */}
        <TabsContent value="verification" className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Pending Verifications</h3>
                <p className="text-slate-500 text-sm">Review and approve manual EFT payments.</p>
              </div>
              <Button variant="outline" onClick={() => refetchProofs()}>
                Refresh
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white/50">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Agency / User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProofs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Loading payment proofs...
                      </TableCell>
                    </TableRow>
                  ) : proofsData?.proofs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-20" />
                          <p className="text-slate-900 font-medium">All caught up!</p>
                          <p className="text-slate-500 text-sm">No pending payments to verify.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    proofsData?.proofs.map((proof) => (
                      <TableRow key={proof.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          {new Date(proof.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{proof.agencyName || 'Unknown Agency'}</span>
                            <span className="text-xs text-slate-500">{proof.submittedBy}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(proof.amount / 100)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {proof.referenceNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {proof.proofOfPaymentUrl ? (
                            <a 
                              href={proof.proofOfPaymentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:underline text-sm"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View Proof
                            </a>
                          ) : (
                            <span className="text-slate-400 text-sm">No file</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(proof.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 hover:bg-green-50 border-green-200"
                              onClick={() => handleVerifyPayment(proof.id, 'verified')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:bg-red-50 border-red-200"
                              onClick={() => handleVerifyPayment(proof.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
