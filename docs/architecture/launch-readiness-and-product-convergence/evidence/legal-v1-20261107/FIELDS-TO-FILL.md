# Fields to fill before this legal release can be prepared

Nothing in this folder is signed. Every value starting `UNSIGNED-PLACEHOLDER` must be replaced by Edward
(founder) after reviewing `terms.txt` and `privacy.txt`. `payment.txt` is deliberately not included: the
installer reads only terms.txt and privacy.txt.

The installer (`server/_core/databaseAuthority/legalReleaseInstallation.ts`, constant `LEGAL_EVIDENCE_PATH`)
reads this folder from Git at the packet's source head, so the filled values must be committed first.
Validation is in `prepareLegalRelease` (`server/services/legalReleasePreparation.ts`).

| Field | File | Format | Filled by | How checked |
| --- | --- | --- | --- | --- |
| `reference` | final-privacy-approval.json | non-empty string, e.g. `B15-FINAL-PRIVACY-APPROVAL-YYYYMMDD-NN` | Edward | must equal `finalPrivacyApproval` in release-candidate.json; stored as approval_reference (max 200 chars) |
| `finalPrivacyApproval` | release-candidate.json | same string as `reference` | Edward | must equal approval `reference` |
| `sourceBusinessApproval` | release-candidate.json AND final-privacy-approval.json | non-empty string (founder copy approval reference) | Edward | both files must hold the identical value |
| `recordedAt` | final-privacy-approval.json | ISO-8601 UTC datetime, e.g. `2026-11-08T09:00:00Z` | Edward | zod datetime; planned effective time may not be earlier than it (no backdating); must not be after effective time |
| `actor` | final-privacy-approval.json | non-empty string, approver name (max 200 chars) | Edward | non-empty; stored as approval_actor |
| `answer` | final-privacy-approval.json | exactly `Approve finalized Privacy wording` | Edward | zod literal |

Already computed (do not edit unless the texts change; then recompute and re-approve):
bundleId, termsVersion, privacyVersion, `documents.*.sha256`, approval `document.sha256`, `termsSha256`, and
versions. They are checked against the exact text bytes; a test asserts they match.

`effectiveAt` stays `null` in the candidate; the controlled release time is supplied at install time (max
30 minute activation window).
