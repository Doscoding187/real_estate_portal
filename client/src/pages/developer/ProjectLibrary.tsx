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
} from 'lucide-react';

import { useAuth } from '@/_core/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { trpc } from '@/lib/trpc';

type AssetCategory = 'document' | 'plan' | 'photo' | 'video';
type AssetFilter = 'all' | AssetCategory;

type LibraryAsset = {
  id: string;
  name: string;
  href: string | null;
  category: AssetCategory;
  size: number | null;
  uploadedAt: string | null;
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
  const [filter, setFilter] = useState<AssetFilter>('all');

  useEffect(() => {
    if (developments.length === 0) {
      setSelectedDevelopmentId(null);
      return;
    }
    if (!developments.some(development => development.id === selectedDevelopmentId)) {
      setSelectedDevelopmentId(developments[0].id);
    }
  }, [developments, selectedDevelopmentId]);

  const developerDevelopmentQuery = trpc.developer.getDevelopment.useQuery(
    { id: selectedDevelopmentId ?? 0 },
    {
      enabled: selectedDevelopmentId !== null && !isSuperAdmin,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const publisherDevelopmentQuery = trpc.superAdminPublisher.getDevelopmentById.useQuery(
    {
      cataloguePublisherId: publisherContext?.cataloguePublisherId ?? -1,
      developmentId: selectedDevelopmentId ?? -1,
    },
    {
      enabled: selectedDevelopmentId !== null && isPublisherRead,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const selectedDevelopment = isPublisherRead
    ? publisherDevelopmentQuery.data
    : developerDevelopmentQuery.data;
  const detailQuery = isPublisherRead ? publisherDevelopmentQuery : developerDevelopmentQuery;
  const assets = useMemo(() => collectAssets(selectedDevelopment), [selectedDevelopment]);
  const visibleAssets =
    filter === 'all' ? assets : assets.filter(asset => asset.category === filter);
  const selectedSummary = developments.find(
    development => development.id === selectedDevelopmentId,
  );
  const editHref = selectedDevelopmentId
    ? `/developer/create-development?id=${selectedDevelopmentId}`
    : '/developer/create-development';

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

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Choose a development</CardTitle>
            <CardDescription>
              Files are shown only for the selected development in this workspace.
            </CardDescription>
          </div>
          <label className="w-full sm:max-w-sm">
            <span className="sr-only">Development</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedDevelopmentId ?? ''}
              onChange={event => {
                const nextId = Number(event.target.value);
                setSelectedDevelopmentId(
                  Number.isSafeInteger(nextId) && nextId > 0 ? nextId : null,
                );
                setFilter('all');
              }}
            >
              {developments.map(development => (
                <option key={development.id} value={development.id}>
                  {development.name} · {development.locationLabels?.join(', ') || 'Place assignment pending'}
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

          {selectedSummary && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
              <span className="font-medium text-slate-900">{selectedSummary.name}</span>
              <span className="text-slate-500">
                {selectedSummary.locationLabels?.join(', ') || 'Place assignment pending review'}
              </span>
              <Badge variant="outline">
                {selectedSummary.isPublished ? 'Published development' : 'Not published'}
              </Badge>
              <span className="text-slate-500">{assets.length} attached assets</span>
            </div>
          )}

          {visibleAssets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-3 font-semibold text-slate-900">
                {assets.length === 0 ? 'No project files yet' : 'No assets in this category'}
              </h2>
              <p className="mx-auto mt-1 max-w-lg text-sm text-slate-600">
                {assets.length === 0
                  ? 'Add brochures, plans, photos or videos in the development editor. They’ll appear here once saved.'
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
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs leading-5 text-slate-500">
            Assets remain attached to the development record. Review and public visibility continue
            to follow the development’s existing workflow; this library does not change publication
            or approval status.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
