# MVP1 AWS storage hardening — preparation and evidence

## Release boundary

Task branch starts from merged release `cbc18c8fdfb0a900c7255ca695da56bd9a7660c3`.
Retain `listify-properties-sa` in `eu-north-1` and CloudFront distribution
`E3JNW2EP3Z3JSP` on the accepted Free plan. No database schema changes,
Western Cape 0099, Explore, managed video, or paid plan upgrade belong here.
The US$15/month approval covers aggregate incremental services; it is not a
separate storage allowance or an enforced spending cap.

Policy JSON files in `scripts/storage/` are proposed desired configuration,
**not evidence of applied settings**. Do not apply the final bucket policy or
public-access blocks before the dependency checks below. The runtime policy
is a complete intended media permission set, not a restriction imposed merely
by attaching it alongside broader policies. Reconcile identity policies,
group memberships and permission boundaries first.

## Readbacks recorded on 1 October 2026

The existing media credential could read S3 configuration and inventory, but
CloudFront and IAM administrative reads were denied. Edward obtained the
CloudFront readback through existing operator CloudShell access:

- Distribution is enabled and `Deployed`; domain is
  `d3fz99u3go2cmn.cloudfront.net`. Default behavior permits GET/HEAD only,
  redirects HTTP to HTTPS, and has no alternate behaviors or edge functions.
- S3 origin has OAC `E2XEB397I9DXGN`, no origin path and no legacy OAI.
  OAC signing is `always`, protocol `sigv4`, origin type `s3`.
- Cache policy `658327ea-f89d-4fab-a63d-7e88639e58f6` is
  `Managed-CachingOptimized`: minimum/default/maximum TTL 1/86400/31536000
  seconds, Gzip and Brotli enabled, no headers/cookies/query strings in its key.
- Operator's full distribution backup remains private in CloudShell as
  `property-listify-cloudfront-before.json`; SHA256
  `f8e6f4da868c493315b08456fbfd0d18e78faf9fa52905c8b3ffeb34ce5335ce`.
  The agent has reconciled the pasted fields, not independently downloaded
  that complete backup.

S3 snapshot found 2,258 objects (1,493,411,083 bytes), including 2,251 under
`properties/` and seven under `videos/`. Preserve all of them. Existing AES256
encryption and BucketOwnerEnforced ownership are present; versioning is off
and no lifecycle is configured. All four public-access block settings are
false. Bucket policy grants anonymous reads and unconditional anonymous PUT
on `videos/*`; the latter is not made presigned-only by its statement name.

Edward executed the bounded removal script through operator CloudShell.
It reported PASS for post-write policy readback: before SHA256
`7d4695e47cde20fde2a4861f7392ad0cfeb4af3f7b09de250314ff2093a636cf`,
after SHA256
`b537cdf44d7ad58e8840ecc0f58f77121c9c6d78eceabb5de116ba6aebd3a508`.
Private full before backups remain in operator CloudShell directory
`/home/cloudshell-user/property-listify-storage-before-_1i7ks69`.
This removes only the anonymous-write grant. Public reads, existing objects,
IAM, CloudFront, CORS, encryption, versioning and public-access blocks were
preserved. Hosted upload denial has not yet been demonstrated.

The operator then executed the fresh origin probe. Private evidence remains
in `/home/cloudshell-user/property-listify-origin-probe-howliu9g`.
It reported unsigned direct-S3 GET 403, a fresh CloudFront miss with HTTP 200
and matching payload hash, and successful restoration of the post-containment
policy. One harmless task-owned object was retained. This verifies an
authenticated origin read, not production-browser upload or private proofs.

The operator IAM readback identifies user
`arn:aws:iam::914683204061:user/vercel-s3-uploader`, with no permissions
boundary or inline policies and attached AWS managed `AmazonS3FullAccess`.
The managed policy allows all S3 and S3 Object Lambda actions on all
resources. Operator readback confirms default version `v2`, created
27 September 2021. A successful retry confirms no group memberships. Do not treat attaching
the proposed narrow policy as removing the existing full-access grant.

An authenticated in-memory inventory of the frozen TiDB archive inspected
152 retained rows and found no absolute URLs referencing this media bucket
or CloudFront domain. This does not inventory current Azure rows or prove
that relative media references are absent. No plaintext archive was written,
no source connection was opened, and no legacy records were imported.

