ALTER TABLE `distribution_programs`
  ADD COLUMN `referrer_commission_type` ENUM('flat', 'percentage') NULL AFTER `default_commission_amount`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `referrer_commission_value` DECIMAL(12,2) NULL AFTER `referrer_commission_type`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `referrer_commission_basis` ENUM('sale_price', 'base_price') NULL AFTER `referrer_commission_value`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `platform_commission_type` ENUM('flat', 'percentage') NULL AFTER `referrer_commission_basis`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `platform_commission_value` DECIMAL(12,2) NULL AFTER `platform_commission_type`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `platform_commission_basis` ENUM('sale_price', 'base_price') NULL AFTER `platform_commission_value`;

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
    WHEN `referrer_commission_type` = 'percentage' OR `commission_model` IN ('flat_percentage', 'tiered_percentage') THEN 'sale_price'
    WHEN `commission_model` = 'hybrid' AND COALESCE(`default_commission_percent`, 0) > 0 THEN 'sale_price'
    ELSE NULL
  END
WHERE
  `referrer_commission_type` IS NULL
  OR `referrer_commission_value` IS NULL;

UPDATE `distribution_programs`
SET
  `platform_commission_type` = COALESCE(`platform_commission_type`, `referrer_commission_type`),
  `platform_commission_value` = COALESCE(`platform_commission_value`, `referrer_commission_value`),
  `platform_commission_basis` = COALESCE(`platform_commission_basis`, `referrer_commission_basis`)
WHERE
  `platform_commission_type` IS NULL
  OR `platform_commission_value` IS NULL;

ALTER TABLE `distribution_deals`
  ADD COLUMN `commission_base_amount` INT NULL AFTER `platform_amount`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `referrer_commission_type` ENUM('flat', 'percentage') NULL AFTER `commission_base_amount`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `referrer_commission_value` DECIMAL(12,2) NULL AFTER `referrer_commission_type`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `referrer_commission_basis` ENUM('sale_price', 'base_price') NULL AFTER `referrer_commission_value`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `referrer_commission_amount` INT NULL AFTER `referrer_commission_basis`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `platform_commission_type` ENUM('flat', 'percentage') NULL AFTER `referrer_commission_amount`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `platform_commission_value` DECIMAL(12,2) NULL AFTER `platform_commission_type`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `platform_commission_basis` ENUM('sale_price', 'base_price') NULL AFTER `platform_commission_value`;

ALTER TABLE `distribution_deals`
  ADD COLUMN `platform_commission_amount` INT NULL AFTER `platform_commission_basis`;

UPDATE `distribution_deals` d
INNER JOIN `distribution_programs` p
  ON p.`id` = d.`program_id`
SET
  d.`referrer_commission_type` = COALESCE(d.`referrer_commission_type`, p.`referrer_commission_type`),
  d.`referrer_commission_value` = COALESCE(d.`referrer_commission_value`, p.`referrer_commission_value`),
  d.`referrer_commission_basis` = COALESCE(d.`referrer_commission_basis`, p.`referrer_commission_basis`),
  d.`platform_commission_type` = COALESCE(d.`platform_commission_type`, p.`platform_commission_type`),
  d.`platform_commission_value` = COALESCE(d.`platform_commission_value`, p.`platform_commission_value`),
  d.`platform_commission_basis` = COALESCE(d.`platform_commission_basis`, p.`platform_commission_basis`),
  d.`commission_base_amount` = COALESCE(d.`commission_base_amount`, NULLIF(d.`deal_amount`, 0)),
  d.`platform_commission_amount` = COALESCE(
    d.`platform_commission_amount`,
    NULLIF(d.`platform_amount`, 0)
  );

UPDATE `distribution_deals` d
LEFT JOIN (
  SELECT
    ce.`deal_id` AS `deal_id`,
    MAX(ce.`commission_amount`) AS `referrer_commission_amount`
  FROM `distribution_commission_entries` ce
  GROUP BY ce.`deal_id`
) x
  ON x.`deal_id` = d.`id`
SET d.`referrer_commission_amount` = COALESCE(d.`referrer_commission_amount`, x.`referrer_commission_amount`);
