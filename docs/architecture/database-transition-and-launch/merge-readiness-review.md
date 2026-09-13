# PR 577 merge-readiness review

Date: 2026-09-13. Decision: HOLD; no merge or protected operation authorized.

Reviewed candidate: `5d95bfe6ae2e6036f2c89cb04cbc3729b955ceb1`.
Remote main: `c2158b5da27a4fde9e4329e276024e9ade570e4a`.
Hosted run: https://github.com/Doscoding187/real_estate_portal/actions/runs/34728422717

## Accepted evidence

All reported PR checks passed for the candidate. Downloaded original admission
artifacts are preserved under `evidence/run-34728422717`, with SHA256SUMS.
The credential artifact contains pnpm output before JSON; it is preserved verbatim.
Upstream artifact expiry is 2026-09-20. Actual engine is MySQL Community 8.4.7.
Physical schema is congruent, with 23/23 CHECKs enforced. Consumer contract,
Search-to-Lead readiness, physical constraint/lifecycle suites and implemented
credential probes passed. Original main manifest entries 0000–0065 compare
exactly equal to the candidate prefix; 0066–0090 extend that history.
This accepts isolated engine compatibility evidence, not Azure admission or
blanket review of all 295 changed files. Historical failed runs remain failures.

## Outstanding merge decisions

1. Deployment containment: railway.json starts the production process and
   vercel.json defines frontend deployment, but neither proves provider-side
   production branch settings, automatic deployment settings, active backend SHA
   or sanitized database target binding. Vercel preview deployments already
   occurred automatically. Obtain read-only provider settings evidence before
   approving main integration that might deploy incompatible application code.
   No production settings changes or database connections are authorized here.
2. Credential assurance: implemented probes passed, but observed SHOW GRANTS
   hashes are not semantic comparisons with intended grants. Plan and observed
   hashes encode different representations and cannot be compared for equality.
   Review normalized actual grants against the intended allowlist; runtime and
   worker GRANT/account-administration denials and both control-table write
   boundaries are not exhaustively tested by the present script. Do not claim
   comprehensive G2 approval from these artifacts alone.
3. Release scope: D-008 remains a proposal. Obtain Edward's product scope
   disposition and map exposed routes/workers to acceptance evidence. Confirm
   consumer and data-retirement dispositions for 0066–0090; an empty fresh chain
   alone does not prove historical business-data cleanup safety.

## Gate sequencing

G1 isolated MySQL 8.4.7 proof is accepted as evidence; D-002/D-003 final admission
remains separate. G2 has partial physical proof, not full security approval.
G3 remains open. Post-merge SHA verification is a post-merge release gate,
not a logically impossible prerequisite to integration. A contained integration
merge can be considered separately from production launch once the above
review and deployment boundaries are resolved. Capacity, Azure recovery and
TiDB transfer proof remain required for launch, not ordinary code integration.

No merge, Azure/TiDB access, database mutation or deployment setting change
was performed in this review. No claim is made that all 352 commits have
received a complete product/security review. Existing quarantined evidence
and the successful local target remain unchanged.

## Follow-up evidence and execution decision (2026-09-13)

GitHub deployment history records Vercel Production deployment `6318628509`
and Railway production deployment `6318616131` for current main SHA
`c2158b5da27a4fde9e4329e276024e9ade570e4a`. Railway also recorded Testing
`6318616125`. These establish prior production integrations, not present provider
settings or a live database fingerprint. No provider connector or installed CLI
is available in this session. Edward has been asked for non-secret current
production auto-deploy settings. Do not infer isolation from green preview checks.

Before a contained integration merge, the operator must identify the Railway
production service and Vercel production project, record connected branches and
auto-deploy behavior, and provide evidence that this merge will not release the
candidate against an unadmitted database. If pausing auto-deploy is needed,
propose that exact settings change and obtain authorization; no such settings
change is performed or approved by this report. Do not use GitHub environment
names as database authority or substitute a production startup failure for
release containment.

The grant-verifier follow-up compares the actual direct privileges with the
canonical isolated CI grant plan. Its restricted parser rejects unsupported
role/proxy/column/grant-option syntax, extra privileges and missing privileges.
USAGE on *.* is treated only as the no-privilege account entry. Unit tests cover
these failures; new hosted proof remains required. Both runtime identities now
probe both control-table write denials and grant delegation denial. Actual
production grants and provider-side inherited roles are still a separate gate.

## Proposed minimum launch scope for Edward's decision

Keep public discovery and consented enquiries as the proposed initial surface,
with named agency/developer authoring cohorts only after tenant, authentication,
recovery and audit acceptance. Payment/subscription charging stays Hidden until
provider and entitlement lifecycle evidence is accepted. This recommendation
changes no product switches and grants no Live status.

Correction to the admission packet's earlier scope suggestion: founder/admin
operations cannot simply be labeled Hidden and omitted from launch evidence.
A restricted operational path for enquiry handling, moderation, account support,
incident response and audit is required even for a discovery-only launch. Public
visibility and operational necessity are separate. Edward must also confirm
whether this enquiry-only launch meets the business objective; paid launch
requires the payment and webhook evidence rather than a scope waiver.

The central launch register is still an empty template. A complete entry for
each proposed exposed journey must contain the approved disposition, owner,
exact source SHA and corresponding evidence before launch admission. CI success
alone must not populate these records as production-verified.
