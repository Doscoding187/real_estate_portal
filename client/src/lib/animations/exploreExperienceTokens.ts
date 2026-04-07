const ENTRY_EASING = [0.22, 1, 0.36, 1] as const;
const INTERACTIVE_EASING = [0.4, 0, 0.2, 1] as const;
const ENTRY_EASING_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';
const INTERACTIVE_EASING_CSS = 'cubic-bezier(0.4, 0, 0.2, 1)';

const TAP_DURATION_MS = 120;
const HOVER_DURATION_MS = 180;
const ROUTE_DURATION_MS = 260;
const MEDIA_FADE_DURATION_MS = 300;
const SHIMMER_DURATION_MS = 1200;
const PAUSE_ICON_HIDE_DURATION_MS = 800;
const LIKE_BURST_DURATION_MS = 1000;
const STAGGER_BASE_DELAY_MS = 100;
const STAGGER_STEP_DELAY_MS = 50;

export const exploreExperienceTokens = {
  durationsMs: {
    tap: TAP_DURATION_MS,
    hover: HOVER_DURATION_MS,
    route: ROUTE_DURATION_MS,
    mediaFade: MEDIA_FADE_DURATION_MS,
    shimmer: SHIMMER_DURATION_MS,
    pauseOverlayHide: PAUSE_ICON_HIDE_DURATION_MS,
    likeBurst: LIKE_BURST_DURATION_MS,
    staggerBaseDelay: STAGGER_BASE_DELAY_MS,
    staggerStepDelay: STAGGER_STEP_DELAY_MS,
  },
  easing: {
    entry: ENTRY_EASING,
    interactive: INTERACTIVE_EASING,
  },
  easingCss: {
    entry: ENTRY_EASING_CSS,
    interactive: INTERACTIVE_EASING_CSS,
    linear: 'linear',
  },
  delaysSec: {
    staggerBase: STAGGER_BASE_DELAY_MS / 1000,
    staggerStep: STAGGER_STEP_DELAY_MS / 1000,
  },
  transitions: {
    tap: {
      duration: TAP_DURATION_MS / 1000,
      ease: INTERACTIVE_EASING,
    },
    hover: {
      duration: HOVER_DURATION_MS / 1000,
      ease: INTERACTIVE_EASING,
    },
    route: {
      duration: ROUTE_DURATION_MS / 1000,
      ease: ENTRY_EASING,
    },
    mediaFade: {
      duration: MEDIA_FADE_DURATION_MS / 1000,
      ease: INTERACTIVE_EASING,
    },
    shimmerLoop: {
      duration: SHIMMER_DURATION_MS / 1000,
      ease: 'linear',
      repeat: Infinity,
    },
    likeBurst: {
      duration: LIKE_BURST_DURATION_MS / 1000,
      ease: ENTRY_EASING,
    },
  },
  interactions: {
    cardHover: {
      y: -4,
      scale: 1.02,
      transition: {
        duration: HOVER_DURATION_MS / 1000,
        ease: INTERACTIVE_EASING,
      },
    },
    ctaHover: {
      y: -2,
      scale: 1.01,
      transition: {
        duration: HOVER_DURATION_MS / 1000,
        ease: INTERACTIVE_EASING,
      },
    },
    tap: {
      scale: 0.97,
      opacity: 0.9,
      transition: {
        duration: TAP_DURATION_MS / 1000,
        ease: INTERACTIVE_EASING,
      },
    },
  },
} as const;

export const exploreVisualTokens = {
  sectionTitleClass: 'text-3xl font-semibold tracking-tight',
  sectionSubtitleClass: 'mt-2 text-sm',
  mediaOverlayClass:
    'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10',
  mediaTagPillClass:
    'absolute left-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[10px] uppercase tracking-wide text-white/90 backdrop-blur-md',
} as const;
