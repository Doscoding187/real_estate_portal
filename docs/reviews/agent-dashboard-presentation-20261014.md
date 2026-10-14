# Agent dashboard presentation review — 14 October 2026

The agent dashboard now follows the compact Claude workspace hierarchy: status chips, adjacent next-step guidance, enquiries and showing schedule, a single pipeline strip, listing previews, and quieter profile activity. Actual property thumbnails and explicit Open enquiry / Open lead actions follow the selected ChatGPT ideas.

## Scope and isolation

- Branch: `feat/agent-dashboard-presentation-20261014`.
- Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-agent-dashboard-presentation-20261014`.
- Integration base: `d12dcfb731219298d6841ca8af578affe1f534cb` (`origin/main`).
- Existing local demo on ports 3009 / 5000 / 5180 is preserved. Review frontend is on port 3011.
- No backend, database, service, payment, permissions, moderation or publication changes. Query procedures, operational enablement gates, authored-listing access and existing one-time surface telemetry remain intact.
- Sidebar, top navigation, mobile menu and theme provider are unchanged. New content consumes existing theme tokens; the dashboard background also responds to the existing root dark class.
- Fictional records are the existing local demo records. No application mock data, account activation, fixture seeding or listing submission was introduced.

## Presentation and accuracy

A previously used workspace with no currently published listings is not described as a first-listing journey.

The oversized blue panel and operating-pulse table are removed. A short guidance row covers setup, waiting, first listing, draft and moderation states using the existing journey decision. Established agents see their new enquiries first, followed by other active leads. Pipeline counts appear once. Listing previews show existing images, prices, publication state and returned enquiry counts.

“New enquiries” describes the actual new pipeline stage. No reply status, deadlines, last-contact times, revenue or fabricated performance metrics were added. Received dates come from real creation timestamps. Open enquiry and Open lead select the record through the existing CRM URL; no contact shortcuts are inferred from missing contact data.

The schedule is a preview of returned booked property showings for the selected month, at most three rows. Cancelled, completed and no-show records are excluded from the scheduled preview. Calendar opens the existing calendar tab; a row opens the existing showings tab. The destination does not support selecting an individual showing, so the action says Open showings. Existing month request inputs are retained, including their existing timezone/date-boundary behaviour; this work does not expand calendar coverage.

Loading and request failures use separate states and retry actions. Missing inventory does not trigger a first-listing instruction while its request is loading or failed. Missing enquiries/showings do not become zero or empty-state claims on failure. Profile activity reports the existing 30-day metrics with the same loading/error distinction.

## Local review evidence

Review pack: `/home/edwardspc/Desktop/Dev/review-artifacts/agent-dashboard-presentation-20261014/review.html`.

| Existing local account | Verified state | Outcome |
| --- | --- | --- |
| `local-agent@listify.local` | Fresh, setup 30% | Dashboard redirects to setup before and after; preserved |
| `payment-agent@listify.local` | Payment under review, setup 30% | Dashboard redirects to setup before and after; preserved |
| `journey-agent@listify.local` | Approved, active access, no listings | Real first-listing dashboard, desktop and mobile |
| `home-preview-agent@listify.local` | 8 published listings, 1 new enquiry | Real established dashboard, desktop and mobile |

The populated full-page screenshot is 1,443 px before and 1,003 px after at 1440 × 1000. At 390 × 844 it is 3,086 px before and 1,621 px after, approximately 47% shorter. These are layout measurements, not business metrics. The first-listing account falls from 3,070 px to 1,467 px on mobile.

Browser checks cover Open enquiry selecting the correct CRM dialog on desktop/mobile, Calendar selecting the calendar tab, previous/next showing month, Manage listings, published-property preview, header Add Listing, public profile, and the existing mobile navigation reaching Leads & CRM. No browser page errors were observed. The populated mobile document width is 390 px with a 390 px viewport.

## Checks and limitations

- `pnpm check`: pass.
- Targeted ESLint for all seven changed client files: pass, no warnings.
- Focused existing and new client tests: 28 passed across seven files. Covers first listing, draft, moderation, setup handoff, payment waiting, operational query gates, custody access in CRM, data failures/retry, schedule status filtering, thumbnails, compact status and profile activity.
- `pnpm build`: pass. Existing large-bundle warnings remain.
- `git diff --check`: pass.
- Scoped axe WCAG A/AA checks on the changed dashboard content and status chips: zero reported violations at desktop, mobile and with the existing dark root class. This is a scoped automated check, not a full application accessibility certification.

The fresh and pending-payment accounts cannot show the dashboard until their existing setup requirements are fulfilled. Their guards were reviewed in the real local app; unlocked payment-waiting presentation is exercised by client mocks. No real reviewed account has draft/moderation inventory or scheduled showings, so those row states are tested with isolated client fixtures. No account or database was altered to manufacture these states. The theme provider currently defaults to light with switching disabled; dark-token validation uses its existing root class without introducing a new toggle. Existing sidebar/header theme styling remains outside this dashboard-content change.

Screenshots and logs are local review artifacts, not deployed assets. Authentication storage and credentials are excluded from the review pack.

## Changed files

- `client/src/pages/AgentDashboard.tsx`: compact status placement and removal of duplicate preparation banner; access guards retained.
- `client/src/components/agent/AgentDashboardOverview.tsx`: compact hierarchy, truthful next step/data states, showing preview, one pipeline and property previews; functional skip-content target.
- `client/src/components/agent/AgentStatusStrip.tsx`: optional compact variant using the supplied dashboard status instead of fetching it again; default setup variant retained.
- `client/src/components/agent/AgentPresenceProof.tsx`: quiet activity metrics with loading/error/retry states.
- `client/src/components/agent/AgentDashboardOverview.test.tsx`: presentation, journey and data-state coverage.
- `client/src/components/agent/AgentPresenceProof.test.tsx`: real reporting window and loading/error behaviour.
- `client/src/components/agent/AgentStatusStrip.test.tsx`: compact supplied-state coverage alongside existing tests.
- This review record.
