# DLE Evidence File Upload Security Contract

Date: 2026-06-17
Status: Contract active. Runtime slices now support developer-only protected upload intents,
guarded upload completion, and authenticated short-lived download URL brokering for existing
Rental/Auction lead artifacts. Public applicant/bidder upload and evidence readiness automation
remain unimplemented.

## Purpose

Rental and Auction evidence can include sensitive personal, financial, legal, lease, bidder, and
proof-of-funds documents. Those files must not use the same public media assumptions as development
images, brochures, profile photos, or marketing assets.

This contract defines the minimum storage, authorization, audit, and product behavior required
before DLE evidence artifacts can use `artifactType = uploaded_file`.

## Current Infrastructure Assessment

The existing upload path is suitable for public or semi-public media:

- `server/uploadRouter.ts` exposes `upload.presign`.
- `server/_core/imageUpload.ts` generates keys under `properties/{propertyId}/...`.
- The upload response can include a public URL built from CloudFront or an S3 bucket URL.
- Local development falls back to local upload storage when S3 is not configured.

That path is not sufficient for evidence files because:

- it returns public-style URLs;
- it does not model lead/development/evidence ownership;
- it does not distinguish proof documents from public marketing media;
- storage keys could be exposed to client surfaces that do not need them;
- there is no evidence-specific download authorization check;
- there is no review-owner-aware access model.

## Hard Boundary

Evidence file upload must not:

- use public CloudFront/S3 URLs as the artifact read path;
- expose raw storage keys to public users, search cards, public development pages, or lead forms;
- reuse `upload.presign` without an evidence-specific authorization wrapper;
- store full document contents in audit events or activity notes;
- mark evidence accepted, lease-ready, bidder-ready, inventory let/sold, distribution-ready, or
  payout-ready just because a file was uploaded;
- change wizard `stepData`, public listing data, lead stage, unit status, distribution deal stage,
  reward state, or autosave state.

Uploading a file means only: a file was attached to an evidence artifact and now requires manual
review.

## Required Storage Model

Evidence files must use a private namespace. Recommended key shape:

```text
dle/evidence/{environment}/development-{developmentId}/lead-{leadId}/artifact-{artifactId}/{uuid}.{ext}
```

Required storage metadata:

- `storageKey`: private storage key, never a public URL;
- `originalFilename`: sanitized original file name;
- `mimeType`: server-validated MIME type;
- `fileSizeBytes`: server-validated size;
- `checksumSha256`: required after upload verification where feasible;
- `uploadStatus`: `pending_upload`, `uploaded`, `failed`, or `quarantined`;
- `uploadedByUserId`;
- `uploadedAt`;
- `lastDownloadedAt` where useful for audit;
- `downloadCount` where useful for audit.

The existing `externalUrl` field may remain for external links, but uploaded evidence files should
not store public direct-download URLs in `externalUrl`.

## Required API Shape

Recommended first runtime endpoints:

```text
developer.createLeadEvidenceFileUploadIntent
developer.completeLeadEvidenceFileUpload
developer.getLeadEvidenceFileDownloadUrl
```

`createLeadEvidenceFileUploadIntent` must:

- require an authenticated developer operator;
- verify the lead belongs to the developer's development;
- verify the development transaction is Rental or Auction for the first upload slice;
- verify the artifact role is valid for the transaction lane;
- create or attach to an evidence artifact with `artifactType = uploaded_file`;
- set status to `submitted` only after upload completion is verified;
- return an upload URL and opaque upload token, not a public file URL.

`completeLeadEvidenceFileUpload` must:

- verify the signed upload token;
- verify the artifact still belongs to the same lead/development/developer;
- verify the private object exists before changing artifact status;
- fail without mutation when private storage is not configured;
- persist file metadata;
- write an `evidence_artifact_submitted` operating event;
- avoid storing full file contents in event metadata.

`getLeadEvidenceFileDownloadUrl` must:

- require authenticated access;
- verify role and ownership every time;
- return a short-lived signed download URL or proxy stream;
- log download/access where product policy requires it;
- never be callable from public development pages or unauthenticated lead forms.

Current runtime note:

