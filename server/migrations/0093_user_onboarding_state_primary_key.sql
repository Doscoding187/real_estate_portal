-- One onboarding-state row per canonical user identity.
ALTER TABLE `user_onboarding_state` ADD PRIMARY KEY (`user_id`);
