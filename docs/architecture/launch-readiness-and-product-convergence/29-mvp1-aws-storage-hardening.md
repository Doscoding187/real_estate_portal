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
that setting and current Azure media references remain specific dependencies
before full public-read removal.

## Completed prerequisites and remaining execution order

The numbered phases retain their original dependency order. Completed operator
phases must not be rerun as provisioning tasks.

[Sanitized continuation evidence](evidence/mvp1-aws-storage-hardening-20261001/continuation-verification.json)
records transfer/runtime results, private evidence hashes, inspection failures,
containment limits and the remaining gates without credential values.

| Action                                                             | Current evidence / disposition                                                                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing media IAM/configuration capture                           | Complete for the recorded uploader baseline, group absence, managed policy and private operator backups. Dedicated media identity remains pending. |
| Anonymous media write containment                                  | Complete; independent valid unsigned PUT returned 403 and the canary hash was unchanged.                                                           |
| Authenticated CloudFront origin probe                              | Complete; direct S3 403, fresh CloudFront miss 200, matching hash and policy restoration.                                                          |
| Private proof bucket/user provisioning                             | Complete; encryption, ownership, blocks, versioning and scoped policy readbacks.                                                                   |
| Private proof recovery and encrypted key export                    | Complete through operator verification; independent ciphertext checksum and local decryption passed.                                               |
| Dedicated proof runtime permissions                                | Complete for live bounded positive/negative operations described above; credentials remain local.                                                  |
| Cost alerts and notification receipt                               | Pending operator alert application/readback and mailbox receipt.                                                                                   |
| Current media URL dependencies                                     | Pending exact Azure inventory and frontend build-setting readback.                                                                                 |
| Final media policy, public-access blocks, scoped identity and CORS | Pending dependency completion and operator application/readback.                                                                                   |
| Production binding/deployment and hosted journeys                  | Pending checklist 28 containment, exact artifacts, attended operator and hosted upload/display plus proof-owner isolation.                         |

1. **Recorded baseline complete.** Keep IAM permission capture current through the operator path. Capture any
   identity/group managed and inline policies and relevant boundaries; retain
   immutable private copies of all prior configurations. Verify account and
   bucket identity before every mutation.
2. **Pending.** Reconcile active application configuration and any retained direct-S3 URLs.
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
5. **Pending URL dependencies.** Once URL dependencies and the origin test pass, apply
   `media-bucket-policy.json` and `block-public-access.json`. Read back both,
   then repeat unsigned S3 denial, unauthorized upload denial and CloudFront
   retrieval. Keep media object ownership and encryption intact.
6. **Pending.** Bind a dedicated runtime identity with only the media operations in
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
10. **Pending alert configuration/receipt.** Record configuration readbacks, cost assumptions, alert configuration and
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
bounded dedicated proof runtime permissions have passed. Hardened anonymous
denial across the complete media bucket, scoped media runtime IAM, production
CORS, current URL dependency readbacks, cost alerts/receipt, production
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
recipient. Mailbox creation/receipt and alert configuration remain pending.
No new AWS account is required. Alerts do not
enforce a cap; CloudFront allowance monitoring and other-provider spending
must be reconciled with the aggregate operating ledger.

`aws-storage-cost-monitor.py --apply-alerts` is prepared for operator execution.
It creates only a new monthly S3 cost-warning budget with a US$1 notification
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
do not add these rights to runtime identities. Configuration is still pending.

## Validation and review status

Application, client, shared domain and migration sources remain unchanged
from merged accepted release `cbc18c8fdfb0a900c7255ca695da56bd9a7660c3`.
The existing accepted release code-check evidence applies to those unchanged
sources; it is not evidence for new hosted storage behavior.

Fresh local validation passed nine operator security-contract tests:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/storage/tests -v
node --check scripts/storage/aws-storage-snapshot.cjs
node --test scripts/storage/tests/proof-runtime-verify.test.cjs
```

Additional local checks covered provision/verify sequencing with mocked AWS,
the versioning wait preventing object/key writes, recovery preceding runtime
key creation, RSA-OAEP dummy credential roundtrip, private output permissions,
plaintext transfer-file cleanup, refusal of repeated verification, and alert
readbacks without paid alarms/actions or existing-budget edits. These are
local evidence only. Python programs parse and configuration JSON parses;
format and whitespace checks are included in preparation. The insecure
historical policy fixture is test input only and must never be applied.

The new local transfer/runtime-verification helper passed six Node
security-contract tests covering tampered ciphertext, incomplete recovery,
a different transfer key, wrong AWS principal, false permission-denial evidence
and unexpectedly broad access. Live permission results are recorded separately
above. The authorized local Azure dependency inventory attempt used the
existing inspector and canonical connection authority with exact production
fingerprint
`b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.
The local inspection failed before inventory. A second inspection used a
task-owned, checksum-verified copy of exact merged source through the existing
Testing container network, with the separate inspector supplied only over SSH
stdin. The diagnostic child isolated its target from the container's Testing
database configuration while retaining genuine Railway artifact metadata;
the canonical target and approval checks were retained. That inspection also
failed before any table was inventoried. No zero-reference result is claimed.
Its exact task directory was removed after sanitized evidence retrieval;
no remote credential file, application configuration, pending Testing patch,
database data, schema, firewall or TiDB writer was changed.

Fresh authenticated Railway CLI readbacks show production and Testing API
Git triggers absent, no active/queued deployment among the latest 20 production
API deployments, and production deployment
`5045030c-f115-429e-af15-2b2c410a6cb1` still REMOVED. The remote MCP returned
older, inconsistent deployment metadata; it is not used as current deployment
evidence. These bounded reads do not constitute a complete writer census or
Vercel hold verification. No provider configuration or production binding was
changed by these reads.

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
open pending scoped media binding, current
URL dependencies, full media hardening, hosted browser/proof-owner checks and
monitoring readbacks. Nothing here authorizes paid opening or another writer.

Pricing and propagation references:

- [S3 eu-north-1 public price index](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/eu-north-1/index.json)
- [AWS Budgets pricing](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)
- [CloudFront default metrics and alarm costs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/monitoring-using-cloudwatch.html)
- [S3 versioning propagation wait](https://docs.aws.amazon.com/AmazonS3/latest/userguide/manage-versioning-examples.html)
