import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PartnerProgramTermsCard, type ProgramTermsItem } from '@/components/distribution/partner/PartnerProgramTermsCard';
import { Badge } from '@/components/ui/badge';
import { ReferralAppShell } from '@/components/referral/ReferralAppShell';

const ALL_FILTER_VALUE = 'all';

export default function PartnerDevelopmentsPage() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [enabledOnly, setEnabledOnly] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_FILTER_VALUE);
  const [selectedProvince, setSelectedProvince] = useState<string>(ALL_FILTER_VALUE);
  const [selectedCity, setSelectedCity] = useState<string>(ALL_FILTER_VALUE);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);

  const listInput = useMemo(
    () => ({
      brandProfileId:
        selectedBrandId === ALL_FILTER_VALUE ? undefined : Number(selectedBrandId),
      includeDisabled: !enabledOnly,
    }),
    [enabledOnly, selectedBrandId],
  );

  const termsQuery = trpc.distribution.partner.listProgramTerms.useQuery(listInput, {
    enabled: isAuthenticated,
    retry: false,
  });

  const allItems = termsQuery.data?.items || [];

  const brandOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of allItems) {
      if (item.brand) {
        map.set(item.brand.brandProfileId, item.brand.brandName);
      }
    }
    return Array.from(map.entries())
      .map(([brandProfileId, brandName]) => ({ brandProfileId, brandName }))
      .sort((a, b) => a.brandName.localeCompare(b.brandName));
  }, [allItems]);

  const provinceOptions = useMemo(() => {
    return Array.from(new Set(allItems.map(item => item.province).filter(Boolean) as string[])).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [allItems]);

  const cityOptions = useMemo(() => {
    const baseItems =
      selectedProvince === ALL_FILTER_VALUE
        ? allItems
        : allItems.filter(item => (item.province || '') === selectedProvince);

    return Array.from(new Set(baseItems.map(item => item.city).filter(Boolean) as string[])).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [allItems, selectedProvince]);

  const filteredItems = useMemo(() => {
    let rows = [...allItems];
    if (selectedProvince !== ALL_FILTER_VALUE) {
      rows = rows.filter(item => (item.province || '') === selectedProvince);
    }
    if (selectedCity !== ALL_FILTER_VALUE) {
      rows = rows.filter(item => (item.city || '') === selectedCity);
    }
    return rows;
  }, [allItems, selectedProvince, selectedCity]);

  useEffect(() => {
    if (selectedProvince === ALL_FILTER_VALUE) return;
    const provinceStillExists = provinceOptions.includes(selectedProvince);
    if (!provinceStillExists) {
      setSelectedProvince(ALL_FILTER_VALUE);
    }
  }, [provinceOptions, selectedProvince]);

  useEffect(() => {
    if (selectedCity === ALL_FILTER_VALUE) return;
    const cityStillExists = cityOptions.includes(selectedCity);
    if (!cityStillExists) {
      setSelectedCity(ALL_FILTER_VALUE);
    }
  }, [cityOptions, selectedCity]);

  if (loading || termsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <ReferralAppShell>
      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-6 md:px-7">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Partner Development Terms</CardTitle>
            <CardDescription>
              Review referral fee, payout rules, and required documents for each development.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Developments: {filteredItems.length}</Badge>
              <label className="ml-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabledOnly}
                  onChange={event => setEnabledOnly(event.target.checked)}
                />
                Enabled only
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Brand</span>
                <select
                  className="h-9 w-full rounded border border-input bg-background px-2"
                  value={selectedBrandId}
                  onChange={event => setSelectedBrandId(event.target.value)}
                >
                  <option value={ALL_FILTER_VALUE}>All brands</option>
                  {brandOptions.map(option => (
                    <option key={option.brandProfileId} value={option.brandProfileId}>
                      {option.brandName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Province</span>
                <select
                  className="h-9 w-full rounded border border-input bg-background px-2"
                  value={selectedProvince}
                  onChange={event => setSelectedProvince(event.target.value)}
                >
                  <option value={ALL_FILTER_VALUE}>All provinces</option>
                  {provinceOptions.map(province => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-slate-600">City</span>
                <select
                  className="h-9 w-full rounded border border-input bg-background px-2"
                  value={selectedCity}
                  onChange={event => setSelectedCity(event.target.value)}
                >
                  <option value={ALL_FILTER_VALUE}>All cities</option>
                  {cityOptions.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        {termsQuery.error ? (
          <Card>
            <CardContent className="py-8 text-sm text-red-600">{termsQuery.error.message}</CardContent>
          </Card>
        ) : null}

        {!termsQuery.error && !filteredItems.length ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Terms not configured yet.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item: ProgramTermsItem) => (
            <PartnerProgramTermsCard key={item.developmentId} item={item} />
          ))}
        </div>
      </main>
    </ReferralAppShell>
  );
}
