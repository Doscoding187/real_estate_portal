import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { PartnerDevelopmentOnboardingDrawer } from '@/components/admin/distribution/PartnerDevelopmentOnboardingDrawer';

const DEFAULT_SUBMODULE = 'partner-developments';

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DistributionNetworkPage() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandProfileId, setSelectedBrandProfileId] = useState<number | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState('');
  const [onboardingDrawerOpen, setOnboardingDrawerOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [latestInviteUrl, setLatestInviteUrl] = useState('');

  const submoduleSlug = useMemo(() => {
    if (!location.startsWith('/admin/distribution')) return DEFAULT_SUBMODULE;
    const parts = location.split('/').filter(Boolean);
    return parts[2] || DEFAULT_SUBMODULE;
  }, [location]);

  useEffect(() => {
    if (location === '/admin/distribution') {
      setLocation(`/admin/distribution/${DEFAULT_SUBMODULE}`);
    }
  }, [location, setLocation]);

  const moduleStatusQuery = trpc.distribution.getModuleStatus.useQuery();
  const submodulesQuery = trpc.distribution.listSubmodules.useQuery();
  const catalogQuery = trpc.distribution.admin.listDevelopmentCatalog.useQuery(
    {
      search,
      brandProfileId: selectedBrandProfileId || undefined,
      includeUnpublished: true,
      onlyBrandProfileLinked: true,
      limit: 300,
    },
    {
      enabled:
        submoduleSlug === 'partner-developments' || submoduleSlug === 'distribution-managers',
    },
  );
  const dealsQuery = trpc.distribution.admin.listDeals.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'deal-pipeline' || submoduleSlug === 'viewing-scheduler' },
  );
  const commissionQuery = trpc.distribution.admin.listCommissionEntries.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'commission-incentives' },
  );
  const tiersQuery = trpc.distribution.admin.listAgentTiers.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'agent-network' },
  );
  const accessQuery = trpc.distribution.admin.listAgentAccess.useQuery(
    { limit: 200, includeRevoked: false },
    { enabled: submoduleSlug === 'agent-network' },
  );
  const applicationsQuery = trpc.distribution.admin.listReferrerApplications.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'agent-network' },
  );
  const teamRegistrationsQuery = trpc.distribution.admin.listTeamRegistrations.useQuery(
    { limit: 200, requestedArea: 'distribution_manager' },
    {
      enabled:
        submoduleSlug === 'distribution-managers' || submoduleSlug === 'partner-developments',
    },
  );
  const brandProfilesQuery = trpc.superAdminPublisher.listBrandProfiles.useQuery(
    {
      search: brandSearch.trim() || undefined,
      limit: 20,
    },
    {
      enabled:
        submoduleSlug === 'partner-developments' || submoduleSlug === 'distribution-managers',
    },
  );
  const programsQuery = trpc.distribution.admin.listPrograms.useQuery(undefined, {
    enabled:
      submoduleSlug === 'partner-developments' || submoduleSlug === 'distribution-managers',
  });
  const ensureProgramMutation = trpc.distribution.admin.ensureProgramForDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development linked to partner program');
      programsQuery.refetch();
      catalogQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });
  const createManagerInviteMutation = trpc.distribution.admin.createManagerInvite.useMutation({
    onSuccess: result => {
      setLatestInviteUrl(result.inviteUrl || '');
      toast.success('Manager invite created');
      teamRegistrationsQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });
  const resendManagerInviteMutation = trpc.distribution.admin.resendManagerInvite.useMutation({
    onSuccess: result => {
      setLatestInviteUrl(result.inviteUrl || '');
      toast.success('Invite resent');
      teamRegistrationsQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });
  const reviewTeamRegistrationMutation = trpc.distribution.admin.reviewTeamRegistration.useMutation(
    {
      onSuccess: () => {
        toast.success('Registration reviewed');
        teamRegistrationsQuery.refetch();
      },
      onError: err => toast.error(err.message),
    },
  );
  const setManagerAccessMutation = trpc.distribution.admin.setManagerAccess.useMutation({
    onSuccess: result => {
      toast.success(result.active ? 'Manager access enabled' : 'Manager access revoked');
      teamRegistrationsQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });

  const pipelineStageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const deal of dealsQuery.data || []) {
      const key = String((deal as any).currentStage || 'unknown');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [dealsQuery.data]);

  const activeSubmodule = (submodulesQuery.data || []).find(m => m.slug === submoduleSlug);
  const programByDevelopmentId = useMemo(() => {
    const map = new Map<number, any>();
    for (const program of programsQuery.data || []) {
      map.set(Number((program as any).developmentId), program);
    }
    return map;
  }, [programsQuery.data]);
  const brandProfileDevelopmentRows = useMemo(() => {
    return (catalogQuery.data || []) as any[];
  }, [catalogQuery.data]);
  const activePartnerRows = useMemo(() => {
    return brandProfileDevelopmentRows.filter(
      row => Boolean(row.program) || programByDevelopmentId.has(Number(row.developmentId)),
    );
  }, [brandProfileDevelopmentRows, programByDevelopmentId]);
  const availablePartnerRows = useMemo(() => {
    return brandProfileDevelopmentRows.filter(
      row => !(Boolean(row.program) || programByDevelopmentId.has(Number(row.developmentId))),
    );
  }, [brandProfileDevelopmentRows, programByDevelopmentId]);
  const managerOptions = useMemo(() => {
    return (teamRegistrationsQuery.data || [])
      .filter((row: any) => row.status === 'approved' && row.userId)
      .map((row: any) => ({
        userId: Number(row.userId),
        label: `${row.fullName || row.email} (${row.email})`,
      }));
  }, [teamRegistrationsQuery.data]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Distribution Network</CardTitle>
          <CardDescription>
            Super admin module for referral operations, managers, deal flow, and commission control.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Badge variant={moduleStatusQuery.data?.enabled ? 'default' : 'destructive'}>
            {moduleStatusQuery.data?.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
          <Badge variant="secondary">Version: {moduleStatusQuery.data?.version || 'unknown'}</Badge>
          {activeSubmodule && <Badge variant="outline">Active: {activeSubmodule.title}</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submodules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(submodulesQuery.data || []).map(submodule => (
            <Button
              key={submodule.slug}
              variant={submodule.slug === submoduleSlug ? 'default' : 'outline'}
              onClick={() => setLocation(`/admin/distribution/${submodule.slug}`)}
            >
              {submodule.title}
            </Button>
          ))}
        </CardContent>
      </Card>

      {submoduleSlug === 'partner-developments' && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Developments</CardTitle>
            <CardDescription>
              Developments that can be configured into the referral program.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-start gap-2">
              <Input
                placeholder="Search development, city, province, brand"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="w-full max-w-md space-y-2">
                <Input
                  placeholder="Search brand profile..."
                  value={selectedBrandProfileId ? selectedBrandName : brandSearch}
                  onChange={e => {
                    const value = e.target.value;
                    if (selectedBrandProfileId) {
                      setSelectedBrandProfileId(null);
                      setSelectedBrandName('');
                    }
                    setBrandSearch(value);
                  }}
                />
                {!!brandSearch.trim() && !selectedBrandProfileId && (
                  <div className="max-h-56 overflow-auto rounded border bg-white p-1">
                    {(brandProfilesQuery.data || []).length ? (
                      (brandProfilesQuery.data || []).map((brand: any) => (
                        <button
                          key={brand.id}
                          className="w-full rounded px-2 py-1 text-left text-sm hover:bg-slate-100"
                          onClick={() => {
                            setSelectedBrandProfileId(Number(brand.id));
                            setSelectedBrandName(String(brand.brandName || 'Brand'));
                            setBrandSearch('');
                            setOnboardingDrawerOpen(true);
                          }}
                        >
                          {brand.brandName}
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-xs text-slate-500">No brand profiles found.</p>
                    )}
                  </div>
                )}
                {selectedBrandProfileId ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>
                      Selected brand: <strong>{selectedBrandName}</strong>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBrandProfileId(null);
                        setSelectedBrandName('');
                        setBrandSearch('');
                        setOnboardingDrawerOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setOnboardingDrawerOpen(true)}
                    >
                      Open Onboarding
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            {catalogQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Active Partner Developments ({activePartnerRows.length})
                  </p>
                  <div className="space-y-2">
                    {activePartnerRows.map((row: any) => (
                      <div key={row.developmentId} className="rounded border p-3">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <div>
                            <p className="font-semibold">{row.developmentName}</p>
                            <p className="text-xs text-slate-500">
                              {row.city}, {row.province}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Badge variant="default">Program Linked</Badge>
                            {row.brandProfileName ? (
                              <Badge variant="outline">Brand: {row.brandProfileName}</Badge>
                            ) : null}
                            <Badge variant="outline">
                              {formatMoney(row.priceFrom)} - {formatMoney(row.priceTo)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!activePartnerRows.length && (
                      <p className="text-sm text-slate-500">
                        No active partner developments yet.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Available Brand-Profile Developments ({availablePartnerRows.length})
                  </p>
                  <div className="space-y-2">
                    {availablePartnerRows.map((row: any) => (
                      <div key={row.developmentId} className="rounded border p-3">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <div>
                            <p className="font-semibold">{row.developmentName}</p>
                            <p className="text-xs text-slate-500">
                              {row.city}, {row.province}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Badge variant="secondary">Not Yet Added</Badge>
                            {row.brandProfileName ? (
                              <Badge variant="outline">Brand: {row.brandProfileName}</Badge>
                            ) : null}
                            <Badge variant="outline">
                              {formatMoney(row.priceFrom)} - {formatMoney(row.priceTo)}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={ensureProgramMutation.isPending}
                              onClick={() =>
                                ensureProgramMutation.mutate({
                                  developmentId: Number(row.developmentId),
                                })
                              }
                            >
                              Add to Partner Developments
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!availablePartnerRows.length && (
                      <p className="text-sm text-slate-500">
                        All brand-profile developments are already added to partner developments.
                      </p>
                    )}
                  </div>
                </div>

                {!brandProfileDevelopmentRows.length && (
                  <p className="text-sm text-slate-500">
                    No brand-profile developments found for current search.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <PartnerDevelopmentOnboardingDrawer
        open={onboardingDrawerOpen}
        onOpenChange={setOnboardingDrawerOpen}
        brandProfileId={selectedBrandProfileId}
        brandProfileName={selectedBrandName}
        developments={brandProfileDevelopmentRows}
        isLoading={catalogQuery.isLoading}
        isError={Boolean(catalogQuery.error)}
        onRetry={() => {
          void catalogQuery.refetch();
        }}
        managerOptions={managerOptions}
        onRefreshCatalog={async () => {
          await Promise.all([catalogQuery.refetch(), programsQuery.refetch()]);
        }}
      />

      {submoduleSlug === 'distribution-managers' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invite Manager</CardTitle>
              <CardDescription>
                Create an invite link. Manager completes profile + credentials from that link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Manager full name"
                value={inviteFullName}
                onChange={e => setInviteFullName(e.target.value)}
              />
              <Input
                placeholder="Manager email"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
              <Input
                placeholder="Contact number (optional)"
                value={invitePhone}
                onChange={e => setInvitePhone(e.target.value)}
              />
              <Input
                placeholder="Current role (optional)"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
              />
              <Input
                placeholder="Invite notes (optional)"
                value={inviteNotes}
                onChange={e => setInviteNotes(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (!inviteFullName.trim() || !inviteEmail.trim()) {
                    toast.error('Full name and email are required');
                    return;
                  }
                  createManagerInviteMutation.mutate({
                    fullName: inviteFullName.trim(),
                    email: inviteEmail.trim(),
                    phone: invitePhone.trim() || undefined,
                    currentRole: inviteRole.trim() || undefined,
                    notes: inviteNotes.trim() || undefined,
                  });
                }}
                disabled={createManagerInviteMutation.isPending}
              >
                {createManagerInviteMutation.isPending
                  ? 'Creating Invite...'
                  : 'Create Invite Link'}
              </Button>
              {latestInviteUrl ? (
                <div className="rounded border bg-slate-50 p-3 text-xs">
                  <p className="font-medium text-slate-700">Invite URL</p>
                  <p className="break-all text-slate-600">{latestInviteUrl}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(latestInviteUrl);
                        toast.success('Invite URL copied');
                      } catch {
                        toast.error('Failed to copy invite URL');
                      }
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manager Registration Queue</CardTitle>
              <CardDescription>Pending and approved manager registrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(teamRegistrationsQuery.data || []).map((registration: any) => (
                <div key={registration.id} className="rounded border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{registration.fullName}</p>
                      <p className="text-xs text-slate-500">{registration.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          variant={registration.status === 'approved' ? 'default' : 'secondary'}
                        >
                          {registration.status}
                        </Badge>
                        {registration.status === 'approved' ? (
                          <Badge variant="outline">
                            {registration.approvalSource === 'manager_invite_completion'
                              ? 'self-approved via invite'
                              : registration.approvalSource === 'admin_review'
                                ? 'approved by admin'
                                : 'approval source unknown'}
                          </Badge>
                        ) : null}
                        {registration.status === 'approved' ? (
                          <Badge variant={registration.managerAccessActive ? 'default' : 'outline'}>
                            {registration.managerAccessActive ? 'access active' : 'access revoked'}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {registration.status === 'pending' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              reviewTeamRegistrationMutation.mutate({
                                registrationId: Number(registration.id),
                                decision: 'approved',
                                notes: 'Approved from Distribution Managers queue',
                              })
                            }
                            disabled={reviewTeamRegistrationMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              resendManagerInviteMutation.mutate({
                                registrationId: Number(registration.id),
                              })
                            }
                            disabled={resendManagerInviteMutation.isPending}
                          >
                            Resend Invite
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              reviewTeamRegistrationMutation.mutate({
                                registrationId: Number(registration.id),
                                decision: 'rejected',
                                notes: 'Rejected from Distribution Managers queue',
                              })
                            }
                            disabled={reviewTeamRegistrationMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}

                      {registration.status === 'approved' && registration.userId ? (
                        <Button
                          size="sm"
                          variant={registration.managerAccessActive ? 'destructive' : 'outline'}
                          onClick={() =>
                            setManagerAccessMutation.mutate({
                              userId: Number(registration.userId),
                              active: !registration.managerAccessActive,
                              notes: registration.managerAccessActive
                                ? 'Revoked in Distribution Managers queue'
                                : 'Restored in Distribution Managers queue',
                            })
                          }
                          disabled={setManagerAccessMutation.isPending}
                        >
                          {registration.managerAccessActive ? 'Revoke Access' : 'Restore Access'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!teamRegistrationsQuery.isLoading && !(teamRegistrationsQuery.data || []).length && (
                <p className="text-sm text-slate-500">No manager registrations found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {submoduleSlug === 'agent-network' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Agent Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(tiersQuery.data || []).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Access Grants</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(accessQuery.data || []).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Referrer Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(applicationsQuery.data || []).length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(submoduleSlug === 'deal-pipeline' || submoduleSlug === 'viewing-scheduler') && (
        <Card>
          <CardHeader>
            <CardTitle>Deal Pipeline</CardTitle>
            <CardDescription>Current stage distribution across referral deals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {pipelineStageCounts.map(([stage, count]) => (
                <Badge key={stage} variant="secondary">
                  {stage}: {count}
                </Badge>
              ))}
            </div>
            <div className="space-y-2">
              {(dealsQuery.data || []).slice(0, 30).map((deal: any) => (
                <div key={deal.id} className="rounded border p-3">
                  <p className="font-medium">
                    {deal.developmentName} - {deal.buyerName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Stage: {deal.currentStage} | Commission: {deal.commissionStatus}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {submoduleSlug === 'commission-incentives' && (
        <Card>
          <CardHeader>
            <CardTitle>Commission & Incentives</CardTitle>
            <CardDescription>Commission entries and payout tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(commissionQuery.data || []).slice(0, 40).map((entry: any) => (
              <div key={entry.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {entry.developmentName} - {entry.buyerName || 'Unknown Buyer'}
                  </p>
                  <Badge variant="secondary">{entry.entryStatus}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Commission: {formatMoney(Number(entry.commissionAmount || 0))}
                </p>
              </div>
            ))}
            {!commissionQuery.isLoading && !(commissionQuery.data || []).length && (
              <p className="text-sm text-slate-500">No commission entries found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
