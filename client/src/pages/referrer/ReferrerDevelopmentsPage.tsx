import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

function parseMediaField(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [trimmed];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

function resolveMediaUrl(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() || null;
  if (!entry || typeof entry !== 'object') return null;
  const raw = entry as Record<string, unknown>;
  const candidate = raw.url ?? raw.href;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function resolveMediaName(entry: unknown, fallback: string) {
  if (!entry || typeof entry !== 'object') return fallback;
  const raw = entry as Record<string, unknown>;
  for (const key of ['name', 'title', 'label', 'fileName']) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function computeCommissionEstimateFromDevelopment(dev: any): number | null {
  const track = (dev?.referrerCommission || {}) as {
    type?: 'flat' | 'percentage';
    value?: number | null;
    estimatedAmount?: number | null;
  };
  const estimatedAmount = Number(track.estimatedAmount || 0);
  if (estimatedAmount > 0) return estimatedAmount;

  const trackType = String(track.type || '').trim().toLowerCase();
  const trackValue = Number(track.value || 0);
  const priceAnchor = Number(dev?.priceFrom || dev?.priceTo || 0);
  if (trackType === 'flat') return trackValue > 0 ? trackValue : null;
  if (trackType === 'percentage') {
    return trackValue > 0 && priceAnchor > 0 ? (trackValue / 100) * priceAnchor : null;
  }

  const fixedCommission = Number(dev?.defaultCommissionAmount || 0);
  const percent = Number(dev?.defaultCommissionPercent || 0);
  if (fixedCommission > 0) return fixedCommission;
  if (percent > 0 && priceAnchor > 0) return (percent / 100) * priceAnchor;
  return null;
}

type SalesDoc = { id: string; name: string; url: string; category: 'brochure' | 'floor_plan' | 'video' };

function buildSalesPack(development: any | null): SalesDoc[] {
  if (!development) return [];
  const rows: SalesDoc[] = [];
  const seen = new Set<string>();

  const collect = (category: SalesDoc['category'], source: unknown, fallbackName: string) => {
    for (const entry of parseMediaField(source)) {
      const url = resolveMediaUrl(entry);
      if (!url) continue;
      const normalized = url.trim();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      rows.push({
        id: `${category}:${rows.length + 1}`,
        name: resolveMediaName(entry, fallbackName),
        url: normalized,
        category,
      });
    }
  };

  collect('brochure', development.brochures, 'Development Brochure');
  collect('floor_plan', development.floorPlans, 'Floor Plan');
  collect('video', development.videos, 'Development Video');

  return rows;
}

export default function ReferrerDevelopmentsPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [location, setLocation] = useLocation();

  const [search, setSearch] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const accessQuery = trpc.distribution.referrer.myAccess.useQuery(
    { includePaused: true, includeRevoked: false },
    { retry: false },
  );

  const rows = (accessQuery.data || []) as any[];

  useEffect(() => {
    const queryIndex = String(location || '').indexOf('?');
    if (queryIndex < 0) return;
    if (accessQuery.status === 'loading') return;

    const params = new URLSearchParams(String(location || '').slice(queryIndex + 1));
    const developmentId = Number(params.get('developmentId') || 0);
    const programId = Number(params.get('programId') || 0);

    let match: any | null = null;
    if (programId > 0) match = rows.find(r => Number(r.programId) === Number(programId)) || null;
    if (!match && developmentId > 0) match = rows.find(r => Number(r.developmentId) === Number(developmentId)) || null;

    // If this is a deep link, make sure the requested dev is visible even if the user previously searched.
    if (match) {
      setSearch('');
      setSelectedProgramId(Number(match.programId));
    }

    setLocation('/referrer/developments', { replace: true });
  }, [accessQuery.status, location, rows, setLocation]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      if (!q) return true;
      const hay = `${row.developmentName || ''} ${row.city || ''} ${row.province || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  useEffect(() => {
    if (selectedProgramId && filtered.some(r => Number(r.programId) === Number(selectedProgramId))) return;
    const first = filtered[0];
    setSelectedProgramId(first ? Number(first.programId) : null);
  }, [filtered, selectedProgramId]);

  const selected = useMemo(() => {
    if (!selectedProgramId) return null;
    return filtered.find(r => Number(r.programId) === Number(selectedProgramId)) || null;
  }, [filtered, selectedProgramId]);

  const checklistQuery = trpc.distribution.referrer.listSubmissionChecklist.useQuery(
    { programId: Number(selected?.programId || 0) },
    { enabled: Boolean(selected?.programId), retry: false },
  );

  useEffect(() => {
    if (checklistQuery.error) toast.error(checklistQuery.error.message || 'Unable to load submission requirements');
  }, [checklistQuery.error]);

  const salesPack = useMemo(() => buildSalesPack(selected), [selected]);
  const requiredDocs = (checklistQuery.data?.items || []).filter((item: any) => Boolean(item.isRequired));

  const hasIdentity = Boolean(user?.hasReferrerIdentity);

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <div className="container py-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Live Developments</CardTitle>
            <CardDescription>Sales pack + submission requirements for the developments you can submit to.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search development, city, province"
              className="max-w-md"
            />
            <Badge variant="outline">Accessible: {filtered.length}</Badge>
            <Button variant="outline" onClick={() => setLocation('/referrer/dashboard')}>
              Back to dashboard
            </Button>
          </CardContent>
        </Card>

        {!hasIdentity ? (
          <Card>
            <CardHeader>
              <CardTitle>Referrer identity required</CardTitle>
              <CardDescription>Apply to join the network before you can view live developments.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation('/distribution-network/apply')}>Apply to join</Button>
            </CardContent>
          </Card>
        ) : accessQuery.isLoading ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Loading...</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No live developments available yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Access</CardTitle>
                <CardDescription>Select a development to view docs and requirements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filtered.map(row => {
                  const active = Number(row.programId) === Number(selectedProgramId || 0);
                  return (
                    <button
                      key={`${row.programId}:${row.developmentId}`}
                      type="button"
                      className={`w-full rounded-lg border bg-white p-3 text-left transition ${
                        active ? 'border-slate-400 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedProgramId(Number(row.programId))}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {row.developmentName || 'Development'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {(row.city || row.province || 'Location') as string}
                          </p>
                        </div>
                        <Badge variant={String(row.accessStatus || '').toLowerCase() === 'active' ? 'default' : 'outline'}>
                          {String(row.accessStatus || 'active')}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span>Sales pack: {buildSalesPack(row).length}</span>
                        <span>Required docs: {Number(row.workflowSummary?.requiredDocumentCount || 0)}</span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{selected?.developmentName || 'Development'}</CardTitle>
                    <CardDescription>
                      {selected?.city || selected?.province || 'Location'} • Program #{Number(selected?.programId || 0)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Est. payout: {formatMoney(computeCommissionEstimateFromDevelopment(selected))}
                    </Badge>
                    <Button
                      onClick={() => {
                        const devId = Number(selected?.developmentId || 0);
                        if (!devId) {
                          toast.error('Select a development first.');
                          return;
                        }
                        setLocation(`/referrer/dashboard?quick=1&from=developments&developmentId=${devId}`);
                      }}
                    >
                      Submit client
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Sales Pack</p>
                    <Badge variant="outline">Docs: {salesPack.length}</Badge>
                  </div>
                  <Separator />
                  {salesPack.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sales pack documents available yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {salesPack.map(doc => (
                        <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">
                            {doc.name}
                          </Button>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Submission Requirements</p>
                    <Badge variant="outline">Required: {requiredDocs.length}</Badge>
                  </div>
                  <Separator />
                  {checklistQuery.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading requirements...</p>
                  ) : requiredDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No submission requirements set yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {requiredDocs.map((item: any) => (
                        <Badge key={item.id} variant="secondary">
                          {item.documentLabel}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
