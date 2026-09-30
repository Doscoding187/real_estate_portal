# B10 Paid MVP transactional email: engineering evidence

Status: `B10 — ENGINEERING EVIDENCE PASS — EXTERNAL PROVIDER PROOF PENDING`.
Base: `f686e8c4ae3e956a4f98cc1e7c4e2947fddf1778` (B06 evidence pass, review pending).

## Historical B10 reconciliation

`678c23c3e48e83764b71b514f406e6d483f97c44` removes raw token-bearing local URL logs and adds a regression. Its direct deletion of the later B06 private verification capture conflicts with the launch stack. The log-security intent was applied manually to current `email.ts`; the governed B06 mode-0600 capture remains. B04 now uses the same guarded private transport for its browser proof. No historical schema or branch was cherry-picked.

## Authority and operating contract

B03 audit events and term notices remain the business authority. B10 never changes invoices, finance decisions, entitlements, or term arithmetic. `transactional_email_deliveries` is one logical delivery per source event, canonical recipient and invitation version. The unique SHA-256 delivery key is also the Resend idempotency key. `transactional_email_attempts` records each fenced attempt. A database transaction claims one row with a ten-minute lease and attempt token; provider I/O occurs after commit. Definite transient rejection uses bounded exponential retry (one and two minutes between at most three attempts); exhaustion moves the row to operator attention. Definite permanent rejection ends immediately. A transport exception, ambiguous provider response, or expired claim becomes `unknown` and is never automatically resent. Provider `accepted` means accepted by Resend, not delivered to a mailbox.

The event consumer is safe to repeat. It resolves Agent users through the Agent billable account, Agency recipients through the current Agency admin, and Developer recipients through an active owner membership with exactly one active organisation. Unresolved identities create a visible permanent attention row without sending. At send time it rechecks recipient and source; invoice emails use the canonical invoice number, EFT reference and amount after checking invoice owner against the B03 event. Invitation token versions are hashes, and current pending invitation state is re-read before rendering its link. Auth verification/reset remain immediate direct sends through their canonical expiring token authority; token-bearing URLs are not persisted in B10 delivery metadata.

Run `pnpm email:worker` repeatedly under B12 supervision. It consumes a bounded batch, recovers expired claims, sends due rows, prints aggregate state/staleness counts, and exits 2 when unresolved identity, unknown/permanent outcome, or a stale row needs attention. `pnpm email:backlog` reports a bounded redacted queue. A super-admin can read `admin.getTransactionalEmailBacklog` and reconcile an `unknown` row with documented provider evidence through `admin.reconcileUnknownTransactionalEmail`; reconciliation is audited and cannot call Resend. B14 must name the operator and rehearse this process.

## Event-to-email policy

In the table, **commercial recipient** means current canonical Agent user, Agency admin, or unambiguous Developer organisation owner, resolved from the billable account and rechecked at send time. **Term recipient** means B03's notification recipient, rechecked against the same term, owner, period and current role/membership. All required rows use bounded delivery retry and operator attention/reconciliation. B12 must supervise the worker and provide the HTTPS origin; B14 owns manual recovery and reply/bounce review.

| Event | Audience and recipient | Email? | Template | Source authority | Retry and manual fallback | Later dependency |
| --- | --- | --- | --- | --- | --- | --- |
| Verification request/resend | Registering user, auth-record email | Yes | Existing verification | Auth token authority | Immediate retry by user; support if provider unavailable | Resend, B12 origin, B14 support |
| Password reset | Account user, auth-record email | Yes | Existing reset | Auth token authority | New user request; support if provider unavailable | Resend, B12 origin, B14 support |
| Agency invitation/resend | Invitation's canonical recipient address | Yes | Agency invitation | Current pending B05 invitation and token version | Durable bounded retry; rotate/resend in B05; operator review | Resend, B12, B14 |
| `invoice_issued` (initial or renewal) | Commercial recipient | Yes | Invoice issued | B03 billing audit and invoice | Bounded retry; finance/support may communicate manually | B12, B14 |
| `payment_proof_received` / proof acknowledgement | Commercial recipient | No; in-app/manual sufficient | None | B03 proof/audit state | Finance can acknowledge through support | B14 |
| `payment_request_correction` | Commercial recipient | Yes | Correction requested | B03 billing audit | Bounded retry; finance contact | B12, B14 |
| `payment_reject` | Commercial recipient | Yes | Payment rejected | B03 billing audit | Bounded retry; finance contact | B12, B14 |
| `payment_approved_subscription_activated` | Commercial recipient | Yes | Access activated | B03 billing audit | Bounded retry; support contact | B12, B14 |
| `payment_partially_approved` | Commercial recipient | Yes | Partial payment | B03 billing audit | Bounded retry; finance contact | B12, B14 |
| `payment_approved_invoice_already_paid` / duplicate proof | Commercial recipient | No; in-app/manual sufficient | None | B03 billing audit | Finance resolves corrections manually | B14 |
| Seven-day and one-day `launch_access_expiry_notice` | Term recipient | Yes | Term ending | B03 term notification | Bounded retry; support outreach | B12, B14 |
| `launch_access_expired` | Term recipient | Yes | Term ended | B03 term notification | Bounded retry; support outreach | B12, B14 |
| Renewal payment approved | Commercial recipient | Yes, same activation event | Access activated | B03 billing audit | Same as activation | B12, B14 |
| Subscription cancellation/restoration/lifecycle audit | Commercial recipient | No; in-app/manual sufficient | None | B03 state and audit | Support explains actual state | B14 |
| Finance approval/moderation/operator events | Internal operator | No customer email; internal/operator only | None | Existing admin and audit surfaces | B14 queue/rehearsal | B14 |
| Marketing/nurture/newsletter | Deferred | No | None | No launch authority | None | Post-launch |

