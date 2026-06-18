# DLE Evidence Linkage Persistence Contract

Date: 2026-06-18
Status: Contract active. A pure linkage helper exists, but no admin or distribution evidence
metadata/download endpoints are opened by this document.

## Purpose

DLE evidence can contain sensitive rental, auction, legal, financial, identity, and proof-of-funds
documents. Before admin reviewers or distribution managers can read metadata or request protected
download URLs, the system must persist why that external surface is allowed to see the artifact.

This contract defines the persistence shape for linking DLE evidence artifacts to Admin Review and
Distribution workflows without bypassing those systems' ownership boundaries.

## Current Runtime State

Already present:

- `dle_evidence_artifacts.distribution_deal_id` can link an artifact to one distribution deal.
- `dle_evidence_artifacts.lead_id` links current Rental/Auction evidence to a DLE lead.
- `development_operating_events.distribution_deal_id` can anchor DLE operating events to a deal.
- `evaluateDleEvidenceAccess` can evaluate distribution linkage inputs, but runtime
  admin/distribution endpoints are not open.
- `buildDleEvidenceLinkageDecision` can normalize existing `distribution_deal_id` linkage and
  future access-grant rows into access-policy inputs without opening endpoints.

Not yet present:

- admin review item id linkage;
- explicit artifact access grants;
- per-surface expiry/revocation;
- manager/admin metadata endpoints;
- manager/admin download endpoints.

## Linkage Principles

Linkage is evidence access context only. It must not:

- accept evidence;
- complete evidence readiness;
- move lead stages;
- move inventory;
- move distribution deal stages;
- approve payout, reward, or commission;
- mutate public listing state;
- rewrite wizard, draft, or autosave state.

The access decision must distinguish:

- DLE-owned artifact state;
- Distribution-owned deal/document/programme state;
- Admin-owned review/policy state.

## Distribution Linkage

The existing `distribution_deal_id` field is sufficient only when:

- the artifact is intentionally shared into one specific distribution deal;
- the deal belongs to the same development as the artifact;
- the artifact role is relevant to that programme/deal workflow;
- the manager has active access to that deal/programme/development;
- the artifact is still DLE-owned evidence, not a distribution document verification record.

When a single artifact must be visible to multiple deals, programmes, managers, or time-limited
review sessions, do not overload `distribution_deal_id`. Add an explicit grant/link table.

Recommended future table:

```text
dle_evidence_artifact_access_grants
id
artifact_id
development_id
lead_id nullable
distribution_deal_id nullable
distribution_program_id nullable
admin_review_item_id nullable
source_surface
granted_to_surface
granted_to_user_id nullable
granted_to_role nullable
access_level enum('metadata', 'download', 'review_mutation')
reason_code
reason_note nullable
status enum('active', 'revoked', 'expired')
expires_at nullable
granted_by_user_id
revoked_by_user_id nullable
created_at
updated_at
metadata JSON nullable
```

Required indexes:

- `(artifact_id, status)`
- `(distribution_deal_id, status)`
- `(distribution_program_id, status)`
- `(admin_review_item_id, status)`
- `(granted_to_user_id, status)`
- `(development_id, access_level, status)`

## Admin Review Linkage

Admin access must be tied to a policy/review reason, not broad admin identity alone.

A future admin linkage must persist at least:

- artifact id;
- development id;
- lead id where applicable;
- admin review item id or policy review category;
- source surface `admin_review`;
- access level;
- reason code;
- actor user id;
- status and expiry/revocation state.

Admin linkage must not grant Distribution access, move public listing state, or accept DLE evidence
unless a separate admin review-owner policy explicitly allows review mutation.

## Metadata Exposure Rules

Linked admin/distribution metadata may include safe artifact fields:

- artifact id;
- development id;
- linked lead/deal/review id where authorized;
- transaction type;
- artifact role;
- artifact type;
- display name;
- status;
- review owner;
- upload status;
- file name, MIME type, size, download count, and last download-issued timestamp.

It must not include:

- storage key;
- signed URL;
- public URL;
- permanent URL;
- raw document contents;
- extracted sensitive identity, financial, or legal fields.

## Download Rules

Future linked download access still requires:

- access grant or valid linkage;
- active user/surface authorization;
- role relevance;
- uploaded-file artifact type;
- downloadable artifact status allowed by that surface;
- verified uploaded state;
- private `dle/evidence/` namespace;
- no public external URL;
- private storage configured;
- source-surface-aware audit event.

Download audit metadata may include the grant/link id, source surface, reason code, access level,
actor type, artifact id, role, display name, expiry, and download count. It must not include storage
keys, signed URLs, public URLs, or document contents.

## First Safe Runtime Slice

Completed first safe runtime slice:

1. Added a read-only helper that normalizes artifact linkage from existing fields:
   `distribution_deal_id`, `lead_id`, development id, and optional future grant rows.
2. Unit-tested distribution-linked, wrong-development, revoked/expired, admin-linked, and
   unrelated reviewer cases.
3. Kept endpoints closed.
4. Proved the helper does not mutate evidence, lead, inventory, distribution, payout, public
   listing, wizard, draft, or autosave state.

Recommended next implementation:

- define explicit grant persistence and reviewer surface tests before any admin metadata endpoint is
  opened;
- do not add admin/distribution routers yet.
