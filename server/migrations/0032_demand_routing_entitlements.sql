-- Seed hybrid routing entitlements for agent plans

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'tier_weight', CAST('1' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_recipients_per_lead', CAST('3' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'lead_distribution_mode', CAST('"shared"' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_starter'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'tier_weight', CAST('3' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_recipients_per_lead', CAST('2' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'lead_distribution_mode', CAST('"semi-exclusive"' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_pro'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'tier_weight', CAST('3' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_recipients_per_lead', CAST('2' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'lead_distribution_mode', CAST('"shared"' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_growth'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'tier_weight', CAST('6' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'max_recipients_per_lead', CAST('1' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);

INSERT INTO `plan_entitlements` (`plan_id`, `feature_key`, `value_json`)
SELECT p.id, 'lead_distribution_mode', CAST('"exclusive"' AS JSON)
FROM `plans` p
WHERE p.name = 'agent_elite'
ON DUPLICATE KEY UPDATE `value_json` = VALUES(`value_json`);
