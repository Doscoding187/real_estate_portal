# DLE Evidence Access Authorization Contract

Date: 2026-06-18
Status: Contract active. Runtime access is currently developer-owned only. A pure access-policy
helper now exists for future expansion decisions, and the existing developer-only download broker
uses that helper. Admin and distribution metadata/download endpoints remain future runtime work and
must follow this contract before implementation.

## Purpose

DLE evidence files may contain sensitive rental, auction, financial, legal, identity, lease, and
proof-of-funds information. Expanding access beyond the owning developer must be explicit because
DLE, Distribution, and Admin Review have different ownership boundaries.

This contract defines when admin reviewers and distribution managers may see DLE evidence metadata
or request protected evidence-file download URLs. Linkage persistence rules live in
`docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md`.

## Current Runtime State

Implemented runtime access:

- Developer operators who own the development can create manual evidence artifacts for Rental and
  Auction leads.
- Developer operators who own the development can create protected upload intents for uploaded
  evidence files.
- Developer operators who own the development can complete uploads only after private storage
  verification.
- Developer operators who own the development can request a short-lived signed download URL for a
  submitted uploaded-file artifact through `evaluateDleEvidenceAccess`.
- Developer download audit metadata records the source surface, access level, actor type, storage
  namespace, expiry, and download count without storage keys, URLs, or document contents.
- Developer Leads Manager can show safe file metadata without storage keys, signed URLs, public
  URLs, or document contents.
- `evaluateDleEvidenceAccess` can evaluate developer, admin review, distribution manager, and
  future public applicant access decisions for `metadata`, `download`, and `review_mutation`
  without changing runtime endpoints.

Not implemented:

- admin evidence-file download;
- distribution-manager evidence-file download;
- public applicant/bidder upload;
- automatic sharing into distribution deals;
- automatic sharing into admin review queues;
- evidence-readiness automation.

## Ownership Boundary

DLE owns:

- lead-level evidence artifacts attached to DLE Rental/Auction leads;
- transaction-specific evidence roles;
- developer lead-operating evidence display;
- DLE evidence upload, completion, download, and operating-event audit.

Distribution owns:

- distribution programme document requirements;
- manager validation queues;
- distribution deal-stage movement;
- payout, reward, and commission readiness;
- agent/referrer access to distribution workflows.

Admin Review owns:

- platform policy review;
- developer/account compliance checks;
- public listing moderation where applicable;
- admin reviewer access and policy decisions.

DLE evidence may inform Distribution or Admin Review, but it must not bypass those systems or
replace their decision records.

## Access Levels

Use explicit access levels rather than boolean access.

### Metadata Only

The caller may see safe artifact metadata:

- artifact id;
- development id;
- lead id where authorized;
- transaction type;
- artifact role;
- artifact type;
- display name;
- status;
- review owner;
- review note where policy allows;
- file name, MIME type, size, upload status, download count, and last download-issued timestamp.

The caller must not see:

- storage key;
- signed URL;
- public URL;
- permanent URL;
- document contents;
- extracted sensitive fields.

### Download URL

The caller may request a short-lived signed download URL only after:

- artifact ownership and linkage are verified;
- role/surface access is verified;
- artifact type is `uploaded_file`;
- artifact status is `submitted`, `under_review`, or `accepted` where policy allows;
- private storage key is in the DLE evidence namespace;
- no public external URL is present;
- private storage is configured;
- an `evidence_artifact_downloaded` operating event can be written.

### Review Mutation

The caller may change evidence review status only if the review owner and workflow policy allow it.
Review mutation must remain separate from download access.

Downloading or viewing evidence does not mean:

- evidence is accepted;
- rental lease readiness is complete;
- auction bidder readiness is complete;
- inventory is let/sold;
- a distribution deal is payout-ready;
- a reward or commission is approved.

## Developer Operator Access

Developer operators may access DLE evidence only for developments owned by their developer profile.

Allowed:

- metadata readback;
- upload intent creation;
- upload completion verification;
- protected download URL request;
- manual review status transitions where current DLE developer workflows allow them.

Denied:

- unrelated developer artifacts;
- public lead form access;
- public development page access;
- search/result-card access;
- direct storage-key access.

## Admin Review Access

Admin access must be policy-scoped, not global-by-default.

Admin metadata access requires:

- authenticated admin/super-admin identity;
- explicit admin review surface;
- artifact tied to a development, developer, lead, or policy review item in the admin workflow;
- audit event or admin activity log where the read matters for policy review.

Admin download access additionally requires:

- the artifact is needed for a specific admin review action;
- source surface is `admin_review`;
- the download event records actor, artifact id, role, development id, lead id where applicable,
  and reason/category metadata without document contents.

Admin access must not:

- move lead stages;
- accept DLE evidence unless a specific admin review owner policy allows it;
- mark distribution payout or reward readiness;
- mutate public listing state through evidence access alone.

## Distribution Manager Access

Distribution access requires explicit linkage. Distribution managers do not automatically inherit
access to all DLE lead evidence for a development.

Distribution metadata access requires at least one of:

- the DLE artifact is linked to a distribution deal;
- the DLE lead has been explicitly handed off to distribution;
- the distribution programme requires a mapped evidence role and the developer has shared the
  artifact into that programme workflow;
- a future access grant table records the artifact/deal/programme linkage.

Distribution download access additionally requires:

- authenticated distribution manager identity;
- active manager access to the relevant programme/deal/development;
- artifact role is relevant to the distribution workflow;
- source surface is `distribution_manager`;
- download audit is written without storage keys, signed URLs, public URLs, or document contents.

Distribution access must not:

- treat DLE evidence acceptance as distribution document verification;
- mark payout readiness;
- approve rewards/commissions;
- move distribution deal stages;
- grant agent/referrer access to the file.

## Public Applicant/Bidder Access

Public applicant or bidder upload/download is out of scope for current runtime.

Future public access requires:

- a separate scoped token contract;
- explicit lead identity/session binding;
- expiry;
- one artifact role or request id per token;
- no ability to list other artifacts;
- no ability to download developer/admin/distribution documents;
- rate limiting and abuse controls;
- privacy copy before submission.

## Required Runtime Gates Before Expansion

Before adding admin or distribution evidence access, implement:

1. A shared access-policy helper that returns `metadata`, `download`, or `review_mutation` access.
   Status: complete for `evaluateDleEvidenceAccess` helper tests.
2. Source-surface-aware audit for every download URL issuance.
   Status: complete for the existing developer-only download audit metadata helper.
3. Linkage persistence contract for admin/distribution review surfaces.
   Status: complete for `EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md`.
4. Tests for unrelated developer denial.
5. Tests for unrelated admin/distribution denial.
6. Tests that distribution access requires explicit deal/programme/artifact linkage.
7. Tests proving download access does not mutate lead stage, inventory, distribution stage, payout,
   reward, public listing, wizard, draft, or autosave state.
8. UI copy that distinguishes uploaded evidence from accepted readiness.

## First Safe Expansion Slice

Completed first runtime guardrail slice:

- added a pure access-policy helper for DLE evidence artifacts;
- kept runtime endpoints unchanged;
- unit-tested developer, admin, distribution, public, and unrelated-developer access decisions;
- returned explicit denial reasons;
- issued no new download URLs.

Recommended next runtime slice:

- keep admin/distribution endpoints closed until linkage helper and reviewer surface tests are in
  place;
- prove no lead stage, inventory, distribution, payout, public listing, wizard, draft, or autosave
  mutation occurs on access decisions.
