# B03 Paid Lifecycle and Expiry Closure Packet

| Field | Record |
| --- | --- |
| Scope | B03 payment, finance approval, commercial activation, renewal, expiry, and historical lead custody |
| Worktree | `/tmp/property-listify-b03-expiry-closure` |
| Branch | `fix/b03-expiry-closure` |
| Starting HEAD | `b80d917ea3b790ae25651ffbe30752bc88d8e107` |
| Base / merge base | `b80d917e` / `c51041acd626e3973cbdc88080bb0074d8c95313` |
| Initial worktree state | Clean before modification; `c51041a` (B01/B02 candidate) and `b80d917e` (inherited B03) were both confirmed ancestors |
| Database target | `listify_wt_b03_expiry_closure_f6e3e267add2` (disposable worktree; fingerprint `f559239cfe1603dcc0fa1a1100c2d8c939bb51ad4c4739a93cd741ce1342b000`) |
| Migration head | `0090_retire_disconnected_boost_campaigns.sql` |
| Production state | No protected or production database/provider was accessed or mutated |

## 1. Takeover review and disposition

The inherited `b80d917e` B03 payment-lifecycle implementation was accepted as the
foundation and was not rewritten. Its finance and term controls were inspected
against the source, inherited evidence packet, focused tests, and persisted
acceptance tests. They remain correct for:

- explicit positive integer-cent finance reconciliation;
- unreconciled overpayment containment;
- auditable duplicate-proof handling without a second credit;
- early-renewal preservation of already-paid days;
- deterministic UTC fixed 90-day terms; and
- canonical Agent, Agency, and Developer owner resolution.

The inherited packet explicitly left public paid-inventory expiry, the verified
professional/badge bypass, Developer term notices, and public lead containment
open. This closure slice corrects those B03-specific gaps and preserves the
accepted payment implementation.

**Takeover judgment: accepted inherited B03 foundation; corrected remaining
expiry, enquiry, Developer lifecycle, and activation-boundary defects.**

## 2. Canonical commercial authority

All three approved products now resolve through the shared fixed-term authority:

| Stakeholder | Commercial owner and term | New publication/public eligibility | New enquiry | Historical custody |
| --- | --- | --- | --- | --- |
| Agent | `subscriptions(owner_type='agent', owner_id=agentUserId)` joined to the exact active `agent_launch_access` plan and billable account | `listingPublicationEntitlementService`, `publicPropertyEligibilityService`, and public profile serving-location checks require the current term | `publicLeadCaptureService` and `publicLeadCustodyService` require the current individual term; verification/badge alone is insufficient | Existing lead recipient/tenant remains the Agent after expiry; unrelated users are denied |
| Agency | Exact `agency_launch_access` term owned by the Agency; current canonical membership supplies workspace authority | Member publication and Agency inventory resolve to the current Agency term; a member cannot fall back to personal commercial authority | Agency-owned inventory requires the Agency term and canonical membership; expired inventory is not a new-lead source | Active membership rows, Agency identity, member attribution, and accepted leads remain intact |
| Developer | Exact `developer_launch_access` term owned by the Developer organisation | First-party development/unit eligibility and publication require the organisation term, exact publisher/organisation ownership, and an active operator | Development/unit capture uses the same access check; expiry returns no public lead route | Organisation, catalogue publisher, development history, and accepted enquiries remain preserved |

Private drafts and canonical historical data are retained. Expiry removes new
paid capability; it does not erase legitimate business history.

## 3. Defects corrected

1. A verified or badged Agent could otherwise remain a new-enquiry recipient
   without a current paid term. Direct custody and capture now require the
   individual or effective Agency commercial term.
2. Grace/trial or generic plans could otherwise satisfy paid publication paths.
   Paid MVP paths now require one of the exact active, verified, fixed 90-day
   products and a valid future UTC period end.
3. An affiliated Agent could otherwise fall back to personal billing after the
   Agency term expired. Canonical membership now controls the effective Agency
   authority and expiry denies new commercial activity.
4. Public property, development, unit, serving-location, and lead-capture paths
   now share the same active-term checks. Expired inventory cannot continue
   generating new paid enquiries.
5. Developer first-party publication SQL now also matches the subscription owner
   to `p.developer_organisation_id`; a subscription for another organisation
   cannot unlock the development.
6. Developer organisations were absent from the canonical term-notice lifecycle.
   The scheduler now selects exact Developer organisation terms and queues durable
   owner notifications with idempotent notice keys.