The proof provisioning operator phase reported configuration PASS for new
bucket `listify-paid-proofs-914683204061-eun1-290496c0` and IAM user
`listify-paid-proof-runtime-290496c0`. Private state remains in CloudShell at
`/home/cloudshell-user/property-listify-private-proof-provision-20261001`.
AES256 encryption, public-access blocks and versioning were read back; no
lifecycle expiry or runtime key was created, and existing media/production
bindings were preserved. Recovery and runtime access subsequently passed the
separate verification and local transfer phases below; hosted authorization
remains pending.

Private evidence is in
`~/.local/state/property-listify/mvp1-aws-storage-hardening-20261001/`.
Keep raw inventories, credentials, signed URLs and document contents outside
the repository. Record sanitized hashes and outcomes here after execution.

The subsequent operator `--verify` phase passed private configuration,
historical-version recovery, restored-current hash verification and anonymous
403 denial. The dedicated access key was exported encrypted; independent local
retrieval matched the operator-supplied SHA256
`b148fcd0e5085fc868531c4655f12ce6863222d7f8bf58e2da753f96ba60236f`.
Decryption used the existing local transfer key, whose derived public key
matched the provisioning key. The private key remained local.

Independent live tests authenticated the exact dedicated proof IAM user,
conditionally wrote one unique task-owned versioned object, and read back its
payload hash and AES256 encryption. Bucket listing, bucket-versioning
configuration reads, historical-version reads, media-bucket writes,
outside-prefix writes and task-object deletion each returned
AccessDenied/403. The task object remained intact and is retained. These are
bounded runtime permission tests, not infrastructure-write permission
simulation or hosted customer-owner isolation. Credentials and object/version
identifiers remain in mode-0600 private files; no production binding occurred.

Independent agent readback after containment matched the operator's policy
hash. All 2,258 original object metadata records were unchanged and none were
missing; the only addition was the 71-byte task-owned origin-probe object.
Using the existing media identity, private-proof bucket listing and versioning
inspection returned AccessDenied/403. This demonstrates rejection of that
different AWS principal, not hosted customer-owner isolation or a test from
a separate AWS account. Fresh readback of the stopped production API's stored
variables confirmed the expected media bucket, region and CloudFront URL.
New proof and media runtime deployment bindings remain pending. A limited
published-frontend static inspection did not establish its CDN build setting;
the subsequent saved-setting confirmation and completed Azure inventory below
resolve those configuration/inventory prerequisites. Exact production-build
and hosted verification remain required before accepting the cutover.

## Completed prerequisites and remaining execution order

The numbered phases retain their original dependency order. Completed operator
phases must not be rerun as provisioning tasks.

[Sanitized continuation evidence](evidence/mvp1-aws-storage-hardening-20261001/continuation-verification.json)
records transfer/runtime results, private evidence hashes, completed inspection,
containment limits and the remaining gates without credential values.

| Action                                                             | Current evidence / disposition                                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing media IAM/configuration capture                           | Complete for the recorded uploader baseline, group absence, managed policy and private operator backups. Dedicated media identity is now provisioned and independently tested; existing uploader remains unchanged. |
| Anonymous media write containment                                  | Complete; independent valid unsigned PUT returned 403 and the canary hash was unchanged.                                                           |
| Authenticated CloudFront origin probe                              | Complete; direct S3 403, fresh CloudFront miss 200, matching hash and policy restoration.                                                          |
| Private proof bucket/user provisioning                             | Complete; encryption, ownership, blocks, versioning and scoped policy readbacks.                                                                   |
| Private proof recovery and encrypted key export                    | Complete through operator verification; independent ciphertext checksum and local decryption passed.                                               |
| Dedicated proof runtime permissions                                | Complete for live bounded positive/negative operations described above; credentials remain local.                                                  |
| Cost-alert configuration                                           | Complete per Edward’s operator report: budget creation and all three recipient readbacks passed. Email delivery remains unverified. |
| Current media URL dependencies                                     | Azure inventory complete: 214 canonical tables / 1,450 rows, zero matched references. Production VITE CloudFront setting saved per operator report; exact build/hosted verification pending.                                                                                 |
| Final media policy, public-access blocks, scoped identity and CORS | Complete: operator PASS, independent policy/blocks/CORS/object readback, encrypted transfer/decryption and local dedicated runtime tests. Hosted browser effect remains pending.                                                                                   |
| Production binding/deployment and hosted journeys                  | Pending checklist 28 containment, exact artifacts, attended operator and hosted upload/display plus proof-owner isolation.                         |

