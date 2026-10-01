# B14 operating-schedule reconciliation implementation — 2026-09-27

**Disposition: documentation applied under the accepted proposal. B14 remains
OPEN pending operational rehearsal.** This is not a runtime change or an
operational rehearsal. B15 and B16 remain open.

## Source and target identity

| Item | Identity |
| --- | --- |
| Task-owned branch / worktree | `docs/b14-schedule-reconciliation-review` / `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b14-schedule-reconciliation-review` |
| Reviewed source anchor | Commit `a05868c66f493e3cbc972a119074c91a10797777`, tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`; parent `f3f99f806ea9ae6be3132e093ce1cf1a6f185a32` |
| B14 procedure before this update | SHA-256 `a90db2d822fd2400350bb9a0a066d1fb0a39c3ee84e142b8e765cbbe5e19f6d0` |
| Accepted B15 review copy | `B15-FOUNDER-REVIEW-0.3`, SHA-256 `d2925868819a8614b95eee3cd7b3aebf437bbde084681c1b83f055d33165c368`; preserved byte-for-byte at [versioned copy](b15-founder-approval-candidate-2026-09-27-v0.3.md) |
| B15 copy source | B15 review worktree `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b15-founder-facts-refresh`, branch `docs/b15-founder-facts-refresh`, HEAD `005eea36d71b238b7b744d23b9425489d592b1e2`, base tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`; source candidate was uncommitted there and was verified by its exact SHA-256 before copying |
| Accepted B14 proposal | SHA-256 `5a6857e5c41c79f0e0d62cd8fd54850dfd8c425652b8c064930d65781dbc613a`; file and sidecar remain unchanged |
| Database target | None. This documentation-only scope did not provision, connect to, or mutate a database. |
| Resulting B14 procedure | [Operating procedure](../19-first-customer-operating-procedure.md), SHA-256 `80545f1092297fb0bf7d634ed54005be45326d49bc634f0fa3d3a610d73b3acf` |

The source anchor tree is the reviewed B03–B07 source composition plus the
accepted B16 PLE spec/config correction. This task adds documentation and a
byte-identical B15 review-copy artifact only. It does not change the accepted
runtime source composition.
Per-file output hashes, including the updated launch register, B15 packet and
B16 evidence addendum, are recorded in
[`b14-b15-b16-schedule-evidence-sha256-2026-09-27.txt`](b14-b15-b16-schedule-evidence-sha256-2026-09-27.txt).

## Applied changes

- Defined founder-managed monitoring as Monday–Friday, 09:00–17:00 South
  Africa time, excluding South African public holidays. Requests remain
  submittable at any time; off-period support and billing/payment requests are
  answered during the next operating period. The text makes no call-centre,
  dedicated voice-line or immediate WhatsApp promise.
- Aligned daily finance-queue checks and the normal one-business-day activation
  target to operating periods. Business days exclude weekends and South
  African public holidays. Funds must be matched to the invoice and owner;
  proof alone never activates access.
- Required sales-window deadlines to use exact UTC, the actual next attended
  check, the existing weekday-specific runtime limit and the existing 72-hour
  maximum. When a weekend or holiday closure exceeds those limits, sales may
  expire and remain paused until checks resume. No limit or product key changes.
- Clarified planned absence and return: pause and verify new invoice/checkout
  and finance-approval rejection, retain pending records and paid access, and
  perform return-time triage/reconciliation while still paused. Finance
  activation remains blocked until controlled resumption with a fresh bounded
  window.
- Added rehearsal cases for an ordinary weekend, extended holiday closure,
  missed check/renewal, planned pause/resumption and unexpected absence.
- Updated B15 and B16 evidence references and the central launch register.
  The accepted proposal is preserved unchanged as the decision record.

## Acceptance mapping

| Requirement | Procedure evidence | Disposition |
| --- | --- | --- |
| Monday–Friday 09:00–17:00 SAST; exclude South African public holidays | Confirmed operating-period section; B15 v0.3 link | Applied to documentation; actual channel monitoring remains unproven |
| Finance checks and one-business-day activation target | Checks during operating periods; finance queue instructions | Applied; finance/bank reconciliation rehearsal remains open |
| Weekend/holiday renewal and existing cap | Exact UTC deadline instructions; no extension beyond weekday-specific bound or 72 hours | Applied; no runtime calendar or cap change |
| Planned/unplanned absence, pause and resumption | Pause and return sections; finance remains blocked during return triage | Applied; hosted behavior rehearsal remains open |
| Preserve pending invoices/proofs and already-paid access | Pause verification and return-time reconciliation steps | Preserved in procedure; rehearsal remains open |
| Ordinary weekend, holiday closure, missed check and pause/resumption cases | Five explicit rehearsal cases | Required cases defined; not executed |
| B15/B16 evidence traceability | Versioned B15 v0.3 copy, B15 packet, B16 dated addendum, launch-register links and checksum list | References updated; B15/B16 remain open |

## Checks and limits

The accepted proposal SHA-256 was rechecked against its sidecar. The versioned
B15 copy hash matches the accepted v0.3 copy. `git diff --check` and the
checksum manifest are the documentation integrity checks for this change.
No application test, database suite, provider exercise, hosted rehearsal,
publication, merge, deployment or production operation was run or authorized.

B14 operational acceptance still requires the rehearsals above and proof of
the monitored routes/queues. The public business/customer-facing address and
privacy-request route remain pending; provider, retention, cookie and other
privacy/disclosure decisions remain unresolved. B09 remains a separate
unresolved prerequisite. B15 and B16 stay open.
