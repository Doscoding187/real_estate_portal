/**
 * Maximum length of a headline typed into the listing wizard for a NEW listing, so results
 * cards stay readable. This is deliberately client-only: server and shared validation keep
 * accepting up to 255 characters so existing listings never fail on edit, and cards clamp
 * long legacy titles visually.
 */
export const LISTING_TITLE_MAX_LENGTH = 40;
