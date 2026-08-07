/**
 * Developer commercial products.
 *
 * Product, price, trial, benefit, limit and CTA facts come from the canonical
 * commercial catalog. This page only supplies presentation and navigation.
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  Crown,
  Gift,
  Link,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCommercialCatalog, type CommercialProduct } from '@/hooks/useCommercialCatalog';
import {
  formatCommercialLimitLabel,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
} from '@/lib/commercialCatalog';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PLAN_STYLES = [
  {
    icon: Gift,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-100 text-purple-700',
    borderColor: 'border-purple-500',
  },
  {
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-500',
  },
  {
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-100 text-amber-700',
    borderColor: 'border-amber-500',
  },
];

function formatLimitValue(value: CommercialProduct['limits'][string]): string {
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included';
  if (typeof value === 'number') return String(value);
  return value == null || value === '' ? 'Not configured' : String(value);
}

function ProductIcon({ index, className }: { index: number; className?: string }) {
  const Icon = PLAN_STYLES[index % PLAN_STYLES.length].icon;
  return <Icon className={className} />;
}

export default function DeveloperPlans() {
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<CommercialProduct | null>(null);
  const { data: catalog, isLoading, isError } = useCommercialCatalog('developer');
  const { data: subscription } = trpc.developer.getSubscription.useQuery(undefined, {
    staleTime: 60_000,
  });
  const requestLaunchInvoice = trpc.billing.requestDeveloperLaunchAccessInvoice.useMutation({
    onSuccess: result => {
      setSelectedProduct(null);
      toast.success('Invoice ready', {
        description: `${result.invoice.invoiceNumber} is ready for manual EFT payment.`,
      });
      setLocation(`/developer/subscription?invoiceId=${result.invoice.id}`);
    },
    onError: error => {
      toast.error(error.message || 'Launch Access invoice could not be issued');
    },
  });

  const products = catalog?.products || [];
  const currentPlanId = subscription?.commercial?.entitled
    ? (subscription.commercial.planId ?? null)
    : null;

  const handleSelectProduct = (product: CommercialProduct) => {
    const action = getCommercialActionPresentation(product);
    if (product.source.planId === currentPlanId || action.disabled || !action.href) return;
    setSelectedProduct(product);
  };

  const continueWithProduct = () => {
    if (!selectedProduct) return;
    if (
      selectedProduct.audience === 'developer' &&
      selectedProduct.term.kind === 'paid_launch_access' &&
      selectedProduct.action.mode === 'request_invoice'
    ) {
      requestLaunchInvoice.mutate();
      return;
    }
    const action = getCommercialActionPresentation(selectedProduct);
    if (action.href) setLocation(action.href);
    setSelectedProduct(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setLocation('/developer/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="mb-12 text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
              <Sparkles className="mr-1 h-3 w-3" />
              Developer Plans
            </Badge>
            <h1 className="mb-4 text-4xl font-bold text-slate-900 md:text-5xl">
              Scale Your Property Development Business
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Compare the developer products currently configured in Property Listify.
            </p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[0, 1, 2].map(item => (
                <Card key={item} className="h-[560px] animate-pulse bg-white" />
              ))}
            </div>
          )}

          {isError && (
            <Card className="mx-auto max-w-xl p-8 text-center">
              <h2 className="mb-2 text-xl font-semibold text-slate-900">
                Developer pricing unavailable
              </h2>
              <p className="mb-6 text-slate-600">
                We could not load the current commercial catalog. No historical price has been used
                as a fallback.
              </p>
              <Button onClick={() => setLocation('/contact')}>Contact sales</Button>
            </Card>
          )}

          {!isLoading && !isError && products.length === 0 && (
            <Card className="mx-auto max-w-xl p-8 text-center">
              <h2 className="mb-2 text-xl font-semibold text-slate-900">
                Developer products are being configured
              </h2>
              <p className="mb-6 text-slate-600">
                There is no active canonical developer product available yet. Contact sales for an
                assisted commercial conversation.
              </p>
              <Button onClick={() => setLocation('/contact')}>Contact sales</Button>
            </Card>
          )}

          {!isLoading && !isError && products.length > 0 && (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {products.map((product, index) => {
                const style = PLAN_STYLES[index % PLAN_STYLES.length];
                const price = getCommercialPricePresentation(product);
                const action = getCommercialActionPresentation(product);
                const isCurrentPlan = product.source.planId === currentPlanId;
                const limits = Object.entries(product.limits);

                return (
                  <Card
                    key={product.productId}
                    className={cn(
                      'relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
                      product.popular && 'scale-[1.02] ring-2 ring-purple-500 shadow-xl',
                      isCurrentPlan && 'ring-2 ring-green-500',
                    )}
                  >
                    <div className={cn('h-2 bg-gradient-to-r', style.color)} />
                    {product.popular && (
                      <div className="absolute right-4 top-6">
                        <Badge className="bg-purple-600 text-white shadow-lg">Most Popular</Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute right-4 top-6">
                        <Badge className="bg-green-600 text-white shadow-lg">Current Plan</Badge>
                      </div>
                    )}

                    <div className="p-8">
                      <div className="mb-6 flex items-center gap-4">
                        <div className={cn('rounded-2xl p-4', style.bgColor)}>
                          <ProductIcon index={index} className="h-8 w-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">
                            {product.displayName}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {product.description || 'Canonical developer product'}
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-slate-900">{price.label}</span>
                          {price.period && <span className="text-slate-500">{price.period}</span>}
                        </div>
                        {product.term.kind === 'paid_launch_access' &&
                          product.term.durationDays !== null && (
                            <p className="mt-2 text-sm font-medium text-blue-600">
                              Paid Launch Access · {product.term.durationDays} days
                            </p>
                          )}
                        {product.term.kind === 'free_trial' &&
                          product.trial.available &&
                          product.trial.days > 0 && (
                            <p className="mt-2 text-sm font-medium text-purple-600">
                              Includes a {product.trial.days}-day trial
                            </p>
                          )}
                        {product.pricing.displayIncludesVat === true && (
                          <p className="mt-1 text-xs text-slate-500">
                            Displayed price includes VAT
                          </p>
                        )}
                      </div>

                      <div className="mb-8 space-y-4">
                        {product.benefits.map(benefit => (
                          <div
                            key={benefit}
                            className="flex items-start gap-3 text-sm text-slate-700"
                          >
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                        {limits.map(([key, value]) => (
                          <div key={key} className="flex items-start gap-3 text-sm text-slate-700">
                            <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                            <span>
                              <span className="font-medium">
                                {formatCommercialLimitLabel(key)}:
                              </span>{' '}
                              {formatLimitValue(value)}
                            </span>
                          </div>
                        ))}
                        {product.benefits.length === 0 && limits.length === 0 && (
                          <p className="text-sm text-slate-500">
                            Benefits will be confirmed during assisted onboarding.
                          </p>
                        )}
                      </div>

                      <Button
                        className={cn(
                          'h-12 w-full font-semibold transition-all',
                          isCurrentPlan
                            ? 'bg-slate-200 text-slate-600'
                            : `bg-gradient-to-r ${style.color} text-white`,
                        )}
                        disabled={isCurrentPlan || action.disabled}
                        onClick={() => handleSelectProduct(product)}
                      >
                        {isCurrentPlan ? 'Current Plan' : action.label}
                        {!isCurrentPlan && <ArrowUpRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mx-auto mt-16 max-w-3xl rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="mb-4 flex justify-center gap-3 text-slate-400">
              <Users className="h-5 w-5" />
              <Link className="h-5 w-5" />
              <Zap className="h-5 w-5" />
            </div>
            <p className="mb-4 text-slate-600">Need a custom developer arrangement?</p>
            <Button
              variant="outline"
              className="border-slate-300"
              onClick={() => setLocation('/contact')}
            >
              Contact sales
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedProduct)}
        onOpenChange={open => !open && setSelectedProduct(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Continue with {selectedProduct?.displayName}</DialogTitle>
            <DialogDescription>
              This product uses the current canonical commercial action. Paid developer access is
              not activated by selecting a plan.
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-3 py-4 text-sm text-slate-600">
              <p>
                {getCommercialPricePresentation(selectedProduct).label}
                {getCommercialPricePresentation(selectedProduct).period || ''}
              </p>
              <p>
                Any paid activation remains subject to an assisted invoice and verified payment.
              </p>
              <p>No promotion is shown unless it is configured by the commercial catalog.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)}>
              Cancel
            </Button>
            <Button onClick={continueWithProduct} disabled={requestLaunchInvoice.isPending}>
              {requestLaunchInvoice.isPending ? 'Requesting invoice…' : 'Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
