# B15 retention and provider recommendations

12 October 2026. **Founder-confirmed business schedule; conditional reviews and implementation remain open.** This
continues [packet 32](32-b15-offline-copy-and-consent-2026-10-12.md). Edward
owns every operational row unless an explicit delegate is recorded. Edward replied “confimed” on October 12 to the proposed schedule, including
its stated finance/legal review conditions. This confirms the business direction,
not statutory applicability, disposal implementation or exact public copy. No period
below is operational merely because it appears here; no deletion, provider change,
archive removal, database creation or protected connection occurred.

## Concrete retention recommendation for founder review

These are proportionate starting proposals for the small founder-operated
launch. Ordinary operating periods are product recommendations, not statutory
requirements. A valid privacy request can require earlier action. A documented
legal obligation or hold can require later action; preserve only relevant
records and restrict access while held.

| Category | Proposed period / trigger | Disposal and operational treatment |
| --- | --- | --- |
| Ordinary profile/contact/organisation data | Active account; after confirmed closure, complete review/disposal within 90 days | Remove/de-identify information no longer needed; separate finance, unresolved obligations and minimum legal evidence. Paid expiry alone does not close an account. Review dormant unpaid accounts after 24 months of no activity; notify before any closure, rather than silently deleting active organisations. |
| Private drafts and unused uploaded media | Review after 90 days without draft activity; dispose within 30 days of a reviewed abandonment/closure decision | Notify an active owner before removing a recoverable draft. Prove no live draft/listing references each object. The 90 days is a review trigger, not permission to purge all old media. |
| Withdrawn/expired public listings and related media | Remove from public presentation under product rules; retain private record for 180 days after withdrawal unless a current purpose or hold requires it | Clear public caches and live references through reviewed controls; isolate content needed for dispute evidence. Never apply listing expiry indiscriminately to development/unit ownership. |
| Enquiries | 12 months after latest meaningful follow-up or resolution | Keep unresolved cases accessible to the authorised custodian; paid expiry does not erase an outstanding enquiry. Remove/de-identify finished enquiries after review. Recipient-owned copies have separate responsibilities. |
| Finance/accounting records | Recommended policy: current financial year plus previous seven completed financial years; apply any longer relevant tax/dispute obligation | Accounting reviewer must classify invoice, receipt, reconciliation and supporting proof records and the exact triggers. Keep payment-proof files on the same schedule when they are necessary supporting accounting evidence; do not assume every full attachment needs that period. Preserve relevant records during audits/disputes. |
| Application transactional-email records | 90 days after terminal delivery/reconciliation outcome | Pending, retrying or unknown-outcome work remains until resolved; minimise message bodies/recipient metadata when not needed. Provider-side periods are separate below. Finance evidence needed longer is kept with finance records, not by preserving every email. |
| Ordinary support/privacy cases | 12 months after resolution | Preserve a minimal completion trail; unresolved requests and justified holds remain restricted. Reassess attachments and unnecessary identity evidence separately. |
| Routine security/operational audit events | 90 days from event; incident records reviewed 12 months after resolution | Separate routine telemetry from identified incident/dispute evidence; no passwords, tokens, complete payment proofs or full sensitive payloads in logs. |
| Terms acceptance and approved copy archive | Active relationship plus proposed three years after closure; legal review required before adoption | Keep only necessary user linkage, released copy identity/digests, server time and collection source. Do not cascade away valid evidence on closure or block a valid deletion request indefinitely. Do not claim three years is a statutory prescription period. |
| Azure rolling recovery backups | Retain evidenced 14-day setting as the current starting position | Independent recovery/custody and deletion-on-restore controls still require verification. This setting is not long-term finance archiving or a measured recovery result. |
| Frozen historical source archive | Preserve now; mandatory disposition review within 30 days after B09 category acceptance | Review deadline is not automatic deletion. Edward decides the justified remaining purpose, hold, custody, next review and eventual removal approval. Do not import it into fresh customer accounts. |