7. Commercial activation was broad enough to risk future products. The shared
   activation policy now allowlists only `agent_launch_access`,
   `agency_launch_access`, and `developer_launch_access`; normal runtime remains
   gated until a bounded launch mechanism is deliberately enabled.
8. The governed search-to-lead fixture had Agency inventory without a canonical
   Agency term. Its disposable preparation now provisions the exact Agency
   foundation term, so the scenario proves the same authority used in runtime.
9. Public Agent serving-location discovery now explicitly constrains the joined
   subscription owner type to `agent`, preventing a coincident owner id or
   billable-account projection from crossing commercial owner boundaries.
10. Demand-campaign routing could otherwise create a new lead from an expired
    paid inventory row even after direct public capture was closed. The demand
    engine now resolves canonical Agency membership and applies the exact active
    Agent/Agency Launch Access term before assigning a new lead.
11. The authenticated Agent entitlement projection still treated a generic
    subscription status as commercial access. It now requires the exact product,
    current UTC term, activation gate, and current membership before exposing
    publish/receive capability.
12. Finance-driven subscription lifecycle, cancellation, and restoration paths
    used a product-less activation check. They now resolve the persisted plan
    before mutation, so a future bounded MVP release can administer only an
    approved product and cannot release legacy/deferred products.
13. The mounted location-map, heatmap, enhanced-location, and similar-property
   discovery surfaces still trusted a published projection directly. They now
   re-resolve candidates, references, and aggregates through the shared public
   eligibility authority before pagination or recommendation output, so an
   expired paid projection cannot remain discoverable on a secondary route.
14. The generic global-search and Place-ID listing paths also read published
    projections directly. They now resolve listing candidates through the same
    authority, and generic development search applies the canonical Developer
    publication condition, closing the remaining secondary discovery bypass.

The bounded follow-up changed only the canonical discovery services and their
contract coverage: `server/locationRouter.ts`,
`server/enhancedLocationRouter.ts`, `server/services/similarPropertiesService.ts`,
`server/services/globalSearchService.ts`, and the two public-discovery contract
tests. No stakeholder-specific commercial authority was introduced.

## 4. Expiry and new-enquiry evidence

The database-backed acceptance matrix passed against the disposable target:

- **Agent:** active paid inventory published and received an enquiry; after the
  term was expired, publication was rejected, serving-location eligibility was
  removed, the authenticated entitlement projection reported no new
  publish/receive capability, a direct new enquiry was rejected, and demand
  routing produced only an unmatched/non-lead result.
- **Agency:** an authorised member operated under the Agency term; after expiry,
  new Agency publication/enquiry was rejected while membership and Agency
  attribution remained present.
- **Developer:** an approved first-party development was publicly eligible and
  received an enquiry while the organisation term was active; after expiry,
  public eligibility and new enquiry were rejected while the organisation,
  publisher, and development state remained present.
- **Secondary public discovery:** map, heatmap, enhanced-location, location
  insight, sitemap, similar-property, generic global-search, and Place-ID paths
  now filter through the same current eligibility resolver; generic development
  search applies the canonical development condition. Expired paid inventory is
  absent from cards, aggregates, recommendations, search, and crawl output.

The public profile/identity layer may preserve a verified professional or
organisation record for legitimate history, but its commercial discovery and
lead eligibility are false without the required current term. Verification,
badge state, or membership identity is never used as a substitute for paid
entitlement.

## 5. Historical lead custody

The lifecycle integrations and governed search-to-lead acceptance prove the
required separation between old custody and new eligibility:

- Agent accepted leads remain visible to the same Agent after expiry;
- Agency/member accepted leads retain their Agency/member attribution and remain
  visible through the canonical workspace after expiry;
- Developer accepted enquiries remain visible to the owning organisation after
  expiry, while an unrelated Developer organisation is denied;
- duplicate replay returns the original durable lead rather than creating a new
  lead; and
- expired inventory cannot create another lead.

No expiry path deletes or reassigns an accepted CRM/history record.

## 6. Developer term lifecycle and B10 boundary

`commercialTermNoticeScheduler` is now the single canonical selector for notice
state. It reads the exact Developer organisation subscription, handles active
and lifecycle-marked expired rows, resolves active organisation owners through
`developer_organisation_memberships`, and writes repeat-tick-idempotent durable
notification rows keyed by recipient, subscription, and notice window. It does
not send email or configure Resend.

Stable notification/event points for B10 are:

- `invoice_issued`;
- `proof_received`;
- `payment_correction_requested`;
- `payment_rejected`;
- `payment_review_<decision>`;
- `payment_approved` (including activation);
- `payment_proof_recorded` for duplicate/audited proofs;
- `partial_payment`;
- `launch_access_expiry_notice` (7-day/1-day notice); and
- `launch_access_expired`.

Each durable row carries the canonical owner type/id, subscription id, period
end, recipient (where applicable), action URL, and
`providerDelivery: 'b10_notification_consumer'`. B10 owns delivery, sender
configuration, and mailbox receipt.

## 7. Activation containment

The commercial foundation can later exercise only the three approved Paid MVP
products: Agent, Agency, and Developer Launch Access. Invoice, proof, finance,
activation, lifecycle, publication, and enquiry paths all require the exact
product key. Land, Explore commercial features, service-provider marketplace,
card/recurring products, boosts, promotions, future tiers, and deferred
Developer products are not in the allowlist. The normal production gate remains
closed; this change does not flip it or collect payment.

Platform-curated catalogue behaviour remains its separate platform authority and
is not treated as a paid stakeholder product. First-party Developer commercial
publication is term-gated.

## 8. Database and schema status

No schema or migration was added. The disposable target was created, migrated to
the canonical head, and used for all persistence checks. Final authority checks
reported congruent desired/actual schema digest
`95f6c6b11056df70c0e1fd5639dcf0e9cb58e0616e01ac6f243564112dd24cea`, exact
canonical geography/reference counts (9 provinces, 340 cities, 1,089 suburbs),
and the three fixed 90-day foundation products (R499.00, R999.00, R1,499.00).
Production and protected resources were untouched.

## 9. Validation record

| Layer | Command/result |
| --- | --- |
| Unit/contract | Focused B03 run: 10 files, 158 tests passed, covering terms, activation allowlist, authenticated entitlement projection, public eligibility, custody/capture, Developer owner matching, serving-location owner boundaries, continuity, and notice scheduler; residual public-discovery run: 6 files, 20 tests passed (location, global-search, similar-property, location-insight, hierarchy, and home-insight expiry boundaries) |
| Persisted lifecycle integration | `NODE_ENV=test APP_ENV=test pnpm test:authority -- ...` (12 selected B03/lifecycle files, including demand routing): 12 files, 74 tests passed; secondary expiry regression (Agent launch, Developer publication, consumer activity): 3 files, 32 tests passed |
| Payment/finance acceptance | `commercial-launch-access-s4.integration.test.ts`: 6/6; `billing.foundation.acceptance.integration.test.ts`: 2/2 (also included in the matrix) |
| Governed scenario | `pnpm db:scenario:prepare`; `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify`: 3 manual + 1 development source, duplicate replay/custody, Agent/Agency/Developer authorization and cross-tenant denial all passed |
| Database authority | `pnpm db:authority:check`: 36 files, 298 tests plus 119 utility surfaces; passed |
| Schema/reference/foundation | `pnpm db:schema:congruency`, `pnpm db:reference:verify`, `pnpm db:foundation:verify`: passed |
| Typecheck/build/lint | `pnpm check`: passed; `pnpm build`: passed; `pnpm lint:check`: passed with repository warning baseline and no errors |
| Diff hygiene | `git diff --check`: passed |
| Not run / intentionally outside B03 | Full browser/production/provider delivery, live bank/provider acceptance, B14 rehearsal, B15 legal wording, and B16 merge/release approval |

## 10. Journey handoff

- **B04 Agent:** use `listingPublicationEntitlementService` and
  `publicLeadCaptureService` as the canonical gates. A current exact Agent term
  is required for new paid publication and enquiries; accepted Agent leads stay
  in the same custody after expiry.
- **B05 Agency:** use the Agency-owned term plus canonical membership. Expiry
  blocks new commercial activity but does not destroy membership, workspace
  identity, or historical Agency/member leads. Members do not silently become
  independent commercial owners.
- **B06 Developer:** use organisation-owned exact terms and
  `developerPublicationAccess`/`publicDevelopmentEligibility`. Expiry blocks
  first-party publication and enquiries while preserving organisation,
  publisher, development, and historical enquiry identity.

## 11. Remaining dependencies and proposed disposition

There are no unresolved B03-specific implementation dependencies in this slice.
B10 provider delivery, B14 operating rehearsal, B15 legal wording, and B16
integration/approval remain separate release work and do not reopen B03’s
commercial lifecycle contract.

**Proposed B03 disposition: closure candidate — EVIDENCE PASS, REVIEW PENDING.**
