# B15 paid commitment and account boundaries

13 October 2026. Offline implementation; **B15 remains OPEN**. Eight scopes remain accepted. No production connection, deployment, worker admission, email delivery or paid opening is performed.

Edward confirms Property Listify and Dos Holdings are separate companies. Property Listify (Pty) Ltd remains the supplier. The certificate naming correction is his deferred follow-up. The inspected certificate, printed name and minimal registration fields remain preserved; registration evidence is not exact-copy approval.

## Invoice commitment

Agent, Agency and Developer invoice requests require an explicit, initially unchecked choice linked to the exact released Terms and Privacy Notice. The screen shows the canonical price and fixed 90-day, manual-EFT, no-automatic-renewal treatment. It discloses finance verification before access, non-VAT status, the Terms cancellation/refund route and support contact. Privacy acknowledgement is not blanket processing or marketing consent.

The strict browser envelope contains `bundleId`, `termsAccepted: true`, `purchaseAccepted: true`, and a displayed quote (`planId`, integer minor-unit `amountDue`, `currency: ZAR`). These quote fields are assertions to compare, never authority to set a price. The server resolves owner and canonical plan, validates the current approved release, then rejects a different plan/price before committing billing state. The server derives time, document versions/digests and commercial facts. Old, missing, false or injected choices are rejected. Clients clear the choice and refresh documents/catalog after a failed request; no automatic acceptance is inferred.

The canonical `billing_audit_events` journal records `invoice_commitment_accepted` with actor, billable account, subscription and invoice identities and the released-copy/commercial snapshot in `afterData`. It is committed in the same transaction as invoice creation. Reusing an outstanding invoice appends a fresh explicit commitment and preserves earlier events. Existing pre-launch accounts make this new purchase choice; no registration acceptance is backfilled. Express Agent intake, common tRPC intake, Developer wrapper and both Agency checkout route names forward the choice.

The approved release remains in `legal_releases`, using the existing locked current-release pointer. No additional schema, alternate ledger or runtime release installation is added. Runtime legal-copy tables remain read-only. The journal JSON references the bundle; it is not a new SQL foreign key. A future privileged archive/disposal operation must count these billing references as well as registration references before removing a release. The runtime has no release-deletion path. Global pointer serialization remains a B17 capacity measurement concern, not a measured throughput claim.

## Account boundaries

Distribution administrative approval/resend and manager-invitation completion now require an existing, verified self-registered account with stored registration evidence matching an approved historical release. They cannot create an account, assign a temporary password, overwrite an existing password, force verification or invent acceptance. Approval uses the application email and an already-associated account ID where present. Manager invitation completion requires the signed-in account to match the invited email and stored acceptance. Its UI directs the applicant through ordinary account registration/verification/sign-in and no longer asks for a new password. Distribution remains subject to its existing feature gate; this change does not admit it to the paid launch scope.

Agency and Developer private setup confirmations describe authority to prepare the organisation profile and accuracy of supplied information. They are not presented as recorded Terms or Privacy acceptance. Purchase acceptance is collected at the invoice boundary. Founder login and accepting an organisation invitation are not customer registration acceptance.

## Local evidence

The [sanitized verification receipt](evidence/b15-legal-acceptance-20261012/offline-consumer-verification-20261013.json) records the target, schema/foundation digests, separate test groups and teardown.

All database operations used only the exact owned disposable target, fingerprint `3d1259268441812f91c3ee04775defa67522ef1902bc72c3a97382fcf96d1bf4`, MySQL on port 3307. Fresh canonical migration application through `0114_user_legal_acceptances.sql`, physical congruency and canonical commercial foundation preparation/verification passed. The test release texts, approvals, bank details, session key and storage adapter were synthetic. They are not approved public copy or production provider evidence.

- 13 actual MySQL registration/identity tests passed, including verified-account linkage and rejection of mismatched stored digests.
- 10 actual MySQL purchase tests passed: explicit released evidence, existing-account treatment, invalid/stale/forged input, changed price, invoice reuse and a real audit FK failure rolling back invoice/subscription/account writes.
- 10 existing paid-launch MySQL scenarios passed through the governed test wrapper: all owner types, owner isolation, product containment, intake aliases, finance/proof/activation/expiry and stale-session rejection. This is local exercise with a synthetic proof-storage adapter.
- 28 client tests passed, including all three purchase payloads, unchanged preparation containment, exact links, unchecked choices, changed selection, unavailable copy and stale-response reset.
- 92 focused server policy/auth/router/containment checks and 720 database-authority static checks passed. Typecheck and production frontend build passed. Lint has no errors; existing warnings are reported separately. No configured full-CI or hosted acceptance is inferred.

The initial purchase fixture used arrays for canonical TEXT plan fields; the failed setup was audited and corrected to JSON text. No schema fallback, DDL repair or migration retry was introduced. The first broad local scenario run also exposed a missing synthetic JWT setting and one old test payload without the new purchase choice; those test inputs were corrected, and all ten scenarios then passed. Earlier failure diagnostics were retained locally.

Fixture installation uses its own authorized `test-fixture` connection so isolated CI runtime credentials do not need write access to legal-copy tables. After fixture cleanup, canonical foundation verification remained green; the exact target was disposed and the service stopped through the validated Unix socket. Recovery reported a clean stopped no-op.

## Remaining acceptance boundary

Final exact Terms/Privacy/Cookies/payment text, versions, digest and effective date still need approval. Provider/transfer and finance/legal retention review, disposal/hold procedures, enquiry notices, the protected legal-release installation/grant contract and specified hosted customer evidence remain. The certificate correction is a follow-up. Local implementation and preparation do not increase the accepted count or permit opening sales. The coordinated return-day exercise and B17 24-hour workload remain required.