1. **Recorded baseline complete.** Keep IAM permission capture current through the operator path. Capture any
   identity/group managed and inline policies and relevant boundaries; retain
   immutable private copies of all prior configurations. Verify account and
   bucket identity before every mutation.
2. **Inventory/configuration prerequisites complete; hosted effect pending.** Canonical Azure inspection found zero bucket/domain/relative-media references in 214 tables / 1,450 rows. The stopped API configuration matches the retained CDN and Edward confirmed saving the Production browser setting. No URL rewrite was required. Verify that setting in the exact joined production build.
   Existing MVP1 upload code uses signed S3 PUT, then CloudFront delivery when
   configured. Browser upload calls set Content-Type; the proposed production
   CORS file therefore permits PUT from the two explicit production origins.
   Image display through CloudFront does not require PUT on CloudFront.
   Confirm actual browser preflight before accepting this CORS configuration.
3. **Complete; do not repeat removal.** The bounded removal removed the anonymous-write statement while preserving the remaining policy
   during dependency verification. Compare the latest policy with the captured
   baseline before writing; stop if an unrelated concurrent change appears.
   `scripts/storage/aws-media-remove-public-write.py --apply` prepares private
   S3/CloudFront/IAM backups under the operator home directory, checks the
   expected account and bucket owner, and performs only this policy removal.
   It refuses execution through the application uploader identity. Without
   `--apply`, it prepares backups and the proposed policy without mutation.
   Operator application and independent policy/object-preservation readbacks passed.
4. **Complete; retain the recorded prerequisite evidence.** The origin test created a unique task-owned media test object without replacing an existing
   key. For an authenticated-origin test while public read remains, restrict
   **only that exact test object** to the distribution SourceArn. Require
   unsigned S3 denial and a fresh CloudFront miss with matching payload hash.
   A successful cached image or an unrestricted public object is insufficient.
   Record the temporary restriction and restore the preceding policy after
   this prerequisite test. Never apply it to an existing media prefix.
   The bounded `aws-media-origin-probe.py --apply` operator program performs
   the prerequisite test against the exact recorded post-containment policy,
   restores that policy immediately afterward using guarded readback, and
   retains the harmless task-owned object. It leaves existing media unchanged.
5. **Complete; do not replay the application.** The reviewed CloudFront-only policy, all four public-access blocks and production CORS were applied and read back. Operator fresh CloudFront miss/hash, unsigned S3 read/write rejection and allowed/denied preflights passed. Independent agent configuration/object readback matches, with unchanged encryption, ownership and versioning.
6. **Provisioning, transfer and independent runtime tests complete; binding pending review.** The isolated identity is `listify-media-runtime-07394cfd`. Existing IAM users are unchanged; do not provision another. Its encrypted export matches the pasted SHA256, decryption used the existing transfer key and live local PUT/GET/DELETE plus six real AccessDenied checks passed. Bind only after checklist 28 review, using the media operations in
   `media-runtime-policy.json`. It grants no infrastructure provisioning,
   bucket administration, listing, version deletion, or Explore writes.
   Use an isolated identity if changing the existing uploader would affect
   another consumer. Do not broaden application credentials for provisioning.
7. **Complete; do not provision another bucket/user.** Provisioning created a separate private proof bucket and dedicated runtime identity.
   Require AES256 encryption, BucketOwnerEnforced, all public-access blocks,
   TLS, versioning, no CloudFront access, and PutObject/GetObject only on
   `billing-proofs/*`. No browser CORS is needed for accepted server-side proof
   upload/retrieval. Retain current and noncurrent versions indefinitely until
   an approved retention rule exists; do not add automatic deletion.
   `aws-private-proof-provision.py --apply --public-key runtime-transfer.public.pem`
   creates only a new task-owned private bucket and proof IAM user. It denies
   all S3 access from other principals, including the existing broad media
   user; the proof runtime, the recorded operator and account root are the
   only principal exceptions. The runtime IAM policy grants only PutObject
   and GetObject within `billing-proofs/*`, without infrastructure rights.
   The operator uses existing access; no existing IAM user is modified.
   Minimum write permissions cover CreateUser/TagUser/PutUserPolicy on the
   new user and CreateBucket/PutBucketPublicAccessBlock/PutBucketOwnershipControls/
   PutEncryptionConfiguration/PutBucketVersioning/PutBucketPolicy/PutBucketTagging
   on the new bucket. An assumed-role operator additionally needs GetRole
   for its own role to resolve the policy's canonical PrincipalArn.
   Readbacks require the corresponding S3 reads and GetUserPolicy.
