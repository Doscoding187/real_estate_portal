import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HomeLayout } from '@/layouts/HomeLayout';
import {
  formatCommercialLimitLabel,
  getCommercialActionPresentation,
  getCommercialPricePresentation,
} from '@/lib/commercialCatalog';
import { useCommercialCatalog } from '@/hooks/useCommercialCatalog';
import type { CommercialAudience } from '@/hooks/useCommercialCatalog';
import { Building2, Check, Crown, Loader2, Rocket, User, Zap } from 'lucide-react';

const visibleAudiences: CommercialAudience[] = ['agent', 'agency', 'developer'];

function getPlanIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('elite') || normalized.includes('enterprise')) return Crown;
  if (normalized.includes('pro') || normalized.includes('growth')) return Zap;
  return Check;
}

function getAudienceIcon(audience: CommercialAudience) {
  if (audience === 'agent') return User;
  if (audience === 'agency') return Building2;
  return Rocket;
}

function formatLimitValue(value: unknown) {
  if (value === -1) return 'Unlimited';
  if (typeof value === 'boolean') return value ? 'Included' : 'Not included';
  return String(value);
}

export default function SubscriptionPlans() {
  const [, setLocation] = useLocation();
  const [selectedAudience, setSelectedAudience] = useState<CommercialAudience>('agent');
  const catalog = useCommercialCatalog();
  const products = useMemo(
    () =>
      (catalog.data?.products || []).filter(product => product.audience === selectedAudience),
    [catalog.data?.products, selectedAudience],
  );

  if (catalog.isLoading) {
    return (
      <HomeLayout>
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading canonical commercial products...
        </div>
      </HomeLayout>
    );
  }

  return (
    <HomeLayout>
      <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900">Commercial products</h1>
          <p className="text-lg text-slate-600">
            Prices, trial terms, benefits, limits, and next actions are supplied by the canonical
            Property Listify commercial catalog.
          </p>
        </div>

        <Tabs
          value={selectedAudience}
          onValueChange={value => setSelectedAudience(value as CommercialAudience)}
          className="mb-12"
        >
          <TabsList className="mx-auto grid w-full max-w-md grid-cols-3">
            {visibleAudiences.map(audience => {
              const Icon = getAudienceIcon(audience);
              return (
                <TabsTrigger key={audience} value={audience} className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span className="hidden capitalize sm:inline">{audience}s</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedAudience}>
            {catalog.isError ? (
              <Card className="mx-auto mt-8 max-w-xl p-8 text-center">
                <h2 className="text-xl font-semibold text-slate-900">Pricing is unavailable</h2>
                <p className="mt-2 text-sm text-slate-600">
                  The commercial catalog could not be loaded. No historical price is shown.
                </p>
                <Button className="mt-5" variant="outline" onClick={() => void catalog.refetch()}>
                  Retry
                </Button>
              </Card>
            ) : products.length === 0 ? (
              <Card className="mx-auto mt-8 max-w-xl p-8 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  No public products available
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  This audience currently requires an assisted commercial conversation.
                </p>
                <Button className="mt-5" onClick={() => setLocation('/contact')}>
                  Contact us
                </Button>
              </Card>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map(product => {
                  const price = getCommercialPricePresentation(product);
                  const action = getCommercialActionPresentation(product);
                  const Icon = getPlanIcon(product.name);
                  const limitLines = Object.entries(product.limits).map(
                    ([key, value]) => `${formatCommercialLimitLabel(key)}: ${formatLimitValue(value)}`,
                  );

                  return (
                    <Card
                      key={product.productId}
                      className={`relative flex flex-col overflow-hidden p-6 transition-all hover:shadow-xl ${
                        product.popular ? 'border-2 border-blue-500 shadow-lg' : 'border-slate-200'
                      }`}
                    >
                      {product.popular ? (
                        <Badge className="absolute right-4 top-4 bg-blue-600 text-white">
                          Most popular
                        </Badge>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-100 p-3 text-slate-600">
                          <Icon className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{product.displayName}</h2>
                      </div>

                      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600">
                        {product.description || 'Canonical Property Listify commercial product.'}
                      </p>

                      <div className="mb-6 mt-5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-slate-900">{price.label}</span>
                          {price.period ? <span className="text-slate-600">{price.period}</span> : null}
                        </div>
                        {product.trial.available ? (
                          <div className="mt-1 text-sm font-medium text-blue-600">
                            {product.trial.days}-day trial included
                          </div>
                        ) : null}
                      </div>

                      <ul className="mb-8 flex-1 space-y-3">
                        {[...product.benefits, ...limitLines].map(feature => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full"
                        variant={action.disabled ? 'outline' : 'default'}
                        disabled={action.disabled}
                        onClick={() => action.href && setLocation(action.href)}
                      >
                        {action.label}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </HomeLayout>
  );
}
