# Founding Cohort Evidence Runbook

Status: Operational instrument for the Agent Launch MVP observation phase.
Owner: Lead Architect · Approved by: Edward (durability-audit mandate §8).
Principle: this is **not** an analytics platform. It is the minimum instrument
panel that lets real cohort behaviour answer the eight durability questions.

Evidence model: every number below is **Observed** only once a real agent
generates it. Until then it is Unknown. Do not promote Inferred claims into
decisions before the cohort supplies the row.

---

## 1. Pre-onboarding operational checklist

Complete every item before inviting the first founding agent:

| # | Item | How to verify |
|---|------|---------------|
| 1 | Canonical commercial reference data released to the target environment | Protected sequence per `docs/database-authority/00-database-authority-agent-entry.md`: `release:plan → release-reference:plan → release:apply → release-reference:apply → release-reference:verify` |
| 2 | Expiry-notice scheduler live | Server boot calls `commercialTermNoticeScheduler.start()` (`server/_core/index.ts`); first T-7 notices appear in `notifications` when any subscription enters its last week. Interval override (optional): `COMMERCIAL_TERM_NOTICE_INTERVAL_MS` |
| 3 | Transactional email deliverable | Resend credentials configured for the environment; test send of the new-lead + expiry templates |
| 4 | Finance verification staffing | `reviewManualPayment` is super-admin only (`BILLING_FINANCE_ROLES`). Named operator with access confirmed |
| 5 | Agent approval staffing | `admin.approveAgent` / `rejectAgent` reachable by the named super admin; approval now notifies the agent in-app automatically |
| 6 | Surface-view telemetry flowing | After one test login: rows exist in `analytics_events` with `event_type IN ('agent_dashboard_viewed','agent_analytics_viewed')` |

---

## 2. The eight cohort questions → query pack

All queries are **read-only**. Run against the cohort database through the
authorised access path only. Substitute `:since` (observation start) and `:now`
as needed. Column spellings are schema-truthful (mixed case is intentional).

### Q1 · Direct-contact vs captured-form mix

```sql
-- Captured (platform-visible) enquiries
SELECT COUNT(*) AS form_enquiries
FROM leads WHERE agentId IS NOT NULL AND createdAt >= :since;

-- Direct-contact intents (invisible conversions; clicks only)
SELECT event_type, COUNT(*) AS intents
FROM analytics_events
WHERE event_type IN ('agent_profile_whatsapp_click','agent_profile_call_click','agent_profile_email_click')
  AND created_at >= :since
GROUP BY event_type;
```

Decision rule: if direct intents rival or exceed forms, WhatsApp-intent capture
jumps the product queue (founder decision — changes consumer behaviour).

### Q2 · Enquiry-awareness latency

```sql
SELECT ROUND(AVG(t.minutes), 1) AS avg_minutes_to_first_check,
       SUM(t.minutes IS NULL) AS never_checked_after_lead
FROM (
  SELECT l.id,
    TIMESTAMPDIFF(MINUTE, l.createdAt,
      (SELECT MIN(ae.created_at) FROM analytics_events ae
       JOIN agents a2 ON a2.userId = ae.user_id
       WHERE a2.id = l.agentId
         AND ae.event_type = 'agent_dashboard_viewed'
         AND ae.created_at >= l.createdAt)
    ) AS minutes
  FROM leads l
  WHERE l.agentId IS NOT NULL AND l.createdAt >= :since
) t;
```

Decision rule: median > 24h ⇒ push/alert escalation justified regardless of
in-app fix already shipped.

### Q3 · Return frequency with no new leads

```sql
SELECT u.id,
       COUNT(DISTINCT DATE(ae.created_at)) AS active_days,
       SUM(l.id IS NOT NULL) AS leads_in_period
FROM analytics_events ae
JOIN users u ON u.id = ae.user_id
LEFT JOIN leads l ON l.agentId = (SELECT id FROM agents WHERE userId = u.id)
  AND l.createdAt >= :since
WHERE ae.event_type = 'agent_dashboard_viewed' AND ae.created_at >= :since
GROUP BY u.id;
```

