-- Affordability config is DB-backed so super-admins can tune assumptions without code deploys.
-- Defaults are seeded to current hardcoded behavior.

CREATE TABLE IF NOT EXISTS `affordability_config` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(80) NOT NULL,
  `value_type` ENUM('number', 'integer', 'json') NOT NULL DEFAULT 'number',
  `value_number` DECIMAL(14,6) NULL,
  `value_json` JSON NULL,
  `label` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `updated_by_user_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_affordability_config_key` (`config_key`),
  KEY `idx_affordability_config_active` (`is_active`),
  CONSTRAINT `fk_affordability_config_updated_by`
    FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

INSERT INTO `affordability_config` (
  `config_key`,
  `value_type`,
  `value_number`,
  `label`,
  `description`,
  `is_active`
)
VALUES
  (
    'annual_interest_rate_percent',
    'number',
    13.25,
    'Annual Interest Rate (%)',
    'Stress-tested annual interest rate used for affordability projection.',
    1
  ),
  (
    'term_months',
    'integer',
    240,
    'Loan Term (Months)',
    'Default bond term in months.',
    1
  ),
  (
    'max_income_repayment_ratio',
    'number',
    0.33,
    'Max Income Repayment Ratio',
    'Maximum housing repayment share from gross income.',
    1
  ),
  (
    'disposable_repayment_ratio',
    'number',
    0.55,
    'Disposable Repayment Ratio',
    'Share of disposable income that can be allocated to housing repayment.',
    1
  ),
  (
    'affordability_min_factor',
    'number',
    0.82,
    'Affordability Min Factor',
    'Lower bound factor applied to projected max affordability.',
    1
  ),
  (
    'verified_required_documents',
    'integer',
    3,
    'Verified Required Documents',
    'Minimum uploaded documents required for verified readiness.',
    1
  )
ON DUPLICATE KEY UPDATE
  `config_key` = `config_key`;
