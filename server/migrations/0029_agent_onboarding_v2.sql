-- Agent onboarding v2 foundation
-- Auto-approve after verify, trial metadata, profile microsite fields

ALTER TABLE users
  ADD COLUMN plan ENUM('trial', 'paid') NOT NULL DEFAULT 'trial',
  ADD COLUMN trialStatus ENUM('active', 'expired') NOT NULL DEFAULT 'active',
  ADD COLUMN trialStartedAt TIMESTAMP NULL,
  ADD COLUMN trialEndsAt TIMESTAMP NULL;

ALTER TABLE agents
  ADD COLUMN slug VARCHAR(200) NULL,
  ADD COLUMN focus ENUM('sales', 'rentals', 'both') NULL,
  ADD COLUMN propertyTypes TEXT NULL,
  ADD COLUMN socialLinks TEXT NULL,
  ADD COLUMN profileCompletionScore INT NOT NULL DEFAULT 0,
  ADD COLUMN profileCompletionFlags TEXT NULL;

CREATE UNIQUE INDEX uq_agents_slug ON agents (slug);
CREATE INDEX idx_agents_slug ON agents (slug);
