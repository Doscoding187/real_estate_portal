-- =====================================================
-- ADD SARB PRIME RATE TO PLATFORM SETTINGS
-- Allows dynamic updates without code changes
-- =====================================================

USE real_estate_portal;

-- Insert SARB Prime Rate setting
INSERT INTO platform_settings (settingKey, settingValue, description, category, isPublic, createdAt, updatedAt)
VALUES (
  'sarb_prime_rate',
  '10.50',
  'Current South African Reserve Bank Prime Lending Rate (updated when SARB announces changes)',
  'financial',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  settingValue = '10.50',
  description = 'Current South African Reserve Bank Prime Lending Rate (updated when SARB announces changes)',
  updatedAt = NOW();

-- Insert SARB Repo Rate for reference
INSERT INTO platform_settings (settingKey, settingValue, description, category, isPublic, createdAt, updatedAt)
VALUES (
  'sarb_repo_rate',
  '7.00',
  'Current South African Reserve Bank Repo Rate (base rate)',
  'financial',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  settingValue = '7.00',
  description = 'Current South African Reserve Bank Repo Rate (base rate)',
  updatedAt = NOW();

-- Verify insertion
SELECT '✅ SARB rates added to platform settings!' AS status;

SELECT settingKey, settingValue, description, category
FROM platform_settings
WHERE settingKey IN ('sarb_prime_rate', 'sarb_repo_rate');
