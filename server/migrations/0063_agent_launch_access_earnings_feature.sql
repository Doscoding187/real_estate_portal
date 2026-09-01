-- Keep the protected commercial product record aligned with the full-capability
-- Agent Launch Access reference. Only the exact recognised prior feature list changes.
UPDATE plans
SET features = CAST('["Agent listing management", "Lead and enquiry access", "Agent profile and directory", "Agent analytics and reporting", "Commission and earnings tracking"]' AS JSON)
WHERE name = 'agent_launch_access'
  AND JSON_EXTRACT(features, '$') = CAST('["Agent listing management", "Lead and enquiry access", "Agent profile and directory", "Agent analytics and reporting"]' AS JSON);
