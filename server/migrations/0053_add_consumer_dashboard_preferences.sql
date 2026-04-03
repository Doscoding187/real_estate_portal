ALTER TABLE `user_onboarding_state`
  ADD COLUMN `consumer_dashboard_preferences` JSON NULL,
  ADD COLUMN `seller_planning_inputs` JSON NULL;