Decision rule: agents with `leads_in_period = 0` but healthy `active_days`
prove habit value independent of inbound; near-zero days prove the opposite.

### Q4 · Which workflows create repeat use

```sql
SELECT event_type,
       COUNT(DISTINCT user_id) AS agents_using,
       COUNT(*) AS events
FROM analytics_events
WHERE created_at >= :since
  AND event_type IN ('agent_listing_created','agent_lead_stage_updated',
                     'agent_crm_action_logged','agent_showing_booked',
                     'agent_showing_completed','agent_profile_published')
GROUP BY event_type
ORDER BY events DESC;
```

### Q5 · Pre-dropoff signature

```sql
SELECT a.id, a.displayName,
       MAX(ae.created_at) AS last_seen,
       DATEDIFF(NOW(), MAX(ae.created_at)) AS silent_days
FROM agents a
LEFT JOIN analytics_events ae
  ON ae.user_id = a.userId AND ae.event_type LIKE 'agent\_%'
WHERE a.status = 'approved'
GROUP BY a.id
HAVING silent_days IS NULL OR silent_days >= 14
ORDER BY silent_days DESC;
```

Use for outreach before cancellation-of-attention becomes churn.

### Q6 · T-7 reach and renewal conversion

```sql
-- Warnings delivered (idempotent by design)
SELECT JSON_UNQUOTE(JSON_EXTRACT(data,'$.notice')) AS notice, COUNT(*) AS sent
FROM notifications
WHERE type = 'system_alert' AND data LIKE '%launch_expiry_%'
GROUP BY notice;

-- Renewal conversion: expired owners who returned to a paid state
SELECT COUNT(*) AS renewed_agents
FROM subscriptions s2
WHERE s2.owner_type = 'agent'
  AND s2.status IN ('active','grace_period')
  AND EXISTS (SELECT 1 FROM subscriptions s1
              WHERE s1.owner_type='agent' AND s1.owner_id = s2.owner_id
                AND s1.status = 'expired');
```

### Q7 · Activation/approval/renewal operational burden

```sql
SELECT action, COUNT(*) AS events
FROM audit_logs
WHERE createdAt >= :since
  AND (action LIKE 'invoice%' OR action LIKE 'payment%'
       OR action LIKE '%APPROVE%' OR action LIKE 'invitation%')
GROUP BY action
ORDER BY events DESC;
```

Rising per-agent effort here is the automation trigger (EFT confirmation,
approval delegation) flagged in the durability audit.

### Q8 · Does proof-of-value affect engagement?

```sql
SELECT has_intent.engaged,
       COUNT(*) AS agents,
       AVG(engagement.views) AS avg_dashboard_views
FROM (
  SELECT ae.user_id, COUNT(*) > 0 AS engaged
  FROM analytics_events ae
  WHERE ae.event_type IN ('agent_profile_whatsapp_click','agent_profile_call_click','agent_profile_email_click')
    AND ae.created_at >= :since
  GROUP BY ae.user_id
) has_intent
JOIN (
  SELECT user_id, COUNT(*) AS views
  FROM analytics_events
  WHERE event_type = 'agent_dashboard_viewed' AND created_at >= :since
  GROUP BY user_id
) engagement ON engagement.user_id = has_intent.user_id
GROUP BY has_intent.engaged;
```

If engaged agents show materially higher return frequency, proof depth
(Growth-tier boundary) earns its build. If not, presence proof stays thin by
design.

---

## 3. Cadence

- Weekly during cohort: run Q1–Q5; log answers next to the date.
- Event-driven: Q6 as soon as any subscription enters its final week.
- Monthly: Q7–Q8 alongside the renewal-posture review.

## 4. Interpretation discipline

- One agent is anecdote; three is signal; the full cohort is evidence.
- Absence of data (zero leads platform-wide) invalidates Q1–Q2 conclusions and
  shifts attention to acquisition, not retention mechanics.
- Every decision drawn from these numbers gets recorded beside the numbers.
