/**
 * Anonymous public interaction signals emitted by the Agent web presence.
 *
 * These names belong to the existing canonical AgentOsEventType authority and
 * carry target identity only (agent id, canonical slug, listing id). Public
 * contact details must never be attached to these payloads.
 */
export const PUBLIC_AGENT_PROFILE_EVENTS = [
  'agent_profile_view',
  'agent_profile_listing_click',
  'agent_profile_area_guide_click',
  'agent_profile_whatsapp_click',
  'agent_profile_call_click',
  'agent_profile_email_click',
  'agent_profile_share',
  'agent_profile_contact_cta',
] as const;

export type PublicAgentProfileEvent = (typeof PUBLIC_AGENT_PROFILE_EVENTS)[number];
