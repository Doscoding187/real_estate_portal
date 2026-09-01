-- Agent Launch Access is the full supported-capability early-adopter cohort.
-- This bounded, idempotent transition updates only recognised prior false values;
-- any unexpected commercial reference state remains fail-closed for verification.
UPDATE plan_entitlements
SET value_json = CAST('true' AS JSON)
WHERE plan_id = (SELECT id FROM plans WHERE name = 'agent_launch_access')
  AND feature_key IN ('has_commission_tracking', 'has_revenue_dashboard')
  AND JSON_EXTRACT(value_json, '$') = CAST('false' AS JSON);
