import { Archive, ArrowUpRight, ClipboardCheck, Eye, MoreHorizontal, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FallbackImage } from '@/components/FallbackImage';
import { withApiBase } from '@/lib/mediaUtils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function AgencyListingIdentity({
  title,
  location,
  summary,
  thumbnailUrl,
}: {
  title: string;
  location: string;
  summary?: string;
  thumbnailUrl?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <FallbackImage
        src={withApiBase(thumbnailUrl)}
        alt=""
        width={64}
        height={56}
        decoding="async"
        className="h-14 w-16 shrink-0 rounded-md border border-slate-200 bg-slate-100 object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950">{title}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{location}</p>
        {summary && <p className="mt-1 text-sm text-slate-500">{summary}</p>}
      </div>
    </div>
  );
}

interface ListingState {
  authoringStatus?: string;
  publicationState?: string;
  readinessScore?: number;
  health?: { needsAttention?: boolean; reasons?: string[] };
}

const labels: Record<string, string> = {
  published: 'Live',
  draft: 'Draft',
  pending_review: 'Pending review',
  ready_to_submit: 'Ready to submit',
  approved: 'Approved',
  rejected: 'Changes requested',
  archived: 'Archived',
  private_pending_edits: 'Edits awaiting review',
};
const humanize = (value: string) => value.replace(/_/g, ' ');
const reasons: Record<string, string> = {
  unassigned_listing: 'Assign an agent',
  assigned_agent_outside_agency: 'Agent outside agency',
  assigned_agent_inactive: 'Agent inactive',
  rejection_correction_required: 'Corrections needed',
  required_details_missing: 'Required details missing',
  missing_media: 'Photos or media missing',
  location_incomplete: 'Location incomplete',
  pricing_missing: 'Pricing missing',
  stale_draft: 'Draft needs an update',
  publication_mismatch: 'Check publication',
};

/** Summarize existing state without changing publication or readiness authority. */
export function AgencyListingStatus({ listing }: { listing: ListingState }) {
  const authoring = listing.authoringStatus || 'unknown';
  const publication = listing.publicationState || '';
  const isLive = ['published', 'public_with_private_pending_edits'].includes(publication);
  const label = isLive
    ? 'Live'
    : authoring === 'published'
      ? 'Publication pending'
      : labels[authoring] || humanize(authoring);
  let detail = '';
  if (publication === 'public_with_private_pending_edits')
    detail = 'Live version unchanged · edits pending';
  else if (publication === 'publication_mismatch') detail = 'Check publication';
  else if (publication === 'approved_not_published') detail = 'Not yet public';
  else if (publication === 'withdrawn') detail = 'Withdrawn from public view';
  else if (publication === 'archived' && authoring !== 'archived')
    detail = 'Public listing archived';
  else if (isLive && authoring !== 'published')
    detail = `Latest work: ${labels[authoring] || humanize(authoring)}`;
  else if (
    publication &&
    !['published', 'private', 'not_published', 'unpublished', 'archived'].includes(publication) &&
    publication !== authoring
  )
    detail = humanize(publication);

  const healthReasons = listing.health?.reasons || [];
  const materialReason = healthReasons.find(reason => reason !== 'published_no_recent_enquiries');
  const exception = materialReason
    ? reasons[materialReason] || humanize(materialReason)
    : listing.health?.needsAttention && !healthReasons.length
      ? 'Needs review'
      : '';
  const warning =
    !!exception ||
    ['rejected', 'pending_review'].includes(authoring) ||
    publication === 'publication_mismatch';
  const tone = isLive
    ? 'bg-emerald-50 text-emerald-800'
    : warning
      ? 'bg-amber-50 text-amber-900'
      : 'bg-slate-100 text-slate-700';

  return (
    <div className="min-w-0 space-y-1" data-testid="listing-status">
      <Badge className={`${tone} border-transparent font-medium`}>{label}</Badge>
      {detail && (
        <p
          className={`text-xs leading-5 ${publication === 'publication_mismatch' ? 'text-amber-800' : 'text-slate-500'}`}
        >
          {detail}
        </p>
      )}
      {exception && exception !== detail && (
        <p className="text-xs leading-5 text-amber-800">{exception}</p>
      )}
      {!exception && healthReasons.includes('published_no_recent_enquiries') && (
        <p className="text-xs leading-5 text-slate-500">No recent enquiries</p>
      )}
      {!isLive && listing.readinessScore != null && listing.readinessScore < 100 && (
        <p className="text-xs text-slate-500">{listing.readinessScore}% ready</p>
      )}
    </div>
  );
}

export function AgencyListingActions({
  title,
  busy,
  canEdit,
  canSubmit,
  canArchive,
  hasPublicPage,
  onOpen,
  onEdit,
  onSubmit,
  onArchive,
  onPublic,
}: {
  title: string;
  busy: boolean;
  canEdit: boolean;
  canSubmit: boolean;
  canArchive: boolean;
  hasPublicPage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onArchive: () => void;
  onPublic: () => void;
}) {
  const hasMenu = canEdit || canSubmit || canArchive || hasPublicPage;
  return (
    <div className="flex items-center gap-1.5 xl:justify-end">
      <Button variant="outline" size="sm" onClick={onOpen} aria-label={`View ${title}`}>
        <Eye className="h-4 w-4" /> View
      </Button>
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              aria-label={`More actions for ${title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasPublicPage && (
              <DropdownMenuItem onSelect={onPublic}>
                <ArrowUpRight /> Open public listing
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem onSelect={onEdit} disabled={busy}>
                <Pencil /> Edit listing
              </DropdownMenuItem>
            )}
            {canSubmit && (
              <DropdownMenuItem onSelect={onSubmit} disabled={busy}>
                <ClipboardCheck /> Submit for review
              </DropdownMenuItem>
            )}
            {canArchive && (
              <>
                {(hasPublicPage || canEdit || canSubmit) && <DropdownMenuSeparator />}
                <DropdownMenuItem variant="destructive" onSelect={onArchive} disabled={busy}>
                  <Archive /> Archive listing
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
