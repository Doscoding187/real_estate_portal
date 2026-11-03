import { Link } from 'wouter';
import { ArrowRight, Camera, ClipboardCheck, Truck } from 'lucide-react';
import { buildServiceCategoryPath } from '@/features/services/catalog';

type AgentServicesReferralProps = {
  /** The private source listing id, when the listing has one. */
  listingId?: number | null;
  /** The public property id, when the listing is published. */
  propertyId?: number | null;
  /** Exact admitted Place identity; absent assignments remain unscoped. */
  canonicalPlaceId?: string | null;
  /** The service category the referral points at. */
  category?: 'media_marketing' | 'inspection_compliance' | 'moving';
  /** Optional action copy. */
  label?: string;
  className?: string;
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
  canonicalPlaceId,
  category = 'media_marketing',
  label,
  className = '',
}: AgentServicesReferralProps) {
  const Icon =
    category === 'inspection_compliance' ? ClipboardCheck : category === 'moving' ? Truck : Camera;
  const actionLabel =
    label ||
    (category === 'inspection_compliance'
      ? 'Find inspection providers'
      : category === 'moving'
        ? 'Find moving providers'
        : 'Find listing media providers');
  const href = buildServiceCategoryPath(category, {
    sourceSurface: 'agent_dashboard',
    intentStage: 'agent_dashboard',
    reasonKey: 'agent_listing_preparation',
    listingId: listingId ?? undefined,
    propertyId: propertyId ?? undefined,
    canonicalPlaceId: canonicalPlaceId ?? undefined,
  });

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-[#168363] transition hover:text-[#116E54] ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {actionLabel}
    </Link>
  );
}

/**
 * The always-available Services referral panel.
 *
 * It is deliberately not gated by Launch Access or publishing entitlements.
 * Referring a property owner to a service provider is a discovery action, not a
 * marketplace listing action, and independent agents and individuals may use it
 * before commercial activation.
 */
export function AgentServicesReferralPanel({
  listingId,
  propertyId,
  canonicalPlaceId,
  className = '',
}: Omit<AgentServicesReferralProps, 'category' | 'label' | 'className'> & {
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[#D8EDE7] bg-[#EDF8F6] p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#0B1B2A]">Refer a property service</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-[#4B5C6B]">
            Available to every agent and individual, with or without Launch Access. Refer a client
            to a published provider and the request is attributed to your agent journey.
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#168363]">
          No publishing access required
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <AgentServicesReferral
          listingId={listingId}
          propertyId={propertyId}
          canonicalPlaceId={canonicalPlaceId}
          category="media_marketing"
        />
        <AgentServicesReferral
          listingId={listingId}
          propertyId={propertyId}
          canonicalPlaceId={canonicalPlaceId}
          category="inspection_compliance"
        />
        <AgentServicesReferral
          listingId={listingId}
          propertyId={propertyId}
          canonicalPlaceId={canonicalPlaceId}
          category="moving"
        />
      </div>
      <Link
        href="/services"
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#168363]"
      >
        Browse the full services directory
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