Proposed execution model: one monthly, recorded founder review of due records,
with a governed selection/dry-run and bounded disposal approval. Automating
purges is a separate implementation decision; this proposal does not authorize
bulk deletion. A monthly review must still meet each approved disposal deadline.
Customer text cannot promise these periods until the signed schedule and the
matching disposal/hold/recovery capability are verified.

### Finance review basis

Do not use “five years” as one universal finance rule. Companies Act section
24 distinguishes company records and accounting financial-year retention;
SARS tax requirements depend on return and audit/dispute status. The suggested
accounting schedule above follows the current-year/seven-completed-years
structure and must be reconciled to the applicable tax duty. [Department of
Justice Companies Act, section 24](https://www.justice.gov.za/legislation/acts/2008-071.pdf),
[SARS record keeping](https://www.sars.gov.za/client-segments/record-keeping/).

The SARS page also identifies an authorisation question when electronic tax
records are held outside South Africa. Because private proof storage is in
`eu-north-1`, the accounting reviewer must determine which files are required
tax records and whether the existing records arrangement/authorisation is
sufficient. This is a concrete classification review, not a conclusion that
the present company arrangement is noncompliant. No provider migration is
proposed. [SARS record keeping](https://www.sars.gov.za/client-segments/record-keeping/).

## Provider register: evidence recovered offline

[Sanitized retained facts](evidence/b15-retained-provider-facts-2026-10-12.json)
identify source paths and SHA-256 hashes without credentials or variable
payloads. Configuration dates are carried as historical observations; they
are not represented as fresh live reads.

| Provider / concern | Established from retained evidence or provider documentation | Remaining tenant verification |
| --- | --- | --- |
| Azure MySQL | Retained October 10 server response: South Africa North; automated backups 14 days; geo-redundant backup Disabled | Current setting/readback, independent application/object restore, diagnostic/audit-log configuration and applicable processing agreement |
| Railway API/workers/Redis | October 12 contained configuration has five service entries selecting `asia-southeast1-eqsg3a`; attached volume uses the same region. Lead/Email IDs match packet 31. The region maps to Singapore. Stored configuration does not prove held-worker processing. [Railway regions](https://docs.railway.com/deployments/regions) | Resolve each active service/deployment tuple; Redis persistence/TTLs; actual account plan/log entitlement and processor agreement; preserve the unrelated staged service deletion |
| Railway logs | Published plan-dependent retention: Free 3 days, Trial/Hobby 7, Pro 30, Enterprise up to 90. These are provider documentation values, not this account's approved schedule. [Railway logs](https://docs.railway.com/observability/logs) | Funding refusal does not establish an effective plan or current accessible history; exact plan/retention remains unresolved |
| Resend routing vs storage | September 30 verified-domain read records sending `eu-west-1`. Provider states message content/delivery logs/webhook and account data are stored in the US; sending region does not choose storage region. Standard Free/Pro/Scale email/log retention is 30 days, backups 7 days, remaining data removal within 90 days of termination; Enterprise can differ. [Resend data handling](https://resend.com/security/gdpr) | Account plan/overrides; retrieve account DPA copy via existing operator access; review the applicable South African transfer basis. No mail was sent for this reconciliation |
| Vercel frontend | October browser artifact identifies actual deployed frontend. Current runtime-log documentation lists Hobby 1 hour, Pro 1 day, Pro/Enterprise with Observability Plus 30 days, ordinary Enterprise 3 days. Older generic “3 days” documentation must not become a tenant claim. [Runtime logs](https://vercel.com/docs/logs/runtime) | Actual plan, drains/observability and log classes; globally delivered static assets do not have one tenant-exclusive serving country |
| Vercel transfers | Public DPA permits US and other processing locations and identifies contractual processor responsibilities. That document is a review source, not proof of a company-specific POPIA conclusion. [Vercel DPA](https://vercel.com/legal/dpa) | Retained account agreement/subprocessor evidence and reviewed transfer treatment |
| AWS public media/private proofs | October 2 storage readbacks and October 12 worker settings retain `eu-north-1`; private-proof scope/versioning/encryption evidence already exists in packet 29 | Current hosted owner/wrong-owner proof and lifecycle/log settings; preserve independent restore obligation; no automatic retention policy is inferred from versioning |
| AWS CloudFront | Public media edge delivery is separate from S3 origin location. A storage-region statement cannot confine all edge processing to that country. [AWS CloudFront data protection](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/data-protection-summary.html) | Actual logging settings, signed/account processing terms and current external-delivery inventory |
| Google Fonts/Maps and Unsplash | October browser inventory proves these actual external requests. Google explains external-service information handling; Unsplash describes automatic IP/referral information and purpose-based retention. [Google services on other sites](https://policies.google.com/technologies/partner-sites), [Unsplash privacy](https://unsplash.com/privacy) | Service-specific terms, locations/retention and collection safeguards; no geolocation permission or map interaction was exercised |

Source configuration alone cannot establish that a public DPA has been reviewed
and is adequate for the company's particular transfer. No account agreement is
signed, provider contacted, resource provisioned or global logging changed by
this packet. Existing browser observations remain the display/storage baseline.

## Archive preservation: reuse, do not recapture

The October 1 frozen TiDB archive manifest records 218 tables and 152 total
rows, authenticated readback and frozen-source evidence. The retained encrypted
file's SHA-256 matches its manifest. This review read existing metadata and
hashed ciphertext only; it did not decrypt, census again, or connect to TiDB.
The archive is not the current Azure recovery copy and does not replace B17.
Its final owner/location/custody and purpose review still belong to B09.

## Consent implementation progress and limits

`server/services/legalAcceptancePolicy.ts` now implements the database-free
validation core. It binds approval to fixed v1 serialization of exact Terms/
Privacy text, versions, bundle identity and effective time; derives public
disclosure links and accepts only an explicit true choice for the current
trusted bundle. Draft/unresolved/altered/future-effective releases and malformed
choices are denied. The browser cannot supply approval, timestamps, user IDs,
digests or bundled marketing permission.

The module selects no production release, creates no endpoint, changes no
registration form and writes no evidence. It must consume a server-owned,
immutable reviewed registry; a request-supplied release is prohibited. The
actual registration transaction, canonical evidence schema, account-deletion
treatment and alternate-creation paths remain to implement after the required
business decisions. A hash is integrity evidence, not founder approval or
proof that a user actually saw the page.

Validation passed: 35 focused policy tests, `pnpm check`, ESLint for the two
new source/test files, Prettier check, packet link/digest checks and whitespace
checks. The focused tests ran with `SKIP_DB_INIT=1` and an empty `DATABASE_URL`;
no database or provider initialization occurred. All release text/approvals in
the tests are synthetic fixtures, not an approved customer bundle. Full CI,
registration integration and actual durable evidence are not claimed.

## Next review decisions

Edward has confirmed the proposed operating periods subject to the stated
finance/legal review conditions. Those rows still require their named review.
Edward subsequently confirmed that 96 Jorissen Street, Braamfontein can receive
legal documents and supplied director name Lehlohonolo Banda. He stated that
the company has no accreditation or dispute-scheme membership. Johannesburg,
Gauteng, South Africa, complete registered name and sole-director status were
then confirmed. No subscribed code subsequently confirmed; publication was not inferred. Exact resolved customer text/version/effective-date approval still
precedes publication under plan 24. Hosted evidence follows packet 30 and the
return-day sequence; B15 remains OPEN and the accepted-scope count stays eight.

Company facts are incorporated in [review 0.6](evidence/b15-founder-review-2026-10-12-v0.6.md), an unapproved internal candidate. Prior candidate bytes and checksums are preserved.

Latest factual candidate: [review 0.7](evidence/b15-founder-review-2026-10-12-v0.7.md). No code membership is confirmed; Information Officer registration remains outstanding. This candidate is not approved public copy.