8. **Complete, including export retrieval/decryption and live runtime tests. Do not rerun `--verify`.** Verification recovered a unique task-owned versioned object through an operator identity,
   recording hashes/version metadata privately. No existing object may be
   overwritten or deleted. Versioning incurs retained-version storage charges.
   The completed verification followed the 15-minute versioning propagation
   wait and used the provision program with `--verify` instead of `--apply`.
   It checked the saved configuration before task-object writes, verified
   historical and restored-current hashes plus anonymous denial, and only
   then created the dedicated access key. Key material was exported encrypted
   with the task public RSA key using OAEP/SHA256. The private transfer key
   remains on the local machine; do not upload it or either archive key.
   CreateAccessKey requires permission only on the new proof user; recovery
   needs PutObject/GetObject/GetObjectVersion/DeleteObject on the unique test
   object. DeleteObject creates a marker; no version is permanently deleted.
   If provisioning or verification is interrupted, preserve the recorded
   directory and reconcile the exact last operation before resuming. A
   completed or partially attempted verification refuses an automatic rerun.
   `aws-proof-runtime-verify.cjs` verifies the independent operator checksum,
   existing local transfer key, exact bucket/user, decrypted envelope and live
   bounded permissions before persisting local runtime credentials. It never
   binds a hosting service. Preserve its private output directory.
9. **Pending.** Coordinate runtime credentials and application deployment under checklist
   28 containment. Verify actual authenticated production-domain browser
   upload/display and proof owner authorization, wrong-owner rejection and
   anonymous rejection. SDK and local tests do not satisfy hosted journeys.
   Keep intake closed and retired TiDB writers stopped throughout.
10. **Alert configuration complete; receipt/aggregate monitoring pending.** Budget creation and all three recipient readbacks passed per Edward’s operator report. Do not recreate the budget. Record cost assumptions and
    monitoring. Alerts notify; they do not prevent spending. AWS alerts alone
    do not monitor Railway/Azure aggregate usage. Platform recovery remains
    separate from the already completed encrypted source archive.

## Recovery and rollback

Retain private before snapshots and record each applied configuration hash.
Keep runtime credential rollback material private and available until hosted
verification completes. Recover a versioned test object through a separate
operator identity; runtime does not need DeleteObjectVersion or bucket-admin
rights. If delivery fails, hold further release steps and investigate OAC,
policy and URL configuration. Do not restore anonymous upload permission.
Any exceptional restoration of public read requires an explicit bounded
release decision after the cause and affected dependency are demonstrated.
Do not delete a provisioned proof bucket or its retained evidence as rollback.

## Acceptance still outstanding

Anonymous-write containment, fresh authenticated CloudFront origin access,
private-proof provisioning, version recovery, encrypted key transfer and
bounded dedicated proof and media runtime permissions have passed. S3 cost-warning configuration and all three recipient readbacks also passed per Edward’s operator report. The canonical Azure inventory and operator-confirmed frontend setting are complete. Hardened anonymous
read/write denial, scoped media runtime IAM and production
CORS have passed the operator and independent readback checks recorded below. Exact frontend build verification, alert email delivery/aggregate monitoring, production
bindings and hosted browser/owner checks remain unverified. The previous USB physical-removal custody item
remains outstanding without repeating completed archive capture/readback.
Storage acceptance alone cannot close the release register or open payments.

## Incremental storage estimate

Use conservative retail pricing without assuming any account credits. The
retained media baseline is existing usage, not a new storage allowance.
At the captured eu-north-1 Standard rates ($0.023/GB-month, $0.005 per 1,000
PUT-class requests and $0.004 per 10,000 GET-class requests), an example of
20 MB of retained proof versions, 1,000 PUT-class and 10,000 GET-class requests
adds approximately $0.00946/month before data transfer, taxes and other
services. This is a stated usage example, not a billing promise or limit.
More retained versions and traffic increase cost. Workers and recovery are
part of the same US$15 aggregate approval and must be included in monitoring.
Edward selected `finances@propertylistifysa.co.za` as the notification
recipient. Budget creation and all three recipient readbacks passed per Edward’s operator report. Email delivery remains unverified.
No new AWS account is required. Alerts do not
enforce a cap; CloudFront allowance monitoring and other-provider spending
must be reconciled with the aggregate operating ledger.

