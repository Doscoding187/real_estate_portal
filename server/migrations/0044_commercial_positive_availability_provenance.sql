ALTER TABLE `commercial_availabilities`
  DROP CHECK `chk_commercial_availabilities_confirmed_freshness`,
  ADD CONSTRAINT `chk_commercial_availabilities_positive_claim_provenance`
    CHECK ((`availability_state` NOT IN ('available_confirmed','available_upcoming')) OR (`last_confirmed_at` IS NOT NULL AND `confirmation_source` IS NOT NULL AND `reconfirmation_due_at` IS NOT NULL));
