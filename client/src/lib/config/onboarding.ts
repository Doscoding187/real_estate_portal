/**
 * Onboarding Configuration
 * Centralized configuration for agency onboarding flow
 */

export const onboardingConfig = {
  urls: {
    app: import.meta.env.VITE_APP_URL || window.location.origin,
    success: (sessionId?: string) =>
      `${import.meta.env.VITE_APP_URL || window.location.origin}/agency/dashboard?welcome=true${sessionId ? `&session_id=${sessionId}` : ''}`,
    cancel: (step?: number) =>
      `${import.meta.env.VITE_APP_URL || window.location.origin}/agency/onboarding${step ? `?step=${step}` : ''}`,
    inviteAccept: (token: string) =>
      `${import.meta.env.VITE_APP_URL || window.location.origin}/invite/accept?token=${token}`,
  },
  draft: {
    expiryHours: parseInt(import.meta.env.VITE_ONBOARDING_DRAFT_EXPIRY_HOURS || '72'),
    storageKey: 'agency_onboarding_draft_v1', // Version for cache busting
  },
  validation: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
    maxTeamInvites: parseInt(import.meta.env.VITE_MAX_TEAM_INVITATIONS_PER_AGENCY || '50'),
  },
  features: {
    teamInvitations: import.meta.env.VITE_FEATURE_TEAM_INVITATIONS !== 'false', // Enabled by default
    autoSendInvites: import.meta.env.VITE_FEATURE_AUTO_SEND_INVITES !== 'false', // Enabled by default
  },
} as const;