`aws-storage-cost-monitor.py --apply-alerts` has already created the monthly
S3 cost-warning budget; do not run it again. The budget has a US$1 notification
threshold, actual notifications at 80%/100% and forecast at 100%. This includes
existing S3 usage across the account and excludes credits/refunds/discounts
from its conservative cost measurement. The threshold is an early warning,
not another budget approval or a spending cap. No action-enabled budget,
paid budget report, extra CloudFront metric or CloudWatch alarm is enabled.
AWS documents ordinary budget monitoring/notifications as free of charge.
The same program without `--apply-alerts` is read-only and records available
month-to-date default Requests/BytesDownloaded metrics for this distribution
in us-east-1. Missing points are reported as missing evidence, not verified
zero usage. Metric lag and the billing/plan dashboard remain explicit limits.
Minimum operator permissions are CloudWatch GetMetricStatistics and the
budget creation/read/notification/subscriber operations for this new warning;
do not add these rights to runtime identities. Configuration verification is complete.

The [operator configuration record](evidence/mvp1-aws-storage-hardening-20261001/cost-alert-configuration-verification.json)
distinguishes Edward’s successful operator readback report from downloaded raw
CloudShell evidence and from email delivery. `--verify-alerts` reads the existing
budget and all three subscriber lists without creating or modifying a budget.
It accepts omitted `ThresholdType` for these percentage notifications, preserves
the omission in subscriber lookups, and rejects explicit absolute/null types or
changed thresholds/recipients. Five regression tests cover this behavior and
the read-only command boundary. This local fix does not repeat budget creation.

The subsequent [network prerequisite readback](evidence/mvp1-aws-storage-hardening-20261001/media-network-prerequisites.json)
records TCP timeouts from this machine and the existing Testing container.
Testing’s observed egress address does not match the four current production
Azure firewall rules. These probes sent no database credentials or SQL.
This supports a network prerequisite failure, without claiming it is the sole
cause of every earlier connection error. That dated diagnostic did not change
firewall rules or Testing configuration. The later bounded network exception
and successful inventory below supersede its pending inventory disposition.
The subsequent Vercel setting correction is recorded below. Final operator
media application/readbacks and joined deployment remain prerequisites for
hosted upload/display and proof-owner isolation tests.

## Subsequent frontend configuration checkpoint — 2 October

Edward’s Production dashboard screenshot shows the existing unprefixed
`CLOUDFRONT_URL` at the expected distribution. The browser media resolver reads
`VITE_CLOUDFRONT_URL` or `VITE_ASSETS_BASE_URL`; neither appears in that supplied
Project list. Edward subsequently confirmed saving a separate Config variable
`VITE_CLOUDFRONT_URL=https://d3fz99u3go2cmn.cloudfront.net` for Production after
correcting a pasted-key validation error. `VITE_ASSETS_BASE_URL` is unnecessary
with that setting present. The [operator setting record](evidence/mvp1-aws-storage-hardening-20261001/vercel-production-media-setting.json)
distinguishes the screenshot, saved-setting report and still-pending exact
production-build/hosted verification. No joined deployment or paid opening is
claimed. Refresh the deployment hold before promotion; do not redeploy solely
to apply this setting outside checklist 28.

## Subsequent Azure dependency and media operator checkpoint — 2 October

