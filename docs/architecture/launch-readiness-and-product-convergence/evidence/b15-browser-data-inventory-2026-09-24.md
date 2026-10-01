# B15 browser storage and external request inventory — candidate source

Status: source inspection on the B16 preparation branch. This is a bounded
engineering fact inventory for Edward's Privacy review, not a live-browser
network capture, approved retention policy or published notice. The current
production frontend remains on an older artifact until a separate release.
The candidate `pnpm build` passed. Neither built `dist/public/index.html` nor
the built asset files contain the former Google tag URL or measurement ID.
At 2026-09-24 14:59 UTC, a read-only HTTPS fetch of the current public
`https://www.propertylistifysa.co.za/` HTML still contained both. This confirms
the fix is candidate-only; no live frontend change is claimed.

| Surface | Observed candidate-source behavior | Privacy review consequence |
| --- | --- | --- |
| Session | `server/_core/cookies.ts` sets the API session cookie HttpOnly, Path `/`, SameSite=Lax and Secure in hosted staging/production. No Domain is set. | Disclose a necessary host-only sign-in cookie; verify actual `Set-Cookie` on the accepted hosted artifact. |
| Browser drafts and preferences | Several flows store device-local state. `DeveloperSetupWizardEnhanced` saves an authenticated, user-keyed registration draft in `localStorage`; `PartnerSubmitReferralPage` saves buyer name/contact and intent in a local draft; search/return intent and UI preferences use `localStorage` or `sessionStorage`. | The customer notice must mention device storage, including possible personal draft data. Determine deletion/expiry and shared-device guidance from the real released flows. |
| First-party interaction events | `advertiseTracking.ts` creates `advertise_session_id` in `sessionStorage`, reads `user_id` from `localStorage` when present, and sends page/action, referrer, device, session and possible user metadata to `/api/analytics/track` in production. `server/routes/analytics.ts` currently logs event type, page, device type, user ID, session ID, timestamp and `meta`; it does not persist a dedicated analytics row there. | Disclose this first-party event processing and establish the actual Railway log retention/access policy. Do not describe the service as collecting only necessary cookies. |
| Google Analytics | The previous `client/index.html` loaded Google `gtag.js` unconditionally. The candidate source now removes that script and the `G-XS0CGH8MSC` initialization. Existing `gtag` call sites are guarded by presence of `window.gtag`. | Verify the built artifact and hosted browser send no Google Analytics request before describing analytics as disabled. The already-deployed frontend is not changed by this commit. |
| Google Fonts | `client/index.html` loads the Inter font from `fonts.googleapis.com`/`fonts.gstatic.com` on page load. | Record the external request and provider in the actual processing inventory, or replace it through a separately reviewed design change. |
| Google Maps | `useGoogleMaps.ts` loads the Maps JavaScript API when map consumers mount and a browser key exists. Property detail and nearby-landmark components may load static map images with coordinates and key; a map action opens Google Maps. | Include map requests and any device data they expose in the provider schedule. Verify which map consumers are active on the final V1 artifact. |
| Other media | `client/index.html` prefetches `images.unsplash.com`; some pages may request remote images. | The exact browser network capture must identify all released third-party requests before finalizing the provider schedule. |

## Remaining proof

1. On the hosted candidate, capture a clean browser network/storage inventory
   for a visitor, signed-in Agent, Agency member and Developer. Include consent
   state, cookies, local/session storage categories, external domains and
   requests triggered only by maps or media.
2. Bind the actual provider regions, logging retention and object/database
   retention to B12/B11 operations. Neither code inspection nor a repository
   default proves the deployed provider's retention policy.
3. Resolve and publish the B15 Privacy and cookie schedule only after Edward
   approves the facts and the rendered site passes B18 acceptance.
