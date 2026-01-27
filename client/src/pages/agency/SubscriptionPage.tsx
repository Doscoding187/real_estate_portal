import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Download,
  FileText,
  Upload,
  Calendar,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function AgencySubscriptionPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Payment Proof Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Queries
  const { data: subscription, isLoading: isLoadingSub } =
    trpc.subscription.getCurrentSubscription.useQuery();
  const { data: plans, isLoading: isLoadingPlans } = trpc.subscription.getAvailablePlans.useQuery();
  const { data: invoicesData, isLoading: isLoadingInvoices } =
    trpc.subscription.getMyInvoices.useQuery({
      page: 1,
      limit: 10,
    });
  const { data: bankingDetails } = trpc.subscription.getBankingDetails.useQuery();

  // Mutations
  const submitProofMutation = trpc.subscription.submitPaymentProof.useMutation({
    onSuccess: () => {
      toast.success('Payment proof submitted successfully');
      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      setIsSubmittingProof(false);
    },
    onError: error => {
      toast.error(`Failed to submit proof: ${error.message}`);
      setIsSubmittingProof(false);
    },
  });

  const upgradeMutation = trpc.subscription.upgradeSubscription.useMutation({
    onSuccess: () => {
      toast.success('Subscription upgraded successfully');
      setIsUpgradeDialogOpen(false);
      window.location.reload(); // Refresh to show new status
    },
    onError: error => {
      toast.error(`Upgrade failed: ${error.message}`);
    },
  });

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProof(true);

    submitProofMutation.mutate({
      amount: Math.round(parseFloat(paymentAmount) * 100), // Convert to cents
      paymentMethod: 'eft',
      referenceNumber: paymentReference,
      paymentDate: paymentDate,
      notes: paymentNotes,
      // In a real app, we would upload the file first and get a URL
      proofOfPaymentUrl: 'https://example.com/mock-proof.pdf',
    });
  };

  const handleUpgrade = (plan: any) => {
    setSelectedPlan(plan);
    setIsUpgradeDialogOpen(true);
  };

  const confirmUpgrade = () => {
    if (!selectedPlan) return;
    upgradeMutation.mutate({ newPlanId: selectedPlan.id });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
            Active
          </Badge>
        );
      case 'trialing':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">
            Trial
          </Badge>
        );
      case 'past_due':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-200">
            Past Due
          </Badge>
        );
      case 'canceled':
        return (
          <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">
            Canceled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/agency/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Subscription & Billing</h1>
            <p className="text-slate-500">Manage your plan and view billing history</p>
          </div>
        </div>

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white p-1 rounded-xl border border-slate-200">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plans">Available Plans</TabsTrigger>
            <TabsTrigger value="billing">Billing & Payments</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Plan Card */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your active subscription details</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSub ? (
                    <div className="py-8 text-center text-slate-500">Loading subscription...</div>
                  ) : subscription ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">
                            {subscription.plan?.displayName}
                          </h3>
                          <p className="text-slate-500">
                            {formatCurrency(subscription.plan?.price)} /{' '}
                            {subscription.plan?.interval}
                          </p>
                        </div>
                        {getStatusBadge(subscription.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-100">
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Start Date</p>
                          <p className="font-medium">
                            {subscription.currentPeriodStart
                              ? new Date(subscription.currentPeriodStart).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 mb-1">Renewal Date</p>
                          <p className="font-medium">
                            {subscription.currentPeriodEnd
                              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
                        <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Pro Features Active</p>
                          <p className="text-xs text-blue-700 mt-1">
                            You have access to all features included in the{' '}
                            {subscription.plan?.displayName} plan.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-500 mb-4">No active subscription found.</p>
                      <Button onClick={() => setActiveTab('plans')}>View Plans</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Usage Stats (Mock) */}
              <Card>
                <CardHeader>
                  <CardTitle>Usage</CardTitle>
                  <CardDescription>Current billing cycle</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Active Listings</span>
                      <span className="font-medium">12 / 50</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[24%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Agents</span>
                      <span className="font-medium">3 / 5</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 w-[60%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Storage</span>
                      <span className="font-medium">1.2GB / 5GB</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600 w-[24%]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* PLANS TAB */}
          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isLoadingPlans ? (
                <div className="col-span-3 text-center py-12 text-slate-500">Loading plans...</div>
              ) : (
                plans?.map(plan => (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${subscription?.planId === plan.id ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                  >
                    {plan.isPopular && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-xl font-medium">
                        Most Popular
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.displayName}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <span className="text-3xl font-bold text-slate-900">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-slate-500">/{plan.interval}</span>
                      </div>

                      <div className="space-y-3 mb-8">
                        {plan.features.map((feature: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="w-full"
                        variant={subscription?.planId === plan.id ? 'outline' : 'default'}
                        disabled={subscription?.planId === plan.id}
                        onClick={() => handleUpgrade(plan)}
                      >
                        {subscription?.planId === plan.id ? 'Current Plan' : 'Select Plan'}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* BILLING TAB */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Invoice History */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>View and download past invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingInvoices ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                            Loading invoices...
                          </TableCell>
                        </TableRow>
                      ) : invoicesData?.invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                            No invoices found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoicesData?.invoices.map(invoice => (
                          <TableRow key={invoice.id}>
                            <TableCell>
                              {new Date(invoice.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                                className="capitalize"
                              >
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                PDF
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Payment Proof Upload */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Banking Details</CardTitle>
                    <CardDescription>Use these details for EFT payments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500">Bank</span>
                      <span className="font-medium">{bankingDetails?.bankName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500">Account Name</span>
                      <span className="font-medium">{bankingDetails?.accountName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500">Account Number</span>
                      <span className="font-medium">{bankingDetails?.accountNumber}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-slate-500">Branch Code</span>
                      <span className="font-medium">{bankingDetails?.branchCode}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Reference</span>
                      <span className="font-medium bg-yellow-100 px-2 py-0.5 rounded text-yellow-800">
                        {bankingDetails?.referencePrefix}
                        {subscription?.agencyId || '...'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Submit Payment Proof</CardTitle>
                    <CardDescription>Upload proof for manual EFT payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitProof} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount Paid (R)</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reference">Reference Used</Label>
                        <Input
                          id="reference"
                          placeholder="e.g. SUB-123"
                          value={paymentReference}
                          onChange={e => setPaymentReference(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Payment Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={paymentDate}
                          onChange={e => setPaymentDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="file">Proof of Payment (PDF/Image)</Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmittingProof}>
                        {isSubmittingProof ? 'Submitting...' : 'Submit Proof'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Upgrade Confirmation Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Plan Change</DialogTitle>
              <DialogDescription>
                Are you sure you want to switch to the <strong>{selectedPlan?.displayName}</strong>{' '}
                plan?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-sm text-blue-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                  Your new billing cycle will start immediately. A pro-rated invoice will be
                  generated for the remainder of the current period.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmUpgrade}>Confirm & Upgrade</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