The [protected read-only inventory](evidence/mvp1-aws-storage-hardening-20261001/azure-media-dependency-inventory-20261002.json)
completed through the existing inspector and canonical connection authority,
at exact production fingerprint
`b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.
A consistent read-only transaction scanned 214 canonical tables / 1,450 rows
and found zero matches for the media bucket, CloudFront domain or relative
`properties/` and `videos/` paths in canonical string/JSON columns. No database
rows, schema, credentials or application bindings changed. This bounded scan
does not inventory external consumers or prove the frontend artifact.

Edward authorized a temporary single-computer IPv4 rule after the narrow-route
proposal. The first CLI timeout was reconciled against live state and Azure
activity before continuation; it was not treated as a failed mutation to replay
blindly. The subsequent scan completed, the task rule was removed, and all four
original firewall rules match. No broad rule or old backend restart was used.
The original failed local/Testing inspections remain historical evidence.

A fresh read-only S3 snapshot records 2,260 objects / 1,493,411,221 bytes.
The [operator preparation record](evidence/mvp1-aws-storage-hardening-20261001/media-hardening-operator-preparation-20261002.json)
records the unchanged post-containment policy and broad CORS baseline.
That is the historical preparation snapshot. The subsequent operator
`aws-media-hardening.py --apply` execution and independent readback are complete,
as recorded below. Do not rerun the apply command or recreate its runtime user.

Use the existing public transfer key; its private counterpart remains local.
The program checks account, key and exact baseline, privately backs up current
configuration/object metadata, applies the reviewed policy/all four public
blocks/scoped CORS, and verifies fresh CloudFront delivery plus unsigned S3
read/write rejection and allowed/denied preflights. It creates one isolated
media user, tests actual media PUT/GET/DELETE and bounded denials, and exports
only RSA-OAEP encrypted credentials. It verifies existing objects and unchanged
encryption, ownership and versioning. It does not change existing IAM users,
application bindings, database data, budgets or payment intake. The old uploader
is not claimed retired by this step.

The downloaded `media-runtime.encrypted` and `result.json` were privately copied
and checked against Edward’s separately pasted ciphertext SHA256
`4b5a32bf0b8d81dbb788e914916b71aed78f848ed980d7b62c7367009f195807`.
Decryption with the existing local transfer key passed. The isolated user
`listify-media-runtime-07394cfd` was independently verified by STS before a
task-owned object was written. Media PUT/GET/hash and DELETE passed; bucket
listing, CORS/encryption/policy reads, cross-proof read and outside-prefix write
returned actual AccessDenied/403. Missing objects or expired credentials are
not accepted as denials. An independent authenticated HEAD confirms the local
canary was deleted (NotFound/404). Credentials are local mode-0600 files only.

The [execution record](evidence/mvp1-aws-storage-hardening-20261001/media-hardening-execution-20261002.json)
distinguishes operator origin/preflight checks, independent agent S3 readback
and live local credential checks. All 2,260 baseline object metadata records
remain unchanged; the only retained addition is the harmless 67-byte origin
probe. Existing uploader IAM was not narrowed or retired by this isolated-user
step. No production binding or hosted acceptance is claimed. Origin/CORS SDK
probes do not replace hosted browser or proof-owner isolation acceptance.
Deploy only through checklist 28 after storage-delta review.

## Prepared production bindings — review before application

The [sanitized binding proposal](evidence/mvp1-aws-storage-hardening-20261001/production-binding-preparation-20261002.json)
records private API/worker payload hashes, exact accepted application M,
canonical Azure fingerprint and separate runtime/worker credentials. The
[production configuration proposal](evidence/controlled-production-release-2026-09-30/production-config.proposed.json)
now names the verified proof bucket rather than the retired preparation
placeholder, and records both isolated AWS identities and the saved frontend
CDN setting. Existing prepared session/upload secrets are reused, not regenerated.

Both prospective role configurations pass the static hosted checks with zero
issues; canonical context and approval-field validation pass for the exact
runtime-connect/worker-connect roles without a database connection. M is used
only as the prospective static build identity and is not persisted as BUILD_SHA.
No variables have been applied and no API or worker has been started. Commercial
mode remains preparation_only, absolute pause true, with no admitted owner or
sales deadline. These are configuration checks, not protected database readiness
or deployed artifact evidence.

Checklist 28 step 1 requires storage-delta review and fresh checks before
production binding. PR #584 had no recorded review at this inspection. Complete
that review, refresh provider holds and the attended exact-M cutover, then apply
through existing private secret channels with deployment held and independent
readback. Hosted tests still require normal consenting customer/owner records;
no production fixtures or invoice/intake bypass are introduced to manufacture a
proof-owner pass. Alert receipt/aggregate monitoring and USB physical custody
remain separate pending items.

## Validation and review status

Application, client, shared domain and migration sources remain unchanged
from merged accepted release `cbc18c8fdfb0a900c7255ca695da56bd9a7660c3`.
The existing accepted release code-check evidence applies to those unchanged
sources; it is not evidence for new hosted storage behavior.

Fresh local validation passed twenty-five Python operator/readback security-contract tests
and fourteen Node transfer/runtime security-contract tests:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/storage/tests -v
node --check scripts/storage/aws-storage-snapshot.cjs
node --test scripts/storage/tests/proof-runtime-verify.test.cjs scripts/storage/tests/media-runtime-verify.test.cjs
```

