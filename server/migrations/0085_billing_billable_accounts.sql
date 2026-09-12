-- P5 billing authority: central billable principal with typed ownership.
CREATE TABLE `billable_accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `account_kind` enum('agent','agency','developer') NOT NULL,
  `user_id` int,
  `agency_id` int,
  `developer_organisation_id` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `billable_accounts_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_billable_accounts_user` UNIQUE(`user_id`),
  CONSTRAINT `uq_billable_accounts_agency` UNIQUE(`agency_id`),
  CONSTRAINT `uq_billable_accounts_developer_organisation` UNIQUE(`developer_organisation_id`),
  CONSTRAINT `fk_billable_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_billable_accounts_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_billable_accounts_developer_organisation` FOREIGN KEY (`developer_organisation_id`) REFERENCES `developer_organisations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `billable_accounts_exactly_one_owner` CHECK (
    (`account_kind` = 'agent' AND `user_id` IS NOT NULL AND `agency_id` IS NULL AND `developer_organisation_id` IS NULL)
    OR (`account_kind` = 'agency' AND `user_id` IS NULL AND `agency_id` IS NOT NULL AND `developer_organisation_id` IS NULL)
    OR (`account_kind` = 'developer' AND `user_id` IS NULL AND `agency_id` IS NULL AND `developer_organisation_id` IS NOT NULL)
  )
);
CREATE INDEX `idx_billable_accounts_kind` ON `billable_accounts` (`account_kind`);

INSERT INTO `billable_accounts` (`account_kind`, `user_id`)
SELECT 'agent', u.`id` FROM `users` u;
INSERT INTO `billable_accounts` (`account_kind`, `agency_id`)
SELECT 'agency', a.`id` FROM `agencies` a;
INSERT INTO `billable_accounts` (`account_kind`, `developer_organisation_id`)
SELECT 'developer', d.`id` FROM `developer_organisations` d;

ALTER TABLE `subscriptions` ADD COLUMN `billable_account_id` int NULL AFTER `owner_id`;
ALTER TABLE `billing_invoices` ADD COLUMN `billable_account_id` int NULL AFTER `owner_id`;
ALTER TABLE `billing_payments` ADD COLUMN `billable_account_id` int NULL AFTER `owner_id`;
ALTER TABLE `billing_payment_documents` ADD COLUMN `billable_account_id` int NULL AFTER `owner_id`;
ALTER TABLE `billing_audit_events` ADD COLUMN `billable_account_id` int NULL AFTER `owner_id`;

UPDATE `subscriptions` s JOIN `billable_accounts` b
  ON (s.`owner_type` = 'agent' AND b.`user_id` = s.`owner_id`)
  OR (s.`owner_type` = 'agency' AND b.`agency_id` = s.`owner_id`)
  OR (s.`owner_type` = 'developer' AND b.`developer_organisation_id` = s.`owner_id`)
SET s.`billable_account_id` = b.`id`;
UPDATE `billing_invoices` i JOIN `billable_accounts` b
  ON (i.`owner_type` = 'agent' AND b.`user_id` = i.`owner_id`)
  OR (i.`owner_type` = 'agency' AND b.`agency_id` = i.`owner_id`)
  OR (i.`owner_type` = 'developer' AND b.`developer_organisation_id` = i.`owner_id`)
SET i.`billable_account_id` = b.`id`;
UPDATE `billing_payments` p JOIN `billable_accounts` b
  ON (p.`owner_type` = 'agent' AND b.`user_id` = p.`owner_id`)
  OR (p.`owner_type` = 'agency' AND b.`agency_id` = p.`owner_id`)
  OR (p.`owner_type` = 'developer' AND b.`developer_organisation_id` = p.`owner_id`)
SET p.`billable_account_id` = b.`id`;
UPDATE `billing_payment_documents` d JOIN `billable_accounts` b
  ON (d.`owner_type` = 'agent' AND b.`user_id` = d.`owner_id`)
  OR (d.`owner_type` = 'agency' AND b.`agency_id` = d.`owner_id`)
  OR (d.`owner_type` = 'developer' AND b.`developer_organisation_id` = d.`owner_id`)
SET d.`billable_account_id` = b.`id`;
UPDATE `billing_audit_events` e JOIN `billable_accounts` b
  ON (e.`owner_type` = 'agent' AND b.`user_id` = e.`owner_id`)
  OR (e.`owner_type` = 'agency' AND b.`agency_id` = e.`owner_id`)
  OR (e.`owner_type` = 'developer' AND b.`developer_organisation_id` = e.`owner_id`)
SET e.`billable_account_id` = b.`id`;

ALTER TABLE `subscriptions` ADD CONSTRAINT `fk_subscriptions_billable_account` FOREIGN KEY (`billable_account_id`) REFERENCES `billable_accounts`(`id`) ON DELETE RESTRICT;
ALTER TABLE `billing_invoices` ADD CONSTRAINT `fk_billing_invoices_billable_account` FOREIGN KEY (`billable_account_id`) REFERENCES `billable_accounts`(`id`) ON DELETE RESTRICT;
ALTER TABLE `billing_payments` ADD CONSTRAINT `fk_billing_payments_billable_account` FOREIGN KEY (`billable_account_id`) REFERENCES `billable_accounts`(`id`) ON DELETE RESTRICT;
ALTER TABLE `billing_payment_documents` ADD CONSTRAINT `fk_billing_payment_documents_billable_account` FOREIGN KEY (`billable_account_id`) REFERENCES `billable_accounts`(`id`) ON DELETE RESTRICT;
ALTER TABLE `billing_audit_events` ADD CONSTRAINT `fk_billing_audit_events_billable_account` FOREIGN KEY (`billable_account_id`) REFERENCES `billable_accounts`(`id`) ON DELETE RESTRICT;
