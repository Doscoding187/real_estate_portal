import { Link } from 'wouter';
import { Camera } from 'lucide-react';
import { buildServiceCategoryPath } from '@/features/services/catalog';

type AgentServicesReferralProps = {
  /** The private source listing id, when the listing has one. */
  listingId?: number | null;
  /** The public property id, when the listing is published. */
  propertyId?: number | null;
  /** The suburb, city or province the listing sits in. */
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  /** The service category the referral points at. */
  category?: 'media_marketing' | 'inspection_compliance' | 'moving';
};

/**
 * The agent-to-Services referral.
 *
 * The Services server already accepts an `agent_dashboard` source surface and
 * intent stage, and it role-gates that attribution to agent, agency admin and
 * super admin accounts. This component is the client half of that existing
 * capability: it carries the listing context and the agent attribution into
 * the Services directory, so a request sent from here is attributed to the
 * agent journey rather than arriving as an anonymous directory enquiry.
 *
 * It is a referral, not a lead. The Services contract records the request
 * against the provider the consumer chooses, and the platform does not take
 * part in the transaction between them.
 */
export function AgentServicesReferral({
  listingId,
  propertyId,
  suburb,
  city,
  province,
  category = 'media_marketing',
}: AgentServicesReferralProps) {
  const href = buildServiceCategoryPath(category, {
    sourceSurface: 'agent_dashboard',
    intentStage: 'agent_dashboard',
    reasonKey: 'agent_listing_preparation',
    listingId: listingId ?? undefined,
    propertyId: propertyId ?? undefined,
    suburb: suburb ?? undefined,
    city: city ?? undefined,
    province: province ?? undefined,
  });

  return (
    <Link
      href={href}
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#168363] transition hover:text-[#116E54]"
    >
      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
      Find listing media providers
    </Link>
  );
}
