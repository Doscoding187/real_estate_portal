import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionStack } from './ActionStack';
import { ContactSheet, type ContactAction } from './ContactSheet';
import { ContextBar } from './ContextBar';
import { ContextSheet } from './ContextSheet';
import type { FeedItem, ExploreCtaType } from './types';

interface VideoCardProps {
  item: FeedItem;
  index?: number;
  total?: number;
  isActive?: boolean;
  isContextOpen?: boolean;
  liked?: boolean;
  saved?: boolean;
  variant?: 'fullscreen' | 'compact';
  compactClassName?: string;
  compactAspect?: 'portrait' | 'landscape' | 'square';
  setVideoRef?: (contentId: string, node: HTMLVideoElement | null) => void;
  onOpenContext?: (contentId: string) => void;
  onCloseContext?: () => void;
  onVideoTimeUpdate?: (contentId: string, currentTimeSec: number, durationSec: number) => void;
  onVideoEnded?: (contentId: string) => void;
  onLike?: (contentId: string) => void;
  onSave?: (contentId: string) => void;
  onShare?: (contentId: string) => void;
  onNotInterested?: (contentId: string) => void;
  onCtaClick?: (contentId: string, ctaType: ExploreCtaType) => void;
  onCardClick?: (contentId: string) => void;
}

interface ContactSheetViewModel {
  title: string;
  subtitle?: string;
  actions: ContactAction[];
  primaryActionLabel?: string;
  primaryActionType?: ExploreCtaType;
}

