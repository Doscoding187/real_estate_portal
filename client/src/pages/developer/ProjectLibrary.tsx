import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowUpRight,
  Building2,
  ExternalLink,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Share2,
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type AssetCategory = 'document' | 'plan' | 'photo' | 'video';
type AssetFilter = 'all' | AssetCategory;
type PortfolioView = 'active' | 'history' | 'all';

const PORTFOLIO_VIEWS: Array<{ value: PortfolioView; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'history', label: 'Sold-out history' },
  { value: 'all', label: 'All developments' },
];

type LibraryAsset = {
  id: string;
  name: string;
  href: string | null;
  category: AssetCategory;
  size: number | null;
  uploadedAt: string | null;
};

type SalesResource = {
  id: number;
  documentLabel: string;
  fileUrl: string | null;
  fileName: string | null;
  sortOrder: number;
  recordActive: boolean;
  isActive: boolean;
  privateCopy: boolean;
  downloadable: boolean;
  sharedAt: string | null;
};

type MediaRecord = Record<string, unknown>;

const FILTERS: Array<{ value: AssetFilter; label: string }> = [
  { value: 'all', label: 'All assets' },
  { value: 'document', label: 'Documents' },
  { value: 'plan', label: 'Plans' },
  { value: 'photo', label: 'Photos' },
  { value: 'video', label: 'Videos' },
];

function isRecord(value: unknown): value is MediaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    return parsed ? [parsed] : [];
  } catch {
    return /^(https?:\/\/|\/[^/])/.test(value.trim()) ? [value.trim()] : [];
  }
}

function safeAssetHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  return null;
}

function comparableAssetHref(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('/')) return value;
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}

async function fileAsBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function displayName(value: unknown, href: string | null, category: AssetCategory, index: number) {
  if (isRecord(value)) {
    for (const key of ['fileName', 'filename', 'name', 'title']) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
  }

  if (href) {
    try {
      const pathname = new URL(href, 'https://property-listify.invalid').pathname;
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment) return decodeURIComponent(lastSegment);
    } catch {
      // Fall through to a neutral label when a legacy URL is malformed.
    }
  }

  const label = FILTERS.find(filter => filter.value === category)?.label ?? 'Asset';
  return `${label.replace(/s$/, '')} ${index + 1}`;
}

function toAssets(values: unknown, category: AssetCategory, prefix: string): LibraryAsset[] {
  return parseCollection(values).map((value, index) => {
    const record = isRecord(value) ? value : null;
    const href = safeAssetHref(
      typeof value === 'string'
        ? value
        : (record?.url ?? record?.fileUrl ?? record?.processedUrl ?? record?.originalUrl),
    );
    const sizeValue = record?.fileSize ?? record?.fileSizeBytes;
    const size = Number(sizeValue);
    const uploadedAtValue = record?.uploadedAt ?? record?.createdAt;

    return {
      id: String(
        record?.id ??
          record?.storageKey ??
          record?.key ??
          `${prefix}-${index}-${href ?? 'unlinked'}`,
      ),
      name: displayName(value, href, category, index),
      href,
      category,
      size: Number.isFinite(size) && size > 0 ? size : null,
      uploadedAt:
        typeof uploadedAtValue === 'string' || uploadedAtValue instanceof Date
          ? String(uploadedAtValue)
          : null,
    };
  });
}

