import { useCallback } from 'react';

import {
  PUBLIC_AGENT_PROFILE_EVENTS,
  type PublicAgentProfileEvent,
} from '@shared/analytics/public-agent-profile-events';
import { trpc } from '@/lib/trpc';

/**
 * Shared parsing and interaction helpers for the public Agent surfaces.
 *
 * Agent profile list fields are stored as comma-separated text while some
 * legacy rows contain JSON arrays; every consumer must use the same tolerant
 * parser so discovery and the web presence render identically.
 */
export function parseDelimitedList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(item => String(item).trim());
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(item => String(item).trim());
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function parseSocialLinksRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed).reduce(
        (acc, [key, link]) => {
          if (typeof link === 'string' && link.trim()) {
            acc[key] = link.trim();
          }
          return acc;
        },
        {} as Record<string, string>,
      );
    }
  } catch {
    return {};
  }
  return {};
}

/** South African mobile normalization convention (0XX → 27XX). */
export function normalizePhoneForWhatsApp(value: string | null | undefined) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) return `27${digits.slice(1)}`;
  if (digits.startsWith('27')) return digits;
  return digits;
}

export function buildWhatsAppHref(
  phone: string | null | undefined,
  message?: string,
): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

const AGENT_PROFILE_EVENT_MAP = {
  profileView: 'agent_profile_view',
  listingClick: 'agent_profile_listing_click',
  areaGuideClick: 'agent_profile_area_guide_click',
  whatsappClick: 'agent_profile_whatsapp_click',
  callClick: 'agent_profile_call_click',
  emailClick: 'agent_profile_email_click',
  share: 'agent_profile_share',
  contactCta: 'agent_profile_contact_cta',
} satisfies Record<string, PublicAgentProfileEvent>;

export const AGENT_PROFILE_EVENTS = AGENT_PROFILE_EVENT_MAP;

export type AgentProfileEventName = PublicAgentProfileEvent;

/** Fire-and-forget anonymous interaction signals for the agent web presence. */
export function useAgentProfileTracker() {
  const trackMutation = trpc.analytics.track.useMutation();

  return useCallback(
    (event: AgentProfileEventName, properties?: Record<string, unknown>) => {
      try {
        trackMutation.mutate({ event, properties });
      } catch {
        // Analytics must never break the public experience.
      }
    },
    [trackMutation],
  );
}
