import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Receipt,
  Settings,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { format } from 'date-fns';

const BillingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // API calls
  const { data: subscription, isLoading: subscriptionLoading } =
    trpc.billing.subscription.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.billing.invoices.useQuery();
  const { data: paymentMethods, isLoading: paymentMethodsLoading } =
    trpc.billing.paymentMethods.useQuery();

  // Mutations
  const cancelSubscriptionMutation = trpc.billing.cancelSubscription.useMutation();
  const reactivateSubscriptionMutation = trpc.billing.reactivateSubscription.useMutation();
  const createCheckoutMutation = trpc.billing.createCheckoutSession.useMutation();

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscriptionMutation.mutateAsync();
      toast.success('Subscription cancelled', {
        description:
          'Your subscription will remain active until the end of the current billing period.',
      });
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      await reactivateSubscriptionMutation.mutateAsync();
      toast.success('Subscription reactivated', {
        description: 'Your subscription has been reactivated successfully.',
      });
    } catch (error) {
      toast.error('Failed to reactivate subscription');
    }
  };

  const handleUpgradePlan = async () => {
    // TODO: Implement plan upgrade flow
    toast.info('Plan upgrade coming soon');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      trialing: { variant: 'secondary' as const, icon: Clock, color: 'text-blue-600' },
      past_due: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
      canceled: { variant: 'outline' as const, icon: XCircle, color: 'text-gray-600' },
      incomplete: { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.incomplete;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount / 100);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Current Subscription</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {subscription.plan?.displayName || 'Unknown Plan'}
                      </h3>
                      {getStatusBadge(subscription.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatCurrency(subscription.plan?.price || 0)}
                        <span className="text-sm font-normal text-gray-600">
                          /{subscription.plan?.interval}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-600">Current Period</div>
                      <div className="font-medium">
                        {formatDate(subscription.currentPeriodStart)} -{' '}
                        {formatDate(subscription.currentPeriodEnd)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                      </div>
                      <div className="font-medium">
                        {subscription.cancelAtPeriodEnd
                          ? formatDate(subscription.currentPeriodEnd)
                          : formatDate(subscription.currentPeriodEnd)}
                      </div>
                    </div>
                  </div>

                  {subscription.cancelAtPeriodEnd && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Your subscription is set to cancel at the end of the current billing period.
                        You can reactivate it anytime before then.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Active Subscription</h3>
                  <p className="text-gray-600">Upgrade to access premium features</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={handleUpgradePlan}
                  className="h-20 flex-col space-y-2"
                >
                  <TrendingUp className="w-6 h-6" />
                  <span>Upgrade Plan</span>
                </Button>

                {subscription?.cancelAtPeriodEnd ? (
                  <Button
                    variant="outline"
                    onClick={handleReactivateSubscription}
                    disabled={reactivateSubscriptionMutation.isPending}
                    className="h-20 flex-col space-y-2"
                  >
                    <CheckCircle className="w-6 h-6" />
                    <span>Reactivate</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleCancelSubscription}
                    disabled={cancelSubscriptionMutation.isPending}
                    className="h-20 flex-col space-y-2"
                  >
                    <XCircle className="w-6 h-6" />
                    <span>Cancel Subscription</span>
                  </Button>
                )}

                <Button variant="outline" className="h-20 flex-col space-y-2">
                  <Settings className="w-6 h-6" />
                  <span>Billing Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          {subscription ? (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>
                  Detailed information about your current subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Plan</label>
                      <div className="text-lg">{subscription.plan?.displayName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1">{getStatusBadge(subscription.status)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Billing Interval</label>
                      <div className="text-lg capitalize">{subscription.plan?.interval}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Current Period Start
                      </label>
                      <div className="text-lg">{formatDate(subscription.currentPeriodStart)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Current Period End
                      </label>
                      <div className="text-lg">{formatDate(subscription.currentPeriodEnd)}</div>
                    </div>
                    {subscription.trialEnd && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Trial Ends</label>
                        <div className="text-lg">{formatDate(subscription.trialEnd)}</div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Plan Features</h4>
                  {subscription.plan?.features && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {JSON.parse(subscription.plan.features).map(
                        (feature: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-4">
                  Choose a plan to get started with premium features
                </p>
                <Button onClick={() => setActiveTab('overview')}>View Plans</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Billing History</span>
              </CardTitle>
              <CardDescription>View and download your past invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber || `#${invoice.id}`}
                        </TableCell>
                        <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                        <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {invoice.invoicePdf && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={invoice.invoicePdf}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  PDF
                                </a>
                              </Button>
                            )}
                            {invoice.hostedInvoiceUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={invoice.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Receipt className="w-4 h-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Invoices Yet</h3>
                  <p className="text-gray-600">Your billing history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Methods</span>
              </CardTitle>
              <CardDescription>Manage your saved payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethodsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : paymentMethods && paymentMethods.length > 0 ? (
                <div className="space-y-4">
                  {paymentMethods.map(method => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                        <div>
                          <div className="font-medium">•••• •••• •••• {method.cardLast4}</div>
                          <div className="text-sm text-gray-600">
                            {method.cardBrand?.toUpperCase()}{' '}
                            {method.isDefault && <Badge variant="secondary">Default</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!method.isDefault && (
                          <Button variant="outline" size="sm">
                            Set as Default
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Update
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No Payment Methods</h3>
                  <p className="text-gray-600">Add a payment method to manage your subscription</p>
                </div>
              )}

              <Separator className="my-6" />

              <Button className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingDashboard;
