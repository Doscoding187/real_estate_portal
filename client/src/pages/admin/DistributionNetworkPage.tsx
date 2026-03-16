import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  buildDistributionManagerInviteMailtoUrl,
  buildDistributionManagerInviteWhatsappUrl,
} from '../../../../shared/distributionManagerInvite';
import {
  getPartnerDevelopmentSetupDescription,
  getPartnerDevelopmentSetupLabel,
  getPartnerDevelopmentSetupState,
  isDevelopmentBrandLinked,
} from './distributionSetupState';
import { PartnerDevelopmentsBoard } from './DistributionPartnerDevelopmentsBoard';

const DEFAULT_SUBMODULE = 'partner-developments';
type DocumentCategoryKey = 'brochures' | 'floorPlans' | 'videos';
type CommissionType = 'flat' | 'percentage';
type CommissionBasis = 'sale_price' | 'base_price';

function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function openInviteShareWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function DistributionNetworkPage() {
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrandProfileId, setSelectedBrandProfileId] = useState<number | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [latestInviteUrl, setLatestInviteUrl] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [selectedManagerUserId, setSelectedManagerUserId] = useState<number | null>(null);
  const [selectedManagerProgramId, setSelectedManagerProgramId] = useState<number | null>(null);
  const [assignAsPrimary, setAssignAsPrimary] = useState(true);
  const [selectedDocDevelopmentId, setSelectedDocDevelopmentId] = useState<number | null>(null);
  const [selectedCommissionDevelopmentId, setSelectedCommissionDevelopmentId] = useState<number | null>(
    null,
  );
  const [referrerCommissionType, setReferrerCommissionType] = useState<CommissionType>('flat');
  const [referrerCommissionValue, setReferrerCommissionValue] = useState('');
  const [referrerCommissionBasis, setReferrerCommissionBasis] = useState<CommissionBasis>('sale_price');
  const [platformCommissionType, setPlatformCommissionType] = useState<CommissionType>('flat');
  const [platformCommissionValue, setPlatformCommissionValue] = useState('');
  const [platformCommissionBasis, setPlatformCommissionBasis] = useState<CommissionBasis>('sale_price');
  const [programTierAccessPolicy, setProgramTierAccessPolicy] = useState<
    'open' | 'restricted' | 'invite_only'
  >('restricted');
  const [programReferralEnabled, setProgramReferralEnabled] = useState(false);
  const [programIsActive, setProgramIsActive] = useState(true);
  const [docCategory, setDocCategory] = useState<DocumentCategoryKey>('brochures');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');

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

  const distributionQueryStabilityOptions = {
    retry: false as const,
    refetchOnWindowFocus: false as const,
    refetchOnReconnect: false as const,
  };

  const moduleStatusQuery = trpc.distribution.getModuleStatus.useQuery(undefined, {
    ...distributionQueryStabilityOptions,
  });
  const submodulesQuery = trpc.distribution.listSubmodules.useQuery(undefined, {
    ...distributionQueryStabilityOptions,
  });
  const catalogQuery = trpc.distribution.admin.listDevelopmentCatalog.useQuery(
    {
      search,
      brandProfileId: selectedBrandProfileId || undefined,
      includeUnpublished: true,
      onlyBrandProfileLinked: true,
      limit: 300,
    },
    {
      enabled: submoduleSlug === 'partner-developments',
      ...distributionQueryStabilityOptions,
    },
  );
  const dealsQuery = trpc.distribution.admin.listDeals.useQuery(
    { limit: 200 },
    {
      enabled: submoduleSlug === 'deal-pipeline' || submoduleSlug === 'viewing-scheduler',
      ...distributionQueryStabilityOptions,
    },
  );
  const commissionQuery = trpc.distribution.admin.listCommissionEntries.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'commission-incentives', ...distributionQueryStabilityOptions },
  );
  const tiersQuery = trpc.distribution.admin.listAgentTiers.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'agent-network', ...distributionQueryStabilityOptions },
  );
  const accessQuery = trpc.distribution.admin.listAgentAccess.useQuery(
    { limit: 200, includeRevoked: false },
    { enabled: submoduleSlug === 'agent-network', ...distributionQueryStabilityOptions },
  );
  const applicationsQuery = trpc.distribution.admin.listReferrerApplications.useQuery(
    { limit: 200 },
    { enabled: submoduleSlug === 'agent-network', ...distributionQueryStabilityOptions },
  );
  const teamRegistrationsQuery = trpc.distribution.admin.listTeamRegistrations.useQuery(
    { limit: 200, requestedArea: 'distribution_manager' },
    { enabled: submoduleSlug === 'distribution-managers', ...distributionQueryStabilityOptions },
  );
  const brandProfilesQuery = trpc.superAdminPublisher.listBrandProfiles.useQuery(
    {
      search: brandSearch.trim() || undefined,
      limit: 20,
    },
    {
      enabled: submoduleSlug === 'partner-developments',
      ...distributionQueryStabilityOptions,
    },
  );
  const allCatalogQuery = trpc.distribution.admin.listDevelopmentCatalog.useQuery(
    {
      search,
      includeUnpublished: true,
      onlyBrandProfileLinked: false,
      limit: 300,
    },
    {
      enabled: submoduleSlug === 'partner-developments',
      ...distributionQueryStabilityOptions,
    },
  );
  const programsQuery = trpc.distribution.admin.listPrograms.useQuery(undefined, {
    enabled: submoduleSlug === 'partner-developments',
    ...distributionQueryStabilityOptions,
  });
  const managerCandidatesQuery = trpc.distribution.admin.listManagerCandidates.useQuery(
    {
      search: managerSearch.trim() || undefined,
      limit: 50,
    },
    { enabled: submoduleSlug === 'distribution-managers', ...distributionQueryStabilityOptions },
  );
  const managerAssignmentTargetsQuery =
    trpc.distribution.admin.listManagerAssignmentTargets.useQuery(undefined, {
      enabled: submoduleSlug === 'distribution-managers',
      ...distributionQueryStabilityOptions,
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
  const attachDevelopmentToBrandMutation = trpc.brandProfile.adminAttachDevelopment.useMutation({
    onSuccess: () => {
      toast.success('Development linked to brand profile');
      catalogQuery.refetch();
      allCatalogQuery.refetch();
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
  const assignManagerMutation = trpc.distribution.admin.assignManagerToDevelopment.useMutation({
    onSuccess: result => {
      toast.success(
        `Assigned ${result.managerDisplayName || `manager #${result.managerUserId}`} to development #${result.developmentId}`,
      );
      teamRegistrationsQuery.refetch();
      managerAssignmentTargetsQuery.refetch();
    },
    onError: err => toast.error(err.message),
  });
  const developmentDocumentsQuery = trpc.distribution.admin.getDevelopmentDocuments.useQuery(
    { developmentId: selectedDocDevelopmentId || 0 },
    {
      enabled: submoduleSlug === 'partner-developments' && Boolean(selectedDocDevelopmentId),
    },
  );
  const setDevelopmentDocumentsMutation = trpc.distribution.admin.setDevelopmentDocuments.useMutation({
    onSuccess: () => {
      toast.success('Development documents updated');
      developmentDocumentsQuery.refetch();
      catalogQuery.refetch();
      setDocName('');
      setDocUrl('');
    },
    onError: err => toast.error(err.message),
  });
  const upsertProgramMutation = trpc.distribution.admin.upsertProgram.useMutation({
    onSuccess: () => {
      toast.success('Commission configuration saved');
      programsQuery.refetch();
      catalogQuery.refetch();
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
  const commissionTotals = useMemo(() => {
    const rows = (commissionQuery.data || []) as any[];
    let referrerPayout = 0;
    let platformRevenue = 0;
    for (const row of rows) {
      referrerPayout += Number(row.commissionAmount || 0);
      platformRevenue += Number(row.dealPlatformCommissionAmount || 0);
    }
    return {
      referrerPayout,
      platformRevenue,
      margin: platformRevenue - referrerPayout,
    };
  }, [commissionQuery.data]);

  const copyLatestInviteUrl = async () => {
    if (!latestInviteUrl) return;
    try {
      await navigator.clipboard.writeText(latestInviteUrl);
      toast.success('Invite URL copied');
    } catch {
      toast.error('Failed to copy invite URL');
    }
  };

  const shareLatestInviteViaWhatsapp = () => {
    if (!latestInviteUrl) return;
    openInviteShareWindow(buildDistributionManagerInviteWhatsappUrl(latestInviteUrl));
  };

  const shareLatestInviteViaEmail = () => {
    if (!latestInviteUrl) return;
    window.location.href = buildDistributionManagerInviteMailtoUrl(latestInviteUrl);
  };

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
  const allDevelopmentRows = useMemo(() => {
    return (allCatalogQuery.data || []) as any[];
  }, [allCatalogQuery.data]);
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
  const partnerRows = useMemo(
    () => [...activePartnerRows, ...availablePartnerRows],
    [activePartnerRows, availablePartnerRows],
  );
  const unlinkedDevelopmentRows = useMemo(() => {
    return allDevelopmentRows.filter(row => !isDevelopmentBrandLinked(row));
  }, [allDevelopmentRows]);
  const partnerDevelopmentErrorMessages = useMemo(() => {
    return Array.from(
      new Set(
        [catalogQuery.error, allCatalogQuery.error, programsQuery.error]
          .map(error => error?.message?.trim())
          .filter((message): message is string => Boolean(message)),
      ),
    );
  }, [allCatalogQuery.error, catalogQuery.error, programsQuery.error]);
  const managerErrorMessages = useMemo(() => {
    return Array.from(
      new Set(
        [
          teamRegistrationsQuery.error,
          managerCandidatesQuery.error,
          managerAssignmentTargetsQuery.error,
        ]
          .map(error => error?.message?.trim())
          .filter((message): message is string => Boolean(message)),
      ),
    );
  }, [
    managerAssignmentTargetsQuery.error,
    managerCandidatesQuery.error,
    teamRegistrationsQuery.error,
  ]);
  const selectedDocDevelopment = useMemo(
    () =>
      partnerRows.find(
        row => Number(row.developmentId) === Number(selectedDocDevelopmentId),
      ) || null,
    [partnerRows, selectedDocDevelopmentId],
  );
  const selectedCommissionDevelopment = useMemo(
    () =>
      partnerRows.find(
        row => Number(row.developmentId) === Number(selectedCommissionDevelopmentId),
      ) || null,
    [partnerRows, selectedCommissionDevelopmentId],
  );

  useEffect(() => {
    if (submoduleSlug !== 'partner-developments') return;
    if (!partnerRows.length) {
      if (selectedDocDevelopmentId) setSelectedDocDevelopmentId(null);
      if (selectedCommissionDevelopmentId) setSelectedCommissionDevelopmentId(null);
      return;
    }
    const exists = partnerRows.some(
      row => Number(row.developmentId) === Number(selectedDocDevelopmentId),
    );
    if (!selectedDocDevelopmentId || !exists) {
      setSelectedDocDevelopmentId(Number(partnerRows[0].developmentId));
    }
    const commissionExists = partnerRows.some(
      row => Number(row.developmentId) === Number(selectedCommissionDevelopmentId),
    );
    if (!selectedCommissionDevelopmentId || !commissionExists) {
      setSelectedCommissionDevelopmentId(Number(partnerRows[0].developmentId));
    }
  }, [partnerRows, selectedCommissionDevelopmentId, selectedDocDevelopmentId, submoduleSlug]);

  useEffect(() => {
    if (!selectedCommissionDevelopment) return;
    const program =
      (selectedCommissionDevelopment as any).program ||
      programByDevelopmentId.get(Number(selectedCommissionDevelopment.developmentId)) ||
      null;

    const referrerTrack = (program?.referrerCommission || null) as
      | { type?: CommissionType; value?: number | null; basis?: CommissionBasis | null }
      | null;
    const platformTrack = (program?.platformCommission || null) as
      | { type?: CommissionType; value?: number | null; basis?: CommissionBasis | null }
      | null;

    const fallbackReferrerType: CommissionType =
      String(program?.commissionModel || '').includes('percentage') ? 'percentage' : 'flat';
    const fallbackReferrerValue =
      fallbackReferrerType === 'percentage'
        ? Number(program?.defaultCommissionPercent || 0)
        : Number(program?.defaultCommissionAmount || 0);

    const nextReferrerType = (referrerTrack?.type || fallbackReferrerType || 'flat') as CommissionType;
    const nextReferrerValue =
      Number(referrerTrack?.value ?? fallbackReferrerValue ?? 0) > 0
        ? Number(referrerTrack?.value ?? fallbackReferrerValue ?? 0)
        : 0;
    const nextReferrerBasis = (referrerTrack?.basis || 'sale_price') as CommissionBasis;

    const nextPlatformType = (platformTrack?.type || nextReferrerType || 'flat') as CommissionType;
    const nextPlatformValue =
      Number(platformTrack?.value ?? nextReferrerValue ?? 0) > 0
        ? Number(platformTrack?.value ?? nextReferrerValue ?? 0)
        : 0;
    const nextPlatformBasis = (platformTrack?.basis || nextReferrerBasis || 'sale_price') as CommissionBasis;

    setReferrerCommissionType(nextReferrerType);
    setReferrerCommissionValue(String(nextReferrerValue || ''));
    setReferrerCommissionBasis(nextReferrerBasis);
    setPlatformCommissionType(nextPlatformType);
    setPlatformCommissionValue(String(nextPlatformValue || ''));
    setPlatformCommissionBasis(nextPlatformBasis);
    setProgramTierAccessPolicy(
      ((program?.tierAccessPolicy as 'open' | 'restricted' | 'invite_only') || 'restricted'),
    );
    setProgramReferralEnabled(Boolean(program?.isReferralEnabled));
    setProgramIsActive(program?.isActive === undefined ? true : Boolean(program?.isActive));
  }, [programByDevelopmentId, selectedCommissionDevelopment]);

  useEffect(() => {
    if (submoduleSlug !== 'distribution-managers') return;
    if (!selectedManagerUserId && (managerCandidatesQuery.data || []).length) {
      setSelectedManagerUserId(Number((managerCandidatesQuery.data || [])[0].id));
    }
    if (!selectedManagerProgramId && (managerAssignmentTargetsQuery.data || []).length) {
      setSelectedManagerProgramId(
        Number((managerAssignmentTargetsQuery.data || [])[0].programId),
      );
    }
  }, [
    managerAssignmentTargetsQuery.data,
    managerCandidatesQuery.data,
    selectedManagerProgramId,
    selectedManagerUserId,
    submoduleSlug,
  ]);

  const applyDocumentCategoryUpdate = (
    category: DocumentCategoryKey,
    nextRows: Array<{ name?: string | null; url: string }>,
  ) => {
    if (!selectedDocDevelopmentId) {
      toast.error('Select a development first');
      return;
    }
    const payload: any = {
      developmentId: selectedDocDevelopmentId,
    };
    payload[category] = nextRows;
    setDevelopmentDocumentsMutation.mutate(payload);
  };

  const handleAddDocument = () => {
    if (!selectedDocDevelopmentId) {
      toast.error('Select a development first');
      return;
    }
    const url = docUrl.trim();
    if (!url) {
      toast.error('Document URL is required');
      return;
    }

    const current = developmentDocumentsQuery.data;
    if (!current) {
      toast.error('Load a development document bank first');
      return;
    }

    const currentRows = (current[docCategory] || []) as Array<{ name?: string | null; url: string }>;
    const nextRows = [
      ...currentRows,
      {
        name: docName.trim() || null,
        url,
      },
    ];
    applyDocumentCategoryUpdate(docCategory, nextRows);
  };

  const handleRemoveDocument = (category: DocumentCategoryKey, index: number) => {
    const current = developmentDocumentsQuery.data;
    if (!current) return;
    const rows = ((current[category] || []) as Array<{ name?: string | null; url: string }>).filter(
      (_row, rowIndex) => rowIndex !== index,
    );
    applyDocumentCategoryUpdate(category, rows);
  };

  const handleSaveCommissionConfig = async () => {
    if (!selectedCommissionDevelopment) {
      toast.error('Select a development first');
      return;
    }

    const developmentId = Number(selectedCommissionDevelopment.developmentId);
    const referrerValue = Math.max(0, Number(referrerCommissionValue || 0));
    const platformValue = Math.max(0, Number(platformCommissionValue || 0));

    if (referrerValue <= 0) {
      toast.error('Referrer commission value must be greater than zero');
      return;
    }

    try {
      const existingProgramId = Number(
        (selectedCommissionDevelopment as any)?.program?.id ||
          programByDevelopmentId.get(developmentId)?.id ||
          0,
      );
      if (!existingProgramId) {
        await ensureProgramMutation.mutateAsync({ developmentId });
      }

      await upsertProgramMutation.mutateAsync({
        developmentId,
        isReferralEnabled: programReferralEnabled,
        isActive: programIsActive,
        tierAccessPolicy: programTierAccessPolicy,
        commissionModel: referrerCommissionType === 'percentage' ? 'flat_percentage' : 'fixed_amount',
        defaultCommissionPercent: referrerCommissionType === 'percentage' ? referrerValue : null,
        defaultCommissionAmount:
          referrerCommissionType === 'flat' ? Math.round(referrerValue) : null,
        referrerCommissionType,
        referrerCommissionValue: referrerValue,
        referrerCommissionBasis:
          referrerCommissionType === 'percentage' ? referrerCommissionBasis : null,
        platformCommissionType,
        platformCommissionValue: platformValue,
        platformCommissionBasis:
          platformCommissionType === 'percentage' ? platformCommissionBasis : null,
      });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save commission configuration');
    }
  };

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

      {submoduleSlug === 'partner-developments' && <PartnerDevelopmentsBoard />}

      {submoduleSlug === 'partner-developments' && false && (
        <Card>
          <CardHeader>
            <CardTitle>Partner Developments</CardTitle>
            <CardDescription>
              Developments that can be configured into the referral program.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-800">Setup Path</p>
              <p className="mt-1 text-sm text-slate-600">
                Create or select a brand profile, link a development to that brand, then add it to
                Partner Developments.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setLocation('/admin/publisher')}>
                  Open Publisher Brand Manager
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLocation('/admin/publisher/create-development')}
                >
                  Create Development
                </Button>
              </div>
            </div>
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
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            {partnerDevelopmentErrorMessages.length ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Partner Developments is blocked</p>
                {partnerDevelopmentErrorMessages.map(message => (
                  <p key={message} className="mt-1">
                    {message}
                  </p>
                ))}
              </div>
            ) : null}
            {catalogQuery.isLoading || allCatalogQuery.isLoading ? (
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
                            <Badge variant="default">
                              {getPartnerDevelopmentSetupLabel(
                                getPartnerDevelopmentSetupState(row, programByDevelopmentId),
                              )}
                            </Badge>
                            {row.brandProfileName ? (
                              <Badge variant="outline">Brand: {row.brandProfileName}</Badge>
                            ) : null}
                            <Badge variant="outline">
                              {formatMoney(row.priceFrom)} - {formatMoney(row.priceTo)}
                            </Badge>
                            <Badge variant="outline">
                              Docs: {Number(row.documentCounts?.total || 0)}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDocDevelopmentId(Number(row.developmentId))}
                            >
                              Manage Documents
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-500">
                          {getPartnerDevelopmentSetupDescription(
                            getPartnerDevelopmentSetupState(row, programByDevelopmentId),
                          )}
                        </p>
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
                            <Badge variant="secondary">
                              {getPartnerDevelopmentSetupLabel(
                                getPartnerDevelopmentSetupState(row, programByDevelopmentId),
                              )}
                            </Badge>
                            {row.brandProfileName ? (
                              <Badge variant="outline">Brand: {row.brandProfileName}</Badge>
                            ) : null}
                            <Badge variant="outline">
                              {formatMoney(row.priceFrom)} - {formatMoney(row.priceTo)}
                            </Badge>
                            <Badge variant="outline">
                              Docs: {Number(row.documentCounts?.total || 0)}
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDocDevelopmentId(Number(row.developmentId))}
                            >
                              Manage Documents
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-500">
                          {getPartnerDevelopmentSetupDescription(
                            getPartnerDevelopmentSetupState(row, programByDevelopmentId),
                          )}
                        </p>
                      </div>
                    ))}
                    {!availablePartnerRows.length && (
                      <p className="text-sm text-slate-500">
                        All brand-profile developments are already added to partner developments.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Needs Brand Link ({unlinkedDevelopmentRows.length})
                  </p>
                  <div className="space-y-2">
                    {unlinkedDevelopmentRows.map((row: any) => (
                      <div key={row.developmentId} className="rounded border p-3">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <div>
                            <p className="font-semibold">{row.developmentName}</p>
                            <p className="text-xs text-slate-500">
                              {row.city}, {row.province}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Badge variant="destructive">
                              {getPartnerDevelopmentSetupLabel(
                                getPartnerDevelopmentSetupState(row, programByDevelopmentId),
                              )}
                            </Badge>
                            <Badge variant="outline">
                              {formatMoney(row.priceFrom)} - {formatMoney(row.priceTo)}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                selectedBrandProfileId
                                  ? attachDevelopmentToBrandMutation.mutate({
                                      developmentId: Number(row.developmentId),
                                      brandProfileId: selectedBrandProfileId,
                                    })
                                  : undefined
                              }
                              disabled={
                                !selectedBrandProfileId || attachDevelopmentToBrandMutation.isPending
                              }
                            >
                              {selectedBrandProfileId
                                ? `Link to ${selectedBrandName || 'Selected Brand'}`
                                : 'Select Brand to Link'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation('/admin/publisher')}
                            >
                              Manage Brand Profiles
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-center text-xs text-slate-500">
                          {selectedBrandProfileId
                            ? `This development will be linked to ${selectedBrandName} before it can be added to Partner Developments.`
                            : getPartnerDevelopmentSetupDescription(
                                getPartnerDevelopmentSetupState(row, programByDevelopmentId),
                              )}
                        </p>
                      </div>
                    ))}
                    {!unlinkedDevelopmentRows.length && (
                      <p className="text-sm text-slate-500">
                        No unlinked developments found for current search.
                      </p>
                    )}
                  </div>
                </div>

                {!brandProfileDevelopmentRows.length && (
                  <p className="text-sm text-slate-500">
                    No brand-profile developments found for current search.
                  </p>
                )}

                {!!partnerRows.length && (
                  <div className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Development Document Bank</p>
                        <p className="text-xs text-slate-500">
                          Add brochures, floor plans, and videos per development.
                        </p>
                      </div>
                      <select
                        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        value={selectedDocDevelopmentId ? String(selectedDocDevelopmentId) : ''}
                        onChange={e => setSelectedDocDevelopmentId(Number(e.target.value))}
                      >
                        {partnerRows.map((row: any) => (
                          <option key={row.developmentId} value={String(row.developmentId)}>
                            {row.developmentName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-[180px_220px_1fr_auto]">
                      <select
                        className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                        value={docCategory}
                        onChange={e => setDocCategory(e.target.value as DocumentCategoryKey)}
                      >
                        <option value="brochures">Brochure</option>
                        <option value="floorPlans">Floor Plan</option>
                        <option value="videos">Video</option>
                      </select>
                      <Input
                        placeholder="Document name (optional)"
                        value={docName}
                        onChange={e => setDocName(e.target.value)}
                      />
                      <Input
                        placeholder="https://... or /file-path"
                        value={docUrl}
                        onChange={e => setDocUrl(e.target.value)}
                      />
                      <Button
                        onClick={handleAddDocument}
                        disabled={setDevelopmentDocumentsMutation.isPending || developmentDocumentsQuery.isLoading}
                      >
                        Add
                      </Button>
                    </div>

                    {selectedDocDevelopment ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Selected: {selectedDocDevelopment.developmentName}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        { key: 'brochures' as const, label: 'Brochures' },
                        { key: 'floorPlans' as const, label: 'Floor Plans' },
                        { key: 'videos' as const, label: 'Videos' },
                      ].map(group => {
                        const rows = ((developmentDocumentsQuery.data as any)?.[group.key] || []) as Array<{
                          name?: string | null;
                          url: string;
                        }>;
                        return (
                          <div key={group.key} className="rounded border p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-800">{group.label}</p>
                              <Badge variant="outline">{rows.length}</Badge>
                            </div>
                            <div className="space-y-2">
                              {rows.map((row, index) => (
                                <div key={`${group.key}-${index}`} className="rounded border bg-slate-50 p-2">
                                  <p className="truncate text-xs font-medium text-slate-800">
                                    {row.name || row.url}
                                  </p>
                                  <p className="truncate text-[11px] text-slate-500">{row.url}</p>
                                  <div className="mt-1 flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                                    >
                                      Open
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRemoveDocument(group.key, index)}
                                      disabled={setDevelopmentDocumentsMutation.isPending}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {!rows.length && (
                                <p className="text-xs text-slate-500">No documents yet.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!!partnerRows.length && (
                  <div className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Commission Configuration
                        </p>
                        <p className="text-xs text-slate-500">
                          Public referrer payout and private platform revenue per development.
                        </p>
                      </div>
                      <select
                        className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        value={selectedCommissionDevelopmentId ? String(selectedCommissionDevelopmentId) : ''}
                        onChange={e => setSelectedCommissionDevelopmentId(Number(e.target.value))}
                      >
                        {partnerRows.map((row: any) => (
                          <option key={row.developmentId} value={String(row.developmentId)}>
                            {row.developmentName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedCommissionDevelopment ? (
                      <div className="mt-3 space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={programReferralEnabled}
                              onChange={e => setProgramReferralEnabled(e.target.checked)}
                            />
                            Referral Enabled
                          </label>
                          <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={programIsActive}
                              onChange={e => setProgramIsActive(e.target.checked)}
                            />
                            Program Active
                          </label>
                          <select
                            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                            value={programTierAccessPolicy}
                            onChange={e =>
                              setProgramTierAccessPolicy(
                                e.target.value as 'open' | 'restricted' | 'invite_only',
                              )
                            }
                          >
                            <option value="restricted">Tier Policy: Restricted</option>
                            <option value="open">Tier Policy: Open</option>
                            <option value="invite_only">Tier Policy: Invite Only</option>
                          </select>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded border bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-800">
                              Referrer Payout (Visible)
                            </p>
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                              <select
                                className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                                value={referrerCommissionType}
                                onChange={e =>
                                  setReferrerCommissionType(e.target.value as CommissionType)
                                }
                              >
                                <option value="flat">Flat</option>
                                <option value="percentage">Percentage</option>
                              </select>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={referrerCommissionValue}
                                onChange={e => setReferrerCommissionValue(e.target.value)}
                                placeholder="Value"
                              />
                              <select
                                className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                                value={referrerCommissionBasis}
                                onChange={e =>
                                  setReferrerCommissionBasis(e.target.value as CommissionBasis)
                                }
                                disabled={referrerCommissionType !== 'percentage'}
                              >
                                <option value="sale_price">Sale Price</option>
                                <option value="base_price">Base Price</option>
                              </select>
                            </div>
                          </div>

                          <div className="rounded border bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-800">
                              Platform Revenue (Super Admin Only)
                            </p>
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                              <select
                                className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                                value={platformCommissionType}
                                onChange={e =>
                                  setPlatformCommissionType(e.target.value as CommissionType)
                                }
                              >
                                <option value="flat">Flat</option>
                                <option value="percentage">Percentage</option>
                              </select>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={platformCommissionValue}
                                onChange={e => setPlatformCommissionValue(e.target.value)}
                                placeholder="Value"
                              />
                              <select
                                className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                                value={platformCommissionBasis}
                                onChange={e =>
                                  setPlatformCommissionBasis(e.target.value as CommissionBasis)
                                }
                                disabled={platformCommissionType !== 'percentage'}
                              >
                                <option value="sale_price">Sale Price</option>
                                <option value="base_price">Base Price</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">
                            Development: {selectedCommissionDevelopment.developmentName}
                          </p>
                          <Button
                            onClick={handleSaveCommissionConfig}
                            disabled={
                              upsertProgramMutation.isPending || ensureProgramMutation.isPending
                            }
                          >
                            Save Commission Config
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {submoduleSlug === 'distribution-managers' && (
        <div className="space-y-4">
          {managerErrorMessages.length ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Distribution manager setup is blocked</p>
              {managerErrorMessages.map(message => (
                <p key={message} className="mt-1">
                  {message}
                </p>
              ))}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
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
              <p className="text-xs text-slate-500">
                Invite completion auto-approves manager identity. Next step is assigning at least one
                development program.
              </p>
              {latestInviteUrl ? (
                <div className="rounded border bg-slate-50 p-3 text-xs">
                  <p className="font-medium text-slate-700">Invite URL</p>
                  <p className="break-all text-slate-600">{latestInviteUrl}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={copyLatestInviteUrl}>
                      Copy Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareLatestInviteViaWhatsapp}>
                      Share via WhatsApp
                    </Button>
                    <Button variant="outline" size="sm" onClick={shareLatestInviteViaEmail}>
                      Share via Email
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assign Manager to Development</CardTitle>
              <CardDescription>
                Link an active manager identity to a development program for dashboard access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search manager by name or email"
                value={managerSearch}
                onChange={e => setManagerSearch(e.target.value)}
              />
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Manager</p>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedManagerUserId ? String(selectedManagerUserId) : ''}
                  onChange={e => setSelectedManagerUserId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Select manager</option>
                  {(managerCandidatesQuery.data || []).map((manager: any) => (
                    <option key={manager.id} value={String(manager.id)}>
                      {manager.displayName || manager.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Development Program</p>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedManagerProgramId ? String(selectedManagerProgramId) : ''}
                  onChange={e =>
                    setSelectedManagerProgramId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Select development program</option>
                  {(managerAssignmentTargetsQuery.data || []).map((target: any) => (
                    <option key={target.programId} value={String(target.programId)}>
                      {target.developmentName}
                      {target.city ? `, ${target.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={assignAsPrimary}
                  onChange={e => setAssignAsPrimary(e.target.checked)}
                />
                Set as primary manager assignment
              </label>
              <Button
                onClick={() => {
                  if (!selectedManagerUserId || !selectedManagerProgramId) {
                    toast.error('Select both a manager and a development program.');
                    return;
                  }
                  assignManagerMutation.mutate({
                    managerUserId: selectedManagerUserId,
                    programId: selectedManagerProgramId,
                    isPrimary: assignAsPrimary,
                    isActive: true,
                  });
                }}
                disabled={
                  assignManagerMutation.isPending ||
                  !selectedManagerUserId ||
                  !selectedManagerProgramId
                }
              >
                {assignManagerMutation.isPending ? 'Assigning...' : 'Assign Manager'}
              </Button>
              {managerCandidatesQuery.error ? (
                <p className="text-xs text-red-600">{managerCandidatesQuery.error.message}</p>
              ) : null}
              {managerAssignmentTargetsQuery.error ? (
                <p className="text-xs text-red-600">{managerAssignmentTargetsQuery.error.message}</p>
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
            <CardDescription>
              Referrer payouts and private platform revenue tracking (super admin only).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2 pb-2">
              <Badge variant="outline">
                Referrer Payout: {formatMoney(commissionTotals.referrerPayout)}
              </Badge>
              <Badge variant="outline">
                Platform Revenue: {formatMoney(commissionTotals.platformRevenue)}
              </Badge>
              <Badge variant="outline">Margin: {formatMoney(commissionTotals.margin)}</Badge>
            </div>
            {(commissionQuery.data || []).slice(0, 40).map((entry: any) => (
              <div key={entry.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {entry.developmentName} - {entry.buyerName || 'Unknown Buyer'}
                  </p>
                  <Badge variant="secondary">{entry.entryStatus}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Referrer payout: {formatMoney(Number(entry.commissionAmount || 0))}
                </p>
                <p className="text-xs text-slate-500">
                  Platform revenue: {formatMoney(Number(entry.dealPlatformCommissionAmount || 0))}
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
