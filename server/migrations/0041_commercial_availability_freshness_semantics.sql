ALTER TABLE `commercial_availabilities`
  ADD CONSTRAINT `chk_commercial_availabilities_confirmed_freshness`
    CHECK ((`availability_state` <> 'available_confirmed') OR (`last_confirmed_at` IS NOT NULL AND `confirmation_source` IS NOT NULL AND `reconfirmation_due_at` IS NOT NULL)),
  ADD CONSTRAINT `chk_commercial_availabilities_freshness_order`
    CHECK (((`availability_state` <> 'available_upcoming') OR (`occupation_date` IS NOT NULL)) AND ((`last_confirmed_at` IS NULL) OR (`reconfirmation_due_at` IS NOT NULL AND `reconfirmation_due_at` >= `last_confirmed_at`)));
