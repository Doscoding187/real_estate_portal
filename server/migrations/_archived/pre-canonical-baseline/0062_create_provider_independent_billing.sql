ALTER TABLE `subscriptions`
  MODIFY COLUMN `owner_type` enum('agent','agency','developer') NOT NULL;

ALTER TABLE `subscriptions`
  MODIFY COLUMN `status` enum(
    'trial',
    'pending_payment',
    'payment_under_review',
    'active',
    'past_due',
    'grace_period',
    'suspended',
    'cancelled',
    'expired'
  ) NOT NULL DEFAULT 'trial';

ALTER TABLE `subscriptions`
  ADD COLUMN `current_period_start` timestamp NULL AFTER `trial_ends_at`;

ALTER TABLE `subscriptions`
  ADD COLUMN `current_period_end` timestamp NULL AFTER `current_period_start`;

ALTER TABLE `subscriptions`
  ADD COLUMN `grace_ends_at` timestamp NULL AFTER `current_period_end`;

ALTER TABLE `subscriptions`
  ADD COLUMN `cancel_at_period_end` tinyint NOT NULL DEFAULT 0 AFTER `grace_ends_at`;

ALTER TABLE `subscriptions`
  ADD COLUMN `cancelled_at` timestamp NULL AFTER `cancel_at_period_end`;

CREATE TABLE IF NOT EXISTS `billing_invoices` (
  `id` int AUTO_INCREMENT NOT NULL,
  `owner_type` varchar(40) NOT NULL,
  `owner_id` int NOT NULL,
  `subscription_id` int NULL,
  `plan_id` int NULL,
  `invoice_number` varchar(64) NOT NULL,
  `payment_reference` varchar(64) NOT NULL,
  `status` enum('draft','issued','submitted','paid','partially_paid','overdue','void') NOT NULL DEFAULT 'issued',
  `billing_cycle` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
  `amount_due` int NOT NULL,
  `amount_paid` int NOT NULL DEFAULT 0,
  `discount_amount` int NOT NULL DEFAULT 0,
  `currency` varchar(3) NOT NULL DEFAULT 'ZAR',
  `issued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_at` timestamp NULL,
  `period_start` timestamp NULL,
  `period_end` timestamp NULL,
  `paid_at` timestamp NULL,
  `voided_at` timestamp NULL,
  `line_items` json NULL,
  `metadata` json NULL,
  `created_by` int NULL,
  `updated_by` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_billing_invoices_invoice_number` (`invoice_number`),
  UNIQUE KEY `uq_billing_invoices_payment_reference` (`payment_reference`),
  KEY `idx_billing_invoices_owner` (`owner_type`, `owner_id`),
  KEY `idx_billing_invoices_subscription` (`subscription_id`),
  KEY `idx_billing_invoices_status` (`status`),
  CONSTRAINT `billing_invoices_subscription_id_fk`
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_invoices_plan_id_fk`
    FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_invoices_created_by_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_invoices_updated_by_fk`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `billing_payments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `invoice_id` int NOT NULL,
  `subscription_id` int NULL,
  `owner_type` varchar(40) NOT NULL,
  `owner_id` int NOT NULL,
  `payment_method` enum('manual_eft','manual_adjustment','other') NOT NULL DEFAULT 'manual_eft',
  `state` enum('submitted','under_review','verified','rejected','reversed','refunded') NOT NULL DEFAULT 'submitted',
  `amount` int NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'ZAR',
  `payment_reference` varchar(64) NOT NULL,
  `bank_reference` varchar(120) NULL,
  `payer_name` varchar(160) NULL,
  `payment_date` timestamp NULL,
  `submitted_by` int NULL,
  `reviewed_by` int NULL,
  `reviewed_at` timestamp NULL,
  `rejection_reason` text NULL,
  `review_note` text NULL,
  `idempotency_key` varchar(120) NOT NULL,
  `metadata` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_billing_payments_idempotency` (`idempotency_key`),
  KEY `idx_billing_payments_invoice` (`invoice_id`),
  KEY `idx_billing_payments_subscription` (`subscription_id`),
  KEY `idx_billing_payments_owner` (`owner_type`, `owner_id`),
  KEY `idx_billing_payments_state` (`state`),
  KEY `idx_billing_payments_reference` (`payment_reference`),
  CONSTRAINT `billing_payments_invoice_id_fk`
    FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `billing_payments_subscription_id_fk`
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_payments_submitted_by_fk`
    FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_payments_reviewed_by_fk`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `billing_payment_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `payment_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `owner_type` varchar(40) NOT NULL,
  `owner_id` int NOT NULL,
  `storage_key` varchar(512) NOT NULL,
  `original_file_name` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `file_size_bytes` int NOT NULL,
  `sha256_hash` varchar(64) NOT NULL,
  `visibility` enum('private') NOT NULL DEFAULT 'private',
  `status` enum('active','deleted') NOT NULL DEFAULT 'active',
  `uploaded_by` int NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_billing_payment_documents_storage_key` (`storage_key`),
  KEY `idx_billing_payment_documents_payment` (`payment_id`),
  KEY `idx_billing_payment_documents_invoice` (`invoice_id`),
  KEY `idx_billing_payment_documents_owner` (`owner_type`, `owner_id`),
  CONSTRAINT `billing_payment_documents_payment_id_fk`
    FOREIGN KEY (`payment_id`) REFERENCES `billing_payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `billing_payment_documents_invoice_id_fk`
    FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `billing_payment_documents_uploaded_by_fk`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

ALTER TABLE `billing_payment_documents`
  MODIFY COLUMN `storage_key` varchar(512) NOT NULL;

CREATE TABLE IF NOT EXISTS `billing_audit_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `owner_type` varchar(40) NOT NULL,
  `owner_id` int NOT NULL,
  `subscription_id` int NULL,
  `invoice_id` int NULL,
  `payment_id` int NULL,
  `actor_user_id` int NULL,
  `event_type` varchar(120) NOT NULL,
  `message` text NULL,
  `before_data` json NULL,
  `after_data` json NULL,
  `metadata` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_billing_audit_owner` (`owner_type`, `owner_id`),
  KEY `idx_billing_audit_subscription` (`subscription_id`),
  KEY `idx_billing_audit_invoice` (`invoice_id`),
  KEY `idx_billing_audit_payment` (`payment_id`),
  KEY `idx_billing_audit_event` (`event_type`),
  CONSTRAINT `billing_audit_subscription_id_fk`
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_audit_invoice_id_fk`
    FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_audit_payment_id_fk`
    FOREIGN KEY (`payment_id`) REFERENCES `billing_payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_audit_actor_user_id_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