- Developer-owned Rental/Auction uploaded-file artifacts can request a short-lived signed download
  URL only after upload completion is verified.
- The endpoint refuses pending uploads, non-uploaded artifacts, non-private storage keys, public
  external URLs, unrelated developers, and environments without private storage configuration.
- Download URL issuance updates artifact metadata and writes an `evidence_artifact_downloaded`
  operating event only after a signed URL is issued.

## Authorization Matrix

Allowed first-pass readers:

- developer operators who own the development;
- assigned admin reviewers;
- distribution managers only when a future explicit distribution linkage says the artifact is
  shared into their workflow.

Allowed first-pass writers:

- developer operators who own the development;
- future applicant/bidder public upload only after a separate public-submission contract creates a
  scoped token tied to a lead and requested artifact role.

Not allowed by default:

- unauthenticated public users;
- unrelated developers;
- agents/referrers without explicit distribution linkage;
- public development detail pages;
- search/listing cards;
- generic media upload endpoints.

## File Validation

First-pass accepted MIME types should be conservative:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`

Recommended maximum file size:

- 10 MB per file for the first slice.

Rejected by default:

- executables;
- archives;
- office documents with macros;
- unknown MIME types;
- files whose extension and MIME type disagree materially.

The server must validate file type and size before issuing upload intent. A later malware scanning
or quarantine slice should be added before broad public upload.

## Local Development Behavior

Local fallback may be used only if it preserves the same private-read semantics:

- local files must live under a private evidence namespace, not the public media namespace;
- download must still pass through an authenticated endpoint;
- local dev must not expose evidence files through static public serving;
- tests must prove a public URL is not returned for uploaded evidence.

If local storage cannot preserve those semantics, evidence-file upload should be disabled locally
until the protected path exists.

## UI Requirements

Developer Leads Manager may show:

- file name;
- file type;
- file size;
- submitted/review status;
- review owner;
- short guardrail copy.

It must not show:

- raw storage key;
- public bucket URL;
- permanent download URL;
- completion/readiness claims after upload.

Copy must say that uploaded files require manual review and do not mark lease readiness, bidder
registration, proof-of-funds readiness, inventory, distribution payout, or autosave as complete.

## Audit Requirements

Upload lifecycle events must be written without sensitive file contents:

- `evidence_artifact_upload_intent_created`
- `evidence_artifact_submitted`
- `evidence_artifact_downloaded` where audit policy requires it
- `evidence_artifact_upload_failed`
- `evidence_artifact_quarantined` when scanning exists

Event metadata may include artifact id, role, file name, MIME type, file size, actor id, and source
surface. It must not include extracted document text, identity numbers, bank details, payslip
contents, proof-of-funds details, or permanent URLs.

## Implementation Gates

Before runtime upload work starts, confirm:

1. Private storage namespace and local fallback behavior.
2. Server-side MIME, extension, and size validation.
3. Upload-intent ownership checks.
4. Upload-completion verification.
5. Authenticated download broker or short-lived signed URL flow.
6. No public URL or raw storage key in client read models.
7. Operating-event audit without sensitive payloads.
8. Tests for unrelated developer denial.
9. Tests for public/unauthenticated denial.
10. Tests proving upload does not move lead stage, inventory, distribution, reward, public listing,
    wizard, draft, or autosave state.

## First Safe Runtime Slice

Implemented first runtime slice:

- developer-only upload intent for an existing Rental/Auction lead evidence artifact;
- PDF/JPEG/PNG/WebP only;
- private storage key only;
- no public URL returned;
- local development does not fall back to public local media URLs when private upload storage is
  unavailable;
- uploaded-file artifact is created as `requested` with `uploadStatus = pending_upload` metadata;
- S3 upload URL is returned only when private S3 storage is configured;
- focused tests cover file validation and private evidence key construction.

Still required before files are usable as submitted evidence:

- upload completion verification;
- authenticated download broker;
- submitted status after verified upload;
- operating event audit for submission;
- lead-detail readback of file metadata without raw storage keys;
- no public applicant/bidder upload;
- no artifact acceptance automation;
- no readiness, inventory, distribution, reward, public listing, wizard, draft, or autosave
  mutation.
