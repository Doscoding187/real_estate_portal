# B15 offline customer copy and recorded acceptance

12 October 2026. **Preparation in progress; B15 OPEN.** Eight accepted scopes
remain B01–B07 and B12. This packet supplies the next bounded implementation
contract and decision record; it grants no publication or hosted execution.

## Working authority and deliverables

- Base: integration `5746451d3` (PR #606); task branch
  `feat/b15-offline-copy-consent-20261012`, dedicated worktree of the same name.
- Closure authority: [plan 24, B15](24-paid-mvp-launch-closure-execution-plan.md).
- Accepted founder facts: [v0.6 register](evidence/b15-copy-approval-preparation-2026-09-27-v0.6.md).
- New internal copy: [review 0.5](evidence/b15-founder-review-2026-10-12-v0.5.md).
  This revision supersedes 0.4 as a technical review candidate only. Neither is
  approved public policy. Its checksum is in the adjacent checksum file.
- October browser evidence: the OS report `2026-10-12 - B15 Production Browser
  Facts and Remaining Copy Work - Senior Review.md`, public source `3e061d78`.
  Twenty desktop/mobile anonymous visits are existing evidence, not rerun here.
- Storage evidence: [packet 29](29-mvp1-aws-storage-hardening.md) and its retained
  October 2 readbacks. September pre-provisioning evidence is historical.

Customer-facing name, registration number, no-VAT position, general/support/
privacy routes, WhatsApp, weekday hours, prices, 90-day term and activation
target are carried forward. No request to reconfirm them is necessary.

## Publication decisions

| ID | Remaining decision or evidence | Accountable party | Current disposition |
| --- | --- | --- | --- |
| D1 | Address for receiving legal service; place of incorporation; publishable office-bearer names; business telephone or reviewed applicability treatment | Edward | Legal-document receipt at 96 Jorissen Street, Braamfontein confirmed October 12; director name Lehlohonolo Banda supplied; Johannesburg, Gauteng, South Africa, full registered name and sole-director status confirmed; messages-only WhatsApp retained |
| D2 | Applicable accreditation/body membership, subscribed codes or dispute-resolution scheme, including a confirmed absence where appropriate | Edward / legal reviewer | Edward states no accreditation or dispute-scheme membership; No subscribed code confirmed October 12 |
| D3 | Information Officer company registration evidence and responsible contact name | Edward | Outstanding after Edward replied “none so i need these”; official registration preparation recorded; no submission or certificate claimed |
| D4 | Category schedule below, including disposal capability and holds | Edward / accounting or legal reviewer where needed | Business schedule in packet 33 confirmed October 12 subject to finance/legal review conditions; no expiry/delete job authorized |
| D5 | Actual provider regions, subprocessors, transfer safeguards and log retention | Architect reconciles retained provider/configuration records; Edward reviews resulting commitments | Known provider list is below; missing tenant facts remain named |
| D6 | Exact refund/dispute wording, document versions, effective date and full-copy approval | Edward or recorded delegate | Review 0.5 is unapproved; approval must identify its final resolved bytes |

The remaining exact company disclosures are being clarified in this thread.
Director disclosure arises from ECT section 43(1)(f), rather than a request
for identity-document publication. D2 is an additional
disclosure completeness check found in this review, not a new company fact.
No statutory refund exception or consent to early paid service is inferred
from a registration checkbox. Legal applicability must be reviewed before
changing the accepted refund boundary or introducing such a control.

## Retention decision sheet shared with B09/B11

Edward remains accountable for all rows unless a delegate is named. The final
decision must state the period/event, purpose, disposal method, owner and hold
conditions. The entries below describe a recommended decision structure;
they do not invent periods or represent implemented deletion.

| Category | Purpose and recommended decision structure | Still to decide or verify |
| --- | --- | --- |
| Account/contact/organisation/verification | Keep what is needed for an active relationship; after closure separate necessary dispute/security/acceptance evidence from ordinary profile data | Closure trigger; review/disposal deadline; necessary verification evidence; legally required holds |
| Listings/developments/units/public media and private drafts | Keep active inventory and agreed account drafts; define withdrawal/expiry/closure treatment and remove abandoned media only after dependency checks | Draft inactivity period; withdrawn inventory period; media purge owner; CDN/storage propagation and backup treatment |
| Enquiries and customer/platform custody | Keep for authorised follow-up and defined dispute handling; distinguish platform custody from recipient-owned copies | Last activity/closure trigger; period; access after paid expiry; recipient responsibilities and hold process |
| Invoices/receipts/payment proofs/reconciliation | Preserve finance records for the reviewed applicable requirement; assess whether the full proof file needs the same period as the accounting record | Applicable statutory requirements and trigger; full-proof necessity; correction/refund/hold evidence; accountant review |
| Transactional emails and provider delivery logs | Keep delivery/retry/unknown-outcome evidence for operational recovery; minimise bodies and recipient metadata when no longer needed | Provider log period; application delivery-record period; bounce/support handling and deletion capability |
| Support/privacy cases, security/audit and legal acceptance | Keep necessary resolution/security/dispute evidence with restricted access; use a defined review trigger and justified period | Different periods by purpose; approval actor; deletion or de-identification; legal-acceptance evidence after closure |
| Backups and frozen historical archives | Separate rolling recovery copies from the frozen migration/source archive; maintain custody and a hold/review decision | Actual backup windows; archive owner/location/index; review/removal condition; handling of deletion on restore |

The accepted fresh-account transition does not authorise historical import or
archive deletion. Backup expiry cannot be claimed from a policy paragraph.
Restore procedures must reapply approved deletions/restrictions before a
restored dataset resumes use. Disposal execution is a later bounded operation.

## Provider and browser evidence reconciliation

| Provider or local mechanism | Established fact | Remaining fact / copy constraint |
| --- | --- | --- |
| Vercel | Production frontend/browser artifact identified in October report | Serving/logging locations and configured retention; hosting presence is not proof of a complete transfer safeguard |
| Railway API/held workers; Redis cache | Existing service roles are in packets 30/31; workers held | Actual regions and cache persistence/TTL/log handling from reviewed service evidence; do not infer worker admission or queue delivery |
| Microsoft Azure MySQL | October cutover/reference/release evidence replaces earlier TiDB runtime descriptions | Exact region, current backup/log retention and contracted safeguards; no historical source recapture |
| Resend | Transactional-email provider in normal source path and packet 30 | Account region, retained metadata/content and contracted safeguards; no delivered-mail claim from source |
| AWS S3 / CloudFront | Retained `eu-north-1` media/proof preparation and October 2 readbacks; private proof bucket/versioning/encryption and separated scoped identities | Current hosted owner access proof; provider access logs/lifecycle/transfer safeguards; CDN edge delivery is not confined to the S3 region |
| Google Fonts / Maps | Actual anonymous requests on October production artifact; Maps loads on home | Google processing/subprocessor/retention facts; no claim that Maps waits for a property-detail click or that geolocation was exercised |
| Unsplash | Actual external image requests on home | Provider processing/retention facts; do not describe these as only DNS prefetch |
| `property-comparison` localStorage | Persists property comparisons; no source automatic expiry | User can clear site data; clearing comparison through UI and authenticated storage clearance still require observation |
| `advertise_session_id` sessionStorage | Per-session identifier; first-party analytics POST attempts observed and blocked by audit | Server receipt, retention and behaviour/policy alignment remain unresolved; cookie absence does not mean no analytics |
| `pl_session_v2` | Canonical hosted cookie is HttpOnly, Secure, SameSite=Lax and host-only; prior login evidence retained | Session duration/logout and authenticated storage matrix in shared hosted exercise; anonymous cookie-empty capture does not certify signed-in behaviour |
| Device drafts/return state | Developer/listing/distribution draft and return-state persistence in source | Owner separation, logout/account switching/clearance observations and stale-draft periods |

No new provider calls or protected database connections were made in this
preparation. Provider-wide public documentation cannot establish tenant region,
log configuration or a signed processing agreement. D5 therefore remains open
until those existing records are reconciled and any missing current read is
approved for the coordinated hosted exercise.

## Source map and implementation contract

| Surface | Current source / finding | Required implementation |
| --- | --- | --- |
| Public Terms, Privacy and Cookies | `client/src/pages/NavLandingPage.tsx`: drafting instructions; Cookies is also generic | Render approved dated full content; accessible, printable/copyable; consistent routes and legal links |
| Normal registration for all available roles | `client/src/pages/Login.tsx` → `/api/auth/register` → `server/_core/authRoutes.ts` → `AuthService.register` | Required unchecked Terms choice and adjacent Privacy Notice before submission; explicit pair version; server-enforced acceptance |
| Agency/developer setup | `AgencySetupWizard.tsx`, `DeveloperSetupWizardEnhanced.tsx`, `wizard/steps/ReviewStep.tsx`: UI booleans | Remove redundant purported legal acceptance or give it a separately approved specific purpose; never treat it as account consent evidence |
| Account/profile persistence | `server/db.ts:createUser`, `drizzle/schema/core.ts:users` | No legal fields/record authority exists; add through a dedicated schema-authority slice |
| Existing audit log | `drizzle/schema/core.ts:auditLogs`: free-text metadata, user FK cascades on deletion | Not sufficient as the legal-evidence authority; do not silently repurpose it or infer old acceptance |
| Paid offer/invoice/finance and email | Audience offer pages; `billingFoundationService.ts`, `commercialTerm.ts`, transactional-email services, Agency/Developer billing panels | Common approved disclosure references; pre-invoice/payment display; compare exact product/amount/VAT/payee/term/refund facts |
| Enquiry collection | Public enquiry flows and recipient/custody services | Privacy link and truthful recipient/custody explanation at collection; account acceptance does not replace this notice |
| Invitations/OAuth/existing accounts | Agency invitation and OAuth identity creation paths | Inventory every actual account-creation path; no imported/backfilled acceptance, founder identity mutation or login-as-consent shortcut |

### Proposed durable model for the dedicated database workstream

This is a design proposal, not adopted schema. Use the existing migration and
connection authorities; no new ledger/runner or runtime shape detection.

1. An immutable release bundle identifies Terms and Privacy document versions,
   their exact content digests, effective date, approval actor/reference and
   applicable audience. Store the approved documents alongside that identity
   so a recorded digest can still be resolved after a later wording change.
   A draft bundle cannot be selected by registration.
2. An append-only acceptance event identifies the authenticated/created user,
   released bundle, server timestamp and collection source. The client sends
   only explicit `termsAccepted: true` and the displayed bundle identity; it
   cannot select a timestamp, user ID, digest or arbitrary historical version.
   Privacy is acknowledged as a notice; it is not blanket processing consent.
3. Validate the released bundle and explicit choice before account mutation.
   Create the account and required acceptance atomically; if evidence storage
   fails, no successful registration or verification email is produced.
   Preserve the existing agent-profile cleanup/security behaviour while
   replacing partial creation with a tested transaction where needed.
4. Missing, false, coercible-string, draft or stale-version acceptance fails
   closed with a useful refresh/review response. A form opened before a release
   change must show the new version and require a fresh choice.
5. Optional marketing is independent. For MVP, omit a marketing opt-in until
   a governed durable permission/withdrawal path and wording exist; omission
   records no marketing permission. If offered, keep it unchecked and store
   scope/channel/version and changes independently of account acceptance.
6. User deletion/closure treatment follows D4. A cascading deletion must not
   silently destroy evidence needed under the approved retention decision;
   a restrictive FK must not silently block a valid privacy request forever.
   Record the decided minimisation/retention design in canonical schema.
7. Existing controlled accounts have no inferred acceptance. Require reviewed
   acceptance at the agreed next commitment boundary; treat invited users and
   actual new OAuth accounts through a deliberate collection step. Logging in,
   receiving an invitation or a founder Google callback is not acceptance.

Recommended registration wording for copy review:

> I agree to the Terms of Service. I have been shown the Privacy Notice.

Each title is a link that preserves entered form values when opened. No
checkbox is preselected, and refusal does not send registration or marketing.
Account acceptance is distinct from any later paid-purchase commitment.

## Verification and acceptance matrix

| Case | Local proof required after implementation | Remaining hosted observation |
| --- | --- | --- |
| Legal desktop/mobile | Approved full text, titles/version/effective date; keyboard, readable layout, link/print behaviour; no placeholders | Final artifact matches approved bundle/digest on both viewports |
| Agent/Agency/Developer registration | Each submits current identity + explicit choice; false/missing/stale/direct API cases denied | Consenting registration + durable server record joined to exact released version |
| Atomicity | Fault at acceptance insert yields no committed account/profile or sent email; valid signup commits both | Authentic account/evidence query under governed access, redacted reference only |
| Notice and marketing | Privacy available at collection; registration works without optional marketing; no bundled permission | Actual processing/storage aligns with notice; any opt-in/withdrawal independently recorded |
| Alternate creation and old accounts | No invitation/OAuth/service bypass; no automatic legacy acceptance | One coordinated applicable invitation/identity case; existing accounts treated as agreed |
| Offers/payment/invoices/email | Canonical prices, 90 days, manual EFT/no renewal, VAT/payee/activation/refund text agree | Actual controlled invoice/email/private-document display matches copy |
| Enquiry privacy | Notice/recipient/custody shown before send; recipient authority retained | Shared three-owner enquiry exercise in packet 30 |
| Closure/recovery | Retention model honours decided account deletion and hold rules | Approved recovery/storage evidence and actual retention controls under B09/B11/B17 |

Read-only `pnpm db:authority:status` passed in this worktree: Database Authority
v3, valid manifest head `0111_properties_canonical_place_reference_fk.sql`,
exact-owned disposable target at `127.0.0.1:3307`; service unreachable, schema
and ledger not evaluated. No database was provisioned, migrated or queried.
The initial copy-preparation step changed no runtime files or schemas. The
continuation adds a database-free acceptance policy and focused tests; see
[packet 33](33-b15-retention-and-provider-recommendations-2026-10-12.md).
At that initial preparation checkpoint, registration wiring, schema and
persistence were not implemented. The subsequent dedicated authority slice
below now implements them; neither this document preview nor the pure policy
tests alone prove recorded customer acceptance.

The internal review 0.5 was rendered as an offline HTML document and checked
with installed Playwright at 1440×1000 and 390×844. Both checks passed: no page
overflow, no external requests, visible unapproved-draft banner, all three
prices/90-day term, the external Maps disclosure and unresolved retention
field preserved. [Sanitized preview results](evidence/b15-offline-preview-checks-2026-10-12.json)
are retained. HTML and screenshots are in the OS worklog evidence directory
`evidence/2026-10-12-b15-offline-review/`. This is a review-document rendering,
not verification of the application legal pages or signup UI.

Local validation also passed exact SHA-256 verification, byte-for-byte
preservation of review 0.4's refund paragraph, relative document-link checks
and whitespace checks. These checks establish packet consistency only.

Next: resolve D1–D6, approve the final exact-copy identity, implement the
canonical schema/consumer slice and legal rendering, then run these focused
local checks. Hosted acceptance follows the existing coordinated packet.
The public maintenance/payment/worker holds remain effective.

## Legal-review references and limits

Primary references checked on October 12: [ECT Act, government original](https://www.gov.za/sites/default/files/gcis_document/201409/a25-02.pdf),
[government Act entry and amended-text pointer](https://www.gov.za/documents/electronic-communications-and-transactions-act),
and [POPIA, Department of Justice](https://www.justice.gov.za/legislation/acts/2013-004.pdf).
ECT sections 42–44 are relevant to supplier disclosures and applicable
cancellation treatment; POPIA sections 14, 18 and 72 are relevant to retention,
collection notices and international processing. These identify review topics,
not a conclusion that Property Listify complies. The original ECT PDF is not
represented as a verified consolidated current text; direct amended-text
retrieval was blocked. Final applicability/refund/retention advice remains
with the named reviewer. No statutory policy period is supplied here.

Company facts are incorporated in [review 0.6](evidence/b15-founder-review-2026-10-12-v0.6.md), an unapproved internal candidate. Prior candidate bytes and checksums are preserved.

Latest factual candidate: [review 0.7](evidence/b15-founder-review-2026-10-12-v0.7.md). No code membership is confirmed; Information Officer registration remains outstanding. This candidate is not approved public copy.

## Subsequent dedicated implementation checkpoint

The separate branch feat/b15-legal-acceptance-authority-20261012, based on
c475ed724, now supplies canonical release/pointer/acceptance tables, atomic
ordinary registration, exact-copy legal rendering and local desktop/mobile proof.
Packet 34 in that worktree records 720 authority tests, 51 policy/auth/route
tests, 17 client tests and 12 actual local transaction cases, type/build/lint
results and the database-free whole-suite baseline comparison. The disposable
database and local preview are stopped/disposed. No real legal bundle was
installed, no mail sent and no hosted resource used. This is an implementation
checkpoint, not final-copy approval or B15 acceptance. The latest copy candidate
is review 0.7, still unapproved with unresolved provider/retention fields.