Additional local checks covered provision/verify sequencing with mocked AWS,
the versioning wait preventing object/key writes, recovery preceding runtime
key creation, RSA-OAEP dummy credential roundtrip, private output permissions,
plaintext transfer-file cleanup, refusal of repeated verification, and alert
readbacks without paid alarms/actions or existing-budget edits. These are
local evidence only. Eleven final-media tests additionally cover drift-before-write, exact readback, isolated IAM grants, encrypted-only export and bounded new-key readiness. Explicit authentication rejection may be retried briefly for positive probes; ambiguous writes/conflicts and resource creation are never replayed. [AWS documents IAM propagation delay](https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html). Python programs parse and configuration JSON parses;
format and whitespace checks are included in preparation. The insecure
historical policy fixture is test input only and must never be applied.

The proof transfer/runtime-verification helper passed six Node
security-contract tests covering tampered ciphertext, incomplete recovery,
a different transfer key, wrong AWS principal, false permission-denial evidence
and unexpectedly broad access. Live permission results are recorded separately
above. Eight additional media transfer/runtime cases cover exact target/user/envelope, incomplete metadata, checksum/key mismatch, wrong principal, false denials and unexpectedly broad access. The authorized local Azure dependency inventory attempt used the
existing inspector and canonical connection authority with exact production
fingerprint
`b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.
The local inspection failed before inventory. A second inspection used a
task-owned, checksum-verified copy of exact merged source through the existing
Testing container network, with the separate inspector supplied only over SSH
stdin. The diagnostic child isolated its target from the container's Testing
database configuration while retaining genuine Railway artifact metadata;
the canonical target and approval checks were retained. That inspection also
failed before any table was inventoried. Those attempts supplied no zero-reference evidence; the subsequent authorized scan above did.
Its exact task directory was removed after sanitized evidence retrieval;
no remote credential file, application configuration, pending Testing patch,
database data, schema, firewall or TiDB writer was changed by that earlier diagnostic.

Fresh authenticated Railway CLI readbacks show production and Testing API
Git triggers absent, no active/queued deployment among the latest 20 production
API deployments, and production deployment
`5045030c-f115-429e-af15-2b2c410a6cb1` still REMOVED. The remote MCP returned
older, inconsistent deployment metadata; it is not used as current deployment
evidence. These bounded reads do not constitute a complete writer census or
Vercel hold verification. A subsequent authenticated latest-five API readback
at 2026-10-02T09:15:09Z again shows all REMOVED. No provider configuration or
production binding was changed by these reads.

Fresh production-variable readback independently matches the retained media
bucket, region and CloudFront URL. No proof credential variables, admitted
owners or sales deadline are present. The absolute pause variable is absent
from this stopped historical service; this is not presented as an explicit
configured pause. No API is running to accept intake. Set
`PAID_MVP_SALES_PAUSED=true` and keep admission/deadline absent in the approved
replacement configuration before any production deployment.

An initial independent anonymous PUT probe returned HTTP 400/InvalidRequest:
AWS requires SigV4 for conditional writes. That result was retained and was
not counted as a permission-denial pass. The corrected test conditionally
created a fresh task-owned canary through the authenticated media identity,
then attempted a valid unsigned PUT only against that canary. S3 returned
HTTP 403/AccessDenied and authenticated readback confirmed its original hash.
No existing customer content was modified. A second harmless task-owned
media object is retained from that test. This is S3 authorization evidence,
not production browser upload, whole-bucket unsigned-read denial, or customer
owner authorization.

Ready for bounded configuration/script review. Storage acceptance remains
open pending reviewed production binding, exact
frontend build verification, hosted browser/proof-owner checks and
monitoring readbacks. Nothing here authorizes paid opening or another writer.

Pricing and propagation references:

- [S3 eu-north-1 public price index](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/eu-north-1/index.json)
- [AWS Budgets pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)
- [CloudFront default metrics and alarm costs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html)
- [S3 versioning propagation wait](https://docs.aws.amazon.com/AmazonS3/latest/userguide/manage-versioning-examples.html)