Required templates state Agent R499, Agency R999, Developer R1,499, each once-off for 90 days without automatic renewal. They name Property Listify (Pty) Ltd and no VAT charge. Payment remains manual EFT with finance approval; no template grants access.

## Database and security evidence

The Database Authority route is additive schema in the dedicated disposable B10 target, fingerprint `4173403e539de620c9eb86ac7fb4a0c4a00fb90b36c83677bdbce1b35a4df977`, database `listify_wt_b10_paid_mvp_transactional_ema_204ce11abc05`. Migration head is `0092_transactional_email_attempts.sql` after `0091_transactional_email_deliveries.sql`. Drizzle schema, model inventory and manifest are aligned; no protected database was changed. Existing verification/reset URL logs were removed. Routine provider errors are classified without body, key, token, proof or URL. The controlled B04/B05/B06 captures use disposable test guards and mode-0600 files under `/tmp`; capture content is never committed as evidence.

The worker requires a valid canonical sender and Resend key. Deployed auth email requires them too. Deployed public app/API origins must be configured HTTPS origins, without credentials, paths or localhost. Production proof still requires a real Resend account/key, authenticated sender-domain DNS, sender address, monitored reply/support mailbox, consented test inboxes, bounce ownership, B12 hosted origin and worker supervision, and a named B14 email-reconciliation operator. Acceptance must demonstrate real Resend acceptance, actual mailbox receipt and reply/bounce handling; local acceptance is only engineering evidence.

## Final engineering gates

| Gate | Result |
| --- | --- |
| `pnpm vitest run server/_core/auth.session-security.test.ts server/_core/emailDeliveryBoundary.test.ts server/services/__tests__/transactionalEmailPolicy.test.ts server/services/__tests__/agencyInvitationDeliveryService.test.ts --reporter=dot` | Passed: 4 files, 30 tests. |
| `pnpm test:authority -- server/__tests__/integration.transactional-email-delivery.test.ts` | Passed: 1 file, 10 tests on the disposable B10 target. Covered duplicate consumption, concurrent workers, retry ceilings, hard rejection, recipient changes, ambiguous outcomes, lease recovery, term notices, operator authorization, and current/rotated/expired invitations. |
| `pnpm db:authority:check` | Passed: 36 suites, 298 tests. |
| `pnpm db:authority:status` / `pnpm db:schema:congruency` | Passed: exact worktree-owned disposable target at migration head 0092; desired and actual schema digest match. |
| `pnpm check` / `pnpm build` | Passed. Build retains the existing large-chunk warning. |
| `pnpm lint:check` | Passed with 0 errors and 12,618 repository warnings. |
| `git diff --check` | Passed. |

The B04 Agent browser acceptance passed 2/2. The B05 browser run reached canonical invitation acceptance, then failed later in the inherited Agent profile setup step; the B10 delivery integration suite and invitation-specific browser segment passed. The B06 browser run captured verification privately and progressed into Developer authoring, then timed out after the browser target crashed waiting for the `Gauteng` option. B06 remains frozen at its stated review-pending candidate; neither downstream browser failure is evidence of a B10 regression. The prepayment and PLE browser fixtures now consume governed mode-0600 capture files instead of parsing verification URLs from runtime logs; Playwright lists both configurations successfully.

All three current private verification captures were checked at mode 0600. Routine log searches found no verification/reset URL output. No captured token, API key, private proof, or production recipient evidence is included in this packet.

## External production proof and accepted debt

Still required before B10 production closure:

- Resend production account and API key.
- Authenticated sending domain and verified DNS records.
- Approved sender address and monitored reply/support mailbox.
- Consented real recipient test inboxes plus named bounce/reply handling owner.
- B12 production HTTPS origins and supervised worker, with observed backlog/attention alerts.
- B14 named operator and rehearsal of pending, permanent-failure and unknown-outcome handling.

P2 remains staffed manual bounce and ambiguous-outcome reconciliation, manual queue resolution, and updating the legacy local listing-verification helper from the removed reset-URL log contract before that historical proof is reused. P3 remains campaigns, nurture, newsletter, bulk analytics, template CMS and automated bounce workflows.

## Accepted debt

P2: staffed manual bounce and ambiguous-outcome reconciliation, manual queue resolution, and migration of the legacy local listing-verification helper if that non-launch proof is resumed. P3: campaigns, nurture, newsletter, bulk analytics, template CMS and automated bounce workflows.
