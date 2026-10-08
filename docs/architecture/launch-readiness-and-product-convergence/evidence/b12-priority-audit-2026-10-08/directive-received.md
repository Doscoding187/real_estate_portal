# Engineering Brief: B12 Hosted Runtime — Priority Directive

**Date:** October 8, 2026
**From:** Engineering Manager
**To:** Codex (Engineering Worker)
**CC:** Chief of Staff
**Subject:** B12 Hosted Runtime — Sole Priority, Review, Approval, and Deployment Required
**Classification:** L2 — Propose-and-Wait (requires CEO approval before execution)

---

## 1. Audit Request: Accomplishments Since October 2, 2026

Codex is directed to produce a complete and honest accounting of all engineering work performed since October 2, 2026. This audit must include:

### 1.1 B-Packages Worked On
For each B-package (B01–B18) that has received any engineering attention since October 2, list:
- Package ID and name
- Specific work performed (commits, PRs, branches)
- Current status (in-progress, complete, blocked, abandoned)
- Gates closed (if any) — gate ID, name, closure date, verification evidence

### 1.2 Gates Closed
List every gate that has been formally closed since October 2, 2026. For each:
- Gate ID and name
- Closure date
- Verification method (test results, deployment confirmation, sign-off)
- Evidence link (commit SHA, CI run, deployment log)

### 1.3 Deployment Attempts
List every deployment attempted since October 2, 2026. For each:
- Target environment (Railway, Azure, other)
- What was deployed (commit SHA, build artifact)
- Outcome (success, failure, partial)
- If failed: root cause, error logs, remediation attempted
- If successful: verification that the deployment is live and healthy

### 1.4 Summary Table
Produce a summary table:

| B-Package | Work Done | Gates Closed | Deployments Attempted | Deployments Successful | Current Status |
|-----------|-----------|--------------|----------------------|----------------------|----------------|
| ...       | ...       | ...          | ...                  | ...                  | ...            |

---

## 2. Priority Directive: B12 Is the Only Priority

**Effective immediately, B12 (Hosted Runtime) is the sole engineering priority.**

All other work — including geography/Place authority, auth bug fixes, readiness optimizations, and developer registration fixes — is **deprioritized** until B12 is closed.

### 2.1 What "Closed" Means for B12
B12 is closed when ALL of the following are true:
1. API readiness responds within the 8,000ms limit (currently failing at 12,167ms)
2. Cache layer uses Redis (not in-memory)
3. The correction has been reviewed and approved by the Engineering Manager
4. The correction has been deployed to the target environment
5. Post-deployment verification confirms the fix is live and stable

### 2.2 The Correction
A correction for B12 has been prepared but has NOT been reviewed, approved, or deployed. Codex must:
1. Present the prepared correction for technical review
2. Identify any risks or blockers in the correction
3. Obtain Engineering Manager approval before deploying
4. Deploy the approved correction
5. Verify the deployment and report results

### 2.3 Explicit Non-Priorities
Until B12 is closed, Codex must NOT:
- Start new B-packages
- Continue work on geography/Place authority
- Continue work on auth bug fixes
- Continue work on readiness optimizations
- Continue work on developer registration fixes
- Perform any work that does not directly contribute to closing B12

---

## 3. Timeline: B12 Must Be Closed by October 10, 2026

| Milestone | Owner | Deadline |
|-----------|-------|----------|
| Audit delivered to Engineering Manager | Codex | October 8, 2026 (EOD) |
| B12 correction presented for review | Codex | October 8, 2026 (EOD) |
| Technical review complete | Engineering Manager | October 9, 2026 (morning) |
| CEO approval obtained | Edward | October 9, 2026 (afternoon) |
| Correction deployed to production | Codex | October 9, 2026 (EOD) |
| Post-deployment verification complete | Codex | October 10, 2026 (morning) |
| B12 gate formally closed | Engineering Manager | October 10, 2026 (afternoon) |

**Hard deadline: October 10, 2026, 17:00 SAST.**

---

## 4. Escalation Condition

If B12 cannot be closed by October 10, 2026, 17:00 SAST, Codex must escalate immediately. The escalation must include:

### 4.1 Root Cause Analysis
- Why B12 cannot be closed by the deadline
- What specific technical, resource, or dependency blocker is preventing closure
- What has been tried and why it has not worked

### 4.2 Resources Needed
- Specific additional resources required (personnel, infrastructure, access, budget)
- Estimated time to close B12 once resources are provided
- Any external dependencies (third-party services, vendor support, etc.)

### 4.3 Impact Assessment
- What is blocked by B12 not being closed
- What is the business impact of the delay
- What is the risk of deploying an unverified or partial fix

### 4.4 Escalation Path
Escalation goes to the Engineering Manager, who will escalate to the Chief of Staff, who will escalate to Edward (CEO) if needed.

---

## 5. Authority and Approval

This brief is issued under the Engineering Manager's L1 authority (autonomous reversible internal execution). The B12 correction deployment requires L2 approval (propose-and-wait) from Edward (CEO) before execution.

**Edward's approval is required before:**
- Deploying the B12 correction to any production environment
- Modifying the B12 gate criteria
- Extending the October 10, 2026 deadline

---

## 6. Acknowledgment

Codex must acknowledge receipt of this brief and confirm understanding of:
1. The audit request and its deadline
2. The sole priority of B12
3. The October 10, 2026 hard deadline
4. The escalation condition

**Acknowledgment deadline: October 8, 2026, 18:00 SAST.**

---

*This brief is binding upon receipt. Questions or clarifications should be directed to the Engineering Manager before proceeding.*
