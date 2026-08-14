CREATE TABLE `developer_organisation_memberships` (
  `id` int NOT NULL AUTO_INCREMENT,
  `organisation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('owner','admin','sales_manager','sales_consultant','marketing','finance','viewer') NOT NULL DEFAULT 'owner',
  `status` enum('active','invited','suspended') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `developer_organisation_memberships_id` PRIMARY KEY (`id`),
  CONSTRAINT `uq_developer_membership_organisation_user` UNIQUE (`organisation_id`, `user_id`),
  CONSTRAINT `fk_developer_memberships_organisation` FOREIGN KEY (`organisation_id`) REFERENCES `developer_organisations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_developer_memberships_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  KEY `idx_developer_membership_user_status` (`user_id`, `status`),
  KEY `idx_developer_membership_organisation_status` (`organisation_id`, `status`)
);
