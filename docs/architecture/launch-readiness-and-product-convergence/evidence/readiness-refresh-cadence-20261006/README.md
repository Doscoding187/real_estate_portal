# October 6 controlled-release checkpoint evidence

The deployed joined release is still the accepted `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60`. Customer writes are held on the reproduced readiness-expiry gap. This packet supports the bounded scheduling correction; it does not certify an accepted replacement source or deployed fix.

- [Release checkpoint, diagnosis and customer outcomes](../../controlled-release-readiness-refresh-blocker-2026-10-06.md).
- [Full failing responses and bounded observation](readiness-freshness-diagnostic.json).
- [Local regression and validation](local-regression-and-validation.json).
- [Official joined-probe failure](header-release-official-joined-probe-20261006-failed.json).
- [Initial joined response checks](header-release-joined-response-probe-20261006171039825.json).
- [Reconciled persisted Agent profile](controlled-agent-interrupted-write-reconciliation-corrected-20261006.json).
- [Artifact digests](artifact-digests.json), also available as [SHA256SUMS](SHA256SUMS).

Nineteen source evidence files were copied byte-for-byte; diagnostic and validation summaries were added. October 2 records remain historical. Credentials, bindings, mailbox addresses, cookies, private runtime logs and token-bearing screenshots remain outside this packet. The invalid fetch-status and tRPC-batch diagnostic outputs are excluded and documented in the validation record. The interrupted browser error records an intentional stop, not a new application defect.

Verify JSON evidence with `sha256sum --check SHA256SUMS` in this directory. Fresh exact-head CI evidence is captured separately after the review commit exists, avoiding a circular commit/hash dependency.