function toWhatsappHref(value: string) {
  const digits = value.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

function getContactModel(item: FeedItem): ContactSheetViewModel | null {
  if (item.kind === 'module') {
    return null;
  }

  if (item.kind === 'video') {
    return null;
  }

  if (item.kind === 'listing') {
    const contact = item.linkedListing.agentContact;
    const actions: ContactAction[] = [];
    if (contact.phone) {
      actions.push({
        label: 'Call',
        value: contact.phone,
        href: `tel:${contact.phone}`,
        ctaType: 'agentCall',
      });
    }
    if (contact.whatsapp) {
      actions.push({
        label: 'WhatsApp',
        value: contact.whatsapp,
        href: toWhatsappHref(contact.whatsapp),
        ctaType: 'agentWhatsApp',
      });
    }
    if (contact.email) {
      actions.push({
        label: 'Email',
        value: contact.email,
        href: `mailto:${contact.email}`,
        ctaType: 'agentEmail',
      });
    }
    return {
      title: contact.name,
      subtitle: contact.organization || 'Listing Agent',
      actions,
    };
  }

  if (item.kind === 'agent') {
    const contact = item.agentProfile;
    const actions: ContactAction[] = [];
    if (contact.phone) {
      actions.push({
        label: 'Call',
        value: contact.phone,
        href: `tel:${contact.phone}`,
        ctaType: 'agentCall',
      });
    }
    if (contact.whatsapp) {
      actions.push({
        label: 'WhatsApp',
        value: contact.whatsapp,
        href: toWhatsappHref(contact.whatsapp),
        ctaType: 'agentWhatsApp',
      });
    }
    if (contact.email) {
      actions.push({
        label: 'Email',
        value: contact.email,
        href: `mailto:${contact.email}`,
        ctaType: 'agentEmail',
      });
    }
    return {
      title: contact.name,
      subtitle: `${contact.agency} - ${contact.areaServed}`,
      actions,
    };
  }

  const contact = item.partnerShowcase.contact;
  const actions: ContactAction[] = [];
  if (contact.phone) {
    actions.push({
      label: 'Call',
      value: contact.phone,
      href: `tel:${contact.phone}`,
      ctaType: 'partnerCall',
    });
  }
  if (contact.whatsapp) {
    actions.push({
      label: 'WhatsApp',
      value: contact.whatsapp,
      href: toWhatsappHref(contact.whatsapp),
      ctaType: 'partnerWhatsApp',
    });
  }
  if (contact.email) {
    actions.push({
      label: 'Email',
      value: contact.email,
      href: `mailto:${contact.email}`,
      ctaType: 'partnerEmail',
    });
  }
  return {
    title: contact.name,
    subtitle: contact.organization || item.partnerShowcase.areaServed,
    actions,
    primaryActionLabel: 'Submit Quote Request',
    primaryActionType: 'partnerRequestQuote',
  };
}

export function VideoCard({
  item,
  index = 0,
  total = 1,
  isActive = false,
  isContextOpen = false,
  liked = false,
  saved = false,
  variant = 'fullscreen',
  compactClassName,
  compactAspect = 'portrait',
  setVideoRef = () => undefined,
  onOpenContext = () => undefined,
  onCloseContext = () => undefined,
  onVideoTimeUpdate = () => undefined,
  onVideoEnded = () => undefined,
  onLike = () => undefined,
  onSave = () => undefined,
  onShare = () => undefined,
  onNotInterested = () => undefined,
  onCtaClick = () => undefined,
  onCardClick,
}: VideoCardProps) {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const contactModel = useMemo(() => getContactModel(item), [item]);

  useEffect(() => {
    if (!isActive) {
      setIsContactOpen(false);
    }
  }, [isActive]);

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      setVideoRef(item.id, node);
    },
    [item.id, setVideoRef],
  );

  useEffect(() => {
    if (variant !== 'compact') return;
    const localVideoEl = localVideoRef.current;
    if (!localVideoEl) return;
    if (isActive) {
      void localVideoEl.play().catch(() => undefined);
      return;
    }
    localVideoEl.pause();
  }, [isActive, variant]);

  const handleContextCta = (contentId: string, ctaType: ExploreCtaType) => {
    onCtaClick(contentId, ctaType);
    if (ctaType === 'partnerRequestQuote') {
      setIsContactOpen(true);
    }
  };

  const compactAspectClass =
    compactAspect === 'landscape'
      ? 'aspect-video'
      : compactAspect === 'square'
        ? 'aspect-square'
        : 'aspect-[9/16]';

  if (variant === 'compact') {
    return (
      <article
        data-feed-item="true"
        data-index={index}
        className={compactClassName || 'relative w-full overflow-hidden rounded-xl'}
        onClick={() => {
          onCardClick?.(item.id);
          onOpenContext(item.id);
        }}
        role="listitem"
      >
        <div className={`relative ${compactAspectClass} overflow-hidden rounded-xl bg-black`}>
          <video
            ref={handleVideoRef}
            src={item.videoUrl}
            poster={item.posterUrl}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
            onLoadedData={() => setIsThumbnailLoaded(true)}
            onTimeUpdate={event => {
              if (!isActive) return;
              const video = event.currentTarget;
              onVideoTimeUpdate(item.id, video.currentTime, video.duration);
            }}
            onEnded={() => onVideoEnded(item.id)}
          />

          {!isThumbnailLoaded && <div className="absolute inset-0 animate-pulse bg-white/10" />}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md">
              <span className="ml-0.5 text-sm text-white">{'>'}</span>
            </div>
          </div>

          {item.actorTrust?.verificationStatus && (
            <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {item.actorTrust.verificationStatus === 'verified'
                ? 'Verified'
                : item.actorTrust.verificationStatus}
            </div>
          )}
        </div>

        <div className="mt-2 space-y-1 px-1">
          <p className="line-clamp-2 text-xs font-semibold text-slate-900">
            {item.caption || 'Explore Video'}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="truncate">{item.creatorName || 'Creator'}</span>
            {item.actorTrust?.trustBand && (
              <span className="rounded-full border border-slate-200 px-1.5 py-0.5 uppercase text-slate-700">
                {item.actorTrust.trustBand}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section
      data-feed-item="true"
      data-index={index}
      className="relative h-screen w-full snap-start overflow-hidden bg-black"
    >
      <video
        ref={handleVideoRef}
        src={item.videoUrl}
        poster={item.posterUrl}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        onTimeUpdate={event => {
          if (!isActive) return;
          const video = event.currentTarget;
          onVideoTimeUpdate(item.id, video.currentTime, video.duration);
        }}
        onEnded={() => onVideoEnded(item.id)}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />

      <div className="absolute left-4 top-4 z-20 rounded-full border border-white/20 bg-black/45 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md">
        {item.kind.toUpperCase()} - {index + 1}/{total}
      </div>

      <div className="absolute bottom-36 right-4 z-30">
        <ActionStack
          contentId={item.id}
          liked={liked}
          saved={saved}
          onLike={onLike}
          onSave={onSave}
          onShare={onShare}
          onNotInterested={onNotInterested}
        />
      </div>

      {item.kind === 'video' ? (
        <div className="absolute inset-x-4 bottom-6 z-30 max-w-[80%] rounded-2xl border border-white/20 bg-black/45 p-3 text-white backdrop-blur-md">
          <p className="line-clamp-2 text-sm font-semibold">{item.caption || 'Explore Video'}</p>
          <p className="mt-1 text-xs text-white/80">
            {item.creatorName || 'Creator'}
            {item.category ? ` • ${item.category}` : ''}
          </p>
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-5 z-30">
          <ContextBar item={item} onExpand={() => onOpenContext(item.id)} />
        </div>
      )}

      {item.kind !== 'video' && (
        <>
          <button
            aria-label="Close context sheet"
            onClick={onCloseContext}
            className={`absolute inset-0 z-40 bg-black/35 transition-opacity duration-300 ${
              isContextOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          <ContextSheet
            item={item}
            open={isContextOpen}
            onClose={onCloseContext}
            onCtaClick={ctaType => handleContextCta(item.id, ctaType)}
          />
        </>
      )}

      {contactModel && (
        <ContactSheet
          open={isContactOpen}
          title={contactModel.title}
          subtitle={contactModel.subtitle}
          actions={contactModel.actions}
          primaryActionLabel={contactModel.primaryActionLabel}
          primaryActionType={contactModel.primaryActionType}
          onClose={() => setIsContactOpen(false)}
          onCtaClick={ctaType => onCtaClick(item.id, ctaType)}
        />
      )}
    </section>
  );
}
