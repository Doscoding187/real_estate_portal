import { X } from 'lucide-react';
import type { FeedItem, ExploreCtaType } from './types';

interface ContextSheetProps {
  item: FeedItem;
  open: boolean;
  onClose: () => void;
  onCtaClick: (ctaType: ExploreCtaType) => void;
  positionMode?: 'absolute' | 'fixed';
}

interface CtaButtonProps {
  label: string;
  ctaType: ExploreCtaType;
  className?: string;
  onClick: (ctaType: ExploreCtaType) => void;
}

function CtaButton({ label, ctaType, className, onClick }: CtaButtonProps) {
  return (
    <button
      onClick={() => onClick(ctaType)}
      className={`rounded-xl px-3 py-2 text-sm font-semibold ${className || 'bg-white text-slate-900'}`}
    >
      {label}
    </button>
  );
}

function VerificationLabel({
  status,
}: {
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
}) {
  const label =
    status === 'verified'
      ? 'Verified'
      : status === 'pending'
        ? 'Verification Pending'
        : status === 'rejected'
          ? 'Verification Rejected'
          : 'Unverified';
  return (
    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/85">
      {label}
    </span>
  );
}

export function ContextSheet({
  item,
  open,
  onClose,
  onCtaClick,
  positionMode = 'absolute',
}: ContextSheetProps) {
  const wrapperPositionClass = positionMode === 'fixed' ? 'fixed' : 'absolute';

  return (
    <div
      className={`${wrapperPositionClass} inset-x-0 bottom-0 z-50 h-[50vh] rounded-t-3xl border-t border-white/20 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ${
        open ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
    >
      <div className="h-full overflow-y-auto p-4">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/25" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-white/60">Context</p>
          <button onClick={onClose} aria-label="Close details">
            <X className="h-5 w-5 text-white/80" />
          </button>
        </div>

        {item.actorTrust && (
          <div className="mb-4 rounded-xl border border-white/15 bg-white/5 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Creator Trust</p>
            <div className="flex flex-wrap gap-2">
              {item.actorTrust.verificationStatus && (
                <VerificationLabel status={item.actorTrust.verificationStatus} />
              )}
              {item.actorTrust.trustBand && (
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/85">
                  Trust: {item.actorTrust.trustBand}
                </span>
              )}
              {item.actorTrust.momentumLabel && (
                <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/85">
                  Momentum: {item.actorTrust.momentumLabel}
                </span>
              )}
              {item.actorTrust.lowReports && (
                <span className="rounded-full bg-emerald-500/25 px-2 py-1 text-[11px] font-medium text-emerald-100">
                  Low reports
                </span>
              )}
            </div>
          </div>
        )}

        {item.kind === 'listing' && (
          <div className="space-y-3">
            <p className="text-lg font-semibold">{item.linkedListing.title}</p>
            <p className="text-base text-white/90">{item.linkedListing.price}</p>
            <p className="text-sm text-white/75">{item.linkedListing.location}</p>
            <div className="flex flex-wrap gap-2 text-xs text-white/85">
              <span className="rounded-full bg-white/10 px-2 py-1">{item.linkedListing.beds} beds</span>
              <span className="rounded-full bg-white/10 px-2 py-1">{item.linkedListing.baths} baths</span>
              <span className="rounded-full bg-white/10 px-2 py-1">{item.linkedListing.size}</span>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-white/60">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {item.linkedListing.amenities.map(amenity => (
                  <span key={amenity} className="rounded-full bg-white/10 px-2 py-1 text-xs">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                onClick={() => onCtaClick('viewListing')}
              >
                View Listing
              </button>
              <CtaButton
                label="Request Viewing"
                ctaType="viewingRequest"
                className="bg-emerald-500 text-white"
                onClick={onCtaClick}
              />
              <CtaButton
                label="Contact Agent"
                ctaType="contactAgent"
                className="bg-sky-500 text-white"
                onClick={onCtaClick}
              />
            </div>
          </div>
        )}

        {item.kind === 'agent' && (
          <div className="space-y-3">
            <p className="text-lg font-semibold">{item.agentProfile.name}</p>
            <p className="text-sm text-white/80">
              {item.agentProfile.agency} - {item.agentProfile.areaServed}
            </p>
            <p className="text-sm leading-relaxed text-white/85">{item.agentProfile.bio}</p>
            <div className="pt-2">
              <CtaButton
                label="Contact Agent"
                ctaType="contactAgent"
                className="bg-sky-500 text-white"
                onClick={onCtaClick}
              />
            </div>
          </div>
        )}

        {item.kind === 'partner' && (
          <div className="space-y-3">
            <p className="text-lg font-semibold">{item.partnerShowcase.projectTitle}</p>
            <p className="text-sm text-white/80">
              {item.partnerShowcase.priceRange} - {item.partnerShowcase.areaServed}
            </p>
            <p className="text-sm leading-relaxed text-white/85">{item.partnerShowcase.scope}</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="mb-1 text-xs text-white/60">Before</p>
                <img
                  src={item.partnerShowcase.beforeImageUrl}
                  alt="Before project image"
                  className="h-24 w-full rounded-lg object-cover"
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-white/60">After</p>
                <img
                  src={item.partnerShowcase.afterImageUrl}
                  alt="After project image"
                  className="h-24 w-full rounded-lg object-cover"
                />
              </div>
            </div>
            <div className="pt-2">
              <CtaButton
                label="Request Quote"
                ctaType="partnerRequestQuote"
                className="bg-orange-500 text-white"
                onClick={onCtaClick}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
