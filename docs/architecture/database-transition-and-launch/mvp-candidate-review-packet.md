# Consolidated MVP candidate review packet

Date: 2026-09-16. Status: prepared for whole-branch review; not integrated or
approved for real-world onboarding, commercial activation, or protected release.

The closure branch corrects agency ownership, commercial gating, publication,
discovery and lead custody while retaining preparation-only commercial entry.
The review unit is the entire diff from PR 577, not the most recent browser test.
This packet is the entry point for that consolidated review. The
[closure report](mvp-closure-report.md) retains historical evidence and the
[launch register](../launch-readiness-and-product-convergence/03-launch-register.md)
retains issue ownership and launch disposition.

## Candidate identity and change control

- Branch: `verify/mvp-closure-post-577`.
- Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577`.
- Integration base: `4e012b3044628fc06da7489c0055e9ce01bdc8d9` (PR 577 merge).
  `git ls-remote --heads origin main` confirmed this remote head on 2026-09-16.
- The focused senior review ended at `5064235b4c8154dc23d2c8668deebd197741111b`:
  104 subsequent commits and 241 changed files since that integration base.
  That review was not approval of the whole branch.
- Freeze the commit containing this acquisition extension and packet before
  the complete checks. Record its full SHA/tree in the verification record.
  Later evidence-only documentation must identify that tested revision and
  prove no executable file differs from it.
- Any executable correction after freezing creates a new candidate. Repeat
  the complete required checks and both browser suites on that candidate.
  Limit corrections to failures blocking the acceptance criteria below.

No migrations, desired models, schema exceptions or production data roles are
changed by this acquisition extension. The branch retains canonical head
`0090_retire_disconnected_boost_campaigns.sql`, manifest digest
`a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed`.

## Acceptance criteria for the review milestone

| Criterion                          | Evidence required                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acquisition continuity             | New owner public entry, registration, unverified/verified persisted state, real verification endpoint/session, agency setup/branding, queued invitation, and zero invoices/payments. New verified invitee returns through sign-in to that invitation. Pre-payment acceptance is denied without a profile, affiliation or consumed invitation.       |
| Canonical member continuity        | Only after the explicit disposable fixture term, the real acceptance router creates exactly one active canonical membership, approved agent profile, refreshed session and accepted invitation for the intended account. No personal billable account is introduced. The same member completes profile preparation and authors the journey listing. |
| Listing-to-CRM continuity          | The same listing is created with five uploaded images and confirmed canonical suburb, rejected with feedback, corrected/resubmitted, approved once, discovered anonymously, and enquired on. Replay creates one lead; persisted custody points to the accepted member and agency; that agent records contact and follow-up.                         |
| Preparation containment            | Both governed browser suites pass. Owner setup, public and authenticated commercial routes stay preparation-only. No normal runtime payment, finance approval, entitlement activation or free publishing path is enabled. Land stays hard-deferred.                                                                                                 |
| Canonical authority                | Exact owned local target, migration head, schema congruency, no incomplete attempts, relevant reference/foundation/scenario verification and required authority gates.                                                                                                                                                                              |
| Complete candidate verification    | Typecheck, full lint, full authority-wrapped Vitest suite, build, static authority/lifecycle/schema checks and both full Chromium suites run against one frozen SHA. Failures, warnings, skipped tests and unexecuted hosted gates are retained.                                                                                                    |
| Independent review and integration | Review the full base-to-candidate diff, resolve scope-blocking findings, refresh remote base, pass required hosted PR checks on the final head, and obtain approval before integration. Record the actual merge SHA and rerun required hosted verification on the integrated artifact.                                                              |

The publication slice is a **local test-supported journey**, not a paid
customer journey. Account verification uses the private local email sink.
Agency review uses the real authenticated reviewer API after browser sign-in;
the mounted agency-management page currently has no verification control.
The browser reads the queued invitation token only from the owned local target,
so invitation delivery is not proved. A named test step supplies a 90-day term
only on the newly created agency's canonical subscription, marks its metadata
with the run ID, and releases it in teardown. The canonical selected plan stays
unchanged. Membership, account verification and listings are not SQL fixtures.
Teardown archives only the run's inventory through the application lifecycle
and proves zero invoices/payments. Reviewer identity is the governed local
reviewer fixture. Nothing in this packet authorizes those fixtures on a host.

## Review map for the whole branch

| Area                     | Review focus / launch register                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account and public entry | Recovery/session boundaries; truthful Agent, Agency and Developer preparation; direct administrative and legacy-route containment (`LRC-AUTH-001`, `LRC-ADVERTISE-001`, `LRC-AGENT-001`, `LRC-DEV-001`).                    |
| Membership and workspace | Canonical current membership, ownership, private/inventory/workspace access, revocation and recommendation eligibility (`LRC-MEM-001`, `LRC-AGY-001`, `LRC-GEO-001`).                                                       |
| Commercial/publication   | Fixed agency term authority; blocked runtime billing and activation; review correction loop, canonical public projection, and deferred Land entry/read/write boundaries (`LRC-PAY-001`, `LRC-PUBLISH-001`, `LRC-LAND-001`). |
| Leads and operations     | Public recipient eligibility, replay safety, relational custody, expiry continuity, reassignment/recovery, Commercial workflow segregation and viewing UTC handling (`LRC-LEAD-001`, `LRC-COMMERCIAL-001`, `LRC-AGY-001`).  |
| Onboarding operations    | Durable assisted intake, invitation validity/acceptance and honest external-mail failures (`LRC-SUPPORT-001`, `LRC-INVITE-001`, `LRC-INVITE-002`).                                                                          |

## Hosted verification plan and owner decisions

These are planned gates, not executed work. Local test success cannot close them.

| Gate / owner                                              | Action and acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review and integration / engineering reviewer             | Approve the consolidated diff and its exact head, with all required CI jobs green. CI must establish a fresh isolated canonical schema and prove physical credential denials, CHECK/FK behaviour and consumer contracts. Existing worktree congruency is not fresh-provider evidence. Record final reviewed head, merge SHA and any integration delta.                                                                                                                             |
| Target and deployment / release owner                     | Name the approved hosting target and operator. Pin frontend/backend to the exact merged SHA, retain configuration fingerprints, and verify CORS, secure sessions, direct route authorization, liveness and layered readiness. A deploy/health result is not database-release approval.                                                                                                                                                                                             |
| Protected database / database owner                       | Obtain operation- and fingerprint-specific approval for read-only protected planning first. Follow the entry contract, operating playbook and transition master plan. Review accepted/expected heads, attempts, provider capability, preservation evidence and plan digest. Any apply needs its own existing approval/acknowledgement, ephemeral migration credential and independent post-apply verification. Never run local fixture/config scripts against the hosted target.   |
| Monitored support / Edward                                | Name the intake queue owner and backup, coverage hours/review cadence, response target, public reply channel, escalation owner/channel, and outage handling. Exercise a synthetic intake through acknowledgement, response, escalation and closure; retain timestamps and sanitized evidence. Durable intake alone does not meet this gate.                                                                                                                                        |
| Final disclosures / Edward and legal owner                | Supply and approve final launch Terms/Privacy, public contact details, data handling, retention/deletion and consent commitments. Publish approved content through the normal reviewed change path; verify links and consent versioning against the hosted candidate. Do not infer authority from example support addresses.                                                                                                                                                       |
| Real email / Edward and delivery owner                    | Choose/approve provider account, sender domain/address, domain authentication, reply/bounce handling, secret/config owner and monitored delivery alerts. Use consented test recipients; prove verification, resend, recovery and token replay/expiry, with provider acceptance and mailbox receipt as separate evidence. Verify unconfigured/provider-failure behaviour does not claim delivery. Invitation mail is tested only when the separate commercial/team gate permits it. |
| Hosted preparation cohort / product and operations owners | With final support/disclosures/email gates satisfied, run public owner entry through verified setup and queued invitation; Agent/Developer private preparation; access denial, direct paid-route containment, and Land containment. Capture exact deployed SHA, actor roles, requests, persisted ownership and negative results. Keep team acceptance/publication blocked in the normal preparation-only runtime.                                                                  |
| Commercial journey / separate commercial approval         | A later, separately reviewed activation decision must specify payment, finance, entitlement, publication and invitation-delivery acceptance. Re-run member publication/discovery/enquiry/CRM with real approved entitlement and delivery; local fixture terms cannot satisfy this gate.                                                                                                                                                                                            |
| Launch operations / release and operations owners         | Complete the master-plan provider/grant, backup/restore, worker supervision, capacity and recovery gates, with approved thresholds, named monitoring owners and a recorded go/no-go. Protect any TiDB/Azure operation through its named authority; no writer cutover or retirement is implied here.                                                                                                                                                                                |

Remaining launch blockers are whole-branch approval/integration and hosted proof;
Land and canonical membership/coverage containment on the integrated artifact;
normal commercial activation; monitored support/final disclosures/real email;
and protected provider, operational and release evidence. Existing lint/bundle
warnings and unrelated optional surfaces remain outside this bounded finish.

## Verification record

The acquisition development run is preliminary. The frozen-candidate record
will list exact commands, UTC start/finish, exit status, SHA/tree, test totals,
skips, limitations and sanitized evidence digests. A failed stage is never
counted as acceptance merely because earlier stages passed. Raw local runtime
logs and browser traces may contain tokens and are not committed or published.
