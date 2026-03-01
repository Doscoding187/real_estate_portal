ALTER TABLE `distribution_deals`
  ADD COLUMN `snapshot_version` INT NULL AFTER `platform_commission_amount`,
  ADD COLUMN `snapshot_source` ENUM('submission_gate', 'backfill', 'override') NULL AFTER `snapshot_version`;

-- Ensure referrer commission track is always populated from legacy defaults when missing.
UPDATE `distribution_programs`
SET
  `referrer_commission_type` = CASE
    WHEN `referrer_commission_type` IS NOT NULL THEN `referrer_commission_type`
    WHEN `commission_model` IN ('flat_percentage', 'tiered_percentage') THEN 'percentage'
    WHEN `commission_model` = 'hybrid' AND COALESCE(`default_commission_percent`, 0) > 0 THEN 'percentage'
    ELSE 'flat'
  END,
  `referrer_commission_value` = CASE
    WHEN `referrer_commission_value` IS NOT NULL THEN `referrer_commission_value`
    WHEN `commission_model` IN ('flat_percentage', 'tiered_percentage') THEN COALESCE(`default_commission_percent`, 0)
    WHEN `commission_model` = 'hybrid' AND COALESCE(`default_commission_percent`, 0) > 0 THEN COALESCE(`default_commission_percent`, 0)
    ELSE COALESCE(`default_commission_amount`, 0)
  END,
  `referrer_commission_basis` = CASE
    WHEN COALESCE(`referrer_commission_type`, '') = 'percentage' THEN COALESCE(`referrer_commission_basis`, 'sale_price')
    WHEN `commission_model` IN ('flat_percentage', 'tiered_percentage') THEN COALESCE(`referrer_commission_basis`, 'sale_price')
    WHEN `commission_model` = 'hybrid' AND COALESCE(`default_commission_percent`, 0) > 0 THEN COALESCE(`referrer_commission_basis`, 'sale_price')
    ELSE NULL
  END
WHERE
  `referrer_commission_type` IS NULL
  OR `referrer_commission_value` IS NULL
  OR (`referrer_commission_type` = 'percentage' AND `referrer_commission_basis` IS NULL);

-- Platform policy: if private platform track is missing, inherit from legacy/referrer defaults.
UPDATE `distribution_programs`
SET
  `platform_commission_type` = COALESCE(`platform_commission_type`, `referrer_commission_type`),
  `platform_commission_value` = COALESCE(`platform_commission_value`, `referrer_commission_value`),
  `platform_commission_basis` = CASE
    WHEN COALESCE(`platform_commission_type`, `referrer_commission_type`) = 'percentage'
      THEN COALESCE(`platform_commission_basis`, `referrer_commission_basis`, 'sale_price')
    ELSE NULL
  END
WHERE
  `platform_commission_type` IS NULL
  OR `platform_commission_value` IS NULL
  OR (
    COALESCE(`platform_commission_type`, `referrer_commission_type`) = 'percentage'
    AND `platform_commission_basis` IS NULL
  );

-- Backfill legacy deals with immutable commission snapshots (best effort from current program config).
UPDATE `distribution_deals` d
INNER JOIN `distribution_programs` p ON p.`id` = d.`program_id`
SET
  d.`commission_base_amount` = COALESCE(
    d.`commission_base_amount`,
    NULLIF(d.`deal_amount`, 0),
    NULLIF(d.`platform_amount`, 0),
    0
  ),
  d.`referrer_commission_type` = COALESCE(d.`referrer_commission_type`, p.`referrer_commission_type`),
  d.`referrer_commission_value` = COALESCE(d.`referrer_commission_value`, p.`referrer_commission_value`),
  d.`referrer_commission_basis` = CASE
    WHEN COALESCE(d.`referrer_commission_type`, p.`referrer_commission_type`) = 'percentage'
      THEN COALESCE(d.`referrer_commission_basis`, p.`referrer_commission_basis`, 'sale_price')
    ELSE NULL
  END,
  d.`platform_commission_type` = COALESCE(d.`platform_commission_type`, p.`platform_commission_type`),
  d.`platform_commission_value` = COALESCE(d.`platform_commission_value`, p.`platform_commission_value`),
  d.`platform_commission_basis` = CASE
    WHEN COALESCE(d.`platform_commission_type`, p.`platform_commission_type`) = 'percentage'
      THEN COALESCE(d.`platform_commission_basis`, p.`platform_commission_basis`, 'sale_price')
    ELSE NULL
  END,
  d.`referrer_commission_amount` = COALESCE(
    d.`referrer_commission_amount`,
    CASE
      WHEN COALESCE(d.`referrer_commission_type`, p.`referrer_commission_type`) = 'percentage'
        THEN ROUND(
          COALESCE(d.`commission_base_amount`, NULLIF(d.`deal_amount`, 0), 0)
          * COALESCE(d.`referrer_commission_value`, p.`referrer_commission_value`, 0)
          / 100
        )
      ELSE ROUND(COALESCE(d.`referrer_commission_value`, p.`referrer_commission_value`, 0))
    END
  ),
  d.`platform_commission_amount` = COALESCE(
    d.`platform_commission_amount`,
    CASE
      WHEN COALESCE(d.`platform_commission_type`, p.`platform_commission_type`) = 'percentage'
        THEN ROUND(
          COALESCE(d.`commission_base_amount`, NULLIF(d.`deal_amount`, 0), 0)
          * COALESCE(d.`platform_commission_value`, p.`platform_commission_value`, 0)
          / 100
        )
      ELSE ROUND(COALESCE(d.`platform_commission_value`, p.`platform_commission_value`, 0))
    END
  )
WHERE
  d.`snapshot_version` IS NULL
  OR d.`referrer_commission_type` IS NULL
  OR d.`referrer_commission_value` IS NULL
  OR d.`platform_commission_type` IS NULL
  OR d.`platform_commission_value` IS NULL;

UPDATE `distribution_deals`
SET
  `snapshot_version` = 1,
  `snapshot_source` = COALESCE(`snapshot_source`, 'backfill')
WHERE
  `snapshot_version` IS NULL
  AND `referrer_commission_type` IS NOT NULL
  AND `referrer_commission_value` IS NOT NULL
  AND `platform_commission_type` IS NOT NULL
  AND `platform_commission_value` IS NOT NULL;

CREATE TABLE IF NOT EXISTS `distribution_commission_overrides` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deal_id` INT NOT NULL,
  `actor_user_id` INT NOT NULL,
  `reason` TEXT NOT NULL,
  `previous_snapshot` JSON NOT NULL,
  `next_snapshot` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_commission_overrides_deal` (`deal_id`),
  KEY `idx_distribution_commission_overrides_actor` (`actor_user_id`),
  KEY `idx_distribution_commission_overrides_created_at` (`created_at`),
  CONSTRAINT `fk_distribution_commission_overrides_deal`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_commission_overrides_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
