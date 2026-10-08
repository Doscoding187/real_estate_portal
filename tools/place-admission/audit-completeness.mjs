/**
 * Whether a retained-target audit actually inspected every target it found.
 *
 * In its own module because it is the audit's safety-critical decision and must be
 * testable without a database. It previously lived inside the audit script, which opens
 * a connection at import time, so the decision could only be exercised by breaking a live
 * service. A safety decision that cannot be tested in isolation is a decision that will
 * not be.
 *
 * The bug it exists to prevent is specific. An unreadable ledger was recorded with an
 * empty migration list, which is indistinguishable from a clean target, so the audit
 * could print "no retained target carries the old numbering" and exit zero while a
 * target's actual migration state was unknown. An audit that converts an unknown into a
 * clean bill of health is worse than no audit.
 *
 * A finding counts as inspected only when that was positively established. A ledger
 * table that is definitely absent IS an established fact. A ledger that exists but
 * cannot be read is not, and blocks the conclusion.
 */

/** @typedef {{ database: string, inspected?: boolean, note?: string }} AuditFinding */

/**
 * @param {AuditFinding[]} findings
 * @returns {{ complete: boolean, inspected: number, uninspected: { database: string, reason: string }[] }}
 */
export function assessAuditCompleteness(findings) {
  const uninspected = findings.filter(finding => finding.inspected !== true);
  return {
    complete: uninspected.length === 0,
    inspected: findings.length - uninspected.length,
    uninspected: uninspected.map(finding => ({
      database: finding.database,
      reason: finding.note ?? 'not inspected',
    })),
  };
}