function parseRecord(value: unknown): MediaRecord | null {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

function resourceStatusLabel(resource: SalesResource) {
  if (!resource.recordActive) return 'Inactive';
  if (resource.isActive && resource.downloadable) return 'Shared · private download';
  if (resource.isActive) return 'Legacy link · download disabled';
  return resource.privateCopy ? 'Private copy · not shared' : 'Legacy link · not shared';
}

function marketStatusLabel(value: unknown): string | null {
  if (value === 'launching-soon') return 'Launching soon';
  if (value === 'selling') return 'Selling';
  if (value === 'sold-out') return 'Sold out';
  return null;
}

function transactionTypeLabel(value: unknown): string | null {
  if (value === 'for_sale') return 'For sale';
  if (value === 'for_rent') return 'For rent';
  if (value === 'auction') return 'Auction';
  if (value === 'mixed') return 'For sale and rent';
  return null;
}

function categoryIcon(category: AssetCategory) {
  if (category === 'photo') return ImageIcon;
  if (category === 'video') return Film;
  return FileText;
}

function collectAssets(development: unknown): LibraryAsset[] {
  if (!isRecord(development)) return [];
  const media = isRecord(development.media) ? development.media : {};
  const items = [
    ...toAssets(media.brochures ?? development.brochures, 'document', 'document'),
    ...toAssets(development.floorPlans, 'plan', 'development-plan'),
    ...toAssets(media.photos ?? development.images, 'photo', 'photo'),
    ...toAssets(media.videos ?? development.videos, 'video', 'video'),
  ];

  const unitTypes = Array.isArray(development.unitTypes) ? development.unitTypes : [];
  unitTypes.forEach((unitType, unitIndex) => {
    if (!isRecord(unitType)) return;
    const baseMedia = parseRecord(unitType.baseMedia);
    if (!baseMedia) return;
    const unitLabel =
      (typeof unitType.name === 'string' && unitType.name.trim()) || `Unit type ${unitIndex + 1}`;
    toAssets(baseMedia.floorPlans, 'plan', `unit-plan-${unitIndex}`).forEach(asset => {
      items.push({ ...asset, name: `${unitLabel} · ${asset.name}` });
    });
  });

  return items;
}

function LoadingState() {
  return (
    <Card aria-label="Loading project library" role="status">
      <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-600">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading project files…
      </CardContent>
    </Card>
  );
}

export default function ProjectLibrary() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { context: publisherContext } = usePublisherContext();
  const isSuperAdmin = user?.role === 'super_admin';
  const hasPublisherContext = Boolean(publisherContext?.cataloguePublisherId);
  const isPublisherRead = isSuperAdmin && hasPublisherContext;

  const developmentsQuery = trpc.developer.getDevelopments.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const developments = useMemo(() => developmentsQuery.data ?? [], [developmentsQuery.data]);
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState<number | null>(null);
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('active');
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [assetSearch, setAssetSearch] = useState('');
  const [shareAsset, setShareAsset] = useState<LibraryAsset | null>(null);
  const [shareLabel, setShareLabel] = useState('');
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [shareReason, setShareReason] = useState('');
  const [unshareResource, setUnshareResource] = useState<SalesResource | null>(null);
  const [unshareReason, setUnshareReason] = useState('');
  const [reshareResource, setReshareResource] = useState<SalesResource | null>(null);
  const [reshareReason, setReshareReason] = useState('');
  const visibleDevelopments = useMemo(
    () =>
      developments.filter(development => {
        if (portfolioView === 'history') return development.status === 'sold-out';
        if (portfolioView === 'active') return development.status !== 'sold-out';
        return true;
      }),
    [developments, portfolioView],
  );
  const activeSelectionId = visibleDevelopments.some(
    development => development.id === selectedDevelopmentId,
  )
    ? selectedDevelopmentId
    : (visibleDevelopments[0]?.id ?? null);

  useEffect(() => {
    if (visibleDevelopments.length === 0) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!visibleDevelopments.some(development => development.id === selectedDevelopmentId)) {
      setSelectedDevelopmentId(visibleDevelopments[0].id);
    }
  }, [selectedDevelopmentId, visibleDevelopments]);

  const developerDevelopmentQuery = trpc.developer.getDevelopment.useQuery(
    { id: activeSelectionId ?? 0 },
    {
      enabled: activeSelectionId !== null && !isSuperAdmin,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const publisherDevelopmentQuery = trpc.superAdminPublisher.getDevelopmentById.useQuery(
    {
      cataloguePublisherId: publisherContext?.cataloguePublisherId ?? -1,
      developmentId: activeSelectionId ?? -1,
    },
    {
      enabled: activeSelectionId !== null && isPublisherRead,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const salesResourcesQuery = trpc.developer.getDevelopmentSalesResources.useQuery(
    { developmentId: activeSelectionId ?? 0 },
    {
      enabled: activeSelectionId !== null && !isSuperAdmin,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const salesResources = (salesResourcesQuery.data?.resources ?? []) as SalesResource[];
  const canManageSalesResources = Boolean(salesResourcesQuery.data?.canManage);
  const uploadSalesResourceMutation = trpc.developer.uploadDevelopmentSalesResource.useMutation({
    onSuccess: async () => {
      toast.success('Private resource uploaded and shared with partner teams.');
      setShareAsset(null);
      setShareReason('');
      setShareFile(null);
      await salesResourcesQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Could not upload the private resource.'),
  });
  const setSalesResourceSharingMutation = trpc.developer.setDevelopmentSalesResourceSharing.useMutation({
    onSuccess: async () => {
      toast.success('Partner resource access updated.');
      setUnshareResource(null);
      setUnshareReason('');
      setReshareResource(null);
      setReshareReason('');
      await salesResourcesQuery.refetch();
    },
    onError: error => toast.error(error.message || 'Could not update resource access.'),
  });

  const queriedDevelopment = isPublisherRead
    ? publisherDevelopmentQuery.data
    : developerDevelopmentQuery.data;
  const detailQuery = isPublisherRead ? publisherDevelopmentQuery : developerDevelopmentQuery;
  const selectedSummary = visibleDevelopments.find(
    development => development.id === activeSelectionId,
  );
  const selectedDevelopment =
    selectedSummary &&
    isRecord(queriedDevelopment) &&
    Number(queriedDevelopment.id) === selectedSummary.id
      ? queriedDevelopment
      : null;
  const assets = useMemo(() => collectAssets(selectedDevelopment), [selectedDevelopment]);
  const visibleAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    return assets.filter(asset => {
      if (filter !== 'all' && asset.category !== filter) return false;
      if (!query) return true;
      return `${asset.name} ${asset.category}`.toLowerCase().includes(query);
    });
  }, [assetSearch, assets, filter]);
  const editHref = activeSelectionId
    ? `/developer/create-development?id=${activeSelectionId}`
    : '/developer/create-development';

  const submitShare = () => {
    if (!activeSelectionId || !shareAsset || !shareFile) {
      toast.error('Choose the approved file copy to upload.');
      return;
    }
    if (shareLabel.trim().length < 2 || shareLabel.trim().length > 160) {
      toast.error('Enter a resource name between 2 and 160 characters.');
      return;
    }
    if (shareFile.size > 9 * 1024 * 1024) {
      toast.error('Private partner resources must be 9 MB or smaller.');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(shareFile.type)) {
      toast.error('Choose a PDF, JPEG, PNG, or WebP file.');
      return;
    }
    if (shareReason.trim().length < 10 || shareReason.trim().length > 500) {
      toast.error('Explain why this file is being shared with partners.');
      return;
    }
    void fileAsBase64(shareFile)
      .then(fileContentBase64 =>
        uploadSalesResourceMutation.mutate({
          developmentId: activeSelectionId,
          documentLabel: shareLabel.trim(),
          fileName: shareFile.name,
          mimeType: shareFile.type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp',
          fileContentBase64,
          reason: shareReason.trim(),
        }),
      )
      .catch(error => toast.error(error instanceof Error ? error.message : 'Could not read the selected file.'));
  };

  const submitUnshare = () => {
    if (!activeSelectionId || !unshareResource) return;
    if (unshareReason.trim().length < 10 || unshareReason.trim().length > 500) {
      toast.error('Explain why this file is being removed from partner workspaces.');
      return;
    }
    setSalesResourceSharingMutation.mutate({
      developmentId: activeSelectionId,
      resourceId: unshareResource.id,
      shared: false,
      reason: unshareReason.trim(),
    });
  };

  const submitReshare = () => {
    if (!activeSelectionId || !reshareResource) return;
    if (reshareReason.trim().length < 10 || reshareReason.trim().length > 500) {
      toast.error('Explain why this file is being shared with partners.');
      return;
    }
    setSalesResourceSharingMutation.mutate({
      developmentId: activeSelectionId,
      resourceId: reshareResource.id,
      shared: true,
      reason: reshareReason.trim(),
    });
  };

  if (developmentsQuery.isLoading) return <LoadingState />;

  if (developmentsQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <h1 className="text-lg font-semibold text-slate-900">Project library unavailable</h1>
          <p className="text-sm text-slate-600">
            We couldn’t load the developments in this workspace. No files were changed.
          </p>
          <Button variant="outline" onClick={() => developmentsQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (developments.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Workspace files
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Project library</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Building2 className="h-9 w-9 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Create a development first</h2>
            <p className="max-w-md text-sm text-slate-600">
              Brochures, plans, photos and videos will appear here after they’re attached to a
              development.
            </p>
            <Button onClick={() => setLocation('/developer/create-development')}>
              Create development <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (visibleDevelopments.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Workspace files
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Project library</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Find the media attached to each development and jump to its editor to manage files.
          </p>
        </header>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Development portfolio view">
          {PORTFOLIO_VIEWS.map(view => (
            <Button
              key={view.value}
              type="button"
              size="sm"
              variant={portfolioView === view.value ? 'default' : 'outline'}
              aria-pressed={portfolioView === view.value}
              onClick={() => {
                setPortfolioView(view.value);
                setFilter('all');
                setAssetSearch('');
              }}
            >
              {view.label}
            </Button>
          ))}
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-3 font-semibold text-slate-900">
              {portfolioView === 'history'
                ? 'No sold-out developments in this portfolio'
                : 'No current developments in this portfolio'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {portfolioView === 'active'
                ? 'Sold-out development files remain available under Sold-out history.'
                : 'Choose another portfolio view to find its attached files.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedDevelopmentId === null || detailQuery.isLoading) return <LoadingState />;

  if (detailQuery.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <h1 className="text-lg font-semibold text-slate-900">Couldn’t load project files</h1>
          <p className="text-sm text-slate-600">
            The selected development could not be opened in this workspace. No files were changed.
          </p>
          <Button variant="outline" onClick={() => detailQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!selectedDevelopment) return <LoadingState />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Workspace files
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Project library</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Find the media attached to each development and jump to its editor to manage files.
          </p>
        </div>
        <Button onClick={() => setLocation(editHref)}>
          Manage project files <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Development portfolio view"
      >
        <span className="mr-1 text-sm font-medium text-slate-700">Portfolio</span>
        {PORTFOLIO_VIEWS.map(view => {
          const count = developments.filter(development => {
            if (view.value === 'history') return development.status === 'sold-out';
            if (view.value === 'active') return development.status !== 'sold-out';
            return true;
          }).length;
          return (
            <Button
              key={view.value}
              type="button"
              size="sm"
              variant={portfolioView === view.value ? 'default' : 'outline'}
              aria-pressed={portfolioView === view.value}
              onClick={() => {
                setPortfolioView(view.value);
                setFilter('all');
                setAssetSearch('');
              }}
            >
              {view.label} ({count})
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Choose a development</CardTitle>
            <CardDescription>
              Files are shown only for the selected development. Current projects are the default;
              sold-out projects remain available in history.
            </CardDescription>
          </div>
          <label className="w-full sm:max-w-sm">
            <span className="sr-only">Development</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={activeSelectionId ?? ''}
              onChange={event => {
                const nextId = Number(event.target.value);
                setSelectedDevelopmentId(
                  Number.isSafeInteger(nextId) && nextId > 0 ? nextId : null,
                );
                setFilter('all');
                setAssetSearch('');
              }}
            >
              {visibleDevelopments.map(development => (
                <option key={development.id} value={development.id}>
                  {development.name} ·{' '}
                  {marketStatusLabel(development.status) ?? 'Status unavailable'}
                </option>
              ))}
            </select>
          </label>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(option => {
              const count =
                option.value === 'all'
                  ? assets.length
                  : assets.filter(asset => asset.category === option.value).length;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    filter === option.value
                      ? 'border-blue-700 bg-blue-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {option.label} <span className="ml-1 opacity-75">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-10"
              aria-label="Search project files"
              placeholder="Search by file name, such as site map or price list"
              value={assetSearch}
              onChange={event => setAssetSearch(event.target.value)}
            />
          </div>

          {selectedSummary && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
              <span className="font-medium text-slate-900">{selectedSummary.name}</span>
              <span className="text-slate-500">
                {[selectedSummary.city, selectedSummary.province].filter(Boolean).join(', ')}
              </span>
              <Badge variant="outline">
                {selectedSummary.isPublished ? 'Published development' : 'Not published'}
              </Badge>
              {marketStatusLabel(selectedSummary.status) && (
                <Badge variant="outline">{marketStatusLabel(selectedSummary.status)}</Badge>
              )}
              {transactionTypeLabel(selectedSummary.transactionType) && (
                <Badge variant="outline">
                  {transactionTypeLabel(selectedSummary.transactionType)}
                </Badge>
              )}
              <span className="text-slate-500">{assets.length} attached assets</span>
            </div>
          )}

          {visibleAssets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-3 font-semibold text-slate-900">
                {assets.length === 0
                  ? 'No project files yet'
                  : assetSearch.trim()
                    ? 'No matching files'
                    : 'No assets in this category'}
              </h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
                {assets.length === 0
                  ? 'Add brochures, plans, photos or videos in the development editor. They’ll appear here once saved.'
                  : assetSearch.trim()
                    ? 'Try another search term or choose a different category.'
                    : 'Choose another category to see the files attached to this development.'}
              </p>
              {assets.length === 0 && (
                <Button className="mt-4" variant="outline" onClick={() => setLocation(editHref)}>
                  Open development editor <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {visibleAssets.map(asset => {
                const Icon = categoryIcon(asset.category);
                const isShareable =
                  (asset.category === 'document' || asset.category === 'plan');
                const matchesAsset = (resource: SalesResource) =>
                  (resource.privateCopy && resource.documentLabel === asset.name.slice(0, 160)) ||
                  Boolean(
                    resource.fileUrl &&
                      asset.href &&
                      comparableAssetHref(resource.fileUrl) === comparableAssetHref(asset.href),
                  );
                const sharedResource =
                  salesResources.find(
                    resource => resource.isActive && resource.downloadable && matchesAsset(resource),
                  ) ||
                  salesResources.find(
                    resource => resource.isActive && matchesAsset(resource),
                  );
                return (
                  <div
                    key={asset.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{asset.name}</p>
                        <p className="text-xs text-slate-500">
                          {FILTERS.find(option => option.value === asset.category)?.label} ·{' '}
                          {formatFileSize(asset.size)} · {formatDate(asset.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {asset.href ? (
                        <a
                          href={asset.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
                        >
                          Open file <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">File link unavailable</span>
                      )}
                      {canManageSalesResources &&
                        isShareable &&
                        (sharedResource?.downloadable ? (
                          <Badge variant="secondary">Shared · private download</Badge>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={salesResourcesQuery.isLoading}
                            onClick={() => {
                              setShareAsset(asset);
                              setShareLabel(asset.name.slice(0, 160));
                              setShareFile(null);
                              setShareReason('');
                            }}
                          >
                            <Share2 className="mr-2 h-3.5 w-3.5" />
                            {sharedResource ? 'Upload secure replacement' : 'Upload secure partner copy'}
                          </Button>
                        ))}
                      {canManageSalesResources && sharedResource && !sharedResource.downloadable && (
                        <p className="max-w-xs text-xs text-amber-800">
                          The old URL may still work wherever it was previously shared. A private
                          copy controls downloads through Property Listify only.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isSuperAdmin && (
            <Card className="border-blue-100 bg-blue-50/40 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Partner sales resources</CardTitle>
                <CardDescription>
                  Upload a private copy of an approved plan or document for the partner audience.
                  Downloads are served only after current partner access and sharing are checked.
                  Sharing is development-wide, not phase- or agency-specific; keep phase-specific
                  files private until that phase is released.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {salesResourcesQuery.isLoading ? (
                  <p className="text-sm text-slate-600">Loading partner resources…</p>
                ) : salesResourcesQuery.isError ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-white p-3">
                    <p className="text-sm text-amber-900">
                      Partner resource status is unavailable.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => salesResourcesQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : salesResources.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-white p-4 text-sm text-slate-600">
                    No partner sales resources are shared for this development.
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border bg-white">
                    {salesResources.map(resource => (
                      <div
                        key={resource.id}
                        className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {resource.documentLabel}
                            </p>
                            <Badge
                              variant={resource.isActive && resource.downloadable ? 'secondary' : 'outline'}
                            >
                              {resourceStatusLabel(resource)}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-slate-500">
                            {resource.fileName || 'File name unavailable'}
                            {resource.sharedAt ? ` · Added ${formatDate(resource.sharedAt)}` : ''}
                          </p>
                        </div>
                        {resource.isActive && canManageSalesResources && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUnshareResource(resource);
                              setUnshareReason('');
                            }}
                          >
                            {resource.downloadable ? 'Stop sharing' : 'Remove listing'}
                          </Button>
                        )}
                        {!resource.isActive &&
                          resource.recordActive &&
                          resource.privateCopy &&
                          canManageSalesResources && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReshareResource(resource);
                                setReshareReason('');
                              }}
                            >
                              <Share2 className="mr-2 h-3.5 w-3.5" /> Share again
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <p className="text-xs leading-5 text-slate-500">
            Assets remain attached to the development record. Review and public visibility continue
            to follow the development’s existing workflow; this library does not change publication
            or approval status.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(shareAsset)}
        onOpenChange={open => {
          if (!open) {
            setShareAsset(null);
            setShareFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload a secure partner copy</DialogTitle>
            <DialogDescription>
              The attached project file may use a public URL. Choose its approved local copy here;
              Property Listify will store it privately and share only the protected copy. The
              original attachment URL is unchanged and may remain reachable wherever it was shared.
              PDF, JPEG, PNG, and WebP files up to 9 MB are supported.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="partner-resource-private-file" className="text-sm font-medium">
                Approved file copy
              </label>
              <Input
                id="partner-resource-private-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                onChange={event => setShareFile(event.target.files?.[0] ?? null)}
              />
              {shareFile ? (
                <p className="text-xs text-slate-500">
                  {shareFile.name} · {formatFileSize(shareFile.size)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="partner-resource-label" className="text-sm font-medium">
                Resource name
              </label>
              <Input
                id="partner-resource-label"
                maxLength={160}
                value={shareLabel}
                onChange={event => setShareLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="partner-resource-share-reason" className="text-sm font-medium">
                Reason for sharing this with partner teams
              </label>
              <Textarea
                id="partner-resource-share-reason"
                maxLength={500}
                minLength={10}
                placeholder="For example: site map for partner sales visits"
                value={shareReason}
                onChange={event => setShareReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShareAsset(null);
                setShareFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploadSalesResourceMutation.isPending || !shareFile}
              onClick={submitShare}
            >
              {uploadSalesResourceMutation.isPending ? 'Uploading…' : 'Upload and share'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(unshareResource)}
        onOpenChange={open => !open && setUnshareResource(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {unshareResource?.downloadable
                ? 'Remove this from partner resources?'
                : 'Remove this legacy link from partner resources?'}
            </DialogTitle>
            <DialogDescription>
              {unshareResource?.downloadable
                ? `${unshareResource.documentLabel} will be removed from the partner resource list. New download requests will be denied; previous downloads cannot be recalled.`
                : `${unshareResource?.documentLabel} will be removed from Property Listify’s partner resource list. This does not revoke the direct file URL, which may still work wherever it was previously shared.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="partner-resource-unshare-reason" className="text-sm font-medium">
              Reason for removing it from partner resources
            </label>
            <Textarea
              id="partner-resource-unshare-reason"
              maxLength={500}
              minLength={10}
              placeholder="Explain why this file should no longer be available to partners"
              value={unshareReason}
              onChange={event => setUnshareReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUnshareResource(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={setSalesResourceSharingMutation.isPending}
              onClick={submitUnshare}
            >
              {setSalesResourceSharingMutation.isPending ? 'Updating…' : 'Remove from partner list'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reshareResource)}
        onOpenChange={open => !open && setReshareResource(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Share this private resource again?</DialogTitle>
            <DialogDescription>
              {reshareResource?.documentLabel} will be available to eligible partner users again.
              Their access will be checked at each download.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="partner-resource-reshare-reason" className="text-sm font-medium">
              Reason for sharing it again
            </label>
            <Textarea
              id="partner-resource-reshare-reason"
              maxLength={500}
              minLength={10}
              placeholder="Explain why this resource is being shared again"
              value={reshareReason}
              onChange={event => setReshareReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReshareResource(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={setSalesResourceSharingMutation.isPending}
              onClick={submitReshare}
            >
              {setSalesResourceSharingMutation.isPending ? 'Updating…' : 'Share with partners'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
